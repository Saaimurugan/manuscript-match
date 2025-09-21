/**
 * Authentication Error Boundary
 * Specialized error boundary for authentication-related components and errors
 * Provides automatic recovery mechanisms and fallback UI for auth failures
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Shield, RefreshCw, LogOut, AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { authLogger } from '@/utils/authLogger';
import type { AuthError } from '@/contexts/AuthContext';

interface Props {
  children: ReactNode;
  onAuthError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRecovery?: () => void;
  fallbackComponent?: ReactNode;
  enableAutoRecovery?: boolean;
  maxRecoveryAttempts?: number;
}

interface AuthErrorContext {
  component: string;
  timestamp: string;
  userAgent: string;
  route: string;
  sessionId: string;
  userId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  authErrorType: AuthError['type'] | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  isRecovering: boolean;
  lastRecoveryAttempt: Date | null;
  errorContext: AuthErrorContext | null;
  showFallback: boolean;
}

export class AuthErrorBoundary extends Component<Props, State> {
  private recoveryTimeout: NodeJS.Timeout | null = null;
  private autoRecoveryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      authErrorType: null,
      recoveryAttempts: 0,
      maxRecoveryAttempts: props.maxRecoveryAttempts || 3,
      isRecovering: false,
      lastRecoveryAttempt: null,
      errorContext: null,
      showFallback: true,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const authErrorType = AuthErrorBoundary.categorizeAuthError(error);
    const errorId = `auth_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return {
      hasError: true,
      error,
      errorId,
      authErrorType,
      showFallback: true,
    };
  }

  /**
   * Categorize error as authentication-related error type
   */
  private static categorizeAuthError(error: Error): AuthError['type'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Token validation errors
    if (message.includes('invalid token') || message.includes('malformed token') ||
        message.includes('token format') || stack.includes('jwtvalidator')) {
      return 'TOKEN_INVALID';
    }

    // Token expiration errors
    if (message.includes('expired') || message.includes('exp claim')) {
      return 'TOKEN_EXPIRED';
    }

    // Token decoding errors
    if (message.includes('decode') || message.includes('atob') ||
        message.includes('base64') || message.includes('invalidcharactererror')) {
      return 'DECODE_ERROR';
    }

    // Token refresh errors
    if (message.includes('refresh') || message.includes('401') ||
        message.includes('unauthorized')) {
      return 'REFRESH_FAILED';
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') ||
        message.includes('connection') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }

    // Malformed token errors
    if (message.includes('malformed') || message.includes('invalid character')) {
      return 'MALFORMED_TOKEN';
    }

    // Default to validation error
    return 'VALIDATION_ERROR';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorContext = this.collectAuthErrorContext(error, errorInfo);

    // Log authentication error with comprehensive context
    authLogger.logAuthError(
      this.state.authErrorType || 'VALIDATION_ERROR',
      error.message,
      {
        recoveryAction: this.determineRecoveryAction(),
        retryCount: this.state.recoveryAttempts,
        maxRetries: this.state.maxRecoveryAttempts,
        shouldRetry: this.shouldAttemptRecovery(),
        stackTrace: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'AuthErrorBoundary',
      },
      {
        userId: errorContext.userId,
      }
    );

    this.setState({
      error,
      errorInfo,
      errorContext,
    });

    // Call custom error handler if provided
    if (this.props.onAuthError) {
      this.props.onAuthError(error, errorInfo);
    }

    // Attempt automatic recovery if enabled
    if (this.props.enableAutoRecovery && this.shouldAttemptRecovery()) {
      this.scheduleAutoRecovery();
    }
  }

  /**
   * Collect authentication-specific error context
   */
  private collectAuthErrorContext(error: Error, errorInfo: ErrorInfo): AuthErrorContext {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('auth-error-session-id');
    if (!sessionId) {
      sessionId = `auth_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('auth-error-session-id', sessionId);
    }

    return {
      component: this.extractComponentName(errorInfo.componentStack),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      route: window.location.pathname + window.location.search,
      sessionId,
      userId: this.getUserId(),
    };
  }

  /**
   * Extract component name from component stack
   */
  private extractComponentName(componentStack: string): string {
    const match = componentStack.match(/^\s*in (\w+)/);
    return match ? match[1] : 'AuthComponent';
  }

  /**
   * Get user ID from various sources
   */
  private getUserId(): string | undefined {
    try {
      // Try to get from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.userId;
      }

      // Try to get from token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.sub || payload.userId || payload.id;
        } catch {
          // Ignore token parsing errors
        }
      }
    } catch {
      // Ignore all parsing errors
    }
    return undefined;
  }

  /**
   * Determine appropriate recovery action based on error type
   */
  private determineRecoveryAction(): AuthError['recoveryAction'] {
    switch (this.state.authErrorType) {
      case 'TOKEN_EXPIRED':
        return 'REFRESH';
      case 'TOKEN_INVALID':
      case 'MALFORMED_TOKEN':
      case 'DECODE_ERROR':
        return 'CLEAR_TOKEN';
      case 'REFRESH_FAILED':
        return 'LOGOUT';
      case 'NETWORK_ERROR':
        return 'NONE';
      default:
        return 'CLEAR_TOKEN';
    }
  }

  /**
   * Check if automatic recovery should be attempted
   */
  private shouldAttemptRecovery(): boolean {
    // Don't recover if already recovering
    if (this.state.isRecovering) {
      return false;
    }

    // Don't recover if max attempts exceeded
    if (this.state.recoveryAttempts >= this.state.maxRecoveryAttempts) {
      return false;
    }

    // Don't recover if recent recovery attempt failed
    if (this.state.lastRecoveryAttempt) {
      const timeSinceLastRecovery = Date.now() - this.state.lastRecoveryAttempt.getTime();
      if (timeSinceLastRecovery < 30000) { // 30 seconds cooldown
        return false;
      }
    }

    // Only recover for certain error types
    return this.state.authErrorType === 'TOKEN_EXPIRED' ||
           this.state.authErrorType === 'NETWORK_ERROR' ||
           this.state.authErrorType === 'REFRESH_FAILED';
  }

  /**
   * Schedule automatic recovery attempt
   */
  private scheduleAutoRecovery(): void {
    // Clear any existing timeout
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }

    // Schedule recovery with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.state.recoveryAttempts), 30000);

    this.autoRecoveryTimeout = setTimeout(() => {
      this.attemptRecovery();
    }, delay);
  }

  /**
   * Attempt automatic recovery
   */
  private attemptRecovery = async (): Promise<void> => {
    if (!this.shouldAttemptRecovery()) {
      return;
    }

    this.setState({
      isRecovering: true,
      lastRecoveryAttempt: new Date(),
      recoveryAttempts: this.state.recoveryAttempts + 1,
    });

    try {
      const recoveryAction = this.determineRecoveryAction();

      // Log recovery attempt
      authLogger.logAuthEvent('ERROR_RECOVERY', true, {
        metadata: {
          errorType: this.state.authErrorType,
          recoveryAction,
          attemptNumber: this.state.recoveryAttempts + 1,
          maxAttempts: this.state.maxRecoveryAttempts,
        },
      }, {
        userId: this.state.errorContext?.userId,
      });

      switch (recoveryAction) {
        case 'REFRESH':
          await this.attemptTokenRefresh();
          break;
        case 'CLEAR_TOKEN':
          await this.clearInvalidTokens();
          break;
        case 'LOGOUT':
          await this.performLogout();
          break;
        case 'NONE':
        default:
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
      }

      // If recovery succeeded, reset error state
      this.resetErrorState();

      // Call recovery callback if provided
      if (this.props.onRecovery) {
        this.props.onRecovery();
      }

    } catch (recoveryError) {
      console.error('Authentication recovery failed:', recoveryError);

      // Log recovery failure
      authLogger.logAuthError(
        'VALIDATION_ERROR',
        `Recovery attempt failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        {
          recoveryAction: 'NONE',
          retryCount: this.state.recoveryAttempts,
          maxRetries: this.state.maxRecoveryAttempts,
          shouldRetry: false,
          stackTrace: recoveryError instanceof Error ? recoveryError.stack : undefined,
        },
        {
          userId: this.state.errorContext?.userId,
        }
      );

      // If max attempts reached, show fallback
      if (this.state.recoveryAttempts >= this.state.maxRecoveryAttempts) {
        this.setState({ showFallback: true });
      }
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  /**
   * Attempt to refresh authentication token
   */
  private async attemptTokenRefresh(): Promise<void> {
    // Try to get AuthContext and refresh token
    const authContextEvent = new CustomEvent('auth-refresh-request');
    window.dispatchEvent(authContextEvent);

    // Wait for refresh to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if token is now valid
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Token refresh failed - no token found');
    }
  }

  /**
   * Clear invalid tokens from storage
   */
  private async clearInvalidTokens(): Promise<void> {
    // Clear tokens from all storage locations
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refreshToken');

    // Clear user data
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');

    // Dispatch token cleared event
    const tokenClearedEvent = new CustomEvent('auth-tokens-cleared');
    window.dispatchEvent(tokenClearedEvent);
  }

  /**
   * Perform logout
   */
  private async performLogout(): Promise<void> {
    // Clear all authentication data
    await this.clearInvalidTokens();

    // Dispatch logout event
    const logoutEvent = new CustomEvent('auth-logout-request');
    window.dispatchEvent(logoutEvent);

    // Redirect to login or home
    window.location.href = '/';
  }

  /**
   * Reset error boundary state
   */
  private resetErrorState(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      authErrorType: null,
      showFallback: false,
    });
  }

  /**
   * Handle manual retry
   */
  private handleRetry = (): void => {
    this.attemptRecovery();
  };

  /**
   * Handle manual logout
   */
  private handleLogout = (): void => {
    this.performLogout();
  };

  /**
   * Handle go home
   */
  private handleGoHome = (): void => {
    // Clear error state and navigate home
    this.resetErrorState();
    window.location.href = '/';
  };

  /**
   * Get error severity based on error type
   */
  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    switch (this.state.authErrorType) {
      case 'TOKEN_EXPIRED':
        return 'medium';
      case 'TOKEN_INVALID':
      case 'MALFORMED_TOKEN':
      case 'DECODE_ERROR':
        return 'high';
      case 'REFRESH_FAILED':
        return 'critical';
      case 'NETWORK_ERROR':
        return 'medium';
      default:
        return 'medium';
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(): string {
    switch (this.state.authErrorType) {
      case 'TOKEN_EXPIRED':
        return 'Your session has expired. Please log in again.';
      case 'TOKEN_INVALID':
      case 'MALFORMED_TOKEN':
      case 'DECODE_ERROR':
        return 'There was a problem with your authentication. Please log in again.';
      case 'REFRESH_FAILED':
        return 'Unable to refresh your session. Please log in again.';
      case 'NETWORK_ERROR':
        return 'Connection problem. Please check your internet connection and try again.';
      default:
        return 'An authentication error occurred. Please try again.';
    }
  }

  /**
   * Cleanup on unmount
   */
  componentWillUnmount(): void {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Show custom fallback if provided
    if (this.props.fallbackComponent) {
      return this.props.fallbackComponent;
    }

    // Show default authentication error fallback
    const severity = this.getErrorSeverity();
    const message = this.getUserFriendlyMessage();

    return (
      <div className="flex items-center justify-center p-4 min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <Badge 
              variant={severity === 'critical' ? 'destructive' : severity === 'high' ? 'destructive' : 'secondary'}
              className="mb-2"
            >
              {severity.toUpperCase()} - AUTHENTICATION ERROR
            </Badge>
            <CardTitle className="text-xl text-red-600">
              Authentication Problem
            </CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {this.state.isRecovering && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Attempting to recover... (Attempt {this.state.recoveryAttempts + 1} of {this.state.maxRecoveryAttempts})
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              {!this.state.isRecovering && this.shouldAttemptRecovery() && (
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              <Button onClick={this.handleLogout} variant="outline" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
              
              <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {this.state.errorId && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Error ID: <code className="bg-gray-100 px-1 rounded">{this.state.errorId}</code>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * Higher-order component to wrap components with AuthErrorBoundary
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