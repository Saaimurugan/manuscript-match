/**
 * Test suite for ErrorBoundary error recovery mechanisms
 * Tests enhanced retry functionality, navigation handling, error isolation, and graceful degradation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock the error logger and report service
jest.mock('@/services/errorLogger', () => ({
  errorLogger: {
    info: jest.fn(),
    critical: jest.fn(),
  },
}));

jest.mock('@/services/errorReportService', () => ({
  errorReportService: {
    generateReport: jest.fn(),
    submitReport: jest.fn(),
    saveReportLocally: jest.fn(),
  },
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = false, errorType = 'runtime' }: { shouldThrow?: boolean; errorType?: string }) => {
  if (shouldThrow) {
    if (errorType === 'network') {
      throw new Error('Network request failed');
    } else if (errorType === 'syntax') {
      throw new Error('Unexpected token');
    } else if (errorType === 'user') {
      throw new Error('Validation failed');
    } else if (errorType === 'system') {
      throw new Error('Memory quota exceeded');
    }
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock window methods
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();
const mockReload = jest.fn();
const mockDispatchEvent = jest.fn();

Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
    replaceState: mockReplaceState,
  },
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: {
    href: '',
    pathname: '/test',
    search: '',
    origin: 'http://localhost:3000',
    reload: mockReload,
    replace: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
  writable: true,
});

// Mock sessionStorage and localStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('ErrorBoundary Error Recovery Mechanisms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Mock Object.keys for storage
    Object.keys = jest.fn().mockReturnValue([]);
  });

  describe('Enhanced Try Again Functionality', () => {
    it('should perform comprehensive state reset on retry', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify error is displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Click retry
      fireEvent.click(screen.getByText('Try Again'));

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Verify component recovered
      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });

    it('should clear component cache on retry for isolated errors', async () => {
      render(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Mock sessionStorage keys for cache clearing
      Object.keys = jest.fn().mockReturnValue([
        'component-cache-test',
        'error-cache-test',
        'retry-cache-test',
        'other-key'
      ]);

      fireEvent.click(screen.getByText('Try Again'));

      // Verify cache clearing was attempted
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('component-cache-test');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('error-cache-test');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('retry-cache-test');
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalledWith('other-key');
    });

    it('should respect max retry limit', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Perform multiple retries
      for (let i = 0; i < 4; i++) {
        const retryButton = screen.getByText(/Try Again/);
        fireEvent.click(retryButton);
        
        rerender(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        );
      }

      // After max retries, button should be disabled
      await waitFor(() => {
        const retryButton = screen.getByText(/Try Again/);
        expect(retryButton).toBeDisabled();
      });

      // Should show max retries warning
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
    });

    it('should clear error session data on retry', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Try Again'));

      // Verify session data cleanup
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('error-temp-data');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('error-component-state');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('error-retry-data');
    });
  });

  describe('Enhanced Go Home Navigation', () => {
    it('should perform comprehensive cleanup before navigation', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Mock storage keys for cleanup
      Object.keys = jest.fn()
        .mockReturnValueOnce(['error-test', 'retry-test', 'component-cache-test', 'other-key'])
        .mockReturnValueOnce(['error-temp-test', 'retry-temp-test', 'other-local-key']);

      fireEvent.click(screen.getByText('Go Home'));

      // Verify comprehensive cleanup
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('error-test');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('retry-test');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('component-cache-test');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('error-temp-test');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('retry-temp-test');
    });

    it('should attempt multiple navigation strategies', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Go Home'));

      // Verify History API navigation was attempted
      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/');
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(PopStateEvent));
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error-boundary-navigation',
          detail: { path: '/', reason: 'error-recovery' }
        })
      );
    });

    it('should fallback to window.location if History API fails', async () => {
      // Mock History API failure
      mockReplaceState.mockImplementation(() => {
        throw new Error('History API failed');
      });

      const mockLocationReplace = jest.fn();
      Object.defineProperty(window.location, 'replace', {
        value: mockLocationReplace,
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Go Home'));

      // Should fallback to location.replace
      await waitFor(() => {
        expect(mockLocationReplace).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Error Boundary Isolation', () => {
    it('should isolate critical errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="syntax" />
        </ErrorBoundary>
      );

      // Critical errors should be isolated
      const errorContainer = screen.getByTestId('error-boundary') || 
                           document.querySelector('[data-error-boundary="true"]');
      
      await waitFor(() => {
        expect(errorContainer).toHaveAttribute('data-isolated', 'true');
      });
    });

    it('should isolate errors when isolateErrors prop is true', async () => {
      render(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should create isolation storage
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^isolated-/),
        expect.stringContaining('errorId')
      );
    });

    it('should clean up isolation when error is resolved', async () => {
      const { rerender } = render(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Mock isolation keys
      Object.keys = jest.fn().mockReturnValue(['isolated-test-key', 'other-key']);

      // Resolve error
      rerender(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('isolated-test-key');
        expect(mockSessionStorage.removeItem).not.toHaveBeenCalledWith('other-key');
      });
    });
  });

  describe('Graceful Degradation', () => {
    it('should render network error degradation for network errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Connection Issue')).toBeInTheDocument();
      expect(screen.getByText(/trouble connecting to our servers/)).toBeInTheDocument();
    });

    it('should render user error degradation for user errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="user" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Input Error')).toBeInTheDocument();
      expect(screen.getByText(/issue with the information provided/)).toBeInTheDocument();
    });

    it('should render system error degradation for system errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="system" />
        </ErrorBoundary>
      );

      expect(screen.getByText('System Error')).toBeInTheDocument();
      expect(screen.getByText(/system error occurred/)).toBeInTheDocument();
    });

    it('should render syntax error degradation for syntax errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="syntax" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText(/technical issue with the application/)).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should handle refresh page action for syntax errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="syntax" />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Refresh Page'));

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Automatic Recovery', () => {
    it('should attempt automatic recovery for network errors', async () => {
      jest.useFakeTimers();
      
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      );

      // Fast-forward time to trigger auto-recovery
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Simulate error resolution
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should use different delays for different error types', async () => {
      jest.useFakeTimers();
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="user" />
        </ErrorBoundary>
      );

      // User errors should have 1 second delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should have attempted recovery
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.useRealTimers();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up timeouts on unmount', async () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Trigger some operations that create timeouts
      fireEvent.click(screen.getByText('Try Again'));

      // Unmount component
      unmount();

      // Should not throw errors or leave hanging timeouts
      expect(() => {
        jest.runAllTimers();
      }).not.toThrow();
    });

    it('should handle multiple error state changes correctly', async () => {
      const { rerender } = render(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Resolve error
      rerender(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Trigger error again
      rerender(
        <ErrorBoundary isolateErrors={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should handle multiple state changes without issues
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});