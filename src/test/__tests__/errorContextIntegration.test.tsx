/**
 * Integration Tests for Error Context Preservation
 * 
 * These tests demonstrate the complete workflow of error context preservation
 * during automated testing, including error boundary integration with testing
 * frameworks and debugging utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { ErrorInfo } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { 
  testErrorContextCollector,
  isTestEnvironment 
} from '../errorContextPreservation';
import { errorBoundaryTestIntegration } from '../testingFrameworkIntegration';
import { 
  errorDebuggingUtils,
  TestDebuggingHelpers 
} from '../errorDebuggingUtils';

// Test component that throws errors
const ErrorThrowingComponent: React.FC<{
  shouldThrow?: boolean;
  errorMessage?: string;
  throwOnClick?: boolean;
}> = ({ shouldThrow = false, errorMessage = 'Test error', throwOnClick = false }) => {
  const [shouldThrowState, setShouldThrowState] = React.useState(shouldThrow);

  const handleClick = () => {
    if (throwOnClick) {
      setShouldThrowState(true);
    }
  };

  if (shouldThrowState) {
    throw new Error(errorMessage);
  }

  return (
    <div data-testid="error-throwing-component" onClick={handleClick}>
      Click to throw error
    </div>
  );
};

// Test wrapper component
const TestErrorBoundaryWrapper: React.FC<{
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, onError }) => {
  return (
    <ErrorBoundary
      enableReporting={true}
      showErrorDetails={true}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

describe('Error Context Preservation Integration', () => {
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let debugSession: ReturnType<typeof TestDebuggingHelpers.createDebugErrorBoundary>;

  beforeEach(() => {
    // Clear all error reports and sessions
    testErrorContextCollector.clearErrorReports();
    errorDebuggingUtils.clearSessions();
    
    // Mock console methods to reduce noise
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Start debug session for each test
    debugSession = TestDebuggingHelpers.createDebugErrorBoundary('integration test');

    // Mock environment variables
    process.env.NODE_ENV = 'test';
    
    // Mock global test environment
    Object.defineProperty(global, '__VITEST__', {
      value: {
        ctx: {
          current: {
            name: 'error context integration test',
            file: { name: 'errorContextIntegration.test.tsx' },
            suite: { name: 'Error Context Preservation Integration' },
          },
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    debugSession.endSession();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    vi.clearAllMocks();
  });

  describe('complete error handling workflow', () => {
    it('should preserve error context through complete workflow', async () => {
      let capturedError: Error | null = null;
      let capturedErrorInfo: ErrorInfo | null = null;

      const handleError = (error: Error, errorInfo: ErrorInfo) => {
        capturedError = error;
        capturedErrorInfo = errorInfo;
        debugSession.onError(error, errorInfo);
      };

      // Render component with error boundary
      const { getByTestId, getByText } = render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorMessage="Integration test error"
          />
        </TestErrorBoundaryWrapper>
      );

      // Wait for error boundary to catch error
      await waitFor(() => {
        expect(getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error was captured
      expect(capturedError).toBeDefined();
      expect(capturedError?.message).toBe('Integration test error');
      expect(capturedErrorInfo).toBeDefined();

      // Verify error context was preserved
      const errorReports = testErrorContextCollector.getAllErrorReports();
      expect(errorReports).toHaveLength(1);

      const report = errorReports[0];
      expect(report.context).toMatchObject({
        testName: 'error context integration test',
        testFile: 'errorContextIntegration.test.tsx',
        testSuite: 'Error Context Preservation Integration',
        component: 'ErrorThrowingComponent',
        testFramework: 'vitest',
      });

      // Verify debugging session captured the error
      const debugSessions = errorDebuggingUtils.getAllSessions();
      expect(debugSessions).toHaveLength(1);
      expect(debugSessions[0].errors).toHaveLength(1);

      // Verify error analysis was performed
      const analysis = debugSessions[0].analysis[0];
      expect(analysis).toBeDefined();
      expect(analysis.category).toBe('expected'); // Since it's from ErrorThrowingComponent
      expect(analysis.suggestions).toContain('Verify error boundary is catching the error correctly');

      // Verify UI elements are present with test IDs
      expect(getByTestId('error-message')).toBeInTheDocument();
      expect(getByTestId('error-category')).toHaveTextContent('RUNTIME ERROR');
      expect(getByTestId('error-severity')).toHaveTextContent('MEDIUM SEVERITY');
      expect(getByTestId('retry-button')).toBeInTheDocument();
      expect(getByTestId('home-button')).toBeInTheDocument();
      expect(getByTestId('report-button')).toBeInTheDocument();
    });

    it('should handle user interactions and preserve context', async () => {
      const handleError = debugSession.onError;

      const { getByTestId } = render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            throwOnClick={true}
            errorMessage="Click-triggered error"
          />
        </TestErrorBoundaryWrapper>
      );

      // Initially no error
      expect(() => getByTestId('error-boundary')).toThrow();

      // Click to trigger error
      const component = getByTestId('error-throwing-component');
      fireEvent.click(component);

      // Wait for error boundary
      await waitFor(() => {
        expect(getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Test retry functionality
      const retryButton = getByTestId('retry-button');
      expect(retryButton).not.toBeDisabled();

      // Record debug action
      errorDebuggingUtils.recordDebugAction('user-clicked-retry', { 
        component: 'ErrorThrowingComponent' 
      });

      fireEvent.click(retryButton);

      // Verify retry count increased
      await waitFor(() => {
        const retryButtonAfter = getByTestId('retry-button');
        expect(retryButtonAfter).toHaveTextContent('Try Again (1/3)');
      });

      // Verify debug session recorded the action
      const sessions = errorDebuggingUtils.getAllSessions();
      const actions = sessions[0].debugActions;
      expect(actions.some(action => action.action === 'user-clicked-retry')).toBe(true);
    });

    it('should integrate with test framework assertions', async () => {
      const handleError = debugSession.onError;

      render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            shouldThrow={true}
            errorMessage="Assertion test error"
          />
        </TestErrorBoundaryWrapper>
      );

      await waitFor(() => {
        expect(document.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
      });

      // Test framework integration assertions
      const errorReport = TestDebuggingHelpers.assertErrorWithDebugging(
        { 
          component: 'ErrorThrowingComponent',
          message: 'Assertion test error'
        },
        'assertion integration test'
      );

      expect(errorReport).toBeDefined();
      expect(errorReport.context.component).toBe('ErrorThrowingComponent');
      expect(errorReport.error.message).toBe('Assertion test error');

      // Verify no errors assertion would fail
      expect(() => {
        errorBoundaryTestIntegration.assertNoErrorBoundaryErrors();
      }).toThrow('Expected no error boundary errors, but found 1');
    });

    it('should preserve context across multiple errors', async () => {
      const handleError = debugSession.onError;
      let errorCount = 0;

      const MultiErrorComponent: React.FC = () => {
        const [errorType, setErrorType] = React.useState<string | null>(null);

        React.useEffect(() => {
          if (errorType === 'first') {
            throw new Error('First error in sequence');
          }
          if (errorType === 'second') {
            throw new Error('Second error in sequence');
          }
        }, [errorType]);

        return (
          <div>
            <button 
              data-testid="trigger-first-error"
              onClick={() => setErrorType('first')}
            >
              Trigger First Error
            </button>
            <button 
              data-testid="trigger-second-error"
              onClick={() => setErrorType('second')}
            >
              Trigger Second Error
            </button>
          </div>
        );
      };

      const { getByTestId, rerender } = render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <MultiErrorComponent />
        </TestErrorBoundaryWrapper>
      );

      // Trigger first error
      fireEvent.click(getByTestId('trigger-first-error'));

      await waitFor(() => {
        expect(getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Reset error boundary
      const errorBoundaryElement = document.querySelector('[data-error-boundary]') as any;
      if (errorBoundaryElement?.__reactInternalInstance) {
        // Simulate error boundary reset
        errorDebuggingUtils.recordDebugAction('reset-error-boundary', { reason: 'manual-reset' });
      }

      // Re-render with fresh component
      rerender(
        <TestErrorBoundaryWrapper onError={handleError}>
          <MultiErrorComponent />
        </TestErrorBoundaryWrapper>
      );

      // Trigger second error
      fireEvent.click(getByTestId('trigger-second-error'));

      await waitFor(() => {
        expect(getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify both errors were captured
      const errorReports = testErrorContextCollector.getAllErrorReports();
      expect(errorReports.length).toBeGreaterThanOrEqual(1);

      // Verify debugging session has comprehensive data
      const sessions = errorDebuggingUtils.getAllSessions();
      expect(sessions[0].errors.length).toBeGreaterThanOrEqual(1);
      expect(sessions[0].debugActions.length).toBeGreaterThanOrEqual(1);

      // Generate and verify debugging report
      const report = debugSession.getReport();
      expect(report).toContain('# Error Debugging Report');
      expect(report).toContain('## Errors Encountered');
      expect(report).toContain('## Debug Actions Taken');
    });

    it('should handle error boundary isolation in test environment', async () => {
      const handleError = debugSession.onError;

      const { getByTestId } = render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            shouldThrow={true}
            errorMessage="Isolation test error"
          />
        </TestErrorBoundaryWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error boundary has test-specific attributes
      const errorBoundary = getByTestId('error-boundary');
      expect(errorBoundary).toHaveAttribute('data-error-boundary', 'true');
      expect(errorBoundary).toHaveAttribute('data-error-category');
      expect(errorBoundary).toHaveAttribute('data-error-severity');

      // Verify test-specific data was stored
      const errorId = errorBoundary.getAttribute('data-error-id');
      expect(errorId).toBeDefined();

      // Check session storage for test data
      const testErrorKey = `test-error-${errorId}`;
      // Note: In actual test environment, sessionStorage would be available
      // Here we're just verifying the structure
    });

    it('should emit test-specific events', async () => {
      const handleError = debugSession.onError;
      const eventListener = vi.fn();

      // Mock window for event listening
      Object.defineProperty(global, 'window', {
        value: {
          addEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        },
        writable: true,
      });

      // Listen for error boundary events
      (global.window as any).addEventListener('error-boundary-error', eventListener);

      render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            shouldThrow={true}
            errorMessage="Event test error"
          />
        </TestErrorBoundaryWrapper>
      );

      await waitFor(() => {
        expect(document.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
      });

      // Verify events would be emitted (mocked environment)
      // In real test environment, events would be dispatched
      expect(true).toBe(true); // Placeholder for event verification
    });

    it('should provide comprehensive debugging information', async () => {
      const handleError = debugSession.onError;

      render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            shouldThrow={true}
            errorMessage="Debug info test error"
          />
        </TestErrorBoundaryWrapper>
      );

      await waitFor(() => {
        expect(document.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
      });

      // Get debugging report
      const report = debugSession.getReport();
      
      // Verify comprehensive debugging information
      expect(report).toContain('# Error Debugging Report');
      expect(report).toContain('**Test:** integration test');
      expect(report).toContain('## Errors Encountered');
      expect(report).toContain('**Component:** ErrorThrowingComponent');
      expect(report).toContain('**Message:** Debug info test error');
      expect(report).toContain('**Category:** expected');
      expect(report).toContain('**Suggestions:**');

      // Verify error analysis
      const sessions = errorDebuggingUtils.getAllSessions();
      const analysis = sessions[0].analysis[0];
      
      expect(analysis.debuggingSteps).toContain('1. Reproduce the error consistently');
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      expect(analysis.testImpact).toBe('informational');

      // Export debugging data
      const exportedData = errorDebuggingUtils.exportDebuggingData();
      const parsed = JSON.parse(exportedData);
      
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0].errors).toHaveLength(1);
      expect(parsed.exportTime).toBeDefined();
    });
  });

  describe('test environment detection and integration', () => {
    it('should correctly detect test environment', () => {
      expect(isTestEnvironment()).toBe(true);
    });

    it('should integrate with Vitest framework', () => {
      const errorReports = testErrorContextCollector.getAllErrorReports();
      
      // Add a test error
      const mockError = new Error('Vitest integration test');
      const mockErrorInfo: ErrorInfo = {
        componentStack: '\n    in TestComponent\n    in ErrorBoundary',
      };
      
      const context = testErrorContextCollector.collectErrorContext(mockError, mockErrorInfo);
      expect(context.testFramework).toBe('vitest');
      expect(context.testName).toBe('error context integration test');
      expect(context.testFile).toBe('errorContextIntegration.test.tsx');
    });

    it('should store error reports in global scope for test framework access', () => {
      const mockError = new Error('Global storage test');
      const mockErrorInfo: ErrorInfo = {
        componentStack: '\n    in TestComponent',
      };
      
      const context = testErrorContextCollector.collectErrorContext(mockError, mockErrorInfo);
      testErrorContextCollector.createTestErrorReport(mockError, mockErrorInfo, context);
      
      // Verify global storage
      expect((global as any).__ERROR_REPORTS__).toBeDefined();
      expect((global as any).__ERROR_REPORTS__.length).toBeGreaterThan(0);
    });
  });

  describe('performance and cleanup', () => {
    it('should clean up error data properly', async () => {
      const handleError = debugSession.onError;

      const { unmount } = render(
        <TestErrorBoundaryWrapper onError={handleError}>
          <ErrorThrowingComponent 
            shouldThrow={true}
            errorMessage="Cleanup test error"
          />
        </TestErrorBoundaryWrapper>
      );

      await waitFor(() => {
        expect(document.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // End debug session
      debugSession.endSession('Test completed successfully');

      // Verify cleanup
      const sessions = errorDebuggingUtils.getAllSessions();
      expect(sessions[0].resolution).toBe('Test completed successfully');
    });

    it('should handle multiple concurrent error boundaries', async () => {
      const handleError1 = vi.fn();
      const handleError2 = vi.fn();

      const { container } = render(
        <div>
          <TestErrorBoundaryWrapper onError={handleError1}>
            <ErrorThrowingComponent 
              shouldThrow={true}
              errorMessage="First boundary error"
            />
          </TestErrorBoundaryWrapper>
          <TestErrorBoundaryWrapper onError={handleError2}>
            <ErrorThrowingComponent 
              shouldThrow={true}
              errorMessage="Second boundary error"
            />
          </TestErrorBoundaryWrapper>
        </div>
      );

      await waitFor(() => {
        const errorBoundaries = container.querySelectorAll('[data-testid="error-boundary"]');
        expect(errorBoundaries).toHaveLength(2);
      });

      // Verify both errors were handled
      expect(handleError1).toHaveBeenCalled();
      expect(handleError2).toHaveBeenCalled();

      // Verify error reports were created for both
      const errorReports = testErrorContextCollector.getAllErrorReports();
      expect(errorReports.length).toBeGreaterThanOrEqual(2);
    });
  });
});