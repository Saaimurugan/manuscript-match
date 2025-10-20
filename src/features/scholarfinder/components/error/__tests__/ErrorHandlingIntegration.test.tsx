/**
 * Integration tests for comprehensive error handling system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlingProvider, useErrorHandling } from '../../../providers/ErrorHandlingProvider';
import { ScholarFinderError, ScholarFinderErrorType } from '../../../services/ScholarFinderApiService';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../../../utils/errorHandling', () => ({
  createUserFriendlyErrorDisplay: vi.fn((error) => ({
    title: `Error: ${error.type}`,
    message: error.message,
    suggestions: ['Try again', 'Check connection'],
    canRetry: error.retryable,
    retryDelay: error.retryAfter,
    severity: error.retryable ? 'medium' : 'high',
  })),
  handleComponentError: vi.fn(),
  checkNetworkStatus: vi.fn(() => true),
}));

// Test component that uses error handling
const TestComponent = () => {
  const { reportError, clearAllErrors, globalErrors, hasGlobalErrors } = useErrorHandling();

  const simulateError = () => {
    const error: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Test upload error',
      retryable: true,
      retryAfter: 5000,
    };
    reportError(error, 'Test Context');
  };

  return (
    <div>
      <button onClick={simulateError}>Simulate Error</button>
      <button onClick={clearAllErrors}>Clear All Errors</button>
      <div data-testid="error-count">{globalErrors.length}</div>
      <div data-testid="has-errors">{hasGlobalErrors ? 'true' : 'false'}</div>
    </div>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides error handling context to child components', () => {
    render(
      <ErrorHandlingProvider>
        <TestComponent />
      </ErrorHandlingProvider>
    );

    expect(screen.getByText('Simulate Error')).toBeInTheDocument();
    expect(screen.getByTestId('error-count')).toHaveTextContent('0');
    expect(screen.getByTestId('has-errors')).toHaveTextContent('false');
  });

  it('handles error reporting and state management', async () => {
    render(
      <ErrorHandlingProvider>
        <TestComponent />
      </ErrorHandlingProvider>
    );

    const simulateButton = screen.getByText('Simulate Error');
    fireEvent.click(simulateButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      expect(screen.getByTestId('has-errors')).toHaveTextContent('true');
    });
  });

  it('clears all errors when requested', async () => {
    render(
      <ErrorHandlingProvider>
        <TestComponent />
      </ErrorHandlingProvider>
    );

    // Add an error
    const simulateButton = screen.getByText('Simulate Error');
    fireEvent.click(simulateButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
    });

    // Clear errors
    const clearButton = screen.getByText('Clear All Errors');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('0');
      expect(screen.getByTestId('has-errors')).toHaveTextContent('false');
    });
  });

  it('limits the number of global errors', async () => {
    render(
      <ErrorHandlingProvider maxGlobalErrors={2}>
        <TestComponent />
      </ErrorHandlingProvider>
    );

    const simulateButton = screen.getByText('Simulate Error');
    
    // Add 3 errors
    fireEvent.click(simulateButton);
    fireEvent.click(simulateButton);
    fireEvent.click(simulateButton);

    await waitFor(() => {
      // Should only keep 2 errors due to maxGlobalErrors limit
      expect(screen.getByTestId('error-count')).toHaveTextContent('2');
    });
  });

  it('handles critical errors with callback', async () => {
    const onCriticalError = vi.fn();

    const CriticalErrorComponent = () => {
      const { reportError } = useErrorHandling();

      const simulateCriticalError = () => {
        const error: ScholarFinderError = {
          type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
          message: 'Critical system error',
          retryable: false,
        };
        reportError(error, 'Critical Context');
      };

      return <button onClick={simulateCriticalError}>Simulate Critical Error</button>;
    };

    // Mock the error display to return critical severity
    const mockCreateUserFriendlyErrorDisplay = vi.fn((error) => ({
      title: `Error: ${error.type}`,
      message: error.message,
      suggestions: ['Contact support'],
      canRetry: error.retryable,
      severity: 'critical',
    }));

    vi.mocked(require('../../../utils/errorHandling').createUserFriendlyErrorDisplay)
      .mockImplementation(mockCreateUserFriendlyErrorDisplay);

    render(
      <ErrorHandlingProvider onCriticalError={onCriticalError}>
        <CriticalErrorComponent />
      </ErrorHandlingProvider>
    );

    const criticalButton = screen.getByText('Simulate Critical Error');
    fireEvent.click(criticalButton);

    await waitFor(() => {
      expect(onCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
          message: 'Critical system error',
        })
      );
    });
  });

  it('disables features when configured', () => {
    render(
      <ErrorHandlingProvider
        enableGlobalErrorBoundary={false}
        enableNetworkHandling={false}
        enableOfflineMode={false}
      >
        <TestComponent />
      </ErrorHandlingProvider>
    );

    // Should still render the component
    expect(screen.getByText('Simulate Error')).toBeInTheDocument();
    
    // Network indicator should not be present
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('handles network status changes', async () => {
    // Mock network status hook to simulate offline
    const mockUseNetworkStatus = vi.fn(() => ({
      isOnline: false,
      wasOffline: true,
    }));

    vi.mocked(require('../../../hooks/useErrorRecovery').useNetworkStatus)
      .mockImplementation(mockUseNetworkStatus);

    render(
      <ErrorHandlingProvider enableNetworkHandling={true}>
        <TestComponent />
      </ErrorHandlingProvider>
    );

    // Should show offline indicator
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  it('provides step-specific error handling', async () => {
    const StepComponent = () => {
      const { reportError } = useErrorHandling();

      const simulateStepError = () => {
        const error: ScholarFinderError = {
          type: ScholarFinderErrorType.VALIDATION_ERROR,
          message: 'Step validation failed',
          retryable: true,
        };
        reportError(error, 'Step: Upload');
      };

      return <button onClick={simulateStepError}>Simulate Step Error</button>;
    };

    render(
      <ErrorHandlingProvider>
        <StepComponent />
      </ErrorHandlingProvider>
    );

    const stepButton = screen.getByText('Simulate Step Error');
    fireEvent.click(stepButton);

    // Error should be reported with step context
    await waitFor(() => {
      expect(require('../../../utils/errorHandling').createUserFriendlyErrorDisplay)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            type: ScholarFinderErrorType.VALIDATION_ERROR,
          }),
          'Step: Upload'
        );
    });
  });

  it('handles API errors appropriately', async () => {
    const ApiComponent = () => {
      const { reportError } = useErrorHandling();

      const simulateApiError = () => {
        const error: ScholarFinderError = {
          type: ScholarFinderErrorType.NETWORK_ERROR,
          message: 'Network connection failed',
          retryable: true,
          retryAfter: 5000,
        };
        reportError(error, 'API Operation: Upload');
      };

      return <button onClick={simulateApiError}>Simulate API Error</button>;
    };

    render(
      <ErrorHandlingProvider>
        <ApiComponent />
      </ErrorHandlingProvider>
    );

    const apiButton = screen.getByText('Simulate API Error');
    fireEvent.click(apiButton);

    await waitFor(() => {
      expect(require('../../../utils/errorHandling').createUserFriendlyErrorDisplay)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            type: ScholarFinderErrorType.NETWORK_ERROR,
            message: 'Network connection failed',
            retryable: true,
            retryAfter: 5000,
          }),
          'API Operation: Upload'
        );
    });
  });

  it('manages recovery state correctly', async () => {
    const RecoveryComponent = () => {
      const { isRecovering, recoveryProgress } = useErrorHandling();

      return (
        <div>
          <div data-testid="is-recovering">{isRecovering ? 'true' : 'false'}</div>
          <div data-testid="recovery-progress">{recoveryProgress}</div>
        </div>
      );
    };

    render(
      <ErrorHandlingProvider>
        <RecoveryComponent />
      </ErrorHandlingProvider>
    );

    expect(screen.getByTestId('is-recovering')).toHaveTextContent('false');
    expect(screen.getByTestId('recovery-progress')).toHaveTextContent('0');
  });

  it('respects configuration settings', () => {
    const ConfigComponent = () => {
      const { maxRetries, enableAutoRetry } = useErrorHandling();

      return (
        <div>
          <div data-testid="max-retries">{maxRetries}</div>
          <div data-testid="auto-retry">{enableAutoRetry ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <ErrorHandlingProvider defaultMaxRetries={5}>
        <ConfigComponent />
      </ErrorHandlingProvider>
    );

    expect(screen.getByTestId('max-retries')).toHaveTextContent('5');
    expect(screen.getByTestId('auto-retry')).toHaveTextContent('true');
  });
});