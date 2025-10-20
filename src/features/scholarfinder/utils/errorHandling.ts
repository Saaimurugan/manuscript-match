/**
 * Error handling utilities for ScholarFinder operations
 * Provides user-friendly error messages and recovery suggestions
 */

import { ScholarFinderError, ScholarFinderErrorType } from '../services/ScholarFinderApiService';

/**
 * User-friendly error messages for different error types
 */
export const getErrorMessage = (error: ScholarFinderError): string => {
  switch (error.type) {
    case ScholarFinderErrorType.UPLOAD_ERROR:
      return 'Failed to upload your manuscript. Please check your file and try again.';
    
    case ScholarFinderErrorType.FILE_FORMAT_ERROR:
      return error.message; // Use the specific message from the service
    
    case ScholarFinderErrorType.METADATA_ERROR:
      return 'Unable to extract metadata from your manuscript. The file may be corrupted or in an unsupported format.';
    
    case ScholarFinderErrorType.KEYWORD_ERROR:
      return 'Failed to enhance keywords. Please check your selections and try again.';
    
    case ScholarFinderErrorType.SEARCH_ERROR:
      return 'Database search failed. This may be due to network issues or database unavailability.';
    
    case ScholarFinderErrorType.VALIDATION_ERROR:
      return 'Author validation encountered an error. Please try again or contact support if the issue persists.';
    
    case ScholarFinderErrorType.TIMEOUT_ERROR:
      return 'The operation timed out. This may be due to large file processing or high server load. Please try again.';
    
    case ScholarFinderErrorType.EXTERNAL_API_ERROR:
      return error.message || 'An error occurred while communicating with the ScholarFinder service. Please try again.';
    
    default:
      return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
  }
};

/**
 * Get recovery suggestions for different error types
 */
export const getRecoverySuggestions = (error: ScholarFinderError): string[] => {
  switch (error.type) {
    case ScholarFinderErrorType.UPLOAD_ERROR:
      return [
        'Check your internet connection',
        'Ensure the file is not corrupted',
        'Try uploading a smaller file',
        'Wait a moment and try again'
      ];
    
    case ScholarFinderErrorType.FILE_FORMAT_ERROR:
      return [
        'Convert your file to .doc or .docx format',
        'Ensure the file is not password protected',
        'Check that the file size is under 100MB',
        'Try saving the file in a different format'
      ];
    
    case ScholarFinderErrorType.METADATA_ERROR:
      return [
        'Check that your document has proper formatting',
        'Ensure the document contains text content',
        'Try uploading a different version of the file',
        'Contact support if the file should be valid'
      ];
    
    case ScholarFinderErrorType.KEYWORD_ERROR:
      return [
        'Check your keyword selections',
        'Ensure at least one keyword is selected',
        'Try with different keyword combinations',
        'Refresh the page and try again'
      ];
    
    case ScholarFinderErrorType.SEARCH_ERROR:
      return [
        'Check your internet connection',
        'Try selecting different databases',
        'Wait a few minutes and try again',
        'Contact support if databases are consistently unavailable'
      ];
    
    case ScholarFinderErrorType.VALIDATION_ERROR:
      return [
        'Wait a moment and try again',
        'Check that your manuscript has been properly processed',
        'Try restarting the validation process',
        'Contact support if validation consistently fails'
      ];
    
    case ScholarFinderErrorType.TIMEOUT_ERROR:
      return [
        'Wait a few minutes and try again',
        'Check your internet connection stability',
        'Try during off-peak hours',
        'Contact support if timeouts persist'
      ];
    
    case ScholarFinderErrorType.EXTERNAL_API_ERROR:
      return [
        'Check your internet connection',
        'Wait a moment and try again',
        'Try refreshing the page',
        'Contact support if the issue persists'
      ];
    
    default:
      return [
        'Refresh the page and try again',
        'Check your internet connection',
        'Clear your browser cache',
        'Contact support if the issue persists'
      ];
  }
};

/**
 * Determine if an error is retryable
 */
export const isRetryableError = (error: ScholarFinderError): boolean => {
  return error.retryable;
};

/**
 * Get retry delay for retryable errors
 */
export const getRetryDelay = (error: ScholarFinderError): number => {
  return error.retryAfter || 5000; // Default 5 seconds
};

/**
 * Check if error requires user action (non-retryable)
 */
export const requiresUserAction = (error: ScholarFinderError): boolean => {
  return [
    ScholarFinderErrorType.FILE_FORMAT_ERROR,
    ScholarFinderErrorType.KEYWORD_ERROR,
  ].includes(error.type);
};

/**
 * Get appropriate error severity level
 */
export const getErrorSeverity = (error: ScholarFinderError): 'low' | 'medium' | 'high' | 'critical' => {
  switch (error.type) {
    case ScholarFinderErrorType.FILE_FORMAT_ERROR:
    case ScholarFinderErrorType.KEYWORD_ERROR:
      return 'low'; // User can fix these
    
    case ScholarFinderErrorType.UPLOAD_ERROR:
    case ScholarFinderErrorType.METADATA_ERROR:
      return 'medium'; // May require retry or different approach
    
    case ScholarFinderErrorType.SEARCH_ERROR:
    case ScholarFinderErrorType.VALIDATION_ERROR:
    case ScholarFinderErrorType.TIMEOUT_ERROR:
      return 'high'; // Service issues that may resolve
    
    case ScholarFinderErrorType.EXTERNAL_API_ERROR:
      return 'critical'; // Service unavailable
    
    default:
      return 'medium';
  }
};

/**
 * Format error for logging
 */
export const formatErrorForLogging = (error: ScholarFinderError, context?: string): object => {
  return {
    timestamp: new Date().toISOString(),
    context: context || 'unknown',
    type: error.type,
    message: error.message,
    retryable: error.retryable,
    retryAfter: error.retryAfter,
    details: error.details,
    severity: getErrorSeverity(error),
  };
};

/**
 * Create user-friendly error display object
 */
export interface UserFriendlyErrorDisplay {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
  retryDelay?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const createUserFriendlyErrorDisplay = (
  error: ScholarFinderError,
  context?: string
): UserFriendlyErrorDisplay => {
  const title = getErrorTitle(error.type);
  const message = getErrorMessage(error);
  const suggestions = getRecoverySuggestions(error);
  const canRetry = isRetryableError(error);
  const retryDelay = canRetry ? getRetryDelay(error) : undefined;
  const severity = getErrorSeverity(error);

  return {
    title,
    message,
    suggestions,
    canRetry,
    retryDelay,
    severity,
  };
};

/**
 * Get error title for display
 */
const getErrorTitle = (errorType: ScholarFinderErrorType): string => {
  switch (errorType) {
    case ScholarFinderErrorType.UPLOAD_ERROR:
      return 'Upload Failed';
    
    case ScholarFinderErrorType.FILE_FORMAT_ERROR:
      return 'Invalid File Format';
    
    case ScholarFinderErrorType.METADATA_ERROR:
      return 'Metadata Extraction Failed';
    
    case ScholarFinderErrorType.KEYWORD_ERROR:
      return 'Keyword Processing Failed';
    
    case ScholarFinderErrorType.SEARCH_ERROR:
      return 'Database Search Failed';
    
    case ScholarFinderErrorType.VALIDATION_ERROR:
      return 'Author Validation Failed';
    
    case ScholarFinderErrorType.TIMEOUT_ERROR:
      return 'Operation Timed Out';
    
    case ScholarFinderErrorType.EXTERNAL_API_ERROR:
      return 'Service Unavailable';
    
    default:
      return 'Unexpected Error';
  }
};

/**
 * Error boundary helper for React components
 */
export const handleComponentError = (error: Error, errorInfo: any): void => {
  console.error('ScholarFinder Component Error:', error, errorInfo);
  
  // Log to external service if configured
  if (typeof window !== 'undefined' && (window as any).errorLogger) {
    (window as any).errorLogger.log({
      type: 'COMPONENT_ERROR',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Network status helper
 */
export const checkNetworkStatus = (): boolean => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Assume online if can't detect
};

/**
 * Retry helper with exponential backoff
 */
export const createRetryHelper = (maxRetries: number = 3) => {
  return async <T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = Math.random() * 0.1 * delay;
        
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError;
  };
};