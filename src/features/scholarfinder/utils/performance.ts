/**
 * Performance monitoring utilities
 * Tools for measuring and optimizing component performance
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number[]> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring performance for a specific operation
   */
  startMeasurement(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End measurement and record the duration
   */
  endMeasurement(name: string): number {
    if (typeof performance === 'undefined') return 0;

    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      const duration = measure?.duration || 0;

      // Store measurement
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);

      // Clean up marks
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);

      return duration;
    } catch (error) {
      console.warn(`Failed to measure performance for ${name}:`, error);
      return 0;
    }
  }

  /**
   * Get performance statistics for a measurement
   */
  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) return null;

    const total = measurements.reduce((sum, duration) => sum + duration, 0);
    const average = total / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return {
      count: measurements.length,
      average,
      min,
      max,
      total
    };
  }

  /**
   * Monitor long tasks (tasks that block the main thread for >50ms)
   */
  monitorLongTasks(callback?: (entries: PerformanceEntry[]) => void): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.warn(`Long task detected: ${entry.duration}ms`, entry);
        });
        callback?.(entries);
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }
  }

  /**
   * Monitor layout shifts
   */
  monitorLayoutShifts(callback?: (entries: PerformanceEntry[]) => void): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if ((entry as any).value > 0.1) { // Significant layout shift
            console.warn(`Layout shift detected: ${(entry as any).value}`, entry);
          }
        });
        callback?.(entries);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (error) {
      console.warn('Layout shift monitoring not supported:', error);
    }
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Get all performance data
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.measurements.forEach((_, name) => {
      stats[name] = this.getStats(name);
    });
    return stats;
  }
}

/**
 * React hook for measuring component render performance
 */
export function usePerformanceMeasurement(componentName: string, enabled: boolean = true) {
  const monitor = PerformanceMonitor.getInstance();
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    // Record mount time
    if (!mountTimeRef.current) {
      mountTimeRef.current = performance.now();
    }

    // Measure render time
    renderCountRef.current++;
    const renderName = `${componentName}-render-${renderCountRef.current}`;
    
    // This runs after render
    const endTime = performance.now();
    const startTime = mountTimeRef.current;
    const renderDuration = endTime - startTime;

    if (renderDuration > 16) { // Longer than one frame (60fps)
      console.warn(`Slow render detected in ${componentName}: ${renderDuration.toFixed(2)}ms`);
    }

    return () => {
      // Cleanup on unmount
      if (renderCountRef.current === 1) {
        const unmountTime = performance.now();
        const totalLifetime = unmountTime - (mountTimeRef.current || 0);
        console.debug(`${componentName} lifetime: ${totalLifetime.toFixed(2)}ms, renders: ${renderCountRef.current}`);
      }
    };
  });

  const measureOperation = useCallback((operationName: string, operation: () => void | Promise<void>) => {
    if (!enabled) {
      if (typeof operation === 'function') {
        const result = operation();
        return Promise.resolve(result);
      }
      return Promise.resolve();
    }

    const fullName = `${componentName}-${operationName}`;
    monitor.startMeasurement(fullName);

    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          monitor.endMeasurement(fullName);
        });
      } else {
        monitor.endMeasurement(fullName);
        return Promise.resolve(result);
      }
    } catch (error) {
      monitor.endMeasurement(fullName);
      throw error;
    }
  }, [componentName, enabled, monitor]);

  return {
    measureOperation,
    renderCount: renderCountRef.current,
    getStats: () => monitor.getAllStats()
  };
}

/**
 * Hook for monitoring component re-renders
 */
export function useRenderTracker(componentName: string, props?: Record<string, any>) {
  const renderCount = useRef(0);
  const prevProps = useRef<Record<string, any>>();

  useEffect(() => {
    renderCount.current++;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`${componentName} rendered ${renderCount.current} times`);
      
      if (props && prevProps.current) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== prevProps.current![key]
        );
        
        if (changedProps.length > 0) {
          console.debug(`${componentName} re-rendered due to props:`, changedProps);
        }
      }
      
      prevProps.current = props;
    }
  });

  return renderCount.current;
}

/**
 * Debounced performance measurement
 */
export function useDebouncedPerformanceMeasurement(
  componentName: string,
  delay: number = 100,
  enabled: boolean = true
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const monitor = PerformanceMonitor.getInstance();

  const measureWithDelay = useCallback((operationName: string, operation: () => void) => {
    if (!enabled) {
      operation();
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const fullName = `${componentName}-${operationName}`;
      monitor.startMeasurement(fullName);
      
      try {
        operation();
      } finally {
        monitor.endMeasurement(fullName);
      }
    }, delay);
  }, [componentName, delay, enabled, monitor]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return measureWithDelay;
}

/**
 * Memory usage monitoring
 */
export function useMemoryMonitoring(componentName: string, interval: number = 5000) {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (typeof (performance as any).memory === 'undefined') {
      console.warn('Memory monitoring not supported in this browser');
      return;
    }

    intervalRef.current = setInterval(() => {
      const memory = (performance as any).memory;
      const used = Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100;
      const total = Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100;
      const limit = Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100;

      if (used / limit > 0.8) {
        console.warn(`High memory usage in ${componentName}: ${used}MB / ${limit}MB`);
      }

      console.debug(`${componentName} memory: ${used}MB used, ${total}MB total, ${limit}MB limit`);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [componentName, interval]);
}

// Initialize global performance monitoring
if (typeof window !== 'undefined') {
  const monitor = PerformanceMonitor.getInstance();
  
  // Monitor long tasks
  monitor.monitorLongTasks((entries) => {
    entries.forEach(entry => {
      console.warn(`Long task: ${entry.duration}ms - Consider code splitting or optimization`);
    });
  });

  // Monitor layout shifts
  monitor.monitorLayoutShifts((entries) => {
    entries.forEach(entry => {
      const value = (entry as any).value;
      if (value > 0.1) {
        console.warn(`Significant layout shift: ${value} - Check for dynamic content loading`);
      }
    });
  });
}