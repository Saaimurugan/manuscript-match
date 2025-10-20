/**
 * Error recovery hooks with retry mechanisms and user guidance
 * Provides comprehensive error handling for ScholarFinder operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ScholarFinderError, ScholarFinderErrorType } from '../services/ScholarFinderApiService';
import { 
  createUserFriendlyErrorDisplay, 
  UserFriendlyErrorDisplay,
  isRetryableError,
  getRetryDelay,
  createRetryHelper,
  checkNetworkStatus
} from '../utils/errorHandling';
import { useToast } from '@/hooks/use-toast';

export interface ErrorRecoveryState {
  error: ScholarFinderError | null;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryIn: number;
  userDisplay: UserFriendlyErrorDisplay | null;
}

export interface ErrorRecoveryActions {
  handleError: (error: ScholarFinderError, context?: string) => void;
  retry: () => Promise<void>;
  clearError: () => void;
  setMaxRetries: (max: number) => void;
  canRetry: boolean;
}

export interface UseErrorRecoveryOptions {
  maxRetries?: number;
  onRetry?: () => Promise<void>;
  onMaxRetriesReached?: (error: ScholarFinderError) => void;
  onErrorCleared?: () => void;
  autoRetry?: boolean;
  showToast?: boolean;
}

/**
 * Main error recovery hook
 */
export function useErrorRecovery(options: UseErrorRecoveryOptions = {}): [ErrorRecoveryState, ErrorRecoveryActions] {
  const {
    maxRetries = 3,
    onRetry,
    onMaxRetriesReached,
    onErrorCleared,
    autoRetry = false,
    showToast = true,
  } = options;

  const { toast } = useToast();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    maxRetries,
    nextRetryIn: 0,
    userDisplay: null,
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleError = useCallback((error: ScholarFinderError, context?: string) => {
    const userDisplay = createUserFriendlyErrorDisplay(error, context);
    
    setState(prev => ({
      ...prev,
      error,
      userDisplay,
      retryCount: 0, // Reset retry count for new error
    }));

    // Show toast notification if enabled
    if (showToast) {
      toast({
        variant: "destructive",
        title: userDisplay.title,
        description: userDisplay.message,
      });
    }

    // Auto-retry if enabled and error is retryable
    if (autoRetry && isRetryableError(error)) {
      const delay = getRetryDelay(error);
      scheduleRetry(delay);
    }
  }, [showToast, toast, autoRetry]);

  const scheduleRetry = useCallback((delay: number) => {
    setState(prev => ({
      ...prev,
      nextRetryIn: Math.ceil(delay / 1000),
    }));

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setState(prev => {
        const newCountdown = prev.nextRetryIn - 1;
        if (newCountdown <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return { ...prev, nextRetryIn: 0 };
        }
        return { ...prev, nextRetryIn: newCountdown };
      });
    }, 1000);

    // Schedule retry
    retryTimeoutRef.current = setTimeout(() => {
      retry();
    }, delay);
  }, []);

  const retry = useCallback(async () => {
    if (!state.error || !isRetryableError(state.error)) {
      return;
    }

    // Clear any existing timers
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      nextRetryIn: 0,
    }));

    try {
      if (onRetry) {
        await onRetry();
      }
      
      // Success - clear error
      clearError();
      
      if (showToast) {
        toast({
          title: "Success",
          description: "Operation completed successfully",
        });
      }
    } catch (error) {
      const newRetryCount = state.retryCount + 1;
      
      setState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: newRetryCount,
      }));

      if (newRetryCount >= maxRetries) {
        // Max retries reached
        if (onMaxRetriesReached && state.error) {
          onMaxRetriesReached(state.error);
        }
        
        if (showToast) {
          toast({
            variant: "destructive",
            title: "Max retries reached",
            description: "Please try again later or contact support",
          });
        }
      } else if (autoRetry && state.error) {
        // Schedule next retry with exponential backoff
        const delay = getRetryDelay(state.error) * Math.pow(2, newRetryCount - 1);
        scheduleRetry(delay);
      }
    }
  }, [state.error, state.retryCount, maxRetries, onRetry, onMaxRetriesReached, showToast, toast, autoRetry]);

  const clearError = useCallback(() => {
    // Clear timers
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      maxRetries,
      nextRetryIn: 0,
      userDisplay: null,
    });

    if (onErrorCleared) {
      onErrorCleared();
    }
  }, [maxRetries, onErrorCleared]);

  const setMaxRetries = useCallback((max: number) => {
    setState(prev => ({
      ...prev,
      maxRetries: max,
    }));
  }, []);

  const canRetry = state.error ? isRetryableError(state.error) && state.retryCount < maxRetries : false;

  return [
    state,
    {
      handleError,
      retry,
      clearError,
      setMaxRetries,
      canRetry,
    }
  ];
}

/**
 * Network status hook with error recovery
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(checkNetworkStatus());
  const [wasOffline, setWasOffline] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast({
          title: "Connection restored",
          description: "You're back online. You can continue your work.",
        });
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast({
        variant: "destructive",
        title: "Connection lost",
        description: "You're currently offline. Some features may not work.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, toast]);

  return { isOnline, wasOffline };
}

/**
 * Operation retry hook with exponential backoff
 */
export function useRetryableOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    shouldRetry?: (error: any) => boolean;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    onMaxRetriesReached?: (error: any) => void;
  } = {}
) {
  const {
    maxRetries = 3,
    shouldRetry = () => true,
    onSuccess,
    onError,
    onMaxRetriesReached,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryHelper = createRetryHelper(maxRetries);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      const result = await retryHelper(operation, shouldRetry);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      if (retryCount >= maxRetries && onMaxRetriesReached) {
        onMaxRetriesReached(err);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [operation, shouldRetry, onSuccess, onError, onMaxRetriesReached, maxRetries, retryCount, retryHelper]);

  return {
    execute,
    isLoading,
    error,
    retryCount,
    canRetry: retryCount < maxRetries && shouldRetry(error),
  };
}

/**
 * Step-specific error recovery hook
 */
export function useStepErrorRecovery(stepName: string, options: UseErrorRecoveryOptions = {}) {
  const [errorState, errorActions] = useErrorRecovery({
    ...options,
    onRetry: async () => {
      // Step-specific retry logic can be added here
      if (options.onRetry) {
        await options.onRetry();
      }
    },
  });

  const handleStepError = useCallback((error: ScholarFinderError) => {
    errorActions.handleError(error, `Step: ${stepName}`);
  }, [errorActions, stepName]);

  return {
    ...errorState,
    ...errorActions,
    handleStepError,
  };
}