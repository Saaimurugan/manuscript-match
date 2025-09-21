/**
 * ErrorBoundary Component Hierarchy Test Suite
 * 
 * Tests error boundary behavior in different component hierarchies:
 * - Nested error boundaries
 * - Complex component trees
 * - Different React patterns (HOCs, render props, hooks)
 * - Cross-component error propagation
 * 
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Test components for hierarchy testing
const LeafComponent = ({ shouldThrow = false, id = 'leaf' }: { shouldThrow?: boolean; id?: string }) => {
  if (shouldThrow) {
    throw new Error(`Error in ${id} component`);
  }
  return <div data-testid={`${id}-component`}>Leaf Component {id}</div>;
};

const MiddleComponent = ({ 
  shouldThrow = false, 
  childShouldThrow = false, 
  id = 'middle' 
}: { 
  shouldThrow?: boolean; 
  childShouldThrow?: boolean; 
  id?: string; 
}) => {
  if (shouldThrow) {
    throw new Error(`Error in ${id} component`);
  }
  
  return (
    <div data-testid={`${id}-component`}>
      <h3>Middle Component {id}</h3>
      <LeafComponent shouldThrow={childShouldThrow} id={`${id}-child`} />
    </div>
  );
};

const RootComponent = ({ 
  shouldThrow = false, 
  middleShouldThrow = false, 
  leafShouldThrow = false 
}: { 
  shouldThrow?: boolean; 
  middleShouldThrow?: boolean; 
  leafShouldThrow?: boolean; 
}) => {
  if (shouldThrow) {
    throw new Error('Error in root component');
  }
  
  return (
    <div data-testid="root-component">
      <h1>Root Component</h1>
      <MiddleComponent shouldThrow={middleShouldThrow} childShouldThrow={leafShouldThrow} />
    </div>
  );
};

// Higher-Order Component pattern
const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Partial<React.ComponentProps<typeof ErrorBoundary>>
) => {
  return (props: P) => (
    <ErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
};

// Render Props pattern
const ErrorBoundaryRenderProp = ({ 
  children,
  ...boundaryProps 
}: { 
  children: (hasError: boolean, error: Error | null) => React.ReactNode;
} & Partial<React.ComponentProps<typeof ErrorBoundary>>) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    setHasError(true);
    setError(error);
    boundaryProps.onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary {...boundaryProps} onError={handleError}>
      {children(hasError, error)}
    </ErrorBoundary>
  );
};

// Hook-based error boundary
const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => setError(null);
  
  const captureError = (error: Error) => {
    setError(error);
  };

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError, hasError: !!error };
};

const HookBasedComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  const { captureError } = useErrorBoundary();

  React.useEffect(() => {
    if (shouldThrow) {
      captureError(new Error('Hook-based error'));
    }
  }, [shouldThrow, captureError]);

  return <div data-testid="hook-based-component">Hook-based Component</div>;
};

// Context-based error handling
const ErrorContext = React.createContext<{
  reportError: (error: Error) => void;
  errors: Error[];
}>({
  reportError: () => {},
  errors: [],
});

const ErrorProvider = ({ children }: { children: React.ReactNode }) => {
  const [errors, setErrors] = React.useState<Error[]>([]);

  const reportError = (error: Error) => {
    setErrors(prev => [...prev, error]);
  };

  return (
    <ErrorContext.Provider value={{ reportError, errors }}>
      {children}
    </ErrorContext.Provider>
  );
};

const ContextAwareComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  const { reportError } = React.useContext(ErrorContext);

  React.useEffect(() => {
    if (shouldThrow) {
      const error = new Error('Context-aware error');
      reportError(error);
      throw error;
    }
  }, [shouldThrow, reportError]);

  return <div data-testid="context-aware-component">Context-aware Component</div>;
};

describe('ErrorBoundary Component Hierarchy Tests', () => {
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConsoleError = vi.fn();
    vi.stubGlobal('console', { ...console, error: mockConsoleError });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Nested Error Boundaries', () => {
    it('should handle errors at the correct boundary level', async () => {
      const outerOnError = vi.fn();
      const innerOnError = vi.fn();

      render(
        <ErrorBoundary onError={outerOnError} data-testid="outer-boundary">
          <div>
            <h1>Outer Content</h1>
            <ErrorBoundary onError={innerOnError} data-testid="inner-boundary">
              <LeafComponent shouldThrow={true} id="nested-leaf" />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(innerOnError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error in nested-leaf component' }),
        expect.any(Object)
      );
      expect(outerOnError).not.toHaveBeenCalled();

      // Outer content should still be visible
      expect(screen.getByText('Outer Content')).toBeInTheDocument();
    });

    it('should propagate errors to parent boundary when child boundary fails', async () => {
      const outerOnError = vi.fn();
      const innerOnError = vi.fn().mockImplementation(() => {
        throw new Error('Inner boundary failed');
      });

      render(
        <ErrorBoundary onError={outerOnError} data-testid="outer-boundary">
          <ErrorBoundary onError={innerOnError} data-testid="inner-boundary">
            <LeafComponent shouldThrow={true} id="propagation-test" />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Both boundaries should have been called
      expect(innerOnError).toHaveBeenCalled();
      expect(outerOnError).toHaveBeenCalled();
    });

    it('should handle multiple nested boundaries with different configurations', async () => {
      const level1OnError = vi.fn();
      const level2OnError = vi.fn();
      const level3OnError = vi.fn();

      render(
        <ErrorBoundary onError={level1OnError} enableReporting={true} showErrorDetails={true}>
          <div data-testid="level-1">
            <ErrorBoundary onError={level2OnError} enableReporting={false}>
              <div data-testid="level-2">
                <ErrorBoundary onError={level3OnError} showErrorDetails={false}>
                  <LeafComponent shouldThrow={true} id="deep-nested" />
                </ErrorBoundary>
              </div>
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Deepest boundary should catch the error
      expect(level3OnError).toHaveBeenCalled();
      expect(level2OnError).not.toHaveBeenCalled();
      expect(level1OnError).not.toHaveBeenCalled();

      // Should respect the deepest boundary's configuration
      expect(screen.queryByTestId('show-details-button')).not.toBeInTheDocument();
    });
  });

  describe('Complex Component Trees', () => {
    it('should handle errors in deeply nested component trees', async () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <RootComponent leafShouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error in middle-child component' }),
        expect.objectContaining({
          componentStack: expect.stringContaining('LeafComponent')
        })
      );
    });

    it('should isolate errors to specific branches of component tree', async () => {
      const leftOnError = vi.fn();
      const rightOnError = vi.fn();

      render(
        <div>
          <ErrorBoundary onError={leftOnError} data-testid="left-boundary">
            <MiddleComponent shouldThrow={true} id="left" />
          </ErrorBoundary>
          <ErrorBoundary onError={rightOnError} data-testid="right-boundary">
            <MiddleComponent shouldThrow={false} id="right" />
          </ErrorBoundary>
        </div>
      );

      // Left side should error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(leftOnError).toHaveBeenCalled();
      expect(rightOnError).not.toHaveBeenCalled();

      // Right side should still render normally
      expect(screen.getByTestId('right-component')).toBeInTheDocument();
    });

    it('should handle errors in sibling components independently', async () => {
      const parentOnError = vi.fn();

      const SiblingContainer = () => (
        <div>
          <ErrorBoundary>
            <LeafComponent shouldThrow={true} id="sibling-1" />
          </ErrorBoundary>
          <ErrorBoundary>
            <LeafComponent shouldThrow={false} id="sibling-2" />
          </ErrorBoundary>
          <ErrorBoundary>
            <LeafComponent shouldThrow={true} id="sibling-3" />
          </ErrorBoundary>
        </div>
      );

      render(
        <ErrorBoundary onError={parentOnError}>
          <SiblingContainer />
        </ErrorBoundary>
      );

      // Should have multiple error boundaries
      await waitFor(() => {
        const errorBoundaries = screen.getAllByTestId('error-boundary');
        expect(errorBoundaries).toHaveLength(2); // sibling-1 and sibling-3
      });

      // Parent should not be called since children handle their own errors
      expect(parentOnError).not.toHaveBeenCalled();

      // Non-erroring sibling should still render
      expect(screen.getByTestId('sibling-2-component')).toBeInTheDocument();
    });
  });

  describe('React Patterns Integration', () => {
    it('should work with Higher-Order Components', async () => {
      const onError = vi.fn();
      const EnhancedComponent = withErrorBoundary(LeafComponent, { onError });

      render(<EnhancedComponent shouldThrow={true} id="hoc-test" />);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error in hoc-test component' }),
        expect.any(Object)
      );
    });

    it('should work with render props pattern', async () => {
      const onError = vi.fn();

      render(
        <ErrorBoundaryRenderProp onError={onError}>
          {(hasError, error) => {
            if (hasError) {
              return <div data-testid="render-prop-error">Render prop error: {error?.message}</div>;
            }
            return <LeafComponent shouldThrow={true} id="render-prop-test" />;
          }}
        </ErrorBoundaryRenderProp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should work with hook-based components', async () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <HookBasedComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Hook-based error' }),
        expect.any(Object)
      );
    });

    it('should work with context providers', async () => {
      const onError = vi.fn();

      render(
        <ErrorProvider>
          <ErrorBoundary onError={onError}>
            <ContextAwareComponent shouldThrow={true} />
          </ErrorBoundary>
        </ErrorProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Context-aware error' }),
        expect.any(Object)
      );
    });
  });

  describe('Dynamic Component Hierarchies', () => {
    it('should handle dynamically added components with errors', async () => {
      const onError = vi.fn();
      const [showComponent, setShowComponent] = React.useState(false);

      const DynamicContainer = () => (
        <div>
          <button 
            data-testid="add-component-button"
            onClick={() => setShowComponent(true)}
          >
            Add Component
          </button>
          {showComponent && <LeafComponent shouldThrow={true} id="dynamic" />}
        </div>
      );

      render(
        <ErrorBoundary onError={onError}>
          <DynamicContainer />
        </ErrorBoundary>
      );

      // Initially no error
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();

      // Add component that throws error
      const addButton = screen.getByTestId('add-component-button');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error in dynamic component' }),
        expect.any(Object)
      );
    });

    it('should handle conditionally rendered error boundaries', async () => {
      const onError = vi.fn();
      const [useErrorBoundary, setUseErrorBoundary] = React.useState(false);

      const ConditionalBoundaryContainer = () => (
        <div>
          <button 
            data-testid="toggle-boundary-button"
            onClick={() => setUseErrorBoundary(!useErrorBoundary)}
          >
            Toggle Boundary
          </button>
          {useErrorBoundary ? (
            <ErrorBoundary onError={onError}>
              <LeafComponent shouldThrow={true} id="conditional" />
            </ErrorBoundary>
          ) : (
            <LeafComponent shouldThrow={true} id="conditional" />
          )}
        </div>
      );

      const { container } = render(<ConditionalBoundaryContainer />);

      // Initially should throw unhandled error
      expect(() => {
        fireEvent.click(screen.getByTestId('toggle-boundary-button'));
      }).toThrow();

      // Reset and try with boundary
      render(<ConditionalBoundaryContainer />);
      
      const toggleButton = screen.getByTestId('toggle-boundary-button');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Cross-Component Error Propagation', () => {
    it('should handle errors that cross component boundaries', async () => {
      const onError = vi.fn();

      // Component that triggers error in a different component via callback
      const TriggerComponent = ({ onTrigger }: { onTrigger: () => void }) => (
        <button data-testid="trigger-button" onClick={onTrigger}>
          Trigger Error
        </button>
      );

      const TargetComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Cross-component error');
        }
        return <div data-testid="target-component">Target Component</div>;
      };

      const [shouldThrow, setShouldThrow] = React.useState(false);

      const CrossComponentContainer = () => (
        <div>
          <TriggerComponent onTrigger={() => setShouldThrow(true)} />
          <TargetComponent shouldThrow={shouldThrow} />
        </div>
      );

      render(
        <ErrorBoundary onError={onError}>
          <CrossComponentContainer />
        </ErrorBoundary>
      );

      // Trigger error from one component that affects another
      const triggerButton = screen.getByTestId('trigger-button');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cross-component error' }),
        expect.any(Object)
      );
    });

    it('should handle portal-rendered components with errors', async () => {
      const onError = vi.fn();

      // Create portal target
      const portalTarget = document.createElement('div');
      portalTarget.id = 'portal-target';
      document.body.appendChild(portalTarget);

      const PortalComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Portal component error');
        }
        return <div data-testid="portal-component">Portal Component</div>;
      };

      const PortalContainer = () => {
        const [showPortal, setShowPortal] = React.useState(false);
        
        return (
          <div>
            <button 
              data-testid="show-portal-button"
              onClick={() => setShowPortal(true)}
            >
              Show Portal
            </button>
            {showPortal && ReactDOM.createPortal(
              <PortalComponent shouldThrow={true} />,
              portalTarget
            )}
          </div>
        );
      };

      render(
        <ErrorBoundary onError={onError}>
          <PortalContainer />
        </ErrorBoundary>
      );

      const showPortalButton = screen.getByTestId('show-portal-button');
      fireEvent.click(showPortalButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Portal component error' }),
        expect.any(Object)
      );

      // Cleanup
      document.body.removeChild(portalTarget);
    });
  });

  describe('Component Lifecycle Integration', () => {
    it('should handle errors in different lifecycle phases across hierarchy', async () => {
      const onError = vi.fn();

      class LifecycleComponent extends React.Component<{ 
        phase: 'constructor' | 'render' | 'mount' | 'update';
        shouldThrow: boolean;
      }> {
        constructor(props: any) {
          super(props);
          if (props.phase === 'constructor' && props.shouldThrow) {
            throw new Error('Constructor error in hierarchy');
          }
        }

        componentDidMount() {
          if (this.props.phase === 'mount' && this.props.shouldThrow) {
            throw new Error('Mount error in hierarchy');
          }
        }

        componentDidUpdate() {
          if (this.props.phase === 'update' && this.props.shouldThrow) {
            throw new Error('Update error in hierarchy');
          }
        }

        render() {
          if (this.props.phase === 'render' && this.props.shouldThrow) {
            throw new Error('Render error in hierarchy');
          }
          return <div data-testid="lifecycle-component">Lifecycle Component</div>;
        }
      }

      const phases: Array<'constructor' | 'render' | 'mount' | 'update'> = ['constructor', 'render', 'mount'];

      for (const phase of phases) {
        render(
          <ErrorBoundary onError={onError} key={phase}>
            <div>
              <h2>Testing {phase} phase</h2>
              <LifecycleComponent phase={phase} shouldThrow={true} />
            </div>
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({ message: `${phase.charAt(0).toUpperCase() + phase.slice(1)} error in hierarchy` }),
          expect.any(Object)
        );

        // Reset for next test
        onError.mockClear();
      }
    });
  });
});