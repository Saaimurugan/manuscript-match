# Error Handling System

A comprehensive error handling system for React applications that provides centralized error management, user-friendly error displays, retry mechanisms, and toast notifications.

## Features

- **Error Boundaries**: Catch JavaScript errors in component trees
- **Enhanced Error Classification**: Automatic error severity classification and context tracking
- **Retry Mechanisms**: Intelligent retry logic with exponential backoff
- **Toast Notifications**: Contextual error and success notifications
- **Error Fallbacks**: User-friendly error displays for different scenarios
- **Global Error Handling**: Automatic handling of unhandled errors and promise rejections
- **Error Tracking**: Built-in error statistics and throttling

## Components

### ErrorBoundary

Catches JavaScript errors anywhere in the child component tree and displays fallback UI.

```tsx
import { ErrorBoundary } from '@/components/error';

<ErrorBoundary
  onError={(error, errorInfo) => console.log('Error caught:', error)}
  showErrorDetails={true}
>
  <YourComponent />
</ErrorBoundary>
```

### Error Fallbacks

Various fallback components for different error scenarios:

```tsx
import { 
  ErrorFallback, 
  NetworkErrorFallback, 
  ServerErrorFallback,
  InlineError 
} from '@/components/error';

// Generic error fallback
<ErrorFallback 
  error={error} 
  onRetry={handleRetry}
  showRetryButton={true}
/>

// Inline error for smaller components
<InlineError 
  error={error} 
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>
```

### RetryButton

Button component with built-in retry logic and exponential backoff:

```tsx
import { RetryButton } from '@/components/error';

<RetryButton
  onRetry={async () => {
    await refetchData();
  }}
  error={error}
  maxRetries={3}
  showRetryCount={true}
/>
```

## Hooks

### useApiErrorHandler

Main hook for handling API errors with toast notifications:

```tsx
import { useApiErrorHandler } from '@/components/error';

const { handleError, handleSuccess } = useApiErrorHandler();

try {
  await apiCall();
  handleSuccess('Operation completed successfully');
} catch (error) {
  handleError(error, 'Custom error message', {
    component: 'MyComponent',
    action: 'api_call',
  });
}
```

### useErrorToast

Enhanced toast notifications for errors and success messages:

```tsx
import { useErrorToast } from '@/components/error';

const { showErrorToast, showSuccessToast } = useErrorToast();

showErrorToast(error, {
  onRetry: handleRetry,
  showErrorId: true,
  showReportButton: true,
});

showSuccessToast('Operation completed successfully');
```

### useRetryLogic

Hook for implementing retry logic with intelligent backoff:

```tsx
import { useRetryLogic } from '@/components/error';

const { shouldRetry, getRetryDelay } = useRetryLogic();

const executeWithRetry = async () => {
  let attempt = 0;
  const maxRetries = 3;

  while (attempt <= maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (!shouldRetry(attempt, error)) {
        throw error;
      }
      
      const delay = getRetryDelay(attempt, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};
```

### useComponentErrorHandler

Component-specific error handling with context:

```tsx
import { useComponentErrorHandler } from '@/components/error';

const MyComponent = () => {
  const { handleError, handleSuccess } = useComponentErrorHandler('MyComponent');

  const handleAction = async () => {
    try {
      await performAction();
      handleSuccess('Action completed', 'perform_action');
    } catch (error) {
      handleError(error, 'perform_action', 'Failed to perform action');
    }
  };
};
```

## Error Handler Utilities

### EnhancedErrorHandler

Centralized error processing with classification and context tracking:

```tsx
import { EnhancedErrorHandler } from '@/components/error';

const enhancedError = EnhancedErrorHandler.handle(error, {
  component: 'MyComponent',
  action: 'user_action',
  userId: 'user123',
});

console.log(enhancedError.severity); // 'low' | 'medium' | 'high' | 'critical'
console.log(enhancedError.canRetry); // boolean
console.log(enhancedError.errorId); // unique error ID
```

### Global Error Initialization

Initialize global error handlers for unhandled errors:

```tsx
import { initializeGlobalErrorHandlers } from '@/components/error';

// In your main app file
initializeGlobalErrorHandlers();
```

## Error Types and Classification

The system automatically classifies errors into different types and severity levels:

### Error Types
- `NETWORK_ERROR`: Connection issues, timeouts
- `AUTHENTICATION_ERROR`: Invalid tokens, expired sessions
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMIT_ERROR`: Too many requests
- `SERVER_ERROR`: Internal server errors
- `UNKNOWN_ERROR`: Unclassified errors

### Severity Levels
- `low`: Validation errors, expected failures
- `medium`: Authentication issues, client errors
- `high`: Network errors, unexpected failures
- `critical`: Server errors, system failures

## Integration with React Query

The error handling system integrates seamlessly with React Query:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useQueryErrorHandler } from '@/components/error';

const { onError } = useQueryErrorHandler();

const { data, error, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onError: (error) => onError(error, {
    component: 'DataComponent',
    action: 'fetch_data',
  }),
});
```

## Error Tracking Integration

The system supports integration with error tracking services:

```tsx
import { EnhancedErrorHandler } from '@/components/error';

// Set up error tracking service
EnhancedErrorHandler.setErrorTrackingService({
  captureException: (error, context) => {
    // Send to Sentry, LogRocket, etc.
    Sentry.captureException(error, { extra: context });
  },
  captureMessage: (message, level, context) => {
    Sentry.captureMessage(message, level, { extra: context });
  },
  setUserContext: (user) => {
    Sentry.setUser(user);
  },
  addBreadcrumb: (message, category, data) => {
    Sentry.addBreadcrumb({ message, category, data });
  },
});
```

## Best Practices

### 1. Use Error Boundaries at Strategic Points

```tsx
// Wrap major sections of your app
<ErrorBoundary>
  <Router>
    <Routes>
      <Route path="/" element={
        <ErrorBoundary>
          <HomePage />
        </ErrorBoundary>
      } />
    </Routes>
  </Router>
</ErrorBoundary>
```

### 2. Provide Context for Better Error Tracking

```tsx
const { handleError } = useComponentErrorHandler('UserProfile');

try {
  await updateProfile(data);
} catch (error) {
  handleError(error, 'update_profile', 'Failed to update profile');
}
```

### 3. Use Appropriate Error Fallbacks

```tsx
// For critical sections
<ErrorBoundary fallback={<ServerErrorFallback />}>
  <CriticalComponent />
</ErrorBoundary>

// For inline errors
{error && <InlineError error={error} onRetry={refetch} />}
```

### 4. Implement Retry Logic Thoughtfully

```tsx
// Only retry operations that make sense
<RetryButton
  onRetry={refetchData}
  error={error}
  maxRetries={3}
  // Don't retry validation errors
  disabled={error?.type === 'VALIDATION_ERROR'}
/>
```

### 5. Monitor Error Statistics

```tsx
// Get error statistics for monitoring
const stats = EnhancedErrorHandler.getErrorStatistics();
console.log('Total errors:', stats.totalErrors);
console.log('Error breakdown:', stats.errorsByType);
```

## Testing

The error handling system includes comprehensive tests:

```bash
npm test src/components/error/__tests__/ErrorHandling.test.tsx
```

Test coverage includes:
- Error boundary functionality
- Error fallback displays
- Retry mechanisms
- Toast notifications
- Error classification
- Global error handling

## Configuration

### Environment Variables

```env
# Enable detailed error logging in development
VITE_ENABLE_DEV_TOOLS=true

# Error tracking service configuration
VITE_ERROR_TRACKING_DSN=your-sentry-dsn
```

### Customization

You can customize error messages, retry logic, and toast behavior by extending the base classes or providing custom configurations to the hooks and components.

## Migration Guide

If you're migrating from a basic error handling setup:

1. Replace existing error boundaries with the new `ErrorBoundary` component
2. Update error handling in API calls to use `useApiErrorHandler`
3. Replace manual retry logic with `RetryButton` or `useRetryLogic`
4. Initialize global error handlers in your main app file
5. Update tests to use the new error handling utilities

## Performance Considerations

- Error throttling prevents spam from repeated errors
- Exponential backoff reduces server load during retries
- Error statistics are kept in memory with automatic cleanup
- Toast notifications are automatically dismissed to prevent UI clutter

## Browser Support

The error handling system supports all modern browsers and includes polyfills for:
- Promise rejection handling
- Error event handling
- Local storage for error tracking