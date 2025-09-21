/**
 * Error Boundary Testing Utilities
 * 
 * This module provides comprehensive utilities for testing error boundaries,
 * including error simulation, test helpers, and verification functions.
 */

import { vi } from 'vitest';

// Error types for simulation
export type ErrorType = 'syntax' | 'runtime' | 'network' | 'user' | 'system' | 'chunk-load' | 'memory' | 'permission';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error simulation configuration
export interface ErrorSimulationConfig {
  type: ErrorType;
  severity?: ErrorSeverity;
  message?: string;
  stack?: string;
  componentStack?: string;
  delay?: number;
  shouldRecover?: boolean;
  customProps?: Record<string, any>;
}

// Error boundary test state
export interface ErrorBoundaryTestState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
  reportStatus: 'idle' | 'sending' | 'sent' | 'failed';
  retryCount: number;
  errorCategory: ErrorType;
  errorSeverity: ErrorSeverity;
}

/**
 * Creates predefined error objects for different error types
 */
export class ErrorSimulator {
  /**
   * Creates a syntax error for testing
   */
  static createSyntaxError(message?: string): Error {
    const error = new Error(message || 'Unexpected token in JSON at position 0');
    error.name = 'SyntaxError';
    error.stack = `SyntaxError: ${error.message}
    at JSON.parse (<anonymous>)
    at parseResponse (http://localhost:3000/static/js/bundle.js:1234:56)
    at Component.render (http://localhost:3000/static/js/bundle.js:5678:90)`;
    return error;
  }

  /**
   * Creates a network error for testing
   */
  static createNetworkError(message?: string): Error {
    const error = new Error(message || 'Failed to fetch data from server');
    error.name = 'NetworkError';
    error.stack = `NetworkError: ${error.message}
    at fetch (http://localhost:3000/static/js/bundle.js:1111:22)
    at apiCall (http://localhost:3000/static/js/bundle.js:3333:44)
    at Component.loadData (http://localhost:3000/static/js/bundle.js:5555:66)`;
    return error;
  }

  /**
   * Creates a system error for testing
   */
  static createSystemError(message?: string): Error {
    const error = new Error(message || 'Memory quota exceeded');
    error.name = 'QuotaExceededError';
    error.stack = `QuotaExceededError: ${error.message}
    at localStorage.setItem (http://localhost:3000/static/js/bundle.js:2222:33)
    at saveData (http://localhost:3000/static/js/bundle.js:4444:55)
    at Component.handleSave (http://localhost:3000/static/js/bundle.js:6666:77)`;
    return error;
  }

  /**
   * Creates a user input error for testing
   */
  static createUserError(message?: string): Error {
    const error = new Error(message || 'Invalid input format provided');
    error.name = 'ValidationError';
    error.stack = `ValidationError: ${error.message}
    at validateInput (http://localhost:3000/static/js/bundle.js:1357:24)
    at FormComponent.handleSubmit (http://localhost:3000/static/js/bundle.js:2468:13)
    at Component.render (http://localhost:3000/static/js/bundle.js:3579:86)`;
    return error;
  }

  /**
   * Creates a chunk load error for testing
   */
  static createChunkLoadError(message?: string): Error {
    const error = new Error(message || 'Loading chunk 2 failed');
    error.name = 'ChunkLoadError';
    error.stack = `ChunkLoadError: ${error.message}
    at __webpack_require__.e (http://localhost:3000/static/js/bundle.js:123:45)
    at import() (http://localhost:3000/static/js/bundle.js:678:90)
    at LazyComponent (http://localhost:3000/static/js/bundle.js:987:65)`;
    return error;
  }

  /**
   * Creates a runtime error for testing
   */
  static createRuntimeError(message?: string): Error {
    const error = new Error(message || 'Cannot read properties of undefined (reading \'length\')');
    error.name = 'TypeError';
    error.stack = `TypeError: ${error.message}
    at Component.processData (http://localhost:3000/static/js/bundle.js:1111:22)
    at Component.render (http://localhost:3000/static/js/bundle.js:3333:44)
    at ReactDOM.render (http://localhost:3000/static/js/bundle.js:5555:66)`;
    return error;
  }

  /**
   * Creates a permission error for testing
   */
  static createPermissionError(message?: string): Error {
    const error = new Error(message || 'Access denied: insufficient permissions');
    error.name = 'PermissionError';
    error.stack = `PermissionError: ${error.message}
    at checkPermissions (http://localhost:3000/static/js/bundle.js:2468:13)
    at SecureComponent.render (http://localhost:3000/static/js/bundle.js:1357:24)
    at Component.render (http://localhost:3000/static/js/bundle.js:3579:86)`;
    return error;
  }

  /**
   * Creates a memory error for testing
   */
  static createMemoryError(message?: string): Error {
    const error = new Error(message || 'Maximum call stack size exceeded');
    error.name = 'RangeError';
    error.stack = `RangeError: ${error.message}
    at recursiveFunction (http://localhost:3000/static/js/bundle.js:1111:22)
    at recursiveFunction (http://localhost:3000/static/js/bundle.js:1111:22)
    at recursiveFunction (http://localhost:3000/static/js/bundle.js:1111:22)`;
    return error;
  }

  /**
   * Creates an error based on configuration
   */
  static createError(config: ErrorSimulationConfig): Error {
    let error: Error;

    switch (config.type) {
      case 'syntax':
        error = this.createSyntaxError(config.message);
        break;
      case 'network':
        error = this.createNetworkError(config.message);
        break;
      case 'system':
        error = this.createSystemError(config.message);
        break;
      case 'user':
        error = this.createUserError(config.message);
        break;
      case 'chunk-load':
        error = this.createChunkLoadError(config.message);
        break;
      case 'memory':
        error = this.createMemoryError(config.message);
        break;
      case 'permission':
        error = this.createPermissionError(config.message);
        break;
      case 'runtime':
      default:
        error = this.createRuntimeError(config.message);
        break;
    }

    // Add custom stack if provided
    if (config.stack) {
      error.stack = config.stack;
    }

    return error;
  }
}

/**
 * Mock component that can throw errors on demand
 */
export interface ThrowErrorProps {
  shouldThrow?: boolean;
  errorConfig?: ErrorSimulationConfig;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
  throwOnMount?: boolean;
  throwOnUpdate?: boolean;
  throwOnRender?: boolean;
  throwAfterDelay?: number;
}

/**
 * Test component that throws errors based on configuration
 */
export const createThrowErrorComponent = () => {
  return function ThrowError({
    shouldThrow = false,
    errorConfig = { type: 'runtime' },
    onError,
    children = 'Test Component',
    throwOnMount = false,
    throwOnUpdate = false,
    throwOnRender = false,
    throwAfterDelay,
  }: ThrowErrorProps) {
    const [shouldThrowState, setShouldThrowState] = React.useState(throwOnMount);

    React.useEffect(() => {
      if (throwOnMount && shouldThrow) {
        const error = ErrorSimulator.createError(errorConfig);
        if (onError) onError(error);
        throw error;
      }

      if (throwAfterDelay && shouldThrow) {
        const timer = setTimeout(() => {
          setShouldThrowState(true);
        }, throwAfterDelay);

        return () => clearTimeout(timer);
      }
    }, [shouldThrow, throwOnMount, throwAfterDelay, errorConfig, onError]);

    React.useEffect(() => {
      if (throwOnUpdate && shouldThrow) {
        const error = ErrorSimulator.createError(errorConfig);
        if (onError) onError(error);
        throw error;
      }
    });

    if ((throwOnRender || shouldThrowState) && shouldThrow) {
      const error = ErrorSimulator.createError(errorConfig);
      if (onError) onError(error);
      throw error;
    }

    return React.createElement('div', { 'data-testid': 'throw-error-component' }, children);
  };
};

/**
 * Async error component for testing async error scenarios
 */
export const createAsyncThrowErrorComponent = () => {
  return function AsyncThrowError({
    shouldThrow = false,
    errorConfig = { type: 'runtime' },
    delay = 100,
    onError,
  }: {
    shouldThrow?: boolean;
    errorConfig?: ErrorSimulationConfig;
    delay?: number;
    onError?: (error: Error) => void;
  }) {
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      if (shouldThrow) {
        const timer = setTimeout(() => {
          const newError = ErrorSimulator.createError(errorConfig);
          if (onError) onError(newError);
          setError(newError);
        }, delay);

        return () => clearTimeout(timer);
      }
    }, [shouldThrow, errorConfig, delay, onError]);

    if (error) {
      throw error;
    }

    return React.createElement('div', { 'data-testid': 'async-throw-error-component' }, 'Async Component');
  };
};

/**
 * Error boundary test helpers
 */
export class ErrorBoundaryTestHelpers {
  /**
   * Simulates console.error to capture error logs
   */
  static mockConsoleError() {
    const originalError = console.error;
    const mockError = vi.fn();
    console.error = mockError;
    
    // Store original for restoration
    (mockError as any).restore = () => {
      console.error = originalError;
    };
    
    return mockError;
  }

  /**
   * Simulates localStorage for error storage testing
   */
  static mockLocalStorage() {
    const store: Record<string, string> = {};
    
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      get store() { return { ...store }; },
    };
  }

  /**
   * Simulates sessionStorage for error session testing
   */
  static mockSessionStorage() {
    const store: Record<string, string> = {};
    
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      get store() { return { ...store }; },
    };
  }

  /**
   * Mocks fetch for error reporting testing
   */
  static mockFetch() {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    return mockFetch;
  }

  /**
   * Mocks window.location for navigation testing
   */
  static mockWindowLocation() {
    const mockLocation = {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      reload: vi.fn(),
      assign: vi.fn(),
      replace: vi.fn(),
    };

    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    return mockLocation;
  }

  /**
   * Mocks window.history for navigation testing
   */
  static mockWindowHistory() {
    const mockHistory = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      length: 1,
      state: null,
    };

    Object.defineProperty(window, 'history', {
      value: mockHistory,
      writable: true,
    });

    return mockHistory;
  }

  /**
   * Mocks window.open for mailto testing
   */
  static mockWindowOpen() {
    const mockOpen = vi.fn();
    window.open = mockOpen;
    return mockOpen;
  }

  /**
   * Creates a comprehensive mock environment for error boundary testing
   */
  static createMockEnvironment() {
    const consoleError = this.mockConsoleError();
    const localStorage = this.mockLocalStorage();
    const sessionStorage = this.mockSessionStorage();
    const fetch = this.mockFetch();
    const location = this.mockWindowLocation();
    const history = this.mockWindowHistory();
    const windowOpen = this.mockWindowOpen();

    // Mock navigator
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test Browser) TestRunner/1.0',
      writable: true,
    });

    return {
      consoleError,
      localStorage,
      sessionStorage,
      fetch,
      location,
      history,
      windowOpen,
      cleanup: () => {
        consoleError.restore?.();
        vi.restoreAllMocks();
      },
    };
  }

  /**
   * Waits for error boundary to catch and process an error
   */
  static async waitForErrorBoundary(timeout = 1000): Promise<void> {
    return new Promise((resolve) => {
      const checkForError = () => {
        const errorElement = document.querySelector('[data-testid="error-boundary"]');
        if (errorElement) {
          resolve();
        } else {
          setTimeout(checkForError, 10);
        }
      };
      
      setTimeout(() => resolve(), timeout);
      checkForError();
    });
  }

  /**
   * Triggers an error in a component and waits for error boundary
   */
  static async triggerErrorAndWait(
    triggerFn: () => void,
    timeout = 1000
  ): Promise<void> {
    triggerFn();
    await this.waitForErrorBoundary(timeout);
  }
}

/**
 * Error boundary state verification utilities
 */
export class ErrorBoundaryVerifier {
  /**
   * Verifies error boundary is in error state
   */
  static verifyErrorState(container: HTMLElement): void {
    const errorBoundary = container.querySelector('[data-testid="error-boundary"]');
    const errorMessage = container.querySelector('[data-testid="error-message"]');
    
    if (!errorBoundary) {
      throw new Error('Expected error boundary to be in the document');
    }
    if (!errorMessage) {
      throw new Error('Expected error message to be in the document');
    }
  }

  /**
   * Verifies error boundary shows specific error type
   */
  static verifyErrorType(container: HTMLElement, expectedType: ErrorType): void {
    const errorTypeElement = container.querySelector('[data-testid="error-category"]');
    expect(errorTypeElement).toBeInTheDocument();
    expect(errorTypeElement).toHaveTextContent(expectedType.toUpperCase());
  }

  /**
   * Verifies error boundary shows specific severity
   */
  static verifyErrorSeverity(container: HTMLElement, expectedSeverity: ErrorSeverity): void {
    const severityElement = container.querySelector('[data-testid="error-severity"]');
    expect(severityElement).toBeInTheDocument();
    expect(severityElement).toHaveTextContent(expectedSeverity.toUpperCase());
  }

  /**
   * Verifies retry functionality is available
   */
  static verifyRetryAvailable(container: HTMLElement): void {
    const retryButton = container.querySelector('[data-testid="retry-button"]');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).not.toBeDisabled();
  }

  /**
   * Verifies retry count is displayed correctly
   */
  static verifyRetryCount(container: HTMLElement, expectedCount: number, maxRetries: number): void {
    const retryButton = container.querySelector('[data-testid="retry-button"]');
    expect(retryButton).toHaveTextContent(`Try Again (${expectedCount}/${maxRetries})`);
  }

  /**
   * Verifies error reporting is available
   */
  static verifyReportingAvailable(container: HTMLElement): void {
    const reportButton = container.querySelector('[data-testid="report-button"]');
    expect(reportButton).toBeInTheDocument();
    expect(reportButton).not.toBeDisabled();
  }

  /**
   * Verifies error details are shown when enabled
   */
  static verifyErrorDetails(container: HTMLElement, shouldShow: boolean): void {
    const detailsButton = container.querySelector('[data-testid="show-details-button"]');
    
    if (shouldShow) {
      expect(detailsButton).toBeInTheDocument();
    } else {
      expect(detailsButton).not.toBeInTheDocument();
    }
  }

  /**
   * Verifies navigation options are available
   */
  static verifyNavigationOptions(container: HTMLElement): void {
    const homeButton = container.querySelector('[data-testid="home-button"]');
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).not.toBeDisabled();
  }

  /**
   * Verifies error ID is generated and displayed
   */
  static verifyErrorId(container: HTMLElement): string {
    const errorIdElement = container.querySelector('[data-testid="error-id"]');
    expect(errorIdElement).toBeInTheDocument();
    
    const errorId = errorIdElement?.textContent;
    expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    
    return errorId || '';
  }

  /**
   * Verifies error context information
   */
  static verifyErrorContext(container: HTMLElement, expectedContext: Partial<{
    component: string;
    route: string;
    sessionId: string;
    userId: string;
  }>): void {
    if (expectedContext.component) {
      const componentElement = container.querySelector('[data-testid="error-component"]');
      expect(componentElement).toHaveTextContent(expectedContext.component);
    }

    if (expectedContext.route) {
      const routeElement = container.querySelector('[data-testid="error-route"]');
      expect(routeElement).toHaveTextContent(expectedContext.route);
    }

    if (expectedContext.sessionId) {
      const sessionElement = container.querySelector('[data-testid="error-session"]');
      expect(sessionElement).toHaveTextContent(expectedContext.sessionId);
    }

    if (expectedContext.userId) {
      const userElement = container.querySelector('[data-testid="error-user"]');
      expect(userElement).toHaveTextContent(expectedContext.userId);
    }
  }

  /**
   * Verifies error boundary isolation
   */
  static verifyErrorIsolation(container: HTMLElement): void {
    const boundaryElement = container.querySelector('[data-error-boundary]');
    expect(boundaryElement).toHaveAttribute('data-isolated', 'true');
    expect(boundaryElement).toHaveAttribute('data-isolation-reason');
  }

  /**
   * Verifies graceful degradation UI
   */
  static verifyGracefulDegradation(container: HTMLElement, errorType: ErrorType): void {
    const degradationElement = container.querySelector('[data-testid="degraded-ui"]');
    expect(degradationElement).toBeInTheDocument();
    
    // Verify type-specific degradation
    switch (errorType) {
      case 'network':
        expect(container.querySelector('[data-testid="network-error-ui"]')).toBeInTheDocument();
        break;
      case 'user':
        expect(container.querySelector('[data-testid="user-error-ui"]')).toBeInTheDocument();
        break;
      case 'system':
        expect(container.querySelector('[data-testid="system-error-ui"]')).toBeInTheDocument();
        break;
      default:
        expect(container.querySelector('[data-testid="default-error-ui"]')).toBeInTheDocument();
        break;
    }
  }
}

// Export React for component creation
import React from 'react';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
export { React };