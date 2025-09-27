/**
 * Centralized error handling utilities with user-friendly error messages
 * Provides comprehensive error classification, logging, and user notification
 */

import type { UserFriendlyError } from '@/types/api';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error context information
 */
export interface ErrorContext {
  userId?: string;
  processId?: string;
  component?: string;
  action?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

/**
 * Enhanced error information
 */
export interface EnhancedError extends UserFriendlyError {
  severity: ErrorSeverity;
  context?: ErrorContext;
  errorId: string;
  shouldReport: boolean;
  canRetry: boolean;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Error tracking service interface
 */
export interface ErrorTrackingService {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: ErrorSeverity, context?: ErrorContext): void;
  setUserContext(user: { id: string; email?: string }): void;
  addBreadcrumb(message: string, category?: string, data?: any): void;
}

/**
 * Enhanced error handler class
 */
export class EnhancedErrorHandler {
  private static errorTrackingService: ErrorTrackingService | null = null;
  private static errorCounts = new Map<string, number>();
  private static lastErrorTimes = new Map<string, number>();
  private static readonly ERROR_THROTTLE_TIME = 5000; // 5 seconds
  private static readonly MAX_SAME_ERROR_COUNT = 3;

  /**
   * Set error tracking service
   */
  static setErrorTrackingService(service: ErrorTrackingService): void {
    this.errorTrackingService = service;
  }

  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error should be throttled
   */
  private static shouldThrottleError(errorKey: string): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorTimes.get(errorKey) || 0;
    const count = this.errorCounts.get(errorKey) || 0;

    // Reset count if enough time has passed
    if (now - lastTime > this.ERROR_THROTTLE_TIME) {
      this.errorCounts.set(errorKey, 1);
      this.lastErrorTimes.set(errorKey, now);
      return false;
    }

    // Increment count
    this.errorCounts.set(errorKey, count + 1);
    this.lastErrorTimes.set(errorKey, now);

    // Throttle if too many of the same error
    return count >= this.MAX_SAME_ERROR_COUNT;
  }

  /**
   * Classify error severity
   */
  private static classifyErrorSeverity(error: any): ErrorSeverity {
    if (!error.response) {
      return 'high'; // Network errors are high severity
    }

    const status = error.response.status;

    if (status === 401 || status === 403) {
      return 'medium'; // Auth errors are medium severity
    }

    if (status === 400 || status === 422) {
      return 'low'; // Validation errors are low severity
    }

    if (status === 429) {
      return 'low'; // Rate limiting is low severity
    }

    if (status >= 500) {
      return 'critical'; // Server errors are critical
    }

    return 'medium'; // Default to medium
  }

  /**
   * Determine if error should be reported to tracking service
   */
  private static shouldReportError(error: any, severity: ErrorSeverity): boolean {
    // Always report critical and high severity errors
    if (severity === 'critical' || severity === 'high') {
      return true;
    }

    // Report medium severity errors except for common ones
    if (severity === 'medium') {
      const status = error.response?.status;
      // Don't report auth errors in development
      if (status === 401 && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        return false;
      }
      return true;
    }

    // Don't report low severity errors by default
    return false;
  }

  /**
   * Determine if error can be retried
   */
  private static canRetryError(error: any): boolean {
    if (!error.response) {
      return true; // Network errors can be retried
    }

    const status = error.response.status;

    // Don't retry client errors (except 429)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // Retry server errors and rate limiting
    return status >= 500 || status === 429;
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: any): string {
    if (!error.response) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const { status, data } = error.response;
    
    // Extract message from backend error format: { success: false, error: { message: "..." } }
    const extractMessage = (fallback: string) => {
      // Debug: Log the actual error structure
      console.log('🔍 Error Response Debug:', {
        status,
        data,
        'data.error': data?.error,
        'data.error.message': data?.error?.message,
        'data.message': data?.message
      });
      
      // Try multiple extraction paths
      const message = data?.error?.message || 
                     data?.message || 
                     data?.error || 
                     (typeof data === 'string' ? data : fallback);
      
      console.log('📝 Extracted message:', message);
      return message;
    };

    switch (status) {
      case 400:
        return extractMessage('Invalid request. Please check your input and try again.');
      case 401:
        // Clear any invalid tokens
        localStorage.removeItem('scholarfinder_token');
        localStorage.removeItem('scholarfinder_refresh_token');
        return 'Your session has expired. Please log in again.';
      case 403:
        return extractMessage('You don\'t have permission to perform this action.');
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return extractMessage('This action conflicts with the current state. Please refresh and try again.');
      case 422:
        return extractMessage('The provided data is invalid. Please check your input.');
      case 429:
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        return `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
      case 500:
        return 'A server error occurred. Please try again later.';
      case 502:
        return 'The server is temporarily unavailable. Please try again in a few minutes.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      case 504:
        return 'The request timed out. Please try again.';
      default:
        return extractMessage('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Get error action
   */
  private static getErrorAction(error: any): UserFriendlyError['action'] {
    if (!error.response) {
      return 'RETRY';
    }

    const status = error.response.status;

    switch (status) {
      case 401:
        return 'REDIRECT_TO_LOGIN';
      case 429:
        return 'RETRY';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'CONTACT_SUPPORT';
      default:
        return undefined;
    }
  }

  /**
   * Handle error with comprehensive processing
   */
  static handle(error: any, context?: ErrorContext): EnhancedError {
    const errorId = this.generateErrorId();
    const severity = this.classifyErrorSeverity(error);
    const shouldReport = this.shouldReportError(error, severity);
    const canRetry = this.canRetryError(error);
    
    // Create error key for throttling
    const errorKey = `${error.response?.status || 'network'}_${error.message}`;
    const isThrottled = this.shouldThrottleError(errorKey);

    // Enhanced error object
    const enhancedError: EnhancedError = {
      type: this.getErrorType(error),
      message: this.getUserFriendlyMessage(error),
      action: this.getErrorAction(error),
      retryAfter: error.response?.headers['retry-after'] ? parseInt(error.response.headers['retry-after']) : undefined,
      details: error.response?.data,
      severity,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
      errorId,
      shouldReport: shouldReport && !isThrottled,
      canRetry,
      retryCount: 0,
      maxRetries: canRetry ? 3 : 0,
    };

    // Log error
    this.logError(error, enhancedError);

    // Report to tracking service if needed
    if (enhancedError.shouldReport && this.errorTrackingService) {
      this.reportError(error, enhancedError);
    }

    return enhancedError;
  }

  /**
   * Get error type
   */
  private static getErrorType(error: any): UserFriendlyError['type'] {
    if (!error.response) {
      return 'NETWORK_ERROR';
    }

    const status = error.response.status;

    if (status === 401) return 'AUTHENTICATION_ERROR';
    if (status === 400 || status === 422) return 'VALIDATION_ERROR';
    if (status === 429) return 'RATE_LIMIT_ERROR';
    if (status >= 500) return 'SERVER_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Log error to console with formatting
   */
  private static logError(originalError: any, enhancedError: EnhancedError): void {
    const logLevel = this.getLogLevel(enhancedError.severity);
    const logData = {
      errorId: enhancedError.errorId,
      type: enhancedError.type,
      message: enhancedError.message,
      severity: enhancedError.severity,
      context: enhancedError.context,
      originalError: originalError,
    };

    switch (logLevel) {
      case 'error':
        console.error(`[ERROR] ${enhancedError.errorId}:`, logData);
        break;
      case 'warn':
        console.warn(`[WARN] ${enhancedError.errorId}:`, logData);
        break;
      case 'info':
        console.info(`[INFO] ${enhancedError.errorId}:`, logData);
        break;
      default:
        console.log(`[LOG] ${enhancedError.errorId}:`, logData);
    }
  }

  /**
   * Get console log level based on severity
   */
  private static getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * Report error to tracking service
   */
  private static reportError(originalError: any, enhancedError: EnhancedError): void {
    if (!this.errorTrackingService) return;

    try {
      if (originalError instanceof Error) {
        this.errorTrackingService.captureException(originalError, enhancedError.context);
      } else {
        this.errorTrackingService.captureMessage(
          enhancedError.message,
          enhancedError.severity,
          enhancedError.context
        );
      }
    } catch (reportingError) {
      console.error('Failed to report error to tracking service:', reportingError);
    }
  }

  /**
   * Handle JavaScript errors (for window.onerror)
   */
  static handleJavaScriptError(
    message: string,
    filename?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): void {
    const context: ErrorContext = {
      component: 'JavaScriptError',
      action: 'runtime',
      additionalData: {
        filename,
        lineno,
        colno,
      },
    };

    const enhancedError = this.handle(error || new Error(message), context);
    
    // Don't show toast for JS errors, just log them
    console.error('JavaScript Error:', enhancedError);
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const context: ErrorContext = {
      component: 'UnhandledPromiseRejection',
      action: 'promise_rejection',
    };

    const enhancedError = this.handle(event.reason, context);
    
    // Don't show toast for promise rejections, just log them
    console.error('Unhandled Promise Rejection:', enhancedError);
  }

  /**
   * Clear error tracking data (useful for testing)
   */
  static clearErrorTracking(): void {
    this.errorCounts.clear();
    this.lastErrorTimes.clear();
  }

  /**
   * Get error statistics
   */
  static getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: Array<{ errorKey: string; count: number; lastTime: number }>;
  } {
    const errorsByType: Record<string, number> = {};
    const recentErrors: Array<{ errorKey: string; count: number; lastTime: number }> = [];

    let totalErrors = 0;

    for (const [errorKey, count] of this.errorCounts.entries()) {
      totalErrors += count;
      const [type] = errorKey.split('_');
      errorsByType[type] = (errorsByType[type] || 0) + count;
      
      recentErrors.push({
        errorKey,
        count,
        lastTime: this.lastErrorTimes.get(errorKey) || 0,
      });
    }

    // Sort recent errors by last occurrence
    recentErrors.sort((a, b) => b.lastTime - a.lastTime);

    return {
      totalErrors,
      errorsByType,
      recentErrors: recentErrors.slice(0, 10), // Top 10 recent errors
    };
  }
}

/**
 * Initialize global error handlers
 */
export const initializeGlobalErrorHandlers = (): void => {
  // Set up error reporting consent for development
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    // Dynamically import and set up error reporting consent
    import('../services/errorReportService').then(({ errorReportService }) => {
      if (!errorReportService.isErrorReportingEnabled()) {
        errorReportService.setConsentLevel('basic');
        console.log('🐛 Error reporting enabled for development with basic consent level');
      }
    }).catch((error) => {
      console.warn('Failed to initialize error reporting consent:', error);
    });
  }

  // Handle JavaScript errors
  window.onerror = (message, filename, lineno, colno, error) => {
    EnhancedErrorHandler.handleJavaScriptError(
      typeof message === 'string' ? message : 'Unknown error',
      filename,
      lineno,
      colno,
      error
    );
    return false; // Don't prevent default browser error handling
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    EnhancedErrorHandler.handleUnhandledRejection(event);
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      // This is a resource loading error
      const context: ErrorContext = {
        component: 'ResourceLoadingError',
        action: 'resource_load',
        additionalData: {
          tagName: (event.target as any)?.tagName,
          src: (event.target as any)?.src || (event.target as any)?.href,
        },
      };

      const error = new Error(`Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href}`);
      EnhancedErrorHandler.handle(error, context);
    }
  }, true);
};

export default EnhancedErrorHandler;