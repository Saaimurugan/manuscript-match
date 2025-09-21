# Error Context Preservation for Testing

This module provides comprehensive error context preservation during automated testing, ensuring that error information is captured, analyzed, and made available to test reports and debugging tools.

## Overview

The error context preservation system consists of three main components:

1. **Error Context Collector** - Captures comprehensive error information
2. **Testing Framework Integration** - Integrates with Vitest, Jest, Playwright, and Cypress
3. **Error Debugging Utilities** - Provides analysis and debugging tools

## Features

### Enhanced Error Boundaries for Testing

The enhanced ErrorBoundary component automatically integrates with the testing framework when running in a test environment:

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

// In test environment, ErrorBoundary automatically:
// - Preserves error context
// - Emits test-specific events
// - Stores debugging information
// - Integrates with test frameworks
```

### Error Context Collection

Comprehensive error context is automatically collected:

```typescript
interface TestErrorContext {
  errorId: string;
  timestamp: string;
  testName?: string;
  testFile?: string;
  testSuite?: string;
  component: string;
  props: Record<string, any>;
  route: string;
  userAgent: string;
  sessionId: string;
  stackTrace?: string;
  componentStack?: string;
  errorCategory: string;
  errorSeverity: string;
  retryCount: number;
  testFramework: 'vitest' | 'jest' | 'playwright' | 'cypress';
  buildInfo?: BuildInfo;
}
```

### Test Framework Integration

Automatic integration with popular testing frameworks:

#### Vitest Integration
```typescript
// Automatically detects Vitest environment
// Stores error reports in global.__ERROR_BOUNDARY_REPORTS__
// Hooks into test lifecycle for cleanup
```

#### Jest Integration
```typescript
// Detects Jest environment
// Integrates with jasmine.currentSpec
// Provides error reports in test output
```

#### Playwright Integration
```typescript
// Exposes getErrorBoundaryReports() to browser context
// Emits custom events for Playwright to capture
// Stores reports in window.__ERROR_BOUNDARY_REPORTS__
```

#### Cypress Integration
```typescript
// Adds custom Cypress commands:
// cy.getErrorBoundaryReports()
// cy.clearErrorBoundaryReports()
```

### Error Analysis and Debugging

Automatic error analysis with categorization:

```typescript
interface ErrorAnalysis {
  errorId: string;
  category: 'critical' | 'recoverable' | 'expected' | 'flaky';
  rootCause: string;
  suggestions: string[];
  relatedErrors: string[];
  testImpact: 'blocking' | 'warning' | 'informational';
  debuggingSteps: string[];
}
```

## Usage

### Basic Usage

The system works automatically when running tests. No additional setup required:

```typescript
import { render } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

test('error handling', () => {
  render(
    <ErrorBoundary>
      <ComponentThatThrowsError />
    </ErrorBoundary>
  );
  
  // Error context is automatically preserved
  // Available in test reports and debugging tools
});
```

### Advanced Usage with Debugging

For enhanced debugging capabilities:

```typescript
import { TestDebuggingHelpers } from '@/test/errorDebuggingUtils';

test('error handling with debugging', () => {
  const debugWrapper = TestDebuggingHelpers.createDebugErrorBoundary('my test');
  
  render(
    <ErrorBoundary onError={debugWrapper.onError}>
      <ComponentThatThrowsError />
    </ErrorBoundary>
  );
  
  // Get comprehensive debugging report
  const report = debugWrapper.getReport();
  console.log(report);
  
  debugWrapper.endSession('Test completed');
});
```

### Error Assertions

Enhanced error assertions with debugging context:

```typescript
import { TestDebuggingHelpers, errorBoundaryTestIntegration } from '@/test';

test('specific error handling', () => {
  // ... render component that should throw error
  
  // Assert specific error occurred
  const errorReport = TestDebuggingHelpers.assertErrorWithDebugging(
    { 
      component: 'MyComponent',
      message: 'Expected error message'
    },
    'my test name'
  );
  
  expect(errorReport.context.component).toBe('MyComponent');
  
  // Assert no unexpected errors
  errorBoundaryTestIntegration.assertNoErrorBoundaryErrors();
});
```

### Manual Error Context Collection

For custom error handling scenarios:

```typescript
import { testErrorContextCollector } from '@/test/errorContextPreservation';

try {
  // Some operation that might throw
} catch (error) {
  const errorInfo = { componentStack: '...' };
  const context = testErrorContextCollector.collectErrorContext(error, errorInfo);
  const report = testErrorContextCollector.createTestErrorReport(error, errorInfo, context);
  
  // Report is automatically stored and available to test framework
}
```

## Test Framework Specific Features

### Vitest

```typescript
// Access error reports in Vitest tests
const errorReports = global.__ERROR_BOUNDARY_REPORTS__;

// Automatic cleanup after each test
// Integration with Vitest's test lifecycle
```

### Playwright

```typescript
// In Playwright tests
const errorReports = await page.evaluate(() => {
  return window.getErrorBoundaryReports();
});

// Listen for error boundary events
await page.evaluate(() => {
  window.addEventListener('error-boundary-error', (event) => {
    console.log('Error occurred:', event.detail);
  });
});
```

### Cypress

```typescript
// In Cypress tests
cy.getErrorBoundaryReports().then((reports) => {
  expect(reports).to.have.length(1);
});

cy.clearErrorBoundaryReports();
```

## Configuration

### Test Integration Configuration

```typescript
import { ErrorBoundaryTestIntegration } from '@/test/testingFrameworkIntegration';

const integration = ErrorBoundaryTestIntegration.getInstance({
  framework: 'vitest',
  captureDOM: true,
  captureConsole: true,
  captureNetwork: false,
  captureStorage: true,
  emitToReporter: true,
  preserveContext: true,
});

integration.initialize();
```

### Debugging Configuration

```typescript
import { errorDebuggingUtils } from '@/test/errorDebuggingUtils';

// Enable/disable debugging information collection
errorDebuggingUtils.setDebuggingEnabled(true);

// Start custom debug session
const sessionId = errorDebuggingUtils.startDebugSession('custom session');
```

## Error Categories

The system automatically categorizes errors:

- **Critical**: Syntax errors, missing modules, compilation failures
- **Flaky**: Network errors, timeouts, race conditions
- **Expected**: Errors from test components, intentional error scenarios
- **Recoverable**: Runtime errors that can be handled gracefully

## Debugging Reports

Comprehensive debugging reports include:

- Error details and stack traces
- Component context and props
- Test metadata and environment info
- Suggested fixes and debugging steps
- Related errors and patterns
- Debug actions taken during investigation

## Best Practices

1. **Use Enhanced Error Boundaries**: Always use the enhanced ErrorBoundary component for better test integration

2. **Enable Debugging in Development**: Use debug wrappers during test development for better insights

3. **Assert Expected Errors**: Use specific error assertions to verify error handling works correctly

4. **Review Error Reports**: Regularly review error reports to identify patterns and improve error handling

5. **Clean Up After Tests**: The system automatically cleans up, but you can manually clear data if needed

## Troubleshooting

### Common Issues

1. **Error reports not appearing**: Ensure you're running in a test environment and the integration is initialized

2. **Missing test metadata**: Verify your test framework is properly detected

3. **Performance issues**: Disable debugging information collection in performance-critical tests

### Debug Commands

```typescript
// Check if test environment is detected
import { isTestEnvironment } from '@/test/errorContextPreservation';
console.log('Test environment:', isTestEnvironment());

// Get all error reports
import { testErrorContextCollector } from '@/test/errorContextPreservation';
console.log('Error reports:', testErrorContextCollector.getAllErrorReports());

// Export debugging data
import { errorDebuggingUtils } from '@/test/errorDebuggingUtils';
console.log('Debug data:', errorDebuggingUtils.exportDebuggingData());
```

## API Reference

### TestErrorContextCollector

- `collectErrorContext(error, errorInfo, additionalContext?)` - Collect error context
- `createTestErrorReport(error, errorInfo, context)` - Create comprehensive report
- `getAllErrorReports()` - Get all error reports
- `clearErrorReports()` - Clear all reports
- `exportErrorReports()` - Export as JSON

### ErrorBoundaryTestIntegration

- `initialize()` - Initialize framework integration
- `processErrorForTesting(error, errorInfo, context?)` - Process error for testing
- `assertErrorOccurred(expectedError)` - Assert specific error occurred
- `assertNoErrorBoundaryErrors()` - Assert no errors occurred
- `getErrorReportsForCurrentTest()` - Get current test's error reports

### ErrorDebuggingUtils

- `startDebugSession(testName?, testFile?)` - Start debug session
- `addErrorToSession(report)` - Add error to current session
- `analyzeError(report)` - Analyze error and provide insights
- `recordDebugAction(action, details?, result?)` - Record debug action
- `generateDebuggingReport(sessionId?)` - Generate comprehensive report
- `endDebugSession(resolution?)` - End current session

### TestDebuggingHelpers

- `createDebugErrorBoundary(testName)` - Create debug-enabled wrapper
- `assertErrorWithDebugging(expectedError, testName)` - Enhanced error assertion
- `debugErrorBoundaryState(errorBoundary)` - Debug error boundary state