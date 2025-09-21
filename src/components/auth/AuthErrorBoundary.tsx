/**
 * Authentication Error Boundary Component
 * Specialized error boundary for handling authentication-related errors
 * Provides fallback UI and automatic recovery mechanisms for auth failures
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogIn, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authLogger } from '@/utils/authLogger';

interface Props {
  children: ReactNode;
  onAuthError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackComponent?: ReactNode;
  enableAutoRecovery?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  errorType: 'TOKEN_VALIDATION' | 'TOKEN_DECODE' | 'AUTH_NETWORK' | 'AUTH_UNKNOWN';
  retryCount: number;
  isRecovering: boolean;
  lastRecoveryAttempt: Date | null;
  recoveryMessage: string | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  private recoveryTimeout: NodeJS.Timeout | null = null;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(props: Props) {
    super(props);

    this.maxRetries = props.maxRetryAttempts ?? 2;
    this.retryDelay = props.retryDelay ?? 3000;

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorType: 'AUTH_UNKNOWN',
      retryCount: 0,
      isRecovering: false,
      lastRecoveryAttempt: null,
      recoveryMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = AuthErrorBoundary.categorizeAuthError(error);
    const errorId = `auth_error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
      errorType,
      isRecovering: false,
      recoveryMessage: null,
    };
  }

  /**
   * Categorize authentication-related errors
   */
  private static categorizeAuthError(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Token validation errors
    if (message.includes('token') && (message.includes('invalid') || message.includes('malformed'))) {
      return 'TOKEN_VALIDATION';
    }

    // Token decoding errors (base64, JWT parsing)
    if (message.includes('invalidcharactererror') || 
        message.includes('decode') || 
        message.includes('atob') ||
        message.includes('base64')) {
      return 'TOKEN_DECODE';
    }

    // Network-related authentication errors
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('401') || 
        message.includes('403') ||
        message.includes('unauthorized')) {
      return 'AUTH_NETWORK';
    }

    return 'AUTH_UNKNOWN';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the authentication error with comprehensive context
    authLogger.logAuthError(
      this.getAuthErrorType(this.state.errorType),
      error.message,
      {
        recoveryAction: 'ERROR_BOUNDARY_CATCH',
        retryCount: this.state.retryCount,
        maxRetries: this.maxRetries,
        shouldRetry: this.shouldAttemptRecovery(),
        errorBoundaryId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        stackTrace: error.stack,
      },
      {
        component: 'AuthErrorBoundary',
        errorType: this.state.errorType,
      }
    );

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onAuthError) {
      this.props.onAuthError(error, errorInfo);
    }

    // Attempt automatic recovery if enabled and appropriate
    if (this.props.enableAutoRecovery && this.shouldAttemptRecovery()) {
      this.scheduleAutoRecovery();
    }
  }

  /**
   * Convert error type to auth logger format
   */
  private getAuthErrorType(errorType: State['errorType']): Parameters<typeof authLogger.logAuthError>[0] {
    switch (errorType) {
      case 'TOKEN_VALIDATION':
        return 'TOKEN_INVALID';
      case 'TOKEN_DECODE':
        return 'DECODE_ERROR';
      case 'AUTH_NETWORK':
        return 'NETWORK_ERROR';
      default:
        return 'VALIDATION_ERROR';
    }
  }

  /**
   * Determine if automatic recovery should be attempted
   */
  private shouldAttemptRecovery(): boolean {
    return (
      this.state.retryCount < this.maxRetries &&
      !this.state.isRecovering &&
      (this.state.errorType === 'TOKEN_VALIDATION' || this.state.errorType === 'AUTH_NETWORK')
    );
  }

  /**
   * Schedule automatic recovery attempt
   */
  private scheduleAutoRecovery = () => {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }

    this.setState({
      isRecovering: true,
      recoveryMessage: `Attempting automatic recovery in ${this.retryDelay / 1000} seconds...`,
    });

    this.recoveryTimeout = setTimeout(() => {
      this.attemptRecovery();
    }, this.retryDelay);
  };

  /**
   * Attempt to recover from the authentication error
   */
  private attemptRecovery = async () => {
    const newRetryCount = this.state.retryCount + 1;

    this.setState({
      retryCount: newRetryCount,
      lastRecoveryAttempt: new Date(),
      recoveryMessage: 'Attempting recovery...',
    });

    try {
      // Log recovery attempt
      authLogger.logAuthEvent('ERROR_RECOVERY', true, {
        metadata: {
          errorType: this.state.errorType,
          retryCount: newRetryCount,
          maxRetries: this.maxRetries,
          errorBoundaryId: this.state.errorId,
          recoveryMethod: 'auto_recovery',
        },
      });

      // Perform recovery based on error type
      await this.performRecoveryAction();

      // If we get here, recovery was successful
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        errorType: 'AUTH_UNKNOWN',
        isRecovering: false,
        recoveryMessage: 'Recovery successful!',
      });

      // Clear recovery message after a short delay
      setTimeout(() => {
        this.setState({ recoveryMessage: null });
      }, 2000);

    } catch (recoveryError) {
      console.error('Authentication recovery failed:', recoveryError);

      // Log recovery failure
      authLogger.logAuthEvent('ERROR_RECOVERY', false, {
        errorMessage: recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error',
        metadata: {
          errorType: this.state.errorType,
          retryCount: newRetryCount,
          maxRetries: this.maxRetries,
          errorBoundaryId: this.state.errorId,
          recoveryMethod: 'auto_recovery',
        },
      });

      this.setState({
        isRecovering: false,
        recoveryMessage: newRetryCount >= this.maxRetries 
          ? 'Automatic recovery failed. Please try manual recovery.'
          : 'Recovery failed. Will retry automatically.',
      });

      // Schedule another attempt if we haven't exceeded max retries
      if (newRetryCount < this.maxRetries) {
        this.scheduleAutoRecovery();
      }
    }
  };

  /**
   * Perform recovery action based on error type
   */
  private performRecoveryAction = async (): Promise<void> => {
    switch (this.state.errorType) {
      case 'TOKEN_VALIDATION':
      case 'TOKEN_DECODE':
        // Clear invalid tokens and reset authentication state
        await this.clearAuthenticationState();
        break;

      case 'AUTH_NETWORK':
        // Wait a moment and try to re-initialize authentication
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.reinitializeAuthentication();
        break;

      default:
        // For unknown errors, try a general reset
        await this.clearAuthenticationState();
        break;
    }
  };

  /**
   * Clear authentication state and tokens
   */
  private clearAuthenticationState = async (): Promise<void> => {
    try {
      // Clear localStorage tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Clear sessionStorage auth data
      sessionStorage.removeItem('authState');
      sessionStorage.removeItem('tokenState');

      // Dispatch custom event to notify auth context
      window.dispatchEvent(new CustomEvent('auth-error-boundary-clear', {
        detail: {
          errorId: this.state.errorId,
          errorType: this.state.errorType,
          reason: 'error_boundary_recovery',
        }
      }));

    } catch (error) {
      console.warn('Failed to clear authentication state:', error);
      throw new Error('Failed to clear authentication state');
    }
  };

  /**
   * Attempt to reinitialize authentication
   */
  private reinitializeAuthentication = async (): Promise<void> => {
    try {
      // Dispatch custom event to trigger auth reinitialization
      window.dispatchEvent(new CustomEvent('auth-error-boundary-reinit', {
        detail: {
          errorId: this.state.errorId,
          errorType: this.state.errorType,
          reason: 'error_boundary_recovery',
        }
      }));

      // Wait for reinitialization to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.warn('Failed to reinitialize authentication:', error);
      throw new Error('Failed to reinitialize authentication');
    }
  };

  /**
   * Handle manual retry attempt
   */
  private handleManualRetry = () => {
    if (this.state.isRecovering) {
      return;
    }

    // Reset error state and attempt recovery
    this.setState({
      retryCount: 0,
      isRecovering: false,
      recoveryMessage: null,
    });

    this.attemptRecovery();
  };

  /**
   * Handle redirect to login
   */
  private handleGoToLogin = () => {
    // Log navigation to login
    authLogger.logAuthEvent('NAVIGATION', true, {
      metadata: {
        destination: 'login',
        reason: 'auth_error_boundary',
        errorType: this.state.errorType,
        errorId: this.state.errorId,
      },
    });

    // Clear authentication state first
    this.clearAuthenticationState().catch(console.warn);

    // Navigate to login (multiple strategies)
    try {
      // Try React Router navigation
      if ((window as any).navigate) {
        (window as any).navigate('/login');
        return;
      }

      // Try history API
      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      // Fallback to location change
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to navigate to login:', error);
      // Force page reload to login as last resort
      window.location.href = '/login';
    }
  };

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(): string {
    switch (this.state.errorType) {
      case 'TOKEN_VALIDATION':
        return 'Your session has become invalid. Please log in again.';
      case 'TOKEN_DECODE':
        return 'There was a problem with your authentication data. Please log in again.';
      case 'AUTH_NETWORK':
        return 'Unable to verify your authentication. Please check your connection and try again.';
      default:
        return 'An authentication error occurred. Please try logging in again.';
    }
  }

  /**
   * Get recovery suggestion based on error type
   */
  private getRecoverySuggestion(): string {
    switch (this.state.errorType) {
      case 'TOKEN_VALIDATION':
      case 'TOKEN_DECODE':
        return 'Your session data appears to be corrupted. Logging in again should resolve this issue.';
      case 'AUTH_NETWORK':
        return 'This might be a temporary network issue. You can try again or check your internet connection.';
      default:
        return 'Try refreshing the page or logging in again. If the problem persists, please contact support.';
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Use custom fallback component if provided
    if (this.props.fallbackComponent) {
      return this.props.fallbackComponent;
    }

    const canRetry = this.state.retryCount < this.maxRetries;
    const isAutoRecoveryEnabled = this.props.enableAutoRecovery;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-gray-600">
              {this.getErrorMessage()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Recovery Status */}
            {this.state.recoveryMessage && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {this.state.recoveryMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Details */}
            <div className="text-sm text-gray-600">
              <p>{this.getRecoverySuggestion()}</p>
            </div>

            {/* Recovery Actions */}
            <div className="space-y-3">
              {/* Manual Retry Button */}
              {canRetry && !this.state.isRecovering && (
                <Button
                  onClick={this.handleManualRetry}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
              )}

              {/* Go to Login Button */}
              <Button
                onClick={this.handleGoToLogin}
                className="w-full"
                disabled={this.state.isRecovering}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Go to Login
              </Button>
            </div>

            {/* Auto Recovery Status */}
            {isAutoRecoveryEnabled && (
              <div className="text-xs text-gray-500 text-center">
                {this.state.isRecovering ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Automatic recovery in progress...
                  </span>
                ) : canRetry ? (
                  'Automatic recovery is enabled'
                ) : (
                  'Maximum recovery attempts reached'
                )}
              </div>
            )}

            {/* Error ID for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400 text-center font-mono">
                Error ID: {this.state.errorId}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * Higher-order component to wrap components with authentication error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  );

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default AuthErrorBoundary;