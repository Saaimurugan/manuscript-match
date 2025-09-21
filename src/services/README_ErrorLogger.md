# ErrorLogger Service

The ErrorLogger is a comprehensive logging utility designed for React applications that provides structured error logging, environment-aware configuration, and integration with external error tracking services.

## Features

- **Environment-Aware Logging**: Different logging levels and behaviors for development, production, and test environments
- **Structured Error Data**: Comprehensive error information collection including stack traces, component context, and user information
- **Local Storage Backup**: Automatic local storage of log entries with configurable limits
- **External Service Integration**: Built-in support for popular error tracking services (Sentry, LogRocket, custom APIs)
- **Automatic Retry Mechanisms**: Failed log submissions are automatically retried
- **Data Sanitization**: Sensitive information is automatically removed from log entries
- **Performance Optimized**: Minimal performance impact with efficient batching and async operations

## Installation and Setup

The ErrorLogger is already integrated into the services module. Import it from the services index:

```typescript
import { errorLogger, LogLevel, ExternalServices } from '@/services';
```

## Basic Usage

### Simple Logging

```typescript
import { errorLogger } from '@/services/errorLogger';

// Debug logging (only in development)
errorLogger.debug('Debug message', { key: 'value' });

// Info logging
errorLogger.info('User action completed', { userId: '123', action: 'login' });

// Warning logging
errorLogger.warn('Deprecated API used', { api: '/old-endpoint' });

// Error logging
const error = new Error('Something went wrong');
errorLogger.error('Operation failed', error, undefined, { operation: 'data-fetch' });

// Critical error logging (immediately flushed to external services)
errorLogger.critical('System failure', error, errorInfo, { impact: 'high' });
```

### React Component Integration

```typescript
import React, { useEffect } from 'react';
import { errorLogger } from '@/services/errorLogger';

const MyComponent: React.FC = () => {
  useEffect(() => {
    errorLogger.info('Component mounted', { component: 'MyComponent' });
    
    return () => {
      errorLogger.debug('Component unmounted', { component: 'MyComponent' });
    };
  }, []);

  const handleError = (error: Error) => {
    errorLogger.error('Component error', error, undefined, {
      component: 'MyComponent',
      action: 'user-interaction'
    });
  };

  return <div>My Component</div>;
};
```

### Error Boundary Integration

The ErrorLogger is already integrated with the ErrorBoundary component:

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

<ErrorBoundary enableReporting={true}>
  <MyComponent />
</ErrorBoundary>
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
  enableConsoleLogging: true,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  enableLocalStorage: true,
  maxLocalStorageEntries: 100,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  enableStackTrace: true,
  enableUserTracking: true,
};
```

### Updating Configuration

```typescript
import { errorLogger, LogLevel } from '@/services/errorLogger';

// Update specific configuration options
errorLogger.updateConfig({
  minLevel: LogLevel.ERROR,
  enableConsoleLogging: false,
  maxLocalStorageEntries: 200,
});

// Get current configuration
const config = errorLogger.getConfig();
```

## External Service Integration

### Sentry Integration

```typescript
import { errorLogger, ExternalServices } from '@/services/errorLogger';

// Add Sentry service
errorLogger.addExternalService(
  ExternalServices.Sentry('YOUR_SENTRY_DSN')
);
```

### LogRocket Integration

```typescript
errorLogger.addExternalService(
  ExternalServices.LogRocket('YOUR_LOGROCKET_API_KEY')
);
```

### Custom API Integration

```typescript
errorLogger.addExternalService(
  ExternalServices.CustomAPI('https://api.yourservice.com/logs', 'your-api-key')
);
```

### Custom External Service

```typescript
import { ExternalLogService } from '@/services/errorLogger';

const customService: ExternalLogService = {
  name: 'MyCustomService',
  endpoint: 'https://api.myservice.com/logs',
  apiKey: 'my-api-key',
  enabled: true,
  headers: {
    'X-Custom-Header': 'value',
  },
  formatPayload: (entries) => ({
    logs: entries.map(entry => ({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      metadata: {
        error: entry.error,
        context: entry.context,
        sessionId: entry.sessionId,
      },
    })),
  }),
};

errorLogger.addExternalService(customService);
```

## Log Management

### View Log Statistics

```typescript
const stats = errorLogger.getLogStatistics();
console.log('Total logs:', stats.total);
console.log('Error count:', stats.error);
console.log('Critical count:', stats.critical);
```

### View Local Log Entries

```typescript
const entries = errorLogger.getLocalLogEntries();
entries.forEach(entry => {
  console.log(`[${entry.timestamp}] ${entry.message}`);
});
```

### Manual Log Flushing

```typescript
// Flush logs to external services immediately
await errorLogger.flush();
```

### Clear Local Logs

```typescript
errorLogger.clearLocalLogEntries();
```

## React Hooks

### useErrorLogger Hook

```typescript
import { useErrorLogger } from '@/examples/errorLoggerUsage';

const MyComponent: React.FC = () => {
  const { logError, logWarning, logInfo, logDebug } = useErrorLogger('MyComponent');

  const handleSubmit = async () => {
    try {
      logInfo('Form submission started');
      // ... form submission logic
      logInfo('Form submission completed');
    } catch (error) {
      logError('Form submission failed', error as Error, { formData: 'sanitized' });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Higher-Order Component

```typescript
import { withErrorLogging } from '@/examples/errorLoggerUsage';

const MyComponent: React.FC = () => <div>My Component</div>;

export default withErrorLogging(MyComponent);
```

## Log Levels

The ErrorLogger supports five log levels:

- **DEBUG (0)**: Detailed information for debugging (development only)
- **INFO (1)**: General information about application flow
- **WARN (2)**: Warning messages for potentially harmful situations
- **ERROR (3)**: Error events that might still allow the application to continue
- **CRITICAL (4)**: Critical errors that require immediate attention

## Data Sanitization

The ErrorLogger automatically sanitizes sensitive information:

- Email addresses → `[EMAIL_REDACTED]`
- Credit card numbers → `[CARD_REDACTED]`
- Social security numbers → `[SSN_REDACTED]`
- Password fields → `[REDACTED]`
- Token fields → `[REDACTED]`
- API keys → `[REDACTED]`

## Performance Considerations

- **Batching**: Logs are batched and sent in groups to reduce network overhead
- **Async Operations**: All external service calls are asynchronous
- **Local Storage Limits**: Configurable limits prevent storage bloat
- **Minimal Console Impact**: Console logging is optimized for performance
- **Conditional Logging**: Log level filtering reduces unnecessary processing

## Environment-Specific Behavior

### Development
- All log levels are shown in console
- Detailed error information is displayed
- No external service calls by default
- Enhanced debugging information

### Production
- Only WARN and above levels are logged by default
- External services are enabled
- Sensitive information is sanitized
- Performance optimized

### Test
- Minimal logging to avoid test noise
- All external services disabled
- Local storage operations are mocked

## Troubleshooting

### Logs Not Appearing in Console
- Check the `minLevel` configuration
- Ensure `enableConsoleLogging` is true
- Verify the log level of your messages

### External Service Integration Issues
- Verify API keys and endpoints
- Check network connectivity
- Review service-specific formatting requirements
- Check browser console for error messages

### Local Storage Issues
- Check browser storage limits
- Verify `enableLocalStorage` is true
- Clear local storage if corrupted

### Performance Issues
- Reduce `flushInterval` for more frequent batching
- Increase `batchSize` for fewer network calls
- Disable unnecessary features like stack traces

## Best Practices

1. **Use Appropriate Log Levels**: Don't use ERROR for warnings or INFO for debug messages
2. **Provide Context**: Always include relevant context information
3. **Sanitize Sensitive Data**: Be careful not to log sensitive user information
4. **Component Identification**: Include component names in context
5. **Error Categorization**: Use meaningful error categories and severities
6. **Performance Monitoring**: Monitor the impact of logging on application performance
7. **External Service Configuration**: Configure external services appropriately for your environment

## Testing

The ErrorLogger includes comprehensive unit tests. Run them with:

```bash
npm test src/services/__tests__/errorLogger.test.ts
```

## Demo

A comprehensive demo component is available at `src/examples/errorLoggerUsage.tsx` that demonstrates all features of the ErrorLogger.