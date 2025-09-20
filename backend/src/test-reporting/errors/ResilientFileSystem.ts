/**
 * Resilient file system operations with retry logic and error recovery
 * Handles transient file system errors with exponential backoff
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ErrorHandler } from './ErrorHandler';
import { ErrorClassifier, ReportingErrorType, ErrorContext } from './ErrorTypes';
import { Logger } from './Logger';

export interface FileSystemConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  enableBackup: boolean;
  backupDirectory?: string;
  enableTempFiles: boolean;
  tempDirectory?: string;
}

export class ResilientFileSystem {
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private config: FileSystemConfig;

  constructor(
    errorHandler: ErrorHandler,
    logger: Logger,
    config: Partial<FileSystemConfig> = {}
  ) {
    this.errorHandler = errorHandler;
    this.logger = logger;
    this.config = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      enableBackup: true,
      enableTempFiles: true,
      tempDirectory: path.join(process.cwd(), 'temp'),
      backupDirectory: path.join(process.cwd(), 'backups'),
      ...config
    };
  }

  /**
   * Write file with retry logic and atomic operations
   */
  public async writeFile(
    filePath: string,
    content: string | Buffer,
    options?: { encoding?: BufferEncoding; mode?: number; flag?: string }
  ): Promise<void> {
    const context: ErrorContext = {
      operation: 'writeFile',
      component: 'ResilientFileSystem',
      filePath
    };

    return this.executeWithRetry(async () => {
      // Ensure directory exists
      await this.ensureDirectory(path.dirname(filePath));

      if (this.config.enableTempFiles) {
        // Write to temporary file first, then move (atomic operation)
        const tempPath = await this.getTempFilePath(filePath);
        
        try {
          await fs.writeFile(tempPath, content, options);
          await fs.rename(tempPath, filePath);
          
          this.logger.debug(`File written successfully: ${filePath}`, {
            size: Buffer.isBuffer(content) ? content.length : content.length,
            tempPath
          });
        } catch (error) {
          // Clean up temp file on error
          try {
            await fs.unlink(tempPath);
          } catch (cleanupError) {
            this.logger.warn(`Failed to clean up temp file: ${tempPath}`, { error: cleanupError });
          }
          throw error;
        }
      } else {
        // Direct write
        await fs.writeFile(filePath, content, options);
        this.logger.debug(`File written successfully: ${filePath}`, {
          size: Buffer.isBuffer(content) ? content.length : content.length
        });
      }
    }, context);
  }

  /**
   * Read file with retry logic
   */
  public async readFile(
    filePath: string,
    options?: { encoding?: BufferEncoding; flag?: string }
  ): Promise<string | Buffer> {
    const context: ErrorContext = {
      operation: 'readFile',
      component: 'ResilientFileSystem',
      filePath
    };

    return this.executeWithRetry(async () => {
      const content = await fs.readFile(filePath, options);
      
      this.logger.debug(`File read successfully: ${filePath}`, {
        size: Buffer.isBuffer(content) ? content.length : content.length
      });
      
      return content;
    }, context);
  }

  /**
   * Create directory with retry logic
   */
  public async ensureDirectory(dirPath: string): Promise<void> {
    const context: ErrorContext = {
      operation: 'ensureDirectory',
      component: 'ResilientFileSystem',
      filePath: dirPath
    };

    return this.executeWithRetry(async () => {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Directory ensured: ${dirPath}`);
    }, context);
  }

  /**
   * Copy file with retry logic
   */
  public async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const context: ErrorContext = {
      operation: 'copyFile',
      component: 'ResilientFileSystem',
      filePath: sourcePath
    };

    return this.executeWithRetry(async () => {
      // Ensure destination directory exists
      await this.ensureDirectory(path.dirname(destPath));
      
      await fs.copyFile(sourcePath, destPath);
      
      this.logger.debug(`File copied successfully: ${sourcePath} -> ${destPath}`);
    }, context);
  }

  /**
   * Move file with retry logic
   */
  public async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const context: ErrorContext = {
      operation: 'moveFile',
      component: 'ResilientFileSystem',
      filePath: sourcePath
    };

    return this.executeWithRetry(async () => {
      // Ensure destination directory exists
      await this.ensureDirectory(path.dirname(destPath));
      
      try {
        // Try rename first (fastest for same filesystem)
        await fs.rename(sourcePath, destPath);
      } catch (error) {
        // If rename fails, try copy + delete
        if ((error as any).code === 'EXDEV') {
          await fs.copyFile(sourcePath, destPath);
          await fs.unlink(sourcePath);
        } else {
          throw error;
        }
      }
      
      this.logger.debug(`File moved successfully: ${sourcePath} -> ${destPath}`);
    }, context);
  }

  /**
   * Delete file with retry logic
   */
  public async deleteFile(filePath: string, options?: { force?: boolean }): Promise<void> {
    const context: ErrorContext = {
      operation: 'deleteFile',
      component: 'ResilientFileSystem',
      filePath
    };

    return this.executeWithRetry(async () => {
      try {
        await fs.unlink(filePath);
        this.logger.debug(`File deleted successfully: ${filePath}`);
      } catch (error) {
        if ((error as any).code === 'ENOENT' && options?.force) {
          // File doesn't exist, but force flag is set - ignore
          this.logger.debug(`File already deleted: ${filePath}`);
          return;
        }
        throw error;
      }
    }, context);
  }

  /**
   * Check if file exists
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file stats with retry logic
   */
  public async getFileStats(filePath: string): Promise<fs.Stats> {
    const context: ErrorContext = {
      operation: 'getFileStats',
      component: 'ResilientFileSystem',
      filePath
    };

    return this.executeWithRetry(async () => {
      return await fs.stat(filePath);
    }, context);
  }

  /**
   * Create backup of file before modification
   */
  public async createBackup(filePath: string): Promise<string | null> {
    if (!this.config.enableBackup) {
      return null;
    }

    try {
      const exists = await this.fileExists(filePath);
      if (!exists) {
        return null;
      }

      const backupPath = await this.getBackupPath(filePath);
      await this.ensureDirectory(path.dirname(backupPath));
      await this.copyFile(filePath, backupPath);
      
      this.logger.info(`Backup created: ${filePath} -> ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.warn(`Failed to create backup for ${filePath}`, { error });
      return null;
    }
  }

  /**
   * Restore file from backup
   */
  public async restoreFromBackup(filePath: string, backupPath: string): Promise<void> {
    const context: ErrorContext = {
      operation: 'restoreFromBackup',
      component: 'ResilientFileSystem',
      filePath
    };

    return this.executeWithRetry(async () => {
      await this.copyFile(backupPath, filePath);
      this.logger.info(`File restored from backup: ${backupPath} -> ${filePath}`);
    }, context);
  }

  /**
   * Clean up old backup files
   */
  public async cleanupBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.config.enableBackup || !this.config.backupDirectory) {
      return;
    }

    try {
      const backupDir = this.config.backupDirectory;
      const exists = await this.fileExists(backupDir);
      
      if (!exists) {
        return;
      }

      const files = await fs.readdir(backupDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await this.getFileStats(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteFile(filePath, { force: true });
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info(`Cleaned up ${cleanedCount} old backup files`);
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup backup files', { error });
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const reportingError = ErrorClassifier.classifyError(error as Error, context);
      
      // Check if we should retry
      if (attempt < this.config.maxRetries && this.shouldRetry(reportingError)) {
        const delay = this.calculateDelay(attempt);
        
        this.logger.warn(`File operation failed, retrying in ${delay}ms (attempt ${attempt}/${this.config.maxRetries})`, {
          error: reportingError,
          operation: context.operation,
          filePath: context.filePath,
          attempt
        });

        await this.sleep(delay);
        return this.executeWithRetry(operation, context, attempt + 1);
      }

      // Handle error through error handler
      const recoveryResult = await this.errorHandler.handleError(reportingError);
      
      if (recoveryResult.success) {
        if (recoveryResult.recoveredData !== undefined) {
          return recoveryResult.recoveredData;
        }
        // If recovery was successful but no data returned, retry the operation
        return this.executeWithRetry(operation, context, attempt + 1);
      }

      // Recovery failed, throw the original error
      throw error;
    }
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(error: any): boolean {
    const retryableCodes = [
      'EBUSY',    // Resource busy
      'EMFILE',   // Too many open files
      'ENFILE',   // File table overflow
      'ENOENT',   // No such file or directory (might be transient)
      'EAGAIN',   // Resource temporarily unavailable
      'EINTR',    // Interrupted system call
      'EIO',      // I/O error
      'ENOSPC'    // No space left on device (might be temporary)
    ];

    return error.type === ReportingErrorType.FILE_SYSTEM_ERROR &&
           retryableCodes.includes(error.details?.code);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  /**
   * Get temporary file path
   */
  private async getTempFilePath(originalPath: string): Promise<string> {
    const tempDir = this.config.tempDirectory!;
    await this.ensureDirectory(tempDir);
    
    const fileName = path.basename(originalPath);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return path.join(tempDir, `${fileName}.${timestamp}.${random}.tmp`);
  }

  /**
   * Get backup file path
   */
  private async getBackupPath(originalPath: string): Promise<string> {
    const backupDir = this.config.backupDirectory!;
    const fileName = path.basename(originalPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return path.join(backupDir, `${fileName}.${timestamp}.backup`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get disk space information
   */
  public async getDiskSpace(dirPath: string): Promise<{ free: number; total: number } | null> {
    try {
      const stats = await fs.statfs(dirPath);
      return {
        free: stats.bavail * stats.bsize,
        total: stats.blocks * stats.bsize
      };
    } catch (error) {
      this.logger.warn(`Failed to get disk space for ${dirPath}`, { error });
      return null;
    }
  }

  /**
   * Check if there's enough disk space for operation
   */
  public async hasEnoughSpace(dirPath: string, requiredBytes: number): Promise<boolean> {
    const diskSpace = await this.getDiskSpace(dirPath);
    if (!diskSpace) {
      // If we can't determine disk space, assume we have enough
      return true;
    }
    
    // Add 10% buffer
    const requiredWithBuffer = requiredBytes * 1.1;
    return diskSpace.free >= requiredWithBuffer;
  }
}