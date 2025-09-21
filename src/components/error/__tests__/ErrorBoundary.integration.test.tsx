/**
 * ErrorBoundary Integration Test Suite
 * 
 * Tests the complete error handling flow including error reporting,
 * recovery mechanisms, and integration with external services.
 * 
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock error reporting service
const mockErrorReportService = {
  generateReport: vi.fn(),
  submitReport: vi.fn(),
  saveReportLocally: vi.fn(),
};

vi.mock('@/services/errorReportService', () => ({
  errorReportService: mockErrorReportService,
}));

// Mock error logger
const mockErrorLogger = {
  critical: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/services/errorLogger', () => ({
  errorLogger: mockErrorLogger,
}));

// Test component that throws errors
const ErrorComponent = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="success-component">Success</div>;
};

describe('ErrorBoundary Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;
  let mockLocalStorage: any;
  let mockSessionStorage: any;
  let mockWindowOpen: ReturnType<typeof vi.fn>;

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

    // Reset all mocks
    vi.clearAllMocks();
    mockErrorReportService.generateReport.mockClear();
    mockErrorReportService.submitReport.mockClear();
    mockErrorReportService.saveReportLocally.mockClear();
    mockErrorLogger.critical.mockClear();
    mockErrorLogger.info.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Error Handling Flow', () => {
    it('should handle complete error lifecycle from catch to recovery', async () => {
      const onError = vi.fn();
      
      // Setup mock responses
      mockErrorReportService.generateReport.mockReturnValue({
        errorId: 'test-error-123',
        message: 'Test error',
        timestamp: new Date().toISOString(),
      });
      
      mockErrorReportService.submitReport.mockResolvedValue({
        success: true,
        reportId: 'report-456',
      });

      let shouldThrow = true;
      const TestComponent = () => (
        <ErrorComponent shouldThrow={shouldThrow} errorMessage="Integration test error" />
      );

      const { rerender } = render(
        <ErrorBoundary onError={onError} enableReporting={true} showErrorDetails={true}>
          <TestComponent />
        </ErrorBoundary>
      );

      // 1. Verify error is caught and displayed
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );

      // 2. Verify error logging
      expect(mockErrorLogger.critical).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          errorId: expect.any(String),
          category: expect.any(String),
          severity: expect.any(String),
        }),
        'ErrorBoundary'
      );

      // 3. Test error reporting
      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockErrorReportService.generateReport).toHaveBeenCalled();
        expect(mockErrorReportService.submitReport).toHaveBeenCalled();
      });

      // 4. Test error recovery
      shouldThrow = false;
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      rerender(
        <ErrorBoundary onError={onError} enableReporting={true} showErrorDetails={true}>
          <TestComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('success-component')).toBeInTheDocument();
      });
    });

    it('should handle error reporting with user description', async () => {
      mockErrorReportService.generateReport.mockReturnValue({
        errorId: 'test-error-123',
        message: 'Test error',
        timestamp: new Date().toISOString(),
      });
      
      mockErrorReportService.submitReport.mockResolvedValue({
        success: true,
        reportId: 'report-456',
      });

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorComponent shouldThrow={true} errorMessage="User description test error" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Open report dialog
      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      // Add user description
      const descriptionTextarea = screen.getByTestId('user-description');
      fireEvent.change(descriptionTextarea, {
        target: { value: 'This error occurred when I clicked the submit button' }
      });

      // Submit report
      const submitButton = screen.getByTestId('submit-report-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorReportService.submitReport).toHaveBeenCalledWith(
          expect.any(Object),
          'This error occurred when I clicked the submit button'
        );
      });
    });

    it('should handle failed error reporting with fallback', async () => {
      mockErrorReportService.generateReport.mockReturnValue({
        errorId: 'test-error-123',
        message: 'Test error',
        timestamp: new Date().toISOString(),
      });
      
      mockErrorReportService.submitReport.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorComponent shouldThrow={true} errorMessage="Failed reporting test error" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockErrorReportService.submitReport).toHaveBeenCalled();
      });

      // Should show error message and fallback option
      await waitFor(() => {
        expect(screen.getByTestId('report-error')).toBeInTheDocument();
        expect(screen.getByTestId('mailto-fallback')).toBeInTheDocument();
      });

      // Test mailto fallback
      const mailtoButton = screen.getByTestId('mailto-fallback');
      fireEvent.click(mailtoButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:')
      );
    });
  });

  describe('Error Context Integration', () => {
    it('should collect and preserve error context across recovery attempts', async () => {
      mockSessionStorage.getItem.mockReturnValue('session-123');
      mockLocalStorage.getItem.mockReturnValue('{"id": "user-456", "name": "Test User"}');

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} showErrorDetails={true}>
          <ErrorComponent shouldThrow={true} errorMessage="Context preservation test" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error context is collected
      expect(mockErrorLogger.critical).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          context: expect.objectContaining({
            sessionId: 'session-123',
            userId: 'user-456',
            route: '/',
            userAgent: expect.any(String),
          }),
        }),
        'ErrorBoundary'
      );

      // Show error details
      const showDetailsButton = screen.getByTestId('show-details-button');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-details')).toBeInTheDocument();
        expect(screen.getByTestId('error-session')).toHaveTextContent('session-123');
        expect(screen.getByTestId('error-user')).toHaveTextContent('user-456');
      });
    });

    it('should handle missing context gracefully', async () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      mockLocalStorage.getItem.mockReturnValue(null);

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent shouldThrow={true} errorMessage="Missing context test" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should generate session ID
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'error-session-id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );

      // Should handle missing user gracefully
      expect(mockErrorLogger.critical).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          context: expect.objectContaining({
            sessionId: expect.any(String),
            userId: undefined,
          }),
        }),
        'ErrorBoundary'
      );
    });
  });

  describe('Error Isolation Integration', () => {
    it('should isolate critical errors and prevent cascading failures', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} isolateErrors={true}>
          <ErrorComponent shouldThrow={true} errorMessage="Unexpected token in JSON at position 0" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error is categorized as critical syntax error
      expect(screen.getByTestId('error-category')).toHaveTextContent('SYNTAX');
      expect(screen.getByTestId('error-severity')).toHaveTextContent('CRITICAL');

      // Verify isolation is applied
      const boundaryElement = document.querySelector('[data-error-boundary]');
      expect(boundaryElement).toHaveAttribute('data-isolated', 'true');
    });

    it('should not isolate low severity errors by default', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError} isolateErrors={false}>
          <ErrorComponent shouldThrow={true} errorMessage="Invalid input format provided" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error is categorized as low severity user error
      expect(screen.getByTestId('error-category')).toHaveTextContent('USER');
      expect(screen.getByTestId('error-severity')).toHaveTextContent('LOW');

      // Verify no isolation is applied
      const boundaryElement = document.querySelector('[data-error-boundary]');
      expect(boundaryElement).not.toHaveAttribute('data-isolated', 'true');
    });
  });

  describe('Performance Integration', () => {
    it('should handle multiple rapid errors efficiently', async () => {
      const onError = vi.fn();
      const startTime = performance.now();
      
      // Render multiple error boundaries rapidly
      const promises = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>((resolve) => {
          render(
            <ErrorBoundary onError={onError} key={i}>
              <ErrorComponent shouldThrow={true} errorMessage={`Rapid error ${i}`} />
            </ErrorBoundary>
          );
          resolve();
        });
      });

      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle multiple errors efficiently (less than 1 second)
      expect(totalTime).toBeLessThan(1000);
      expect(onError).toHaveBeenCalledTimes(10);
    });

    it('should not leak memory during error recovery cycles', async () => {
      const onError = vi.fn();
      let shouldThrow = true;
      
      const TestComponent = () => (
        <ErrorComponent shouldThrow={shouldThrow} errorMessage="Memory leak test" />
      );

      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Simulate multiple error/recovery cycles
      for (let i = 0; i < 5; i++) {
        shouldThrow = true;
        rerender(
          <ErrorBoundary onError={onError}>
            <TestComponent />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        shouldThrow = false;
        const retryButton = screen.getByTestId('retry-button');
        fireEvent.click(retryButton);

        rerender(
          <ErrorBoundary onError={onError}>
            <TestComponent />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('success-component')).toBeInTheDocument();
        });
      }

      // Verify no excessive error logging (should not accumulate)
      expect(mockErrorLogger.critical).toHaveBeenCalledTimes(5);
    });
  });

  describe('External Service Integration', () => {
    it('should integrate with error tracking services', async () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent shouldThrow={true} errorMessage="External service integration test" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error is logged with comprehensive data
      expect(mockErrorLogger.critical).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          errorId: expect.any(String),
          category: expect.any(String),
          severity: expect.any(String),
          context: expect.any(Object),
          component: 'ErrorBoundary',
          retryCount: 0,
          maxRetries: 3,
        }),
        'ErrorBoundary'
      );

      // Verify local storage backup
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'error-reports',
        expect.stringContaining('"errorId"')
      );
    });

    it('should handle service unavailability gracefully', async () => {
      // Mock service failures
      mockErrorLogger.critical.mockImplementation(() => {
        throw new Error('Logging service unavailable');
      });

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent shouldThrow={true} errorMessage="Service unavailable test" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should still handle the original error despite logging failure
      expect(onError).toHaveBeenCalled();
      
      // Should still show error UI
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });

  describe('Cross-Component Integration', () => {
    it('should work correctly in nested error boundary scenarios', async () => {
      const outerOnError = vi.fn();
      const innerOnError = vi.fn();
      
      render(
        <ErrorBoundary onError={outerOnError} data-testid="outer-boundary">
          <div>
            <ErrorBoundary onError={innerOnError} data-testid="inner-boundary">
              <ErrorComponent shouldThrow={true} errorMessage="Nested boundary test" />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(innerOnError).toHaveBeenCalled();
      expect(outerOnError).not.toHaveBeenCalled();
    });

    it('should handle errors in different component hierarchies', async () => {
      const onError = vi.fn();
      
      const ComplexComponent = () => (
        <div>
          <div>
            <div>
              <ErrorComponent shouldThrow={true} errorMessage="Deep hierarchy test" />
            </div>
          </div>
        </div>
      );
      
      render(
        <ErrorBoundary onError={onError}>
          <ComplexComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.stringContaining('ComplexComponent'),
        })
      );
    });
  });
});