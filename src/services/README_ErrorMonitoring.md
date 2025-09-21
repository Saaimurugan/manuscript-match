# Error Monitoring and Analytics System

A comprehensive error monitoring and analytics system for React applications that provides real-time error tracking, performance monitoring, alerting, and detailed analytics.

## Features

### 🔍 Error Tracking
- **Comprehensive Error Collection**: Captures errors with full context including stack traces, component information, user data, and environment details
- **Error Categorization**: Automatically categorizes errors by type (syntax, runtime, network, user, system)
- **Severity Assessment**: Assigns severity levels (low, medium, high, critical) based on error characteristics
- **Unique Error IDs**: Generates unique identifiers for tracking and correlation

### 📊 Analytics and Reporting
- **Real-time Metrics**: Error rates, counts, and trends with configurable time windows
- **Component Health Monitoring**: Track error rates and health scores per component
- **Error Analysis**: Top errors, resolution rates, and trend analysis
- **Interactive Dashboard**: React component for visualizing error data

### 🚨 Alerting System
- **Configurable Thresholds**: Set custom thresholds for error rates and critical errors
- **Multiple Alert Channels**: Console, webhook, and email notifications
- **Rate Limiting**: Prevents alert spam with intelligent rate limiting
- **Environment-aware**: Different alert configurations per environment

### ⚡ Performance Monitoring
- **Render Performance**: Track slow component renders and performance bottlenecks
- **Error Handling Performance**: Monitor the performance impact of error handling
- **Memory Leak Detection**: Identify potential memory leaks in error handling code
- **Performance Observer Integration**: Uses browser APIs for accurate measurements

### 🔗 External Integrations
- **Sentry Integration**: Seamless integration with Sentry error tracking
- **Custom Webhooks**: Send error data to custom endpoints
- **Email Notifications**: Configurable email alerts for critical errors
- **Extensible Architecture**: Easy to add new integrations

## Installation and Setup

### 1. Import the Error Monitoring Service

```typescript
import { errorMonitoring } from '@/services/errorMonitoring';
import { getErrorMonitoringConfig } from '@/config/errorMonitoring.config';
```

### 2. Initialize in Your App

```typescript
// In your main App component or index file
useEffect(() => {
  const config = getErrorMonitoringConfig();
  console.log('Error monitoring initialized:', config);
  
  return () => {
    errorMonitoring.cleanup();
  };
}, []);
```

### 3. Use React Hooks in Components

```typescript
import { useErrorMonitoring } from '@/hooks/useErrorMonitoring';

const MyComponent = () => {
  const { trackError, isMonitoring } = useErrorMonitoring('MyComponent');
  
  const handleError = (error: Error) => {
    trackError({
      message: error.message,
      severity: 'high',
      category: 'runtime',
      stack: error.stack
    });
  };
  
  return <div>...</div>;
};
```

## Usage Examples

### Basic Error Tracking

```typescript
import { useErrorMonitoring } from '@/hooks/useErrorMonitoring';

const DataFetchingComponent = () => {
  const { trackError } = useErrorMonitoring('DataFetching');
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      trackError({
        message: error.message,
        severity: 'high',
        category: 'network',
        responseTime: performance.now()
      });
      throw error;
    }
  };
  
  return <div>...</div>;
};
```

### Performance Monitoring

```typescript
import { usePerformanceMonitoring } from '@/hooks/useErrorMonitoring';

const PerformanceAwareComponent = () => {
  const { renderTime, renderCount } = usePerformanceMonitoring('MyComponent');
  
  // Component automatically tracks render performance
  // Slow renders (>16ms) are automatically reported as errors
  
  return (
    <div>
      <p>Render time: {renderTime.toFixed(2)}ms</p>
      <p>Render count: {renderCount}</p>
    </div>
  );
};
```

### Error Boundary Integration

```typescript
import { useErrorBoundaryMonitoring } from '@/hooks/useErrorMonitoring';

class MyErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Error monitoring is automatically integrated in the main ErrorBoundary
    // This is just an example of manual integration
    errorMonitoring.trackError({
      errorId: `boundary-${Date.now()}`,
      message: error.message,
      severity: 'critical',
      category: 'runtime',
      component: 'ErrorBoundary',
      stack: error.stack,
      // ... other metadata
    });
  }
}
```

### Analytics Dashboard

```typescript
import ErrorAnalyticsDashboard from '@/components/error/ErrorAnalyticsDashboard';

const AdminPanel = () => {
  return (
    <div>
      <h1>Error Analytics</h1>
      <ErrorAnalyticsDashboard 
        showDetailedMetrics={true}
        refreshInterval={30000}
        className="my-custom-class"
      />
    </div>
  );
};
```

## Configuration

### Environment-based Configuration

The system supports different configurations for development, staging, and production environments:

```typescript
// config/errorMonitoring.config.ts
const productionConfig = {
  enabled: true,
  environment: 'production',
  alerts: {
    errorRateThreshold: 5,
    criticalErrorThreshold: 2,
    timeWindowMinutes: 15,
    alertChannels: ['webhook', 'email']
  },
  integrations: {
    sentry: {
      enabled: true,
      dsn: process.env.REACT_APP_SENTRY_DSN
    }
  }
};
```

### Environment Variables

Set these environment variables for full functionality:

```bash
# Sentry Integration
REACT_APP_SENTRY_DSN=your_sentry_dsn_here

# Webhook Alerts
REACT_APP_ERROR_WEBHOOK_URL=https://your-webhook-url.com
REACT_APP_WEBHOOK_TOKEN=your_webhook_token

# Email Alerts
REACT_APP_ERROR_EMAIL_RECIPIENTS=admin@example.com,dev@example.com

# Version Tracking
REACT_APP_VERSION=1.0.0
```

## API Reference

### ErrorMonitoringService

#### Methods

- `trackError(error: ErrorMetrics)`: Track an error occurrence
- `getErrorRateMetrics(timeWindowMinutes?: number)`: Get error rate metrics
- `getErrorAnalysis()`: Get comprehensive error analysis
- `markErrorResolved(errorId: string)`: Mark an error as resolved
- `getMonitoringStatus()`: Get current monitoring status
- `cleanup()`: Clean up resources

#### Events

The service automatically sets up global error handlers for:
- Unhandled JavaScript errors (`window.onerror`)
- Unhandled promise rejections (`window.onunhandledrejection`)

### React Hooks

#### useErrorMonitoring(componentName?: string)

Returns:
- `trackError(error: Partial<ErrorMetrics>)`: Track an error
- `getErrorMetrics(timeWindow?: number)`: Get metrics
- `getErrorAnalysis()`: Get analysis
- `markErrorResolved(errorId: string)`: Mark resolved
- `monitoringStatus`: Current status
- `isMonitoring`: Boolean status

#### usePerformanceMonitoring(componentName: string)

Returns:
- `renderTime`: Last render time in ms
- `renderCount`: Total render count
- `averageRenderTime`: Average render time

#### useErrorBoundaryMonitoring()

Returns:
- `trackBoundaryError(error, errorInfo, componentStack?)`: Track boundary errors

### ErrorAnalyticsDashboard Props

```typescript
interface ErrorAnalyticsDashboardProps {
  className?: string;
  refreshInterval?: number; // milliseconds
  showDetailedMetrics?: boolean;
}
```

## Data Models

### ErrorMetrics

```typescript
interface ErrorMetrics {
  errorId: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'syntax' | 'runtime' | 'network' | 'user' | 'system';
  component?: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  resolved: boolean;
  responseTime?: number;
}
```

### ErrorRateMetrics

```typescript
interface ErrorRateMetrics {
  timeWindow: string;
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  componentErrors: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  averageResponseTime: number;
}
```

## Testing

The system includes comprehensive test suites:

- **Unit Tests**: `src/services/__tests__/errorMonitoring.test.ts`
- **Hook Tests**: `src/hooks/__tests__/useErrorMonitoring.test.tsx`
- **Component Tests**: `src/components/error/__tests__/ErrorAnalyticsDashboard.test.tsx`

Run tests with:
```bash
npm test errorMonitoring
```

## Performance Considerations

### Memory Management
- Automatically limits stored errors to prevent memory leaks
- Configurable data retention policies
- Efficient cleanup of old error data

### Performance Impact
- Minimal overhead in production (< 1ms per error)
- Asynchronous error reporting
- Configurable sampling rates

### Storage
- Uses sessionStorage for temporary data
- Optional localStorage for persistence
- Automatic cleanup of old data

## Security and Privacy

### Data Sanitization
- Automatic removal of sensitive information
- Configurable data exclusion rules
- GDPR-compliant data handling

### Privacy Controls
- User consent mechanisms
- Configurable data collection
- Secure data transmission

## Troubleshooting

### Common Issues

1. **Monitoring not active**
   - Check configuration: `getErrorMonitoringConfig()`
   - Verify environment variables
   - Check console for initialization errors

2. **Alerts not firing**
   - Verify alert thresholds in configuration
   - Check webhook URL and credentials
   - Review alert channel configuration

3. **Performance impact**
   - Adjust sampling rates in configuration
   - Review data retention settings
   - Check for memory leaks in error handling

### Debug Mode

Enable debug logging in development:

```typescript
// In development environment
console.log('Error monitoring config:', getErrorMonitoringConfig());
console.log('Monitoring status:', errorMonitoring.getMonitoringStatus());
```

## Contributing

When contributing to the error monitoring system:

1. Add tests for new features
2. Update configuration options as needed
3. Document new APIs and features
4. Consider performance impact
5. Ensure privacy compliance

## License

This error monitoring system is part of the larger application and follows the same license terms.