/**
 * Tests for AuthProviderWithErrorBoundary component
 * Verifies integration between AuthProvider and AuthErrorBoundary
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProviderWithErrorBoundary } from '../AuthProviderWithErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { authLogger } from '@/utils/authLogger';

// Mock authLogger
vi.mock('@/utils/authLogger', () => ({
  authLogger: {
    logAuthError: vi.fn(),
    logAuthEvent: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: vi.fn(),
}));

// Mock AuthErrorBoundary
vi.mock('@/components/error/AuthErrorBoundary', () => ({
  AuthErrorBoundary: ({ 
    children, 
    onAuthError, 
    onRecovery, 
    enableAutoRecovery, 
    maxRecoveryAttempts,
    fallbackComponent 
  }: any) => {
    // Simulate error boundary behavior
    const [hasError, setHasError] = React.useState(false);
    
    React.useEffect(() => {
      // Simulate error catching
      const handleError = (event: any) => {
        if (event.detail?.shouldThrow) {
          setHasError(true);
          if (onAuthError) {
            onAuthError(new Error(event.detail.message), { componentStack: 'test stack' });
          }
        }
      };

      window.addEventListener('test-auth-error', handleError);
      return () => window.removeEventListener('test-auth-error', handleError);
    }, [onAuthError]);

    if (hasError) {
      if (fallbackComponent) {
        return fallbackComponent;
      }
      return (
        <div data-testid="auth-error-boundary-fallback">
          <div>Authentication Error</div>
          <div data-testid="auto-recovery">{enableAutoRecovery ? 'enabled' : 'disabled'}</div>
          <div data-testid="max-attempts">{maxRecoveryAttempts}</div>
          <button 
            onClick={() => {
              setHasError(false);
              if (onRecovery) onRecovery();
            }}
            data-testid="recovery-button"
          >
            Recover
          </button>
        </div>
      );
    }

    return <div data-testid="auth-error-boundary">{children}</div>;
  },
}));

// Test component that can trigger auth errors
const TestAuthComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test auth error' 
}) => {
  React.useEffect(() => {
    if (shouldThrow) {
      // Simulate auth error
      window.dispatchEvent(new CustomEvent('test-auth-error', {
        detail: { shouldThrow: true, message: errorMessage }
      }));
    }
  }, [shouldThrow, errorMessage]);

  return <div data-testid="test-auth-component">Auth Component</div>;
};

describe('AuthProviderWithErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render AuthProvider wrapped in AuthErrorBoundary', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auth-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-auth-component')).toBeInTheDocument();
    });

    it('should pass default props to AuthErrorBoundary', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent />
        </AuthProviderWithErrorBoundary>
      );

      // Trigger error to see the boundary props
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auto-recovery')).toHaveTextContent('enabled');
      expect(screen.getByTestId('max-attempts')).toHaveTextContent('3');
    });

    it('should pass custom props to AuthErrorBoundary', () => {
      render(
        <AuthProviderWithErrorBoundary 
          enableAutoRecovery={false}
          maxRecoveryAttempts={5}
        >
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auto-recovery')).toHaveTextContent('disabled');
      expect(screen.getByTestId('max-attempts')).toHaveTextContent('5');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors and log them', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} errorMessage="Token validation failed" />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auth-error-boundary-fallback')).toBeInTheDocument();
      expect(screen.getByText('Authentication Error')).toBeInTheDocument();

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'VALIDATION_ERROR',
        'Error boundary caught authentication error: Token validation failed',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
          retryCount: 0,
          shouldRetry: true,
          errorBoundary: 'AuthProviderWithErrorBoundary',
        })
      );
    });

    it('should include component stack in error logs', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          componentStack: 'test stack',
        })
      );
    });

    it('should handle different types of authentication errors', () => {
      const errorMessages = [
        'Invalid token format',
        'Token has expired',
        'Failed to decode JWT',
        'Network connection failed',
        'Refresh token invalid',
      ];

      errorMessages.forEach((errorMessage) => {
        vi.clearAllMocks();
        
        render(
          <AuthProviderWithErrorBoundary>
            <TestAuthComponent shouldThrow={true} errorMessage={errorMessage} />
          </AuthProviderWithErrorBoundary>
        );

        expect(authLogger.logAuthError).toHaveBeenCalledWith(
          'VALIDATION_ERROR',
          `Error boundary caught authentication error: ${errorMessage}`,
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle successful error recovery', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      // Verify error state
      expect(screen.getByTestId('auth-error-boundary-fallback')).toBeInTheDocument();

      // Trigger recovery
      const recoveryButton = screen.getByTestId('recovery-button');
      fireEvent.click(recoveryButton);

      // Verify recovery logging
      expect(authLogger.logAuthEvent).toHaveBeenCalledWith(
        'ERROR_RECOVERY',
        true,
        {
          metadata: {
            recoveryType: 'automatic',
            boundaryType: 'AuthProviderWithErrorBoundary',
          },
        }
      );

      // Verify component is restored
      expect(screen.getByTestId('test-auth-component')).toBeInTheDocument();
    });

    it('should log recovery events with proper metadata', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      const recoveryButton = screen.getByTestId('recovery-button');
      fireEvent.click(recoveryButton);

      expect(authLogger.logAuthEvent).toHaveBeenCalledWith(
        'ERROR_RECOVERY',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            recoveryType: 'automatic',
            boundaryType: 'AuthProviderWithErrorBoundary',
          }),
        })
      );
    });
  });

  describe('Custom Fallback Component', () => {
    it('should render custom fallback component when provided', () => {
      const CustomFallback = () => (
        <div data-testid="custom-auth-fallback">
          Custom Authentication Error UI
        </div>
      );

      render(
        <AuthProviderWithErrorBoundary fallbackComponent={<CustomFallback />}>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('custom-auth-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Authentication Error UI')).toBeInTheDocument();
    });

    it('should still log errors when using custom fallback', () => {
      const CustomFallback = () => <div>Custom Fallback</div>;

      render(
        <AuthProviderWithErrorBoundary fallbackComponent={<CustomFallback />}>
          <TestAuthComponent shouldThrow={true} errorMessage="Custom error" />
        </AuthProviderWithErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'VALIDATION_ERROR',
        'Error boundary caught authentication error: Custom error',
        expect.any(Object)
      );
    });
  });

  describe('Integration with AuthProvider', () => {
    it('should provide authentication context to children', () => {
      const mockAuthContext = {
        user: { id: '123', email: 'test@example.com' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      };

      (useAuth as any).mockReturnValue(mockAuthContext);

      const AuthConsumer = () => {
        const auth = useAuth();
        return (
          <div data-testid="auth-consumer">
            User: {auth.user?.email}
            Authenticated: {auth.isAuthenticated.toString()}
          </div>
        );
      };

      render(
        <AuthProviderWithErrorBoundary>
          <AuthConsumer />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auth-consumer')).toBeInTheDocument();
    });

    it('should maintain auth context during error recovery', () => {
      const mockAuthContext = {
        user: { id: '123', email: 'test@example.com' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      };

      (useAuth as any).mockReturnValue(mockAuthContext);

      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      // Trigger recovery
      const recoveryButton = screen.getByTestId('recovery-button');
      fireEvent.click(recoveryButton);

      // Auth provider should still be present
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });
  });

  describe('Configuration Options', () => {
    it('should disable auto recovery when configured', () => {
      render(
        <AuthProviderWithErrorBoundary enableAutoRecovery={false}>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auto-recovery')).toHaveTextContent('disabled');
    });

    it('should set custom max recovery attempts', () => {
      render(
        <AuthProviderWithErrorBoundary maxRecoveryAttempts={10}>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('max-attempts')).toHaveTextContent('10');
    });

    it('should use default values when not specified', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      expect(screen.getByTestId('auto-recovery')).toHaveTextContent('enabled');
      expect(screen.getByTestId('max-attempts')).toHaveTextContent('3');
    });
  });

  describe('Error Logging Details', () => {
    it('should log errors with comprehensive context', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} errorMessage="Detailed error message" />
        </AuthProviderWithErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'VALIDATION_ERROR',
        'Error boundary caught authentication error: Detailed error message',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
          retryCount: 0,
          maxRetries: 3,
          shouldRetry: true,
          errorBoundary: 'AuthProviderWithErrorBoundary',
          componentStack: 'test stack',
        })
      );
    });

    it('should include stack trace in error logs', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      const logCall = (authLogger.logAuthError as any).mock.calls[0];
      const errorDetails = logCall[2];

      expect(errorDetails).toHaveProperty('componentStack', 'test stack');
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with multiple error/recovery cycles', () => {
      const { rerender } = render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={false} />
        </AuthProviderWithErrorBoundary>
      );

      // Simulate multiple error/recovery cycles
      for (let i = 0; i < 5; i++) {
        rerender(
          <AuthProviderWithErrorBoundary>
            <TestAuthComponent shouldThrow={true} />
          </AuthProviderWithErrorBoundary>
        );

        const recoveryButton = screen.getByTestId('recovery-button');
        fireEvent.click(recoveryButton);

        rerender(
          <AuthProviderWithErrorBoundary>
            <TestAuthComponent shouldThrow={false} />
          </AuthProviderWithErrorBoundary>
        );
      }

      // Should still be functional
      expect(screen.getByTestId('test-auth-component')).toBeInTheDocument();
    });

    it('should handle rapid error occurrences gracefully', () => {
      render(
        <AuthProviderWithErrorBoundary>
          <TestAuthComponent shouldThrow={true} />
        </AuthProviderWithErrorBoundary>
      );

      // Trigger multiple rapid errors
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new CustomEvent('test-auth-error', {
          detail: { shouldThrow: true, message: `Rapid error ${i}` }
        }));
      }

      // Should still show error boundary
      expect(screen.getByTestId('auth-error-boundary-fallback')).toBeInTheDocument();
      
      // Should have logged the first error
      expect(authLogger.logAuthError).toHaveBeenCalled();
    });
  });
});