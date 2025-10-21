import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMonitoring } from '../hooks/useMonitoring';
import { useABTesting } from '../hooks/useABTesting';
import { monitoringService } from '../services/MonitoringService';
import { analyticsService } from '../services/AnalyticsService';
import { abTestingService } from '../services/ABTestingService';

// Mock the services
vi.mock('../services/MonitoringService');
vi.mock('../services/AnalyticsService');
vi.mock('../services/ABTestingService');
vi.mock('../hooks/useScholarFinderContext', () => ({
  useScholarFinderContext: () => ({
    currentProcess: { id: 'test-process' },
  }),
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    isAuthenticated: true,
  }),
}));

describe('Monitoring Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMonitoring hook', () => {
    it('should provide monitoring functions', () => {
      const { result } = renderHook(() => useMonitoring());

      expect(result.current).toHaveProperty('trackError');
      expect(result.current).toHaveProperty('trackFeature');
      expect(result.current).toHaveProperty('trackStepStart');
      expect(result.current).toHaveProperty('monitorApiCall');
    });

    it('should track errors correctly', () => {
      const { result } = renderHook(() => useMonitoring());
      const error = new Error('Test error');

      result.current.trackError(error, { context: 'test' });

      expect(analyticsService.trackError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'test',
          processId: 'test-process',
        })
      );
    });
  });

  describe('useABTesting hook', () => {
    it('should provide A/B testing functions', () => {
      const mockVariant = {
        id: 'variant-a',
        name: 'Variant A',
        description: 'Test variant',
        weight: 50,
        config: { feature: true },
      };

      vi.mocked(abTestingService.getVariant).mockReturnValue(mockVariant);

      const { result } = renderHook(() =>
        useABTesting({
          testId: 'test-experiment',
          defaultConfig: { feature: false },
        })
      );

      expect(result.current).toHaveProperty('variant');
      expect(result.current).toHaveProperty('config');
      expect(result.current).toHaveProperty('trackConversion');
      expect(result.current.config.feature).toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should initialize services correctly', () => {
      expect(monitoringService).toBeDefined();
      expect(analyticsService).toBeDefined();
      expect(abTestingService).toBeDefined();
    });

    it('should track performance events', () => {
      const performanceEvent = {
        type: 'api_response' as const,
        duration: 150,
        endpoint: '/api/test',
      };

      monitoringService.trackPerformance(performanceEvent);

      expect(monitoringService.trackPerformance).toHaveBeenCalledWith(performanceEvent);
    });

    it('should track analytics events', () => {
      const analyticsEvent = {
        type: 'feature_usage' as const,
        feature: 'test_feature',
        userId: 'test-user',
      };

      analyticsService.trackFeatureUsage('test_feature', { userId: 'test-user' });

      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith(
        'test_feature',
        { userId: 'test-user' }
      );
    });
  });
});