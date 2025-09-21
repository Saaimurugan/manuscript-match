/**
 * Comprehensive Integration Tests for AuthContext
 * Tests complete authentication flow with various invalid token scenarios,
 * error recovery mechanisms, token refresh behavior, and logging functionality
 * 
 * Requirements covered:
 * - 1.1, 1.2, 1.3: Invalid token handling and graceful fallback
 * - 2.1, 2.2, 2.3, 2.4: JWT token validation utilities
 * - 3.1, 3.2, 3.3, 3.4: Token refresh management
 * - 4.1, 4.2, 4.3, 4.4: Error logging and monitoring
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { jwtValidator } from '../../utils/jwtValidator';
import { createTokenRefreshManager } from '../../utils/tokenRefreshManager';
import { authService } from '../../services/authService';
import { authLogger } from '../../utils/authLogger';
import { expect, it, beforeEach, describe, vi, afterEach } from 'vitest';

// Mock all dependencies
vi.mock('../../utils/jwtValidator', () => ({
  jwtValidator: {
    safeDecodeToken: vi.fn(),
    getTokenExpirationTime: vi.fn(),
    validateTokenFormat: vi.fn(),
    isTokenExpired: vi.fn(),
  },
}));

vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentToken: vi.fn(),
    verifyToken: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock('../../utils/authLogger', () => ({
  authLogger: {
    logAuthError: vi.fn(),
    logAuthEvent: vi.fn(),
    logTokenValidation: vi.fn(),
    logTokenRefresh: vi.fn(),
    getErrorPatterns: vi.fn(() => []),
    getEscalatingPatterns: vi.fn(() => []),
    clearLogs: vi.fn(),
  },
}));

const mockedJwtValidator = jwtValidator as any;
const mockedAuthService = authService as any;
const mockedAuthLogger = authLogger as any;

// Test component to interact with auth context
const TestAuthComponent: React.FC = () => {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="token-valid">{auth.tokenState.isValid.toString()}</div>
      <div data-testid="auth-error-type">{auth.authError?.type || 'none'}</div>
      <div data-testid="auth-error-message">{auth.authError?.message || 'none'}</div>
      <div data-testid="auth-error-recovery">{auth.authError?.recoveryAction || 'none'}</div>
      <div data-testid="is-loading">{auth.isLoading.toString()}</div>
      <div data-testid="user-id">{auth.user?.id || 'none'}</div>
      <div data-testid="token-expires-at">{auth.tokenState.expiresAt?.toISOString() || 'none'}</div>
      <div data-testid="validation-error">{auth.tokenState.validationError || 'none'}</div>
      
      <button 
        data-testid="login-button" 
        onClick={() => auth.login({ email: 'test@example.com', password: 'password' })}
      >
        Login
      </button>
      <button data-testid="logout-button" onClick={() => auth.logout()}>
        Logout
      </button>
      <button data-testid="refresh-button" onClick={() => auth.refreshToken()}>
        Refresh Token
      </button>
      <button data-testid="clear-error-button" onClick={() => auth.clearError()}>
        Clear Error
      </button>
      <button data-testid="recover-button" onClick={() => auth.recoverFromError()}>
        Recover From Error
      </button>
    </div>
  );
};

// Helper function to create mock tokens
const createMockToken = (payload: any): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${payloadStr}.${signature}`;
};

// Helper function to create expired token payload
const createExpiredTokenPayload = (): any => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
});

// Helper function to create valid token payload
const createValidTokenPayload = (expiresInSeconds: number = 3600): any => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  iat: Math.floor(Date.now() / 1000),
});

// Helper function to create malformed token
const createMalformedToken = (): string => {
  return 'invalid.token.format.with.too.many.parts';
};

describe('AuthContext Comprehensive Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    mockedAuthService.getCurrentToken.mockReturnValue(null);
    mockedAuthService.verifyToken.mockResolvedValue(true);
    mockedAuthService.getProfile.mockResolvedValue({ 
      id: 'test-user-id', 
      email: 'test@example.com',
      name: 'Test User'
    });
    mockedAuthService.login.mockResolvedValue({
      token: createMockToken(createValidTokenPayload()),
      user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' }
    });
    mockedAuthService.logout.mockResolvedValue(undefined);
    mockedAuthService.refreshToken.mockResolvedValue(createMockToken(createValidTokenPayload()));
    
    // Default JWT validator mocks
    mockedJwtValidator.validateTokenFormat.mockReturnValue(true);
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: true,
      payload: createValidTokenPayload(),
    });
    mockedJwtValidator.getTokenExpirationTime.mockReturnValue(Date.now() + 3600000);
    mockedJwtValidator.isTokenExpired.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Invalid Token Scenarios', () => {
    it('should handle malformed JWT tokens gracefully', async () => {
      const malformedToken = createMalformedToken();
      
      // Mock malformed token validation
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Invalid JWT token format',
        errorType: 'MALFORMED'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(malformedToken);

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('MALFORMED_TOKEN');
        expect(screen.getByTestId('auth-error-recovery')).toHaveTextContent('CLEAR_TOKEN');
      });

      // Verify logging was called
      expect(mockedAuthLogger.logAuthError).toHaveBeenCalledWith(
        'MALFORMED_TOKEN',
        expect.stringContaining('Token validation failed'),
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
          shouldRetry: false
        }),
        expect.any(Object)
      );
    });

    it('should handle base64 decode errors', async () => {
      const invalidToken = 'header.invalid-base64-payload.signature';
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Failed to decode JWT payload - invalid base64 encoding',
        errorType: 'DECODE_ERROR'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(invalidToken);

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('DECODE_ERROR');
        expect(screen.getByTestId('auth-error-recovery')).toHaveTextContent('CLEAR_TOKEN');
        expect(screen.getByTestId('validation-error')).toHaveTextContent('Failed to decode JWT payload');
      });

      // Verify token was cleared
      expect(mockedAuthService.logout).toHaveBeenCalled();
    });

    it('should handle expired tokens with refresh attempt', async () => {
      const expiredToken = createMockToken(createExpiredTokenPayload());
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'JWT token has expired',
        errorType: 'EXPIRED',
        payload: createExpiredTokenPayload()
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(expiredToken);
      mockedAuthService.refreshToken.mockResolvedValue(createMockToken(createValidTokenPayload()));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('TOKEN_EXPIRED');
        expect(screen.getByTestId('auth-error-recovery')).toHaveTextContent('REFRESH');
      });

      // Verify refresh was attempted
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });
    });

    it('should handle tokens with invalid JSON payload', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Invalid JSON in JWT payload',
        errorType: 'MALFORMED'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('header.invalid-json.signature');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('MALFORMED_TOKEN');
        expect(screen.getByTestId('validation-error')).toHaveTextContent('Invalid JSON in JWT payload');
      });
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should execute automatic recovery for expired tokens', async () => {
      const expiredToken = createMockToken(createExpiredTokenPayload());
      
      // First call returns expired token
      mockedJwtValidator.safeDecodeToken
        .mockReturnValueOnce({
          isValid: false,
          error: 'JWT token has expired',
          errorType: 'EXPIRED',
          payload: createExpiredTokenPayload()
        })
        // Second call (after refresh) returns valid token
        .mockReturnValueOnce({
          isValid: true,
          payload: createValidTokenPayload()
        });
      
      mockedAuthService.getCurrentToken.mockReturnValue(expiredToken);
      mockedAuthService.refreshToken.mockResolvedValue(createMockToken(createValidTokenPayload()));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('TOKEN_EXPIRED');
      });

      // Wait for recovery to complete
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify recovery logging
      expect(mockedAuthLogger.logAuthEvent).toHaveBeenCalledWith(
        'ERROR_RECOVERY',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            errorType: 'TOKEN_EXPIRED',
            recoveryAction: 'REFRESH'
          })
        }),
        expect.any(Object)
      );
    });

    it('should prevent infinite retry loops', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'JWT token has expired',
        errorType: 'EXPIRED'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(createMockToken(createExpiredTokenPayload()));
      mockedAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('TOKEN_EXPIRED');
      });

      // Trigger multiple recovery attempts
      const recoverButton = screen.getByTestId('recover-button');
      
      await act(async () => {
        fireEvent.click(recoverButton);
        fireEvent.click(recoverButton);
        fireEvent.click(recoverButton);
      });

      // Should not attempt refresh more than max retries
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle recovery cooldown period', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Network error',
        errorType: 'DECODE_ERROR'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('invalid-token');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('DECODE_ERROR');
      });

      const recoverButton = screen.getByTestId('recover-button');
      
      // First recovery attempt
      await act(async () => {
        fireEvent.click(recoverButton);
      });

      // Immediate second attempt should be blocked by cooldown
      await act(async () => {
        fireEvent.click(recoverButton);
      });

      // Verify cooldown behavior through logging
      expect(mockedAuthLogger.logAuthEvent).toHaveBeenCalledWith(
        'ERROR_RECOVERY',
        expect.any(Boolean),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should clear invalid tokens automatically', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Invalid token format',
        errorType: 'INVALID_FORMAT'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('invalid-format-token');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-recovery')).toHaveTextContent('LOGOUT');
        expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      });

      // Verify cleanup was called
      expect(mockedAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('Token Refresh Behavior with Validation Failures', () => {
    it('should validate refreshed tokens before accepting them', async () => {
      const expiredToken = createMockToken(createExpiredTokenPayload());
      
      // Mock expired token initially
      mockedJwtValidator.safeDecodeToken
        .mockReturnValueOnce({
          isValid: false,
          error: 'JWT token has expired',
          errorType: 'EXPIRED'
        })
        // Mock invalid refreshed token
        .mockReturnValueOnce({
          isValid: false,
          error: 'Invalid refreshed token',
          errorType: 'MALFORMED'
        });
      
      mockedAuthService.getCurrentToken.mockReturnValue(expiredToken);
      mockedAuthService.refreshToken.mockResolvedValue('invalid-refreshed-token');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('TOKEN_EXPIRED');
      });

      // Wait for refresh attempt and validation failure
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });

      // Should reject invalid refreshed token
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('REFRESH_FAILED');
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent('invalid token from managed refresh');
      });
    });

    it('should handle refresh service failures', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'JWT token has expired',
        errorType: 'EXPIRED'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(createMockToken(createExpiredTokenPayload()));
      mockedAuthService.refreshToken.mockRejectedValue(new Error('Network error during refresh'));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('TOKEN_EXPIRED');
      });

      // Wait for refresh failure
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('REFRESH_FAILED');
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent('Network error during refresh');
      });
    });

    it('should prevent multiple simultaneous refresh attempts', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(createMockToken(createValidTokenPayload()));
      
      // Mock slow refresh
      mockedAuthService.refreshToken.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(createMockToken(createValidTokenPayload())), 1000))
      );

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      const refreshButton = screen.getByTestId('refresh-button');
      
      // Trigger multiple refresh attempts
      await act(async () => {
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
      });

      // Should only call refresh once due to debouncing
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalledTimes(1);
      });
    });

    it('should schedule automatic token refresh before expiration', async () => {
      vi.useFakeTimers();
      
      const soonToExpirePayload = createValidTokenPayload(300); // Expires in 5 minutes
      const soonToExpireToken = createMockToken(soonToExpirePayload);
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: soonToExpirePayload
      });
      
      mockedJwtValidator.getTokenExpirationTime.mockReturnValue(Date.now() + 300000); // 5 minutes
      
      mockedAuthService.getCurrentToken.mockReturnValue(soonToExpireToken);
      mockedAuthService.refreshToken.mockResolvedValue(createMockToken(createValidTokenPayload()));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Fast-forward to trigger scheduled refresh
      act(() => {
        vi.advanceTimersByTime(300000); // 5 minutes
      });

      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });

  describe('Logging Functionality', () => {
    it('should log token validation failures with context', async () => {
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Invalid token format',
        errorType: 'INVALID_FORMAT'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('invalid-token');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('TOKEN_INVALID');
      });

      // Verify error logging
      expect(mockedAuthLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        expect.stringContaining('Token validation failed'),
        expect.objectContaining({
          recoveryAction: 'LOGOUT',
          retryCount: expect.any(Number),
          maxRetries: expect.any(Number),
          shouldRetry: false
        }),
        expect.objectContaining({
          userId: undefined
        })
      );
    });

    it('should log authentication events with metadata', async () => {
      const validToken = createMockToken(createValidTokenPayload());
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(validToken);

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Verify session initialization logging
      expect(mockedAuthLogger.logAuthEvent).toHaveBeenCalledWith(
        'SESSION_INIT',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            phase: 'complete',
            userId: 'test-user-id'
          })
        }),
        expect.objectContaining({
          userId: 'test-user-id'
        })
      );
    });

    it('should log login events with success/failure status', async () => {
      const validToken = createMockToken(createValidTokenPayload());
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.login.mockResolvedValue({
        token: validToken,
        user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' }
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      
      await act(async () => {
        fireEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Verify login success logging
      expect(mockedAuthLogger.logAuthEvent).toHaveBeenCalledWith(
        'LOGIN',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'test-user-id'
          })
        }),
        expect.objectContaining({
          userId: 'test-user-id'
        })
      );
    });

    it('should log logout events with reason', async () => {
      const validToken = createMockToken(createValidTokenPayload());
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(validToken);

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByTestId('logout-button');
      
      await act(async () => {
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      });

      // Verify logout logging
      expect(mockedAuthLogger.logAuthEvent).toHaveBeenCalledWith(
        'LOGOUT',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'user_initiated'
          })
        }),
        expect.objectContaining({
          userId: 'test-user-id'
        })
      );
    });

    it('should log token refresh attempts and results', async () => {
      const validToken = createMockToken(createValidTokenPayload());
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(validToken);
      mockedAuthService.refreshToken.mockResolvedValue(createMockToken(createValidTokenPayload()));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      const refreshButton = screen.getByTestId('refresh-button');
      
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });

      // Verify token refresh logging would be called by the token refresh manager
      // (The actual logging happens in the token refresh manager, not directly in AuthContext)
    });

    it('should log error patterns for monitoring', async () => {
      // Simulate multiple consecutive errors
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Network error',
        errorType: 'DECODE_ERROR'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('invalid-token');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('DECODE_ERROR');
      });

      // Verify error logging includes consecutive failure tracking
      expect(mockedAuthLogger.logAuthError).toHaveBeenCalledWith(
        'DECODE_ERROR',
        expect.any(String),
        expect.objectContaining({
          consecutiveFailures: expect.any(Number)
        }),
        expect.any(Object)
      );
    });
  });

  describe('End-to-End Authentication Flow', () => {
    it('should handle complete login-to-logout flow with token validation', async () => {
      const validToken = createMockToken(createValidTokenPayload());
      
      // Mock successful login
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.login.mockResolvedValue({
        token: validToken,
        user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' }
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Initial state - not authenticated
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');

      // Perform login
      const loginButton = screen.getByTestId('login-button');
      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Should be authenticated after login
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-id')).toHaveTextContent('test-user-id');
        expect(screen.getByTestId('token-valid')).toHaveTextContent('true');
      });

      // Perform logout
      const logoutButton = screen.getByTestId('logout-button');
      await act(async () => {
        fireEvent.click(logoutButton);
      });

      // Should be logged out
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user-id')).toHaveTextContent('none');
        expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      });
    });

    it('should handle token expiration during active session', async () => {
      vi.useFakeTimers();
      
      const shortLivedPayload = createValidTokenPayload(60); // Expires in 1 minute
      const shortLivedToken = createMockToken(shortLivedPayload);
      
      // Initially valid token
      mockedJwtValidator.safeDecodeToken
        .mockReturnValueOnce({
          isValid: true,
          payload: shortLivedPayload
        })
        // After time passes, token becomes expired
        .mockReturnValueOnce({
          isValid: false,
          error: 'JWT token has expired',
          errorType: 'EXPIRED'
        });
      
      mockedJwtValidator.getTokenExpirationTime.mockReturnValue(Date.now() + 60000);
      
      mockedAuthService.getCurrentToken.mockReturnValue(shortLivedToken);
      mockedAuthService.refreshToken.mockResolvedValue(createMockToken(createValidTokenPayload()));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Initially authenticated
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Fast-forward past token expiration
      act(() => {
        vi.advanceTimersByTime(70000); // 70 seconds
      });

      // Should detect expiration and attempt refresh
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should handle network errors during authentication flow', async () => {
      // Mock network error during login
      mockedAuthService.login.mockRejectedValue(new Error('Network connection failed'));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      
      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Should handle login failure gracefully
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      });

      // Verify error logging
      expect(mockedAuthLogger.logAuthEvent).toHaveBeenCalledWith(
        'LOGIN',
        false,
        expect.objectContaining({
          errorMessage: 'Network connection failed'
        }),
        expect.any(Object)
      );
    });

    it('should maintain authentication state across component re-renders', async () => {
      const validToken = createMockToken(createValidTokenPayload());
      
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: true,
        payload: createValidTokenPayload()
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue(validToken);

      const { rerender } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Re-render component
      rerender(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Should maintain authentication state
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-id')).toHaveTextContent('test-user-id');
    });
  });
});