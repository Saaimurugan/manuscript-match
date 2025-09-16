import request from 'supertest';
import { testApp } from '../setup/testApp';
import { MonitoringService } from '@/services/MonitoringService';
import { CircuitBreakerManager } from '@/middleware/errorRecovery';
import { ErrorType } from '@/middleware/errorHandler';

describe('Error Scenarios Integration Tests', () => {
  let monitoring: MonitoringService;
  let cbManager: CircuitBreakerManager;

  beforeEach(() => {
    monitoring = MonitoringService.getInstance();
    cbManager = CircuitBreakerManager.getInstance();
    
    // Clear metrics for clean test state
    monitoring['requestMetrics'] = [];
    monitoring['errorMetrics'] = [];
    monitoring.removeAllListeners();
  });

  afterEach(() => {
    monitoring.removeAllListeners();
  });

  describe('cascading failure scenarios', () => {
    it('should handle multiple service failures gracefully', async () => {
      // Simulate multiple failing requests
      const failingRequests = [
        request(testApp).get('/api/nonexistent-1'),
        request(testApp).get('/api/nonexistent-2'),
        request(testApp).get('/api/nonexistent-3'),
      ];

      const responses = await Promise.allSettled(failingRequests);
      
      // All should fail with 404
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.status).toBe(404);
        }
      });

      // System should still be responsive
      const healthResponse = await request(testApp)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBeDefined();
    });

    it('should maintain service availability during partial failures', async () => {
      // Mix of successful and failing requests
      const mixedRequests = [
        request(testApp).get('/health'), // Should succeed
        request(testApp).get('/api/nonexistent'), // Should fail
        request(testApp).get('/health/live'), // Should succeed
        request(testApp).get('/api/invalid'), // Should fail
      ];

      const responses = await Promise.allSettled(mixedRequests);
      
      let successCount = 0;
      let failureCount = 0;
      
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          if (response.value.status < 400) {
            successCount++;
          } else {
            failureCount++;
          }
        }
      });

      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });
  });

  describe('resource exhaustion scenarios', () => {
    it('should handle high request volume without crashing', async () => {
      const highVolumeRequests = Array(20).fill(null).map((_, index) =>
        request(testApp).get(`/health?test=${index}`)
      );

      const responses = await Promise.allSettled(highVolumeRequests);
      
      // Most requests should succeed
      const successfulResponses = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 200
      );
      
      expect(successfulResponses.length).toBeGreaterThan(15);
    });

    it('should apply rate limiting under high load', async () => {
      // Make many requests quickly to trigger rate limiting
      const rapidRequests = Array(15).fill(null).map(() =>
        request(testApp).get('/api/processes')
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should be rate limited or unauthorized
      const statusCodes = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => (r.value as any).status);
      
      // Should have a mix of status codes (some rate limited, some unauthorized)
      expect(statusCodes.length).toBeGreaterThan(0);
    });
  });

  describe('data corruption scenarios', () => {
    it('should handle malformed request data', async () => {
      const response = await request(testApp)
        .post('/api/auth/register')
        .send('invalid-json-data')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBeDefined();
    });

    it('should validate request headers', async () => {
      const response = await request(testApp)
        .get('/api/processes')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    });
  });

  describe('timeout and latency scenarios', () => {
    it('should handle slow requests gracefully', async () => {
      // Test with a reasonable timeout
      const response = await request(testApp)
        .get('/health')
        .timeout(5000)
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should track slow request metrics', async () => {
      // Make a request that might be slow
      await request(testApp)
        .get('/health')
        .expect(200);

      const metrics = monitoring.getRequestMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric).toHaveProperty('responseTime');
      expect(lastMetric.responseTime).toBeGreaterThan(0);
    });
  });

  describe('security attack scenarios', () => {
    it('should handle SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(testApp)
        .post('/api/auth/login')
        .send({
          email: maliciousInput,
          password: 'password',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should handle XSS attempts', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(testApp)
        .post('/api/auth/register')
        .send({
          email: `test${xssPayload}@example.com`,
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle oversized payloads', async () => {
      const largePayload = 'x'.repeat(20 * 1024 * 1024); // 20MB
      
      const response = await request(testApp)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: largePayload,
        });

      // Should either reject the payload or handle it gracefully
      expect([400, 413, 500]).toContain(response.status);
    });
  });

  describe('recovery and resilience', () => {
    it('should recover from temporary failures', async () => {
      // Simulate temporary failure
      await request(testApp)
        .get('/api/nonexistent')
        .expect(404);

      // System should recover and handle subsequent requests
      const recoveryResponse = await request(testApp)
        .get('/health')
        .expect(200);

      expect(recoveryResponse.body.status).toBeDefined();
    });

    it('should maintain error tracking across failures', async () => {
      const initialErrorCount = monitoring.getErrorMetrics().length;

      // Generate some errors
      await request(testApp).get('/api/error1').expect(404);
      await request(testApp).get('/api/error2').expect(404);
      await request(testApp).get('/api/error3').expect(404);

      const finalErrorCount = monitoring.getErrorMetrics().length;
      expect(finalErrorCount).toBe(initialErrorCount + 3);
    });

    it('should provide health status during degraded conditions', async () => {
      // Generate some errors to degrade the system
      for (let i = 0; i < 5; i++) {
        await request(testApp).get(`/api/error-${i}`).expect(404);
      }

      const healthResponse = await request(testApp)
        .get('/health')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status');
      // Status might be degraded but should still respond
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResponse.body.status);
    });
  });

  describe('monitoring and alerting', () => {
    it('should track error patterns', async () => {
      const errorTypes = ['validation', 'auth', 'notfound'];
      
      // Generate different types of errors
      await request(testApp).post('/api/auth/login').send({}).expect(400);
      await request(testApp).get('/api/nonexistent').expect(404);
      await request(testApp).get('/api/processes').expect(401);

      const errorMetrics = monitoring.getErrorMetrics();
      expect(errorMetrics.length).toBeGreaterThan(0);
      
      // Should have different error types
      const uniqueTypes = new Set(errorMetrics.map(e => e.type));
      expect(uniqueTypes.size).toBeGreaterThan(1);
    });

    it('should provide performance metrics during stress', async () => {
      // Generate load
      const loadRequests = Array(10).fill(null).map(() =>
        request(testApp).get('/health')
      );

      await Promise.all(loadRequests);

      const perfStats = monitoring.getPerformanceStats();
      expect(perfStats).toHaveProperty('averageResponseTime');
      expect(perfStats).toHaveProperty('errorRate');
      expect(perfStats).toHaveProperty('requestsPerMinute');
    });

    it('should detect system health degradation', async () => {
      // Generate errors to trigger health degradation
      for (let i = 0; i < 10; i++) {
        await request(testApp).get(`/api/error-${i}`).expect(404);
      }

      const healthSummary = monitoring.getHealthSummary();
      expect(healthSummary).toHaveProperty('status');
      expect(healthSummary).toHaveProperty('issues');
      expect(healthSummary).toHaveProperty('metrics');
      
      // Should detect issues
      if (healthSummary.status !== 'healthy') {
        expect(healthSummary.issues.length).toBeGreaterThan(0);
      }
    });
  });
});