/**
 * Retry Button component with exponential backoff and loading states
 * Provides user-friendly retry functionality for failed operations
 */

import React, { useState, useCallback } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRetryLogic } from '@/hooks/useErrorHandling';
import type { ErrorContext } from '@/lib/errorHandler';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  error?: any;
  context?: ErrorContext;
  maxRetries?: number;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  showRetryCount?: boolean;
  autoRetry?: boolean;
  autoRetryDelay?: number;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  error,
  context,
  maxRetries = 3,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className,
  children,
  showRetryCount = true,
  autoRetry = false,
  autoRetryDelay,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const { shouldRetry, getRetryDelay } = useRetryLogic();

  // Update countdown timer
  React.useEffect(() => {
    if (nextRetryTime && timeRemaining && timeRemaining > 0) {
      const timer = setTimeout(() => {
        const remaining = Math.max(0, nextRetryTime - Date.now());
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          setNextRetryTime(null);
          setTimeRemaining(null);
          
          // Auto retry if enabled
          if (autoRetry) {
            handleRetry();
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [nextRetryTime, timeRemaining, autoRetry]);

  const handleRetry = useCallback(async () => {
    if (isRetrying || disabled) return;
    
    // Check if we can retry
    if (!shouldRetry(retryCount, error, context)) {
      return;
    }
    
    setIsRetrying(true);
    
    try {
      await onRetry();
      // Reset retry count on success
      setRetryCount(0);
      setNextRetryTime(null);
      setTimeRemaining(null);
    } catch (retryError) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Calculate next retry delay
      if (shouldRetry(newRetryCount, retryError, context)) {
        const delay = autoRetryDelay || getRetryDelay(newRetryCount, retryError, context);
        const nextTime = Date.now() + delay;
        setNextRetryTime(nextTime);
        setTimeRemaining(delay);
      }
      
      // Re-throw error so parent can handle it
      throw retryError;
    } finally {
      setIsRetrying(false);
    }
  }, [
    isRetrying,
    disabled,
    shouldRetry,
    retryCount,
    error,
    context,
    onRetry,
    autoRetryDelay,
    getRetryDelay,
  ]);

  const canRetry = shouldRetry(retryCount, error, context);
  const isWaiting = timeRemaining && timeRemaining > 0;
  const buttonDisabled = disabled || isRetrying || !canRetry || isWaiting;

  const getButtonText = () => {
    if (children) return children;
    
    if (isRetrying) return 'Retrying...';
    if (isWaiting) {
      const seconds = Math.ceil((timeRemaining || 0) / 1000);
      return `Retry in ${seconds}s`;
    }
    if (!canRetry) return 'Max retries reached';
    
    return showRetryCount && retryCount > 0 
      ? `Retry (${retryCount}/${maxRetries})`
      : 'Retry';
  };

  const getButtonIcon = () => {
    if (isRetrying) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    if (isWaiting) {
      return <Clock className="w-4 h-4" />;
    }
    return <RefreshCw className="w-4 h-4" />;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={buttonDisabled}
      onClick={handleRetry}
    >
      {getButtonIcon()}
      <span className="ml-2">{getButtonText()}</span>
    </Button>
  );
};

/**
 * Auto-retry wrapper component
 * Automatically retries failed operations with exponential backoff
 */
interface AutoRetryWrapperProps {
  children: (retry: () => void) => React.ReactNode;
  onRetry: () => Promise<void> | void;
  error?: any;
  context?: ErrorContext;
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  enabled?: boolean;
}

export const AutoRetryWrapper: React.FC<AutoRetryWrapperProps> = ({
  children,
  onRetry,
  error,
  context,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 30000,
  enabled = true,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);
  
  const { shouldRetry, getRetryDelay } = useRetryLogic();

  const executeRetry = useCallback(async () => {
    if (!enabled || isRetrying || !shouldRetry(retryCount, error, context)) {
      return;
    }
    
    setIsRetrying(true);
    
    try {
      await onRetry();
      setRetryCount(0);
      setNextRetryTime(null);
    } catch (retryError) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (shouldRetry(newRetryCount, retryError, context)) {
        const delay = getRetryDelay(newRetryCount, retryError, context);
        const nextTime = Date.now() + delay;
        setNextRetryTime(nextTime);
        
        // Schedule next retry
        setTimeout(() => {
          executeRetry();
        }, delay);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [
    enabled,
    isRetrying,
    shouldRetry,
    retryCount,
    error,
    context,
    onRetry,
    getRetryDelay,
  ]);

  // Auto-start retry on error
  React.useEffect(() => {
    if (error && enabled && retryCount === 0) {
      executeRetry();
    }
  }, [error, enabled, retryCount, executeRetry]);

  return <>{children(executeRetry)}</>;
};

export default RetryButton;