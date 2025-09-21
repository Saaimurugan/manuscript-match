/**
 * Tests for Error Boundary Configuration and Customization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { 
  PageErrorBoundary, 
  ComponentErrorBoundary, 
  FormErrorBoundary,
  ModalErrorBoundary,
  withErrorBoundary 
} from '../ErrorBoundaryWrappers';
import { 
  ComposedErrorBoundary,
  ErrorBoundaryHierarchy,
  RouteErrorBoundary,
  FeatureErrorBoundary 
} from '../ErrorBoundaryComposition';
import { errorBoundaryConfig, configHelpers } from '@/config/errorBoundary.config';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Configuration', () => {
  beforeEach(() => {
    // Reset configuration before each test
    errorBoundaryConfig.resetToDefaults();
    jest.clearAllMocks();
  });

  describe('Basic Configuration', () => {
    it('should use default configuration when no config provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should apply custom configuration', () => {
      const customConfig = {
        messages: {
          title: 'Custom Error Title',
          description: 'Custom error description',
          retryButton: 'Custom Retry',
          homeButton: 'Custom Home',
          reportButton: 'Custom Report',
          refreshButton: 'Custom Refresh'
        },
        enableRetryButton: true,
        enableHomeButton: true,
        enableReportButton: false
      };

      render(
        <ErrorBoundary config={customConfig}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
      expect(screen.getByText('Custom Home')).toBeInTheDocument();
      expect(screen.queryByText('Custom Report')).not.toBeInTheDocument();
    });

    it('should override global config with component config', () => {
      // Set global config
      errorBoundaryConfig.updateConfig({
        enableRetryButton: false,
        messages: { title: 'Global Title', description: '', retryButton: '', homeButton: '', reportButton: '', refreshButton: '' }
      });

      // Component config should override
      const componentConfig = {
        enableRetryButton: true,
        messages: {
          title: 'Component Title',
          description: 'Component description',
          retryButton: 'Component Retry',
          homeButton: 'Component Home',
          reportButton: 'Component Report',
          refreshButton: 'Component Refresh'
        }
      };

      render(
        <ErrorBoundary config={componentConfig}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Title')).toBeInTheDocument();
      expect(screen.getByText('Component Retry')).toBeInTheDocument();
    });
  });

  describe('Theme Configuration', () => {
    it('should render minimal theme', () => {
      const config = {
        theme: 'minimal' as const,
        messages: {
          title: 'Minimal Error',
          description: 'Minimal description',
          retryButton: 'Retry',
          homeButton: 'Home',
          reportButton: 'Report',
          refreshButton: 'Refresh'
        }
      };

      render(
        <ErrorBoundary config={config}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Minimal Error')).toBeInTheDocument();
      // Minimal theme should have simpler layout
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render detailed theme with error information', () => {
      const config = {
        theme: 'detailed' as const,
        showErrorDetails: true,
        showStackTrace: true,
        messages: {
          title: 'Detailed Error',
          description: 'Detailed description',
          retryButton: 'Retry',
          homeButton: 'Home',
          reportButton: 'Report',
          refreshButton: 'Refresh'
        }
      };

      render(
        <ErrorBoundary config={config}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Detailed Error')).toBeInTheDocument();
      // Should show error details button
      expect(screen.getByText(/show.*error details/i)).toBeInTheDocument();
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should apply development configuration', () => {
      const devConfig = configHelpers.forDevelopment();
      
      render(
        <ErrorBoundary config={devConfig}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Development should show error details
      expect(screen.getByTestId('error-boundary')).toHaveAttribute('data-error-category');
      expect(screen.getByTestId('error-boundary')).toHaveAttribute('data-error-severity');
    });

    it('should apply production configuration', () => {
      const prodConfig = configHelpers.forProduction();
      
      render(
        <ErrorBoundary config={prodConfig}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Production should hide sensitive details
      expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();
    });

    it('should apply test configuration', () => {
      const testConfig = configHelpers.forTesting();
      
      render(
        <ErrorBoundary config={testConfig}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Test config should disable reporting
      expect(screen.queryByText(/report/i)).not.toBeInTheDocument();
    });
  });
});

describe('Error Boundary Wrappers', () => {
  it('should render PageErrorBoundary with page-specific config', () => {
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(screen.getByText(/go home/i)).toBeInTheDocument();
  });

  it('should render ComponentErrorBoundary with component-specific config', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    // Component boundary should have minimal UI
    expect(screen.queryByText(/go home/i)).not.toBeInTheDocument();
  });

  it('should render FormErrorBoundary with form-specific config', () => {
    render(
      <FormErrorBoundary>
        <ThrowError />
      </FormErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/form error/i)).toBeInTheDocument();
  });

  it('should render ModalErrorBoundary with modal-specific config', () => {
    render(
      <ModalErrorBoundary>
        <ThrowError />
      </ModalErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/modal error/i)).toBeInTheDocument();
  });

  it('should work with withErrorBoundary HOC', () => {
    const TestComponent = () => <ThrowError />;
    const WrappedComponent = withErrorBoundary(TestComponent, {
      messages: {
        title: 'HOC Error',
        description: 'HOC description',
        retryButton: 'HOC Retry',
        homeButton: 'HOC Home',
        reportButton: 'HOC Report',
        refreshButton: 'HOC Refresh'
      }
    });

    render(<WrappedComponent />);

    expect(screen.getByText('HOC Error')).toBeInTheDocument();
  });
});

describe('Error Boundary Composition', () => {
  it('should render ComposedErrorBoundary with multiple levels', () => {
    const boundaries = [
      {
        level: 'app' as const,
        config: {
          messages: {
            title: 'App Level Error',
            description: 'App description',
            retryButton: 'App Retry',
            homeButton: 'App Home',
            reportButton: 'App Report',
            refreshButton: 'App Refresh'
          }
        }
      },
      {
        level: 'component' as const,
        config: {
          messages: {
            title: 'Component Level Error',
            description: 'Component description',
            retryButton: 'Component Retry',
            homeButton: 'Component Home',
            reportButton: 'Component Report',
            refreshButton: 'Component Refresh'
          }
        }
      }
    ];

    render(
      <ComposedErrorBoundary boundaries={boundaries}>
        <ThrowError />
      </ComposedErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('should render ErrorBoundaryHierarchy', () => {
    const appConfig = {
      messages: {
        title: 'App Error',
        description: 'App description',
        retryButton: 'App Retry',
        homeButton: 'App Home',
        reportButton: 'App Report',
        refreshButton: 'App Refresh'
      }
    };

    render(
      <ErrorBoundaryHierarchy appConfig={appConfig}>
        <ThrowError />
      </ErrorBoundaryHierarchy>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('should render RouteErrorBoundary with route-specific config', () => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/test-route' },
      writable: true
    });

    const routeConfigs = {
      '/test-route': {
        messages: {
          title: 'Route Error',
          description: 'Route description',
          retryButton: 'Route Retry',
          homeButton: 'Route Home',
          reportButton: 'Route Report',
          refreshButton: 'Route Refresh'
        }
      }
    };

    render(
      <RouteErrorBoundary routeConfigs={routeConfigs}>
        <ThrowError />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Route Error')).toBeInTheDocument();
  });

  it('should render FeatureErrorBoundary with feature-specific config', () => {
    const featureConfigs = {
      'test-feature': {
        messages: {
          title: 'Feature Error',
          description: 'Feature description',
          retryButton: 'Feature Retry',
          homeButton: 'Feature Home',
          reportButton: 'Feature Report',
          refreshButton: 'Feature Refresh'
        }
      }
    };

    render(
      <FeatureErrorBoundary feature="test-feature" featureConfigs={featureConfigs}>
        <ThrowError />
      </FeatureErrorBoundary>
    );

    expect(screen.getByText('Feature Error')).toBeInTheDocument();
  });
});

describe('Configuration Validation', () => {
  it('should validate configuration correctly', () => {
    const validConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      logLevel: 'error' as const,
      theme: 'default' as const
    };

    const validation = errorBoundaryConfig.validateConfig(validConfig);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid configuration', () => {
    const invalidConfig = {
      maxRetries: -1,
      retryDelay: 15000,
      logLevel: 'invalid' as any,
      theme: 'invalid' as any
    };

    const validation = errorBoundaryConfig.validateConfig(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe('Button Configuration', () => {
  it('should show/hide buttons based on configuration', () => {
    const config = {
      enableRetryButton: true,
      enableHomeButton: false,
      enableReportButton: true,
      enableRefreshButton: false,
      messages: {
        title: 'Button Test',
        description: 'Testing buttons',
        retryButton: 'Retry',
        homeButton: 'Home',
        reportButton: 'Report',
        refreshButton: 'Refresh'
      }
    };

    render(
      <ErrorBoundary config={config}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('should handle button clicks with custom handlers', async () => {
    const onError = jest.fn();
    const config = {
      enableRetryButton: true,
      messages: {
        title: 'Click Test',
        description: 'Testing clicks',
        retryButton: 'Retry',
        homeButton: 'Home',
        reportButton: 'Report',
        refreshButton: 'Refresh'
      }
    };

    render(
      <ErrorBoundary config={config} onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Should attempt to retry (component should re-render)
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});