import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false, errorType = 'runtime' }: { shouldThrow?: boolean; errorType?: string }) => {
  if (shouldThrow) {
    if (errorType === 'syntax') {
      throw new Error('Unexpected token in JSON at position 0');
    } else if (errorType === 'network') {
      throw new Error('Failed to fetch data from server');
    } else if (errorType === 'system') {
      throw new Error('Memory quota exceeded');
    } else if (errorType === 'user') {
      throw new Error('Invalid input format provided');
    } else {
      throw new Error('Something went wrong in component');
    }
  }
  return <div>No error</div>;
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock fetch
global.fetch = jest.fn();

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('accepts custom props correctly', () => {
      const onError = jest.fn();
      render(
        <ErrorBoundary onError={onError} showErrorDetails={true} enableReporting={true}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We're sorry, but an unexpected error occurred/)).toBeInTheDocument();
    });

    it('calls onError callback when provided', () => {
      const onError = jest.fn();
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('displays custom fallback UI when provided', () => {
      const customFallback = <div>Custom Error UI</div>;
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Error Categorization', () => {
    it('categorizes syntax errors correctly', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorType="syntax" />
        </ErrorBoundary>
      );

      expect(screen.getByText('SYNTAX ERROR')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL SEVERITY')).toBeInTheDocument();
    });

    it('categorizes network errors correctly', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getByText('NETWORK ERROR')).toBeInTheDocument();
      expect(screen.getByText('HIGH SEVERITY')).toBeInTheDocument();
    });

    it('categorizes system errors correctly', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorType="system" />
        </ErrorBoundary>
      );

      expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument();
      expect(screen.getByText('HIGH SEVERITY')).toBeInTheDocument();
    });

    it('categorizes user errors correctly', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorType="user" />
        </ErrorBoundary>
      );

      expect(screen.getByText('USER ERROR')).toBeInTheDocument();
      expect(screen.getByText('LOW SEVERITY')).toBeInTheDocument();
    });

    it('defaults to runtime error for unknown types', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorType="runtime" />
        </ErrorBoundary>
      );

      expect(screen.getByText('RUNTIME ERROR')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM SEVERITY')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('allows retry functionality', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Rerender with no error to simulate successful retry
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('tracks retry count and limits retries', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // First retry
      fireEvent.click(retryButton);
      expect(screen.getByRole('button', { name: /try again \(1\/3\)/i })).toBeInTheDocument();

      // Continue clicking retry to reach max
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // Should show max retries warning
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });

    it('handles go home navigation', () => {
      // Mock window.history
      const mockPushState = jest.fn();
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(window, 'history', {
        value: { pushState: mockPushState },
        writable: true,
      });
      window.dispatchEvent = mockDispatchEvent;

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      fireEvent.click(goHomeButton);

      expect(mockPushState).toHaveBeenCalledWith(null, '', '/');
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(PopStateEvent));
    });
  });

  describe('Error Reporting', () => {
    it('shows report bug button when reporting is enabled', () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /report bug/i })).toBeInTheDocument();
    });

    it('hides report bug button when reporting is disabled', () => {
      render(
        <ErrorBoundary enableReporting={false}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /report bug/i })).not.toBeInTheDocument();
    });

    it('attempts API submission first', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/error-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"errorId"'),
        });
      });

      expect(screen.getByText(/Bug report submitted successfully/)).toBeInTheDocument();
    });

    it('falls back to mailto when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      // Mock window.open
      const mockOpen = jest.fn();
      window.open = mockOpen;

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          expect.stringContaining('mailto:support@scholarfinder.com')
        );
      });
    });
  });

  describe('Error Context Collection', () => {
    it('collects comprehensive error context', () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-123');
      mockLocalStorage.getItem.mockReturnValue('{"id": "user-456"}');

      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click to show error details
      const showDetailsButton = screen.getByRole('button', { name: /show error details/i });
      fireEvent.click(showDetailsButton);

      expect(screen.getByText(/Session: test-session-123/)).toBeInTheDocument();
      expect(screen.getByText(/User: user-456/)).toBeInTheDocument();
    });

    it('generates session ID when none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'error-session-id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });

    it('stores error reports locally', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'error-reports',
        expect.stringContaining('"errorId"')
      );
    });
  });

  describe('Error Details Display', () => {
    it('shows error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /show error details/i })).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('shows error details when explicitly enabled', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /show error details/i })).toBeInTheDocument();
    });

    it('displays comprehensive error information', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const showDetailsButton = screen.getByRole('button', { name: /show error details/i });
      fireEvent.click(showDetailsButton);

      expect(screen.getByText(/Error: Something went wrong in component/)).toBeInTheDocument();
      expect(screen.getByText(/Category: runtime/)).toBeInTheDocument();
      expect(screen.getByText(/Severity: medium/)).toBeInTheDocument();
    });
  });

  describe('Public API', () => {
    it('provides resetErrorBoundary method', () => {
      let errorBoundaryRef: ErrorBoundary | null = null;

      render(
        <ErrorBoundary ref={(ref) => { errorBoundaryRef = ref; }}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Reset the error boundary
      errorBoundaryRef?.resetErrorBoundary();

      // Should clear the error state
      expect(errorBoundaryRef?.state.hasError).toBe(false);
    });
  });
});