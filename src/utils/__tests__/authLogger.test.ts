/**
 * Authentication Logger Tests
 * Tests for structured logging functionality and error pattern monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthLogger, authLogger } from '../authLogger';

// Mock console methods to test logging output
const mockConsoleLog = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleError = vi.fn();

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

describe('AuthLogger', () => {
  let logger: AuthLogger;

  beforeEach(() => {
    // Mock console methods
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;

    // Create fresh logger instance for each test
    logger = new AuthLogger({
      enableConsoleLogging: true,
      enableStructuredLogging: true,
      logLevel: 'INFO',
      maxLogEntries: 100,
      errorPatternWindow: 5, // 5 minutes for testing
      escalationThreshold: 3, // 3 errors per minute
    });

    // Clear mock calls
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Token Validation Logging', () => {
    it('should log successful token validation', () => {
      const validationStartTime = Date.now() - 100;
      
      logger.logTokenValidation('VALID', {
        tokenPresent: true,
        tokenLength: 150,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        issuedAt: new Date(Date.now() - 1000), // 1 second ago
        validationStartTime,
      }, {
        userId: 'user123',
      });

      // Should log to console with INFO level
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_VALIDATION - Token validation successful'),
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user123',
            timestamp: expect.any(String),
          }),
          details: expect.objectContaining({
            tokenPresent: true,
            validationResult: 'VALID',
            tokenLength: 150,
            validationDuration: expect.any(Number),
          }),
        })
      );

      // Should store in structured logs
      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0]).toMatchObject({
        event: 'TOKEN_VALIDATION',
        level: 'INFO',
        message: 'Token validation successful',
      });
    });

    it('should log token validation failures with appropriate levels', () => {
      const testCases = [
        { result: 'INVALID_FORMAT' as const, expectedLevel: 'WARN' },
        { result: 'DECODE_ERROR' as const, expectedLevel: 'WARN' },
        { result: 'EXPIRED' as const, expectedLevel: 'WARN' },
        { result: 'MALFORMED' as const, expectedLevel: 'WARN' },
      ];

      testCases.forEach(({ result, expectedLevel }) => {
        logger.logTokenValidation(result, {
          tokenPresent: true,
          errorMessage: `Test ${result} error`,
          tokenLength: 100,
        });

        const recentLogs = logger.getRecentLogs(1);
        expect(recentLogs[0]).toMatchObject({
          event: 'TOKEN_VALIDATION',
          level: expectedLevel,
          details: expect.objectContaining({
            validationResult: result,
            errorMessage: `Test ${result} error`,
          }),
        });
      });
    });

    it('should handle missing token scenarios', () => {
      logger.logTokenValidation('INVALID_FORMAT', {
        tokenPresent: false,
        errorMessage: 'No token provided',
      });

      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs[0].event).toBe('TOKEN_VALIDATION');
      const tokenLog = recentLogs[0] as any; // Type assertion for test
      expect(tokenLog.details.tokenPresent).toBe(false);
      expect(tokenLog.details.tokenLength).toBeUndefined();
    });
  });

  describe('Token Refresh Logging', () => {
    it('should log successful token refresh', () => {
      const refreshStartTime = Date.now() - 200;
      const newTokenExpiresAt = new Date(Date.now() + 3600000);

      logger.logTokenRefresh('MANUAL', 'SUCCESS', {
        retryCount: 0,
        maxRetries: 3,
        refreshStartTime,
        newTokenExpiresAt,
      }, {
        userId: 'user123',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_REFRESH - Token refresh success: manual trigger'),
        expect.objectContaining({
          details: expect.objectContaining({
            refreshTrigger: 'MANUAL',
            refreshResult: 'SUCCESS',
            retryCount: 0,
            refreshDuration: expect.any(Number),
          }),
        })
      );
    });

    it('should log failed token refresh with error details', () => {
      logger.logTokenRefresh('EXPIRED', 'FAILED', {
        retryCount: 2,
        maxRetries: 3,
        backoffDelay: 4000,
        errorMessage: 'Network timeout',
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_REFRESH - Token refresh failed: expired trigger'),
        expect.objectContaining({
          details: expect.objectContaining({
            refreshTrigger: 'EXPIRED',
            refreshResult: 'FAILED',
            retryCount: 2,
            backoffDelay: 4000,
            errorMessage: 'Network timeout',
          }),
        })
      );
    });

    it('should log debounced refresh attempts', () => {
      logger.logTokenRefresh('MANUAL', 'DEBOUNCED', {
        retryCount: 0,
        maxRetries: 3,
        errorMessage: 'Too frequent attempts',
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_REFRESH - Token refresh debounced: manual trigger'),
        expect.any(Object)
      );
    });

    it('should handle different refresh triggers', () => {
      const triggers = ['SCHEDULED', 'MANUAL', 'EXPIRED', 'ERROR_RECOVERY'] as const;
      
      triggers.forEach(trigger => {
        logger.logTokenRefresh(trigger, 'SUCCESS', {
          retryCount: 0,
          maxRetries: 3,
        });

        const recentLogs = logger.getRecentLogs(1);
        expect(recentLogs[0].event).toBe('TOKEN_REFRESH');
        const refreshLog = recentLogs[0] as any; // Type assertion for test
        expect(refreshLog.details.refreshTrigger).toBe(trigger);
      });
    });
  });

  describe('Authentication Error Logging', () => {
    it('should log authentication errors with context', () => {
      logger.logAuthError('TOKEN_INVALID', 'Invalid token format', {
        recoveryAction: 'CLEAR_TOKEN',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: true,
        consecutiveFailures: 2,
        lastRecoveryAttempt: new Date(),
      }, {
        userId: 'user123',
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_ERROR - Authentication error: TOKEN_INVALID - Invalid token format'),
        expect.objectContaining({
          details: expect.objectContaining({
            errorType: 'TOKEN_INVALID',
            errorMessage: 'Invalid token format',
            recoveryAction: 'CLEAR_TOKEN',
            retryCount: 1,
            shouldRetry: true,
            consecutiveFailures: 2,
          }),
        })
      );
    });

    it('should escalate to CRITICAL level for high consecutive failures', () => {
      logger.logAuthError('NETWORK_ERROR', 'Connection failed', {
        recoveryAction: 'NONE',
        retryCount: 3,
        maxRetries: 3,
        shouldRetry: false,
        consecutiveFailures: 5, // High consecutive failures
      });

      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs[0].level).toBe('CRITICAL');
    });

    it('should include stack trace when provided', () => {
      const stackTrace = 'Error: Test error\n    at test.js:1:1';
      
      logger.logAuthError('DECODE_ERROR', 'Failed to decode', {
        recoveryAction: 'LOGOUT',
        retryCount: 1,
        maxRetries: 2,
        shouldRetry: true,
        stackTrace,
      });

      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs[0].event).toBe('AUTH_ERROR');
      const errorLog = recentLogs[0] as any; // Type assertion for test
      expect(errorLog.details.stackTrace).toBe(stackTrace);
    });
  });

  describe('Authentication Event Logging', () => {
    it('should log successful authentication events', () => {
      logger.logAuthEvent('LOGIN', true, {
        duration: 1500,
        metadata: {
          userId: 'user123',
          loginMethod: 'email',
        },
      }, {
        userId: 'user123',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_EVENT - login successful'),
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'LOGIN',
            success: true,
            duration: 1500,
            metadata: expect.objectContaining({
              userId: 'user123',
              loginMethod: 'email',
            }),
          }),
        })
      );
    });

    it('should log failed authentication events', () => {
      logger.logAuthEvent('PASSWORD_CHANGE', false, {
        duration: 800,
        errorMessage: 'Current password incorrect',
        metadata: {
          attemptCount: 2,
        },
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_EVENT - password change failed'),
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'PASSWORD_CHANGE',
            success: false,
            errorMessage: 'Current password incorrect',
          }),
        })
      );
    });

    it('should handle all event types', () => {
      const eventTypes = ['LOGIN', 'LOGOUT', 'PROFILE_UPDATE', 'PASSWORD_CHANGE', 'SESSION_INIT', 'ERROR_RECOVERY'] as const;
      
      eventTypes.forEach(eventType => {
        logger.logAuthEvent(eventType, true, {});
        
        const recentLogs = logger.getRecentLogs(1);
        expect(recentLogs[0].event).toBe('AUTH_EVENT');
        const eventLog = recentLogs[0] as any; // Type assertion for test
        expect(eventLog.details.eventType).toBe(eventType);
      });
    });
  });

  describe('Error Pattern Monitoring', () => {
    it('should track error patterns and calculate frequency', () => {
      // Log multiple errors of the same type
      for (let i = 0; i < 5; i++) {
        logger.logAuthError('TOKEN_EXPIRED', 'Token has expired', {
          recoveryAction: 'REFRESH',
          retryCount: 1,
          maxRetries: 3,
          shouldRetry: true,
        });
      }

      const patterns = logger.getErrorPatterns();
      expect(patterns).toHaveLength(1);
      
      const tokenExpiredPattern = patterns.find(p => p.errorType === 'TOKEN_EXPIRED');
      expect(tokenExpiredPattern).toBeDefined();
      expect(tokenExpiredPattern!.count).toBe(5);
      expect(tokenExpiredPattern!.frequency).toBeGreaterThan(0);
    });

    it('should identify escalating error patterns', () => {
      // Rapidly log errors to trigger escalation
      for (let i = 0; i < 10; i++) {
        logger.logAuthError('NETWORK_ERROR', 'Connection timeout', {
          recoveryAction: 'NONE',
          retryCount: 1,
          maxRetries: 3,
          shouldRetry: true,
        });
      }

      const escalatingPatterns = logger.getEscalatingPatterns();
      expect(escalatingPatterns.length).toBeGreaterThan(0);
      
      const networkErrorPattern = escalatingPatterns.find(p => p.errorType === 'NETWORK_ERROR');
      expect(networkErrorPattern).toBeDefined();
      expect(networkErrorPattern!.isEscalating).toBe(true);
    });

    it('should clean up old error patterns', () => {
      // Create a logger with very short window for testing
      const shortWindowLogger = new AuthLogger({
        errorPatternWindow: 0.01, // 0.01 minutes = 0.6 seconds
      });

      // Log an error
      shortWindowLogger.logAuthError('TEST_ERROR', 'Test error', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      // Initially should have the pattern
      expect(shortWindowLogger.getErrorPatterns()).toHaveLength(1);

      // Wait for pattern to expire and trigger cleanup
      setTimeout(() => {
        shortWindowLogger.getErrorPatterns(); // This triggers cleanup
        expect(shortWindowLogger.getErrorPatterns()).toHaveLength(0);
      }, 700); // Wait longer than the window
    });
  });

  describe('Log Management', () => {
    it('should maintain maximum log entries limit', () => {
      const smallLogger = new AuthLogger({ maxLogEntries: 5 });

      // Log more entries than the limit
      for (let i = 0; i < 10; i++) {
        smallLogger.logAuthEvent('LOGIN', true, {
          metadata: { attempt: i },
        });
      }

      const logs = smallLogger.getRecentLogs();
      expect(logs).toHaveLength(5);
      
      // Should keep the most recent entries
      expect(logs[4].event).toBe('AUTH_EVENT');
      const eventLog = logs[4] as any; // Type assertion for test
      expect(eventLog.details.metadata?.attempt).toBe(9);
    });

    it('should filter logs by event type', () => {
      logger.logTokenValidation('VALID', { tokenPresent: true });
      logger.logTokenRefresh('MANUAL', 'SUCCESS', {});
      logger.logAuthError('TEST_ERROR', 'Test', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });
      logger.logAuthEvent('LOGIN', true, {});

      const tokenLogs = logger.getLogsByEvent('TOKEN_VALIDATION');
      expect(tokenLogs).toHaveLength(1);
      expect(tokenLogs[0].event).toBe('TOKEN_VALIDATION');

      const refreshLogs = logger.getLogsByEvent('TOKEN_REFRESH');
      expect(refreshLogs).toHaveLength(1);
      expect(refreshLogs[0].event).toBe('TOKEN_REFRESH');
    });

    it('should filter error logs only', () => {
      logger.logAuthEvent('LOGIN', true, {}); // INFO level
      logger.logTokenValidation('EXPIRED', { // WARN level
        tokenPresent: true,
        errorMessage: 'Token expired',
      });
      logger.logAuthError('CRITICAL_ERROR', 'Critical failure', { // ERROR level
        recoveryAction: 'LOGOUT',
        retryCount: 3,
        maxRetries: 3,
        shouldRetry: false,
      });

      const errorLogs = logger.getErrorLogs();
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('ERROR');
    });

    it('should clear all logs and patterns', () => {
      logger.logAuthEvent('LOGIN', true, {});
      logger.logAuthError('TEST_ERROR', 'Test', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      expect(logger.getRecentLogs()).toHaveLength(2);
      expect(logger.getErrorPatterns()).toHaveLength(1);

      logger.clearLogs();

      expect(logger.getRecentLogs()).toHaveLength(0);
      expect(logger.getErrorPatterns()).toHaveLength(0);
    });

    it('should export logs as JSON', () => {
      logger.logAuthEvent('LOGIN', true, {});
      logger.logAuthError('TEST_ERROR', 'Test', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      const exportedData = logger.exportLogs();
      const parsed = JSON.parse(exportedData);

      expect(parsed).toHaveProperty('logs');
      expect(parsed).toHaveProperty('errorPatterns');
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed.logs).toHaveLength(2);
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect log level configuration', () => {
      const errorOnlyLogger = new AuthLogger({
        logLevel: 'ERROR',
        enableConsoleLogging: true,
      });

      errorOnlyLogger.logAuthEvent('LOGIN', true, {}); // INFO - should not log
      errorOnlyLogger.logTokenValidation('EXPIRED', { // WARN - should not log
        tokenPresent: true,
        errorMessage: 'Expired',
      });
      errorOnlyLogger.logAuthError('CRITICAL', 'Critical error', { // ERROR - should log
        recoveryAction: 'LOGOUT',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      // Only ERROR level should have been logged to console
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });

    it('should disable console logging when configured', () => {
      const noConsoleLogger = new AuthLogger({
        enableConsoleLogging: false,
      });

      noConsoleLogger.logAuthError('TEST_ERROR', 'Test error', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should disable structured logging when configured', () => {
      const noStructuredLogger = new AuthLogger({
        enableStructuredLogging: false,
      });

      noStructuredLogger.logAuthEvent('LOGIN', true, {});

      expect(noStructuredLogger.getRecentLogs()).toHaveLength(0);
    });
  });

  describe('Default Logger Instance', () => {
    it('should provide a default logger instance', () => {
      expect(authLogger).toBeInstanceOf(AuthLogger);
      
      // Test that it works
      authLogger.logAuthEvent('LOGIN', true, {});
      expect(authLogger.getRecentLogs()).toHaveLength(1);
      
      // Clean up
      authLogger.clearLogs();
    });
  });
});