import request from 'supertest';
import app from '@/app';
import { prisma } from '@/config/database';
import { UserRole, ProcessStatus, ProcessStep } from '@/types';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';

describe('Admin Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let regularUserId: string;
  let testProcessId: string;
  let authService: AuthService;

  beforeAll(async () => {
    // Initialize services
    const userRepository = new UserRepository(prisma);
    const activityLogRepository = new ActivityLogRepository(prisma);
    authService = new AuthService(userRepository, activityLogRepository);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: await authService.hashPassword('password123'),
        role: UserRole.ADMIN,
      },
    });
    adminUserId = adminUser.id;
    adminToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: UserRole.ADMIN,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: await authService.hashPassword('password123'),
        role: UserRole.USER,
      },
    });
    regularUserId = regularUser.id;
    userToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Create test process
    const testProcess = await prisma.process.create({
      data: {
        userId: regularUserId,
        title: 'Test Process for Admin',
        status: ProcessStatus.COMPLETED,
        currentStep: ProcessStep.EXPORT,
        metadata: JSON.stringify({ test: 'data' }),
      },
    });
    testProcessId = testProcess.id;

    // Create test activity logs
    await prisma.activityLog.createMany({
      data: [
        {
          userId: regularUserId,
          processId: testProcessId,
          action: 'PROCESS_CREATED',
          details: 'Created test process',
        },
        {
          userId: regularUserId,
          processId: testProcessId,
          action: 'PROCESS_UPDATED',
          details: 'Updated test process',
        },
        {
          userId: adminUserId,
          action: 'ADMIN_LOGIN',
          details: 'Admin logged in',
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.activityLog.deleteMany({});
    await prisma.process.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Authentication and Authorization', () => {
    it('should deny access to admin endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should deny access to admin endpoints for regular users', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
    });

    it('should allow access to admin endpoints for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/processes', () => {
    it('should return all user processes with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: expect.any(Boolean),
      });

      // Check that user email is sanitized
      if (response.body.data.length > 0) {
        const process = response.body.data[0];
        expect(process.user.email).toMatch(/^.{2}\*\*\*@/);
        expect(process.activityLogCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should filter processes by user ID', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: regularUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All processes should belong to the specified user
      response.body.data.forEach((process: any) => {
        expect(process.user.id).toBe(regularUserId);
      });
    });

    it('should filter processes by status', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: ProcessStatus.COMPLETED })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All processes should have the specified status
      response.body.data.forEach((process: any) => {
        expect(process.status).toBe(ProcessStatus.COMPLETED);
      });
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 0, limit: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/logs', () => {
    it('should return all user activity logs with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: expect.any(Boolean),
      });

      // Check that user email is sanitized
      if (response.body.data.length > 0) {
        const log = response.body.data[0];
        expect(log.user.email).toMatch(/^.{2}\*\*\*@/);
        expect(log.action).toBeDefined();
        expect(log.timestamp).toBeDefined();
      }
    });

    it('should filter logs by user ID', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: regularUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should belong to the specified user
      response.body.data.forEach((log: any) => {
        expect(log.user.id).toBe(regularUserId);
      });
    });

    it('should filter logs by process ID', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ processId: testProcessId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should belong to the specified process
      response.body.data.forEach((log: any) => {
        expect(log.process?.id).toBe(testProcessId);
      });
    });

    it('should filter logs by action', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'PROCESS_CREATED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should have the specified action
      response.body.data.forEach((log: any) => {
        expect(log.action).toBe('PROCESS_CREATED');
      });
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All logs should be within the specified date range
      response.body.data.forEach((log: any) => {
        const logDate = new Date(log.timestamp);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalUsers: expect.any(Number),
        totalProcesses: expect.any(Number),
        totalLogs: expect.any(Number),
        processStatusBreakdown: expect.any(Object),
        processStepBreakdown: expect.any(Object),
        recentActivity: {
          last24Hours: expect.any(Number),
          last7Days: expect.any(Number),
          last30Days: expect.any(Number),
        },
        topUsers: expect.any(Array),
      });

      // Verify that top users have sanitized emails
      response.body.data.topUsers.forEach((user: any) => {
        expect(user.email).toMatch(/^.{2}\*\*\*@/);
        expect(user.processCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('GET /api/admin/users/:userId', () => {
    it('should return detailed user information', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        user: {
          id: regularUserId,
          email: 'user@test.com', // Full email in detailed view
          role: UserRole.USER,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        statistics: {
          processCount: expect.any(Number),
          logCount: expect.any(Number),
          lastActivity: expect.any(String),
        },
        recentProcesses: expect.any(Array),
        recentActivity: expect.any(Array),
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/admin/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/admin/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/processes/:processId', () => {
    it('should return detailed process information with audit trail', async () => {
      const response = await request(app)
        .get(`/api/admin/processes/${testProcessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        process: {
          id: testProcessId,
          title: 'Test Process for Admin',
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.EXPORT,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          metadata: { test: 'data' },
        },
        user: {
          id: regularUserId,
          email: 'user@test.com',
          role: UserRole.USER,
        },
        activityLogs: expect.any(Array),
        statistics: {
          totalLogs: expect.any(Number),
          duration: expect.any(Number),
        },
      });

      // Verify activity logs are included
      expect(response.body.data.activityLogs.length).toBeGreaterThan(0);
      response.body.data.activityLogs.forEach((log: any) => {
        expect(log).toMatchObject({
          id: expect.any(String),
          action: expect.any(String),
          timestamp: expect.any(String),
        });
      });
    });

    it('should return 404 for non-existent process', async () => {
      const fakeProcessId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/admin/processes/${fakeProcessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/admin/export/:type', () => {
    it('should export processes data as CSV', async () => {
      const response = await request(app)
        .get('/api/admin/export/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="processes_export_.*\.csv"/);
      expect(response.text).toContain('id,title,status'); // CSV headers
    });

    it('should export logs data as CSV', async () => {
      const response = await request(app)
        .get('/api/admin/export/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="logs_export_.*\.csv"/);
      expect(response.text).toContain('id,action,details'); // CSV headers
    });

    it('should export users data as CSV', async () => {
      const response = await request(app)
        .get('/api/admin/export/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="users_export_.*\.csv"/);
      expect(response.text).toContain('id,email,role'); // CSV headers
    });

    it('should return 400 for invalid export type', async () => {
      const response = await request(app)
        .get('/api/admin/export/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid export format', async () => {
      const response = await request(app)
        .get('/api/admin/export/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should sanitize user emails in process listings', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        const process = response.body.data[0];
        expect(process.user.email).toMatch(/^.{2}\*\*\*@/);
        expect(process.user.email).not.toBe('user@test.com');
      }
    });

    it('should sanitize user emails in log listings', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        const log = response.body.data[0];
        expect(log.user.email).toMatch(/^.{2}\*\*\*@/);
        expect(log.user.email).not.toBe('user@test.com');
      }
    });

    it('should show full email in detailed user view', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe('user@test.com');
    });

    it('should show full email in detailed process view', async () => {
      const response = await request(app)
        .get(`/api/admin/processes/${testProcessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe('user@test.com');
    });
  });

  describe('Activity Logging', () => {
    it('should log admin actions', async () => {
      // Make an admin request
      await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check that the action was logged
      const logs = await prisma.activityLog.findMany({
        where: {
          userId: adminUserId,
          action: 'ADMIN_VIEW_ALL_PROCESSES',
        },
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});