/**
 * Integration tests for comprehensive error handling system
 * Tests the interaction between all error handling components
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ErrorHandler } from '../../errors/ErrorHandler';
import { Logger } from '../../errors/Logger';
import { ResilientFileSystem } from '../../errors/ResilientFileSystem';
import { MalformedDataRecovery } from '../../errors/MalformedDataRecovery';
import { 
  ErrorClassifier, 
  ReportingErrorType, 
  ErrorSeverity, 
  RecoveryStrategy 
} from '../../errors/ErrorTypes';

// Mock fs for controlled testing
jest.mock('fs/promises');

describe('Error Handling Integration', () => {
  let errorHandler: ErrorHandler;
  let logger: Logger;
  let resilientFs: ResilientFileSystem;
  let dataRecovery: MalformedDataRecovery;
  let mockFs: jest.Mocked<typeof fs>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFs = fs as jest.Mocked<typeof fs>;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Create integrated error handling system
    logger = new Logger('debug', {
      enableConsole: true,
      enableFile: false,
      enableColors: false
    });
    
    errorHandler = new ErrorHandler({
      maxRetries: 3,
      retryDelayMs: 10, // Fast retries for testing
      enableFallbacks: true,
      enablePartialReports: true,
      logLevel: 'debug',
      enableDetailedLogging: true,
      enableStackTraces: true,
      enableActionableGuidance: true,
      failOnCriticalErrors: false, // Allow testing critical error recovery
      timeoutMs: 5000
    });

    resilientFs = new ResilientFileSystem(errorHandler, logger, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      enableBackup: true,
      enableTempFiles: true,
      tempDirectory: '/tmp/test-reports',
      backupDirectory: '/backup/test-reports'
    });

    dataRecovery = new MalformedDataRecovery(logger, errorHandler, {
      enablePartialRecovery: true,
      enableDataSanitization: true,
      enableSchemaValidation: true,
      maxRecoveryAttempts: 3,
      fallbackToMinimalData: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    errorHandler.clearErrorHistory();
  });

  describe('File System Error Recovery', () => {
    it('should recover from transient file system errors with retry', async () => {
      const retryableError = new Error('EBUSY: resource busy') as any;
      retryableError.code = 'EBUSY';
      
      // Setup mock to fail twice, then succeed
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      const content = 'test report content';
      
      // Should eventually succeed after retries
      await expect(resilientFs.writeFile('/reports/test.html', content)).resolves.not.toThrow();
      
      // Verify retry attempts
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
      
      // Check error statistics
      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByType[ReportingErrorType.FILE_SYSTEM_ERROR]).toBeGreaterThan(0);
    });

    it('should use fallback directory when primary fails', async () => {
      const permissionError = new Error('EACCES: permission denied') as any;
      permissionError.code = 'EACCES';
      
      // Primary directory creation fails
      mockFs.mkdir.mockRejectedValueOnce(permissionError);
      // Fallback succeeds
      mockFs.mkdir.mockResolvedValueOnce(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      // Mock error handler to provide fallback directory
      const originalHandleError = errorHandler.handleError.bind(errorHandler);
      errorHandler.handleError = jest.fn().mockImplementation(async (error) => {
        if (error.type === ReportingErrorType.PERMISSION_ERROR) {
          return {
            success: true,
            fallbackUsed: true,
            recoveredData: '/tmp/fallback-reports'
          };
        }
        return originalHandleError(error);
      });
      
      await resilientFs.writeFile('/protected/reports/test.html', 'content');
      
      expect(errorHandler.handleError).toHaveBeenCalled();
    });

    it('should create backup before overwriting existing files', async () => {
      // File exists
      mockFs.access.mockResolvedValue(undefined);
      // Backup operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      // Write operations
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      const backupPath = await resilientFs.createBackup('/reports/existing.html');
      await resilientFs.writeFile('/reports/existing.html', 'new content');
      
      expect(backupPath).toMatch(/existing\.html\.\d{4}-\d{2}-\d{2}T.*\.backup$/);
      expect(mockFs.copyFile).toHaveBeenCalled();
    });
  });

  describe('Malformed Data Recovery Integration', () => {
    it('should recover from corrupted Jest results and generate partial report', async () => {
      const corruptedJestOutput = `{
        "testResults": [
          {
            testFilePath: '/test/example.test.js', // Missing quotes
            'assertionResults': [                  // Wrong quotes
              { title: "test 1", status: "passed", duration: 100, }  // Trailing comma
              { title: "test 2", status: "unknown_status" }          // Invalid status
            ],
            numTotalTests: 2,
            numPassingTests: 1,
            numFailingTests: 0,
          }  // Trailing comma
        ],
        numTotalTests: 2,
        numPassedTests: 1,
        numFailedTests: 0
        // Missing closing brace
      `;
      
      const recovery = await dataRecovery.recoverJestResults(corruptedJestOutput);
      
      expect(recovery.success).toBe(true);
      expect(recovery.recoveredData).toBeDefined();
      expect(recovery.warnings.length).toBeGreaterThan(0);
      
      // Verify data was sanitized
      const testResult = recovery.recoveredData.testResults[0];
      expect(testResult.testFilePath).toBe('/test/example.test.js');
      expect(testResult.assertionResults[1].status).toBe('unknown'); // Normalized
      
      // Now try to write the recovered data
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      const reportContent = JSON.stringify(recovery.recoveredData, null, 2);
      await resilientFs.writeFile('/reports/recovered-results.json', reportContent);
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle complete data corruption with minimal fallback', async () => {
      const completelyCorrupted = 'This is not JSON at all! @#$%^&*()';
      
      const recovery = await dataRecovery.recoverJestResults(completelyCorrupted);
      
      expect(recovery.success).toBe(true);
      expect(recovery.partialData).toBeDefined();
      expect(recovery.partialData.testResults).toEqual([]);
      expect(recovery.errors.length).toBeGreaterThan(0);
      
      // Should still be able to generate a basic report
      const reportContent = JSON.stringify(recovery.partialData, null, 2);
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      await resilientFs.writeFile('/reports/minimal-fallback.json', reportContent);
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('Template Error Recovery', () => {
    it('should recover from template rendering errors with fallback templates', async () => {
      const templateError = new Error('Handlebars compilation failed');
      
      const reportingError = ErrorClassifier.classifyError(templateError, {
        operation: 'renderTemplate',
        component: 'HtmlGenerator',
        reportFormat: 'html'
      });
      
      const recovery = await errorHandler.handleError(reportingError);
      
      expect(recovery.success).toBe(true);
      expect(recovery.fallbackUsed).toBe(true);
      expect(recovery.recoveredData).toContain('<!DOCTYPE html>');
      expect(recovery.recoveredData).toContain('Error generating full report');
      
      // Write the fallback template
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      
      await resilientFs.writeFile('/reports/fallback-report.html', recovery.recoveredData);
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle markdown template errors with fallback', async () => {
      const templateError = new Error('Markdown template not found');
      
      const reportingError = ErrorClassifier.classifyError(templateError, {
        operation: 'renderTemplate',
        component: 'MarkdownGenerator',
        reportFormat: 'markdown'
      });
      
      const recovery = await errorHandler.handleError(reportingError);
      
      expect(recovery.success).toBe(true);
      expect(recovery.fallbackUsed).toBe(true);
      expect(recovery.recoveredData).toContain('# Test Report');
      expect(recovery.recoveredData).toContain('Error generating full report');
    });
  });

  describe('Configuration Error Recovery', () => {
    it('should recover from configuration errors with default config', async () => {
      const configError = new Error('Invalid configuration format');
      configError.name = 'ConfigurationError';
      
      const reportingError = ErrorClassifier.classifyError(configError, {
        operation: 'loadConfig',
        component: 'ConfigManager'
      });
      
      const recovery = await errorHandler.handleError(reportingError);
      
      expect(recovery.success).toBe(true);
      expect(recovery.fallbackUsed).toBe(true);
      expect(recovery.recoveredData).toHaveProperty('enabled', true);
      expect(recovery.recoveredData).toHaveProperty('outputDirectory', 'test-reports');
      expect(recovery.recoveredData.formats).toHaveProperty('html', true);
    });
  });

  describe('Memory Error Recovery', () => {
    it('should generate lightweight report when memory is constrained', async () => {
      const memoryError = new Error('JavaScript heap out of memory');
      memoryError.name = 'RangeError';
      
      const reportingError = ErrorClassifier.classifyError(memoryError, {
        operation: 'generateReport',
        component: 'ReportGenerator'
      });
      
      const recovery = await errorHandler.handleError(reportingError);
      
      expect(recovery.success).toBe(true);
      expect(recovery.partialSuccess).toBe(true);
      expect(recovery.recoveredData).toHaveProperty('lightweight', true);
      expect(recovery.recoveredData).toHaveProperty('summary');
    });
  });

  describe('System Degradation Detection', () => {
    it('should detect system degradation after multiple errors', async () => {
      // Simulate multiple high-severity errors
      const errors = [
        new Error('Memory error 1'),
        new Error('Memory error 2'),
        new Error('Memory error 3'),
        new Error('Memory error 4')
      ];
      
      for (const error of errors) {
        error.name = 'RangeError';
        await errorHandler.handleError(error);
      }
      
      expect(errorHandler.isSystemDegraded()).toBe(true);
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByType[ReportingErrorType.MEMORY_ERROR]).toBe(4);
    });

    it('should provide actionable guidance for system recovery', async () => {
      const diskSpaceError = new Error('ENOSPC: no space left on device') as any;
      diskSpaceError.code = 'ENOSPC';
      
      const reportingError = ErrorClassifier.classifyError(diskSpaceError);
      
      expect(reportingError.actionableGuidance).toContain('Free up disk space');
      expect(reportingError.actionableGuidance).toContain('Choose a different output directory');
      expect(reportingError.actionableGuidance).toContain('Clean up old report files');
      
      await errorHandler.handleError(reportingError);
      
      // Verify guidance was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Actionable guidance:[\s\S]*Free up disk space/)
      );
    });
  });

  describe('End-to-End Error Recovery Scenarios', () => {
    it('should handle complete report generation failure with graceful degradation', async () => {
      // Simulate a complete failure scenario
      const testData = 'corrupted test data that cannot be parsed';
      
      // Step 1: Try to recover test data
      const dataRecoveryResult = await dataRecovery.recoverJestResults(testData);
      expect(dataRecoveryResult.success).toBe(true);
      expect(dataRecoveryResult.partialData).toBeDefined();
      
      // Step 2: Try to write report, but directory creation fails
      const permissionError = new Error('EACCES: permission denied') as any;
      permissionError.code = 'EACCES';
      mockFs.mkdir.mockRejectedValue(permissionError);
      
      // Step 3: Error handler should provide fallback
      const originalHandleError = errorHandler.handleError.bind(errorHandler);
      errorHandler.handleError = jest.fn().mockImplementation(async (error) => {
        if (error.type === ReportingErrorType.PERMISSION_ERROR) {
          return {
            success: true,
            fallbackUsed: true,
            recoveredData: '/tmp/emergency-reports'
          };
        }
        return originalHandleError(error);
      });
      
      // Step 4: Should still be able to generate some kind of report
      try {
        await resilientFs.writeFile('/protected/reports/test.html', 'content');
      } catch (error) {
        // Even if this fails, we should have error information
        const stats = errorHandler.getErrorStatistics();
        expect(stats.totalErrors).toBeGreaterThan(0);
      }
      
      // Verify system is aware of degraded state
      expect(errorHandler.isSystemDegraded()).toBe(true);
    });

    it('should maintain error history for debugging', async () => {
      const errors = [
        { message: 'Network timeout', code: 'ENOTFOUND' },
        { message: 'File not found', code: 'ENOENT' },
        { message: 'Permission denied', code: 'EACCES' }
      ];
      
      for (const errorData of errors) {
        const error = new Error(errorData.message) as any;
        error.code = errorData.code;
        await errorHandler.handleError(error);
      }
      
      const recentErrors = errorHandler.getRecentErrors(5);
      expect(recentErrors).toHaveLength(3);
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ReportingErrorType.NETWORK_ERROR]).toBe(1);
      expect(stats.errorsByType[ReportingErrorType.FILE_SYSTEM_ERROR]).toBe(1);
      expect(stats.errorsByType[ReportingErrorType.PERMISSION_ERROR]).toBe(1);
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should handle errors efficiently without significant performance impact', async () => {
      const startTime = Date.now();
      
      // Generate multiple errors quickly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const error = new Error(`Test error ${i}`);
        promises.push(errorHandler.handleError(error));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle 10 errors in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(10);
    });
  });
});