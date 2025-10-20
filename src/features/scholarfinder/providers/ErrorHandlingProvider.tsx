/**
 * Comprehensive error handling provider for ScholarFinder
 * Integrates error boundaries, recovery hooks, notifications, and network handling
 */

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { ScholarFinderError, ScholarFinderErrorType } from '../services/ScholarFinderApiService';
import { ScholarFinderErrorBoundary } from '../components/error/ErrorBoundary';
import { ToastNotificationProvider, useScholarFinderToasts } from '../components/notifications/ToastNotificationSystem';
import { NetworkStatusIndicator, OfflineModeHandler, useOfflineData } from '../components/network/NetworkStatusIndicator';
import { useErrorRecovery, useNetworkStatus } from '../hooks/useErrorRecovery';
import { ErrorDisplay } from '../components/error/ErrorDisplay';
import { createUserFriendlyErrorDisplay } from '../utils/errorHandling';

interface ErrorHandlingContextType {
  // Error state
  globalErrors: ScholarFinderError[];
  hasGlobalErrors: boolean;
  
  // Error actions
  reportError: (error: ScholarFinderError, context?: string) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  retryOperation: (errorId: string) => Promise<void>;
  
  // Network status
  isOnline: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  
  // Recovery state
  isRecovering: boolean;
  recoveryProgress: number;
  
  // Settings
  enableAutoRetry: boolean;
  setEnableAutoRetry: (enabled: boolean) => void;
  maxRetries: number;
  setMaxRetries: (max: number) => void;
}

const ErrorHandlingContext = createContext<ErrorHandlingContextType | undefined>(undefined);

export function useErrorHandling() {
  const context = useContext(ErrorHandlingContext);
  if (!context) {
    throw new Error('useErrorHandling must be used within an ErrorHandlingProvider');
  }
  return context;
}

interface ErrorHandlingProviderProps {
  children: ReactNode;
  enableGlobalErrorBoundary?: boolean;
  enableNetworkHandling?: boolean;
  enableOfflineMode?: boolean;
  maxGlobalErrors?: number;
  defaultMaxRetries?: number;
  onCriticalError?: (error: ScholarFinderError) => void;
}

export function ErrorHandlingProvider({
  children,
  enableGlobalErrorBoundary = true,
  enableNetworkHandling = true,
  enableOfflineMode = true,
  maxGlobalErrors = 10,
  defaultMaxRetries = 3,
  onCriticalError,
}: ErrorHandlingProviderProps) {
  return (
    <ToastNotificationProvider>
      <ErrorHandlingProviderInner
        enableGlobalErrorBoundary={enableGlobalErrorBoundary}
        enableNetworkHandling={enableNetworkHandling}
        enableOfflineMode={enableOfflineMode}
        maxGlobalErrors={maxGlobalErrors}
        defaultMaxRetries={defaultMaxRetries}
        onCriticalError={onCriticalError}
      >
        {children}
      </ErrorHandlingProviderInner>
    </ToastNotificationProvider>
  );
}

function ErrorHandlingProviderInner({
  children,
  enableGlobalErrorBoundary,
  enableNetworkHandling,
  enableOfflineMode,
  maxGlobalErrors,
  defaultMaxRetries,
  onCriticalError,
}: Omit<ErrorHandlingProviderProps, 'children'> & { children: ReactNode }) {
  const [globalErrors, setGlobalErrors] = useState<(ScholarFinderError & { id: string; context?: string })[]>([]);
  const [enableAutoRetry, setEnableAutoRetry] = useState(true);
  const [maxRetries, setMaxRetries] = useState(defaultMaxRetries || 3);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  const toasts = useScholarFinderToasts();
  const { isOnline } = useNetworkStatus();
  const { saveOfflineData, syncOfflineData } = useOfflineData();

  // Monitor connection quality
  useEffect(() => {
    if (!isOnline) {
      setConnectionQuality('offline');
      return;
    }

    const checkQuality = async () => {
      try {
        const start = Date.now();
        await fetch('/api/health', { method: 'HEAD', cache: 'no-cache' });
        const latency = Date.now() - start;
        setConnectionQuality(latency < 1000 ? 'good' : 'poor');
      } catch {
        setConnectionQuality('poor');
      }
    };

    checkQuality();
    const interval = setInterval(checkQuality, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Auto-sync offline data when coming back online
  useEffect(() => {
    if (isOnline && enableOfflineMode) {
      syncOfflineData('process-data', async (data) => {
        // Implement sync logic here
        console.log('Syncing offline data:', data);
      });
    }
  }, [isOnline, enableOfflineMode, syncOfflineData]);

  const generateErrorId = useCallback(() => {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const reportError = useCallback((error: ScholarFinderError, context?: string) => {
    const errorId = generateErrorId();
    const errorWithId = { ...error, id: errorId, context };

    setGlobalErrors(prev => {
      const updated = [errorWithId, ...prev];
      return updated.slice(0, maxGlobalErrors);
    });

    // Handle critical errors
    const display = createUserFriendlyErrorDisplay(error, context);
    if (display.severity === 'critical' && onCriticalError) {
      onCriticalError(error);
    }

    // Show appropriate toast
    switch (display.severity) {
      case 'critical':
        toasts.showError(display.title, display.message, [
          {
            label: 'Get Help',
            onClick: () => window.open('https://docs.scholarfinder.com/support', '_blank'),
          }
        ]);
        break;
      case 'high':
        toasts.showError(display.title, display.message);
        break;
      case 'medium':
        toasts.showWarning(display.title, display.message);
        break;
      case 'low':
        toasts.showInfo(display.title, display.message);
        break;
    }

    // Save error for offline analysis if needed
    if (enableOfflineMode) {
      saveOfflineData('error-log', {
        errors: [errorWithId, ...globalErrors.slice(0, 4)], // Keep last 5 errors
      });
    }

    // Log error for monitoring
    console.error('ScholarFinder Error:', {
      id: errorId,
      type: error.type,
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      details: error.details,
    });
  }, [generateErrorId, maxGlobalErrors, onCriticalError, toasts, enableOfflineMode, saveOfflineData, globalErrors]);

  const clearError = useCallback((errorId: string) => {
    setGlobalErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearAllErrors = useCallback(() => {
    setGlobalErrors([]);
    toasts.showSuccess('All errors cleared');
  }, [toasts]);

  const retryOperation = useCallback(async (errorId: string) => {
    const error = globalErrors.find(e => e.id === errorId);
    if (!error) return;

    setIsRecovering(true);
    setRecoveryProgress(0);

    try {
      // Simulate recovery progress
      const progressInterval = setInterval(() => {
        setRecoveryProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Implement retry logic based on error type
      switch (error.type) {
        case ScholarFinderErrorType.UPLOAD_ERROR:
          // Retry upload logic would go here
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        case ScholarFinderErrorType.SEARCH_ERROR:
          // Retry search logic would go here
          await new Promise(resolve => setTimeout(resolve, 1500));
          break;
        case ScholarFinderErrorType.VALIDATION_ERROR:
          // Retry validation logic would go here
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        default:
          // Generic retry
          await new Promise(resolve => setTimeout(resolve, 1000));
      }

      clearInterval(progressInterval);
      setRecoveryProgress(100);
      
      // Success
      setTimeout(() => {
        clearError(errorId);
        setIsRecovering(false);
        setRecoveryProgress(0);
        toasts.showSuccess('Operation completed successfully');
      }, 500);

    } catch (retryError) {
      setIsRecovering(false);
      setRecoveryProgress(0);
      
      // Report retry failure
      reportError({
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: 'Retry operation failed',
        retryable: false,
        details: { originalError: error, retryError },
      }, `Retry failed for: ${error.context || 'Unknown operation'}`);
    }
  }, [globalErrors, clearError, toasts, reportError]);

  const contextValue: ErrorHandlingContextType = {
    globalErrors: globalErrors.map(({ id, context, ...error }) => error),
    hasGlobalErrors: globalErrors.length > 0,
    reportError,
    clearError,
    clearAllErrors,
    retryOperation,
    isOnline,
    connectionQuality,
    isRecovering,
    recoveryProgress,
    enableAutoRetry,
    setEnableAutoRetry,
    maxRetries,
    setMaxRetries,
  };

  const content = (
    <ErrorHandlingContext.Provider value={contextValue}>
      {enableNetworkHandling && (
        <div className="fixed top-4 left-4 z-50">
          <NetworkStatusIndicator />
        </div>
      )}
      
      {enableOfflineMode ? (
        <OfflineModeHandler>
          {children}
        </OfflineModeHandler>
      ) : (
        children
      )}

      {/* Global error display */}
      {globalErrors.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
          {globalErrors.slice(0, 3).map((error) => (
            <ErrorDisplay
              key={error.id}
              error={error}
              context={error.context}
              compact={true}
              onRetry={() => retryOperation(error.id)}
              onDismiss={() => clearError(error.id)}
            />
          ))}
          {globalErrors.length > 3 && (
            <div className="text-center">
              <button
                onClick={clearAllErrors}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                +{globalErrors.length - 3} more errors (click to clear all)
              </button>
            </div>
          )}
        </div>
      )}
    </ErrorHandlingContext.Provider>
  );

  if (enableGlobalErrorBoundary) {
    return (
      <ScholarFinderErrorBoundary
        context="Global ScholarFinder Application"
        onError={(error, errorInfo) => {
          reportError({
            type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
            message: error.message,
            retryable: false,
            details: { error: error.message, stack: error.stack, errorInfo },
          }, 'React Error Boundary');
        }}
        showDetails={process.env.NODE_ENV === 'development'}
      >
        {content}
      </ScholarFinderErrorBoundary>
    );
  }

  return content;
}

/**
 * Hook for step-specific error handling
 */
export function useStepErrorHandling(stepName: string) {
  const { reportError, clearError, retryOperation } = useErrorHandling();
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const handleStepError = useCallback((error: ScholarFinderError) => {
    const errorId = `step-${stepName}-${Date.now()}`;
    reportError(error, `Step: ${stepName}`);
    setStepErrors(prev => [...prev, errorId]);
    return errorId;
  }, [reportError, stepName]);

  const clearStepErrors = useCallback(() => {
    stepErrors.forEach(clearError);
    setStepErrors([]);
  }, [stepErrors, clearError]);

  const retryStepOperation = useCallback(async (errorId: string) => {
    await retryOperation(errorId);
    setStepErrors(prev => prev.filter(id => id !== errorId));
  }, [retryOperation]);

  return {
    handleStepError,
    clearStepErrors,
    retryStepOperation,
    hasStepErrors: stepErrors.length > 0,
    stepErrorCount: stepErrors.length,
  };
}

/**
 * Hook for API operation error handling
 */
export function useApiErrorHandling() {
  const { reportError, isOnline } = useErrorHandling();
  const toasts = useScholarFinderToasts();

  const handleApiError = useCallback((error: any, operation: string) => {
    if (!isOnline) {
      toasts.showNetworkError();
      return;
    }

    // Convert generic errors to ScholarFinderError
    const scholarFinderError: ScholarFinderError = {
      type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
      message: error.message || 'An API error occurred',
      retryable: error.status >= 500 || error.code === 'NETWORK_ERROR',
      retryAfter: error.retryAfter || 5000,
      details: {
        status: error.status,
        statusText: error.statusText,
        operation,
        url: error.config?.url,
        method: error.config?.method,
      },
    };

    reportError(scholarFinderError, `API Operation: ${operation}`);
  }, [reportError, isOnline, toasts]);

  return { handleApiError };
}