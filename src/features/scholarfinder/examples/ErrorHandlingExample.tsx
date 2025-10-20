/**
 * Example demonstrating comprehensive error handling usage in ScholarFinder
 * Shows integration of error boundaries, recovery hooks, notifications, and network handling
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Upload, Search, CheckCircle, WifiOff } from 'lucide-react';

// Error handling components and hooks
import { ErrorHandlingProvider, useErrorHandling, useStepErrorHandling, useApiErrorHandling } from '../providers/ErrorHandlingProvider';
import { ScholarFinderErrorBoundary, StepErrorBoundary } from '../components/error/ErrorBoundary';
import { ErrorDisplay, ErrorSummary } from '../components/error/ErrorDisplay';
import { useErrorRecovery, useNetworkStatus } from '../hooks/useErrorRecovery';
import { NetworkStatusIndicator, NetworkAwareOperation } from '../components/network/NetworkStatusIndicator';
import { useScholarFinderToasts } from '../components/notifications/ToastNotificationSystem';

// Mock error types for demonstration
import { ScholarFinderError, ScholarFinderErrorType } from '../services/ScholarFinderApiService';

/**
 * Main example component wrapped with error handling
 */
export function ErrorHandlingExample() {
  return (
    <ErrorHandlingProvider
      enableGlobalErrorBoundary={true}
      enableNetworkHandling={true}
      enableOfflineMode={true}
      onCriticalError={(error) => {
        console.error('Critical error occurred:', error);
        // Could send to monitoring service
      }}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ScholarFinder Error Handling Demo</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive error handling, recovery, and user feedback system
          </p>
        </div>

        <NetworkStatusIndicator showFullAlert={true} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ErrorBoundaryDemo />
          <ErrorRecoveryDemo />
          <NetworkHandlingDemo />
          <ToastNotificationDemo />
          <StepErrorDemo />
          <ApiErrorDemo />
        </div>

        <GlobalErrorDemo />
      </div>
    </ErrorHandlingProvider>
  );
}

/**
 * Error Boundary demonstration
 */
function ErrorBoundaryDemo() {
  const [shouldThrow, setShouldThrow] = useState(false);

  const ThrowingComponent = () => {
    if (shouldThrow) {
      throw new Error('Intentional error for demonstration');
    }
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <CheckCircle className="h-5 w-5 text-green-600 inline mr-2" />
        Component is working normally
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error Boundary Demo
        </CardTitle>
        <CardDescription>
          Demonstrates React error boundary functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => setShouldThrow(!shouldThrow)}
          variant={shouldThrow ? "destructive" : "default"}
        >
          {shouldThrow ? 'Fix Component' : 'Break Component'}
        </Button>

        <ScholarFinderErrorBoundary
          context="Error Boundary Demo"
          showDetails={true}
        >
          <ThrowingComponent />
        </ScholarFinderErrorBoundary>
      </CardContent>
    </Card>
  );
}

/**
 * Error Recovery demonstration
 */
function ErrorRecoveryDemo() {
  const [errorState, errorActions] = useErrorRecovery({
    maxRetries: 3,
    autoRetry: false,
    onRetry: async () => {
      // Simulate retry operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (Math.random() > 0.7) {
        throw new Error('Retry failed');
      }
    },
    onMaxRetriesReached: (error) => {
      console.log('Max retries reached for:', error);
    },
  });

  const simulateError = () => {
    const errors: ScholarFinderError[] = [
      {
        type: ScholarFinderErrorType.UPLOAD_ERROR,
        message: 'Failed to upload manuscript file',
        retryable: true,
        retryAfter: 3000,
      },
      {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: 'Unsupported file format. Please use .doc or .docx',
        retryable: false,
      },
      {
        type: ScholarFinderErrorType.TIMEOUT_ERROR,
        message: 'Operation timed out due to large file size',
        retryable: true,
        retryAfter: 5000,
      },
    ];

    const randomError = errors[Math.floor(Math.random() * errors.length)];
    errorActions.handleError(randomError, 'Error Recovery Demo');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Error Recovery Demo
        </CardTitle>
        <CardDescription>
          Shows error recovery with retry mechanisms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={simulateError}>
            Simulate Error
          </Button>
          <Button 
            onClick={errorActions.clearError} 
            variant="outline"
            disabled={!errorState.error}
          >
            Clear Error
          </Button>
        </div>

        {errorState.error && (
          <ErrorDisplay
            error={errorState.error}
            context="Error Recovery Demo"
            onRetry={errorActions.canRetry ? errorActions.retry : undefined}
            onDismiss={errorActions.clearError}
            showDetails={true}
            compact={false}
          />
        )}

        <div className="text-sm text-muted-foreground">
          <p>Retry Count: {errorState.retryCount}/{errorState.maxRetries}</p>
          <p>Can Retry: {errorActions.canRetry ? 'Yes' : 'No'}</p>
          {errorState.nextRetryIn > 0 && (
            <p>Next retry in: {errorState.nextRetryIn}s</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Network handling demonstration
 */
function NetworkHandlingDemo() {
  const { isOnline } = useNetworkStatus();
  const [simulateOffline, setSimulateOffline] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WifiOff className="h-5 w-5" />
          Network Handling Demo
        </CardTitle>
        <CardDescription>
          Network status detection and offline handling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSimulateOffline(!simulateOffline)}
          >
            {simulateOffline ? 'Show Online Content' : 'Simulate Offline'}
          </Button>
        </div>

        <NetworkAwareOperation
          requiresNetwork={!simulateOffline}
          fallbackMessage="This demo requires network connectivity"
        >
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm">
              This content is only shown when online or when offline simulation is disabled.
            </p>
          </div>
        </NetworkAwareOperation>

        {simulateOffline && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Simulating offline mode. Network-dependent features are disabled.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Toast notification demonstration
 */
function ToastNotificationDemo() {
  const toasts = useScholarFinderToasts();

  const showDemoToasts = () => {
    toasts.showSuccess('Upload Complete', 'Your manuscript has been processed successfully');
    
    setTimeout(() => {
      toasts.showWarning('Validation Warning', 'Some authors could not be validated');
    }, 1000);

    setTimeout(() => {
      toasts.showError('Search Failed', 'Database search encountered an error', [
        {
          label: 'Retry',
          onClick: () => toasts.showInfo('Retrying...', 'Attempting to reconnect to databases'),
        }
      ]);
    }, 2000);

    setTimeout(() => {
      const progressId = toasts.showProgress('Processing Keywords', 'Enhancing your manuscript keywords...', 0);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        toasts.updateToast(progressId, { progress });
        
        if (progress >= 100) {
          clearInterval(interval);
          toasts.updateToast(progressId, {
            type: 'success',
            title: 'Keywords Enhanced',
            description: 'Your keywords have been successfully enhanced',
            progress: undefined,
          });
        }
      }, 500);
    }, 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toast Notifications Demo</CardTitle>
        <CardDescription>
          Success, error, warning, info, and progress notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={showDemoToasts}>
          Show Demo Notifications
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Watch the top-right corner for notifications
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Step-specific error handling demonstration
 */
function StepErrorDemo() {
  const stepErrorHandling = useStepErrorHandling('Upload Step');

  const simulateStepError = () => {
    const error: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Failed to upload file to server',
      retryable: true,
      retryAfter: 2000,
    };

    stepErrorHandling.handleStepError(error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step Error Handling Demo</CardTitle>
        <CardDescription>
          Step-specific error handling with context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={simulateStepError}>
          Simulate Step Error
        </Button>

        <StepErrorBoundary 
          stepName="Upload Step"
          onStepError={(stepName, error) => {
            console.log(`Error in ${stepName}:`, error);
          }}
        >
          <div className="p-3 bg-gray-50 border rounded">
            <p className="text-sm">Step content goes here</p>
            <p className="text-xs text-muted-foreground">
              Step errors: {stepErrorHandling.stepErrorCount}
            </p>
          </div>
        </StepErrorBoundary>

        {stepErrorHandling.hasStepErrors && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={stepErrorHandling.clearStepErrors}
          >
            Clear Step Errors
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * API error handling demonstration
 */
function ApiErrorDemo() {
  const { handleApiError } = useApiErrorHandling();

  const simulateApiError = () => {
    const apiErrors = [
      {
        message: 'Network timeout',
        status: 408,
        statusText: 'Request Timeout',
        code: 'TIMEOUT',
        config: { url: '/api/upload', method: 'POST' },
      },
      {
        message: 'Server error',
        status: 500,
        statusText: 'Internal Server Error',
        config: { url: '/api/search', method: 'GET' },
      },
      {
        message: 'Service unavailable',
        status: 503,
        statusText: 'Service Unavailable',
        config: { url: '/api/validate', method: 'POST' },
      },
    ];

    const randomError = apiErrors[Math.floor(Math.random() * apiErrors.length)];
    handleApiError(randomError, 'Demo API Operation');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          API Error Handling Demo
        </CardTitle>
        <CardDescription>
          API-specific error handling and reporting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={simulateApiError}>
          Simulate API Error
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Simulates various API error scenarios
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Global error state demonstration
 */
function GlobalErrorDemo() {
  const { globalErrors, hasGlobalErrors, clearAllErrors } = useErrorHandling();

  if (!hasGlobalErrors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global Error State</CardTitle>
          <CardDescription>No global errors currently</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Trigger errors in the demos above to see them appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Error State</CardTitle>
        <CardDescription>
          {globalErrors.length} error{globalErrors.length !== 1 ? 's' : ''} in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorSummary
          errors={globalErrors}
          onClearAll={clearAllErrors}
        />
      </CardContent>
    </Card>
  );
}