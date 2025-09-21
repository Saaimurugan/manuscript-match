/**
 * Error Boundary Test Helpers
 * 
 * React components and utilities specifically designed for testing error boundaries
 * in different scenarios and configurations.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { render, RenderResult, fireEvent, waitFor, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorBoundary } from '../components/error/ErrorBoundary';
import { 
  ErrorSimulator, 
  ErrorSimulationConfig, 
  ErrorType, 
  ErrorSeverity,
  ErrorBoundaryTestHelpers 
} from './errorBoundaryTestUtils';

// Test wrapper component props
export interface ErrorBoundaryTestWrapperProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableReporting?: boolean;
  isolateErrors?: boolean;
  fallback?: ReactNode;
}

/**
 * Test wrapper for ErrorBoundary with enhanced testing capabilities
 */
export class ErrorBoundaryTestWrapper extends Component<ErrorBoundaryTestWrapperProps> {
  private errorBoundaryRef = React.createRef<ErrorBoundary>();

  render() {
    return (
      <ErrorBoundary
        ref={this.errorBoundaryRef}
        onError={this.props.onError}
        showErrorDetails={this.props.showErrorDetails}
        enableReporting={this.props.enableReporting}
        isolateErrors={this.props.isolateErrors}
        fallback={this.props.fallback}
      >
        {this.props.children}
      </ErrorBoundary>
    );
  }

  // Public method to access error boundary instance
  getErrorBoundary(): ErrorBoundary | null {
    return this.errorBoundaryRef.current;
  }

  // Public method to reset error boundary
  resetErrorBoundary(): void {
    this.errorBoundaryRef.current?.resetErrorBoundary();
  }
}

/**
 * Component that throws errors based on props
 */
export interface ErrorThrowingComponentProps {
  shouldThrow?: boolean;
  errorType?: ErrorType;
  errorMessage?: string;
  throwOnMount?: boolean;
  throwOnUpdate?: boolean;
  throwOnRender?: boolean;
  throwAfterDelay?: number;
  throwOnClick?: boolean;
  throwOnHover?: boolean;
  customError?: Error;
  onBeforeThrow?: () => void;
  onAfterThrow?: (error: Error) => void;
  children?: ReactNode;
}

export const ErrorThrowingComponent: React.FC<ErrorThrowingComponentProps> = ({
  shouldThrow = false,
  errorType = 'runtime',
  errorMessage,
  throwOnMount = false,
  throwOnUpdate = false,
  throwOnRender = false,
  throwAfterDelay,
  throwOnClick = false,
  throwOnHover = false,
  customError,
  onBeforeThrow,
  onAfterThrow,
  children = 'Test Component',
}) => {
  const [shouldThrowState, setShouldThrowState] = React.useState(false);
  const [updateCount, setUpdateCount] = React.useState(0);

  // Create error based on configuration
  const createError = React.useCallback(() => {
    if (customError) return customError;
    
    const config: ErrorSimulationConfig = {
      type: errorType,
      message: errorMessage,
    };
    
    return ErrorSimulator.createError(config);
  }, [customError, errorType, errorMessage]);

  // Throw error helper
  const throwError = React.useCallback(() => {
    const error = createError();
    
    if (onBeforeThrow) onBeforeThrow();
    
    // Simulate async error throwing
    setTimeout(() => {
      if (onAfterThrow) onAfterThrow(error);
    }, 0);
    
    throw error;
  }, [createError, onBeforeThrow, onAfterThrow]);

  // Mount effect
  React.useEffect(() => {
    if (throwOnMount && shouldThrow) {
      throwError();
    }
  }, []); // Only run on mount

  // Delayed throw effect
  React.useEffect(() => {
    if (throwAfterDelay && shouldThrow) {
      const timer = setTimeout(() => {
        setShouldThrowState(true);
      }, throwAfterDelay);

      return () => clearTimeout(timer);
    }
  }, [throwAfterDelay, shouldThrow]);

  // Update effect (runs on every render after mount)
  React.useEffect(() => {
    if (throwOnUpdate && shouldThrow && updateCount > 0) {
      throwError();
    }
    setUpdateCount(prev => prev + 1);
  });

  // Event handlers
  const handleClick = () => {
    if (throwOnClick && shouldThrow) {
      throwError();
    }
  };

  const handleMouseEnter = () => {
    if (throwOnHover && shouldThrow) {
      throwError();
    }
  };

  // Render-time error
  if ((throwOnRender || shouldThrowState) && shouldThrow) {
    throwError();
  }

  return (
    <div
      data-testid="error-throwing-component"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      style={{ padding: '10px', border: '1px solid #ccc', margin: '5px' }}
    >
      {children}
    </div>
  );
};

/**
 * Async component that throws errors after async operations
 */
export interface AsyncErrorComponentProps {
  shouldThrow?: boolean;
  errorType?: ErrorType;
  delay?: number;
  operation?: 'fetch' | 'timeout' | 'promise' | 'callback';
  onError?: (error: Error) => void;
}

export const AsyncErrorComponent: React.FC<AsyncErrorComponentProps> = ({
  shouldThrow = false,
  errorType = 'network',
  delay = 100,
  operation = 'fetch',
  onError,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<string | null>(null);

  const simulateAsyncOperation = React.useCallback(async () => {
    if (!shouldThrow) {
      setData('Success');
      return;
    }

    setLoading(true);

    try {
      switch (operation) {
        case 'fetch':
          await new Promise((_, reject) => {
            setTimeout(() => {
              const error = ErrorSimulator.createError({ type: errorType });
              if (onError) onError(error);
              reject(error);
            }, delay);
          });
          break;

        case 'timeout':
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              const error = ErrorSimulator.createError({ type: errorType });
              if (onError) onError(error);
              reject(error);
            }, delay);
          });
          break;

        case 'promise':
          await Promise.reject(ErrorSimulator.createError({ type: errorType }));
          break;

        case 'callback':
          setTimeout(() => {
            const error = ErrorSimulator.createError({ type: errorType });
            if (onError) onError(error);
            throw error;
          }, delay);
          break;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [shouldThrow, errorType, delay, operation, onError]);

  React.useEffect(() => {
    simulateAsyncOperation();
  }, [simulateAsyncOperation]);

  if (loading) {
    return <div data-testid="async-loading">Loading...</div>;
  }

  return <div data-testid="async-success">{data}</div>;
};

/**
 * Component that simulates different error scenarios in lifecycle methods
 */
export class LifecycleErrorComponent extends Component<{
  throwInConstructor?: boolean;
  throwInRender?: boolean;
  throwInComponentDidMount?: boolean;
  throwInComponentDidUpdate?: boolean;
  throwInComponentWillUnmount?: boolean;
  errorType?: ErrorType;
  onError?: (error: Error) => void;
}> {
  constructor(props: any) {
    super(props);
    
    if (props.throwInConstructor) {
      const error = ErrorSimulator.createError({ type: props.errorType || 'runtime' });
      if (props.onError) props.onError(error);
      throw error;
    }
  }

  componentDidMount() {
    if (this.props.throwInComponentDidMount) {
      const error = ErrorSimulator.createError({ type: this.props.errorType || 'runtime' });
      if (this.props.onError) this.props.onError(error);
      throw error;
    }
  }

  componentDidUpdate() {
    if (this.props.throwInComponentDidUpdate) {
      const error = ErrorSimulator.createError({ type: this.props.errorType || 'runtime' });
      if (this.props.onError) this.props.onError(error);
      throw error;
    }
  }

  componentWillUnmount() {
    if (this.props.throwInComponentWillUnmount) {
      const error = ErrorSimulator.createError({ type: this.props.errorType || 'runtime' });
      if (this.props.onError) this.props.onError(error);
      throw error;
    }
  }

  render() {
    if (this.props.throwInRender) {
      const error = ErrorSimulator.createError({ type: this.props.errorType || 'runtime' });
      if (this.props.onError) this.props.onError(error);
      throw error;
    }

    return <div data-testid="lifecycle-component">Lifecycle Component</div>;
  }
}

/**
 * Test helper functions for error boundary testing
 */
export class ErrorBoundaryTestActions {
  /**
   * Renders an ErrorBoundary with a component that throws an error
   */
  static renderWithError(
    errorConfig: ErrorSimulationConfig,
    boundaryProps: Partial<ErrorBoundaryTestWrapperProps> = {}
  ): RenderResult & { errorBoundary: ErrorBoundaryTestWrapper } {
    let wrapperRef: ErrorBoundaryTestWrapper | null = null;

    const result = render(
      <ErrorBoundaryTestWrapper
        ref={(ref) => { wrapperRef = ref; }}
        {...boundaryProps}
      >
        <ErrorThrowingComponent
          shouldThrow={true}
          errorType={errorConfig.type}
          errorMessage={errorConfig.message}
          throwOnRender={true}
        />
      </ErrorBoundaryTestWrapper>
    );

    return {
      ...result,
      errorBoundary: wrapperRef!,
    };
  }

  /**
   * Renders an ErrorBoundary and triggers an error after mount
   */
  static async renderAndTriggerError(
    errorConfig: ErrorSimulationConfig,
    boundaryProps: Partial<ErrorBoundaryTestWrapperProps> = {}
  ): Promise<RenderResult & { errorBoundary: ErrorBoundaryTestWrapper }> {
    let wrapperRef: ErrorBoundaryTestWrapper | null = null;

    const result = render(
      <ErrorBoundaryTestWrapper
        ref={(ref) => { wrapperRef = ref; }}
        {...boundaryProps}
      >
        <ErrorThrowingComponent
          shouldThrow={true}
          errorType={errorConfig.type}
          errorMessage={errorConfig.message}
          throwOnClick={true}
        />
      </ErrorBoundaryTestWrapper>
    );

    // Trigger the error
    const component = result.getByTestId('error-throwing-component');
    fireEvent.click(component);

    // Wait for error boundary to catch the error
    await waitFor(() => {
      expect(result.getByTestId('error-boundary')).toBeInTheDocument();
    });

    return {
      ...result,
      errorBoundary: wrapperRef!,
    };
  }

  /**
   * Tests retry functionality
   */
  static async testRetryFunctionality(
    container: HTMLElement,
    maxRetries = 3
  ): Promise<void> {
    for (let i = 1; i <= maxRetries; i++) {
      const retryButton = container.querySelector('[data-testid="retry-button"]') as HTMLElement;
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toBeDisabled();

      fireEvent.click(retryButton);

      if (i < maxRetries) {
        await waitFor(() => {
          expect(retryButton).toHaveTextContent(`Try Again (${i}/${maxRetries})`);
        });
      } else {
        await waitFor(() => {
          expect(retryButton).toBeDisabled();
          expect(container.querySelector('[data-testid="max-retries-message"]')).toBeInTheDocument();
        });
      }
    }
  }

  /**
   * Tests error reporting functionality
   */
  static async testErrorReporting(
    container: HTMLElement,
    mockFetch: ReturnType<typeof vi.fn>
  ): Promise<void> {
    const reportButton = container.querySelector('[data-testid="report-button"]') as HTMLElement;
    expect(reportButton).toBeInTheDocument();

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    fireEvent.click(reportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"errorId"'),
      });
    });

    await waitFor(() => {
      expect(container.querySelector('[data-testid="report-success"]')).toBeInTheDocument();
    });
  }

  /**
   * Tests navigation functionality
   */
  static async testNavigation(
    container: HTMLElement,
    mockHistory: ReturnType<typeof ErrorBoundaryTestHelpers.mockWindowHistory>
  ): Promise<void> {
    const homeButton = container.querySelector('[data-testid="home-button"]') as HTMLElement;
    expect(homeButton).toBeInTheDocument();

    fireEvent.click(homeButton);

    await waitFor(() => {
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/');
    });
  }

  /**
   * Tests error details display
   */
  static async testErrorDetails(container: HTMLElement): Promise<void> {
    const showDetailsButton = container.querySelector('[data-testid="show-details-button"]') as HTMLElement;
    expect(showDetailsButton).toBeInTheDocument();

    fireEvent.click(showDetailsButton);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="error-details"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="error-stack"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="error-component-stack"]')).toBeInTheDocument();
    });
  }

  /**
   * Tests error boundary isolation
   */
  static async testErrorIsolation(
    container: HTMLElement,
    errorType: ErrorType,
    severity: ErrorSeverity
  ): Promise<void> {
    const boundaryElement = container.querySelector('[data-error-boundary]');
    expect(boundaryElement).toHaveAttribute('data-isolated', 'true');
    expect(boundaryElement).toHaveAttribute('data-isolation-reason', `${severity}-${errorType}`);
  }

  /**
   * Tests graceful degradation for different error types
   */
  static testGracefulDegradation(container: HTMLElement, errorType: ErrorType): void {
    const degradationElement = container.querySelector('[data-testid="degraded-ui"]');
    expect(degradationElement).toBeInTheDocument();

    switch (errorType) {
      case 'network':
        expect(container.querySelector('[data-testid="network-error-ui"]')).toBeInTheDocument();
        expect(container.getByText(/Connection Issue/)).toBeInTheDocument();
        break;
      case 'user':
        expect(container.querySelector('[data-testid="user-error-ui"]')).toBeInTheDocument();
        expect(container.getByText(/Input Error/)).toBeInTheDocument();
        break;
      case 'system':
        expect(container.querySelector('[data-testid="system-error-ui"]')).toBeInTheDocument();
        expect(container.getByText(/System Error/)).toBeInTheDocument();
        break;
      case 'syntax':
        expect(container.querySelector('[data-testid="syntax-error-ui"]')).toBeInTheDocument();
        expect(container.getByText(/Code Error/)).toBeInTheDocument();
        break;
      default:
        expect(container.querySelector('[data-testid="default-error-ui"]')).toBeInTheDocument();
        expect(container.getByText(/Something went wrong/)).toBeInTheDocument();
        break;
    }
  }
}

/**
 * Error boundary test scenarios
 */
export class ErrorBoundaryTestScenarios {
  /**
   * Tests basic error catching functionality
   */
  static async testBasicErrorCatching(): Promise<void> {
    const mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
    
    try {
      const { container } = ErrorBoundaryTestActions.renderWithError({
        type: 'runtime',
        message: 'Test runtime error',
      });

      expect(container.querySelector('[data-testid="error-boundary"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="error-message"]')).toBeInTheDocument();
      expect(mockEnv.consoleError).toHaveBeenCalled();
    } finally {
      mockEnv.cleanup();
    }
  }

  /**
   * Tests error categorization for different error types
   */
  static async testErrorCategorization(): Promise<void> {
    const errorTypes: ErrorType[] = ['syntax', 'network', 'system', 'user', 'runtime'];
    
    for (const errorType of errorTypes) {
      const mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
      
      try {
        const { container } = ErrorBoundaryTestActions.renderWithError({
          type: errorType,
          message: `Test ${errorType} error`,
        });

        const categoryElement = container.querySelector('[data-testid="error-category"]');
        expect(categoryElement).toHaveTextContent(errorType.toUpperCase());
      } finally {
        mockEnv.cleanup();
      }
    }
  }

  /**
   * Tests complete error recovery workflow
   */
  static async testCompleteErrorRecovery(): Promise<void> {
    const mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
    
    try {
      const { container, errorBoundary } = ErrorBoundaryTestActions.renderWithError({
        type: 'runtime',
        message: 'Test recovery error',
      }, {
        enableReporting: true,
        showErrorDetails: true,
      });

      // Test retry functionality
      await ErrorBoundaryTestActions.testRetryFunctionality(container);

      // Test error reporting
      await ErrorBoundaryTestActions.testErrorReporting(container, mockEnv.fetch);

      // Test navigation
      await ErrorBoundaryTestActions.testNavigation(container, mockEnv.history);

      // Test error details
      await ErrorBoundaryTestActions.testErrorDetails(container);

      // Test programmatic reset
      errorBoundary.resetErrorBoundary();
      expect(errorBoundary.getErrorBoundary()?.state.hasError).toBe(false);
    } finally {
      mockEnv.cleanup();
    }
  }

  /**
   * Tests error boundary with different configurations
   */
  static async testDifferentConfigurations(): Promise<void> {
    const configurations = [
      { enableReporting: true, showErrorDetails: true, isolateErrors: true },
      { enableReporting: false, showErrorDetails: false, isolateErrors: false },
      { enableReporting: true, showErrorDetails: false, isolateErrors: true },
    ];

    for (const config of configurations) {
      const mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
      
      try {
        const { container } = ErrorBoundaryTestActions.renderWithError({
          type: 'runtime',
          message: 'Test configuration error',
        }, config);

        // Verify configuration-specific behavior
        if (config.enableReporting) {
          expect(container.querySelector('[data-testid="report-button"]')).toBeInTheDocument();
        } else {
          expect(container.querySelector('[data-testid="report-button"]')).not.toBeInTheDocument();
        }

        if (config.showErrorDetails) {
          expect(container.querySelector('[data-testid="show-details-button"]')).toBeInTheDocument();
        } else {
          expect(container.querySelector('[data-testid="show-details-button"]')).not.toBeInTheDocument();
        }

        if (config.isolateErrors) {
          const boundaryElement = container.querySelector('[data-error-boundary]');
          expect(boundaryElement).toHaveAttribute('data-isolated', 'true');
        }
      } finally {
        mockEnv.cleanup();
      }
    }
  }
}

// Export additional utilities
export { ErrorBoundaryTestHelpers, ErrorSimulator } from './errorBoundaryTestUtils';