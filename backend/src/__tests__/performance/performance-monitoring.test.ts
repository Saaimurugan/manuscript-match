import { performanceMonitoringService } from '../../services/PerformanceMonitoringService';

describe('Performance Monitoring Tests', () => {
  describe('PerformanceMonitoringService', () => {
    test('should record and retrieve metrics', () => {
      performanceMonitoringService.recordMetric({
        name: 'test.performance.metric',
        value: 123.45,
        unit: 'ms',
        tags: { test: 'true' }
      });

      const stats = performanceMonitoringService.getCustomMetricsStats('test.performance.metric');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.count).toBeGreaterThan(0);
        expect(stats.average).toBeGreaterThan(0);
        expect(stats.unit).toBe('ms');
      }
    });

    test('should measure execution time', async () => {
      const result = await performanceMonitoringService.measureExecutionTime(
        'test.execution',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'test-result';
        }
      );

      expect(result).toBe('test-result');
      
      const stats = performanceMonitoringService.getCustomMetricsStats('execution_time.test.execution');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.average).toBeGreaterThan(40); // Should be around 50ms
        expect(stats.unit).toBe('ms');
      }
    });

    test('should measure memory usage', async () => {
      const result = await performanceMonitoringService.measureMemoryUsage(
        'test.memory',
        async () => {
          // Create some memory usage
          const largeArray = new Array(1000).fill('test-data');
          await new Promise(resolve => setTimeout(resolve, 10));
          return largeArray.length;
        }
      );

      expect(result).toBe(1000);
      
      const stats = performanceMonitoringService.getCustomMetricsStats('memory_usage.test.memory');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.unit).toBe('bytes');
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
      expect(systemMetrics.cpu.usage).toBeGreaterThanOrEqual(0);
    });

    test('should record endpoint metrics', () => {
      performanceMonitoringService.recordEndpointMetric({
        path: '/api/test',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
        userAgent: 'test-agent'
      });

      const stats = performanceMonitoringService.getEndpointStats('/api/test');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.totalRequests).toBeGreaterThan(0);
        expect(stats.averageResponseTime).toBeGreaterThan(0);
        expect(stats.path).toBe('/api/test');
      }
    });

    test('should generate performance alerts', () => {
      // Record some slow metrics to trigger alerts
      performanceMonitoringService.recordEndpointMetric({
        path: '/api/slow',
        method: 'GET',
        responseTime: 3000, // 3 seconds - should trigger alert
        statusCode: 200
      });

      performanceMonitoringService.recordEndpointMetric({
        path: '/api/error',
        method: 'GET',
        responseTime: 100,
        statusCode: 500 // Error status - should contribute to error rate
      });

      const alerts = performanceMonitoringService.getPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      
      // Should have alerts for high response time or error rate
      const hasPerformanceAlert = alerts.some(alert => 
        alert.metric === 'average_response_time' || alert.metric === 'error_rate'
      );
      expect(hasPerformanceAlert).toBe(true);
    });

    test('should export metrics in JSON format', async () => {
      const metrics = await performanceMonitoringService.exportMetrics('json');
      
      expect(typeof metrics).toBe('object');
      if (typeof metrics === 'object') {
        expect(metrics).toHaveProperty('system');
        expect(metrics).toHaveProperty('endpoints');
        expect(metrics).toHaveProperty('custom_metrics');
        expect(metrics).toHaveProperty('timestamp');
        
        expect(Array.isArray(metrics.custom_metrics)).toBe(true);
      }
    });

    test('should export metrics in Prometheus format', async () => {
      const metrics = await performanceMonitoringService.exportMetrics('prometheus');
      
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('system_memory_usage_bytes');
    });

    test('should calculate percentiles correctly', () => {
      // Record multiple metrics to test percentile calculation
      const values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      
      values.forEach(value => {
        performanceMonitoringService.recordMetric({
          name: 'test.percentile.metric',
          value,
          unit: 'ms'
        });
      });

      const stats = performanceMonitoringService.getCustomMetricsStats('test.percentile.metric');
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.min).toBe(100);
        expect(stats.max).toBe(1000);
        expect(stats.median).toBe(550); // Median of 1-10 * 100
        expect(stats.p95).toBeGreaterThan(stats.median);
        expect(stats.p99).toBeGreaterThan(stats.p95);
      }
    });
  });
});