/**
 * AuthProvider with integrated AuthErrorBoundary
 * Provides authentication context with automatic error boundary protection
 */

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthErrorBoundary } from '@/components/error/AuthErrorBoundary';
import { authLogger } from '@/utils/authLogger';

interface AuthProviderWithErrorBoundaryProps {
  children: ReactNode;
  enableAutoRecovery?: boolean;
  maxRecoveryAttempts?: number;
  fallbackComponent?: ReactNode;
}

/**
 * Enhanced AuthProvider with integrated error boundary protection
 */
export const AuthProviderWithErrorBoundary: React.FC<AuthProviderWithErrorBoundaryProps> = ({
  children,
  enableAutoRecovery = true,
  maxRecoveryAttempts = 3,
  fallbackComponent,
}) => {
  /**
   * Handle authentication errors caught by the error boundary
   */
  const handleAuthError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Authentication error caught by boundary:', error);
    
    // Log the error with additional context
    authLogger.logAuthError(
      'VALIDATION_ERROR',
      `Error boundary caught authentication error: ${error.message}`,
      {
        recoveryAction: 'CLEAR_TOKEN',
        retryCount: 0,
        maxRetries: maxRecoveryAttempts,
        shouldRetry: true,
        stackTrace: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'AuthProviderWithErrorBoundary',
      }
    );
  };

  /**
   * Handle successful error recovery
   */
  const handleRecovery = () => {
    console.log('Authentication error recovery successful');
    
    // Log successful recovery
    authLogger.logAuthEvent('ERROR_RECOVERY', true, {
      metadata: {
        recoveryType: 'automatic',
        boundaryType: 'AuthProviderWithErrorBoundary',
      },
    });
  };

  return (
    <AuthErrorBoundary
      onAuthError={handleAuthError}
      onRecovery={handleRecovery}
      enableAutoRecovery={enableAutoRecovery}
      maxRecoveryAttempts={maxRecoveryAttempts}
      fallbackComponent={fallbackComponent}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </AuthErrorBoundary>
  );
};

export default AuthProviderWithErrorBoundary;