/**
 * React Hook for Error Monitoring Integration
 * Provides easy access to error monitoring functionality in React components
 */

import { useEffect, useCallback, useState } from 'react';
import { errorMonitoring, ErrorMetrics, ErrorRateMetrics } from '../services/errorMonitoring';

export interface UseErrorMonitoringReturn {
  trackError: (error: Partial<ErrorMetrics>) => void;
  getErrorMetrics: (timeWindowMinutes?: number) => ErrorRateMetrics;
  getErrorAnalysis: () => ReturnType<typeof errorMonitoring.getErrorAnalysis>;
  markErrorResolved: (errorId: string) => void;
  monitoringStatus: ReturnType<typeof errorMonitoring.getMonitoringStatus>;
  isMonitoring: boolean;
}

/**
 * Hook for integrating error monitoring into React components
 */
export const useErrorMonitoring = (componentName?: string): UseErrorMonitoringReturn => {
  const [monitoringStatus, setMonitoringStatus] = useState(
    errorMonitoring.getMonitoringStatus()
  );

  // Update monitoring status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMonitoringStatus(errorMonitoring.getMonitoringStatus());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Track an error with component context
   */
  const trackError = useCallback((error: Partial<ErrorMetrics>) => {
    const errorWithDefaults: ErrorMetrics = {
      errorId: `${componentName || 'component'}-${Date.now()}`,
      timestamp: Date.now(),
      severity: 'medium',
      category: 'runtime',
      message: 'Unknown error',
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: `session-${Date.now()}`,
      resolved: false,
      component: componentName,
      ...error
    };

    errorMonitoring.trackError(errorWithDefaults);
  }, [componentName]);

  /**
   * Get error rate metrics
   */
  const getErrorMetrics = useCallback((timeWindowMinutes?: number) => {
    return errorMonitoring.getErrorRateMetrics(timeWindowMinutes);
  }, []);

  /**
   * Get error analysis
   */
  const getErrorAnalysis = useCallback(() => {
    return errorMonitoring.getErrorAnalysis();
  }, []);

  /**
   * Mark an error as resolved
   */
  const markErrorResolved = useCallback((errorId: string) => {
    errorMonitoring.markErrorResolved(errorId);
  }, []);

  return {
    trackError,
    getErrorMetrics,
    getErrorAnalysis,
    markErrorResolved,
    monitoringStatus,
    isMonitoring: monitoringStatus.isActive
  };
};

/**
 * Hook for monitoring component performance
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [renderCount, setRenderCount] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    setRenderCount(prev => prev + 1);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setRenderTime(duration);

      // Track slow renders
      if (duration > 16) { // More than one frame (60fps)
        errorMonitoring.trackError({
          errorId: `perf-${componentName}-${Date.now()}`,
          severity: duration > 100 ? 'high' : 'medium',
          category: 'system',
          message: `Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`,
          component: componentName,
          responseTime: duration,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: `session-${Date.now()}`,
          resolved: false
        });
      }
    };
  });

  return {
    renderTime,
    renderCount,
    averageRenderTime: renderCount > 0 ? renderTime / renderCount : 0
  };
};

/**
 * Hook for error boundary integration
 */
export const useErrorBoundaryMonitoring = () => {
  const { trackError } = useErrorMonitoring('ErrorBoundary');

  const trackBoundaryError = useCallback((error: Error, errorInfo: any, componentStack?: string) => {
    trackError({
      severity: 'critical',
      category: 'runtime',
      message: error.message,
      stack: error.stack,
      component: 'ErrorBoundary',
      responseTime: performance.now() // Approximate time since page load
    });
  }, [trackError]);

  return {
    trackBoundaryError
  };
};

export default useErrorMonitoring;