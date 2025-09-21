/**
 * Usage Examples for Error Boundary Configuration and Customization
 */

import React from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { 
  PageErrorBoundary, 
  ComponentErrorBoundary, 
  FormErrorBoundary,
  ModalErrorBoundary,
  withErrorBoundary,
  DevErrorBoundary,
  ProdErrorBoundary,
  TestErrorBoundary
} from '@/components/error/ErrorBoundaryWrappers';
import { 
  ComposedErrorBoundary,
  ErrorBoundaryHierarchy,
  RouteErrorBoundary,
  FeatureErrorBoundary,
  ErrorBoundaryFactory,
  ErrorBoundaryRegistry
} from '@/components/error/ErrorBoundaryComposition';
import { errorBoundaryConfig, configHelpers } from '@/config/errorBoundary.config';

// Example 1: Basic Configuration
export const BasicConfigurationExample: React.FC = () => {
  const customConfig = {
    theme: 'detailed' as const,
    enableReporting: true,
    showErrorDetails: true,
    maxRetries: 5,
    messages: {
      title: 'Oops! Something went wrong',
      description: 'We encountered an unexpected error. Please try again or contact support.',
      retryButton: 'Try Again',
      homeButton: 'Back to Home',
      reportButton: 'Report Issue',
      refreshButton: 'Refresh Page'
    }
  };

  return (
    <ErrorBoundary config={customConfig}>
      <div>Your application content here</div>
    </ErrorBoundary>
  );
};

// Example 2: Environment-Specific Configuration
export const EnvironmentConfigurationExample: React.FC = () => {
  // Configure different behavior for different environments
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      errorBoundaryConfig.updateConfig(configHelpers.forDevelopment());
    } else if (process.env.NODE_ENV === 'production') {
      errorBoundaryConfig.updateConfig(configHelpers.forProduction());
    } else {
      errorBoundaryConfig.updateConfig(configHelpers.forTesting());
    }
  }, []);

  return (
    <ErrorBoundary>
      <div>Environment-aware error handling</div>
    </ErrorBoundary>
  );
};

// Example 3: Using Pre-configured Wrappers
export const WrapperExamples: React.FC = () => {
  return (
    <div>
      {/* Page-level error boundary */}
      <PageErrorBoundary>
        <div>Page content with comprehensive error handling</div>
      </PageErrorBoundary>

      {/* Component-level error boundary */}
      <ComponentErrorBoundary>
        <div>Component with isolated error handling</div>
      </ComponentErrorBoundary>

      {/* Form-specific error boundary */}
      <FormErrorBoundary>
        <form>
          <input type="text" placeholder="Form input" />
          <button type="submit">Submit</button>
        </form>
      </FormErrorBoundary>

      {/* Modal-specific error boundary */}
      <ModalErrorBoundary>
        <div className="modal">Modal content</div>
      </ModalErrorBoundary>
    </div>
  );
};

// Example 4: Higher-Order Component Usage
const MyComponent: React.FC<{ data: any }> = ({ data }) => {
  return <div>Component with data: {data.value}</div>;
};

export const HOCExample = withErrorBoundary(MyComponent, {
  theme: 'minimal',
  enableReporting: false,
  messages: {
    title: 'Component Error',
    description: 'This component encountered an error.',
    retryButton: 'Retry Component',
    homeButton: 'Skip Component',
    reportButton: 'Report',
    refreshButton: 'Refresh'
  }
});

// Example 5: Hierarchical Error Boundaries
export const HierarchicalExample: React.FC = () => {
  return (
    <ErrorBoundaryHierarchy
      appConfig={{
        theme: 'default',
        enableReporting: true,
        messages: {
          title: 'Application Error',
          description: 'A critical application error occurred.',
          retryButton: 'Restart App',
          homeButton: 'Go to Dashboard',
          reportButton: 'Report Bug',
          refreshButton: 'Reload'
        }
      }}
      pageConfig={{
        theme: 'default',
        enableIsolation: true,
        messages: {
          title: 'Page Error',
          description: 'This page encountered an error.',
          retryButton: 'Retry Page',
          homeButton: 'Go Home',
          reportButton: 'Report Issue',
          refreshButton: 'Refresh'
        }
      }}
      sectionConfig={{
        theme: 'minimal',
        enableReporting: false
      }}
    >
      <div>Nested application content</div>
    </ErrorBoundaryHierarchy>
  );
};

// Example 6: Route-Based Configuration
export const RouteBasedExample: React.FC = () => {
  const routeConfigs = {
    '/dashboard': {
      theme: 'default' as const,
      enableReporting: true,
      messages: {
        title: 'Dashboard Error',
        description: 'The dashboard encountered an error.',
        retryButton: 'Reload Dashboard',
        homeButton: 'Go to Main',
        reportButton: 'Report Dashboard Issue',
        refreshButton: 'Refresh'
      }
    },
    '/profile': {
      theme: 'minimal' as const,
      enableReporting: false,
      messages: {
        title: 'Profile Error',
        description: 'Your profile page had an issue.',
        retryButton: 'Retry',
        homeButton: 'Back',
        reportButton: 'Report',
        refreshButton: 'Refresh'
      }
    },
    '/admin': {
      theme: 'detailed' as const,
      showErrorDetails: true,
      showStackTrace: true,
      enableReporting: true,
      messages: {
        title: 'Admin Panel Error',
        description: 'An error occurred in the admin panel.',
        retryButton: 'Retry Operation',
        homeButton: 'Exit Admin',
        reportButton: 'Report to IT',
        refreshButton: 'Reload Panel'
      }
    }
  };

  return (
    <RouteErrorBoundary routeConfigs={routeConfigs}>
      <div>Route-specific error handling</div>
    </RouteErrorBoundary>
  );
};

// Example 7: Feature-Based Configuration
export const FeatureBasedExample: React.FC = () => {
  const featureConfigs = {
    'user-management': {
      theme: 'default' as const,
      enableReporting: true,
      messages: {
        title: 'User Management Error',
        description: 'An error occurred in user management.',
        retryButton: 'Retry Operation',
        homeButton: 'Back to Users',
        reportButton: 'Report Issue',
        refreshButton: 'Refresh'
      }
    },
    'file-upload': {
      theme: 'minimal' as const,
      maxRetries: 5,
      messages: {
        title: 'Upload Error',
        description: 'File upload failed.',
        retryButton: 'Retry Upload',
        homeButton: 'Cancel Upload',
        reportButton: 'Report Problem',
        refreshButton: 'Reset'
      }
    }
  };

  return (
    <div>
      <FeatureErrorBoundary feature="user-management" featureConfigs={featureConfigs}>
        <div>User management interface</div>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary feature="file-upload" featureConfigs={featureConfigs}>
        <div>File upload component</div>
      </FeatureErrorBoundary>
    </div>
  );
};// Ex
ample 8: Composed Error Boundaries
export const ComposedExample: React.FC = () => {
  const boundaries = [
    {
      level: 'app' as const,
      config: {
        theme: 'default' as const,
        enableIsolation: false,
        enableReporting: true,
        messages: {
          title: 'Application Error',
          description: 'Critical application error.',
          retryButton: 'Restart',
          homeButton: 'Home',
          reportButton: 'Report',
          refreshButton: 'Reload'
        }
      }
    },
    {
      level: 'page' as const,
      config: {
        theme: 'default' as const,
        enableIsolation: true,
        messages: {
          title: 'Page Error',
          description: 'Page-level error occurred.',
          retryButton: 'Retry Page',
          homeButton: 'Go Back',
          reportButton: 'Report Issue',
          refreshButton: 'Refresh'
        }
      }
    },
    {
      level: 'component' as const,
      config: {
        theme: 'minimal' as const,
        enableReporting: false,
        messages: {
          title: 'Component Error',
          description: 'Component failed.',
          retryButton: 'Retry',
          homeButton: 'Skip',
          reportButton: 'Report',
          refreshButton: 'Reset'
        }
      }
    }
  ];

  return (
    <ComposedErrorBoundary boundaries={boundaries} isolationStrategy="cascade">
      <div>Multi-level error boundary protection</div>
    </ComposedErrorBoundary>
  );
};

// Example 9: Factory Pattern Usage
export const FactoryExample: React.FC = () => {
  // Set default configuration for all factory-created boundaries
  ErrorBoundaryFactory.setDefaultConfig({
    enableReporting: true,
    theme: 'default',
    logLevel: 'error'
  });

  // Create specific boundary types
  const CustomPageBoundary = ErrorBoundaryFactory.createPageBoundary({
    messages: {
      title: 'Custom Page Error',
      description: 'Page error with custom config.',
      retryButton: 'Retry',
      homeButton: 'Home',
      reportButton: 'Report',
      refreshButton: 'Refresh'
    }
  });

  const CustomFormBoundary = ErrorBoundaryFactory.createFormBoundary({
    maxRetries: 5,
    messages: {
      title: 'Form Submission Error',
      description: 'Form could not be submitted.',
      retryButton: 'Retry Submit',
      homeButton: 'Cancel',
      reportButton: 'Report Issue',
      refreshButton: 'Reset Form'
    }
  });

  return (
    <div>
      <CustomPageBoundary>
        <div>Page with factory-created boundary</div>
      </CustomPageBoundary>

      <CustomFormBoundary>
        <form>Factory-created form boundary</form>
      </CustomFormBoundary>
    </div>
  );
};

// Example 10: Registry Pattern Usage
export const RegistryExample: React.FC = () => {
  React.useEffect(() => {
    // Register named error boundaries
    ErrorBoundaryRegistry.createNamed('dashboard-boundary', {
      theme: 'default',
      enableReporting: true,
      messages: {
        title: 'Dashboard Error',
        description: 'Dashboard component error.',
        retryButton: 'Reload Dashboard',
        homeButton: 'Main Menu',
        reportButton: 'Report Bug',
        refreshButton: 'Refresh'
      }
    }, 'page');

    ErrorBoundaryRegistry.createNamed('widget-boundary', {
      theme: 'minimal',
      enableReporting: false,
      messages: {
        title: 'Widget Error',
        description: 'Widget failed to load.',
        retryButton: 'Retry',
        homeButton: 'Skip',
        reportButton: 'Report',
        refreshButton: 'Reset'
      }
    }, 'component');
  }, []);

  const DashboardBoundary = ErrorBoundaryRegistry.use('dashboard-boundary');
  const WidgetBoundary = ErrorBoundaryRegistry.use('widget-boundary');

  return (
    <div>
      <DashboardBoundary>
        <div>Dashboard content</div>
      </DashboardBoundary>

      <WidgetBoundary>
        <div>Widget content</div>
      </WidgetBoundary>
    </div>
  );
};

// Example 11: Environment-Specific Wrappers
export const EnvironmentWrapperExample: React.FC = () => {
  return (
    <div>
      {/* Development-only error boundary */}
      <DevErrorBoundary>
        <div>Development features with detailed error info</div>
      </DevErrorBoundary>

      {/* Production error boundary */}
      <ProdErrorBoundary>
        <div>Production content with minimal error exposure</div>
      </ProdErrorBoundary>

      {/* Test environment boundary */}
      <TestErrorBoundary>
        <div>Test content with error isolation</div>
      </TestErrorBoundary>
    </div>
  );
};

// Example 12: Dynamic Configuration
export const DynamicConfigurationExample: React.FC = () => {
  const [userRole, setUserRole] = React.useState<'admin' | 'user' | 'guest'>('user');

  const getConfigForRole = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          theme: 'detailed' as const,
          showErrorDetails: true,
          showStackTrace: true,
          enableReporting: true,
          messages: {
            title: 'Admin Error',
            description: 'Administrative error with full details.',
            retryButton: 'Retry Operation',
            homeButton: 'Admin Dashboard',
            reportButton: 'Report to IT',
            refreshButton: 'Reload'
          }
        };
      case 'user':
        return {
          theme: 'default' as const,
          showErrorDetails: false,
          enableReporting: true,
          messages: {
            title: 'Something went wrong',
            description: 'We encountered an error. Please try again.',
            retryButton: 'Try Again',
            homeButton: 'Go Home',
            reportButton: 'Report Issue',
            refreshButton: 'Refresh'
          }
        };
      case 'guest':
        return {
          theme: 'minimal' as const,
          showErrorDetails: false,
          enableReporting: false,
          messages: {
            title: 'Error',
            description: 'Please try again or sign in.',
            retryButton: 'Retry',
            homeButton: 'Home',
            reportButton: 'Contact Support',
            refreshButton: 'Refresh'
          }
        };
      default:
        return configHelpers.createMinimalConfig();
    }
  };

  return (
    <div>
      <select value={userRole} onChange={(e) => setUserRole(e.target.value as any)}>
        <option value="admin">Admin</option>
        <option value="user">User</option>
        <option value="guest">Guest</option>
      </select>

      <ErrorBoundary config={getConfigForRole(userRole)}>
        <div>Content with role-based error handling</div>
      </ErrorBoundary>
    </div>
  );
};

// Example 13: Custom Error Handler Integration
export const CustomHandlerExample: React.FC = () => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Custom error handling logic
    console.log('Custom error handler:', error.message);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
    
    // Send to custom logging service
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  };

  return (
    <ErrorBoundary
      config={{
        theme: 'default',
        enableReporting: true,
        messages: {
          title: 'Application Error',
          description: 'An error occurred and has been logged.',
          retryButton: 'Try Again',
          homeButton: 'Go Home',
          reportButton: 'Send Feedback',
          refreshButton: 'Refresh'
        }
      }}
      onError={handleError}
    >
      <div>Application with custom error handling</div>
    </ErrorBoundary>
  );
};