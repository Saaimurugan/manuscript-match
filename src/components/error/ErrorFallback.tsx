/**
 * Error Fallback components for different error scenarios
 * Provides user-friendly error displays with recovery options
 */

import React from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  Server, 
  Shield, 
  Clock, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  Bug 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RetryButton } from './RetryButton';
import { useErrorRecovery } from '@/hooks/useErrorHandling';
import type { EnhancedError } from '@/lib/errorHandler';

interface BaseErrorFallbackProps {
  error?: EnhancedError | Error | any;
  onRetry?: () => void | Promise<void>;
  onReset?: () => void;
  className?: string;
  showErrorId?: boolean;
  showRetryButton?: boolean;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

/**
 * Generic error fallback component
 */
export const ErrorFallback: React.FC<BaseErrorFallbackProps> = ({
  error,
  onRetry,
  onReset,
  className,
  showErrorId = true,
  showRetryButton = true,
  showHomeButton = true,
  showBackButton = false,
}) => {
  const { handleGoHome, handleGoBack } = useErrorRecovery();
  
  const enhancedError = error as EnhancedError;
  const isEnhancedError = enhancedError && 'errorId' in enhancedError;
  
  const getErrorIcon = () => {
    if (!isEnhancedError) return <AlertTriangle className="w-8 h-8 text-red-600" />;
    
    switch (enhancedError.type) {
      case 'NETWORK_ERROR':
        return <Wifi className="w-8 h-8 text-red-600" />;
      case 'SERVER_ERROR':
        return <Server className="w-8 h-8 text-red-600" />;
      case 'AUTHENTICATION_ERROR':
        return <Shield className="w-8 h-8 text-red-600" />;
      case 'RATE_LIMIT_ERROR':
        return <Clock className="w-8 h-8 text-orange-600" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
  };
  
  const getErrorTitle = () => {
    if (!isEnhancedError) return 'Something went wrong';
    
    switch (enhancedError.type) {
      case 'NETWORK_ERROR':
        return 'Connection Problem';
      case 'SERVER_ERROR':
        return 'Server Error';
      case 'AUTHENTICATION_ERROR':
        return 'Authentication Required';
      case 'RATE_LIMIT_ERROR':
        return 'Too Many Requests';
      case 'VALIDATION_ERROR':
        return 'Invalid Data';
      default:
        return 'Something went wrong';
    }
  };
  
  const getSeverityBadge = () => {
    if (!isEnhancedError) return null;
    
    const variant = enhancedError.severity === 'critical' ? 'destructive' :
                   enhancedError.severity === 'high' ? 'destructive' :
                   enhancedError.severity === 'medium' ? 'secondary' : 'outline';
    
    return (
      <Badge variant={variant} className="mb-2">
        {enhancedError.severity.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            {getErrorIcon()}
          </div>
          {getSeverityBadge()}
          <CardTitle className="text-xl text-red-600">
            {getErrorTitle()}
          </CardTitle>
          <CardDescription>
            {isEnhancedError ? enhancedError.message : (error?.message || 'An unexpected error occurred')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            {showRetryButton && onRetry && (
              <RetryButton
                onRetry={onRetry}
                error={error}
                className="w-full"
              />
            )}
            
            {onReset && (
              <Button onClick={onReset} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            
            {showBackButton && (
              <Button onClick={handleGoBack} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
            
            {showHomeButton && (
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>

          {showErrorId && isEnhancedError && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                Error ID: <code className="bg-gray-100 px-1 rounded">{enhancedError.errorId}</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Network error fallback
 */
export const NetworkErrorFallback: React.FC<BaseErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    showRetryButton={true}
    showHomeButton={false}
    showBackButton={false}
  />
);

/**
 * Server error fallback
 */
export const ServerErrorFallback: React.FC<BaseErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    showRetryButton={true}
    showHomeButton={true}
    showBackButton={false}
  />
);

/**
 * Authentication error fallback
 */
export const AuthErrorFallback: React.FC<BaseErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    showRetryButton={false}
    showHomeButton={true}
    showBackButton={false}
  />
);

/**
 * Validation error fallback
 */
export const ValidationErrorFallback: React.FC<BaseErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    showRetryButton={false}
    showHomeButton={false}
    showBackButton={true}
  />
);

/**
 * Inline error display for smaller components
 */
interface InlineErrorProps {
  error: EnhancedError | Error | any;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  className?: string;
  variant?: 'default' | 'destructive';
}

export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  onRetry,
  onDismiss,
  className,
  variant = 'destructive',
}) => {
  const enhancedError = error as EnhancedError;
  const isEnhancedError = enhancedError && 'errorId' in enhancedError;
  
  return (
    <Alert variant={variant} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isEnhancedError ? enhancedError.message : (error?.message || 'An error occurred')}
        </span>
        <div className="flex gap-2 ml-4">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-6 px-2 text-xs"
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-6 px-2 text-xs"
            >
              ×
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Loading error fallback for suspense boundaries
 */
interface LoadingErrorFallbackProps {
  error: Error;
  retry: () => void;
}

export const LoadingErrorFallback: React.FC<LoadingErrorFallbackProps> = ({
  error,
  retry,
}) => (
  <div className="flex items-center justify-center p-8">
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle className="text-lg">Failed to Load</CardTitle>
        <CardDescription>
          {error.message || 'Something went wrong while loading this content.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={retry} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default ErrorFallback;