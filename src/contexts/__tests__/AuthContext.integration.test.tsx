/**
 * Integration Tests for AuthContext - Complete Authentication Flow
 * 
 * This file contains comprehensive integration tests that cover:
 * - Authentication flow with various invalid token scenarios
 * - Error recovery mechanisms end-to-end
 * - Token refresh behavior with validation failures  
 * - Logging functionality across different error scenarios
 * 
 * Requirements covered:
 * - 1.1, 1.2, 1.3: Invalid token handling and graceful fallback
 * - 2.1, 2.2: JWT token validation utilities
 * - 3.1, 3.2: Token refresh management
 * - 4.1, 4.2: Error logging and monitoring
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { jwtValidator } from '../../utils/jwtValidator';
import { authService } from '../../services/authService';
import { authLogger } from '../../utils/authLogger';
import { expect, it, beforeEach, describe, vi, afterEach } from 'vitest';

// Mock all dependencies
vi.mock('../../utils/jwtValidator');
vi.mock('../../services/authService');
vi.mock('../../utils/authLogger');

const mockedJwtValidator = vi.mocked(jwtValidator);
const mockedAuthService = vi.mocked(authService);
const mockedAuthLogger = vi.mocked(authLogger);

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
    </div>
  );
};

// Helper functions for creating mock tokens
const createMockToken = (payload: any): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${payloadStr}.${signature}`;
};

const createValidTokenPayload = (expiresInSeconds: number = 3600): any => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  iat: Math.floor(Date.now() / 1000),
});

const createExpiredTokenPayload = (): any => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
});

describe('AuthContext Integration Tests - Complete Authentication Flow', () => {
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
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: true,
      payload: createValidTokenPayload(),
    });
    mockedJwtValidator.getTokenExpirationTime.mockReturnValue(Date.now() + 3600000);
    
    // Mock auth logger
    mockedAuthLogger.logAuthError.mockImplementation(() => {});
    mockedAuthLogger.logAuthEvent.mockImplementation(() => {});
    mockedAuthLogger.logTokenValidation.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Invalid Token Scenarios', () => {
    it('should handle malformed JWT tokens gracefully', async () => {
      // Test requirement 1.1: Invalid token handling
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Invalid JWT token format',
        errorType: 'MALFORMED'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('invalid.token.format');

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-error-type')).toHaveTextContent('MALFORMED_TOKEN');
      });

      // Verify error logging was called - requirement 4.1
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
      // Test requirement 1.2: Graceful error handling
      mockedJwtValidator.safeDecodeToken.mockReturnValue({
        isValid: false,
        error: 'Failed to decode JWT payload - invalid base64 encoding',
        errorType: 'DECODE_ERROR'
      });
      
      mockedAuthService.getCurrentToken.mockReturnValue('header.invalid-base64.signature');

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

      // Verify token cleanup was called
      expect(mockedAuthService.logout).toHaveBeenCalled();
    });

    it('should handle expired tokens with refresh attempt', async () => {
      // Test requirement 2.1: JWT token validation
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

      // Verify refresh was attempted - requirement 3.1
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should execute automatic recovery for expired tokens', async () => {
      // Test requirement 1.3: Error recovery mechanisms
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

      // Verify recovery logging - requirement 4.2
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
      // Test requirement 1.3: Prevent infinite loops
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

      // Should not attempt refresh more than max retries
      await waitFor(() => {
        expect(mockedAuthService.refreshToken).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Token Refresh Behavior with Validation Failures', () => {
    it('should validate refreshed tokens before accepting them', async () => {
      // Test requirement 2.2: Token validation before acceptance
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

    it('should prevent multiple simultaneous refresh attempts', async () => {
      // Test requirement 3.2: Prevent multiple simultaneous refresh attempts
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
  });

  describe('Logging Functionality', () => {
    it('should log token validation failures with context', async () => {
      // Test requirement 4.1: Detailed error logging
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

      // Verify error logging with context - requirement 4.2
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
      // Test requirement 4.2: Authentication event logging
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
  });

  describe('End-to-End Authentication Flow', () => {
    it('should handle complete login-to-logout flow with token validation', async () => {
      // Test complete authentication flow
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
        expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      });
    });

    it('should handle network errors during authentication flow', async () => {
      // Test network error handling
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
  });
});