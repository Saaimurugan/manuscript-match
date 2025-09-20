/**
 * Enhanced toast notification system for errors and success messages
 * Provides contextual toast notifications with actions and retry capabilities
 */

import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Bug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { EnhancedError } from '@/lib/errorHandler';

/**
 * Enhanced toast configuration
 */
export interface ErrorToastConfig {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  showErrorId?: boolean;
  showCopyButton?: boolean;
  showReportButton?: boolean;
}

/**
 * Hook for enhanced error toasts
 */
export const useErrorToast = () => {
  const { toast, dismiss } = useToast();

  const showErrorToast = React.useCallback((
    error: EnhancedError | Error | any,
    config: ErrorToastConfig = {}
  ) => {
    const enhancedError = error as EnhancedError;
    const isEnhancedError = enhancedError && 'errorId' in enhancedError;
    
    const {
      title,
      description,
      variant = 'destructive',
      duration,
      action,
      onRetry,
      onDismiss,
      showErrorId = true,
      showCopyButton = false,
      showReportButton = false,
    } = config;

    const getToastIcon = () => {
      switch (variant) {
        case 'success':
          return <CheckCircle className="w-4 h-4" />;
        case 'warning':
          return <AlertTriangle className="w-4 h-4" />;
        case 'info':
          return <Info className="w-4 h-4" />;
        default:
          return <AlertTriangle className="w-4 h-4" />;
      }
    };

    const getDefaultTitle = () => {
      if (title) return title;
      
      switch (variant) {
        case 'success':
          return 'Success';
        case 'warning':
          return 'Warning';
        case 'info':
          return 'Information';
        default:
          return isEnhancedError && enhancedError.severity === 'low' ? 'Notice' : 'Error';
      }
    };

    const getDefaultDescription = () => {
      if (description) return description;
      
      if (isEnhancedError) {
        return enhancedError.message;
      }
      
      return error?.message || 'An unexpected error occurred';
    };

    const copyErrorDetails = () => {
      if (!isEnhancedError) return;
      
      const errorDetails = {
        errorId: enhancedError.errorId,
        type: enhancedError.type,
        message: enhancedError.message,
        severity: enhancedError.severity,
        timestamp: enhancedError.context?.timestamp,
        url: enhancedError.context?.url,
      };
      
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      
      toast({
        title: 'Copied',
        description: 'Error details copied to clipboard',
        duration: 2000,
      });
    };

    const reportError = () => {
      if (!isEnhancedError) return;
      
      const subject = encodeURIComponent(`Error Report - ${enhancedError.errorId}`);
      const body = encodeURIComponent(`
Error Details:
- ID: ${enhancedError.errorId}
- Type: ${enhancedError.type}
- Message: ${enhancedError.message}
- Severity: ${enhancedError.severity}
- Timestamp: ${enhancedError.context?.timestamp}
- URL: ${enhancedError.context?.url}

Please describe what you were doing when this error occurred:
[Your description here]
      `);
      
      window.open(`mailto:support@scholarfinder.com?subject=${subject}&body=${body}`);
    };

    const toastActions = [];

    // Add retry action
    if (onRetry && isEnhancedError && enhancedError.canRetry) {
      toastActions.push(
        <Button
          key="retry"
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await onRetry();
            } catch (retryError) {
              console.error('Retry failed:', retryError);
            }
          }}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      );
    }

    // Add custom action
    if (action) {
      toastActions.push(
        <Button
          key="custom"
          size="sm"
          variant="outline"
          onClick={action.onClick}
          className="h-6 px-2 text-xs"
        >
          {action.label}
        </Button>
      );
    }

    // Add copy button
    if (showCopyButton && isEnhancedError) {
      toastActions.push(
        <Button
          key="copy"
          size="sm"
          variant="ghost"
          onClick={copyErrorDetails}
          className="h-6 px-2 text-xs"
        >
          <Copy className="w-3 h-3" />
        </Button>
      );
    }

    // Add report button
    if (showReportButton && isEnhancedError) {
      toastActions.push(
        <Button
          key="report"
          size="sm"
          variant="ghost"
          onClick={reportError}
          className="h-6 px-2 text-xs"
        >
          <Bug className="w-3 h-3" />
        </Button>
      );
    }

    const toastId = toast({
      title: (
        <div className="flex items-center gap-2">
          {getToastIcon()}
          {getDefaultTitle()}
        </div>
      ),
      description: (
        <div className="space-y-2">
          <div>{getDefaultDescription()}</div>
          {showErrorId && isEnhancedError && (
            <div className="text-xs opacity-70">
              ID: <code className="bg-gray-100 px-1 rounded">{enhancedError.errorId}</code>
            </div>
          )}
          {toastActions.length > 0 && (
            <div className="flex gap-1 pt-1">
              {toastActions}
            </div>
          )}
        </div>
      ),
      variant,
      duration: duration || (isEnhancedError && enhancedError.severity === 'critical' ? 8000 : 5000),
    });

    // Handle dismiss callback
    if (onDismiss) {
      setTimeout(() => {
        onDismiss();
      }, duration || 5000);
    }

    return toastId;
  }, [toast]);

  const showSuccessToast = React.useCallback((
    message: string,
    config: Omit<ErrorToastConfig, 'variant'> = {}
  ) => {
    return showErrorToast(
      { message },
      { ...config, variant: 'success' }
    );
  }, [showErrorToast]);

  const showWarningToast = React.useCallback((
    message: string,
    config: Omit<ErrorToastConfig, 'variant'> = {}
  ) => {
    return showErrorToast(
      { message },
      { ...config, variant: 'warning' }
    );
  }, [showErrorToast]);

  const showInfoToast = React.useCallback((
    message: string,
    config: Omit<ErrorToastConfig, 'variant'> = {}
  ) => {
    return showErrorToast(
      { message },
      { ...config, variant: 'info' }
    );
  }, [showErrorToast]);

  return {
    showErrorToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
    dismiss,
  };
};

/**
 * Toast notification component for network status
 */
export const NetworkStatusToast: React.FC = () => {
  const { showWarningToast, showSuccessToast } = useErrorToast();
  
  React.useEffect(() => {
    const handleOnline = () => {
      showSuccessToast('Connection restored', {
        duration: 3000,
      });
    };

    const handleOffline = () => {
      showWarningToast('Connection lost - You are currently offline', {
        duration: 0, // Don't auto-dismiss
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showSuccessToast, showWarningToast]);

  return null;
};

/**
 * Global error toast handler
 */
export const GlobalErrorToastHandler: React.FC = () => {
  const { showErrorToast } = useErrorToast();

  React.useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      showErrorToast(event.error || new Error(event.message), {
        title: 'Unexpected Error',
        showErrorId: true,
        showReportButton: true,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showErrorToast(event.reason, {
        title: 'Unhandled Promise Rejection',
        showErrorId: true,
        showReportButton: true,
      });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showErrorToast]);

  return null;
};

export default useErrorToast;