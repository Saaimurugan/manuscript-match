/**
 * Tests for AuthErrorBoundary component
 * Verifies error boundary behavior with authentication errors and token validation failures
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthErrorBoundary } from '../AuthErrorBoundary';
import { authLogger } from '@/utils/authLogger';

// Mock authLogger
vi.mock('@/utils/authLogger', () => ({
  authLogger: {
    logAuthError: vi.fn(),
    logAuthEvent: vi.fn(),
  },
}));

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/test',
  search: '?param=value',
  replace: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
  },
});

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn();
window.dispatchEvent = mockDispatchEvent;

// Test component that throws errors
interface ThrowErrorProps {
  shouldThrow?: boolean;
  errorType?: string;
  errorMessage?: string;
}

const ThrowError: React.FC<ThrowErrorProps> = ({ 
  shouldThrow = false, 
  errorType = 'generic',
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    const error = new Error(errorMessage);
    error.name = errorType;
    throw error;
  }
  return <div data-testid="success-component">Success</div>;
};

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocation.href = '';
    mockLocation.pathname = '/test';
    mockLocation.search = '?param=value';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AuthErrorBoundary>
      );

      expect(screen.getByTestId('success-component')).toBeInTheDocument();
    });

    it('should not log any errors when operating normally', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).not.toHaveBeenCalled();
    });
  });

  describe('Error Categorization', () => {
    it('should categorize token validation errors correctly', () => {
      const onAuthError = vi.fn();

      render(
        <AuthErrorBoundary onAuthError={onAuthError}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Invalid token format"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Authentication Problem')).toBeInTheDocument();
      expect(screen.getByText(/There was a problem with your authentication/)).toBeInTheDocument();
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'Invalid token format',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
          errorBoundary: 'AuthErrorBoundary',
        }),
        expect.any(Object)
      );
    });

    it('should categorize token expiration errors correctly', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token has expired"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_EXPIRED',
        'Token has expired',
        expect.objectContaining({
          recoveryAction: 'REFRESH',
        }),
        expect.any(Object)
      );
    });

    it('should categorize decode errors correctly', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Failed to decode base64"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'DECODE_ERROR',
        'Failed to decode base64',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
        }),
        expect.any(Object)
      );
    });

    it('should categorize network errors correctly', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Network connection failed"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText(/Connection problem/)).toBeInTheDocument();
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'NETWORK_ERROR',
        'Network connection failed',
        expect.objectContaining({
          recoveryAction: 'NONE',
        }),
        expect.any(Object)
      );
    });

    it('should categorize refresh failures correctly', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token refresh failed with 401"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText(/Unable to refresh your session/)).toBeInTheDocument();
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'REFRESH_FAILED',
        'Token refresh failed with 401',
        expect.objectContaining({
          recoveryAction: 'LOGOUT',
        }),
        expect.any(Object)
      );
    });

    it('should categorize malformed token errors correctly', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Malformed JWT token"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'MALFORMED_TOKEN',
        'Malformed JWT token',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Context Collection', () => {
    it('should collect comprehensive error context', () => {
      mockSessionStorage.getItem.mockReturnValue('existing-session-id');
      mockLocalStorage.getItem.mockReturnValue('{"id": "user123"}');

      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        expect.any(String),
        'Test error',
        expect.objectContaining({
          errorBoundary: 'AuthErrorBoundary',
        }),
        expect.objectContaining({
          userId: 'user123',
        })
      );
    });

    it('should generate session ID if none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'auth-error-session-id',
        expect.stringMatching(/^auth_session_\d+_[a-z0-9]+$/)
      );
    });

    it('should extract user ID from token if user data not available', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'user') return null;
        if (key === 'token') return 'header.eyJzdWIiOiJ1c2VyNDU2In0.signature';
        return null;
      });

      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        expect.any(String),
        'Test error',
        expect.any(Object),
        expect.objectContaining({
          userId: 'user456',
        })
      );
    });
  });

  describe('Error Severity and UI', () => {
    it('should show critical severity for refresh failures', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token refresh failed"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('CRITICAL - AUTHENTICATION ERROR')).toBeInTheDocument();
    });

    it('should show high severity for token validation errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Invalid token"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('HIGH - AUTHENTICATION ERROR')).toBeInTheDocument();
    });

    it('should show medium severity for network errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Network timeout"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('MEDIUM - AUTHENTICATION ERROR')).toBeInTheDocument();
    });

    it('should display error ID', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
      expect(screen.getByText(/auth_error_\d+_[a-z0-9]+/)).toBeInTheDocument();
    });
  });

  describe('Manual Recovery Actions', () => {
    it('should provide retry button for recoverable errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token expired"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should provide logout button', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    it('should provide go home button', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should handle logout button click', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      fireEvent.click(logoutButton);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-logout-request',
        })
      );
    });

    it('should handle go home button click', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      const homeButton = screen.getByRole('button', { name: /go home/i });
      fireEvent.click(homeButton);

      expect(mockLocation.href).toBe('/');
    });
  });

  describe('Automatic Recovery', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should attempt automatic recovery for token expiration', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token expired"
          />
        </AuthErrorBoundary>
      );

      // Should show recovery in progress
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Attempting to recover/)).toBeInTheDocument();
      });

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-refresh-request',
        })
      );
    });

    it('should attempt automatic recovery for network errors', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Network connection failed"
          />
        </AuthErrorBoundary>
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Attempting to recover/)).toBeInTheDocument();
      });
    });

    it('should not attempt automatic recovery for non-recoverable errors', () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Invalid token format"
          />
        </AuthErrorBoundary>
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText(/Attempting to recover/)).not.toBeInTheDocument();
    });

    it('should respect max recovery attempts', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={2}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token expired"
          />
        </AuthErrorBoundary>
      );

      // First attempt
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Attempt 1 of 2/)).toBeInTheDocument();
      });

      // Second attempt (after first fails)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Attempt 2 of 2/)).toBeInTheDocument();
      });

      // Should not attempt third time
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.queryByText(/Attempt 3/)).not.toBeInTheDocument();
    });

    it('should use exponential backoff for retry attempts', async () => {
      render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Network error"
          />
        </AuthErrorBoundary>
      );

      // First attempt should happen after 1 second
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(screen.queryByText(/Attempting to recover/)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      await waitFor(() => {
        expect(screen.getByText(/Attempting to recover/)).toBeInTheDocument();
      });

      // Second attempt should happen after 2 seconds (exponential backoff)
      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(screen.getByText(/Attempt 1 of 3/)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      await waitFor(() => {
        expect(screen.getByText(/Attempt 2 of 3/)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Fallback Component', () => {
    it('should render custom fallback component when provided', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Error UI</div>;

      render(
        <AuthErrorBoundary fallbackComponent={<CustomFallback />}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Problem')).not.toBeInTheDocument();
    });
  });

  describe('Event Callbacks', () => {
    it('should call onAuthError callback when error occurs', () => {
      const onAuthError = vi.fn();

      render(
        <AuthErrorBoundary onAuthError={onAuthError}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Test error"
          />
        </AuthErrorBoundary>
      );

      expect(onAuthError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should call onRecovery callback when recovery succeeds', async () => {
      const onRecovery = vi.fn();

      render(
        <AuthErrorBoundary onRecovery={onRecovery} enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token expired"
          />
        </AuthErrorBoundary>
      );

      // Mock successful token refresh
      mockLocalStorage.getItem.mockReturnValue('new-valid-token');

      act(() => {
        vi.advanceTimersByTime(4000); // Wait for recovery attempt
      });

      await waitFor(() => {
        expect(onRecovery).toHaveBeenCalled();
      });
    });
  });

  describe('Token Validation Failure Scenarios', () => {
    it('should handle InvalidCharacterError from atob', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="InvalidCharacterError: Failed to execute 'atob'"
          />
        </AuthErrorBoundary>
      );

      expect(screen.getByText(/There was a problem with your authentication/)).toBeInTheDocument();
      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'DECODE_ERROR',
        expect.stringContaining('InvalidCharacterError'),
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
        }),
        expect.any(Object)
      );
    });

    it('should handle malformed JWT structure errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="JWT token must have 3 parts"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'JWT token must have 3 parts',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
        }),
        expect.any(Object)
      );
    });

    it('should handle base64 decoding failures', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Invalid base64 string"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'DECODE_ERROR',
        'Invalid base64 string',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
        }),
        expect.any(Object)
      );
    });

    it('should handle JWT validation library errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Error in jwtValidator.safeDecodeToken"
          />
        </AuthErrorBoundary>
      );

      expect(authLogger.logAuthError).toHaveBeenCalledWith(
        'TOKEN_INVALID',
        'Error in jwtValidator.safeDecodeToken',
        expect.objectContaining({
          recoveryAction: 'CLEAR_TOKEN',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup timers on unmount', () => {
      const { unmount } = render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token expired"
          />
        </AuthErrorBoundary>
      );

      // Start recovery
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not attempt recovery after unmount', () => {
      const { unmount } = render(
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ThrowError 
            shouldThrow={true} 
            errorMessage="Token expired"
          />
        </AuthErrorBoundary>
      );

      unmount();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not dispatch events after unmount
      expect(mockDispatchEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-refresh-request',
        })
      );
    });
  });
});