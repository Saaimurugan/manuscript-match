import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { monitoringService } from '../MonitoringService';
import { ProcessStep } from '../../types/process';

// Mock fetch
global.fetch = vi.fn();

describe('MonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Error Tracking', () => {
    it('should track errors with proper structure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      monitoringService.trackError({
        type: 'api_error',
        message: 'Test error',
        context: { endpoint: '/test' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Monitoring Error:',
        expect.objectContaining({
          type: 'api_error',
          message: 'Test error',
          context: { endpoint: '/test' },
          timestamp: expect.any(Date),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should batch error events', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(new Response('OK'));

      // Track multiple errors
      for (let i = 0; i < 12; i++) {
        monitoringService.trackError({
          type: 'api_error',
          message: `Error ${i}`,
        });
      }

      // Should trigger batch flush at 10 events
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/monitoring',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('events'),
        })
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitoringService.trackPerformance({
        type: 'api_response',
        duration: 150,
        endpoint: '/api/test',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Event:',
        expect.objectContaining({
          type: 'api_response',
          duration: 150,
          endpoint: '/api/test',
          timestamp: expect.any(Date),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should measure API calls', async () => {
      const mockApiCall = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await monitoringService.measureApiCall(
        '/api/test',
        mockApiCall,
        { userId: '123' }
      );

      expect(result).toEqual({ data: 'test' });
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('should handle API call errors', async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(
        monitoringService.measureApiCall('/api/test', mockApiCall)
      ).rejects.toThrow('API Error');
    });
  });

  describe('Analytics Tracking', () => {
    it('should track analytics events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitoringService.trackAnalytics({
        type: 'step_start',
        step: ProcessStep.UPLOAD,
        userId: '123',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Analytics Event:',
        expect.objectContaining({
          type: 'step_start',
          step: ProcessStep.UPLOAD,
          userId: '123',
          timestamp: expect.any(Date),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should track workflow events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitoringService.trackStepStart(ProcessStep.METADATA, 'process-123', 'user-456');
      monitoringService.trackStepComplete(ProcessStep.METADATA, 'process-123', 'user-456', { duration: 5000 });
      monitoringService.trackStepAbandon(ProcessStep.KEYWORDS, 'process-123', 'user-456', 'timeout');
      monitoringService.trackWorkflowComplete('process-123', 'user-456', { totalTime: 30000 });

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      consoleSpy.mockRestore();
    });
  });

  describe('A/B Testing', () => {
    it('should track A/B test events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitoringService.trackABTest({
        testId: 'test-123',
        variant: 'variant-a',
        event: 'impression',
        userId: 'user-456',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'A/B Test Event:',
        expect.objectContaining({
          testId: 'test-123',
          variant: 'variant-a',
          event: 'impression',
          userId: 'user-456',
          timestamp: expect.any(Date),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Batch Processing', () => {
    it('should flush events on timer', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(new Response('OK'));

      // Track some events
      monitoringService.trackError({
        type: 'api_error',
        message: 'Test error',
      });

      // Advance timer to trigger flush
      vi.advanceTimersByTime(5000);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should handle flush errors gracefully', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Track events to trigger flush
      for (let i = 0; i < 10; i++) {
        monitoringService.trackError({
          type: 'api_error',
          message: `Error ${i}`,
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send monitoring events:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Global Error Handling', () => {
    it('should capture window errors', () => {
      const trackErrorSpy = vi.spyOn(monitoringService, 'trackError');
      
      // Simulate window error
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error'),
      });
      
      window.dispatchEvent(errorEvent);

      expect(trackErrorSpy).toHaveBeenCalledWith({
        type: 'component_error',
        message: 'Test error',
        stack: expect.any(String),
        context: {
          filename: 'test.js',
          lineno: 10,
          colno: 5,
        },
      });
    });

    it('should capture unhandled promise rejections', () => {
      const trackErrorSpy = vi.spyOn(monitoringService, 'trackError');
      
      // Simulate unhandled promise rejection
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Test rejection')),
        reason: new Error('Test rejection'),
      });
      
      window.dispatchEvent(rejectionEvent);

      expect(trackErrorSpy).toHaveBeenCalledWith({
        type: 'component_error',
        message: 'Test rejection',
        stack: expect.any(String),
        context: {
          type: 'unhandledrejection',
        },
      });
    });
  });
});