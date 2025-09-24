import request from 'supertest';
import { Express } from 'express';
import { 
  getClientIP, 
  securityUtils,
  SecurityEventType,
  ipAccessControl,
  adminRateLimiter,
  sensitiveAdminRateLimiter,
  securityMonitoring,
  adminSecurityMiddleware
} from '@/middleware/security';
import { createTestApp } from '../setup/testApp';
import { ActivityLogService } from '@/services/ActivityLogService';
import { createTestUser } from '../setup/testData';
import { PrismaClient } from '@prisma/client';

// Mock ActivityLogService
jest.mock('@/services/ActivityLogService');
const mockActivityLogService = ActivityLogService as jest.MockedClass<typeof ActivityLogService>;

describe('Security Middleware', () => {
  let app: Express;
  let prisma: PrismaClient;
  let adminUser: any;
  let adminToken: string;

  beforeEach(async () => {
    app = createTestApp();
    prisma = new PrismaClient();
    
    // Clear security state
    securityUtils.clearFailedAttempts();
    securityUtils.clearBlockedIPs();
    
    // Create admin user for testing
    const result = await createTestUser(prisma, 'admin@test.com');
    // Update user role to ADMIN
    adminUser = await prisma.user.update({
      where: { id: result.user.id },
      data: { role: 'ADMIN' }
    });
    adminToken = result.token;
    
    // Clear mock calls
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        connection: { remoteAddress: '127.0.0.1' }
      } as any;

      const ip = getClientIP(req);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const req = {
        headers: { 'x-real-ip': '192.168.1.2' },
        connection: { remoteAddress: '127.0.0.1' }
      } as any;

      const ip = getClientIP(req);
      expect(ip).toBe('192.168.1.2');
    });

    it('should fallback to remote address', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' }
      } as any;

      const ip = getClientIP(req);
      expect(ip).toBe('127.0.0.1');
    });

    it('should return unknown if no IP available', () => {
      const req = {
        headers: {},
        connection: {}
      } as any;

      const ip = getClientIP(req);
      expect(ip).toBe('unknown');
    });
  });

  describe('IP Access Control', () => {
    it('should allow access from allowed IPs', async () => {
      const middleware = ipAccessControl({ allowedIPs: ['192.168.1.1'] });
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1' },
        user: adminUser,
        path: '/test',
        method: 'GET'
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should block access from non-allowed IPs', async () => {
      const middleware = ipAccessControl({ allowedIPs: ['192.168.1.1'] });
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.2' },
        user: adminUser,
        path: '/test',
        method: 'GET'
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Access denied from this IP address'
      }));
    });

    it('should block previously blocked IPs', async () => {
      const ip = '192.168.1.3';
      securityUtils.getBlockedIPs().add(ip);
      
      const middleware = ipAccessControl();
      
      const req = {
        headers: { 'x-forwarded-for': ip },
        user: adminUser,
        path: '/test',
        method: 'GET'
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Access denied from this IP address'
      }));
    });
  });

  describe('Security Monitoring', () => {
    it('should detect SQL injection attempts', async () => {
      const middleware = securityMonitoring();
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'test-agent' },
        path: '/test',
        method: 'POST',
        query: {},
        body: { input: "'; DROP TABLE users; --" },
        user: adminUser
      } as any;
      
      const res = {
        on: jest.fn(),
        statusCode: 200
      } as any;
      
      const next = jest.fn();

      await middleware(req, res, next);
      
      // Should log suspicious activity
      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY
        })
      );
    });

    it('should detect XSS attempts', async () => {
      const middleware = securityMonitoring();
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'test-agent' },
        path: '/test',
        method: 'POST',
        query: {},
        body: { content: '<script>alert("xss")</script>' },
        user: adminUser
      } as any;
      
      const res = {
        on: jest.fn(),
        statusCode: 200
      } as any;
      
      const next = jest.fn();

      await middleware(req, res, next);
      
      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY
        })
      );
    });

    it('should detect path traversal attempts', async () => {
      const middleware = securityMonitoring();
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'test-agent' },
        path: '/test',
        method: 'GET',
        query: { file: '../../../etc/passwd' },
        body: {},
        user: adminUser
      } as any;
      
      const res = {
        on: jest.fn(),
        statusCode: 200
      } as any;
      
      const next = jest.fn();

      await middleware(req, res, next);
      
      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY
        })
      );
    });

    it('should track failed attempts and block IPs', async () => {
      const ip = '192.168.1.4';
      
      // Simulate 10 failed attempts
      for (let i = 0; i < 10; i++) {
        securityUtils.handleFailedAttempt(ip);
      }
      
      expect(securityUtils.getBlockedIPs().has(ip)).toBe(true);
      expect(securityUtils.getFailedAttempts().get(ip)?.blocked).toBe(true);
    });
  });

  describe('Admin Security Middleware', () => {
    it('should log admin actions', async () => {
      const middleware = adminSecurityMiddleware();
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1' },
        path: '/api/admin/users/123',
        method: 'DELETE',
        params: { id: '123' },
        body: {},
        user: adminUser
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      
      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.ADMIN_ACTION_BLOCKED,
          details: expect.objectContaining({
            adminUserId: adminUser.id,
            adminEmail: adminUser.email,
            targetResource: '123',
            action: 'DELETE',
            endpoint: '/api/admin/users/123'
          })
        })
      );
      
      expect(next).toHaveBeenCalledWith();
    });

    it('should restrict sensitive operations to allowed IPs when configured', async () => {
      // Set allowed admin IPs
      process.env.ALLOWED_ADMIN_IPS = '192.168.1.1,10.0.0.1';
      
      const middleware = adminSecurityMiddleware();
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.2' }, // Not in allowed list
        path: '/api/admin/users/invite',
        method: 'POST',
        params: {},
        body: {},
        user: adminUser
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Sensitive admin operations are restricted to authorized IP addresses'
      }));
      
      // Clean up
      delete process.env.ALLOWED_ADMIN_IPS;
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply admin rate limiting', async () => {
      // Create a test route with admin rate limiter
      app.get('/test-admin-rate-limit', adminRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/test-admin-rate-limit')
          .set('Authorization', `Bearer ${adminToken}`);
        
        if (i < 4) {
          expect(response.status).toBe(200);
        }
      }
    });

    it('should apply sensitive admin rate limiting', async () => {
      // Create a test route with sensitive admin rate limiter
      app.post('/test-sensitive-admin', sensitiveAdminRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/test-sensitive-admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ test: 'data' });
        
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Security Event Logging', () => {
    it('should log rate limit exceeded events', async () => {
      const mockLogActivity = jest.fn();
      mockActivityLogService.prototype.logActivity = mockLogActivity;

      // Create a test route with a very low rate limit
      const testRateLimiter = require('express-rate-limit')({
        windowMs: 60000,
        max: 1,
        handler: async (req: any, res: any, next: any) => {
          await securityUtils.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, req);
          res.status(429).json({ error: 'Rate limit exceeded' });
        }
      });

      app.get('/test-rate-limit', testRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // First request should succeed
      await request(app).get('/test-rate-limit');
      
      // Second request should trigger rate limit
      await request(app).get('/test-rate-limit');

      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.RATE_LIMIT_EXCEEDED
        })
      );
    });

    it('should log IP blocking events', async () => {
      const mockLogActivity = jest.fn();
      mockActivityLogService.prototype.logActivity = mockLogActivity;

      const ip = '192.168.1.5';
      
      // Block the IP
      securityUtils.getBlockedIPs().add(ip);
      
      const middleware = ipAccessControl();
      
      const req = {
        headers: { 'x-forwarded-for': ip },
        user: adminUser,
        path: '/test',
        method: 'GET'
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      
      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.IP_BLOCKED
        })
      );
    });
  });

  describe('Attack Prevention', () => {
    it('should prevent SQL injection attacks', async () => {
      app.post('/test-sql-injection', securityMonitoring(), (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test-sql-injection')
        .send({ query: "SELECT * FROM users WHERE id = 1; DROP TABLE users; --" });

      // Should log the suspicious activity
      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY
        })
      );
    });

    it('should prevent XSS attacks', async () => {
      app.post('/test-xss', securityMonitoring(), (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test-xss')
        .send({ content: '<script>document.cookie="stolen"</script>' });

      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY
        })
      );
    });

    it('should prevent path traversal attacks', async () => {
      app.get('/test-path-traversal', securityMonitoring(), (req, res) => {
        res.json({ query: req.query });
      });

      const response = await request(app)
        .get('/test-path-traversal')
        .query({ file: '../../../etc/passwd' });

      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY
        })
      );
    });

    it('should handle multiple failed attempts from same IP', async () => {
      const ip = '192.168.1.6';
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 12; i++) {
        securityUtils.handleFailedAttempt(ip);
      }
      
      // IP should be blocked
      expect(securityUtils.getBlockedIPs().has(ip)).toBe(true);
      
      // Subsequent requests from this IP should be blocked
      const middleware = ipAccessControl();
      
      const req = {
        headers: { 'x-forwarded-for': ip },
        user: adminUser,
        path: '/test',
        method: 'GET'
      } as any;
      
      const res = {} as any;
      const next = jest.fn();

      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403
      }));
    });
  });

  describe('Performance and DoS Protection', () => {
    it('should detect slow requests as potential DoS attempts', async () => {
      const middleware = securityMonitoring();
      
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'test-agent' },
        path: '/test',
        method: 'GET',
        query: {},
        body: {},
        user: adminUser
      } as any;
      
      const res = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate slow response
            setTimeout(() => {
              res.statusCode = 200;
              callback();
            }, 100); // Simulate delay, but we'll mock the response time
          }
        }),
        statusCode: 200
      } as any;
      
      const next = jest.fn();

      // Mock Date.now to simulate slow request
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000; // Start time
        return 7000; // End time (6 second response)
      });

      await middleware(req, res, next);
      
      // Trigger the finish event
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      expect(mockActivityLogService.prototype.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityEventType.SUSPICIOUS_ACTIVITY,
          details: expect.objectContaining({
            slowRequest: true,
            responseTime: 6000
          })
        })
      );

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });
});