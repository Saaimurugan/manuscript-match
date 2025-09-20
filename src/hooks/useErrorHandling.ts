/**
 * Error handling React Query hooks
 * Provides centralized error handling utilities and toast notifications
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler } from '../services/apiService';
import { EnhancedErrorHandler, type ErrorContext } from '../lib/errorHandler';
import type { UserFriendlyError } from '../types/api';

/**
 * Hook for API error handling with toast notifications
 */
export const useApiErrorHandler = () => {
  const { toast } = useToast();
  
  const handleError = useCallback((error: any, customMessage?: string, context?: ErrorContext) => {
    // Use enhanced error handler for comprehensive error processing
    const enhancedError = EnhancedErrorHandler.handle(error, context);
    
    // Show toast notification with appropriate variant
    const variant = enhancedError.severity === 'critical' || enhancedError.severity === 'high' 
      ? 'destructive' 
      : 'default';
    
    toast({
      title: enhancedError.severity === 'low' ? 'Notice' : 'Error',
      description: customMessage || enhancedError.message,
      variant,
      duration: enhancedError.severity === 'critical' ? 8000 : 5000,
    });
    
    // Handle specific error actions
    if (enhancedError.action === 'REDIRECT_TO_LOGIN') {
      // Small delay to allow toast to show
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    
    return enhancedError;
  }, [toast]);
  
  const handleSuccess = useCallback((message: string, duration: number = 3000) => {
    toast({
      title: 'Success',
      description: message,
      variant: 'default',
      duration,
    });
  }, [toast]);
  
  return {
    handleError,
    handleSuccess,
  };
};

/**
 * Hook for mutation error handling
 */
export const useMutationErrorHandler = () => {
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  const onError = useCallback((error: any, customMessage?: string, context?: ErrorContext) => {
    return handleError(error, customMessage, context);
  }, [handleError]);
  
  const onSuccess = useCallback((message: string) => {
    handleSuccess(message);
  }, [handleSuccess]);
  
  return {
    onError,
    onSuccess,
  };
};

/**
 * Hook for query error handling
 */
export const useQueryErrorHandler = () => {
  const { handleError } = useApiErrorHandler();
  
  const onError = useCallback((error: any, context?: ErrorContext) => {
    // Only show toast for non-404 errors in queries
    // 404 errors are often expected (e.g., no data exists yet)
    if (error?.response?.status !== 404) {
      return handleError(error, undefined, context);
    }
    
    // Use enhanced error handler for 404s but don't show toast
    const enhancedError = EnhancedErrorHandler.handle(error, context);
    console.warn('Query returned 404:', enhancedError);
    return enhancedError;
  }, [handleError]);
  
  return {
    onError,
  };
};

/**
 * Hook for retry logic with enhanced error handling
 */
export const useRetryLogic = () => {
  const shouldRetry = useCallback((failureCount: number, error: any, context?: ErrorContext): boolean => {
    const enhancedError = EnhancedErrorHandler.handle(error, context);
    
    // Use enhanced error's canRetry property
    if (!enhancedError.canRetry) {
      return false;
    }
    
    // Check against max retries
    const maxRetries = enhancedError.maxRetries || 3;
    return failureCount < maxRetries;
  }, []);
  
  const getRetryDelay = useCallback((attemptIndex: number, error?: any, context?: ErrorContext): number => {
    const enhancedError = error ? EnhancedErrorHandler.handle(error, context) : null;
    
    // Use retry-after header for rate limit errors
    if (enhancedError?.type === 'RATE_LIMIT_ERROR' && enhancedError.retryAfter) {
      return enhancedError.retryAfter * 1000;
    }
    
    // Exponential backoff with jitter based on error severity
    const baseDelay = enhancedError?.severity === 'critical' ? 2000 : 1000;
    const maxDelay = enhancedError?.severity === 'critical' ? 60000 : 30000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    
    return Math.max(exponentialDelay + jitter, baseDelay);
  }, []);
  
  const incrementRetryCount = useCallback((error: any): void => {
    // This could be used to track retry attempts in the enhanced error
    if (error && typeof error === 'object' && 'retryCount' in error) {
      error.retryCount = (error.retryCount || 0) + 1;
    }
  }, []);
  
  return {
    shouldRetry,
    getRetryDelay,
    incrementRetryCount,
  };
};
/**

 * Hook for handling component-level errors with context
 */
export const useComponentErrorHandler = (componentName: string) => {
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  const handleComponentError = useCallback((error: any, action?: string, customMessage?: string) => {
    const context: ErrorContext = {
      component: componentName,
      action,
    };
    
    return handleError(error, customMessage, context);
  }, [handleError, componentName]);
  
  const handleComponentSuccess = useCallback((message: string, action?: string) => {
    // Log success for debugging
    console.info(`[${componentName}] Success:`, { action, message });
    handleSuccess(message);
  }, [handleSuccess, componentName]);
  
  return {
    handleError: handleComponentError,
    handleSuccess: handleComponentSuccess,
  };
};

/**
 * Hook for handling async operation errors with loading states
 */
export const useAsyncErrorHandler = () => {
  const { handleError } = useApiErrorHandler();
  
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    customErrorMessage?: string
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error, customErrorMessage, context);
      return null;
    }
  }, [handleError]);
  
  return {
    executeWithErrorHandling,
  };
};

/**
 * Hook for handling form validation errors
 */
export const useFormErrorHandler = () => {
  const { toast } = useToast();
  
  const handleValidationErrors = useCallback((errors: Record<string, string[]>) => {
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n');
    
    toast({
      title: 'Validation Error',
      description: errorMessages,
      variant: 'destructive',
      duration: 6000,
    });
  }, [toast]);
  
  const handleFieldError = useCallback((field: string, message: string) => {
    toast({
      title: `${field} Error`,
      description: message,
      variant: 'destructive',
      duration: 4000,
    });
  }, [toast]);
  
  return {
    handleValidationErrors,
    handleFieldError,
  };
};

/**
 * Hook for handling network connectivity errors
 */
export const useNetworkErrorHandler = () => {
  const { toast } = useToast();
  
  const handleOffline = useCallback(() => {
    toast({
      title: 'Connection Lost',
      description: 'You are currently offline. Some features may not work properly.',
      variant: 'destructive',
      duration: 0, // Don't auto-dismiss
    });
  }, [toast]);
  
  const handleOnline = useCallback(() => {
    toast({
      title: 'Connection Restored',
      description: 'You are back online.',
      variant: 'default',
      duration: 3000,
    });
  }, [toast]);
  
  return {
    handleOffline,
    handleOnline,
  };
};

/**
 * Hook for error recovery actions
 */
export const useErrorRecovery = () => {
  const handleRetry = useCallback((retryFunction: () => void | Promise<void>) => {
    return async () => {
      try {
        await retryFunction();
      } catch (error) {
        console.error('Retry failed:', error);
        // The retry function should handle its own errors
      }
    };
  }, []);
  
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);
  
  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);
  
  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }, []);
  
  return {
    handleRetry,
    handleRefresh,
    handleGoHome,
    handleGoBack,
  };
};

/**
 * Main error handling hook (alias for useApiErrorHandler)
 */
export const useErrorHandling = useApiErrorHandler;