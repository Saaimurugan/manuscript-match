/**
 * ErrorBoundary Performance Test Suite
 * 
 * Tests performance characteristics of error boundary including:
 * - Error handling overhead
 * - Memory usage during error cycles
 * - Performance impact on normal operations
 * - Scalability with multiple error boundaries
 * 
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Performance measurement utilities
class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      return duration;
    };
  }

  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMaxTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }

  getMinTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? Math.min(...times) : 0;
  }

  clear(): void {
    this.measurements.clear();
  }

  getAllMeasurements(): Record<string, { avg: number; max: number; min: number; count: number }> {
    const result: Record<string, { avg: number; max: number; min: number; count: number }> = {};
    
    for (const [name, times] of this.measurements.entries()) {
      result[name] = {
        avg: this.getAverageTime(name),
        max: this.getMaxTime(name),
        min: this.getMinTime(name),
        count: times.length,
      };
    }
    
    return result;
  }
}

// Memory usage tracker
class MemoryTracker {
  private initialMemory: number = 0;
  private measurements: Array<{ timestamp: number; used: number; total: number }> = [];

  start(): void {
    if (performance.memory) {
      this.initialMemory = performance.memory.usedJSHeapSize;
    }
    this.measurements = [];
  }

  measure(label?: string): void {
    if (performance.memory) {
      this.measurements.push({
        timestamp: Date.now(),
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
      });
    }
  }

  getMemoryDelta(): number {
    if (!performance.memory || this.measurements.length === 0) return 0;
    
    const latest = this.measurements[this.measurements.length - 1];
    return latest.used - this.initialMemory;
  }

  getMaxMemoryUsage(): number {
    if (this.measurements.length === 0) return 0;
    
    return Math.max(...this.measurements.map(m => m.used));
  }

  clear(): void {
    this.measurements = [];
    this.initialMemory = 0;
  }
}

// Test components for performance testing
const NormalComponent = ({ id }: { id: number }) => (
  <div data-testid={`normal-component-${id}`}>
    Normal Component {id}
  </div>
);

const ErrorComponent = ({ shouldThrow = false, id }: { shouldThrow?: boolean; id: number }) => {
  if (shouldThrow) {
    throw new Error(`Performance test error ${id}`);
  }
  return (
    <div data-testid={`error-component-${id}`}>
      Error Component {id}
    </div>
  );
};

const HeavyComponent = ({ iterations = 1000, shouldThrow = false }: { iterations?: number; shouldThrow?: boolean }) => {
  // Simulate heavy computation
  const data = React.useMemo(() => {
    const result = [];
    for (let i = 0; i < iterations; i++) {
      result.push({ id: i, value: Math.random() * 1000 });
    }
    return result;
  }, [iterations]);

  if (shouldThrow) {
    throw new Error('Heavy component error');
  }

  return (
    <div data-testid="heavy-component">
      <h3>Heavy Component</h3>
      <div>Processed {data.length} items</div>
    </div>
  );
};

describe('ErrorBoundary Performance Tests', () => {
  let profiler: PerformanceProfiler;
  let memoryTracker: MemoryTracker;
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    memoryTracker = new MemoryTracker();
    
    // Mock console.error to reduce noise
    mockConsoleError = vi.fn();
    vi.stubGlobal('console', { ...console, error: mockConsoleError });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    memoryTracker.start();
  });

  afterEach(() => {
    cleanup();
    profiler.clear();
    memoryTracker.clear();
    vi.restoreAllMocks();
  });

  describe('Error Handling Performance', () => {
    it('should handle single error with minimal overhead', async () => {
      const endMeasurement = profiler.startMeasurement('single-error-handling');
      
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} id={1} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const duration = endMeasurement();
      memoryTracker.measure('after-single-error');

      // Error handling should be fast (< 50ms)
      expect(duration).toBeLessThan(50);
      
      // Memory usage should be reasonable (< 1MB increase)
      const memoryDelta = memoryTracker.getMemoryDelta();
      expect(memoryDelta).toBeLessThan(1024 * 1024); // 1MB
    });

    it('should handle multiple errors efficiently', async () => {
      const errorCount = 10;
      const endMeasurement = profiler.startMeasurement('multiple-errors-handling');
      
      // Render multiple error boundaries with errors
      for (let i = 0; i < errorCount; i++) {
        render(
          <ErrorBoundary key={i}>
            <ErrorComponent shouldThrow={true} id={i} />
          </ErrorBoundary>
        );
      }

      await waitFor(() => {
        const errorBoundaries = screen.getAllByTestId('error-boundary');
        expect(errorBoundaries).toHaveLength(errorCount);
      });

      const duration = endMeasurement();
      memoryTracker.measure('after-multiple-errors');

      // Multiple errors should still be handled efficiently (< 200ms for 10 errors)
      expect(duration).toBeLessThan(200);
      
      // Average time per error should be reasonable
      const avgTimePerError = duration / errorCount;
      expect(avgTimePerError).toBeLessThan(20);
    });

    it('should handle rapid error succession without performance degradation', async () => {
      const iterations = 5;
      let shouldThrow = true;
      
      const TestComponent = () => (
        <ErrorComponent shouldThrow={shouldThrow} id={1} />
      );

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      for (let i = 0; i < iterations; i++) {
        const endMeasurement = profiler.startMeasurement(`rapid-error-${i}`);
        
        // Trigger error
        shouldThrow = true;
        rerender(
          <ErrorBoundary>
            <TestComponent />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        // Recover
        shouldThrow = false;
        const retryButton = screen.getByTestId('retry-button');
        fireEvent.click(retryButton);

        rerender(
          <ErrorBoundary>
            <TestComponent />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-component-1')).toBeInTheDocument();
        });

        endMeasurement();
        memoryTracker.measure(`after-cycle-${i}`);
      }

      const measurements = profiler.getAllMeasurements();
      
      // Each cycle should maintain consistent performance
      for (let i = 0; i < iterations; i++) {
        const measurement = measurements[`rapid-error-${i}`];
        expect(measurement.avg).toBeLessThan(100); // Each cycle < 100ms
      }

      // Memory should not continuously grow
      const finalMemoryDelta = memoryTracker.getMemoryDelta();
      expect(finalMemoryDelta).toBeLessThan(5 * 1024 * 1024); // < 5MB total growth
    });
  });

  describe('Normal Operation Performance Impact', () => {
    it('should have minimal impact on normal component rendering', async () => {
      const componentCount = 50;
      
      // Measure rendering without error boundary
      const endMeasurementWithout = profiler.startMeasurement('without-error-boundary');
      
      for (let i = 0; i < componentCount; i++) {
        render(<NormalComponent id={i} />);
      }
      
      endMeasurementWithout();
      cleanup();

      // Measure rendering with error boundary
      const endMeasurementWith = profiler.startMeasurement('with-error-boundary');
      
      for (let i = 0; i < componentCount; i++) {
        render(
          <ErrorBoundary>
            <NormalComponent id={i} />
          </ErrorBoundary>
        );
      }
      
      endMeasurementWith();

      const measurements = profiler.getAllMeasurements();
      const withoutBoundary = measurements['without-error-boundary'].avg;
      const withBoundary = measurements['with-error-boundary'].avg;
      
      // Error boundary should add minimal overhead (< 20% increase)
      const overhead = ((withBoundary - withoutBoundary) / withoutBoundary) * 100;
      expect(overhead).toBeLessThan(20);
    });

    it('should not affect heavy component performance significantly', async () => {
      const iterations = 2000;
      
      // Measure heavy component without error boundary
      const endMeasurementWithout = profiler.startMeasurement('heavy-without-boundary');
      render(<HeavyComponent iterations={iterations} />);
      await waitFor(() => {
        expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
      });
      endMeasurementWithout();
      cleanup();

      // Measure heavy component with error boundary
      const endMeasurementWith = profiler.startMeasurement('heavy-with-boundary');
      render(
        <ErrorBoundary>
          <HeavyComponent iterations={iterations} />
        </ErrorBoundary>
      );
      await waitFor(() => {
        expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
      });
      endMeasurementWith();

      const measurements = profiler.getAllMeasurements();
      const withoutBoundary = measurements['heavy-without-boundary'].avg;
      const withBoundary = measurements['heavy-with-boundary'].avg;
      
      // Error boundary should add minimal overhead even for heavy components (< 10% increase)
      const overhead = ((withBoundary - withoutBoundary) / withoutBoundary) * 100;
      expect(overhead).toBeLessThan(10);
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should properly clean up memory after error recovery', async () => {
      const cycles = 10;
      let shouldThrow = true;
      
      const TestComponent = () => (
        <ErrorComponent shouldThrow={shouldThrow} id={1} />
      );

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      memoryTracker.measure('initial');

      for (let i = 0; i < cycles; i++) {
        // Trigger error
        shouldThrow = true;
        rerender(
          <ErrorBoundary>
            <TestComponent />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        // Recover
        shouldThrow = false;
        const retryButton = screen.getByTestId('retry-button');
        fireEvent.click(retryButton);

        rerender(
          <ErrorBoundary>
            <TestComponent />
          </ErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-component-1')).toBeInTheDocument();
        });

        memoryTracker.measure(`cycle-${i}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      memoryTracker.measure('final');

      // Memory growth should be minimal after cleanup
      const finalMemoryDelta = memoryTracker.getMemoryDelta();
      expect(finalMemoryDelta).toBeLessThan(2 * 1024 * 1024); // < 2MB growth
    });

    it('should handle memory pressure gracefully', async () => {
      const largeDataSize = 1000;
      
      // Create components with large data
      const LargeDataComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
        const largeData = React.useMemo(() => {
          return Array.from({ length: largeDataSize }, (_, i) => ({
            id: i,
            data: new Array(1000).fill(`data-${i}`).join(''),
          }));
        }, []);

        if (shouldThrow) {
          throw new Error('Large data component error');
        }

        return (
          <div data-testid="large-data-component">
            Large Data Component ({largeData.length} items)
          </div>
        );
      };

      memoryTracker.measure('before-large-data');

      render(
        <ErrorBoundary>
          <LargeDataComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      memoryTracker.measure('after-error-with-large-data');

      // Memory usage should be reasonable even with large data
      const memoryDelta = memoryTracker.getMemoryDelta();
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024); // < 50MB
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with number of error boundaries', async () => {
      const scales = [10, 50, 100];
      const results: Array<{ scale: number; time: number; memoryDelta: number }> = [];

      for (const scale of scales) {
        memoryTracker.start();
        const endMeasurement = profiler.startMeasurement(`scale-${scale}`);

        // Render multiple error boundaries
        for (let i = 0; i < scale; i++) {
          render(
            <ErrorBoundary key={i}>
              <NormalComponent id={i} />
            </ErrorBoundary>
          );
        }

        const duration = endMeasurement();
        memoryTracker.measure(`scale-${scale}-end`);
        const memoryDelta = memoryTracker.getMemoryDelta();

        results.push({ scale, time: duration, memoryDelta });
        
        cleanup();
      }

      // Performance should scale roughly linearly
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        
        const timeRatio = curr.time / prev.time;
        const scaleRatio = curr.scale / prev.scale;
        
        // Time ratio should not be significantly worse than scale ratio
        expect(timeRatio).toBeLessThan(scaleRatio * 1.5);
      }
    });

    it('should handle nested error boundaries efficiently', async () => {
      const depth = 10;
      
      const endMeasurement = profiler.startMeasurement('nested-boundaries');
      
      // Create deeply nested error boundaries
      let component = <ErrorComponent shouldThrow={true} id={depth} />;
      
      for (let i = depth - 1; i >= 0; i--) {
        component = (
          <ErrorBoundary key={i}>
            {component}
          </ErrorBoundary>
        );
      }

      render(component);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const duration = endMeasurement();
      memoryTracker.measure('nested-boundaries-end');

      // Nested boundaries should not cause exponential performance degradation
      expect(duration).toBeLessThan(100); // < 100ms for 10 levels
      
      const memoryDelta = memoryTracker.getMemoryDelta();
      expect(memoryDelta).toBeLessThan(5 * 1024 * 1024); // < 5MB
    });
  });

  describe('Error Reporting Performance', () => {
    it('should handle error reporting without blocking UI', async () => {
      // Mock slow error reporting
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true }),
          }), 1000) // 1 second delay
        )
      );
      vi.stubGlobal('fetch', mockFetch);

      const endMeasurement = profiler.startMeasurement('error-reporting-ui-responsiveness');

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorComponent shouldThrow={true} id={1} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Start error reporting
      const reportButton = screen.getByTestId('report-button');
      fireEvent.click(reportButton);

      // UI should remain responsive immediately
      const uiResponseTime = endMeasurement();
      expect(uiResponseTime).toBeLessThan(50); // UI should respond within 50ms

      // Verify UI is still interactive
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeEnabled();
      
      const homeButton = screen.getByTestId('home-button');
      expect(homeButton).toBeEnabled();
    });

    it('should batch multiple error reports efficiently', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const errorCount = 5;
      const endMeasurement = profiler.startMeasurement('batch-error-reporting');

      // Create multiple error boundaries and report all errors
      for (let i = 0; i < errorCount; i++) {
        render(
          <ErrorBoundary enableReporting={true} key={i}>
            <ErrorComponent shouldThrow={true} id={i} />
          </ErrorBoundary>
        );
      }

      await waitFor(() => {
        const errorBoundaries = screen.getAllByTestId('error-boundary');
        expect(errorBoundaries).toHaveLength(errorCount);
      });

      // Report all errors
      const reportButtons = screen.getAllByTestId('report-button');
      for (const button of reportButtons) {
        fireEvent.click(button);
      }

      const duration = endMeasurement();

      // Batch reporting should be efficient
      expect(duration).toBeLessThan(100);
      
      // Should not make excessive API calls
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(errorCount);
      });
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain performance baselines', async () => {
      const baselines = {
        singleErrorHandling: 50, // ms
        normalComponentOverhead: 20, // % increase
        memoryUsagePerError: 1024 * 1024, // 1MB
        errorRecoveryTime: 100, // ms
      };

      // Test single error handling
      const singleErrorTime = profiler.startMeasurement('baseline-single-error');
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} id={1} />
        </ErrorBoundary>
      );
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
      const singleErrorDuration = singleErrorTime();
      
      expect(singleErrorDuration).toBeLessThan(baselines.singleErrorHandling);

      cleanup();

      // Test normal component overhead
      const normalTime = profiler.startMeasurement('baseline-normal');
      render(<NormalComponent id={1} />);
      normalTime();
      
      cleanup();

      const boundaryTime = profiler.startMeasurement('baseline-with-boundary');
      render(
        <ErrorBoundary>
          <NormalComponent id={1} />
        </ErrorBoundary>
      );
      boundaryTime();

      const measurements = profiler.getAllMeasurements();
      const overhead = ((measurements['baseline-with-boundary'].avg - measurements['baseline-normal'].avg) / measurements['baseline-normal'].avg) * 100;
      
      expect(overhead).toBeLessThan(baselines.normalComponentOverhead);
    });
  });
});