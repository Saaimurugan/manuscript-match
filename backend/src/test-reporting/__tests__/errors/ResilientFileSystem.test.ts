/**
 * Unit Tests for ResilientFileSystem
 * 
 * Tests resilient file system operations with retry logic,
 * error recovery, and fallback mechanisms.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ResilientFileSystem } from '../../errors/ResilientFileSystem';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ResilientFileSystem', () => {
  let resilientFs: ResilientFileSystem;
  let tempDir: string;

  beforeEach(() => {
    resilientFs = new ResilientFileSystem({
      maxRetries: 3,
      retryDelay: 100,
      enableFallback: true,
      verboseLogging: false
    });
    
    tempDir = path.join(__dirname, 'temp-resilient-test');
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await resilientFs.cleanup();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Resilient File Operations', () => {
    test('should write file successfully on first attempt', async () => {
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      mockFs.stat.mockResolvedValueOnce({ size: 1024 } as any);

      const result = await resilientFs.writeFileResilient(
        path.join(tempDir, 'test.txt'),
        'test content'
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    });

    test('should retry on transient failures', async () => {
      // First two attempts fail, third succeeds
      mockFs.writeFile
        .mockRejectedValueOnce(new Error('EBUSY: resource busy'))
        .mockRejectedValueOnce(new Error('EMFILE: too many open files'))
        .mockResolvedValueOnce(undefined);
      
      mockFs.stat.mockResolvedValueOnce({ size: 1024 } as any);

      const result = await resilientFs.writeFileResilient(
        path.join(tempDir, 'test.txt'),
        'test content'
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries exceeded', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Persistent failure'));

      const result = await resilientFs.writeFileResilient(
        path.join(tempDir, 'test.txt'),
        'test content'
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // maxRetries
      expect(result.error).toContain('Persistent failure');
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });

    test('should use fallback location on permission errors', async () => {
      const originalPath = '/restricted/path/test.txt';
      const fallbackPath = path.join(tempDir, 'fallback', 'test.txt');

      // Original path fails with permission error
      mockFs.writeFile.mockImplementation((filePath: any) => {
        if (filePath === originalPath) {
          return Promise.reject(new Error('EACCES: permission denied'));
        }
        return Promise.resolve();
      });

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);

      const result = await resilientFs.writeFileResilient(originalPath, 'test content');

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.finalPath).toContain('fallback');
    });
  });

  describe('Directory Operations', () => {
    test('should create directory with retry logic', async () => {
      mockFs.mkdir
        .mockRejectedValueOnce(new Error('EBUSY: resource busy'))
        .mockResolvedValueOnce(undefined);

      const result = await resilientFs.ensureDirectoryExists(tempDir);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockFs.mkdir).toHaveBeenCalledTimes(2);
    });

    test('should handle directory already exists gracefully', async () => {
      const existsError = new Error('EEXIST: file already exists') as any;
      existsError.code = 'EEXIST';
      
      mockFs.mkdir.mockRejectedValueOnce(existsError);

      const result = await resilientFs.ensureDirectoryExists(tempDir);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.alreadyExists).toBe(true);
    });
  });

  describe('File Reading Operations', () => {
    test('should read file with retry on transient failures', async () => {
      const fileContent = 'test file content';
      
      mockFs.readFile
        .mockRejectedValueOnce(new Error('EMFILE: too many open files'))
        .mockResolvedValueOnce(fileContent);

      const result = await resilientFs.readFileResilient(
        path.join(tempDir, 'test.txt')
      );

      expect(result.success).toBe(true);
      expect(result.content).toBe(fileContent);
      expect(result.attempts).toBe(2);
    });

    test('should handle file not found errors', async () => {
      const notFoundError = new Error('ENOENT: no such file or directory') as any;
      notFoundError.code = 'ENOENT';
      
      mockFs.readFile.mockRejectedValue(notFoundError);

      const result = await resilientFs.readFileResilient(
        path.join(tempDir, 'nonexistent.txt')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
      expect(result.attempts).toBe(1); // Don't retry on ENOENT
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch file operations with partial failures', async () => {
      const files = [
        { path: path.join(tempDir, 'file1.txt'), content: 'content1' },
        { path: path.join(tempDir, 'file2.txt'), content: 'content2' },
        { path: path.join(tempDir, 'file3.txt'), content: 'content3' }
      ];

      // Second file fails, others succeed
      mockFs.writeFile.mockImplementation((filePath: any) => {
        if (filePath.includes('file2.txt')) {
          return Promise.reject(new Error('Write failed'));
        }
        return Promise.resolve();
      });

      mockFs.stat.mockResolvedValue({ size: 1024 } as any);

      const results = await resilientFs.writeBatchResilient(files);

      expect(results.totalFiles).toBe(3);
      expect(results.successfulFiles).toBe(2);
      expect(results.failedFiles).toBe(1);
      expect(results.results).toHaveLength(3);
      
      const failedResult = results.results.find(r => !r.success);
      expect(failedResult?.error).toContain('Write failed');
    });

    test('should respect concurrency limits in batch operations', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        path: path.join(tempDir, `file${i}.txt`),
        content: `content${i}`
      }));

      let concurrentOperations = 0;
      let maxConcurrent = 0;

      mockFs.writeFile.mockImplementation(async () => {
        concurrentOperations++;
        maxConcurrent = Math.max(maxConcurrent, concurrentOperations);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        concurrentOperations--;
        return Promise.resolve();
      });

      mockFs.stat.mockResolvedValue({ size: 1024 } as any);

      const resilientFsWithLimit = new ResilientFileSystem({
        maxRetries: 1,
        maxConcurrency: 3
      });

      await resilientFsWithLimit.writeBatchResilient(files);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('Error Classification', () => {
    test('should classify transient errors correctly', () => {
      const transientErrors = [
        'EBUSY: resource busy',
        'EMFILE: too many open files',
        'ENFILE: file table overflow',
        'EAGAIN: resource temporarily unavailable'
      ];

      for (const errorMessage of transientErrors) {
        const error = new Error(errorMessage);
        expect(resilientFs.isTransientError(error)).toBe(true);
      }
    });

    test('should classify permanent errors correctly', () => {
      const permanentErrors = [
        'ENOENT: no such file or directory',
        'EACCES: permission denied',
        'EISDIR: illegal operation on a directory',
        'ENOTDIR: not a directory'
      ];

      for (const errorMessage of permanentErrors) {
        const error = new Error(errorMessage);
        expect(resilientFs.isTransientError(error)).toBe(false);
      }
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should cleanup temporary files and resources', async () => {
      const tempFiles = [
        path.join(tempDir, 'temp1.txt'),
        path.join(tempDir, 'temp2.txt')
      ];

      // Add temp files to cleanup list
      for (const tempFile of tempFiles) {
        resilientFs.addTempFile(tempFile);
      }

      mockFs.unlink.mockResolvedValue(undefined);

      await resilientFs.cleanup();

      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      for (const tempFile of tempFiles) {
        expect(mockFs.unlink).toHaveBeenCalledWith(tempFile);
      }
    });

    test('should handle cleanup errors gracefully', async () => {
      const tempFile = path.join(tempDir, 'temp.txt');
      resilientFs.addTempFile(tempFile);

      mockFs.unlink.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw
      await expect(resilientFs.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track operation statistics', async () => {
      mockFs.writeFile
        .mockRejectedValueOnce(new Error('EBUSY'))
        .mockResolvedValueOnce(undefined);
      
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);

      await resilientFs.writeFileResilient(
        path.join(tempDir, 'test.txt'),
        'content'
      );

      const stats = resilientFs.getStatistics();

      expect(stats.totalOperations).toBe(1);
      expect(stats.successfulOperations).toBe(1);
      expect(stats.retriedOperations).toBe(1);
      expect(stats.totalRetries).toBe(1);
    });

    test('should reset statistics when requested', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);

      await resilientFs.writeFileResilient(
        path.join(tempDir, 'test.txt'),
        'content'
      );

      resilientFs.resetStatistics();
      const stats = resilientFs.getStatistics();

      expect(stats.totalOperations).toBe(0);
      expect(stats.successfulOperations).toBe(0);
      expect(stats.retriedOperations).toBe(0);
    });
  });
});

// Helper functions for creating mock data
function createMockFileSystemError(code: string, message: string): Error {
  const error = new Error(message) as any;
  error.code = code;
  return error;
}

function createMockFileStats(size: number): any {
  return {
    size,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
    ctime: new Date()
  };
}