# ScholarFinder Error Handling System

This directory contains a comprehensive error handling and user feedback system for the ScholarFinder workflow. The system provides robust error recovery, user-friendly notifications, network status monitoring, and offline handling capabilities.

## Overview

The error handling system consists of several interconnected components:

1. **Error Boundaries** - React error boundaries for catching and handling component errors
2. **Error Recovery Hooks** - Custom hooks for retry mechanisms and error state management
3. **Toast Notification System** - User-friendly notifications for success, error, warning, and progress messages
4. **Network Status Handling** - Network connectivity monitoring and offline mode support
5. **Error Display Components** - Comprehensive error display with recovery suggestions
6. **Error Handling Provider** - Central provider that integrates all error handling features

## Components

### Error Boundaries

#### `ScholarFinderErrorBoundary`
- Catches React component errors within the ScholarFinder workflow
- Provides user-friendly error UI with retry functionality
- Supports custom fallback components and error callbacks
- Shows technical details in development mode

#### `StepErrorBoundary`
- Step-specific error boundary for workflow steps
- Provides context-aware error messages
- Supports step-specific error handling callbacks

#### `withErrorBoundary` HOC
- Higher-order component for wrapping components with error boundaries
- Configurable error boundary props

### Error Display Components

#### `ErrorDisplay`
- Comprehensive error display with user-friendly messages
- Shows recovery suggestions and action buttons
- Supports compact and full display modes
- Includes technical details in collapsible section

#### `ErrorSummary`
- Displays multiple errors in a summary format
- Provides bulk actions for error management
- Shows error severity and retry status

#### `InlineError`
- Compact inline error display for forms and components
- Quick retry and dismiss functionality

#### `ErrorPage`
- Full-page error display for critical errors
- Navigation options to return to dashboard

### Toast Notification System

#### `ToastNotificationProvider`
- Context provider for toast notifications
- Manages notification queue and auto-dismissal
- Supports different notification types and actions

#### `useToastNotifications`
- Hook for accessing toast notification functionality
- Provides methods for showing different types of notifications

#### `useScholarFinderToasts`
- ScholarFinder-specific toast notifications
- Pre-configured messages for common workflow scenarios

### Network Status Components

#### `NetworkStatusIndicator`
- Visual indicator for network connectivity status
- Supports compact and full alert modes
- Shows connection quality information

#### `OfflineModeHandler`
- Handles offline mode with fallback UI
- Manages cached data display
- Provides retry functionality when back online

#### `NetworkAwareOperation`
- Wrapper component for network-dependent operations
- Shows appropriate fallback when offline
- Configurable offline messages

### Error Recovery Hooks

#### `useErrorRecovery`
- Main error recovery hook with retry mechanisms
- Supports automatic and manual retry
- Manages retry count and backoff strategies
- Provides user-friendly error displays

#### `useNetworkStatus`
- Network connectivity monitoring
- Detects online/offline state changes
- Shows appropriate notifications for connectivity changes

#### `useRetryableOperation`
- Hook for retryable operations with exponential backoff
- Configurable retry conditions and callbacks
- Loading state management

#### `useStepErrorRecovery`
- Step-specific error recovery
- Context-aware error handling for workflow steps

### Error Handling Provider

#### `ErrorHandlingProvider`
- Central provider that integrates all error handling features
- Manages global error state
- Provides configuration options for different features
- Supports critical error callbacks

#### `useErrorHandling`
- Hook for accessing global error handling functionality
- Provides methods for reporting and managing errors

#### `useStepErrorHandling`
- Step-specific error handling hook
- Manages errors within specific workflow steps

#### `useApiErrorHandling`
- API-specific error handling
- Converts API errors to ScholarFinder errors
- Handles network and authentication errors

## Usage Examples

### Basic Error Boundary Usage

```tsx
import { ScholarFinderErrorBoundary } from './components/error/ErrorBoundary';

function MyComponent() {
  return (
    <ScholarFinderErrorBoundary context="Upload Step">
      <UploadComponent />
    </ScholarFinderErrorBoundary>
  );
}
```

### Error Recovery Hook

```tsx
import { useErrorRecovery } from './hooks/useErrorRecovery';

function MyComponent() {
  const [errorState, errorActions] = useErrorRecovery({
    maxRetries: 3,
    onRetry: async () => {
      // Retry logic here
    },
  });

  const handleOperation = async () => {
    try {
      await someOperation();
    } catch (error) {
      errorActions.handleError(error, 'Operation Context');
    }
  };

  return (
    <div>
      {errorState.error && (
        <ErrorDisplay
          error={errorState.error}
          onRetry={errorActions.canRetry ? errorActions.retry : undefined}
          onDismiss={errorActions.clearError}
        />
      )}
      <button onClick={handleOperation}>Perform Operation</button>
    </div>
  );
}
```

### Toast Notifications

```tsx
import { useScholarFinderToasts } from './components/notifications/ToastNotificationSystem';

function MyComponent() {
  const toasts = useScholarFinderToasts();

  const handleUpload = async () => {
    try {
      await uploadFile();
      toasts.showUploadSuccess('document.pdf');
    } catch (error) {
      toasts.showUploadError('document.pdf', error.message);
    }
  };

  return <button onClick={handleUpload}>Upload File</button>;
}
```

### Complete Application Setup

```tsx
import { ErrorHandlingProvider } from './providers/ErrorHandlingProvider';

function App() {
  return (
    <ErrorHandlingProvider
      enableGlobalErrorBoundary={true}
      enableNetworkHandling={true}
      enableOfflineMode={true}
      onCriticalError={(error) => {
        // Send to monitoring service
        console.error('Critical error:', error);
      }}
    >
      <ScholarFinderApp />
    </ErrorHandlingProvider>
  );
}
```

## Error Types

The system handles various types of errors specific to the ScholarFinder workflow:

- `UPLOAD_ERROR` - File upload failures
- `FILE_FORMAT_ERROR` - Invalid file formats
- `METADATA_ERROR` - Metadata extraction failures
- `KEYWORD_ERROR` - Keyword processing errors
- `SEARCH_ERROR` - Database search failures
- `VALIDATION_ERROR` - Author validation errors
- `TIMEOUT_ERROR` - Operation timeouts
- `EXTERNAL_API_ERROR` - External API failures
- `NETWORK_ERROR` - Network connectivity issues
- `AUTHENTICATION_ERROR` - Authentication failures

## Configuration Options

### ErrorHandlingProvider Props

- `enableGlobalErrorBoundary` - Enable global error boundary (default: true)
- `enableNetworkHandling` - Enable network status monitoring (default: true)
- `enableOfflineMode` - Enable offline mode support (default: true)
- `maxGlobalErrors` - Maximum number of global errors to track (default: 10)
- `defaultMaxRetries` - Default maximum retry attempts (default: 3)
- `onCriticalError` - Callback for critical errors

### Error Recovery Options

- `maxRetries` - Maximum retry attempts
- `autoRetry` - Enable automatic retry
- `showToast` - Show toast notifications
- `onRetry` - Retry callback function
- `onMaxRetriesReached` - Max retries reached callback
- `onErrorCleared` - Error cleared callback

## Testing

The error handling system includes comprehensive tests:

- Error boundary component tests
- Error recovery hook tests
- Integration tests for the complete system
- Network status handling tests
- Toast notification tests

Run tests with:
```bash
npm test src/features/scholarfinder/components/error/
npm test src/features/scholarfinder/hooks/useErrorRecovery.test.ts
```

## Best Practices

1. **Always wrap components with error boundaries** in production
2. **Use step-specific error handling** for workflow steps
3. **Provide meaningful error contexts** when reporting errors
4. **Handle network errors gracefully** with offline support
5. **Show progress notifications** for long-running operations
6. **Implement retry logic** for transient errors
7. **Log errors appropriately** for monitoring and debugging
8. **Test error scenarios** thoroughly in development

## Integration with Existing Systems

The error handling system integrates seamlessly with:

- Existing authentication system
- ScholarFinder API service
- React Query for data fetching
- Existing UI components and styling
- Process management system
- Workflow step navigation

## Future Enhancements

Potential improvements for the error handling system:

1. **Error analytics and reporting** - Track error patterns and frequencies
2. **Smart retry strategies** - Context-aware retry logic
3. **Error prediction** - Proactive error prevention
4. **Enhanced offline capabilities** - Better offline data synchronization
5. **Error recovery suggestions** - AI-powered recovery recommendations
6. **Performance monitoring** - Error impact on application performance