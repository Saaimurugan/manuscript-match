/**
 * Comprehensive ErrorBoundary Test Suite
 * 
 * This test suite provides complete coverage for all ErrorBoundary functionality
 * including error scenarios, recovery mechanisms, reporting, and edge cases.
 * 
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock component that throws errors
const ThrowError = ({ 
  shouldThrow = false, 
  errorType = 'runtime',
  errorMessage = 'Test error',
  throwOnMount = false,
  throwOnUpdate = false,
  throwOnRender = false,
  throwAfterDelay,
  throwOnClick = false,
  throwOnHover = false,
  customError
}: {
  shouldThrow?: boolean;
  errorType?: string;
  errorMessage?: string;
  throwOnMount?: boolean;
  throwOnUpdate?: boolean;
  throwOnRender?: boolean;
  throwAfterDelay?: number;
  throwOnClick?: boolean;
  throwOnHover?: boolean;
  customError?: Error;
}) => {
  const [shouldThrowState, setShouldThrowState] = React.useState(throwOnMount && shouldThrow);
  const [updateCount, setUpdateCount] = React.useState(0);

  const createError = () => {
    if (customError) return customError;
    
    switch (errorType) {
      case 'syntax':
        return new Error('Unexpected token in JSON at position 0');
      case 'network':
        return new Error('Failed to fetch data from server');
      case 'system':
        return new Error('Memory quota exceeded');
      case 'user':
        return new Error('Invalid input format provided');
      case 'chunk-load':
        return new Error('Loading chunk 2 failed');
      case 'memory':
        return new Error('Maximum call stack size exceeded');
      case 'permission':
        return new Error('Access denied: insufficient permissions');
      default:
        return new Error(errorMessage || 'Something went wrong in component');
    }
  };

  React.useEffect(() => {
    if (throwAfterDelay && shouldThrow) {
      const timer = setTimeout(() => {
        setShouldThrowState(true);
      }, throwAfterDelay);
      return () => clearTimeout(timer);
    }
  }, [throwAfterDelay, shouldThrow]);

  React.useEffect(() => {
    if (throwOnUpdate && shouldThrow && updateCount > 0) {
      throw createError();
    }
    setUpdateCount(prev => prev + 1);
  });

  const handleClick = () => {
    if (throwOnClick && shouldThrow) {
      throw createError();
    }
  };

  const handleMouseEnter = () => {
    if (throwOnHover && shouldThrow) {
      throw createError();
    }
  };

  if ((throwOnRender || shouldThrowState) && shouldThrow) {
    throw createError();
  }

  return (
    <div
      data-testid="error-throwing-component"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      Test Component
    </div>
  );
};

describe('ErrorBoundary - Comprehensive Test Suite', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;
  let mockLocalStorage: any;
  let mockSessionStorage: any;
  let mockWindowOpen: ReturnType<typeof vi.fn>;
  let mockHistory: any;

  beforeEach(() => {
    // Mock console.error
    mockConsoleError = vi.fn();
    vi.stubGlobal('console', { ...console, error: mockConsoleError });

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Mock sessionStorage
    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('sessionStorage', mockSessionStorage);

    // Mock fetch
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Mock window.open
    mockWindowOpen = vi.fn();
    vi.stubGlobal('open', mockWindowOpen);

    // Mock history
    mockHistory = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    };
    vi.stubGlobal('history', mockHistory);

    // Mock navigator
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Test Browser) TestRunner/1.0',
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Catching and Classification', () => {
    const errorScenarios = [
      {
        type: 'syntax',
        severity: 'critical',
        message: 'Unexpected token in JSON at position 0',
        expectedUI: 'Code Error',
      },
      {
        type: 'network',
        severity: 'high',
        message: 'Failed to fetch data from server',
        expectedUI: 'Connection Issue',
      },
      {
        type: 'system',
        severity: 'high',
        message: 'Memory quota exceeded',
        expectedUI: 'System Error',
      },
      {
        type: 'user',
        severity: 'low',
        message: 'Invalid input format provided',
        expectedUI: 'Input Error',
      },
      {
        type: 'runtime',
        severity: 'medium',
        message: 'Cannot read properties of undefined',
        expectedUI: 'Something went wrong',
      },
    ];

    errorScenarios.forEach(({ type, severity, message, expectedUI }) => {
      it(`should handle ${type} errors with ${severity} severity`, async () => {
        const onError = vi.fn();
        
        render(
          <ErrorBoundary onError={onError} showErrorDetails={true}>
            <ThrowError shouldThrow={true} errorType={type} errorMessage={message} throwOnRender={true} />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        // Verify error was caught
        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            componentStack: expect.any(String),
          })
        );

        // Verify error categorization
        expect(screen.getByTestId('error-category')).toHaveTextContent(type.toUpperCase());
        expect(screen.getByTestId('error-severity')).toHaveTextContent(severity.toUpperCase());
      });
    });
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-throwing-component')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    it('accepts custom props correctly', () => {
      const onError = vi.fn();
      render(
        <ErrorBoundary onError={onError} showErrorDetails={true} enableReporting={true}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-throwing-component')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('uses custom fallback when provided', async () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('allows retry functionality', async () => {
      let shouldThrow = true;
      const TestComponent = () => (
        <ThrowError shouldThrow={shouldThrow} throwOnRender={true} />
      );

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Verify error state
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      // Simulate successful retry by not throwing error
      shouldThrow = false;
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show normal component
      await waitFor(() => {
        expect(screen.getByTestId('error-throwing-component')).toBeInTheDocument();
      });
    });

    it('tracks retry count and limits retries', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-button');
      
      // First retry
      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/Try Again \(1\/3\)/)).toBeInTheDocument();
      });

      // Continue clicking retry to reach max
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // Should show max retries warning
      await waitFor(() => {
        expect(screen.getByTestId('max-retries-message')).toBeInTheDocument();
        expect(retryButton).toBeDisabled();
      });
    });

    it('handles go home navigation', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const goHomeButton = screen.getByTestId('home-button');
      fireEvent.click(goHomeButton);

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/');
    });
  });

  describe('Error Reporting', () => {
    it('shows report bug button when reporting is enabled', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(screen.getByTestId('report-button')).toBeInTheDocument();
    });

    it('hides report bug button when reporting is disabled', async () => {
      render(
        <ErrorBoundary enableReporting={false}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();
    });

    it('attempts API submission first', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/error-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"errorId"'),
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('report-success')).toBeInTheDocument();
      });
    });

    it('falls back to mailto when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('mailto:')
        );
      });
    });
  });

  describe('Error Context Collection', () => {
    it('collects comprehensive error context', async () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-123');
      mockLocalStorage.getItem.mockReturnValue('{"id": "user-456"}');

      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Click to show error details
      const showDetailsButton = screen.getByTestId('show-details-button');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-session')).toHaveTextContent('test-session-123');
        expect(screen.getByTestId('error-user')).toHaveTextContent('user-456');
      });
    });

    it('generates session ID when none exists', async () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'error-session-id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });

    it('stores error reports locally', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'error-reports',
        expect.stringContaining('"errorId"')
      );
    });
  });

  describe('Error Details Display', () => {
    it('shows error details when explicitly enabled', async () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(screen.getByTestId('show-details-button')).toBeInTheDocument();
    });

    it('displays comprehensive error information', async () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} throwOnRender={true} errorMessage="Test error message" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const showDetailsButton = screen.getByTestId('show-details-button');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-details')).toBeInTheDocument();
        expect(screen.getByTestId('error-stack')).toBeInTheDocument();
        expect(screen.getByTestId('error-component-stack')).toBeInTheDocument();
      });
    });
  });

  describe('Public API', () => {
    it('provides resetErrorBoundary method', async () => {
      let errorBoundaryRef: ErrorBoundary | null = null;

      render(
        <ErrorBoundary ref={(ref) => { errorBoundaryRef = ref; }}>
          <ThrowError shouldThrow={true} throwOnRender={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Reset the error boundary
      act(() => {
        errorBoundaryRef?.resetErrorBoundary();
      });

      // Should clear the error state
      expect(errorBoundaryRef?.state.hasError).toBe(false);
    });
  });
});