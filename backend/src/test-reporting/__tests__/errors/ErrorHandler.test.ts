/**
 * Unit tests for ErrorHandler
 */

import { ErrorHandler } from '../../errors/ErrorHandler';
import { Logger } from '../../errors/Logger';
import { 
  ReportingErrorType, 
  ErrorSeverity, 
  RecoveryStrategy,
  ErrorHandlingConfig 
} from '../../errors/ErrorTypes';

// Mock Logger
jest.mock('../../errors/Logger');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = new Logger() as jest.Mocked<Logger>;
    errorHandler = new ErrorHandler({
      maxRetries: 3,
      retryDelayMs: 100, // Shorter delay for tests
      enableFallbacks: true,
      enablePartialReports: true,
      logLevel: 'error',
      enableDetailedLogging: true,
      enableStackTraces: true,
      enableActionableGuidance: true,
      failOnCriticalErrors: true,
      timeoutMs: 5000
    });

    // Replace the internal logger with our mock
    (errorHandler as any).logger = mockLogger;
  });

  afterEach(() => {
    errorHandler.clearErrorHistory();
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle raw Error objects by classifying them', async () => {
      const error = new Error('Test error');
      
      const result = await errorHandler.handleError(error);
      
      expect(result.success).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle ReportingError objects directly', async () => {
      const reportingError = {
        type: ReportingErrorType.CONFIGURATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        retryCount: 0,
        maxRetries: 3
      };
      
      const result = await errorHandler.handleError(reportingError);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should fail immediately for critical errors when configured', async () => {
      const criticalError = {
        type: ReportingErrorType.DISK_SPACE_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: 'No disk space',
        details: {},
        timestamp: new Date(),
        recoverable: false,
        recoveryStrategy: RecoveryStrategy.FAIL
      };
      
      const result = await errorHandler.handleError(criticalError);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Critical error');
    });

    it('should not fail immediately for critical errors when configured to continue', async () => {
      const tolerantHandler = new ErrorHandler({
        failOnCriticalErrors: false
      });
      (tolerantHandler as any).logger = mockLogger;
      
      const criticalError = {
        type: ReportingErrorType.DISK_SPACE_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: 'No disk space',
        details: {},
        timestamp: new Date(),
        recoverable: false,
        recoveryStrategy: RecoveryStrategy.FAIL
      };
      
      const result = await tolerantHandler.handleError(criticalError);
      
      expect(result.success).toBe(false);
      expect(result.message).not.toContain('Critical error');
    });
  });

  describe('retry strategy', () => {
    it('should retry transient errors up to max retries', async () => {
      const retryableError = {
        type: ReportingErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network timeout',
        details: { code: 'ENOTFOUND' },
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryCount: 0,
        maxRetries: 3
      };
      
      const result = await errorHandler.handleError(retryableError);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Retry scheduled');
    });

    it('should fail after max retries exceeded', async () => {
      const exhaustedError = {
        type: ReportingErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network timeout',
        details: { code: 'ENOTFOUND' },
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryCount: 3,
        maxRetries: 3
      };
      
      // Simulate multiple retry attempts
      const handler = new ErrorHandler({ maxRetries: 3 });
      (handler as any).logger = mockLogger;
      (handler as any).recoveryAttempts.set('NETWORK_ERROR-unknown-unknown', 3);
      
      const result = await handler.handleError(exhaustedError);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Max retries');
    });
  });

  describe('fallback strategy', () => {
    it('should use fallback for template errors', async () => {
      const templateError = {
        type: ReportingErrorType.TEMPLATE_RENDERING_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Template compilation failed',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        context: { reportFormat: 'html' }
      };
      
      const result = await errorHandler.handleError(templateError);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.recoveredData).toContain('<!DOCTYPE html>');
    });

    it('should use fallback for configuration errors', async () => {
      const configError = {
        type: ReportingErrorType.CONFIGURATION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Invalid config',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.FALLBACK
      };
      
      const result = await errorHandler.handleError(configError);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.recoveredData).toHaveProperty('enabled', true);
    });

    it('should fail when fallbacks are disabled', async () => {
      const noFallbackHandler = new ErrorHandler({
        enableFallbacks: false
      });
      (noFallbackHandler as any).logger = mockLogger;
      
      const templateError = {
        type: ReportingErrorType.TEMPLATE_RENDERING_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Template compilation failed',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.FALLBACK
      };
      
      const result = await noFallbackHandler.handleError(templateError);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Fallbacks disabled');
    });
  });

  describe('partial strategy', () => {
    it('should generate partial results for test parsing errors', async () => {
      const parsingError = {
        type: ReportingErrorType.TEST_RESULT_PARSING_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Malformed test data',
        details: { someData: 'available' },
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.PARTIAL
      };
      
      const result = await errorHandler.handleError(parsingError);
      
      expect(result.success).toBe(true);
      expect(result.partialSuccess).toBe(true);
      expect(result.recoveredData).toHaveProperty('partial', true);
    });

    it('should generate lightweight reports for memory errors', async () => {
      const memoryError = {
        type: ReportingErrorType.MEMORY_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Out of memory',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.PARTIAL
      };
      
      const result = await errorHandler.handleError(memoryError);
      
      expect(result.success).toBe(true);
      expect(result.partialSuccess).toBe(true);
      expect(result.recoveredData).toHaveProperty('lightweight', true);
    });

    it('should fail when partial reports are disabled', async () => {
      const noPartialHandler = new ErrorHandler({
        enablePartialReports: false
      });
      (noPartialHandler as any).logger = mockLogger;
      
      const parsingError = {
        type: ReportingErrorType.TEST_RESULT_PARSING_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Malformed test data',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.PARTIAL
      };
      
      const result = await noPartialHandler.handleError(parsingError);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Partial reports disabled');
    });
  });

  describe('skip strategy', () => {
    it('should skip operations successfully', async () => {
      const skipError = {
        type: ReportingErrorType.DEPENDENCY_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Optional dependency missing',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.SKIP
      };
      
      const result = await errorHandler.handleError(skipError);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Operation skipped');
    });
  });

  describe('fail strategy', () => {
    it('should fail operations when strategy is FAIL', async () => {
      const failError = {
        type: ReportingErrorType.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Access denied',
        details: {},
        timestamp: new Date(),
        recoverable: false,
        recoveryStrategy: RecoveryStrategy.FAIL
      };
      
      const result = await errorHandler.handleError(failError);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Operation failed');
    });
  });

  describe('error statistics', () => {
    it('should track error statistics correctly', async () => {
      const error1 = {
        type: ReportingErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Network error 1',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      };
      
      const error2 = {
        type: ReportingErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error 2',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.RETRY
      };
      
      const error3 = {
        type: ReportingErrorType.CONFIGURATION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Config error',
        details: {},
        timestamp: new Date(),
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.FALLBACK
      };
      
      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);
      await errorHandler.handleError(error3);
      
      const stats = errorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ReportingErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByType[ReportingErrorType.CONFIGURATION_ERROR]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
    });

    it('should identify degraded system state', async () => {
      // Add multiple high severity errors
      for (let i = 0; i < 4; i++) {
        const error = {
          type: ReportingErrorType.MEMORY_ERROR,
          severity: ErrorSeverity.HIGH,
          message: `Memory error ${i}`,
          details: {},
          timestamp: new Date(),
          recoverable: true,
          recoveryStrategy: RecoveryStrategy.PARTIAL
        };
        
        await errorHandler.handleError(error);
      }
      
      expect(errorHandler.isSystemDegraded()).toBe(true);
    });

    it('should identify critical system state', async () => {
      const criticalError = {
        type: ReportingErrorType.DISK_SPACE_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: 'No disk space',
        details: {},
        timestamp: new Date(),
        recoverable: false,
        recoveryStrategy: RecoveryStrategy.FAIL
      };
      
      // Don't fail on critical errors for this test
      const tolerantHandler = new ErrorHandler({
        failOnCriticalErrors: false
      });
      (tolerantHandler as any).logger = mockLogger;
      
      await tolerantHandler.handleError(criticalError);
      
      expect(tolerantHandler.isSystemDegraded()).toBe(true);
    });
  });

  describe('recent errors', () => {
    it('should return recent errors correctly', async () => {
      const errors = [];
      for (let i = 0; i < 15; i++) {
        const error = {
          type: ReportingErrorType.NETWORK_ERROR,
          severity: ErrorSeverity.LOW,
          message: `Error ${i}`,
          details: {},
          timestamp: new Date(),
          recoverable: true,
          recoveryStrategy: RecoveryStrategy.RETRY
        };
        
        errors.push(error);
        await errorHandler.handleError(error);
      }
      
      const recent = errorHandler.getRecentErrors(5);
      
      expect(recent).toHaveLength(5);
      expect(recent[4].message).toBe('Error 14'); // Most recent
      expect(recent[0].message).toBe('Error 10'); // 5th most recent
    });
  });
});