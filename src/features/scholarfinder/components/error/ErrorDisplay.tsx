/**
 * User-friendly error display components with suggested actions
 * Provides comprehensive error information and recovery options
 */

import React from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScholarFinderError } from '../../services/ScholarFinderApiService';
import { 
  createUserFriendlyErrorDisplay, 
  UserFriendlyErrorDisplay,
  isRetryableError 
} from '../../utils/errorHandling';
import { useScholarFinderToasts } from '../notifications/ToastNotificationSystem';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: ScholarFinderError;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  context, 
  onRetry, 
  onDismiss, 
  showDetails = false,
  compact = false,
  className 
}: ErrorDisplayProps) {
  const toasts = useScholarFinderToasts();
  const userDisplay = createUserFriendlyErrorDisplay(error, context);

  const handleCopyError = async () => {
    const errorInfo = {
      type: error.type,
      message: error.message,
      context: context || 'Unknown',
      timestamp: new Date().toISOString(),
      details: error.details,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      toasts.showSuccess('Error details copied to clipboard');
    } catch (err) {
      toasts.showError('Failed to copy error details');
    }
  };

  const getSeverityColor = () => {
    switch (userDisplay.severity) {
      case 'low':
        return 'border-yellow-200 bg-yellow-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'critical':
        return 'border-red-300 bg-red-100';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityBadgeVariant = () => {
    switch (userDisplay.severity) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'outline';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (compact) {
    return (
      <Alert variant="destructive" className={cn("mb-4", className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{userDisplay.title}</p>
              <p className="text-sm mt-1">{userDisplay.message}</p>
            </div>
            <div className="flex gap-2">
              {userDisplay.canRetry && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn("w-full", getSeverityColor(), className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
            <div>
              <CardTitle className="text-lg">{userDisplay.title}</CardTitle>
              <CardDescription className="mt-1">
                {userDisplay.message}
              </CardDescription>
            </div>
          </div>
          <Badge variant={getSeverityBadgeVariant()} className="capitalize">
            {userDisplay.severity}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recovery Suggestions */}
        {userDisplay.suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              What you can do:
            </h4>
            <ul className="space-y-1">
              {userDisplay.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {userDisplay.canRetry && onRetry && (
            <Button onClick={onRetry} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
              {userDisplay.retryDelay && (
                <span className="ml-1 text-xs">
                  (in {Math.ceil(userDisplay.retryDelay / 1000)}s)
                </span>
              )}
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={handleCopyError}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Error Details
          </Button>

          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://docs.scholarfinder.com/troubleshooting" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Help
            </a>
          </Button>

          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>

        {/* Technical Details (Collapsible) */}
        {showDetails && (
          <>
            <Separator />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Show Technical Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted p-3 rounded-md">
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <span className="font-semibold">Error Type:</span> {error.type}
                    </div>
                    <div>
                      <span className="font-semibold">Message:</span> {error.message}
                    </div>
                    {context && (
                      <div>
                        <span className="font-semibold">Context:</span> {context}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Retryable:</span> {error.retryable ? 'Yes' : 'No'}
                    </div>
                    {error.retryAfter && (
                      <div>
                        <span className="font-semibold">Retry After:</span> {error.retryAfter}ms
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Timestamp:</span> {new Date().toISOString()}
                    </div>
                    {error.details && (
                      <div>
                        <span className="font-semibold">Details:</span>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Error summary component for multiple errors
 */
interface ErrorSummaryProps {
  errors: ScholarFinderError[];
  onRetryAll?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function ErrorSummary({ errors, onRetryAll, onClearAll, className }: ErrorSummaryProps) {
  const retryableErrors = errors.filter(isRetryableError);
  const criticalErrors = errors.filter(error => 
    createUserFriendlyErrorDisplay(error).severity === 'critical'
  );

  if (errors.length === 0) {
    return null;
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Error Summary ({errors.length} {errors.length === 1 ? 'error' : 'errors'})
        </CardTitle>
        <CardDescription>
          {criticalErrors.length > 0 && (
            <span className="text-red-600 font-medium">
              {criticalErrors.length} critical error{criticalErrors.length !== 1 ? 's' : ''} require attention
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {errors.map((error, index) => {
          const display = createUserFriendlyErrorDisplay(error);
          return (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-md">
              <Badge variant={display.severity === 'critical' ? 'destructive' : 'secondary'}>
                {display.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{display.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{display.message}</p>
              </div>
              {display.canRetry && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
          );
        })}

        <div className="flex gap-2 pt-2">
          {retryableErrors.length > 0 && onRetryAll && (
            <Button onClick={onRetryAll} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry All ({retryableErrors.length})
            </Button>
          )}
          
          {onClearAll && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Clear All Errors
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline error message component
 */
interface InlineErrorProps {
  error: ScholarFinderError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function InlineError({ error, onRetry, onDismiss, className }: InlineErrorProps) {
  const display = createUserFriendlyErrorDisplay(error);

  return (
    <div className={cn("flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md", className)}>
      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">{display.title}</p>
        <p className="text-xs text-red-600">{display.message}</p>
      </div>
      <div className="flex gap-1">
        {display.canRetry && onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            ×
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Error page component for full-page errors
 */
interface ErrorPageProps {
  error: ScholarFinderError;
  onRetry?: () => void;
  onGoHome?: () => void;
  context?: string;
}

export function ErrorPage({ error, onRetry, onGoHome, context }: ErrorPageProps) {
  const display = createUserFriendlyErrorDisplay(error, context);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <ErrorDisplay
          error={error}
          context={context}
          onRetry={onRetry}
          showDetails={true}
          className="shadow-lg"
        />
        
        {onGoHome && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onGoHome}>
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}