import { cacheService } from '../../services/CacheService';
import { performanceMonitoringService } from '../../services/PerformanceMonitoringService';

describe('Cache Performance Tests', () => {
  beforeAll(async () => {
    // Wait a bit for Redis connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await cacheService.disconnect();
  });

  describe('CacheService', () => {
    test('should set and get values efficiently', async () => {
      const key = 'test-performance-key';
      const value = { data: 'test-data', timestamp: Date.now() };

      const startTime = performance.now();
      await cacheService.set(key, value);
      const setTime = performance.now() - startTime;

      const getStartTime = performance.now();
      const retrieved = await cacheService.get(key);
      const getTime = performance.now() - getStartTime;

      expect(retrieved).toEqual(value);
      expect(setTime).toBeLessThan(100); // Should be under 100ms
      expect(getTime).toBeLessThan(50);  // Should be under 50ms

      // Cleanup
      await cacheService.del(key);
    });

    test('should handle multiple operations efficiently', async () => {
      const operations = 10;
      const keys = Array.from({ length: operations }, (_, i) => `bulk-test-${i}`);
      const values = keys.map(key => ({ key, data: `data-${key}` }));

      const startTime = performance.now();
      
      // Set multiple values
      await cacheService.mset(values.map(v => ({ key: v.key, value: v })));
      
      // Get multiple values
      const retrieved = await cacheService.mget(keys);
      
      const totalTime = performance.now() - startTime;

      expect(retrieved).toHaveLength(operations);
      expect(totalTime).toBeLessThan(500); // Should complete in under 500ms

      // Cleanup
      await Promise.all(keys.map(key => cacheService.del(key)));
    });

    test('should report health status', async () => {
      const isHealthy = await cacheService.health();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('PerformanceMonitoringService', () => {
    test('should record and retrieve metrics', async () => {
      performanceMonitoringService.recordMetric({
        name: 'test.cache.performance',
        value: 123.45,
        unit: 'ms',
        tags: { test: 'true' }
      });

      const stats = performanceMonitoringService.getCustomMetricsStats('test.cache.performance');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.count).toBeGreaterThan(0);
        expect(stats.average).toBeGreaterThan(0);
      }
    });

    test('should measure execution time', async () => {
      const result = await performanceMonitoringService.measureExecutionTime(
        'test.execution',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'test-result';
        }
      );

      expect(result).toBe('test-result');
      
      const stats = performanceMonitoringService.getCustomMetricsStats('execution_time.test.execution');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.average).toBeGreaterThan(90); // Should be around 100ms
      }
    });

    test('should get system metrics', async () => {
      const systemMetrics = await performanceMonitoringService.getSystemMetrics();
      
      expect(systemMetrics).toHaveProperty('cpu');
      expect(systemMetrics).toHaveProperty('memory');
      expect(systemMetrics).toHaveProperty('cache');
      expect(systemMetrics).toHaveProperty('database');
      expect(systemMetrics).toHaveProperty('timestamp');
      
      expect(systemMetrics.memory.used).toBeGreaterThan(0);
      expect(systemMetrics.memory.total).toBeGreaterThan(0);
      expect(systemMetrics.memory.percentage).toBeGreaterThan(0);
    });
  });
});