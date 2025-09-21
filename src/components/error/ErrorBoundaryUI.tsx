/**
 * Customizable UI Components for Error Boundary
 * Provides different themes and layouts for error display
 */

import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ErrorBoundaryConfig } from '@/config/errorBoundary.config';

export interface ErrorUIProps {
  error: Error;
  errorId: string;
  config: ErrorBoundaryConfig;
  onRetry?: () => void;
  onGoHome?: () => void;
  onReport?: () => void;
  onRefresh?: () => void;
  reportStatus?: 'idle' | 'sending' | 'sent' | 'failed';
  retryCount?: number;
  errorCategory?: string;
  errorSeverity?: string;
  componentStack?: string;
}

// Minimal theme - simple and clean
export const MinimalErrorUI: React.FC<ErrorUIProps> = ({
  error,
  config,
  onRetry,
  onGoHome,
  onReport,
  reportStatus = 'idle'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <CardTitle className="text-lg">{config.messages.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 text-center">
            {config.messages.description}
          </p>
          <div className="flex flex-col gap-2">
            {config.enableRetryButton && onRetry && (
              <Button onClick={onRetry} size="sm" className="w-full">
                {config.messages.retryButton}
              </Button>
            )}
            {config.enableHomeButton && onGoHome && (
              <Button onClick={onGoHome} variant="outline" size="sm" className="w-full">
                {config.messages.homeButton}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Default theme - balanced functionality and design
export const DefaultErrorUI: React.FC<ErrorUIProps> = ({
  error,
  errorId,
  config,
  onRetry,
  onGoHome,
  onReport,
  onRefresh,
  reportStatus = 'idle',
  retryCount = 0,
  errorCategory,
  errorSeverity
}) => {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">{config.messages.title}</CardTitle>
          <CardDescription>{config.messages.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.showErrorDetails && (
            <Alert className={getSeverityColor(errorSeverity)}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Error ID: {errorId}</div>
                  {errorCategory && (
                    <div className="text-sm">Category: {errorCategory}</div>
                  )}
                  {errorSeverity && (
                    <div className="text-sm">Severity: {errorSeverity}</div>
                  )}
                  {retryCount > 0 && (
                    <div className="text-sm">Retry attempts: {retryCount}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {config.enableRetryButton && onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                {config.messages.retryButton}
              </Button>
            )}
            {config.enableHomeButton && onGoHome && (
              <Button onClick={onGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                {config.messages.homeButton}
              </Button>
            )}
            {config.enableReportButton && onReport && (
              <Button 
                onClick={onReport} 
                variant="secondary" 
                className="w-full"
                disabled={reportStatus === 'sending'}
              >
                {reportStatus === 'sending' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : reportStatus === 'sent' ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : reportStatus === 'failed' ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Bug className="w-4 h-4 mr-2" />
                )}
                {reportStatus === 'sent' ? 'Report Sent' : 
                 reportStatus === 'failed' ? 'Report Failed' :
                 config.messages.reportButton}
              </Button>
            )}
            {config.enableRefreshButton && onRefresh && (
              <Button onClick={onRefresh} variant="ghost" className="w-full">
                {config.messages.refreshButton}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Detailed theme - comprehensive error information and debugging
export const DetailedErrorUI: React.FC<ErrorUIProps> = ({
  error,
  errorId,
  config,
  onRetry,
  onGoHome,
  onReport,
  onRefresh,
  reportStatus = 'idle',
  retryCount = 0,
  errorCategory,
  errorSeverity,
  componentStack
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{config.messages.title}</CardTitle>
              <CardDescription>{config.messages.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Summary */}
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Error ID:</span> {errorId}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {errorCategory || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Severity:</span> {errorSeverity || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Retry Count:</span> {retryCount}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Error Details Collapsible */}
          {config.showErrorDetails && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {showDetails ? 'Hide' : 'Show'} Error Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                {/* Error Message */}
                <div>
                  <h4 className="font-medium mb-2">Error Message:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {error.message}
                  </pre>
                </div>

                {/* Stack Trace */}
                {config.showStackTrace && error.stack && (
                  <div>
                    <h4 className="font-medium mb-2">Stack Trace:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {/* Component Stack */}
                {config.showComponentStack && componentStack && (
                  <div>
                    <h4 className="font-medium mb-2">Component Stack:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-32">
                      {componentStack}
                    </pre>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {config.enableRetryButton && onRetry && (
              <Button onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {config.messages.retryButton}
              </Button>
            )}
            {config.enableHomeButton && onGoHome && (
              <Button onClick={onGoHome} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                {config.messages.homeButton}
              </Button>
            )}
            {config.enableReportButton && onReport && (
              <Button 
                onClick={onReport} 
                variant="secondary"
                disabled={reportStatus === 'sending'}
              >
                {reportStatus === 'sending' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : reportStatus === 'sent' ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : reportStatus === 'failed' ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Bug className="w-4 h-4 mr-2" />
                )}
                {reportStatus === 'sent' ? 'Report Sent' : 
                 reportStatus === 'failed' ? 'Report Failed' :
                 config.messages.reportButton}
              </Button>
            )}
            {config.enableRefreshButton && onRefresh && (
              <Button onClick={onRefresh} variant="ghost">
                {config.messages.refreshButton}
              </Button>
            )}
          </div>

          {/* Report Status */}
          {reportStatus !== 'idle' && (
            <Alert className={
              reportStatus === 'sent' ? 'border-green-200 bg-green-50' :
              reportStatus === 'failed' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }>
              <AlertDescription>
                {reportStatus === 'sending' && 'Sending error report...'}
                {reportStatus === 'sent' && 'Error report sent successfully!'}
                {reportStatus === 'failed' && 'Failed to send error report. Please try again.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// UI Theme selector function
export const getErrorUI = (theme: string) => {
  switch (theme) {
    case 'minimal':
      return MinimalErrorUI;
    case 'detailed':
      return DetailedErrorUI;
    case 'default':
    default:
      return DefaultErrorUI;
  }
};

// Custom error UI wrapper for advanced customization
export interface CustomErrorUIProps extends ErrorUIProps {
  customComponent?: React.ComponentType<ErrorUIProps>;
  className?: string;
  style?: React.CSSProperties;
}

export const CustomErrorUI: React.FC<CustomErrorUIProps> = ({
  customComponent: CustomComponent,
  className,
  style,
  ...props
}) => {
  if (CustomComponent) {
    return (
      <div className={className} style={style}>
        <CustomComponent {...props} />
      </div>
    );
  }

  // Fallback to default UI
  return <DefaultErrorUI {...props} />;
};