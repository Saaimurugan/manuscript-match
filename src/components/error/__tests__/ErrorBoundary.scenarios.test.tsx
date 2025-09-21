/**
 * Error Boundary Scenarios Test Suite
 * 
 * Comprehensive test coverage for different error scenarios and edge cases
 * in the ErrorBoundary component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  ErrorBoundaryTestHelpers,
  ErrorSimulator,
  ErrorBoundaryVerifier,
  ErrorType,
  ErrorSeverity,
} from '../../../test/errorBoundaryTestUtils';
import {
  ErrorBoundaryTestWrapper,
  ErrorThrowingComponent,
  AsyncErrorComponent,
  LifecycleErrorComponent,
  ErrorBoundaryTestActions,
  ErrorBoundaryTestScenarios,
} from '../../../test/errorBoundaryHelpers';

describe('ErrorBoundary - Comprehensive Scenarios', () => {
  let mockEnv: ReturnType<typeof ErrorBoundaryTestHelpers.createMockEnvironment>;

  beforeEach(() => {
    mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
  });

  afterEach(() => {
    mockEnv.cleanup();
  });

  describe('Error Type Scenarios', () => {
    const errorTypes: { type: ErrorType; severity: ErrorSeverity; message: string }[] = [
      { type: 'syntax', severity: 'critical', message: 'Unexpected token in JSON at position 0' },
      { type: 'network', severity: 'high', message: 'Failed to fetch data from server' },
      { type: 'system', severity: 'high', message: 'Memory quota exceeded' },
      { type: 'user', severity: 'low', message: 'Invalid input format provided' },
      { type: 'runtime', severity: 'medium', message: 'Cannot read properties of undefined' },
      { type: 'chunk-load', severity: 'critical', message: 'Loading chunk 2 failed' },
      { type: 'memory', severity: 'critical', message: 'Maximum call stack size exceeded' },
      { type: 'permission', severity: 'high', message: 'Access denied: insufficient permissions' },
    ];

    errorTypes.forEach(({ type, severity, message }) => {
      it(`should handle ${type} errors with ${severity} severity`, async () => {
        const { container } = ErrorBoundaryTestActions.renderWithError({
          type,
          message,
        }, {
          showErrorDetails: true,
          enableReporting: true,
        });

        // Verify error is caught and displayed
        ErrorBoundaryVerifier.verifyErrorState(container);
        ErrorBoundaryVerifier.verifyErrorType(container, type);
        ErrorBoundaryVerifier.verifyErrorSeverity(container, severity);

        // Verify appropriate UI elements are shown
        ErrorBoundaryVerifier.verifyRetryAvailable(container);
        ErrorBoundaryVerifier.verifyReportingAvailable(container);
        ErrorBoundaryVerifier.verifyNavigationOptions(container);
        ErrorBoundaryVerifier.verifyErrorDetails(container, true);

        // Verify error ID generation
        const errorId = ErrorBoundaryVerifier.verifyErrorId(container);
        expect(errorId).toBeTruthy();

        // Verify graceful degradation for specific error types
        ErrorBoundaryTestActions.testGracefulDegradation(container, type);
      });
    });
  });

  describe('Error Timing Scenarios', () => {
    it('should handle errors thrown during component mount', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} showErrorDetails={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnMount={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should handle errors thrown during component update', async () => {
      const onError = vi.fn();
      
      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Trigger update that causes error
      rerender(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnUpdate={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should handle errors thrown during render', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should handle delayed errors', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwAfterDelay={100}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      // Should not have error initially
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();

      // Wait for delayed error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      }, { timeout: 200 });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Async Error Scenarios', () => {
    it('should handle async fetch errors', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <AsyncErrorComponent
            shouldThrow={true}
            errorType="network"
            operation="fetch"
            delay={50}
          />
        </ErrorBoundary>
      );

      // Should show loading initially
      expect(screen.getByTestId('async-loading')).toBeInTheDocument();

      // Wait for async error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle async timeout errors', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <AsyncErrorComponent
            shouldThrow={true}
            errorType="network"
            operation="timeout"
            delay={50}
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle async promise rejections', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <AsyncErrorComponent
            shouldThrow={true}
            errorType="network"
            operation="promise"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
    });
  });

  describe('Lifecycle Error Scenarios', () => {
    it('should handle errors in constructor', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <LifecycleErrorComponent
            throwInConstructor={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should handle errors in componentDidMount', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <LifecycleErrorComponent
            throwInComponentDidMount={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should handle errors in componentDidUpdate', async () => {
      const onError = vi.fn();
      
      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <LifecycleErrorComponent errorType="runtime" />
        </ErrorBoundary>
      );

      // Trigger update that causes error
      rerender(
        <ErrorBoundary onError={onError}>
          <LifecycleErrorComponent
            throwInComponentDidUpdate={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('User Interaction Error Scenarios', () => {
    it('should handle errors triggered by click events', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnClick={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      // Click to trigger error
      const component = screen.getByTestId('error-throwing-component');
      fireEvent.click(component);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should handle errors triggered by hover events', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnHover={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      // Hover to trigger error
      const component = screen.getByTestId('error-throwing-component');
      fireEvent.mouseEnter(component);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle successful retry after error', async () => {
      let shouldThrow = true;
      const onError = vi.fn();
      
      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={shouldThrow}
            throwOnRender={true}
            errorType="runtime"
          />
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
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={shouldThrow}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      // Should show normal component
      await waitFor(() => {
        expect(screen.getByTestId('error-throwing-component')).toBeInTheDocument();
      });
    });

    it('should handle max retry attempts', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Test retry functionality up to max attempts
      await ErrorBoundaryTestActions.testRetryFunctionality(document.body);
    });

    it('should handle navigation to home', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Test navigation functionality
      await ErrorBoundaryTestActions.testNavigation(document.body, mockEnv.history);
    });
  });

  describe('Error Reporting Scenarios', () => {
    it('should handle successful error report submission', async () => {
      mockEnv.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} enableReporting={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Test error reporting functionality
      await ErrorBoundaryTestActions.testErrorReporting(document.body, mockEnv.fetch);
    });

    it('should handle failed error report submission', async () => {
      mockEnv.fetch.mockRejectedValueOnce(new Error('API Error'));

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} enableReporting={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockEnv.fetch).toHaveBeenCalled();
      });

      // Should fall back to mailto
      await waitFor(() => {
        expect(mockEnv.windowOpen).toHaveBeenCalledWith(
          expect.stringContaining('mailto:')
        );
      });
    });

    it('should store error reports locally', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify local storage was called
      expect(mockEnv.localStorage.setItem).toHaveBeenCalledWith(
        'error-reports',
        expect.stringContaining('"errorId"')
      );
    });
  });

  describe('Error Context Scenarios', () => {
    it('should collect comprehensive error context', async () => {
      mockEnv.sessionStorage.getItem.mockReturnValue('test-session-123');
      mockEnv.localStorage.getItem.mockReturnValue('{"id": "user-456"}');

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} showErrorDetails={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Show error details
      await ErrorBoundaryTestActions.testErrorDetails(document.body);

      // Verify context information
      ErrorBoundaryVerifier.verifyErrorContext(document.body, {
        sessionId: 'test-session-123',
        userId: 'user-456',
        route: '/',
      });
    });

    it('should generate session ID when none exists', async () => {
      mockEnv.sessionStorage.getItem.mockReturnValue(null);

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(mockEnv.sessionStorage.setItem).toHaveBeenCalledWith(
        'error-session-id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });
  });

  describe('Error Isolation Scenarios', () => {
    it('should isolate critical errors', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} isolateErrors={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="syntax"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error isolation
      ErrorBoundaryVerifier.verifyErrorIsolation(document.body);
    });

    it('should not isolate low severity errors by default', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} isolateErrors={false}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="user"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should not be isolated
      const boundaryElement = document.querySelector('[data-error-boundary]');
      expect(boundaryElement).not.toHaveAttribute('data-isolated', 'true');
    });
  });

  describe('Configuration Scenarios', () => {
    it('should respect enableReporting configuration', async () => {
      const onError = vi.fn();
      
      const { rerender } = render(
        <ErrorBoundary onError={onError} enableReporting={false}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should not show report button
      expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();

      // Re-render with reporting enabled
      rerender(
        <ErrorBoundary onError={onError} enableReporting={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      // Should show report button
      expect(screen.getByTestId('report-button')).toBeInTheDocument();
    });

    it('should respect showErrorDetails configuration', async () => {
      const onError = vi.fn();
      
      const { rerender } = render(
        <ErrorBoundary onError={onError} showErrorDetails={false}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should not show details button
      expect(screen.queryByTestId('show-details-button')).not.toBeInTheDocument();

      // Re-render with details enabled
      rerender(
        <ErrorBoundary onError={onError} showErrorDetails={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      // Should show details button
      expect(screen.getByTestId('show-details-button')).toBeInTheDocument();
    });

    it('should use custom fallback when provided', async () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} fallback={customFallback}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle multiple rapid errors', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should only call onError once for the same error
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should handle errors with missing stack traces', async () => {
      const customError = new Error('Error without stack');
      delete customError.stack;

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} showErrorDetails={true}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            customError={customError}
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should still handle the error gracefully
      expect(onError).toHaveBeenCalledWith(
        customError,
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should handle storage quota exceeded errors', async () => {
      mockEnv.localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should handle storage errors gracefully
      expect(mockEnv.consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced error logged to service:'),
        expect.any(Object)
      );
    });
  });

  describe('Performance Scenarios', () => {
    it('should not impact performance when no errors occur', async () => {
      const onError = vi.fn();
      const startTime = performance.now();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (less than 100ms)
      expect(renderTime).toBeLessThan(100);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle error processing efficiently', async () => {
      const onError = vi.fn();
      const startTime = performance.now();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            throwOnRender={true}
            errorType="runtime"
          />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const errorProcessingTime = endTime - startTime;

      // Error processing should be reasonably fast (less than 500ms)
      expect(errorProcessingTime).toBeLessThan(500);
    });
  });
});