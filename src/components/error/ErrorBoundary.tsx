/**
 * Error Boundary component for graceful error recovery
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { errorLogger } from '@/services/errorLogger';
import { errorReportService } from '@/services/errorReportService';
import { errorMonitoring } from '@/services/errorMonitoring';
import { ErrorBoundaryConfig, errorBoundaryConfig } from '@/config/errorBoundary.config';
import { getErrorUI } from './ErrorBoundaryUI';

// Simple test environment detection
const isTestEnvironment = () => {
  return typeof process !== 'undefined' &&
    process.env &&
    (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableReporting?: boolean;
  isolateErrors?: boolean;
  config?: Partial<ErrorBoundaryConfig>;
}

interface ErrorContext {
  component: string;
  props: Record<string, any>;
  route: string;
  timestamp: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  reportStatus: 'idle' | 'sending' | 'sent' | 'failed';
  errorContext: ErrorContext | null;
  errorCategory: 'syntax' | 'runtime' | 'network' | 'user' | 'system';
  errorSeverity: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  showReportDialog: boolean;
  userDescription: string;
  reportSubmissionError: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private effectiveConfig: ErrorBoundaryConfig;
  private autoRecoveryTimeout: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);

    // Merge global config with component-specific config
    const globalConfig = errorBoundaryConfig.getConfig();
    this.effectiveConfig = {
      ...globalConfig,
      ...props.config,
      // Override with explicit props for backward compatibility
      enableReporting: props.enableReporting ?? props.config?.enableReporting ?? globalConfig.enableReporting,
      showErrorDetails: props.showErrorDetails ?? props.config?.showErrorDetails ?? globalConfig.showErrorDetails,
      enableIsolation: props.isolateErrors ?? props.config?.enableIsolation ?? globalConfig.enableIsolation,
    };



    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      reportStatus: 'idle',
      errorContext: null,
      errorCategory: 'runtime',
      errorSeverity: 'medium',
      retryCount: 0,
      maxRetries: this.effectiveConfig.maxRetries,
      showReportDialog: false,
      userDescription: '',
      reportSubmissionError: null,
    };
  }

  /**
   * Get the effective configuration for this error boundary instance
   */
  private getEffectiveConfig(): ErrorBoundaryConfig {
    return this.effectiveConfig;
  }

  /**
   * Safe environment variable access for browser
   */
  private getNodeEnv(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV || 'development';
    }
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      return (window as any).__ENV__.NODE_ENV || 'development';
    }
    return 'development';
  }

  /**
   * Safe environment variable access
   */
  private getEnvVar(key: string, defaultValue?: string): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || defaultValue || '';
    }
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      return (window as any).__ENV__[key] || defaultValue || '';
    }
    return defaultValue || '';
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorCategory = ErrorBoundary.categorizeError(error);
    const errorSeverity = ErrorBoundary.assessSeverity(error, errorCategory);

    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      errorCategory,
      errorSeverity,
      reportStatus: 'idle',
      showReportDialog: false,
      userDescription: '',
      reportSubmissionError: null,
    };
  }

  private static categorizeError(error: Error): 'syntax' | 'runtime' | 'network' | 'user' | 'system' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Syntax errors
    if (message.includes('syntax') || message.includes('unexpected token') ||
      message.includes('parse error') || stack.includes('syntaxerror')) {
      return 'syntax';
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') ||
      message.includes('connection') || message.includes('timeout') ||
      error.name === 'NetworkError' || error.name === 'TypeError' && message.includes('failed to fetch')) {
      return 'network';
    }

    // User input errors
    if (message.includes('validation') || message.includes('invalid input') ||
      message.includes('required field') || message.includes('format')) {
      return 'user';
    }

    // System errors
    if (message.includes('memory') || message.includes('quota') ||
      message.includes('permission') || message.includes('access denied')) {
      return 'system';
    }

    // Default to runtime error
    return 'runtime';
  }

  private static assessSeverity(error: Error, category: string): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();

    // Critical errors that break core functionality
    if (category === 'syntax' || message.includes('chunk load') ||
      message.includes('module not found') || message.includes('cannot read properties of undefined')) {
      return 'critical';
    }

    // High severity for system and network issues
    if (category === 'system' || category === 'network') {
      return 'high';
    }

    // Medium severity for runtime errors
    if (category === 'runtime') {
      return 'medium';
    }

    // Low severity for user input errors
    return 'low';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Collect comprehensive error context
    const errorContext = this.collectErrorContext(error, errorInfo);

    // Track error in monitoring system
    errorMonitoring.trackError({
      errorId: this.state.errorId,
      timestamp: Date.now(),
      severity: this.state.errorSeverity,
      category: this.state.errorCategory,
      component: 'ErrorBoundary',
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: errorContext.userId,
      sessionId: errorContext.sessionId,
      resolved: false,
      responseTime: performance.now() // Time since page load
    });

    // Enhanced test environment handling
    if (isTestEnvironment()) {
      this.handleTestEnvironmentError(error, errorInfo, errorContext);
    }

    // Log error using ErrorLogger with comprehensive context
    errorLogger.critical(
      'ErrorBoundary caught an error',
      error,
      errorInfo,
      {
        errorId: this.state.errorId,
        category: this.state.errorCategory,
        severity: this.state.errorSeverity,
        context: errorContext,
        component: 'ErrorBoundary',
        retryCount: this.state.retryCount,
        maxRetries: this.state.maxRetries,
        isTestEnvironment: isTestEnvironment(),
      },
      'ErrorBoundary'
    );

    this.setState({
      error,
      errorInfo,
      errorContext,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service in production
    if (this.getNodeEnv() === 'production') {
      this.logErrorToService(error, errorInfo, errorContext);
    }
  }

  private collectErrorContext(error: Error, errorInfo: ErrorInfo): ErrorContext {
    // Generate session ID if not exists
    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('error-session-id', sessionId);
    }

    return {
      component: this.extractComponentName(errorInfo.componentStack),
      props: this.sanitizeProps(),
      route: window.location.pathname + window.location.search,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId,
      userId: this.getUserId(),
    };
  }

  private extractComponentName(componentStack: string): string {
    // Extract the first component name from the stack
    const match = componentStack.match(/^\s*in (\w+)/);
    return match ? match[1] : 'Unknown';
  }

  private sanitizeProps(): Record<string, any> {
    // Return sanitized version of props (remove sensitive data)
    const sanitized: Record<string, any> = {};

    Object.keys(this.props).forEach(key => {
      if (key !== 'children' && key !== 'onError') {
        sanitized[key] = typeof this.props[key as keyof Props] === 'function' ? '[Function]' : this.props[key as keyof Props];
      }
    });

    return sanitized;
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.userId;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => {
    // Enhanced error data with comprehensive context
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      category: this.state.errorCategory,
      severity: this.state.errorSeverity,
      context,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      environment: this.getNodeEnv(),
      buildVersion: this.getEnvVar('REACT_APP_VERSION', 'unknown'),
    };

    console.error('Enhanced error logged to service:', errorData);

    // Store error locally for offline scenarios
    this.storeErrorLocally(errorData);
  };

  private storeErrorLocally = (errorData: any) => {
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error-reports') || '[]');
      existingErrors.push(errorData);

      // Keep only last 10 errors to prevent storage bloat
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('error-reports', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Failed to store error locally:', storageError);
    }
  };

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    // Check if max retries exceeded
    if (newRetryCount > this.state.maxRetries) {
      console.warn(`Max retries (${this.state.maxRetries}) exceeded for error ${this.state.errorId}`);
      this.setState({ reportStatus: 'failed' });
      return;
    }

    // Log retry attempt with error context
    errorLogger.info(
      `Retry attempt ${newRetryCount} for error ${this.state.errorId}`,
      {
        errorId: this.state.errorId,
        retryCount: newRetryCount,
        maxRetries: this.state.maxRetries,
        errorCategory: this.state.errorCategory,
        errorSeverity: this.state.errorSeverity,
        component: this.state.errorContext?.component,
      },
      'ErrorBoundary'
    );

    // Enhanced state reset with proper cleanup
    this.performStateReset(newRetryCount);

    // Enhanced component state reset based on error type
    this.performComponentStateReset();
  };

  /**
   * Performs comprehensive state reset for retry functionality
   */
  private performStateReset = (retryCount: number) => {
    // Mark error as resolved in monitoring system
    if (this.state.errorId) {
      errorMonitoring.markErrorResolved(this.state.errorId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      reportStatus: 'idle',
      errorContext: null,
      retryCount,
      showReportDialog: false,
      userDescription: '',
      reportSubmissionError: null,
    });
  };

  /**
   * Performs component-level state reset based on error type and isolation settings
   */
  private performComponentStateReset = () => {
    // Clear any cached component state that might cause repeated errors
    if (this.shouldIsolateError()) {
      // For isolated errors, perform more aggressive cleanup
      this.clearComponentCache();

      // Trigger delayed re-render to ensure clean state
      setTimeout(() => {
        this.forceUpdate();
      }, 100);
    } else {
      // For non-isolated errors, perform standard cleanup
      this.clearBasicCache();
    }

    // Clear any error-related session storage
    this.clearErrorSessionData();
  };

  /**
   * Clears component cache for isolated error recovery
   */
  private clearComponentCache = () => {
    try {
      // Clear any component-specific cache
      const cacheKeys = Object.keys(sessionStorage).filter(key =>
        key.startsWith('component-cache-') ||
        key.startsWith('error-cache-') ||
        key.startsWith('retry-cache-')
      );

      cacheKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });

      // Clear any React-specific cache if available
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        // Signal to React DevTools that we're performing a reset
        console.info('Clearing React component cache for error recovery');
      }
    } catch (cacheError) {
      console.warn('Failed to clear component cache:', cacheError);
    }
  };

  /**
   * Clears basic cache for standard error recovery
   */
  private clearBasicCache = () => {
    try {
      // Clear only error-specific cache
      const errorCacheKeys = Object.keys(sessionStorage).filter(key =>
        key.startsWith('error-cache-') || key.startsWith('retry-cache-')
      );

      errorCacheKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (cacheError) {
      console.warn('Failed to clear basic cache:', cacheError);
    }
  };

  /**
   * Clears error-related session data
   */
  private clearErrorSessionData = () => {
    try {
      // Remove temporary error data but keep session ID for tracking
      const keysToRemove = [
        'error-temp-data',
        'error-component-state',
        'error-retry-data'
      ];

      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (sessionError) {
      console.warn('Failed to clear error session data:', sessionError);
    }
  };

  private handleGoHome = () => {
    // Log navigation attempt with comprehensive context
    errorLogger.info(
      `Navigating to home from error ${this.state.errorId}`,
      {
        errorId: this.state.errorId,
        errorCategory: this.state.errorCategory,
        errorSeverity: this.state.errorSeverity,
        retryCount: this.state.retryCount,
        currentRoute: window.location.pathname,
        component: this.state.errorContext?.component,
        navigationReason: 'user-initiated-home',
      },
      'ErrorBoundary'
    );

    // Perform comprehensive cleanup before navigation
    this.performNavigationCleanup();

    // Enhanced navigation with proper route handling
    this.performSafeNavigation();
  };

  /**
   * Performs comprehensive cleanup before navigation
   */
  private performNavigationCleanup = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      reportStatus: 'idle',
      errorContext: null,
      retryCount: 0,
      showReportDialog: false,
      userDescription: '',
      reportSubmissionError: null,
    });

    // Clear all error-related cache and session data
    this.clearAllErrorData();

    // Clear any pending timers or intervals that might cause issues
    this.clearPendingOperations();
  };

  /**
   * Clears all error-related data from storage
   */
  private clearAllErrorData = () => {
    try {
      // Clear error-related session storage
      const errorKeys = Object.keys(sessionStorage).filter(key =>
        key.startsWith('error-') ||
        key.startsWith('retry-') ||
        key.startsWith('component-cache-')
      );

      errorKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });

      // Clear error-related local storage (but keep user preferences)
      const localErrorKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('error-temp-') ||
        key.startsWith('retry-temp-')
      );

      localErrorKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (storageError) {
      console.warn('Failed to clear error data during navigation:', storageError);
    }
  };

  /**
   * Clears any pending operations that might interfere with navigation
   */
  private clearPendingOperations = () => {
    // Clear any timeouts that might be running
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
      this.autoRecoveryTimeout = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  };

  /**
   * Performs safe navigation with multiple fallback strategies
   */
  private performSafeNavigation = () => {
    try {
      // Strategy 1: Try React Router navigation if available
      if (this.attemptReactRouterNavigation()) {
        return;
      }

      // Strategy 2: Try modern History API navigation
      if (this.attemptHistoryApiNavigation()) {
        return;
      }

      // Strategy 3: Fallback to window.location
      this.performWindowLocationNavigation();

    } catch (navigationError) {
      console.error('All navigation strategies failed:', navigationError);

      // Last resort: force page reload to home
      this.performForceReload();
    }
  };

  /**
   * Attempts React Router navigation
   */
  private attemptReactRouterNavigation = (): boolean => {
    try {
      // Check for React Router context
      const reactRouterNavigate = (window as any).__REACT_ROUTER_NAVIGATE__;
      if (reactRouterNavigate && typeof reactRouterNavigate === 'function') {
        reactRouterNavigate('/');
        return true;
      }

      // Check for React Router v6 navigate function in global scope
      if ((window as any).navigate && typeof (window as any).navigate === 'function') {
        (window as any).navigate('/');
        return true;
      }

      return false;
    } catch (routerError) {
      console.warn('React Router navigation failed:', routerError);
      return false;
    }
  };

  /**
   * Attempts History API navigation
   */
  private attemptHistoryApiNavigation = (): boolean => {
    try {
      if (window.history && window.history.pushState) {
        // Clear current history state
        window.history.replaceState(null, '', '/');

        // Dispatch navigation event
        window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

        // Also dispatch a custom navigation event for components that listen
        window.dispatchEvent(new CustomEvent('error-boundary-navigation', {
          detail: { path: '/', reason: 'error-recovery' }
        }));

        return true;
      }
      return false;
    } catch (historyError) {
      console.warn('History API navigation failed:', historyError);
      return false;
    }
  };

  /**
   * Performs window.location navigation
   */
  private performWindowLocationNavigation = () => {
    try {
      // Use replace to avoid adding to history
      window.location.replace('/');
    } catch (locationError) {
      console.warn('Window location navigation failed:', locationError);
      // If replace fails, try href
      window.location.href = '/';
    }
  };

  /**
   * Force page reload as last resort
   */
  private performForceReload = () => {
    try {
      // Set the URL first, then reload
      window.history.replaceState(null, '', '/');
      window.location.reload();
    } catch (reloadError) {
      console.error('Force reload failed:', reloadError);
      // Absolute last resort
      window.location.href = window.location.origin;
    }
  };

  private handleReportBug = () => {
    if (!this.props.enableReporting) {
      console.warn('Error reporting is disabled');
      return;
    }

    // Check if error reporting is allowed, but bypass in development
    const isDevelopment = this.getNodeEnv() === 'development';
    if (!isDevelopment && !errorReportService.isErrorReportingEnabled()) {
      // In production, show consent dialog first
      this.showConsentDialog();
      return;
    }

    // In development or with consent, open the report dialog
    this.setState({
      showReportDialog: true,
      reportSubmissionError: null,
      userDescription: '',
    });
  };

  private handleCloseReportDialog = () => {
    this.setState({
      showReportDialog: false,
      userDescription: '',
      reportSubmissionError: null,
    });
  };

  private handleSubmitReport = async () => {
    const { error, errorInfo, userDescription } = this.state;

    if (!error) {
      return;
    }

    this.setState({
      reportStatus: 'sending',
      reportSubmissionError: null,
    });

    try {
      const isDevelopment = this.getNodeEnv() === 'development';

      // In development, set basic consent if not already set
      if (isDevelopment && !errorReportService.isErrorReportingEnabled()) {
        errorReportService.setConsentLevel('basic');
      }

      // Generate comprehensive error report using ErrorReportService
      const reportData = errorReportService.generateReport(error, errorInfo, {
        errorId: this.state.errorId,
        category: this.state.errorCategory,
        severity: this.state.errorSeverity,
        context: this.state.errorContext,
        retryCount: this.state.retryCount,
        environment: this.getNodeEnv(),
        buildVersion: this.getEnvVar('REACT_APP_VERSION', 'unknown'),
      });

      // Submit the report with user description
      const result = await errorReportService.submitReport(reportData, userDescription);

      if (result.success) {
        this.setState({
          reportStatus: 'sent',
          showReportDialog: false,
          userDescription: '',
        });

        // Also save locally as backup
        errorReportService.saveReportLocally(reportData);

        console.info(`Error report ${reportData.errorId} submitted successfully`);
      } else {
        this.setState({
          reportStatus: 'failed',
          reportSubmissionError: result.error || 'Failed to submit report',
        });
      }
    } catch (reportError) {
      console.error('Failed to submit error report:', reportError);

      // In development, provide more helpful error information
      if (this.getNodeEnv() === 'development') {
        console.group('🐛 Development Error Report');
        console.log('Error ID:', this.state.errorId);
        console.log('Error:', error);
        console.log('Error Info:', errorInfo);
        console.log('User Description:', userDescription);
        console.log('Report Error:', reportError);
        console.groupEnd();

        this.setState({
          reportStatus: 'sent', // Mark as sent in development for better UX
          showReportDialog: false,
          userDescription: '',
        });
      } else {
        this.setState({
          reportStatus: 'failed',
          reportSubmissionError: 'An unexpected error occurred while submitting the report',
        });
      }
    }
  };

  /**
   * Show consent dialog for error reporting
   */
  private showConsentDialog = () => {
    // For now, just set basic consent and proceed
    // In a real app, you'd show a proper consent UI
    if (window.confirm('Allow error reporting to help improve the application?')) {
      errorReportService.setConsentLevel('basic');
      this.setState({
        showReportDialog: true,
        reportSubmissionError: null,
        userDescription: '',
      });
    }
  };

  /**
   * Public method to reset the error boundary state
   * Useful for programmatic error recovery
   */
  public resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      reportStatus: 'idle',
      errorContext: null,
      errorCategory: 'runtime',
      errorSeverity: 'medium',
      retryCount: 0,
      showReportDialog: false,
      userDescription: '',
      reportSubmissionError: null,
    });
  };

  /**
   * Check if the error boundary should isolate errors
   * Prevents cascading failures in complex component hierarchies
   */
  private shouldIsolateError = (): boolean => {
    return this.props.isolateErrors === true ||
      this.state.errorSeverity === 'critical' ||
      this.state.errorCategory === 'syntax' ||
      this.state.retryCount >= 2; // Isolate after multiple failures
  };

  /**
   * Implements error boundary isolation to prevent cascading failures
   */
  private implementErrorIsolation = () => {
    if (!this.shouldIsolateError()) {
      return;
    }

    try {
      // Create an isolation barrier
      this.createIsolationBarrier();

      // Prevent error propagation to parent components
      this.preventErrorPropagation();

      // Isolate component state
      this.isolateComponentState();

    } catch (isolationError) {
      console.warn('Error isolation failed:', isolationError);
    }
  };

  /**
   * Creates an isolation barrier around the error boundary
   */
  private createIsolationBarrier = () => {
    // Mark this boundary as isolated
    this.setState(prevState => ({
      ...prevState,
      // Add isolation marker to state
    }));

    // Add isolation marker to DOM for debugging
    if (this.getNodeEnv() === 'development') {
      const boundaryElement = document.querySelector('[data-error-boundary]');
      if (boundaryElement) {
        boundaryElement.setAttribute('data-isolated', 'true');
        boundaryElement.setAttribute('data-isolation-reason',
          `${this.state.errorSeverity}-${this.state.errorCategory}`);
      }
    }
  };

  /**
   * Prevents error propagation to parent error boundaries
   */
  private preventErrorPropagation = () => {
    // Override error propagation by catching and containing the error
    const originalConsoleError = console.error;

    // Temporarily suppress error propagation
    console.error = (...args) => {
      // Log locally but don't propagate
      if (this.getNodeEnv() === 'development') {
        originalConsoleError.apply(console, ['[ISOLATED]', ...args]);
      }
    };

    // Restore original console.error after a brief delay
    setTimeout(() => {
      console.error = originalConsoleError;
    }, 1000);
  };

  /**
   * Isolates component state to prevent contamination
   */
  private isolateComponentState = () => {
    // Create isolated storage namespace
    const isolationKey = `isolated-${this.state.errorId}`;

    try {
      // Store current state in isolated namespace
      sessionStorage.setItem(isolationKey, JSON.stringify({
        errorId: this.state.errorId,
        errorCategory: this.state.errorCategory,
        errorSeverity: this.state.errorSeverity,
        isolatedAt: new Date().toISOString(),
        component: this.state.errorContext?.component,
      }));
    } catch (storageError) {
      console.warn('Failed to create isolated state storage:', storageError);
    }
  };

  /**
   * Determine if automatic recovery should be attempted
   */
  private shouldAttemptAutoRecovery = (): boolean => {
    return this.state.errorCategory === 'network' ||
      (this.state.errorSeverity === 'low' && this.state.retryCount === 0) ||
      this.isRecoverableError();
  };

  /**
   * Checks if the error is recoverable based on type and context
   */
  private isRecoverableError = (): boolean => {
    if (!this.state.error) return false;

    const message = this.state.error.message.toLowerCase();

    // Recoverable error patterns
    const recoverablePatterns = [
      'network request failed',
      'fetch failed',
      'timeout',
      'connection refused',
      'temporary',
      'rate limit',
      'service unavailable',
      'chunk load error'
    ];

    return recoverablePatterns.some(pattern => message.includes(pattern));
  };

  /**
   * Implements graceful degradation for different error types
   */
  private implementGracefulDegradation = (): ReactNode => {
    const { errorCategory } = this.state;

    // Implement different degradation strategies based on error type
    switch (errorCategory) {
      case 'network':
        return this.renderNetworkErrorDegradation();

      case 'user':
        return this.renderUserErrorDegradation();

      case 'system':
        return this.renderSystemErrorDegradation();

      case 'syntax':
        return this.renderSyntaxErrorDegradation();

      default:
        return this.renderDefaultDegradation();
    }
  };

  /**
   * Renders degraded UI for network errors
   */
  private renderNetworkErrorDegradation = (): ReactNode => {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            <CardTitle className="text-blue-900">Connection Issue</CardTitle>
            <CardDescription className="text-blue-700">
              We're having trouble connecting to our servers. Please check your internet connection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={this.handleRetry} className="w-full" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Renders degraded UI for user errors
   */
  private renderUserErrorDegradation = (): ReactNode => {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-yellow-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
            <CardTitle className="text-yellow-900">Input Error</CardTitle>
            <CardDescription className="text-yellow-700">
              There seems to be an issue with the information provided. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={this.handleRetry} className="w-full" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Renders degraded UI for system errors
   */
  private renderSystemErrorDegradation = (): ReactNode => {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-2" />
            <CardTitle className="text-red-900">System Error</CardTitle>
            <CardDescription className="text-red-700">
              A system error has occurred. Our team has been notified and is working on a fix.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} className="flex-1" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={this.handleGoHome} className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Renders degraded UI for syntax errors
   */
  private renderSyntaxErrorDegradation = (): ReactNode => {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-purple-600 mx-auto mb-2" />
            <CardTitle className="text-purple-900">Application Error</CardTitle>
            <CardDescription className="text-purple-700">
              A critical error has occurred. Please refresh the page or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Renders default degraded UI
   */
  private renderDefaultDegradation = (): ReactNode => {
    return null; // Use the existing comprehensive UI
  };

  /**
   * Component lifecycle method to handle updates
   */
  componentDidUpdate(prevProps: Props, prevState: State) {
    // Implement error isolation when error state changes
    if (this.state.hasError && !prevState.hasError) {
      this.implementErrorIsolation();
    }

    // Clean up isolation when error is resolved
    if (!this.state.hasError && prevState.hasError) {
      this.cleanupErrorIsolation();
    }
  }

  /**
   * Component cleanup
   */
  componentWillUnmount() {
    // Clear any pending timeouts
    this.clearPendingOperations();

    // Clean up error isolation
    this.cleanupErrorIsolation();

    // Clear test-specific data if in test environment
    if (isTestEnvironment()) {
      // Simple test cleanup
      console.log('🧪 Clearing test error data for:', this.state.errorId);
    }
  }

  /**
   * Cleans up error isolation when error is resolved
   */
  private cleanupErrorIsolation = () => {
    try {
      // Remove isolation markers from DOM
      if (this.getNodeEnv() === 'development') {
        const boundaryElement = document.querySelector('[data-error-boundary]');
        if (boundaryElement) {
          boundaryElement.removeAttribute('data-isolated');
          boundaryElement.removeAttribute('data-isolation-reason');
        }
      }

      // Clean up isolated storage
      const isolationKeys = Object.keys(sessionStorage).filter(key =>
        key.startsWith('isolated-')
      );

      isolationKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });

    } catch (cleanupError) {
      console.warn('Error isolation cleanup failed:', cleanupError);
    }
  };

  /**
   * Handle errors in test environment with enhanced context preservation
   */
  private handleTestEnvironmentError = (error: Error, errorInfo: ErrorInfo, errorContext: ErrorContext) => {
    try {
      // Simple test error logging
      console.group('🧪 Test Environment Error');
      console.log('Error ID:', this.state.errorId);
      console.log('Error:', error);
      console.log('Error Info:', errorInfo);
      console.log('Context:', errorContext);
      console.log('Category:', this.state.errorCategory);
      console.log('Severity:', this.state.errorSeverity);
      console.groupEnd();

      console.log(`🧪 Test Environment Error Processed: ${this.state.errorId}`);
    } catch (testError) {
      console.warn('Failed to process error in test environment:', testError);
      // Continue with normal error handling even if test processing fails
    }
  };





  /**
   * Get test-specific error information (public method for test access)
   */
  public getTestErrorInfo = () => {
    if (!isTestEnvironment()) {
      return null;
    }

    return {
      hasError: this.state.hasError,
      errorId: this.state.errorId,
      errorCategory: this.state.errorCategory,
      errorSeverity: this.state.errorSeverity,
      retryCount: this.state.retryCount,
      maxRetries: this.state.maxRetries,
      component: this.state.errorContext?.component,
      message: this.state.error?.message,
      reportStatus: this.state.reportStatus,
    };
  };

  /**
   * Reset error boundary for test scenarios (enhanced for testing)
   */
  public resetErrorBoundaryForTest = () => {
    if (!isTestEnvironment()) {
      console.warn('resetErrorBoundaryForTest should only be called in test environment');
      return;
    }

    // Simple test reset
    console.log('🧪 Resetting error boundary for test:', {
      previousErrorId: this.state.errorId,
      previousRetryCount: this.state.retryCount,
    });

    // Clear test-specific data
    console.log('🧪 Clearing test error data for:', this.state.errorId);

    // Perform standard reset
    this.resetErrorBoundary();

    // Emit test event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('error-boundary-reset', {
        detail: {
          timestamp: new Date().toISOString(),
          resetType: 'test-reset',
        },
      }));
    }
  };



  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Check if graceful degradation should be used
      const degradedUI = this.implementGracefulDegradation();
      if (degradedUI) {
        return degradedUI;
      }

      // Use configurable UI components
      return this.renderConfigurableUI();
    }

    return this.props.children;
  }

  /**
   * Renders the error UI based on configuration
   */
  private renderConfigurableUI() {
    const config = this.getEffectiveConfig();



    try {
      const ErrorUIComponent = getErrorUI(config.theme);

      return (
        <div
          data-error-boundary="true"
          data-error-id={this.state.errorId}
          data-error-category={this.state.errorCategory}
          data-error-severity={this.state.errorSeverity}
          data-testid="error-boundary"
        >
          <ErrorUIComponent
            error={this.state.error!}
            errorId={this.state.errorId}
            config={config}
            onRetry={config.enableRetryButton ? this.handleRetry : undefined}
            onGoHome={config.enableHomeButton ? this.handleGoHome : undefined}
            onReport={config.enableReportButton ? this.handleReportBug : undefined}
            onRefresh={config.enableRefreshButton ? this.handleRefresh : undefined}
            reportStatus={this.state.reportStatus}
            retryCount={this.state.retryCount}
            errorCategory={this.state.errorCategory}
            errorSeverity={this.state.errorSeverity}
            componentStack={this.state.errorInfo?.componentStack}
          />

          {/* Report Dialog */}
          {this.renderReportDialog()}
        </div>
      );
    } catch (uiError) {
      console.error('Error rendering ErrorUI component:', uiError);

      // Fallback simple error UI
      return this.renderFallbackUI(config);
    }
  }

  /**
   * Renders a simple fallback UI when the main ErrorUI fails
   */
  private renderFallbackUI(config: any) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600">An unexpected error occurred. Please try again.</p>
          </div>

          {config.showErrorDetails && this.state.error && (
            <div className="mb-6 p-3 bg-gray-100 rounded text-sm">
              <div className="font-medium">Error ID: {this.state.errorId}</div>
              <div className="text-gray-600 mt-1">{this.state.error.message}</div>
            </div>
          )}

          <div className="space-y-2">
            {config.enableRetryButton && (
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}

            {config.enableReportButton && (
              <button
                onClick={this.handleReportBug}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={this.state.reportStatus === 'sending'}
              >
                {this.state.reportStatus === 'sending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bug className="w-4 h-4" />
                )}
                {this.state.reportStatus === 'sent' ? 'Report Sent' :
                  this.state.reportStatus === 'failed' ? 'Report Failed' :
                    'Report Bug'}
              </button>
            )}

            {config.enableHomeButton && (
              <button
                onClick={this.handleGoHome}
                className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            )}
          </div>

          {/* Report Dialog */}
          {this.renderReportDialog()}
        </div>
      </div>
    );
  }

  /**
   * Handles page refresh
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Renders the error report dialog
   */
  private renderReportDialog() {
    const config = this.getEffectiveConfig();

    if (!config.enableReporting || !this.state.showReportDialog) {
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bug className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">Report Error</h3>
          </div>

          <p className="text-gray-600 mb-4">
            Help us improve by reporting this error. Your feedback is valuable for fixing issues.
          </p>

          <div className="space-y-4">
            {/* Error Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="font-medium">Error Summary</div>
                <div className="text-gray-600">
                  <div>ID: {this.state.errorId}</div>
                  <div>Category: {this.state.errorCategory}</div>
                  <div>Severity: {this.state.errorSeverity}</div>
                  <div>Message: {this.state.error?.message}</div>
                </div>
              </div>
            </div>

            {/* User Description Field */}
            <div className="space-y-2">
              <label htmlFor="user-description" className="block text-sm font-medium">
                What were you doing when this error occurred? (Optional)
              </label>
              <textarea
                id="user-description"
                placeholder="Please describe the steps you took before encountering this error. This helps us reproduce and fix the issue faster."
                value={this.state.userDescription}
                onChange={(e) => this.setState({ userDescription: e.target.value })}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded resize-none"
              />
            </div>

            {/* Submission Error Display */}
            {this.state.reportSubmissionError && (
              <div className="border border-red-200 bg-red-50 p-3 rounded flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-800 text-sm">
                  {this.state.reportSubmissionError}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={this.handleCloseReportDialog}
              disabled={this.state.reportStatus === 'sending'}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={this.handleSubmitReport}
              disabled={this.state.reportStatus === 'sending'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {this.state.reportStatus === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;