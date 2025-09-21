/**
 * Integration tests for AuthErrorBoundary with token validation failures
 * Tests the error boundary behavior with real authentication scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthErrorBoundary } from '../AuthErrorBoundary';
import { AuthProviderWithErrorBoundary } from '../AuthProviderWithErrorBoundary';
import { jwtValidator } from '../../../utils/jwtValidator';
import { authLogger } from '../../../utils/authLogger';

// Mock dependencies
vi.mock('../../../utils/jwtValidator', () => ({
  jwtValidator: {
    safeDecodeToken: vi.fn(),
    validateTokenFormat: vi.fn(),
    isTokenExpired: vi.fn(),
    getTokenExpirationTime: vi.fn(),
  },
}));

vi.mock('../../../utils/authLogger', () => ({
  authLogger: {
    logAuthError: vi.fn(),
    logAuthEvent: vi.fn(),
  },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    clearError: vi.fn(),
    recoverFromError: vi.fn(),
  }),
}));

// Component that simulates token validation failures
const TokenValidationComponent: React.FC<{ 
  tokenValidationError?: 'INVALID_FORMAT' | 'DECODE_ERROR' | 'EXPIRED' | 'MALFORMED' | null;
}> = ({ tokenValidationError = null }) => {
  React.useEffect(() => {
    if (tokenValidationError) {
      // Simulate token validation that throws an error
      const token = 'invalid.token.here';
      
      switch (tokenValidationError) {
        case 'INVALID_FORMAT':
          throw new Error('Token validation failed: invalid format');
        case 'DECODE_ERROR':
          throw new Error('InvalidCharacterError: Failed to execute \'atob\' on \'Window\'');
        case 'EXPIRED':
          throw new Error('Token has expired');
        case 'MALFORMED':
          throw new Error('Malformed JWT token structure');
        default:
          break;
      }
    }
  }, [tokenValidationError]);

  return <div data-testid="token-validation-component">Token Validation Component</div>;
};

// Component that simulates authentication network errors
const AuthNetworkComponent: React.FC<{ 
  networkError?: '401' | '403' | 'NETWORK_FAILURE' | null;
}> = ({ networkError = null }) => {
  React.useEffect(() => {
    if (networkError) {
      switch (networkError) {
        case '401':
          throw new Error('Network error: 401 Unauthorized - Invalid credentials');
        case '403':
          throw new Error('Network error: 403 Forbidden - Access denied');
        case 'NETWORK_FAILURE':
          throw new Error('Network request failed: Unable to connect to authentication server');
        default:
          break;
      }
    }
  }, [networkError]);

  return <div data-testid="auth-network-component">Auth Network Component</div>;
};

describe('AuthErrorBoundary Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock console methods
    console.error = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();

    // Mock window methods
    window.dispatchEvent = vi.fn();
    window.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    } as any;
    
    window.sessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    } as any;

    // Mock navigation methods
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        replace: vi.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('Token Validation Error Scenarios', () => {
    it('should handle invalid token format errors', async () => {
      render(
        <AuthErrorBoundary>
          <TokenValidationComponent tokenValidationError="INVALID_FORMAT" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/session has become invalid/i)).toBeInTheDocument();
      });

      // Verify error categorization and logging
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'Token validation failed: invalid format',
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY_CATCH',
        }),
        expect.objectContaining({
          errorType: 'TOKEN_VALIDATION',
        })
      );
    });

    it('should handle base64 decode errors', async () => {
      render(
        <AuthErrorBoundary>
          <TokenValidationComponent tokenValidationError="DECODE_ERROR" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/problem with your authentication data/i)).toBeInTheDocument();
      });

      // Verify error categorization
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'DECODE_ERROR',
        expect.stringContaining('InvalidCharacterError'),
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY_CATCH',
        }),
        expect.objectContaining({
          errorType: 'TOKEN_DECODE',
        })
      );
    });

    it('should handle expired token errors', async () => {
      render(
        <AuthErrorBoundary>
          <TokenValidationComponent tokenValidationError="EXPIRED" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // Expired tokens should still be categorized as validation errors in error boundary
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'Token has expired',
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY_CATCH',
        }),
        expect.objectContaining({
          errorType: 'TOKEN_VALIDATION',
        })
      );
    });

    it('should handle malformed JWT token errors', async () => {
      render(
        <AuthErrorBoundary>
          <TokenValidationComponent tokenValidationError="MALFORMED" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/session has become invalid/i)).toBeInTheDocument();
      });

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'Malformed JWT token structure',
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY_CATCH',
        }),
        expect.objectContaining({
          errorType: 'TOKEN_VALIDATION',
        })
      );
    });
  });

  describe('Network Authentication Error Scenarios', () => {
    it('should handle 401 unauthorized errors', async () => {
      render(
        <AuthErrorBoundary>
          <AuthNetworkComponent networkError="401" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/unable to verify your authentication/i)).toBeInTheDocument();
      });

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'NETWORK_ERROR',
        expect.stringContaining('401 Unauthorized'),
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY_CATCH',
        }),
        expect.objectContaining({
          errorType: 'AUTH_NETWORK',
        })
      );
    });

    it('should handle 403 forbidden errors', async () => {
      render(
        <AuthErrorBoundary>
          <AuthNetworkComponent networkError="403" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/unable to verify your authentication/i)).toBeInTheDocument();
      });

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'NETWORK_ERROR',
        expect.stringContaining('403 Forbidden'),
        expect.objectContaining({
          errorType: 'AUTH_NETWORK',
        })
      );
    });

    it('should handle network connection failures', async () => {
      render(
        <AuthErrorBoundary>
          <AuthNetworkComponent networkError="NETWORK_FAILURE" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/unable to verify your authentication/i)).toBeInTheDocument();
      });

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'NETWORK_ERROR',
        expect.stringContaining('Network request failed'),
        expect.objectContaining({
          errorType: 'AUTH_NETWORK',
        })
      );
    });
  });

  describe('Automatic Recovery Integration', () => {
    it('should attempt automatic recovery for token validation errors', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true} retryDelay={1000}>
          <TokenValidationComponent tokenValidationError="INVALID_FORMAT" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/attempting automatic recovery/i)).toBeInTheDocument();
      });

      // Fast-forward time to trigger recovery
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'auth-error-boundary-clear',
            detail: expect.objectContaining({
              reason: 'error_boundary_recovery',
            }),
          })
        );
      });

      // Verify recovery logging
      expect(authLogger.logAuthEvent).toHaveBeenCalledWith(
        'ERROR_RECOVERY',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            errorType: 'TOKEN_VALIDATION',
            recoveryMethod: 'auto_recovery',
          }),
        })
      );
    });

    it('should attempt reinitialization for network errors', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true} retryDelay={1000}>
          <AuthNetworkComponent networkError="401" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/attempting automatic recovery/i)).toBeInTheDocument();
      });

      // Fast-forward time to trigger recovery
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'auth-error-boundary-reinit',
            detail: expect.objectContaining({
              reason: 'error_boundary_recovery',
            }),
          })
        );
      });
    });

    it('should not attempt recovery for non-recoverable errors', async () => {
      const NonRecoverableComponent = () => {
        throw new Error('Generic application error');
      };

      render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <NonRecoverableComponent />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // Should not show automatic recovery message for non-auth errors
      expect(screen.queryByText(/attempting automatic recovery/i)).not.toBeInTheDocument();
    });
  });

  describe('Manual Recovery Integration', () => {
    it('should clear authentication state when retry is clicked for token errors', async () => {
      render(
        <AuthErrorBoundary maxRetryAttempts={2}>
          <TokenValidationComponent tokenValidationError="DECODE_ERROR" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'auth-error-boundary-clear',
            detail: expect.objectContaining({
              reason: 'error_boundary_recovery',
            }),
          })
        );
      });

      // Verify storage cleanup
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('authState');
    });

    it('should navigate to login when login button is clicked', async () => {
      render(
        <AuthErrorBoundary>
          <TokenValidationComponent tokenValidationError="INVALID_FORMAT" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
      });

      const loginButton = screen.getByRole('button', { name: /go to login/i });
      fireEvent.click(loginButton);

      // Verify navigation logging
      expect(authLogger.logAuthEvent).toHaveBeenCalledWith(
        'NAVIGATION',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            destination: 'login',
            reason: 'auth_error_boundary',
          }),
        })
      );

      // Verify auth state clearing
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-error-boundary-clear',
        })
      );
    });
  });

  describe('Integration with AuthProviderWithErrorBoundary', () => {
    it('should provide comprehensive error protection for authentication flow', async () => {
      render(
        <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRetryAttempts={1}>
          <TokenValidationComponent tokenValidationError="DECODE_ERROR" />
        </AuthProviderWithErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // Verify comprehensive error logging
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'VALIDATION_ERROR',
        expect.stringContaining('Authentication error boundary caught'),
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY',
        }),
        expect.objectContaining({
          component: 'AuthProviderWithErrorBoundary',
          errorBoundaryConfig: expect.objectContaining({
            enableAutoRecovery: true,
            maxRetryAttempts: 1,
          }),
        })
      );
    });

    it('should isolate authentication errors from application errors', async () => {
      const AppComponent = () => {
        const [hasAppError, setHasAppError] = React.useState(false);
        
        if (hasAppError) {
          throw new Error('Application error');
        }

        return (
          <div>
            <button onClick={() => setHasAppError(true)}>Trigger App Error</button>
            <AuthProviderWithErrorBoundary>
              <TokenValidationComponent tokenValidationError="INVALID_FORMAT" />
            </AuthProviderWithErrorBoundary>
          </div>
        );
      };

      render(<AppComponent />);

      // Auth error should be caught by AuthErrorBoundary
      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // App should still be functional
      expect(screen.getByRole('button', { name: /trigger app error/i })).toBeInTheDocument();
    });
  });

  describe('Error Recovery State Management', () => {
    it('should track retry attempts correctly', async () => {
      render(
        <AuthErrorBoundary maxRetryAttempts={3}>
          <TokenValidationComponent tokenValidationError="INVALID_FORMAT" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 attempts left/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show updated attempt count after retry
      await waitFor(() => {
        expect(screen.getByText(/2 attempts left/i)).toBeInTheDocument();
      });
    });

    it('should disable retry when max attempts reached', async () => {
      render(
        <AuthErrorBoundary maxRetryAttempts={1}>
          <TokenValidationComponent tokenValidationError="INVALID_FORMAT" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      // Use up the retry attempt
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show max attempts reached
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
        expect(screen.getByText(/maximum recovery attempts reached/i)).toBeInTheDocument();
      });
    });
  });
});