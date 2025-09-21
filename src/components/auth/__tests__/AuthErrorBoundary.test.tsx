/**
 * Tests for AuthErrorBoundary component
 * Comprehensive testing of authentication error boundary functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthErrorBoundary, withAuthErrorBoundary } from '../AuthErrorBoundary';
import { authLogger } from '../../../utils/authLogger';

// Mock authLogger
vi.mock('../../../utils/authLogger', () => ({
  authLogger: {
    logAuthError: vi.fn(),
    logAuthEvent: vi.fn(),
  },
}));

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Test component that throws errors
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'token-validation':
        throw new Error('Token validation failed: invalid format');
      case 'token-decode':
        throw new Error('InvalidCharacterError: Failed to execute atob');
      case 'auth-network':
        throw new Error('Network error: 401 Unauthorized');
      default:
        throw new Error('Test error');
    }
  }
  return <div>No error</div>;
};

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    console.error = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        replace: vi.fn(),
      },
      writable: true,
    });

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
      writable: true,
    });

    // Mock localStorage and sessionStorage
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;

    // Clear any pending timers
    vi.clearAllTimers();
  });

  describe('Error Detection and Categorization', () => {
    it('should catch and categorize token validation errors', async () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/session has become invalid/i)).toBeInTheDocument();
      });

      // Verify error logging
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'Token validation failed: invalid format',
        expect.objectContaining({
          recoveryAction: 'ERROR_BOUNDARY_CATCH',
          errorBoundaryId: expect.any(String),
        }),
        expect.objectContaining({
          component: 'AuthErrorBoundary',
          errorType: 'TOKEN_VALIDATION',
        })
      );
    });

    it('should catch and categorize token decode errors', async () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} errorType="token-decode" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/problem with your authentication data/i)).toBeInTheDocument();
      });

      // Verify error logging
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'DECODE_ERROR',
        'InvalidCharacterError: Failed to execute atob',
        expect.objectContaining({
          errorBoundaryId: expect.any(String),
        }),
        expect.objectContaining({
          errorType: 'TOKEN_DECODE',
        })
      );
    });

    it('should catch and categorize network authentication errors', async () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} errorType="auth-network" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText(/unable to verify your authentication/i)).toBeInTheDocument();
      });

      // Verify error logging
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'NETWORK_ERROR',
        'Network error: 401 Unauthorized',
        expect.objectContaining({
          errorBoundaryId: expect.any(String),
        }),
        expect.objectContaining({
          errorType: 'AUTH_NETWORK',
        })
      );
    });
  });

  describe('Manual Recovery', () => {
    it('should allow manual retry when retry attempts are available', async () => {
      const mockDispatchEvent = vi.fn();
      window.dispatchEvent = mockDispatchEvent;

      render(
        <AuthErrorBoundary maxRetryAttempts={2}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('2 attempts left');

      // Click retry button
      fireEvent.click(retryButton);

      // Verify auth clear event was dispatched
      await waitFor(() => {
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'auth-error-boundary-clear',
            detail: expect.objectContaining({
              reason: 'error_boundary_recovery',
            }),
          })
        );
      });
    });

    it('should disable retry button when max attempts reached', async () => {
      render(
        <AuthErrorBoundary maxRetryAttempts={0}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // Should not show retry button when max attempts is 0
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.getByText(/maximum recovery attempts reached/i)).toBeInTheDocument();
    });

    it('should navigate to login when login button is clicked', async () => {
      const mockDispatchEvent = vi.fn();
      window.dispatchEvent = mockDispatchEvent;

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
      });

      const loginButton = screen.getByRole('button', { name: /go to login/i });
      fireEvent.click(loginButton);

      // Verify auth clear event was dispatched
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-error-boundary-clear',
        })
      );

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
    });
  });

  describe('Automatic Recovery', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should attempt automatic recovery when enabled', async () => {
      const mockDispatchEvent = vi.fn();
      window.dispatchEvent = mockDispatchEvent;

      render(
        <AuthErrorBoundary enableAutoRecovery={true} retryDelay={1000}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
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
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'auth-error-boundary-clear',
          })
        );
      });

      // Verify recovery logging
      expect(authLogger.logAuthEvent).toHaveBeenCalledWith(
        'ERROR_RECOVERY',
        true,
        expect.objectContaining({
          metadata: expect.objectContaining({
            recoveryMethod: 'auto_recovery',
          }),
        })
      );
    });

    it('should not attempt automatic recovery when disabled', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={false}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // Should not show automatic recovery message
      expect(screen.queryByText(/attempting automatic recovery/i)).not.toBeInTheDocument();
    });

    it('should not attempt automatic recovery for non-recoverable errors', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError shouldThrow={true} errorType="generic" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      // Should not show automatic recovery for unknown error types
      expect(screen.queryByText(/attempting automatic recovery/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Error Handler', () => {
    it('should call custom error handler when provided', async () => {
      const mockErrorHandler = vi.fn();

      render(
        <AuthErrorBoundary onAuthError={mockErrorHandler}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(mockErrorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Token validation failed: invalid format',
          }),
          expect.objectContaining({
            componentStack: expect.any(String),
          })
        );
      });
    });
  });

  describe('Custom Fallback Component', () => {
    it('should render custom fallback component when provided', async () => {
      const CustomFallback = () => <div>Custom Error Fallback</div>;

      render(
        <AuthErrorBoundary fallbackComponent={<CustomFallback />}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
      });

      // Should not render default error UI
      expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument();
    });
  });

  describe('withAuthErrorBoundary HOC', () => {
    it('should wrap component with auth error boundary', async () => {
      const TestComponent = () => <div>Test Component</div>;
      const WrappedComponent = withAuthErrorBoundary(TestComponent);

      render(<WrappedComponent />);

      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should catch errors in wrapped component', async () => {
      const WrappedComponent = withAuthErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={true} errorType="token-validation" />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });
    });

    it('should pass error boundary props to HOC', async () => {
      const mockErrorHandler = vi.fn();
      const WrappedComponent = withAuthErrorBoundary(ThrowError, {
        onAuthError: mockErrorHandler,
        enableAutoRecovery: false,
      });

      render(<WrappedComponent shouldThrow={true} errorType="token-validation" />);

      await waitFor(() => {
        expect(mockErrorHandler).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery Actions', () => {
    it('should clear authentication state for token validation errors', async () => {
      const mockRemoveItem = vi.fn();
      window.localStorage.removeItem = mockRemoveItem;
      window.sessionStorage.removeItem = mockRemoveItem;

      const mockDispatchEvent = vi.fn();
      window.dispatchEvent = mockDispatchEvent;

      render(
        <AuthErrorBoundary enableAutoRecovery={true} retryDelay={100}>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      // Wait for auto recovery to trigger
      await act(async () => {
        vi.advanceTimersByTime(100);
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Verify auth clear event was dispatched
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-error-boundary-clear',
        })
      );
    });

    it('should attempt reinitialization for network errors', async () => {
      const mockDispatchEvent = vi.fn();
      window.dispatchEvent = mockDispatchEvent;

      render(
        <AuthErrorBoundary enableAutoRecovery={true} retryDelay={100}>
          <ThrowError shouldThrow={true} errorType="auth-network" />
        </AuthErrorBoundary>
      );

      // Wait for auto recovery to trigger
      await act(async () => {
        vi.advanceTimersByTime(100);
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Verify auth reinit event was dispatched
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-error-boundary-reinit',
        })
      );
    });
  });

  describe('Development Mode Features', () => {
    it('should show error ID in development mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/error id:/i)).toBeInTheDocument();
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not show error ID in production mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} errorType="token-validation" />
        </AuthErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });

      expect(screen.queryByText(/error id:/i)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});