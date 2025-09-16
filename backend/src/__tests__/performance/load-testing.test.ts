import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, createTestContext, PerformanceTracker } from '../../test/testUtils';
import { testPerformanceThresholds } from '../../test/fixtures';

describe('Performance and Load Testing', () => {
  let testContext: TestContext;
  let performanceTracker: PerformanceTracker;

  beforeAll(async () => {
    testContext = createTestContext();
    await testContext.setup();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    performanceTracker.startTracking();
  });

  describe('API Endpoint Performance', () => {
    it('should handle authentication requests within performance thresholds', async () => {
      const { user } = await testContext.createAuthenticatedUser();
      
      const iterations = 50;
      const promises = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const promise = testContext.request
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'testpassword123'
          })
          .then(response => {
            const responseTime = Date.now() - startTime;
            performanceTracker.recordMetric(responseTime);
            return response;
          });
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance assertions
      const avgResponseTime = performanceTracker.getAverageResponseTime();
      const maxResponseTime = performanceTracker.getMaxResponseTime();

      expect(avgResponseTime).toBeLessThan(testPerformanceThresholds.responseTime.acceptable);
      expect(maxResponseTime).toBeLessThan(testPerformanceThresholds.responseTime.slow);

      console.log(`Authentication performance - Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
    });

    it('should handle concurrent process creation', async () => {
      const concurrentUsers = 10;
      const users = await Promise.all(
        Array(concurrentUsers).fill(null).map((_, index) =>
          testContext.createAuthenticatedUser(`user${index}@test.com`)
        )
      );

      performanceTracker.startTracking();

      const startTime = Date.now();
      const processPromises = users.map(({ token }) =>
        testContext.request
          .post('/api/processes')
          .set(testContext.getAuthHeaders(token))
          .send({
            title: `Concurrent Process ${Math.random()}`
          })
      );

      const responses = await Promise.all(processPromises);
      const endTime = Date.now();

      performanceTracker.recordMetric(endTime - startTime);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Performance should be within acceptable limits
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(testPerformanceThresholds.responseTime.slow * concurrentUsers);

      console.log(`Concurrent process creation: ${totalTime}ms for ${concurrentUsers} users`);
    });

    it('should maintain performance under sustained load', async () => {
      const user = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders();

      performanceTracker.startTracking();

      // Make 50 sequential requests to test sustained load
      const requestCount = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        
        const response = await testContext.request
          .get('/api/processes')
          .set(authHeaders);

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        performanceTracker.recordMetric(responseTime);

        expect(response.status).toBe(200);
      }

      // Calculate performance metrics
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(averageResponseTime).toBeLessThan(testPerformanceThresholds.responseTime.acceptable);
      expect(maxResponseTime).toBeLessThan(testPerformanceThresholds.responseTime.slow);

      console.log(`Sustained load test - Avg: ${averageResponseTime}ms, Max: ${maxResponseTime}ms, Min: ${minResponseTime}ms`);
    });
  });

  describe('Memory Usage Testing', () => {
    it('should not have memory leaks during operations', async () => {
      const user = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders();

      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      // Perform multiple operations
      const operationCount = 20;
      for (let i = 0; i < operationCount; i++) {
        await testContext.request
          .get('/api/processes')
          .set(authHeaders);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage();

      // Memory increase should be reasonable
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(memoryIncreaseMB).toBeLessThan(testPerformanceThresholds.memory.warning);

      console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)}MB after ${operationCount} operations`);
    });
  });

  describe('Database Performance Testing', () => {
    it('should handle database queries efficiently', async () => {
      // Test query performance
      const startTime = Date.now();
      const results = await testContext.prisma.user.findMany({
        take: 100
      });
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toBeInstanceOf(Array);

      console.log(`Database query performance: ${queryTime}ms`);
    });
  });
});