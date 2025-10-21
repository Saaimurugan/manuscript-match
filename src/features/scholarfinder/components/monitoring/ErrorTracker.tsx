import React, { Component, ReactNode, ErrorInfo } from 'react';
import { monitoringService } from '../../services/MonitoringService';
import { analyticsService } from '../../services/AnalyticsService';

interface ErrorTrackerProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: Record<string, any>;
}

interface ErrorTrackerState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorTracker extends Component<ErrorTrackerProps, ErrorTrackerState> {
  constructor(props: ErrorTrackerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorTrackerState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Track error with monitoring service
    monitoringService.trackError({
      type: 'component_error',
      message: error.message,
      stack: error.stack,
      context: {
        ...this.props.context,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    // Track error with analytics service
    analyticsService.trackError(error, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorTracker caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback p-4 border border-red-300 rounded-md bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-4">
            An unexpected error occurred. The error has been reported and we're working to fix it.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-700 font-medium">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {this.state.error.stack}
              </pre>
              {this.state.errorInfo && (
                <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC version for easier integration
export const withErrorTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    context?: Record<string, any>;
  } = {}
) => {
  const ErrorTrackedComponent: React.FC<P> = (props) => (
    <ErrorTracker
      fallback={options.fallback}
      onError={options.onError}
      context={options.context}
    >
      <WrappedComponent {...props} />
    </ErrorTracker>
  );

  ErrorTrackedComponent.displayName = `withErrorTracking(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ErrorTrackedComponent;
};