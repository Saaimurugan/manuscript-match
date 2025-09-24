import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import { UserRole, UserStatus } from '../../types';
import { generateToken } from '../../utils/jwt';
import { AuthService } from '../../services/AuthService';

describe('Admin Activity Log Routes', () => {
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let regularUserId: string;
  let testProcessId: string;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.activityLog.deleteMany({
      where: {
        OR: [
          { userId: { contains: 'test-admin' } },
          { userId: { contains: 'test-user' } }
        ]
      }
    });
    await prisma.process.deleteMany({
      where: {
        OR: [
          { userId: { contains: 'test-admin' } },
          { userId: { contains: 'test-user' } }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'admin-activity-test' } },
          { email: { contains: 'user-activity-test' } }
        ]
      }
    });

    // Create test admin user
    const authService = new AuthService();
    const hashedPassword = await authService.hashPassword('password123');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-activity-test@example.com',
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });

    // Create test regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user-activity-test@example.com',
        passwordHash: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    regularUserId = regularUser.id;
    userToken = generateToken({ userId: regularUser.id, email: regularUser.email, role: regularUser.role });

    // Create test process
    const process = await prisma.process.create({
      data: {
        userId: regularUserId,
        title: 'Test Process for Activity Logs',
        status: 'CREATED',
        currentStep: 'UPLOAD',
      },
    });
    testProcessId = process.id;

    // Create test activity logs
    const activityLogs = [
      {
        userId: adminUserId,
        processId: testProcessId,
        action: 'ADMIN_VIEW_PROCESS',
        details: JSON.stringify({ processTitle: 'Test Process for Activity Logs' }),
        resourceType: 'process',
        resourceId: testProcessId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
      {
        userId: regularUserId,
        processId: testProcessId,
        action: 'PROCESS_CREATED',
        details: JSON.stringify({ title: 'Test Process for Activity Logs' }),
        resourceType: 'process',
        resourceId: testProcessId,
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 User Browser',
      },
      {
        userId: adminUserId,
        action: 'ADMIN_LOGIN',
        details: JSON.stringify({ loginMethod: 'email' }),
        resourceType: 'user',
        resourceId: adminUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
      {
        userId: regularUserId,
        action: 'USER_LOGIN',
        details: JSON.stringify({ loginMethod: 'email' }),
        resourceType: 'user',
        resourceId: regularUserId,
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 User Browser',
      },
    ];

    for (const logData of activityLogs) {
      await prisma.activityLog.create({ data: logData });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.activityLog.deleteMany({
      where: {
        OR: [
          { userId: adminUserId },
          { userId: regularUserId }
        ]
      }
    });
    await prisma.process.deleteMany({
      where: { id: testProcessId }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: adminUserId },
          { id: regularUserId }
        ]
      }
    });
  });

  describe('GET /api/admin/activity-logs', () => {
    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny access for regular users', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should get activity logs with pagination for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter activity logs by userId', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: adminUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should be from the admin user
      response.body.data.forEach((log: any) => {
        expect(log.user?.id).toBe(adminUserId);
      });
    });

    it('should filter activity logs by action', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'ADMIN_VIEW_PROCESS' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should have the specified action
      response.body.data.forEach((log: any) => {
        expect(log.action).toBe('ADMIN_VIEW_PROCESS');
      });
    });

    it('should filter activity logs by resourceType', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ resourceType: 'process' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should have the specified resource type
      response.body.data.forEach((log: any) => {
        expect(log.resourceType).toBe('process');
      });
    });

    it('should filter activity logs by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should be within the date range
      response.body.data.forEach((log: any) => {
        const logDate = new Date(log.timestamp);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should search activity logs by text', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'Test Process' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should sort activity logs by timestamp', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'timestamp', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Check if logs are sorted by timestamp in ascending order
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          const prevTimestamp = new Date(response.body.data[i - 1].timestamp);
          const currTimestamp = new Date(response.body.data[i].timestamp);
          expect(currTimestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
        }
      }
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 0, limit: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('GET /api/admin/activity-logs/export', () => {
    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny access for regular users', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should export activity logs as JSON', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'json' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('activity_logs_export_');
    });

    it('should export activity logs as CSV', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('activity_logs_export_');
    });

    it('should export activity logs as PDF', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('activity_logs_export_');
    });

    it('should export filtered activity logs', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          format: 'json',
          userId: adminUserId,
          action: 'ADMIN_VIEW_PROCESS'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should validate export format', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('GET /api/admin/users/:id/activity', () => {
    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny access for regular users', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should get user-specific activity logs for admin users', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(regularUserId);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      
      // All logs should be from the specified user
      response.body.data.logs.forEach((log: any) => {
        expect(log.user?.id || regularUserId).toBe(regularUserId);
      });
    });

    it('should filter user activity logs by action', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'PROCESS_CREATED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      
      // All logs should have the specified action
      response.body.data.logs.forEach((log: any) => {
        expect(log.action).toBe('PROCESS_CREATED');
      });
    });

    it('should filter user activity logs by processId', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ processId: testProcessId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      
      // All logs should be related to the specified process
      response.body.data.logs.forEach((log: any) => {
        if (log.process) {
          expect(log.process.id).toBe(testProcessId);
        }
      });
    });

    it('should filter user activity logs by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      
      // All logs should be within the date range
      response.body.data.logs.forEach((log: any) => {
        const logDate = new Date(log.timestamp);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/admin/users/${nonExistentUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate user ID format', async () => {
      const response = await request(app)
        .get('/api/admin/users/invalid-id/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sort user activity logs', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'timestamp', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      
      // Check if logs are sorted by timestamp in descending order
      if (response.body.data.logs.length > 1) {
        for (let i = 1; i < response.body.data.logs.length; i++) {
          const prevTimestamp = new Date(response.body.data.logs[i - 1].timestamp);
          const currTimestamp = new Date(response.body.data.logs[i].timestamp);
          expect(prevTimestamp.getTime()).toBeGreaterThanOrEqual(currTimestamp.getTime());
        }
      }
    });
  });

  describe('Activity Log Data Integrity', () => {
    it('should include all required fields in activity log responses', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 0) {
        const log = response.body.data[0];
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('resourceType');
        expect(log).toHaveProperty('user');
        
        if (log.user) {
          expect(log.user).toHaveProperty('id');
          expect(log.user).toHaveProperty('email');
          expect(log.user).toHaveProperty('role');
        }
      }
    });

    it('should sanitize user email addresses in responses', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: regularUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.forEach((log: any) => {
        if (log.user && log.user.email) {
          // Email should be sanitized (partially hidden)
          expect(log.user.email).toMatch(/^.{1,2}\*\*\*@/);
        }
      });
    });

    it('should include process information when available', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ processId: testProcessId })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.forEach((log: any) => {
        if (log.process) {
          expect(log.process).toHaveProperty('id');
          expect(log.process).toHaveProperty('title');
          expect(log.process).toHaveProperty('status');
          expect(log.process).toHaveProperty('currentStep');
        }
      });
    });
  });
});