# Error Boundary Testing Utilities

This document describes the comprehensive testing utilities created for testing error boundaries in the frontend application.

## Overview

The error boundary testing utilities provide a complete framework for testing error handling scenarios, including error simulation, test helpers, and verification functions. These utilities ensure that error boundaries work correctly across different error types, user interactions, and system states.

## Files Structure

```
src/test/
├── errorBoundaryTestUtils.ts      # Core testing utilities and error simulation
├── errorBoundaryHelpers.tsx       # React components and test helpers
├── __tests__/
│   └── errorBoundaryTestUtils.test.ts  # Unit tests for utilities
├── integration/
│   └── errorBoundary.integration.test.tsx  # Integration tests
└── README_ErrorBoundaryTesting.md # This documentation
```

## Core Components

### 1. ErrorSimulator

The `ErrorSimulator` class provides methods to create different types of errors for testing:

```typescript
// Create specific error types
const syntaxError = ErrorSimulator.createSyntaxError();
const networkError = ErrorSimulator.createNetworkError();
const systemError = ErrorSimulator.createSystemError();
const userError = ErrorSimulator.createUserError();
const runtimeError = ErrorSimulator.createRuntimeError();

// Create errors with custom configuration
const error = ErrorSimulator.createError({
  type: 'network',
  message: 'Custom error message',
  severity: 'high'
});
```

**Supported Error Types:**
- `syntax` - JavaScript syntax errors (Critical severity)
- `network` - Network and API errors (High severity)
- `system` - System resource errors (High severity)
- `user` - User input validation errors (Low severity)
- `runtime` - Runtime JavaScript errors (Medium severity)
- `chunk-load` - Module loading errors (Critical severity)
- `memory` - Memory-related errors (Critical severity)
- `permission` - Access permission errors (High severity)

### 2. ErrorBoundaryTestHelpers

Provides mock utilities for testing error boundary functionality:

```typescript
// Create comprehensive mock environment
const mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();

// Individual mocks
const mockConsole = ErrorBoundaryTestHelpers.mockConsoleError();
const mockStorage = ErrorBoundaryTestHelpers.mockLocalStorage();
const mockFetch = ErrorBoundaryTestHelpers.mockFetch();
const mockLocation = ErrorBoundaryTestHelpers.mockWindowLocation();
const mockHistory = ErrorBoundaryTestHelpers.mockWindowHistory();

// Cleanup
mockEnv.cleanup();
```

### 3. Test Components

#### ErrorThrowingComponent

A configurable component that can throw errors in different scenarios:

```typescript
<ErrorThrowingComponent
  shouldThrow={true}
  errorType="network"
  throwOnMount={true}
  throwOnUpdate={false}
  throwOnRender={false}
  throwOnClick={true}
  throwAfterDelay={1000}
  customError={customError}
  onBeforeThrow={() => console.log('About to throw')}
  onAfterThrow={(error) => console.log('Threw error:', error)}
/>
```

#### AsyncErrorComponent

Tests async error scenarios:

```typescript
<AsyncErrorComponent
  shouldThrow={true}
  errorType="network"
  operation="fetch"
  delay={100}
  onError={(error) => console.log('Async error:', error)}
/>
```

#### LifecycleErrorComponent

Tests errors in different React lifecycle methods:

```typescript
<LifecycleErrorComponent
  throwInConstructor={true}
  throwInRender={false}
  throwInComponentDidMount={false}
  throwInComponentDidUpdate={false}
  errorType="runtime"
/>
```

### 4. ErrorBoundaryVerifier

Provides assertion utilities for verifying error boundary behavior:

```typescript
// Verify error state
ErrorBoundaryVerifier.verifyErrorState(container);
ErrorBoundaryVerifier.verifyErrorType(container, 'network');
ErrorBoundaryVerifier.verifyErrorSeverity(container, 'high');

// Verify UI elements
ErrorBoundaryVerifier.verifyRetryAvailable(container);
ErrorBoundaryVerifier.verifyReportingAvailable(container);
ErrorBoundaryVerifier.verifyNavigationOptions(container);

// Verify error context
ErrorBoundaryVerifier.verifyErrorContext(container, {
  component: 'TestComponent',
  route: '/test',
  sessionId: 'session-123'
});

// Verify error isolation
ErrorBoundaryVerifier.verifyErrorIsolation(container);
```

### 5. ErrorBoundaryTestActions

High-level test actions for common error boundary testing scenarios:

```typescript
// Render with error
const { container, errorBoundary } = ErrorBoundaryTestActions.renderWithError({
  type: 'network',
  message: 'Test error'
}, {
  enableReporting: true,
  showErrorDetails: true
});

// Test retry functionality
await ErrorBoundaryTestActions.testRetryFunctionality(container);

// Test error reporting
await ErrorBoundaryTestActions.testErrorReporting(container, mockFetch);

// Test navigation
await ErrorBoundaryTestActions.testNavigation(container, mockHistory);

// Test error details
await ErrorBoundaryTestActions.testErrorDetails(container);
```

## Test Scenarios

### 1. Error Type Testing

Tests different error types and their categorization:

```typescript
describe('Error Type Scenarios', () => {
  it('should handle syntax errors with critical severity', async () => {
    const { container } = ErrorBoundaryTestActions.renderWithError({
      type: 'syntax',
      message: 'Unexpected token'
    });

    ErrorBoundaryVerifier.verifyErrorType(container, 'syntax');
    ErrorBoundaryVerifier.verifyErrorSeverity(container, 'critical');
  });
});
```

### 2. Error Timing Testing

Tests errors that occur at different times:

```typescript
describe('Error Timing Scenarios', () => {
  it('should handle errors thrown during component mount', async () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent
          shouldThrow={true}
          throwOnMount={true}
        />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });
});
```

### 3. User Interaction Testing

Tests errors triggered by user interactions:

```typescript
describe('User Interaction Scenarios', () => {
  it('should handle errors triggered by click events', async () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent
          shouldThrow={true}
          throwOnClick={true}
        />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByTestId('error-throwing-component'));

    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });
});
```

### 4. Recovery Testing

Tests error recovery mechanisms:

```typescript
describe('Error Recovery Scenarios', () => {
  it('should handle successful retry after error', async () => {
    let shouldThrow = true;
    
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    // Verify error state
    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    // Simulate successful retry
    shouldThrow = false;
    fireEvent.click(screen.getByTestId('retry-button'));
    
    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    // Verify recovery
    await waitFor(() => {
      expect(screen.getByTestId('error-throwing-component')).toBeInTheDocument();
    });
  });
});
```

### 5. Integration Testing

Tests error boundaries with other system components:

```typescript
describe('Integration Tests', () => {
  it('should handle complete error-to-recovery workflow', async () => {
    const mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
    
    try {
      // Test complete workflow including:
      // - Error catching and display
      // - Error reporting
      // - Error details
      // - Retry functionality
      // - Navigation
      await ErrorBoundaryTestScenarios.testCompleteErrorRecovery();
    } finally {
      mockEnv.cleanup();
    }
  });
});
```

## Usage Examples

### Basic Error Testing

```typescript
import { ErrorBoundaryTestActions, ErrorSimulator } from '../test/errorBoundaryTestUtils';

describe('MyComponent Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const { container } = ErrorBoundaryTestActions.renderWithError({
      type: 'network',
      message: 'Failed to load data'
    }, {
      enableReporting: true
    });

    // Verify error is displayed
    expect(container.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
    
    // Verify network-specific UI
    expect(container.querySelector('[data-testid="network-error-ui"]')).toBeInTheDocument();
    
    // Test retry functionality
    await ErrorBoundaryTestActions.testRetryFunctionality(container);
  });
});
```

### Custom Error Testing

```typescript
describe('Custom Error Scenarios', () => {
  it('should handle custom business logic errors', async () => {
    const customError = new Error('Business rule violation');
    customError.name = 'BusinessError';

    render(
      <ErrorBoundary showErrorDetails={true}>
        <ErrorThrowingComponent
          shouldThrow={true}
          customError={customError}
          throwOnRender={true}
        />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    // Verify custom error is handled
    expect(screen.getByText(/Business rule violation/)).toBeInTheDocument();
  });
});
```

### Async Error Testing

```typescript
describe('Async Error Scenarios', () => {
  it('should handle async operation failures', async () => {
    render(
      <ErrorBoundary>
        <AsyncErrorComponent
          shouldThrow={true}
          errorType="network"
          operation="fetch"
          delay={100}
        />
      </ErrorBoundary>
    );

    // Should show loading initially
    expect(screen.getByTestId('async-loading')).toBeInTheDocument();

    // Wait for async error
    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    }, { timeout: 200 });
  });
});
```

## Best Practices

### 1. Test Organization

- Group tests by error type or scenario
- Use descriptive test names that explain the scenario
- Include both positive and negative test cases
- Test edge cases and error conditions

### 2. Mock Management

- Always clean up mocks after tests
- Use the comprehensive mock environment for integration tests
- Restore original functions to prevent test interference
- Mock external dependencies consistently

### 3. Async Testing

- Use `waitFor` for async operations
- Set appropriate timeouts for different scenarios
- Test both successful and failed async operations
- Handle race conditions properly

### 4. Error Verification

- Verify error categorization and severity
- Check that appropriate UI elements are displayed
- Test error context collection
- Verify error reporting functionality

### 5. Recovery Testing

- Test all recovery mechanisms (retry, navigation, reset)
- Verify state cleanup during recovery
- Test recovery under different error conditions
- Ensure recovery doesn't cause additional errors

## Configuration

### Test Environment Setup

The utilities automatically set up a comprehensive test environment including:

- Mocked browser APIs (localStorage, sessionStorage, fetch)
- Mocked navigation (window.location, window.history)
- Mocked console functions for error logging
- Proper cleanup mechanisms

### Custom Configuration

You can customize the testing environment:

```typescript
// Custom mock environment
const customMockEnv = {
  ...ErrorBoundaryTestHelpers.createMockEnvironment(),
  // Add custom mocks
  customAPI: vi.fn(),
};

// Custom error configurations
const customErrorConfig = {
  type: 'custom' as ErrorType,
  severity: 'critical' as ErrorSeverity,
  message: 'Custom error message',
  shouldRecover: false,
};
```

## Troubleshooting

### Common Issues

1. **Tests not finding error boundary elements**
   - Ensure error boundary has proper test IDs
   - Check that error is actually being thrown
   - Verify async operations complete before assertions

2. **Mock cleanup issues**
   - Always call `mockEnv.cleanup()` in `afterEach`
   - Use proper mock restoration
   - Avoid mock leakage between tests

3. **Async timing issues**
   - Use appropriate timeouts in `waitFor`
   - Ensure async operations complete
   - Handle race conditions properly

4. **Error not being caught**
   - Verify error is thrown in render or lifecycle method
   - Check error boundary configuration
   - Ensure error boundary is properly wrapped around component

### Debugging Tips

- Use `screen.debug()` to see current DOM state
- Add console logs in error handlers
- Check mock call history for debugging
- Use React DevTools for component state inspection

## Requirements Coverage

This testing utility suite covers all requirements from the specification:

- **5.1**: Error boundary testing utilities for different scenarios ✅
- **5.2**: Error context preservation during testing ✅
- **5.3**: Error information in test reports ✅
- **5.4**: Integration with testing frameworks ✅
- **5.5**: Error debugging utilities for test environments ✅

The utilities provide comprehensive coverage for testing error boundaries across all error types, user interactions, recovery mechanisms, and integration scenarios.