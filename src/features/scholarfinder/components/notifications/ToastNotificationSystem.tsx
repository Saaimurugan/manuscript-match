/**
 * Toast notification system for ScholarFinder workflow
 * Provides success, error, progress, and informational messages
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'progress';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  persistent?: boolean;
  progress?: number;
  actions?: ToastAction[];
  onDismiss?: () => void;
}

interface ToastContextType {
  notifications: ToastNotification[];
  showToast: (notification: Omit<ToastNotification, 'id'>) => string;
  updateToast: (id: string, updates: Partial<ToastNotification>) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (title: string, description?: string, actions?: ToastAction[]) => string;
  showError: (title: string, description?: string, actions?: ToastAction[]) => string;
  showWarning: (title: string, description?: string, actions?: ToastAction[]) => string;
  showInfo: (title: string, description?: string, actions?: ToastAction[]) => string;
  showProgress: (title: string, description?: string, progress?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToastNotifications() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastNotifications must be used within a ToastNotificationProvider');
  }
  return context;
}

interface ToastNotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

export function ToastNotificationProvider({ 
  children, 
  maxNotifications = 5,
  defaultDuration = 5000 
}: ToastNotificationProviderProps) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const id = generateId();
    const newNotification: ToastNotification = {
      ...notification,
      id,
      duration: notification.duration ?? defaultDuration,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit number of notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-dismiss if not persistent
    if (!notification.persistent && newNotification.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newNotification.duration);
    }

    return id;
  }, [generateId, defaultDuration, maxNotifications]);

  const updateToast = useCallback((id: string, updates: Partial<ToastNotification>) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, ...updates }
          : notification
      )
    );
  }, []);

  const dismissToast = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification?.onDismiss) {
        notification.onDismiss();
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAllToasts = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, description?: string, actions?: ToastAction[]) => {
    return showToast({ type: 'success', title, description, actions });
  }, [showToast]);

  const showError = useCallback((title: string, description?: string, actions?: ToastAction[]) => {
    return showToast({ type: 'error', title, description, actions, persistent: true });
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string, actions?: ToastAction[]) => {
    return showToast({ type: 'warning', title, description, actions });
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string, actions?: ToastAction[]) => {
    return showToast({ type: 'info', title, description, actions });
  }, [showToast]);

  const showProgress = useCallback((title: string, description?: string, progress?: number) => {
    return showToast({ 
      type: 'progress', 
      title, 
      description, 
      progress, 
      persistent: true 
    });
  }, [showToast]);

  const contextValue: ToastContextType = {
    notifications,
    showToast,
    updateToast,
    dismissToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProgress,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { notifications } = useToastNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map(notification => (
        <ToastItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  notification: ToastNotification;
}

function ToastItem({ notification }: ToastItemProps) {
  const { dismissToast } = useToastNotifications();

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out",
        getBackgroundColor()
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {notification.title}
              </h4>
              {notification.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {notification.description}
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200"
              onClick={() => dismissToast(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {notification.type === 'progress' && typeof notification.progress === 'number' && (
            <div className="mt-2">
              <Progress value={notification.progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(notification.progress)}% complete
              </p>
            </div>
          )}

          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex gap-2">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'default'}
                  onClick={() => {
                    action.onClick();
                    if (!notification.persistent) {
                      dismissToast(notification.id);
                    }
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for ScholarFinder-specific toast notifications
 */
export function useScholarFinderToasts() {
  const toasts = useToastNotifications();

  const showUploadSuccess = useCallback((fileName: string) => {
    return toasts.showSuccess(
      'Upload Successful',
      `${fileName} has been uploaded and processed successfully.`
    );
  }, [toasts]);

  const showUploadError = useCallback((fileName: string, error: string) => {
    return toasts.showError(
      'Upload Failed',
      `Failed to upload ${fileName}: ${error}`,
      [
        {
          label: 'Try Again',
          onClick: () => window.location.reload(),
        }
      ]
    );
  }, [toasts]);

  const showProcessingProgress = useCallback((stepName: string, progress: number) => {
    return toasts.showProgress(
      `Processing ${stepName}`,
      `Please wait while we process your request...`,
      progress
    );
  }, [toasts]);

  const showStepComplete = useCallback((stepName: string) => {
    return toasts.showSuccess(
      'Step Complete',
      `${stepName} has been completed successfully.`
    );
  }, [toasts]);

  const showValidationError = useCallback((field: string, message: string) => {
    return toasts.showWarning(
      'Validation Error',
      `${field}: ${message}`
    );
  }, [toasts]);

  const showNetworkError = useCallback((retryAction?: () => void) => {
    return toasts.showError(
      'Network Error',
      'Unable to connect to the server. Please check your internet connection.',
      retryAction ? [
        {
          label: 'Retry',
          onClick: retryAction,
        }
      ] : undefined
    );
  }, [toasts]);

  const showServiceUnavailable = useCallback(() => {
    return toasts.showError(
      'Service Unavailable',
      'The ScholarFinder service is temporarily unavailable. Please try again later.',
      [
        {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        }
      ]
    );
  }, [toasts]);

  return {
    ...toasts,
    showUploadSuccess,
    showUploadError,
    showProcessingProgress,
    showStepComplete,
    showValidationError,
    showNetworkError,
    showServiceUnavailable,
  };
}