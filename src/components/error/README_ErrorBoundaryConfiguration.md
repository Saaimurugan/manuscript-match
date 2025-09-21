# Error Boundary Configuration and Customization

This document describes the comprehensive configuration and customization system for Error Boundaries, providing flexible error handling for different environments and use cases.

## Overview

The Error Boundary system provides:
- **Configurable behavior** for different environments (development, production, test)
- **Customizable UI components** with multiple themes
- **Wrapper utilities** for common use cases
- **Composition patterns** for complex component hierarchies
- **Factory and registry patterns** for dynamic error boundary creation

## Configuration System

### Basic Configuration

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const config = {
  theme: 'default',
  enableReporting: true,
  showErrorDetails: false,
  maxRetries: 3,
  messages: {
    title: 'Something went wrong',
    description: 'Please try again or contact support.',
    retryButton: 'Try Again',
    homeButton: 'Go Home',
    reportButton: 'Report Issue',
    refreshButton: 'Refresh Page'
  }
};

<ErrorBoundary config={config}>
  <YourComponent />
</ErrorBoundary>
```

### Configuration Options

#### Core Settings
- `environment`: Environment type ('development' | 'production' | 'test' | 'staging')
- `enableReporting`: Enable/disable error reporting functionality
- `enableAutoRecovery`: Enable automatic error recovery attempts
- `enableIsolation`: Isolate errors to prevent cascading failures
- `showErrorDetails`: Show detailed error information to users

#### Retry Configuration
- `maxRetries`: Maximum number of retry attempts (0-10)
- `retryDelay`: Delay between retry attempts in milliseconds
- `autoRetryEnabled`: Enable automatic retry for recoverable errors

#### UI Customization
- `theme`: UI theme ('default' | 'minimal' | 'detailed' | 'custom')
- `showStackTrace`: Show error stack trace (development only)
- `showComponentStack`: Show React component stack
- `showUserActions`: Show user action history

#### Button Configuration
- `enableRetryButton`: Show retry button
- `enableHomeButton`: Show home/back button
- `enableReportButton`: Show error reporting button
- `enableRefreshButton`: Show page refresh button

#### Logging Configuration
- `logLevel`: Logging level ('none' | 'error' | 'warn' | 'info' | 'debug')
- `enableConsoleLogging`: Enable console logging
- `enableRemoteLogging`: Enable remote error tracking

#### Custom Messages
```typescript
messages: {
  title: string;
  description: string;
  retryButton: string;
  homeButton: string;
  reportButton: string;
  refreshButton: string;
}
```

## Environment-Specific Configuration

### Development Configuration
```typescript
import { configHelpers } from '@/config/errorBoundary.config';

const devConfig = configHelpers.forDevelopment();
// Includes: detailed errors, stack traces, console logging
```

### Production Configuration
```typescript
const prodConfig = configHelpers.forProduction();
// Includes: minimal UI, remote logging, user-friendly messages
```

### Test Configuration
```typescript
const testConfig = configHelpers.forTesting();
// Includes: error isolation, no reporting, minimal UI
```

## UI Themes

### Default Theme
Balanced functionality with clean design, suitable for most applications.

### Minimal Theme
Simple, compact error display with essential actions only.

### Detailed Theme
Comprehensive error information with collapsible details, ideal for development or admin interfaces.

### Custom Theme
Allows complete customization of error UI components.

## Wrapper Utilities

### Page-Level Error Boundary
```typescript
import { PageErrorBoundary } from '@/components/error/ErrorBoundaryWrappers';

<PageErrorBoundary>
  <YourPageContent />
</PageErrorBoundary>
```

### Component-Level Error Boundary
```typescript
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundaryWrappers';

<ComponentErrorBoundary>
  <YourComponent />
</ComponentErrorBoundary>
```

### Form-Specific Error Boundary
```typescript
import { FormErrorBoundary } from '@/components/error/ErrorBoundaryWrappers';

<FormErrorBoundary>
  <YourForm />
</FormErrorBoundary>
```

### Modal-Specific Error Boundary
```typescript
import { ModalErrorBoundary } from '@/components/error/ErrorBoundaryWrappers';

<ModalErrorBoundary>
  <YourModal />
</ModalErrorBoundary>
```

### Higher-Order Component
```typescript
import { withErrorBoundary } from '@/components/error/ErrorBoundaryWrappers';

const EnhancedComponent = withErrorBoundary(YourComponent, {
  theme: 'minimal',
  enableReporting: false
});
```

## Composition Patterns

### Hierarchical Error Boundaries
```typescript
import { ErrorBoundaryHierarchy } from '@/components/error/ErrorBoundaryComposition';

<ErrorBoundaryHierarchy
  appConfig={{ theme: 'default', enableReporting: true }}
  pageConfig={{ theme: 'default', enableIsolation: true }}
  sectionConfig={{ theme: 'minimal' }}
  componentConfig={{ enableReporting: false }}
>
  <YourApp />
</ErrorBoundaryHierarchy>
```

### Route-Based Configuration
```typescript
import { RouteErrorBoundary } from '@/components/error/ErrorBoundaryComposition';

const routeConfigs = {
  '/dashboard': { theme: 'default', enableReporting: true },
  '/admin': { theme: 'detailed', showErrorDetails: true },
  '/public': { theme: 'minimal', enableReporting: false }
};

<RouteErrorBoundary routeConfigs={routeConfigs}>
  <YourRoutes />
</RouteErrorBoundary>
```

### Feature-Based Configuration
```typescript
import { FeatureErrorBoundary } from '@/components/error/ErrorBoundaryComposition';

const featureConfigs = {
  'user-management': { theme: 'default', enableReporting: true },
  'file-upload': { maxRetries: 5, theme: 'minimal' }
};

<FeatureErrorBoundary feature="user-management" featureConfigs={featureConfigs}>
  <UserManagementComponent />
</FeatureErrorBoundary>
```

### Composed Error Boundaries
```typescript
import { ComposedErrorBoundary } from '@/components/error/ErrorBoundaryComposition';

const boundaries = [
  { level: 'app', config: { enableReporting: true } },
  { level: 'page', config: { enableIsolation: true } },
  { level: 'component', config: { theme: 'minimal' } }
];

<ComposedErrorBoundary boundaries={boundaries} isolationStrategy="cascade">
  <YourContent />
</ComposedErrorBoundary>
```

## Factory Pattern

### Creating Boundaries Dynamically
```typescript
import { ErrorBoundaryFactory } from '@/components/error/ErrorBoundaryComposition';

// Set default configuration
ErrorBoundaryFactory.setDefaultConfig({
  enableReporting: true,
  theme: 'default'
});

// Create specific boundary types
const CustomPageBoundary = ErrorBoundaryFactory.createPageBoundary({
  maxRetries: 5
});

const CustomFormBoundary = ErrorBoundaryFactory.createFormBoundary({
  theme: 'minimal'
});
```

## Registry Pattern

### Managing Named Boundaries
```typescript
import { ErrorBoundaryRegistry } from '@/components/error/ErrorBoundaryComposition';

// Register named boundaries
ErrorBoundaryRegistry.createNamed('dashboard-boundary', {
  theme: 'default',
  enableReporting: true
}, 'page');

// Use registered boundaries
const DashboardBoundary = ErrorBoundaryRegistry.use('dashboard-boundary');

<DashboardBoundary>
  <DashboardContent />
</DashboardBoundary>
```

## Global Configuration Management

### Setting Global Defaults
```typescript
import { errorBoundaryConfig } from '@/config/errorBoundary.config';

// Update global configuration
errorBoundaryConfig.updateConfig({
  theme: 'default',
  enableReporting: true,
  logLevel: 'error'
});

// Set environment-specific configuration
errorBoundaryConfig.setEnvironmentConfig('production', {
  showErrorDetails: false,
  enableRemoteLogging: true
});
```

### Configuration Validation
```typescript
const validation = errorBoundaryConfig.validateConfig({
  maxRetries: 3,
  retryDelay: 1000,
  theme: 'default'
});

if (!validation.valid) {
  console.error('Invalid configuration:', validation.errors);
}
```

## Best Practices

### 1. Environment-Specific Configuration
- Use detailed themes and error information in development
- Use minimal themes and hide sensitive information in production
- Disable reporting and use isolation in test environments

### 2. Hierarchical Error Handling
- Place page-level boundaries at route components
- Use component-level boundaries for isolated features
- Apply form-specific boundaries for form components
- Use modal-specific boundaries for dialog components

### 3. Error Isolation Strategy
- Use `cascade` strategy for balanced error handling
- Use `isolate` strategy for critical applications
- Use `bubble` strategy for debugging scenarios

### 4. Performance Considerations
- Minimize the number of nested error boundaries
- Use component-level boundaries sparingly
- Configure appropriate retry limits
- Enable auto-recovery only for recoverable errors

### 5. User Experience
- Provide clear, actionable error messages
- Offer appropriate recovery options
- Maintain consistent error handling across the application
- Consider user roles when configuring error details

## Integration Examples

### With React Router
```typescript
import { RouteErrorBoundary } from '@/components/error/ErrorBoundaryComposition';

const App = () => (
  <Router>
    <RouteErrorBoundary routeConfigs={routeConfigs}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </RouteErrorBoundary>
  </Router>
);
```

### With State Management
```typescript
const AppWithErrorHandling = () => {
  const userRole = useSelector(state => state.user.role);
  
  const config = useMemo(() => ({
    theme: userRole === 'admin' ? 'detailed' : 'default',
    showErrorDetails: userRole === 'admin',
    enableReporting: true
  }), [userRole]);

  return (
    <ErrorBoundary config={config}>
      <App />
    </ErrorBoundary>
  );
};
```

### With Error Tracking Services
```typescript
const config = {
  enableReporting: true,
  monitoring: {
    enabled: true,
    service: 'sentry',
    apiKey: process.env.REACT_APP_SENTRY_KEY
  }
};

<ErrorBoundary config={config} onError={handleSentryError}>
  <App />
</ErrorBoundary>
```

This configuration system provides comprehensive control over error boundary behavior while maintaining simplicity for common use cases.