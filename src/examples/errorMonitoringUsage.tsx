/**
 * Error Monitoring Usage Examples
 * Demonstrates how to integrate and use the error monitoring system
 */

import React, { useEffect, useState } from 'react';
import { useErrorMonitoring, usePerformanceMonitoring } from '../hooks/useErrorMonitoring';
import ErrorAnalyticsDashboard from '../components/error/ErrorAnalyticsDashboard';
import { errorMonitoring } from '../services/errorMonitoring';
import { getErrorMonitoringConfig } from '../config/errorMonitoring.config';

// Example 1: Basic component with error monitoring
const MonitoredComponent: React.FC = () => {
  const { trackError, isMonitoring } = useErrorMonitoring('MonitoredComponent');
  const { renderTime, renderCount } = usePerformanceMonitoring('MonitoredComponent');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      // Track the error with context
      trackError({
        message: error instanceof Error ? error.message : 'Unknown fetch error',
        severity: 'high',
        category: 'network',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: performance.now() // Time since component mount
      });
      
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = () => {
    try {
      // Simulate user action that might fail
      if (Math.random() < 0.3) {
        throw new Error('Random user action failure');
      }
      console.log('User action successful');
    } catch (error) {
      trackError({
        message: error instanceof Error ? error.message : 'User action failed',
        severity: 'medium',
        category: 'user'
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Monitored Component</h3>
      
      <div className="mb-4 text-sm text-gray-600">
        <p>Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</p>
        <p>Render time: {renderTime.toFixed(2)}ms</p>
        <p>Render count: {renderCount}</p>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Fetch Data'}
        </button>
        
        <button
          onClick={handleUserAction}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          User Action (30% fail rate)
        </button>
      </div>
      
      {data && (
        <div className="mt-4 p-2 bg-gray-100 rounded">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Example 2: Error boundary with monitoring integration
class MonitoredErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorId?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorId: `boundary-${Date.now()}` };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error in monitoring system
    errorMonitoring.trackError({
      errorId: this.state.errorId || `boundary-${Date.now()}`,
      timestamp: Date.now(),
      severity: 'critical',
      category: 'runtime',
      component: 'MonitoredErrorBoundary',
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: `session-${Date.now()}`,
      resolved: false
    });

    console.error('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-2">
            Error ID: {this.state.errorId}
          </p>
          <button
            onClick={() => {
              // Mark error as resolved when user recovers
              if (this.state.errorId) {
                errorMonitoring.markErrorResolved(this.state.errorId);
              }
              this.setState({ hasError: false, errorId: undefined });
            }}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Example 3: Component that intentionally throws errors for testing
const ErrorGeneratorComponent: React.FC = () => {
  const { trackError } = useErrorMonitoring('ErrorGenerator');
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Intentional error for testing error boundary');
  }

  const generateErrors = () => {
    const errorTypes = [
      {
        message: 'Simulated network timeout',
        severity: 'high' as const,
        category: 'network' as const
      },
      {
        message: 'Validation error: Invalid email format',
        severity: 'medium' as const,
        category: 'user' as const
      },
      {
        message: 'Memory allocation failed',
        severity: 'critical' as const,
        category: 'system' as const
      },
      {
        message: 'Component render failed',
        severity: 'high' as const,
        category: 'runtime' as const
      }
    ];

    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    trackError(randomError);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Error Generator</h3>
      <p className="text-sm text-gray-600 mb-4">
        Use these buttons to generate different types of errors for testing.
      </p>
      
      <div className="space-y-2">
        <button
          onClick={generateErrors}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Generate Random Error
        </button>
        
        <button
          onClick={() => setShouldThrow(true)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
        >
          Throw Error (Test Boundary)
        </button>
      </div>
    </div>
  );
};

// Example 4: Analytics dashboard integration
const ErrorMonitoringDashboard: React.FC = () => {
  const { getErrorMetrics, getErrorAnalysis, monitoringStatus } = useErrorMonitoring('Dashboard');
  const [showConfig, setShowConfig] = useState(false);
  const config = getErrorMonitoringConfig();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Error Monitoring Dashboard</h2>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
        >
          {showConfig ? 'Hide' : 'Show'} Config
        </button>
      </div>

      {showConfig && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current Configuration</h3>
          <div className="text-sm space-y-1">
            <p>Environment: {config.environment}</p>
            <p>Enabled: {config.enabled ? 'Yes' : 'No'}</p>
            <p>Error Rate Threshold: {config.alerts.errorRateThreshold}/hour</p>
            <p>Critical Error Threshold: {config.alerts.criticalErrorThreshold}</p>
            <p>Performance Monitoring: {config.performanceMonitoring.enabled ? 'Yes' : 'No'}</p>
            <p>Sentry Integration: {config.integrations.sentry.enabled ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}

      <ErrorAnalyticsDashboard 
        showDetailedMetrics={true}
        refreshInterval={10000} // 10 seconds
      />
    </div>
  );
};

// Example 5: Complete application setup
const ErrorMonitoringExampleApp: React.FC = () => {
  useEffect(() => {
    // Initialize error monitoring on app startup
    const config = getErrorMonitoringConfig();
    console.log('Error monitoring initialized with config:', config);

    // Set up global error handlers (already done by errorMonitoring service)
    // Additional app-specific setup can go here

    return () => {
      // Cleanup on app unmount
      errorMonitoring.cleanup();
    };
  }, []);

  return (
    <MonitoredErrorBoundary>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-center">
            Error Monitoring System Examples
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonitoredComponent />
            <ErrorGeneratorComponent />
          </div>
          
          <ErrorMonitoringDashboard />
        </div>
      </div>
    </MonitoredErrorBoundary>
  );
};

// Example 6: Custom hook for specific error types
export const useNetworkErrorMonitoring = () => {
  const { trackError } = useErrorMonitoring('NetworkMonitor');

  const trackNetworkError = (url: string, status?: number, statusText?: string) => {
    trackError({
      message: `Network request failed: ${url}`,
      severity: status && status >= 500 ? 'high' : 'medium',
      category: 'network',
      responseTime: performance.now()
    });
  };

  const trackApiError = (endpoint: string, error: any) => {
    trackError({
      message: `API error at ${endpoint}: ${error.message || 'Unknown error'}`,
      severity: 'high',
      category: 'network',
      stack: error.stack
    });
  };

  return {
    trackNetworkError,
    trackApiError
  };
};

// Example 7: Performance monitoring for specific operations
export const useOperationMonitoring = (operationName: string) => {
  const { trackError } = useErrorMonitoring(`Operation-${operationName}`);

  const monitorOperation = async <T>(
    operation: () => Promise<T>,
    options?: {
      timeoutMs?: number;
      retries?: number;
    }
  ): Promise<T> => {
    const startTime = performance.now();
    const timeout = options?.timeoutMs || 30000;
    const maxRetries = options?.retries || 0;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeout);
        });
        
        const result = await Promise.race([operation(), timeoutPromise]);
        
        const duration = performance.now() - startTime;
        
        // Track slow operations
        if (duration > 5000) {
          trackError({
            message: `Slow operation: ${operationName} took ${duration.toFixed(2)}ms`,
            severity: 'medium',
            category: 'system',
            responseTime: duration
          });
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          trackError({
            message: `Operation failed: ${operationName} - ${lastError.message}`,
            severity: 'high',
            category: 'runtime',
            stack: lastError.stack,
            responseTime: performance.now() - startTime
          });
          throw lastError;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    throw lastError;
  };

  return { monitorOperation };
};

export default ErrorMonitoringExampleApp;