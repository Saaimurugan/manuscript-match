/**
 * Error handling components and utilities
 * Comprehensive error handling system for React applications
 */

// Error Boundary Components
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';

// Error Fallback Components
export {
  ErrorFallback,
  NetworkErrorFallback,
  ServerErrorFallback,
  AuthErrorFallback,
  ValidationErrorFallback,
  InlineError,
  LoadingErrorFallback,
} from './ErrorFallback';

// Retry Components
export { RetryButton, AutoRetryWrapper } from './RetryButton';

// Toast Components and Hooks
export {
  useErrorToast,
  NetworkStatusToast,
  GlobalErrorToastHandler,
  type ErrorToastConfig,
} from './ErrorToast';

// Re-export error handling hooks
export {
  useApiErrorHandler,
  useMutationErrorHandler,
  useQueryErrorHandler,
  useRetryLogic,
  useComponentErrorHandler,
  useAsyncErrorHandler,
  useFormErrorHandler,
  useNetworkErrorHandler,
  useErrorRecovery,
} from '../../hooks/useErrorHandling';

// Re-export error handler utilities
export {
  EnhancedErrorHandler,
  initializeGlobalErrorHandlers,
  type ErrorSeverity,
  type ErrorContext,
  type EnhancedError,
  type ErrorTrackingService,
} from '../../lib/errorHandler';