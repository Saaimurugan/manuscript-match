/**
 * Test suite for useErrorMonitoring hook
 * Tests React integration and component-level error monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorMonitoring, usePerformanceMonitoring, useErrorBoundaryMonitoring } from '../useErrorMonitoring';
import { errorMonitoring } from '../../services/errorMonitoring';

// Mock the error monitoring service
vi.mock('../../services/errorMonitoring', () => ({
  errorMonitoring: {
    trackError: vi.fn(),
    getErrorRateMetrics: vi.fn(),
    getErrorAnalysis: vi.fn(),
    markErrorResolved: vi.fn(),
    getMonitoringStatus: vi.fn()
  }
}));

describe('useErrorMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (errorMonitoring.getMonitoringStatus as any).mockReturnValue({
      isActive: true,
      totalErrors: 5,
      recentErrorRate: 2.5,
      alertsTriggered: 0,
      performanceMonitoring: true
    });

    (errorMonitoring.getErrorRateMetrics as any).mockReturnValue({
      timeWindow: '60 minutes',
      totalErrors: 3,
      errorRate: 3,
      criticalErrors: 1,
      componentErrors: { TestComponent: 2 },
      categoryBreakdown: { runtime: 2, network: 1 },
      averageResponseTime: 150
    });

    (errorMonitoring.getErrorAnalysis as any).mockReturnValue({
      topErrors: [
        { message: 'Test error', count: 2, severity: 'high' }
      ],
      errorTrends: [
        { hour: '10:00', count: 1 },
        { hour: '11:00', count: 2 }
      ],
      componentHealth: [
        { component: 'TestComponent', errorCount: 2, healthScore: 75 }
      ],
      resolutionRate: 80
    });
  });

  describe('Basic Hook Functionality', () => {
    it('should return all expected functions and data', () => {
      const { result } = renderHook(() => useErrorMonitoring('TestComponent'));

      expect(result.current).toHaveProperty('trackError');
      expect(result.current).toHaveProperty('getErrorMetrics');
      expect(result.current).toHaveProperty('getErrorAnalysis');
      expect(result.current).toHaveProperty('markErrorResolved');
      expect(result.current).toHaveProperty('monitoringStatus');
      expect(result.current).toHaveProperty('isMonitoring');

      expect(typeof result.current.trackError).toBe('function');
      expect(typeof result.current.getErrorMetrics).toBe('function');
      expect(typeof result.current.getErrorAnalysis).toBe('function');
      expect(typeof result.current.markErrorResolved).toBe('function');
      expect(result.current.isMonitoring).toBe(true);
    });

    it('should track errors with component context', () => {
      const { result } = renderHook(() => useErrorMonitoring('TestComponent'));

      act(() => {
        result.current.trackError({
          message: 'Test error message',
          severity: 'high',
          category: 'runtime'
        });
      });

      expect(errorMonitoring.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
          severity: 'high',
          category: 'runtime',
          component: 'TestComponent',
          errorId: expect.stringContaining('TestComponent-'),
          timestamp: expect.any(Number),
          userAgent: expect.any(String),
          url: expect.any(String),
          sessionId: expect.any(String),
          resolved: false
        })
      );
    });

    it('should provide default values for partial error data', () => {
      const { result } = renderHook(() => useErrorMonitoring('TestComponent'));

      act(() => {
        result.current.trackError({
          message: 'Minimal error'
        });
      });

      expect(errorMonitoring.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Minimal error',
          severity: 'medium', // default
          category: 'runtime', // default
          component: 'TestComponent',
          resolved: false
        })
      );
    });

    it('should get error metrics with optional time window', () => {
      const { result } = renderHook(() => useErrorMonitoring());

      act(() => {
        result.current.getErrorMetrics(30);
      });

      expect(errorMonitoring.getErrorRateMetrics).toHaveBeenCalledWith(30);
    });

    it('should get error analysis', () => {
      const { result } = renderHook(() => useErrorMonitoring());

      act(() => {
        const analysis = result.current.getErrorAnalysis();
        expect(analysis).toEqual(expect.objectContaining({
          topErrors: expect.any(Array),
          errorTrends: expect.any(Array),
          componentHealth: expect.any(Array),
          resolutionRate: expect.any(Number)
        }));
      });

      expect(errorMonitoring.getErrorAnalysis).toHaveBeenCalled();
    });

    it('should mark errors as resolved', () => {
      const { result } = renderHook(() => useErrorMonitoring());

      act(() => {
        result.current.markErrorResolved('test-error-123');
      });

      expect(errorMonitoring.markErrorResolved).toHaveBeenCalledWith('test-error-123');
    });
  });

  describe('Monitoring Status Updates', () => {
    it('should update monitoring status periodically', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useErrorMonitoring());

      const initialStatus = result.current.monitoringStatus;
      expect(initialStatus.isActive).toBe(true);

      // Update mock to return different status
      (errorMonitoring.getMonitoringStatus as any).mockReturnValue({
        isActive: true,
        totalErrors: 10,
        recentErrorRate: 5.0,
        alertsTriggered: 1,
        performanceMonitoring: true
      });

      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(errorMonitoring.getMonitoringStatus).toHaveBeenCalledTimes(2); // Initial + update

      vi.useRealTimers();
    });

    it('should cleanup interval on unmount', () => {
      vi.useFakeTimers();
      
      const { unmount } = renderHook(() => useErrorMonitoring());

      unmount();

      // Verify no more calls after unmount
      const callCountBeforeUnmount = (errorMonitoring.getMonitoringStatus as any).mock.calls.length;
      
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect((errorMonitoring.getMonitoringStatus as any).mock.calls.length).toBe(callCountBeforeUnmount);

      vi.useRealTimers();
    });
  });

  describe('Component Name Handling', () => {
    it('should work without component name', () => {
      const { result } = renderHook(() => useErrorMonitoring());

      act(() => {
        result.current.trackError({
          message: 'Error without component name'
        });
      });

      expect(errorMonitoring.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorId: expect.stringContaining('component-'),
          component: undefined
        })
      );
    });

    it('should use provided component name in error ID', () => {
      const { result } = renderHook(() => useErrorMonitoring('CustomComponent'));

      act(() => {
        result.current.trackError({
          message: 'Error with custom component'
        });
      });

      expect(errorMonitoring.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorId: expect.stringContaining('CustomComponent-'),
          component: 'CustomComponent'
        })
      );
    });
  });
});

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock performance.now()
    Object.defineProperty(global, 'performance', {
      value: {
        now: vi.fn(() => 100)
      }
    });
  });

  it('should track render performance', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitoring('TestComponent'));

    expect(result.current.renderCount).toBe(1);
    expect(result.current.renderTime).toBe(0); // Initial render

    rerender();

    expect(result.current.renderCount).toBe(2);
  });

  it('should track slow renders and report as errors', () => {
    // Mock slow render (>16ms)
    let callCount = 0;
    (global.performance.now as any).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 120; // 120ms render time
    });

    renderHook(() => usePerformanceMonitoring('SlowComponent'));

    expect(errorMonitoring.trackError).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'high', // >100ms is high severity
        category: 'system',
        message: expect.stringContaining('Slow render detected in SlowComponent: 120.00ms'),
        component: 'SlowComponent',
        responseTime: 120
      })
    );
  });

  it('should calculate average render time', () => {
    let callCount = 0;
    (global.performance.now as any).mockImplementation(() => {
      callCount++;
      return callCount * 10; // 10ms, 20ms, 30ms, etc.
    });

    const { result, rerender } = renderHook(() => usePerformanceMonitoring('TestComponent'));

    rerender();
    rerender();

    expect(result.current.renderCount).toBe(3);
    expect(result.current.averageRenderTime).toBeGreaterThan(0);
  });
});

describe('useErrorBoundaryMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide trackBoundaryError function', () => {
    const { result } = renderHook(() => useErrorBoundaryMonitoring());

    expect(result.current).toHaveProperty('trackBoundaryError');
    expect(typeof result.current.trackBoundaryError).toBe('function');
  });

  it('should track boundary errors with correct metadata', () => {
    const { result } = renderHook(() => useErrorBoundaryMonitoring());

    const testError = new Error('Test boundary error');
    const errorInfo = {
      componentStack: 'in TestComponent\n  in App'
    };

    act(() => {
      result.current.trackBoundaryError(testError, errorInfo, 'component stack');
    });

    expect(errorMonitoring.trackError).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'critical',
        category: 'runtime',
        message: 'Test boundary error',
        stack: testError.stack,
        component: 'ErrorBoundary',
        responseTime: expect.any(Number)
      })
    );
  });

  it('should handle errors without stack traces', () => {
    const { result } = renderHook(() => useErrorBoundaryMonitoring());

    const testError = { message: 'Error without stack' } as Error;
    const errorInfo = {};

    act(() => {
      result.current.trackBoundaryError(testError, errorInfo);
    });

    expect(errorMonitoring.trackError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error without stack',
        stack: undefined
      })
    );
  });
});

describe('Hook Integration', () => {
  it('should work together in a component', () => {
    const TestComponent = () => {
      const { trackError, isMonitoring } = useErrorMonitoring('IntegratedComponent');
      const { renderTime } = usePerformanceMonitoring('IntegratedComponent');
      const { trackBoundaryError } = useErrorBoundaryMonitoring();

      return {
        trackError,
        isMonitoring,
        renderTime,
        trackBoundaryError
      };
    };

    const { result } = renderHook(() => TestComponent());

    expect(result.current.isMonitoring).toBe(true);
    expect(typeof result.current.trackError).toBe('function');
    expect(typeof result.current.renderTime).toBe('number');
    expect(typeof result.current.trackBoundaryError).toBe('function');
  });

  it('should handle multiple instances without conflicts', () => {
    const { result: result1 } = renderHook(() => useErrorMonitoring('Component1'));
    const { result: result2 } = renderHook(() => useErrorMonitoring('Component2'));

    act(() => {
      result1.current.trackError({ message: 'Error from component 1' });
      result2.current.trackError({ message: 'Error from component 2' });
    });

    expect(errorMonitoring.trackError).toHaveBeenCalledTimes(2);
    expect(errorMonitoring.trackError).toHaveBeenNthCalledWith(1, 
      expect.objectContaining({ component: 'Component1' })
    );
    expect(errorMonitoring.trackError).toHaveBeenNthCalledWith(2, 
      expect.objectContaining({ component: 'Component2' })
    );
  });
});