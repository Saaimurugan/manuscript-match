/**
 * Hook for integrating AuthErrorBoundary with AuthContext
 * Handles communication between error boundary and authentication state
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authLogger } from '../utils/authLogger';

export interface UseAuthErrorBoundaryOptions {
  /**
   * Whether to automatically handle error boundary events
   * @default true
   */
  autoHandle?: boolean;
  
  /**
   * Custom handler for error boundary clear events
   */
  onClearAuth?: () => void;
  
  /**
   * Custom handler for error boundary reinit events
   */
  onReinitAuth?: () => void;
}

/**
 * Hook to integrate authentication error boundary with auth context
 */
export function useAuthErrorBoundary(options: UseAuthErrorBoundaryOptions = {}) {
  const { 
    logout, 
    clearError, 
    recoverFromError,
    isAuthenticated,
    authError 
  } = useAuth();
  
  const { 
    autoHandle = true, 
    onClearAuth, 
    onReinitAuth 
  } = options;

  /**
   * Handle error boundary clear authentication event
   */
  const handleClearAuth = useCallback(async (event: CustomEvent) => {
    const { errorId, errorType, reason } = event.detail;

    try {
      // Log the clear auth event
      authLogger.logAuthEvent('ERROR_BOUNDARY_CLEAR', true, {
        metadata: {
          errorId,
          errorType,
          reason,
          wasAuthenticated: isAuthenticated,
        },
      });

      // Clear authentication error state
      clearError();

      // Perform logout to clear all auth state
      await logout();

      // Call custom handler if provided
      if (onClearAuth) {
        onClearAuth();
      }

      console.log('Authentication cleared by error boundary', {
        errorId,
        errorType,
        reason,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to clear authentication from error boundary:', error);
      
      authLogger.logAuthEvent('ERROR_BOUNDARY_CLEAR', false, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          errorId,
          errorType,
          reason,
        },
      });
    }
  }, [isAuthenticated, clearError, logout, onClearAuth]);

  /**
   * Handle error boundary reinitialize authentication event
   */
  const handleReinitAuth = useCallback(async (event: CustomEvent) => {
    const { errorId, errorType, reason } = event.detail;

    try {
      // Log the reinit auth event
      authLogger.logAuthEvent('ERROR_BOUNDARY_REINIT', true, {
        metadata: {
          errorId,
          errorType,
          reason,
          hadAuthError: !!authError,
        },
      });

      // Clear any existing auth errors
      clearError();

      // Attempt error recovery
      await recoverFromError();

      // Call custom handler if provided
      if (onReinitAuth) {
        onReinitAuth();
      }

      console.log('Authentication reinitialized by error boundary', {
        errorId,
        errorType,
        reason,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to reinitialize authentication from error boundary:', error);
      
      authLogger.logAuthEvent('ERROR_BOUNDARY_REINIT', false, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          errorId,
          errorType,
          reason,
        },
      });

      // If reinit fails, fall back to clearing auth
      try {
        await logout();
      } catch (logoutError) {
        console.error('Fallback logout also failed:', logoutError);
      }
    }
  }, [authError, clearError, recoverFromError, logout, onReinitAuth]);

  /**
   * Set up event listeners for error boundary communication
   */
  useEffect(() => {
    if (!autoHandle) {
      return;
    }

    // Add event listeners for error boundary events
    window.addEventListener('auth-error-boundary-clear', handleClearAuth as EventListener);
    window.addEventListener('auth-error-boundary-reinit', handleReinitAuth as EventListener);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth-error-boundary-clear', handleClearAuth as EventListener);
      window.removeEventListener('auth-error-boundary-reinit', handleReinitAuth as EventListener);
    };
  }, [autoHandle, handleClearAuth, handleReinitAuth]);

  /**
   * Manually trigger authentication clear
   */
  const triggerClearAuth = useCallback((reason: string = 'manual_trigger') => {
    const event = new CustomEvent('auth-error-boundary-clear', {
      detail: {
        errorId: `manual_${Date.now()}`,
        errorType: 'MANUAL_CLEAR',
        reason,
      }
    });
    
    window.dispatchEvent(event);
  }, []);

  /**
   * Manually trigger authentication reinitialization
   */
  const triggerReinitAuth = useCallback((reason: string = 'manual_trigger') => {
    const event = new CustomEvent('auth-error-boundary-reinit', {
      detail: {
        errorId: `manual_${Date.now()}`,
        errorType: 'MANUAL_REINIT',
        reason,
      }
    });
    
    window.dispatchEvent(event);
  }, []);

  return {
    /**
     * Manually trigger authentication clear
     */
    clearAuth: triggerClearAuth,
    
    /**
     * Manually trigger authentication reinitialization
     */
    reinitAuth: triggerReinitAuth,
    
    /**
     * Current authentication error state
     */
    authError,
    
    /**
     * Whether user is currently authenticated
     */
    isAuthenticated,
  };
}

export default useAuthErrorBoundary;