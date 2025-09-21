/**
 * Error Boundary Integration Tests
 * 
 * Integration tests for complete error handling flow including
 * error reporting, recovery, and interaction with other system components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { AuthProvider } from '../../contexts/AuthContext';
import {
  ErrorBoundaryTestHelpers,
  ErrorSimulator,
  ErrorBoundaryVerifier,
} from '../errorBoundaryTestUtils';
import {
  ErrorBoundaryTestWrapper,
  ErrorThrowingComponent,
  AsyncErrorComponent,
  ErrorBoundaryTestActions,
} from '../errorBoundaryHelpers';

// Mock services
vi.mock('../../services/errorLogger', () => ({
  errorLogger: {
    critical: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/errorReportService', () => ({
  errorReportService: {
    generateReport: vi.fn().mockReturnValue({
      errorId: 'test-error-123',
      message: 'Test error',
      timestamp: '2024-01-01T00:00:00Z',
    }),
    submitReport: vi.fn().mockResolvedValue({ success: true }),
    saveReportLocally: vi.fn(),
  },
}));

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ErrorBoundary Integration Tests', () => {
  let mockEnv: ReturnType<typeof ErrorBoundaryTestHelpers.createMockEnvironment>;

  beforeEach(() => {
    mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
  });

  afterEach(() => {
    mockEnv.cleanup();
  });

  describe('Complete Error Handling Flow', () => {
    it('should handle complete error-to-recovery workflow', async () => {
      let shouldThrow = true;
      const onError = vi.fn();

      const { rerender } = render(
        <TestWrapper>
          <ErrorBoundary
            onError={onError}
            enableReporting={true}
            showErrorDetails={true}
            isolateErrors={true}
          >
            <ErrorThrowingComponent
              shouldThrow={shouldThrow}
              throwOnRender={true}
              errorType="network"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Step 1: Verify error is caught and displayed
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      ErrorBoundaryVerifier.verifyErrorState(document.body);
      ErrorBoundaryVerifier.verifyErrorType(document.body, 'network');
      ErrorBoundaryVerifier.verifyErrorSeverity(document.body, 'high');

      // Step 2: Test error reporting
      mockEnv.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockEnv.fetch).toHaveBeenCalledWith('/api/error-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"errorId"'),
        });
      });

      // Step 3: Test error details display
      const showDetailsButton = screen.getByTestId('show-details-button');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-details')).toBeInTheDocument();
      });

      // Step 4: Test retry functionality
      shouldThrow = false;
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      // Rerender with successful component
      rerender(
        <TestWrapper>
          <ErrorBoundary
            onError={onError}
            enableReporting={true}
            showErrorDetails={true}
            isolateErrors={true}
          >
            <ErrorThrowingComponent shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Step 5: Verify recovery
      await waitFor(() => {
        expect(screen.getByTestId('error-throwing-component')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    it('should handle error reporting with fallback to email', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError} enableReporting={true}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Mock API failure
      mockEnv.fetch.mockRejectedValueOnce(new Error('API Error'));

      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      // Should attempt API first
      await waitFor(() => {
        expect(mockEnv.fetch).toHaveBeenCalled();
      });

      // Should fall back to mailto
      await waitFor(() => {
        expect(mockEnv.windowOpen).toHaveBeenCalledWith(
          expect.stringContaining('mailto:support@scholarfinder.com')
        );
      });
    });

    it('should handle navigation with proper cleanup', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="system"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const homeButton = screen.getByTestId('home-button');
      fireEvent.click(homeButton);

      // Verify navigation
      await waitFor(() => {
        expect(mockEnv.history.pushState).toHaveBeenCalledWith(null, '', '/');
      });

      // Verify cleanup
      expect(mockEnv.sessionStorage.removeItem).toHaveBeenCalledWith(
        expect.stringMatching(/^error-/)
      );
    });
  });

  describe('Error Boundary with React Query Integration', () => {
    it('should handle query errors within error boundary', async () => {
      const onError = vi.fn();

      // Component that uses React Query and throws
      const QueryErrorComponent: React.FC = () => {
        React.useEffect(() => {
          // Simulate query error that bubbles up
          throw ErrorSimulator.createError({ type: 'network', message: 'Query failed' });
        }, []);

        return <div>Query Component</div>;
      };

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError} showErrorDetails={true}>
            <QueryErrorComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      ErrorBoundaryVerifier.verifyErrorType(document.body, 'network');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Query failed' }),
        expect.any(Object)
      );
    });

    it('should handle async query errors', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <AsyncErrorComponent
              shouldThrow={true}
              errorType="network"
              operation="fetch"
              delay={50}
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByTestId('async-loading')).toBeInTheDocument();

      // Wait for async error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      }, { timeout: 200 });

      ErrorBoundaryVerifier.verifyErrorType(document.body, 'network');
    });
  });

  describe('Error Boundary with Router Integration', () => {
    it('should handle route-based errors', async () => {
      const onError = vi.fn();

      // Component that throws based on route
      const RouteErrorComponent: React.FC = () => {
        React.useEffect(() => {
          if (window.location.pathname === '/error-route') {
            throw ErrorSimulator.createError({ type: 'runtime', message: 'Route error' });
          }
        }, []);

        return <div>Route Component</div>;
      };

      // Set error route
      mockEnv.location.pathname = '/error-route';

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError} showErrorDetails={true}>
            <RouteErrorComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error context includes route
      const showDetailsButton = screen.getByTestId('show-details-button');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-route')).toHaveTextContent('/error-route');
      });
    });

    it('should handle navigation errors gracefully', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Mock navigation failure
      mockEnv.history.pushState.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const homeButton = screen.getByTestId('home-button');
      fireEvent.click(homeButton);

      // Should fall back to location.replace
      await waitFor(() => {
        expect(mockEnv.location.replace).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Error Boundary with Authentication Integration', () => {
    it('should handle authentication errors', async () => {
      const onError = vi.fn();

      // Component that throws auth error
      const AuthErrorComponent: React.FC = () => {
        React.useEffect(() => {
          throw ErrorSimulator.createError({ 
            type: 'permission', 
            message: 'Authentication failed' 
          });
        }, []);

        return <div>Auth Component</div>;
      };

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError} showErrorDetails={true}>
            <AuthErrorComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      ErrorBoundaryVerifier.verifyErrorType(document.body, 'permission');
      ErrorBoundaryVerifier.verifyErrorSeverity(document.body, 'high');
    });

    it('should collect user context when authenticated', async () => {
      mockEnv.localStorage.getItem.mockReturnValue('{"id": "user-123", "email": "test@example.com"}');

      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError} showErrorDetails={true}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Show error details to verify user context
      const showDetailsButton = screen.getByTestId('show-details-button');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-user')).toHaveTextContent('user-123');
      });
    });
  });

  describe('Error Boundary with Local Storage Integration', () => {
    it('should handle storage quota errors gracefully', async () => {
      mockEnv.localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError: Storage quota exceeded');
      });

      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="system"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should handle storage error gracefully
      expect(mockEnv.consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced error logged to service:'),
        expect.any(Object)
      );
    });

    it('should maintain error history in local storage', async () => {
      mockEnv.localStorage.getItem.mockReturnValue('[]');

      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error was stored
      expect(mockEnv.localStorage.setItem).toHaveBeenCalledWith(
        'error-reports',
        expect.stringContaining('"errorId"')
      );
    });

    it('should limit error history to prevent storage bloat', async () => {
      // Mock existing errors (more than limit)
      const existingErrors = Array.from({ length: 15 }, (_, i) => ({
        errorId: `error-${i}`,
        timestamp: new Date().toISOString(),
      }));
      
      mockEnv.localStorage.getItem.mockReturnValue(JSON.stringify(existingErrors));

      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify only last 10 errors are kept
      const storedData = mockEnv.localStorage.setItem.mock.calls.find(
        call => call[0] === 'error-reports'
      )?.[1];
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        expect(parsedData).toHaveLength(10);
      }
    });
  });

  describe('Error Boundary with Session Management', () => {
    it('should generate and maintain session ID across errors', async () => {
      mockEnv.sessionStorage.getItem.mockReturnValue(null);

      const onError = vi.fn();

      const { rerender } = render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify session ID was generated
      expect(mockEnv.sessionStorage.setItem).toHaveBeenCalledWith(
        'error-session-id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );

      // Get the generated session ID
      const sessionId = mockEnv.sessionStorage.setItem.mock.calls.find(
        call => call[0] === 'error-session-id'
      )?.[1];

      // Mock session ID exists for next error
      mockEnv.sessionStorage.getItem.mockReturnValue(sessionId);

      // Trigger another error
      rerender(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="network"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should reuse existing session ID
      expect(mockEnv.sessionStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it('should clear error session data on navigation', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const homeButton = screen.getByTestId('home-button');
      fireEvent.click(homeButton);

      // Verify session cleanup
      await waitFor(() => {
        expect(mockEnv.sessionStorage.removeItem).toHaveBeenCalledWith('error-temp-data');
        expect(mockEnv.sessionStorage.removeItem).toHaveBeenCalledWith('error-component-state');
        expect(mockEnv.sessionStorage.removeItem).toHaveBeenCalledWith('error-retry-data');
      });
    });
  });

  describe('Error Boundary Performance Integration', () => {
    it('should not impact normal component performance', async () => {
      const onError = vi.fn();
      const renderCount = 100;
      const startTime = performance.now();

      // Render multiple components without errors
      for (let i = 0; i < renderCount; i++) {
        const { unmount } = render(
          <TestWrapper>
            <ErrorBoundary onError={onError}>
              <ErrorThrowingComponent shouldThrow={false} />
            </ErrorBoundary>
          </TestWrapper>
        );
        unmount();
      }

      const endTime = performance.now();
      const averageRenderTime = (endTime - startTime) / renderCount;

      // Should render quickly (less than 5ms per component on average)
      expect(averageRenderTime).toBeLessThan(5);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle error processing efficiently under load', async () => {
      const onError = vi.fn();
      const errorCount = 10;
      const startTime = performance.now();

      // Render multiple error components
      const promises = Array.from({ length: errorCount }, async (_, i) => {
        const { container } = render(
          <TestWrapper>
            <ErrorBoundary onError={onError}>
              <ErrorThrowingComponent
                shouldThrow={true}
                throwOnRender={true}
                errorType="runtime"
              />
            </ErrorBoundary>
          </TestWrapper>
        );

        await waitFor(() => {
          expect(container.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
        });
      });

      await Promise.all(promises);

      const endTime = performance.now();
      const averageErrorProcessingTime = (endTime - startTime) / errorCount;

      // Error processing should be reasonably fast (less than 50ms per error on average)
      expect(averageErrorProcessingTime).toBeLessThan(50);
      expect(onError).toHaveBeenCalledTimes(errorCount);
    });
  });

  describe('Error Boundary Accessibility Integration', () => {
    it('should maintain accessibility during error states', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify accessibility attributes
      const errorBoundary = screen.getByTestId('error-boundary');
      expect(errorBoundary).toHaveAttribute('role', 'alert');
      expect(errorBoundary).toHaveAttribute('aria-live', 'assertive');

      // Verify buttons are accessible
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toHaveAttribute('aria-label');
      expect(retryButton).not.toHaveAttribute('aria-disabled', 'true');

      const homeButton = screen.getByTestId('home-button');
      expect(homeButton).toHaveAttribute('aria-label');

      // Verify keyboard navigation
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      fireEvent.keyDown(retryButton, { key: 'Tab' });
      expect(document.activeElement).toBe(homeButton);
    });

    it('should announce error state to screen readers', async () => {
      const onError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ErrorThrowingComponent
              shouldThrow={true}
              throwOnRender={true}
              errorType="runtime"
            />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify screen reader announcements
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      expect(errorMessage).toHaveTextContent(/We're sorry, but an unexpected error occurred/);
    });
  });
});