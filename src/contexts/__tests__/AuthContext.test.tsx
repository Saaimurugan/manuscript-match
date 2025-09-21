/**
 * Test file for AuthContext with JWT validation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { jwtValidator } from '../../utils/jwtValidator';
import { expect } from 'vitest';
import { expect, it, beforeEach, describe, vi } from 'vitest';

// Mock the JWT validator
vi.mock('../../utils/jwtValidator', () => ({
  jwtValidator: {
    safeDecodeToken: vi.fn(),
    getTokenExpirationTime: vi.fn(),
  },
}));

// Mock the auth service
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

// Mock the token refresh manager
vi.mock('../../utils/tokenRefreshManager', () => ({
  createTokenRefreshManager: vi.fn(() => ({
    isRefreshInProgress: false,
    refreshToken: vi.fn(),
    scheduleTokenCheck: vi.fn(),
    clearScheduledChecks: vi.fn(),
    reset: vi.fn(),
  })),
}));

const mockedJwtValidator = jwtValidator as any;

// Test component to access auth context
const TestComponent: React.FC = () => {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="token-valid">{auth.tokenState.isValid.toString()}</div>
      <div data-testid="auth-error">{auth.authError?.type || 'none'}</div>
      <div data-testid="retry-count">{auth.authError?.retryCount || 0}</div>
      <div data-testid="recovery-action">{auth.authError?.recoveryAction || 'none'}</div>
      <button data-testid="recover-button" onClick={auth.recoverFromError}>
        Recover
      </button>
    </div>
  );
};

describe('AuthContext with Enhanced Error State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle invalid token format gracefully with recovery action', async () => {
    // Mock invalid token validation
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: false,
      error: 'Invalid JWT token format',
      errorType: 'INVALID_FORMAT',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      expect(screen.getByTestId('auth-error')).toHaveTextContent('TOKEN_INVALID');
      expect(screen.getByTestId('recovery-action')).toHaveTextContent('LOGOUT');
    });
  });

  it('should handle expired tokens with retry tracking', async () => {
    // Mock expired token validation
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: false,
      error: 'JWT token has expired',
      errorType: 'EXPIRED',
      payload: { exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      expect(screen.getByTestId('auth-error')).toHaveTextContent('TOKEN_EXPIRED');
      expect(screen.getByTestId('recovery-action')).toHaveTextContent('REFRESH');
      expect(screen.getByTestId('retry-count')).toHaveTextContent('1');
    });
  });

  it('should handle decode errors with appropriate recovery action', async () => {
    // Mock decode error validation
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: false,
      error: 'Failed to decode JWT token',
      errorType: 'DECODE_ERROR',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      expect(screen.getByTestId('auth-error')).toHaveTextContent('DECODE_ERROR');
      expect(screen.getByTestId('recovery-action')).toHaveTextContent('CLEAR_TOKEN');
    });
  });

  it('should handle malformed tokens with appropriate recovery action', async () => {
    // Mock malformed token validation
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: false,
      error: 'Malformed JWT token',
      errorType: 'MALFORMED',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token-valid')).toHaveTextContent('false');
      expect(screen.getByTestId('auth-error')).toHaveTextContent('MALFORMED_TOKEN');
      expect(screen.getByTestId('recovery-action')).toHaveTextContent('CLEAR_TOKEN');
    });
  });

  it('should handle valid tokens correctly', async () => {
    const validPayload = { 
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      userId: 'test-user-id' 
    };

    // Mock valid token validation
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: true,
      payload: validPayload,
    });

    mockedJwtValidator.getTokenExpirationTime.mockReturnValue(validPayload.exp * 1000);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('token-valid')).toHaveTextContent('true');
      expect(screen.getByTestId('auth-error')).toHaveTextContent('none');
    });
  });

  it('should track retry attempts correctly', async () => {
    // Mock expired token validation that will trigger retries
    mockedJwtValidator.safeDecodeToken.mockReturnValue({
      isValid: false,
      error: 'JWT token has expired',
      errorType: 'EXPIRED',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial error
    await waitFor(() => {
      expect(screen.getByTestId('retry-count')).toHaveTextContent('1');
    });

    // Trigger manual recovery
    const recoverButton = screen.getByTestId('recover-button');
    recoverButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('retry-count')).toHaveTextContent('2');
    });
  });
});