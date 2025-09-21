/**
 * Error Boundary Wrapper Utilities
 * Provides pre-configured error boundaries for different use cases
 */

import React, { ReactNode, ComponentType } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { errorBoundaryConfig, ErrorBoundaryConfig, configHelpers } from '@/config/errorBoundary.config';

// Base wrapper interface
interface WrapperProps {
  children: ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Page-level error boundary wrapper
export const PageErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const pageConfig = {
    ...errorBoundaryConfig.getConfig(),
    enableIsolation: true,
    maxRetries: 2,
    enableHomeButton: true,
    enableRetryButton: true,
    enableReportButton: true,
    theme: 'default' as const,
    ...config
  };

  return (
    <ErrorBoundary
      config={pageConfig}
      onError={onError}
      isolateErrors={pageConfig.enableIsolation}
      enableReporting={pageConfig.enableReporting}
      showErrorDetails={pageConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Component-level error boundary wrapper
export const ComponentErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const componentConfig = {
    ...errorBoundaryConfig.getConfig(),
    enableIsolation: false,
    maxRetries: 1,
    enableHomeButton: false,
    enableRetryButton: true,
    enableReportButton: false,
    theme: 'minimal' as const,
    ...config
  };

  return (
    <ErrorBoundary
      config={componentConfig}
      onError={onError}
      isolateErrors={componentConfig.enableIsolation}
      enableReporting={componentConfig.enableReporting}
      showErrorDetails={componentConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Form-specific error boundary wrapper
export const FormErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const formConfig = {
    ...errorBoundaryConfig.getConfig(),
    enableIsolation: false,
    maxRetries: 3,
    enableHomeButton: false,
    enableRetryButton: true,
    enableReportButton: true,
    theme: 'default' as const,
    messages: {
      title: 'Form Error',
      description: 'There was an issue with the form. Please try again.',
      retryButton: 'Retry Form',
      homeButton: 'Cancel',
      reportButton: 'Report Issue',
      refreshButton: 'Reset Form'
    },
    ...config
  };

  return (
    <ErrorBoundary
      config={formConfig}
      onError={onError}
      isolateErrors={formConfig.enableIsolation}
      enableReporting={formConfig.enableReporting}
      showErrorDetails={formConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Modal-specific error boundary wrapper
export const ModalErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const modalConfig = {
    ...errorBoundaryConfig.getConfig(),
    enableIsolation: true,
    maxRetries: 1,
    enableHomeButton: false,
    enableRetryButton: true,
    enableReportButton: false,
    theme: 'minimal' as const,
    messages: {
      title: 'Modal Error',
      description: 'Something went wrong in this dialog.',
      retryButton: 'Try Again',
      homeButton: 'Close',
      reportButton: 'Report',
      refreshButton: 'Reset'
    },
    ...config
  };

  return (
    <ErrorBoundary
      config={modalConfig}
      onError={onError}
      isolateErrors={modalConfig.enableIsolation}
      enableReporting={modalConfig.enableReporting}
      showErrorDetails={modalConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Safe environment variable access
const getNodeEnv = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV || 'development';
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__.NODE_ENV || 'development';
  }
  return 'development';
};

// Development-only error boundary wrapper
export const DevErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  // Only render in development
  if (getNodeEnv() !== 'development') {
    return <>{children}</>;
  }

  const devConfig = {
    ...configHelpers.forDevelopment(),
    theme: 'detailed' as const,
    showErrorDetails: true,
    showStackTrace: true,
    showComponentStack: true,
    enableConsoleLogging: true,
    logLevel: 'debug' as const,
    ...config
  };

  return (
    <ErrorBoundary
      config={devConfig}
      onError={onError}
      isolateErrors={devConfig.enableIsolation}
      enableReporting={devConfig.enableReporting}
      showErrorDetails={devConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Production-only error boundary wrapper
export const ProdErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const prodConfig = {
    ...configHelpers.forProduction(),
    theme: 'minimal' as const,
    showErrorDetails: false,
    showStackTrace: false,
    showComponentStack: false,
    enableRemoteLogging: true,
    logLevel: 'error' as const,
    ...config
  };

  return (
    <ErrorBoundary
      config={prodConfig}
      onError={onError}
      isolateErrors={prodConfig.enableIsolation}
      enableReporting={prodConfig.enableReporting}
      showErrorDetails={prodConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Test-specific error boundary wrapper
export const TestErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const testConfig = {
    ...configHelpers.forTesting(),
    enableReporting: false,
    enableAutoRecovery: false,
    maxRetries: 0,
    enableRetryButton: false,
    enableHomeButton: false,
    enableReportButton: false,
    ...config
  };

  return (
    <ErrorBoundary
      config={testConfig}
      onError={onError}
      isolateErrors={testConfig.enableIsolation}
      enableReporting={testConfig.enableReporting}
      showErrorDetails={testConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};

// Higher-order component for automatic error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  boundaryConfig?: Partial<ErrorBoundaryConfig>,
  wrapperType: 'page' | 'component' | 'form' | 'modal' = 'component'
) {
  const WrappedComponent = (props: P) => {
    const WrapperComponent = {
      page: PageErrorBoundary,
      component: ComponentErrorBoundary,
      form: FormErrorBoundary,
      modal: ModalErrorBoundary
    }[wrapperType];

    return (
      <WrapperComponent config={boundaryConfig}>
        <Component {...props} />
      </WrapperComponent>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Conditional error boundary wrapper based on environment
export const ConditionalErrorBoundary: React.FC<WrapperProps & {
  environments?: string[];
}> = ({
  children,
  config = {},
  onError,
  environments = ['development', 'production']
}) => {
    const currentEnv = getNodeEnv();

    // Only wrap if current environment is in the allowed list
    if (!environments.includes(currentEnv)) {
      return <>{children}</>;
    }

    const envConfig = {
      ...errorBoundaryConfig.getConfig(),
      ...config
    };

    return (
      <ErrorBoundary
        config={envConfig}
        onError={onError}
        isolateErrors={envConfig.enableIsolation}
        enableReporting={envConfig.enableReporting}
        showErrorDetails={envConfig.showErrorDetails}
      >
        {children}
      </ErrorBoundary>
    );
  };

// Async component error boundary wrapper
export const AsyncErrorBoundary: React.FC<WrapperProps> = ({
  children,
  config = {},
  onError
}) => {
  const asyncConfig = {
    ...errorBoundaryConfig.getConfig(),
    enableAutoRecovery: true,
    maxRetries: 3,
    retryDelay: 2000,
    enableRetryButton: true,
    enableReportButton: true,
    messages: {
      title: 'Loading Error',
      description: 'Failed to load content. This might be a temporary issue.',
      retryButton: 'Retry Loading',
      homeButton: 'Go Back',
      reportButton: 'Report Issue',
      refreshButton: 'Refresh'
    },
    ...config
  };

  return (
    <ErrorBoundary
      config={asyncConfig}
      onError={onError}
      isolateErrors={asyncConfig.enableIsolation}
      enableReporting={asyncConfig.enableReporting}
      showErrorDetails={asyncConfig.showErrorDetails}
    >
      {children}
    </ErrorBoundary>
  );
};