/**
 * Hook for handling authentication-related toast notifications
 * Provides user-friendly error messages for authentication operations
 */

import { useCallback } from 'react';
import type { UserFriendlyError } from '../types/api';

// Simple toast interface - can be replaced with actual toast library
interface ToastConfig {
  title: string;
  description?: string;
  variant: 'default' | 'destructive' | 'success';
  duration?: number;
}

// Mock toast function - replace with actual toast implementation
const showToast = (config: ToastConfig) => {
  console.log(`[${config.variant.toUpperCase()}] ${config.title}`, config.description);
  
  // In a real implementation, this would show a toast notification
  // For now, we'll use browser alerts for critical errors
  if (config.variant === 'destructive') {
    alert(`${config.title}: ${config.description}`);
  }
};

/**
 * Hook for authentication toast notifications
 */
export const useAuthToast = () => {
  const showError = useCallback((error: any) => {
    let userError: UserFriendlyError;
    
    // Handle different error types
    if (error && typeof error === 'object' && 'type' in error) {
      userError = error as UserFriendlyError;
    } else if (error && typeof error === 'object' && 'message' in error) {
      userError = {
        type: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
      };
    } else if (typeof error === 'string') {
      userError = {
        type: 'UNKNOWN_ERROR',
        message: error,
      };
    } else {
      userError = {
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      };
    }

    // Show appropriate toast based on error type
    switch (userError.type) {
      case 'AUTHENTICATION_ERROR':
        showToast({
          title: 'Authentication Error',
          description: userError.message,
          variant: 'destructive',
        });
        break;
      
      case 'NETWORK_ERROR':
        showToast({
          title: 'Connection Error',
          description: userError.message,
          variant: 'destructive',
        });
        break;
      
      case 'VALIDATION_ERROR':
        showToast({
          title: 'Validation Error',
          description: userError.message,
          variant: 'destructive',
        });
        break;
      
      case 'RATE_LIMIT_ERROR':
        showToast({
          title: 'Rate Limit Exceeded',
          description: userError.message,
          variant: 'destructive',
          duration: userError.retryAfter ? userError.retryAfter * 1000 : 5000,
        });
        break;
      
      case 'SERVER_ERROR':
        showToast({
          title: 'Server Error',
          description: userError.message,
          variant: 'destructive',
        });
        break;
      
      default:
        showToast({
          title: 'Error',
          description: userError.message,
          variant: 'destructive',
        });
    }
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showToast({
      title,
      description: message,
      variant: 'success',
    });
  }, []);

  const showInfo = useCallback((message: string, title: string = 'Info') => {
    showToast({
      title,
      description: message,
      variant: 'default',
    });
  }, []);

  return {
    showError,
    showSuccess,
    showInfo,
  };
};

export default useAuthToast;