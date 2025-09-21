/**
 * Authentication Logger Integration Tests
 * Tests integration between logging system and authentication utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { jwtValidator } from '../jwtValidator';
import { createTokenRefreshManager } from '../tokenRefreshManager';
import { authLogger } from '../authLogger';

describe('Authentication Logger Integration', () => {
  beforeEach(() => {
    // Clear logs before each test
    authLogger.clearLogs();
  });

  describe('JWT Validator Integration', () => {
    it('should log token validation when using jwtValidator', () => {
      // Test with invalid token format
      const result = jwtValidator.safeDecodeToken('invalid.token');
      
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('INVALID_FORMAT');
      
      // Check that logging occurred
      const logs = authLogger.getLogsByEvent('TOKEN_VALIDATION', 10);
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('TOKEN_VALIDATION');
      
      // Type-safe access to validation result
      const tokenLog = logs[0];
      if (tokenLog.event === 'TOKEN_VALIDATION') {
        expect(tokenLog.details.validationResult).toBe('INVALID_FORMAT');
      }
    });

    it('should log successful token validation', () => {
      // Create a valid token for testing
      const payload = { sub: '1234567890', name: 'John Doe', iat: 1516239022 };
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      const header = { alg: 'HS256', typ: 'JWT' };
      const payloadWithExp = { ...payload, exp: futureExp };
      
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
      const encodedPayload = btoa(JSON.stringify(payloadWithExp)).replace(/=/g, '');
      const signature = 'fake-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;
      
      const result = jwtValidator.safeDecodeToken(token);
      
      expect(result.isValid).toBe(true);
      
      // Check that success was logged
      const logs = authLogger.getLogsByEvent('TOKEN_VALIDATION', 10);
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('TOKEN_VALIDATION');
      expect(logs[0].level).toBe('INFO');
      
      // Type-safe access to validation result
      const tokenLog = logs[0];
      if (tokenLog.event === 'TOKEN_VALIDATION') {
        expect(tokenLog.details.validationResult).toBe('VALID');
      }
    });

    it('should log expired token validation', () => {
      // Create an expired token
      const payload = { sub: '1234567890', name: 'John Doe' };
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      const header = { alg: 'HS256', typ: 'JWT' };
      const payloadWithExp = { ...payload, exp: pastExp };
      
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
      const encodedPayload = btoa(JSON.stringify(payloadWithExp)).replace(/=/g, '');
      const signature = 'fake-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;
      
      const result = jwtValidator.safeDecodeToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('EXPIRED');
      
      // Check that expiration was logged
      const logs = authLogger.getLogsByEvent('TOKEN_VALIDATION', 10);
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('TOKEN_VALIDATION');
      expect(logs[0].level).toBe('WARN');
      
      // Type-safe access to validation result
      const tokenLog = logs[0];
      if (tokenLog.event === 'TOKEN_VALIDATION') {
        expect(tokenLog.details.validationResult).toBe('EXPIRED');
      }
    });
  });

  describe('Token Refresh Manager Integration', () => {
    it('should log token refresh attempts', async () => {
      // Mock refresh function that fails
      const mockRefreshFunction = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const refreshManager = createTokenRefreshManager(mockRefreshFunction, {
        maxRetries: 1,
        baseDelay: 100,
      });

      try {
        await refreshManager.refreshToken();
      } catch (error) {
        // Expected to fail
      }

      // Check that refresh failure was logged
      const logs = authLogger.getLogsByEvent('TOKEN_REFRESH', 10);
      expect(logs.length).toBeGreaterThan(0);
      
      const failedRefreshLog = logs.find(log => {
        if (log.event === 'TOKEN_REFRESH') {
          return log.details.refreshResult === 'FAILED';
        }
        return false;
      });
      expect(failedRefreshLog).toBeDefined();
      expect(failedRefreshLog!.level).toBe('ERROR');
    });

    it('should log successful token refresh', async () => {
      // Create a valid token for the mock response
      const payload = { sub: '1234567890', name: 'John Doe', iat: Math.floor(Date.now() / 1000) };
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      
      const header = { alg: 'HS256', typ: 'JWT' };
      const payloadWithExp = { ...payload, exp: futureExp };
      
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
      const encodedPayload = btoa(JSON.stringify(payloadWithExp)).replace(/=/g, '');
      const signature = 'fake-signature';
      
      const newToken = `${encodedHeader}.${encodedPayload}.${signature}`;

      // Mock refresh function that succeeds
      const mockRefreshFunction = vi.fn().mockResolvedValue(newToken);
      
      const refreshManager = createTokenRefreshManager(mockRefreshFunction);

      const result = await refreshManager.refreshToken();
      
      expect(result.success).toBe(true);
      expect(result.token).toBe(newToken);

      // Check that success was logged
      const logs = authLogger.getLogsByEvent('TOKEN_REFRESH', 10);
      expect(logs.length).toBeGreaterThan(0);
      
      const successRefreshLog = logs.find(log => {
        if (log.event === 'TOKEN_REFRESH') {
          return log.details.refreshResult === 'SUCCESS';
        }
        return false;
      });
      expect(successRefreshLog).toBeDefined();
      expect(successRefreshLog!.level).toBe('INFO');
    });

    it('should log debounced refresh attempts', async () => {
      const mockRefreshFunction = vi.fn().mockResolvedValue('fake-token');
      
      const refreshManager = createTokenRefreshManager(mockRefreshFunction, {
        debounceMs: 1000, // 1 second debounce
      });

      // Make first refresh call
      const firstCall = refreshManager.refreshToken();
      
      // Immediately make second call (should be debounced)
      const secondCall = refreshManager.refreshToken();

      await Promise.all([firstCall, secondCall]);

      // Check for debounced log entries
      const logs = authLogger.getLogsByEvent('TOKEN_REFRESH', 10);
      const debouncedLog = logs.find(log => {
        if (log.event === 'TOKEN_REFRESH') {
          return log.details.refreshResult === 'IN_PROGRESS';
        }
        return false;
      });
      
      // Should have at least one in-progress log
      expect(debouncedLog).toBeDefined();
    });
  });

  describe('Error Pattern Detection', () => {
    it('should detect escalating error patterns', () => {
      // Simulate multiple authentication errors
      for (let i = 0; i < 10; i++) {
        authLogger.logAuthError('TOKEN_INVALID', 'Repeated token validation failure', {
          recoveryAction: 'CLEAR_TOKEN',
          retryCount: 1,
          maxRetries: 3,
          shouldRetry: false,
        });
      }

      const errorPatterns = authLogger.getErrorPatterns();
      expect(errorPatterns).toHaveLength(1);
      
      const tokenInvalidPattern = errorPatterns.find(p => p.errorType === 'TOKEN_INVALID');
      expect(tokenInvalidPattern).toBeDefined();
      expect(tokenInvalidPattern!.count).toBe(10);
      expect(tokenInvalidPattern!.frequency).toBeGreaterThan(0);

      const escalatingPatterns = authLogger.getEscalatingPatterns();
      expect(escalatingPatterns.length).toBeGreaterThan(0);
    });

    it('should track different error types separately', () => {
      // Log different types of errors
      authLogger.logAuthError('TOKEN_EXPIRED', 'Token expired', {
        recoveryAction: 'REFRESH',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: true,
      });

      authLogger.logAuthError('NETWORK_ERROR', 'Connection failed', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: true,
      });

      authLogger.logAuthError('TOKEN_EXPIRED', 'Another token expired', {
        recoveryAction: 'REFRESH',
        retryCount: 2,
        maxRetries: 3,
        shouldRetry: true,
      });

      const errorPatterns = authLogger.getErrorPatterns();
      expect(errorPatterns).toHaveLength(2);
      
      const expiredPattern = errorPatterns.find(p => p.errorType === 'TOKEN_EXPIRED');
      const networkPattern = errorPatterns.find(p => p.errorType === 'NETWORK_ERROR');
      
      expect(expiredPattern!.count).toBe(2);
      expect(networkPattern!.count).toBe(1);
    });
  });

  describe('Log Export and Management', () => {
    it('should export comprehensive log data', () => {
      // Generate various types of logs
      authLogger.logAuthEvent('LOGIN', true, {
        duration: 1000,
        metadata: { method: 'email' },
      });

      authLogger.logTokenValidation('VALID', {
        tokenPresent: true,
        tokenLength: 150,
      });

      authLogger.logAuthError('TEST_ERROR', 'Test error message', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      const exportedData = authLogger.exportLogs();
      const parsed = JSON.parse(exportedData);

      expect(parsed).toHaveProperty('logs');
      expect(parsed).toHaveProperty('errorPatterns');
      expect(parsed).toHaveProperty('exportedAt');
      
      expect(parsed.logs).toHaveLength(3);
      expect(parsed.errorPatterns).toHaveLength(1);
      
      // Verify log types are present
      const logEvents = parsed.logs.map((log: any) => log.event);
      expect(logEvents).toContain('AUTH_EVENT');
      expect(logEvents).toContain('TOKEN_VALIDATION');
      expect(logEvents).toContain('AUTH_ERROR');
    });

    it('should filter logs by type correctly', () => {
      // Add mixed log types
      authLogger.logAuthEvent('LOGIN', true, {});
      authLogger.logAuthEvent('LOGOUT', true, {});
      authLogger.logTokenValidation('VALID', { tokenPresent: true });
      authLogger.logAuthError('TEST_ERROR', 'Test', {
        recoveryAction: 'NONE',
        retryCount: 1,
        maxRetries: 3,
        shouldRetry: false,
      });

      const authEventLogs = authLogger.getLogsByEvent('AUTH_EVENT');
      const tokenValidationLogs = authLogger.getLogsByEvent('TOKEN_VALIDATION');
      const authErrorLogs = authLogger.getLogsByEvent('AUTH_ERROR');

      expect(authEventLogs).toHaveLength(2);
      expect(tokenValidationLogs).toHaveLength(1);
      expect(authErrorLogs).toHaveLength(1);

      // Verify correct event types
      expect(authEventLogs.every(log => log.event === 'AUTH_EVENT')).toBe(true);
      expect(tokenValidationLogs.every(log => log.event === 'TOKEN_VALIDATION')).toBe(true);
      expect(authErrorLogs.every(log => log.event === 'AUTH_ERROR')).toBe(true);
    });
  });
});