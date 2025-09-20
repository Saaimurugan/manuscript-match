/**
 * Unit tests for error classification and types
 */

import { 
  ErrorClassifier, 
  ReportingErrorType, 
  ErrorSeverity, 
  RecoveryStrategy 
} from '../../errors/ErrorTypes';

describe('ErrorClassifier', () => {
  describe('classifyError', () => {
    it('should classify configuration errors correctly', () => {
      const error = new Error('Invalid configuration format');
      error.name = 'ConfigurationError';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.CONFIGURATION_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Check your test-reporting.config.js file for syntax errors');
    });

    it('should classify file not found errors correctly', () => {
      const error = new Error('ENOENT: no such file or directory') as any;
      error.code = 'ENOENT';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.FILE_SYSTEM_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Ensure the file or directory exists');
    });

    it('should classify permission errors correctly', () => {
      const error = new Error('EACCES: permission denied') as any;
      error.code = 'EACCES';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.PERMISSION_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.FAIL);
      expect(classified.recoverable).toBe(false);
      expect(classified.actionableGuidance).toContain('Check file and directory permissions');
    });

    it('should classify disk space errors correctly', () => {
      const error = new Error('ENOSPC: no space left on device') as any;
      error.code = 'ENOSPC';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.DISK_SPACE_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.CRITICAL);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.FAIL);
      expect(classified.recoverable).toBe(false);
      expect(classified.actionableGuidance).toContain('Free up disk space');
    });

    it('should classify timeout errors correctly', () => {
      const error = new Error('Operation timed out');
      error.name = 'TimeoutError';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.TIMEOUT_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Increase timeout configuration');
    });

    it('should classify memory errors correctly', () => {
      const error = new Error('JavaScript heap out of memory');
      error.name = 'RangeError';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.MEMORY_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.PARTIAL);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Increase Node.js memory limit');
    });

    it('should classify template errors correctly', () => {
      const error = new Error('Template compilation failed');
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.TEMPLATE_RENDERING_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Check template syntax');
    });

    it('should classify Jest errors correctly', () => {
      const error = new Error('Jest test result parsing failed');
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.TEST_RESULT_PARSING_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.PARTIAL);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Check Jest configuration');
    });

    it('should classify network errors correctly', () => {
      const error = new Error('Network request failed') as any;
      error.code = 'ENOTFOUND';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.NETWORK_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.LOW);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(classified.recoverable).toBe(true);
      expect(classified.actionableGuidance).toContain('Check network connectivity');
    });

    it('should classify unknown errors correctly', () => {
      const error = new Error('Some unknown error');
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.type).toBe(ReportingErrorType.UNKNOWN_ERROR);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.recoverable).toBe(true);
      expect(classified.retryCount).toBe(0);
      expect(classified.maxRetries).toBe(3);
    });

    it('should include context information when provided', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'generateReport',
        component: 'HtmlGenerator',
        filePath: '/test/report.html'
      };
      
      const classified = ErrorClassifier.classifyError(error, context);
      
      expect(classified.context).toEqual(context);
    });

    it('should include original error and stack trace', () => {
      const error = new Error('Test error');
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.originalError).toBe(error);
      expect(classified.stackTrace).toBe(error.stack);
      expect(classified.message).toBe(error.message);
    });

    it('should include error details for system errors', () => {
      const error = new Error('System error') as any;
      error.code = 'ENOENT';
      error.errno = -2;
      error.syscall = 'open';
      error.path = '/test/file.txt';
      
      const classified = ErrorClassifier.classifyError(error);
      
      expect(classified.details).toEqual({
        name: 'Error',
        code: 'ENOENT',
        errno: -2,
        syscall: 'open',
        path: '/test/file.txt'
      });
    });
  });

  describe('isTransientError', () => {
    it('should identify transient errors correctly', () => {
      const transientError = {
        type: ReportingErrorType.NETWORK_ERROR,
        recoverable: true,
        retryCount: 1,
        maxRetries: 3
      } as any;
      
      expect(ErrorClassifier.isTransientError(transientError)).toBe(true);
    });

    it('should identify non-transient errors correctly', () => {
      const nonTransientError = {
        type: ReportingErrorType.PERMISSION_ERROR,
        recoverable: false,
        retryCount: 0,
        maxRetries: 3
      } as any;
      
      expect(ErrorClassifier.isTransientError(nonTransientError)).toBe(false);
    });

    it('should identify errors that exceeded retry limit', () => {
      const exceededError = {
        type: ReportingErrorType.NETWORK_ERROR,
        recoverable: true,
        retryCount: 3,
        maxRetries: 3
      } as any;
      
      expect(ErrorClassifier.isTransientError(exceededError)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const error = {
        retryCount: 1
      } as any;
      
      const delay = ErrorClassifier.getRetryDelay(error);
      
      expect(delay).toBeGreaterThan(1000); // Base delay
      expect(delay).toBeLessThan(3000); // With jitter, should be less than 3x base
    });

    it('should respect maximum delay', () => {
      const error = {
        retryCount: 10 // Very high retry count
      } as any;
      
      const delay = ErrorClassifier.getRetryDelay(error);
      
      expect(delay).toBeLessThanOrEqual(30000); // Max 30 seconds
    });

    it('should handle missing retry count', () => {
      const error = {} as any;
      
      const delay = ErrorClassifier.getRetryDelay(error);
      
      expect(delay).toBeGreaterThan(1000);
      expect(delay).toBeLessThan(2000); // First retry should be close to base delay
    });
  });
});