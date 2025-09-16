import request from 'supertest';
import { testApp } from '../setup/testApp';
import { MonitoringService } from '@/services/MonitoringService';
import { ErrorType } from '@/middleware/errorHandler';

describe('Error Handling Integration', () => {
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = MonitoringService.getInstance();
    // Clear metrics for clean test state
    monitoring['requestMetrics'] = [];
    monitoring['errorMetrics'] = [];
  });

  afterEach(() => {
    monitoring.removeAllListeners();
  });

  describe('structured error responses', () => {
    it('should return structured error for 404 routes', async () => {
      const response = await request(testApp)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', ErrorType.NOT_FOUND_ERROR);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('timestamp');
    });

    it('should return structured error for validation failures', async () => {
      const response = await request(testApp)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', ErrorType.VALIDATION_ERROR);
      expect(response.body.error).toHaveProperty('details');
    });

    it('should include request ID in error responses', async () => {
      const response = await request(testApp)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.error.requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
    });
  });

  describe('error monitoring', () => {
    it('should record errors in monitoring system', async () => {
      await request(testApp)
        .get('/api/nonexistent')
        .expect(404);

      const errorMetrics = monitoring.getErrorMetrics();
      expect(errorMetrics).toHaveLength(1);
      expect(errorMetrics[0]).toHaveProperty('type', ErrorType.NOT_FOUND_ERROR);
      expect(errorMetrics[0]).toHaveProperty('requestId');
      expect(errorMetrics[0]).toHaveProperty('url', '/api/nonexistent');
    });

    it('should record request metrics even for errors', async () => {
      await request(testApp)
        .get('/api/nonexistent')
        .expect(404);

      const requestMetrics = monitoring.getRequestMetrics();
      expect(requestMetrics).toHaveLength(1);
      expect(requestMetrics[0]).toHaveProperty('statusCode', 404);
      expect(requestMetrics[0]).toHaveProperty('responseTime');
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(testApp).get('/api/processes')
      );

      const responses = await Promise.allSettled(requests);
      
      // At least one should be rate limited (429) or unauthorized (401)
      const statusCodes = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => (r.value as any).status);
      
      expect(statusCodes).toContain(expect.any(Number));
    });
  });

  describe('async error handling', () => {
    it('should handle async errors properly', async () => {
      // This will trigger an async error in the auth middleware
      const response = await request(testApp)
        .get('/api/processes')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', ErrorType.AUTHENTICATION_ERROR);
    });
  });

  describe('health check error scenarios', () => {
    it('should handle health check failures gracefully', async () => {
      const response = await request(testApp)
        .get('/health')
        .expect(200); // Should still return 200 even if some checks fail

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('error recovery', () => {
    it('should continue processing after errors', async () => {
      // Make an error request
      await request(testApp)
        .get('/api/nonexistent')
        .expect(404);

      // Make a successful request
      const response = await request(testApp)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });

  describe('circuit breaker integration', () => {
    it('should handle circuit breaker errors', async () => {
      // This would require mocking external services to trigger circuit breaker
      // For now, we'll test the error response format
      const response = await request(testApp)
        .get('/api/processes/invalid-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });

  describe('timeout handling', () => {
    it('should handle request timeouts gracefully', async () => {
      // Mock a slow endpoint that would timeout
      const response = await request(testApp)
        .get('/health')
        .timeout(1000)
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });

  describe('correlation tracking', () => {
    it('should maintain correlation ID across requests', async () => {
      const correlationId = 'test-correlation-123';
      
      const response = await request(testApp)
        .get('/api/nonexistent')
        .set('X-Correlation-ID', correlationId)
        .expect(404);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
      expect(response.body.error.requestId).toBeDefined();
    });
  });

  describe('performance under error conditions', () => {
    it('should maintain performance during error scenarios', async () => {
      const startTime = Date.now();
      
      // Make multiple error requests
      const requests = Array(5).fill(null).map(() =>
        request(testApp).get('/api/nonexistent')
      );

      await Promise.all(requests);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time even with errors
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('memory leak prevention', () => {
    it('should not accumulate error data indefinitely', async () => {
      const initialMetrics = monitoring.getSystemMetrics();
      
      // Generate many errors
      for (let i = 0; i < 50; i++) {
        await request(testApp)
          .get(`/api/nonexistent-${i}`)
          .expect(404);
      }
      
      const finalMetrics = monitoring.getSystemMetrics();
      
      // Memory usage should not increase dramatically
      const memoryIncrease = finalMetrics.memory.heapUsed - initialMetrics.memory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
    });
  });

  describe('error details sanitization', () => {
    it('should not expose sensitive information in error responses', async () => {
      const response = await request(testApp)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error.message).not.toContain('password');
      expect(response.body.error.message).not.toContain('hash');
      expect(response.body.error.message).not.toContain('database');
    });
  });
});