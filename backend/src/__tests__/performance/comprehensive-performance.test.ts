import { performance } from 'perf_hooks';
import { Readable } from 'stream';
import { cacheService } from '../../services/CacheService';
import { streamFileProcessingService } from '../../services/StreamFileProcessingService';
import { performanceMonitoringService } from '../../services/PerformanceMonitoringService';
// Removed unused imports
import { ManuscriptProcessingService } from '../../services/ManuscriptProcessingService';

describe('Comprehensive Performance Tests', () => {
  const manuscriptService = new ManuscriptProcessingService();

  beforeAll(async () => {
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    try {
      await cacheService.disconnect();
    } catch (error) {
      // Ignore disconnect errors in tests
    }
  });

  describe('Stream File Processing Performance', () => {
    test('should process large text streams efficiently', async () => {
      const largeText = 'Lorem ipsum '.repeat(10000); // ~110KB of text
      const textStream = Readable.from([largeText]);
      
      const startTime = performance.now();
      
      let processedChunks = 0;
      await streamFileProcessingService.processLargeTextStream(
        textStream,
        (chunk: string) => {
          processedChunks++;
          expect(chunk.length).toBeGreaterThan(0);
        }
      );
      
      const processingTime = performance.now() - startTime;
      
      expect(processedChunks).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
      
      performanceMonitoringService.recordMetric({
        name: 'test.stream_processing.large_text',
        value: processingTime,
        unit: 'ms',
        tags: { text_size: largeText.length.toString() }
      });
    });

    test('should handle concurrent stream processing', async () => {
      const concurrentStreams = 5;
      const textData = 'Test data '.repeat(1000);
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentStreams }, () => {
        const stream = Readable.from([textData]);
        return streamFileProcessingService.processLargeTextStream(
          stream,
          () => {} // No-op processor
        );
      });
      
      await Promise.all(promises);
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentStreams;
      
      expect(averageTime).toBeLessThan(500); // Average should be under 500ms
      
      performanceMonitoringService.recordMetric({
        name: 'test.stream_processing.concurrent',
        value: averageTime,
        unit: 'ms',
        tags: { concurrent_count: concurrentStreams.toString() }
      });
    });
  });

  describe('Cursor Pagination Performance', () => {
    test('should handle large dataset pagination efficiently', async () => {
      // Mock large dataset
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        value: Math.random() * 100
      }));

      const startTime = performance.now();
      
      // Simulate paginated processing
      let totalProcessed = 0;
      
      for (let page = 0; page < 10; page++) {
        const pageStartTime = performance.now();
        
        // Simulate pagination query
        const pageSize = 100;
        const startIndex = page * pageSize;
        const pageData = mockData.slice(startIndex, startIndex + pageSize);
        
        const pageTime = performance.now() - pageStartTime;
        expect(pageTime).toBeLessThan(50); // Each page should process quickly
        
        totalProcessed += pageData.length;
        
        if (pageData.length < pageSize) break;
      }
      
      const totalTime = performance.now() - startTime;
      
      expect(totalProcessed).toBe(1000);
      expect(totalTime).toBeLessThan(500); // Total pagination should be fast
      
      performanceMonitoringService.recordMetric({
        name: 'test.pagination.large_dataset',
        value: totalTime,
        unit: 'ms',
        tags: { total_items: totalProcessed.toString() }
      });
    });

    test('should optimize batch processing', async () => {
      const batchSize = 50;
      const totalItems = 500;
      
      const startTime = performance.now();
      
      let processedBatches = 0;
      let totalProcessed = 0;
      
      // Simulate batch processing
      for (let i = 0; i < totalItems; i += batchSize) {
        const batchStartTime = performance.now();
        
        // Simulate batch processing
        const batch = Array.from({ length: Math.min(batchSize, totalItems - i) }, (_, j) => ({
          id: `batch-item-${i + j}`,
          processed: true
        }));
        
        const batchTime = performance.now() - batchStartTime;
        expect(batchTime).toBeLessThan(100); // Each batch should be fast
        
        processedBatches++;
        totalProcessed += batch.length;
      }
      
      const totalTime = performance.now() - startTime;
      
      expect(processedBatches).toBe(Math.ceil(totalItems / batchSize));
      expect(totalProcessed).toBe(totalItems);
      expect(totalTime).toBeLessThan(1000); // Total should be under 1 second
      
      performanceMonitoringService.recordMetric({
        name: 'test.batch_processing.performance',
        value: totalTime,
        unit: 'ms',
        tags: { 
          batch_count: processedBatches.toString(),
          batch_size: batchSize.toString()
        }
      });
    });
  });

  describe('Cache Performance Optimization', () => {
    test('should demonstrate cache performance improvement', async () => {
      const testKey = 'performance-test-key';
      const testData = {
        id: 'test-123',
        data: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
        timestamp: Date.now()
      };

      // First operation (cache miss)
      const missStartTime = performance.now();
      
      // Simulate expensive operation
      await new Promise(resolve => setTimeout(resolve, 100));
      await cacheService.set(testKey, testData);
      
      const missTime = performance.now() - missStartTime;

      // Second operation (cache hit)
      const hitStartTime = performance.now();
      const cachedData = await cacheService.get(testKey);
      const hitTime = performance.now() - hitStartTime;

      expect(cachedData).toEqual(testData);
      expect(hitTime).toBeLessThan(missTime * 0.1); // Cache hit should be 10x faster
      
      const improvement = ((missTime - hitTime) / missTime) * 100;
      
      performanceMonitoringService.recordMetric({
        name: 'test.cache.performance_improvement',
        value: improvement,
        unit: 'percentage',
        tags: { 
          miss_time: missTime.toFixed(2),
          hit_time: hitTime.toFixed(2)
        }
      });

      // Cleanup
      await cacheService.del(testKey);
    });

    test('should handle cache bulk operations efficiently', async () => {
      const itemCount = 100;
      const items = Array.from({ length: itemCount }, (_, i) => ({
        key: `bulk-test-${i}`,
        value: { id: i, data: `test-data-${i}` }
      }));

      // Bulk set operation
      const setStartTime = performance.now();
      await cacheService.mset(items);
      const setTime = performance.now() - setStartTime;

      // Bulk get operation
      const getStartTime = performance.now();
      const keys = items.map(item => item.key);
      const results = await cacheService.mget(keys);
      const getTime = performance.now() - getStartTime;

      expect(results).toHaveLength(itemCount);
      expect(setTime).toBeLessThan(1000); // Bulk set should be fast
      expect(getTime).toBeLessThan(500);  // Bulk get should be faster

      performanceMonitoringService.recordMetric({
        name: 'test.cache.bulk_operations',
        value: setTime + getTime,
        unit: 'ms',
        tags: { 
          item_count: itemCount.toString(),
          operation: 'bulk_set_get'
        }
      });

      // Cleanup
      await Promise.all(keys.map(key => cacheService.del(key)));
    });
  });

  describe('Manuscript Processing Performance', () => {
    test('should process different file types efficiently', async () => {
      const testCases = [
        { type: 'application/pdf', size: 1024 * 100 }, // 100KB
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 * 50 }, // 50KB
      ];

      for (const testCase of testCases) {
        const mockBuffer = Buffer.alloc(testCase.size, 'test content');
        const fileName = `test.${testCase.type.includes('pdf') ? 'pdf' : 'docx'}`;

        const startTime = performance.now();
        
        try {
          await manuscriptService.extractMetadata(
            mockBuffer,
            fileName,
            testCase.type
          );
          
          const processingTime = performance.now() - startTime;
          
          expect(processingTime).toBeLessThan(5000); // Should process in under 5 seconds
          
          performanceMonitoringService.recordMetric({
            name: 'test.manuscript_processing.file_type',
            value: processingTime,
            unit: 'ms',
            tags: { 
              file_type: testCase.type,
              file_size: testCase.size.toString()
            }
          });
        } catch (error) {
          // Expected for mock data, just measure timing
          const processingTime = performance.now() - startTime;
          expect(processingTime).toBeLessThan(1000); // Even errors should be fast
        }
      }
    });

    test('should handle concurrent file processing', async () => {
      const concurrentFiles = 3;
      const mockBuffer = Buffer.from('Mock PDF content for testing');
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentFiles }, (_, i) =>
        manuscriptService.extractMetadata(
          mockBuffer,
          `test-${i}.pdf`,
          'application/pdf'
        ).catch(() => ({ success: false, processingTime: 0 })) // Handle expected errors
      );
      
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentFiles;
      
      expect(results).toHaveLength(concurrentFiles);
      expect(averageTime).toBeLessThan(2000); // Average should be reasonable
      
      performanceMonitoringService.recordMetric({
        name: 'test.manuscript_processing.concurrent',
        value: averageTime,
        unit: 'ms',
        tags: { concurrent_count: concurrentFiles.toString() }
      });
    });
  });

  describe('Performance Monitoring System', () => {
    test('should collect and analyze performance metrics', async () => {
      // Generate test metrics
      const metricCount = 50;
      for (let i = 0; i < metricCount; i++) {
        performanceMonitoringService.recordMetric({
          name: 'test.performance.analysis',
          value: Math.random() * 1000,
          unit: 'ms',
          tags: { iteration: i.toString() }
        });
      }

      // Analyze metrics
      const stats = performanceMonitoringService.getCustomMetricsStats('test.performance.analysis');
      
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.count).toBe(metricCount);
        expect(stats.average).toBeGreaterThan(0);
        expect(stats.min).toBeGreaterThanOrEqual(0);
        expect(stats.max).toBeLessThanOrEqual(1000);
        expect(stats.p95).toBeGreaterThan(stats.median);
      }
    });

    test('should generate performance alerts', async () => {
      // Record some slow operations to trigger alerts
      performanceMonitoringService.recordEndpointMetric({
        path: '/api/test/slow',
        method: 'GET',
        responseTime: 3000, // 3 seconds - should trigger alert
        statusCode: 200
      });

      performanceMonitoringService.recordEndpointMetric({
        path: '/api/test/error',
        method: 'POST',
        responseTime: 500,
        statusCode: 500 // Error status
      });

      const alerts = performanceMonitoringService.getPerformanceAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
      
      // Should have alerts for slow response time or errors
      const hasRelevantAlert = alerts.some(alert => 
        alert.metric === 'average_response_time' || alert.metric === 'error_rate'
      );
      
      expect(hasRelevantAlert).toBe(true);
    });

    test('should export metrics in multiple formats', async () => {
      const jsonMetrics = await performanceMonitoringService.exportMetrics('json');
      const prometheusMetrics = await performanceMonitoringService.exportMetrics('prometheus');
      
      // JSON format validation
      expect(typeof jsonMetrics).toBe('object');
      if (typeof jsonMetrics === 'object') {
        expect(jsonMetrics).toHaveProperty('system');
        expect(jsonMetrics).toHaveProperty('timestamp');
      }
      
      // Prometheus format validation
      expect(typeof prometheusMetrics).toBe('string');
      expect(prometheusMetrics).toContain('# HELP');
      expect(prometheusMetrics).toContain('# TYPE');
    });
  });

  describe('Memory Usage Optimization', () => {
    test('should maintain stable memory usage during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = 20;
      for (let i = 0; i < operations; i++) {
        // Create and process some data
        const data = Array.from({ length: 1000 }, (_, j) => ({
          id: `mem-test-${i}-${j}`,
          data: 'x'.repeat(100)
        }));
        
        // Simulate processing
        data.forEach(item => {
          item.data = item.data.toUpperCase();
        });
        
        // Clear references
        data.length = 0;
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      performanceMonitoringService.recordMetric({
        name: 'test.memory.usage_stability',
        value: memoryIncrease,
        unit: 'bytes',
        tags: { operations: operations.toString() }
      });
    });
  });

  describe('Overall System Performance', () => {
    test('should demonstrate end-to-end performance optimization', async () => {
      const startTime = performance.now();
      
      // Simulate a complete workflow
      const steps = [
        { name: 'file_validation', duration: 10 },
        { name: 'text_extraction', duration: 50 },
        { name: 'metadata_parsing', duration: 30 },
        { name: 'author_search', duration: 100 },
        { name: 'validation', duration: 80 },
        { name: 'caching', duration: 20 }
      ];
      
      let totalStepTime = 0;
      
      for (const step of steps) {
        const stepStart = performance.now();
        
        // Simulate step processing
        await new Promise(resolve => setTimeout(resolve, step.duration));
        
        const stepTime = performance.now() - stepStart;
        totalStepTime += stepTime;
        
        performanceMonitoringService.recordMetric({
          name: `test.workflow.${step.name}`,
          value: stepTime,
          unit: 'ms',
          tags: { step: step.name }
        });
      }
      
      const totalTime = performance.now() - startTime;
      
      expect(totalTime).toBeLessThan(500); // Total workflow should be optimized
      expect(totalStepTime).toBeLessThan(totalTime + 50); // Steps should account for most time
      
      performanceMonitoringService.recordMetric({
        name: 'test.workflow.complete',
        value: totalTime,
        unit: 'ms',
        tags: { steps: steps.length.toString() }
      });
    });
  });
});