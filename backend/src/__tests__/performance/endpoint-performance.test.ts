import request from 'supertest';
import { performance } from 'perf_hooks';
import app from '../../app';
import { prisma } from '../../config/database';
import { cacheService } from '../../services/CacheService';
import { performanceMonitoringService } from '../../services/PerformanceMonitoringService';

describe('Endpoint Performance Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testProcessId: string;

  beforeAll(async () => {
    // Setup test user and authentication
    const testUser = await prisma.user.create({
      data: {
        email: 'performance-test@example.com',
        passwordHash: 'hashed-password'
      }
    });
    testUserId = testUser.id;

    // Get auth token (mock implementation)
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'performance-test@example.com',
        password: 'password'
      });
    
    authToken = authResponse.body.token;

    // Create test process
    const testProcess = await prisma.process.create({
      data: {
        userId: testUserId,
        title: 'Performance Test Process',
        status: 'ACTIVE',
        currentStep: 'UPLOAD',
        metadata: '{}'
      }
    });
    testProcessId = testProcess.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.process.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await cacheService.disconnect();
  });

  describe('Process Management Endpoints', () => {
    test('GET /api/processes should respond within 500ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(500);
      expect(response.body).toHaveProperty('data');
      
      // Record performance metric
      performanceMonitoringService.recordMetric({
        name: 'test.endpoint.processes.list',
        value: responseTime,
        unit: 'ms',
        tags: { test: 'performance' }
      });
    });

    test('GET /api/processes/:id should respond within 200ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/processes/${testProcessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(200);
      expect(response.body).toHaveProperty('data');
      
      performanceMonitoringService.recordMetric({
        name: 'test.endpoint.processes.get',
        value: responseTime,
        unit: 'ms',
        tags: { test: 'performance' }
      });
    });

    test('POST /api/processes should respond within 300ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Performance Test Process 2'
        })
        .expect(201);

      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(300);
      expect(response.body).toHaveProperty('data');
      
      // Cleanup created process
      await prisma.process.delete({ where: { id: response.body.data.id } });
      
      performanceMonitoringService.recordMetric({
        name: 'test.endpoint.processes.create',
        value: responseTime,
        unit: 'ms',
        tags: { test: 'performance' }
      });
    });
  });

  describe('Author Search Endpoints', () => {
    beforeAll(async () => {
      // Create test authors for search performance
      const testAuthors = Array.from({ length: 100 }, (_, i) => ({
        name: `Test Author ${i}`,
        email: `author${i}@example.com`,
        publicationCount: Math.floor(Math.random() * 100),
        clinicalTrials: Math.floor(Math.random() * 10),
        retractions: 0,
        researchAreas: JSON.stringify(['Computer Science', 'Machine Learning']),
        meshTerms: JSON.stringify(['Algorithms', 'Data Mining'])
      }));

      await prisma.author.createMany({ data: testAuthors });
    });

    afterAll(async () => {
      // Cleanup test authors
      await prisma.author.deleteMany({
        where: {
          email: {
            contains: '@example.com'
          }
        }
      });
    });

    test('GET /api/processes/:id/candidates should respond within 1000ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/processes/${testProcessId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000);
      expect(response.body).toHaveProperty('data');
      
      performanceMonitoringService.recordMetric({
        name: 'test.endpoint.candidates.list',
        value: responseTime,
        unit: 'ms',
        tags: { test: 'performance' }
      });
    });

    test('GET /api/processes/:id/recommendations with filters should respond within 800ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/processes/${testProcessId}/recommendations`)
        .query({
          minPublications: 5,
          maxRetractions: 0,
          country: 'US'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(800);
      expect(response.body).toHaveProperty('data');
      
      performanceMonitoringService.recordMetric({
        name: 'test.endpoint.recommendations.filtered',
        value: responseTime,
        unit: 'ms',
        tags: { test: 'performance' }
      });
    });
  });

  describe('File Processing Performance', () => {
    test('POST /api/processes/:id/upload should handle small files within 2000ms', async () => {
      // Create a small test file buffer
      const testFileContent = Buffer.from('Test PDF content for performance testing');
      
      const startTime = performance.now();
      
      const response = await request(app)
        .post(`/api/processes/${testProcessId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFileContent, 'test.pdf')
        .expect(200);

      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(2000);
      expect(response.body).toHaveProperty('data');
      
      performanceMonitoringService.recordMetric({
        name: 'test.endpoint.upload.small_file',
        value: responseTime,
        unit: 'ms',
        tags: { test: 'performance', file_size: 'small' }
      });
    });
  });

  describe('Cache Performance', () => {
    test('Cached requests should be significantly faster', async () => {
      // First request (cache miss)
      const startTime1 = performance.now();
      await request(app)
        .get(`/api/processes/${testProcessId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const firstRequestTime = performance.now() - startTime1;

      // Second request (cache hit)
      const startTime2 = performance.now();
      await request(app)
        .get(`/api/processes/${testProcessId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const secondRequestTime = performance.now() - startTime2;

      // Cache hit should be at least 50% faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
      
      performanceMonitoringService.recordMetric({
        name: 'test.cache.performance_improvement',
        value: ((firstRequestTime - secondRequestTime) / firstRequestTime) * 100,
        unit: 'percentage',
        tags: { test: 'performance' }
      });
    });
  });

  describe('Concurrent Request Performance', () => {
    test('Should handle 10 concurrent requests within acceptable time', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/processes')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
      );

      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      expect(responses).toHaveLength(concurrentRequests);
      expect(averageTime).toBeLessThan(1000); // Average should be under 1 second
      
      performanceMonitoringService.recordMetric({
        name: 'test.concurrent.requests',
        value: averageTime,
        unit: 'ms',
        tags: { 
          test: 'performance', 
          concurrent_count: concurrentRequests.toString() 
        }
      });
    });
  });

  describe('Memory Usage Performance', () => {
    test('Memory usage should not increase significantly during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/processes')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be less than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      performanceMonitoringService.recordMetric({
        name: 'test.memory.usage_increase',
        value: memoryIncrease,
        unit: 'bytes',
        tags: { test: 'performance' }
      });
    });
  });

  describe('Database Query Performance', () => {
    test('Complex author relationship queries should complete within 1500ms', async () => {
      const startTime = performance.now();
      
      // Simulate complex query through API
      const response = await request(app)
        .get(`/api/processes/${testProcessId}/candidates`)
        .query({
          includeRelationships: true,
          minPublications: 10,
          researchAreas: 'Computer Science,Machine Learning'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const queryTime = performance.now() - startTime;
      
      expect(queryTime).toBeLessThan(1500);
      expect(response.body).toHaveProperty('data');
      
      performanceMonitoringService.recordMetric({
        name: 'test.database.complex_query',
        value: queryTime,
        unit: 'ms',
        tags: { test: 'performance', query_type: 'complex' }
      });
    });
  });

  describe('Performance Monitoring Service', () => {
    test('Should collect and report performance metrics', async () => {
      const metrics = performanceMonitoringService.getCustomMetricsStats('test.endpoint.processes.list');
      
      expect(metrics).toBeTruthy();
      if (metrics) {
        expect(metrics.count).toBeGreaterThan(0);
        expect(metrics.average).toBeGreaterThan(0);
        expect(metrics.unit).toBe('ms');
      }
    });

    test('Should generate performance alerts for slow requests', async () => {
      // Simulate a slow request by recording a high response time
      performanceMonitoringService.recordMetric({
        name: 'test.slow.request',
        value: 3000, // 3 seconds
        unit: 'ms',
        tags: { test: 'performance' }
      });

      const alerts = performanceMonitoringService.getPerformanceAlerts();
      
      // Should have alerts for high response times
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'critical')).toBeTruthy();
    });
  });
});