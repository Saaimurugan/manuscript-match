/**
 * Comprehensive tests for error handling system
 * Tests error boundaries, fallbacks, retry logic, and toast notifications
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorFallback, InlineError } from '../ErrorFallback';
import { RetryButton } from '../RetryButton';
import { useErrorToast } from '../ErrorToast';
import { EnhancedErrorHandler } from '../../../lib/errorHandler';
import type { EnhancedError } from '../../../lib/errorHandler';

// Mock toast hook
const mockToast = vi.fn();
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: vi.fn(),
  }),
}));

// Mock window methods
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
    reload: vi.fn(),
  },
  writable: true,
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; error?: Error }> = ({ 
  shouldThrow = true, 
  error = new Error('Test error') 
}) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
};

// Test component for error toast
const TestErrorToastComponent: React.FC = () => {
  const { showErrorToast, showSuccessToast } = useErrorToast();
  
  const handleShowError = () => {
    const enhancedError: EnhancedError = {
      type: 'SERVER_ERROR',
      message: 'Test server error',
      severity: 'high',
      errorId: 'test-error-123',
      shouldReport: true,
      canRetry: true,
      context: {
        component: 'TestComponent',
        action: 'test-action',
      },
    };
    
    showErrorToast(enhancedError, {
      onRetry: () => console.log('Retry clicked'),
      showErrorId: true,
      showReportButton: true,
    });
  };
  
  const handleShowSuccess = () => {
    showSuccessToast('Test success message');
  };
  
  return (
    <div>
      <button onClick={handleShowError}>Show Error Toast</button>
      <button onClick={handleShowSuccess}>Show Success Toast</button>
    </div>
  );
};

describe('Error Handling System', () => {
  let queryClient: QueryClient;
  let consoleErrorSpy: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Suppress console errors during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear mock calls
    mockToast.mockClear();
    
    // Clear error tracking
    EnhancedErrorHandler.clearErrorTracking();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('ErrorBoundary', () => {
    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We're sorry, but an unexpected error occurred/)).toBeInTheDocument();
    });

    it('should display error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    });

    it('should provide retry functionality', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should call custom error handler', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
    });

    it('should show custom fallback', () => {
      const customFallback = <div>Custom error message</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('ErrorFallback', () => {
    it('should display error message', () => {
      const error = new Error('Test error message');
      
      render(<ErrorFallback error={error} />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should display enhanced error information', () => {
      const enhancedError: EnhancedError = {
        type: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'high',
        errorId: 'test-123',
        shouldReport: true,
        canRetry: true,
      };
      
      render(<ErrorFallback error={enhancedError} />);

      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('test-123')).toBeInTheDocument();
    });

    it('should show retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      const error = new Error('Test error');
      
      render(<ErrorFallback error={error} onRetry={onRetry} />);

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('InlineError', () => {
    it('should display inline error message', () => {
      const error = new Error('Inline error message');
      
      render(<InlineError error={error} />);

      expect(screen.getByText('Inline error message')).toBeInTheDocument();
    });

    it('should show retry button', () => {
      const onRetry = vi.fn();
      const error = new Error('Test error');
      
      render(<InlineError error={error} onRetry={onRetry} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show dismiss button', () => {
      const onDismiss = vi.fn();
      const error = new Error('Test error');
      
      render(<InlineError error={error} onDismiss={onDismiss} />);

      const dismissButton = screen.getByText('×');
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('RetryButton', () => {
    it('should execute retry function', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      
      render(<RetryButton onRetry={onRetry} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });
    });

    it('should show loading state during retry', async () => {
      const onRetry = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<RetryButton onRetry={onRetry} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(screen.getByText('Retrying...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle retry failures', async () => {
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
      
      render(<RetryButton onRetry={onRetry} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Retry \(1\/3\)/)).toBeInTheDocument();
      });
    });

    it('should disable after max retries', async () => {
      const onRetry = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      render(<RetryButton onRetry={onRetry} maxRetries={2} />);

      const retryButton = screen.getByText('Retry');
      
      // First retry
      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/Retry \(1\/2\)/)).toBeInTheDocument();
      });

      // Second retry
      fireEvent.click(screen.getByText(/Retry \(1\/2\)/));
      await waitFor(() => {
        expect(screen.getByText(/Retry \(2\/2\)/)).toBeInTheDocument();
      });

      // Third retry should show max retries reached
      fireEvent.click(screen.getByText(/Retry \(2\/2\)/));
      await waitFor(() => {
        expect(screen.getByText('Max retries reached')).toBeInTheDocument();
      });
    });
  });

  describe('Error Toast System', () => {
    it('should show error toast', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TestErrorToastComponent />
        </QueryClientProvider>
      );

      const showErrorButton = screen.getByText('Show Error Toast');
      fireEvent.click(showErrorButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      );
    });

    it('should show success toast', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TestErrorToastComponent />
        </QueryClientProvider>
      );

      const showSuccessButton = screen.getByText('Show Success Toast');
      fireEvent.click(showSuccessButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'success',
        })
      );
    });
  });

  describe('EnhancedErrorHandler', () => {
    it('should classify error severity correctly', () => {
      const networkError = { message: 'Network Error' };
      const serverError = { response: { status: 500, data: {} } };
      const validationError = { response: { status: 400, data: {} } };

      const networkResult = EnhancedErrorHandler.handle(networkError);
      const serverResult = EnhancedErrorHandler.handle(serverError);
      const validationResult = EnhancedErrorHandler.handle(validationError);

      expect(networkResult.severity).toBe('high');
      expect(serverResult.severity).toBe('critical');
      expect(validationResult.severity).toBe('low');
    });

    it('should generate unique error IDs', () => {
      const error1 = EnhancedErrorHandler.handle(new Error('Test 1'));
      const error2 = EnhancedErrorHandler.handle(new Error('Test 2'));

      expect(error1.errorId).toBeDefined();
      expect(error2.errorId).toBeDefined();
      expect(error1.errorId).not.toBe(error2.errorId);
    });

    it('should determine retry capability correctly', () => {
      const networkError = { message: 'Network Error' };
      const authError = { response: { status: 401, data: {} } };
      const serverError = { response: { status: 500, data: {} } };

      const networkResult = EnhancedErrorHandler.handle(networkError);
      const authResult = EnhancedErrorHandler.handle(authError);
      const serverResult = EnhancedErrorHandler.handle(serverError);

      expect(networkResult.canRetry).toBe(true);
      expect(authResult.canRetry).toBe(false);
      expect(serverResult.canRetry).toBe(true);
    });

    it('should throttle repeated errors', () => {
      const error = { response: { status: 500, data: {} } };

      // First few errors should be reported
      const result1 = EnhancedErrorHandler.handle(error);
      const result2 = EnhancedErrorHandler.handle(error);
      const result3 = EnhancedErrorHandler.handle(error);

      expect(result1.shouldReport).toBe(true);
      expect(result2.shouldReport).toBe(true);
      expect(result3.shouldReport).toBe(true);

      // Fourth error should be throttled
      const result4 = EnhancedErrorHandler.handle(error);
      expect(result4.shouldReport).toBe(false);
    });

    it('should provide error statistics', () => {
      const error1 = { response: { status: 500, data: {} } };
      const error2 = { response: { status: 404, data: {} } };

      EnhancedErrorHandler.handle(error1);
      EnhancedErrorHandler.handle(error2);
      EnhancedErrorHandler.handle(error1);

      const stats = EnhancedErrorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType['500']).toBe(2);
      expect(stats.errorsByType['404']).toBe(1);
      expect(stats.recentErrors).toHaveLength(2);
    });
  });

  describe('Global Error Handlers', () => {
    it('should handle JavaScript errors', () => {
      const handleJavaScriptErrorSpy = vi.spyOn(EnhancedErrorHandler, 'handleJavaScriptError');

      // Simulate a JavaScript error
      const errorEvent = new ErrorEvent('error', {
        message: 'Test JS error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test JS error'),
      });

      window.dispatchEvent(errorEvent);

      expect(handleJavaScriptErrorSpy).toHaveBeenCalledWith(
        'Test JS error',
        'test.js',
        10,
        5,
        expect.any(Error)
      );

      handleJavaScriptErrorSpy.mockRestore();
    });

    it('should handle unhandled promise rejections', () => {
      const handleUnhandledRejectionSpy = vi.spyOn(EnhancedErrorHandler, 'handleUnhandledRejection');

      // Simulate an unhandled promise rejection
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Test rejection')),
        reason: new Error('Test rejection'),
      });

      window.dispatchEvent(rejectionEvent);

      expect(handleUnhandledRejectionSpy).toHaveBeenCalledWith(rejectionEvent);

      handleUnhandledRejectionSpy.mockRestore();
    });
  });
});