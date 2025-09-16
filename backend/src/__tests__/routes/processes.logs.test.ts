import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../setup/testApp';
import { createTestUser, createTestProcess, createTestActivityLog } from '../setup/testData';

describe('GET /api/processes/:id/logs', () => {
  let app: Express;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let processId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.activityLog.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and get auth token
    const { user, token } = await createTestUser(prisma);
    userId = user.id;
    authToken = token;

    // Create test process
    const process = await createTestProcess(prisma, userId);
    processId = process.id;
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should require valid process ownership', async () => {
      // Create another user and process
      const { user: otherUser, token: otherToken } = await createTestUser(prisma, 'other@example.com');
      const otherProcess = await createTestProcess(prisma, otherUser.id);

      const response = await request(app)
        .get(`/api/processes/${otherProcess.id}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('Validation', () => {
    it('should validate process ID format', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid process ID format');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .query({
          page: 0, // Invalid: should be >= 1
          limit: 200, // Invalid: should be <= 100
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .query({
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Functionality', () => {
    beforeEach(async () => {
      // Create test activity logs
      await createTestActivityLog(prisma, {
        userId,
        processId,
        action: 'PROCESS_CREATED',
        details: JSON.stringify({ method: 'POST', path: '/api/processes' }),
      });

      await createTestActivityLog(prisma, {
        userId,
        processId,
        action: 'MANUSCRIPT_UPLOADED',
        details: JSON.stringify({ filename: 'test.pdf' }),
      });

      await createTestActivityLog(prisma, {
        userId,
        processId,
        action: 'DATABASE_SEARCH_INITIATED',
        details: JSON.stringify({ databases: ['pubmed', 'elsevier'] }),
      });
    });

    it('should return process logs with default pagination', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      // Check log structure
      const log = response.body.data[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('userId');
      expect(log).toHaveProperty('processId');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('details');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('formattedTimestamp');
    });

    it('should return logs in chronological order (newest first)', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = response.body.data;
      expect(logs[0].action).toBe('DATABASE_SEARCH_INITIATED'); // Most recent
      expect(logs[1].action).toBe('MANUSCRIPT_UPLOADED');
      expect(logs[2].action).toBe('PROCESS_CREATED'); // Oldest
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle second page of pagination', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should filter by userId when provided', async () => {
      // Create logs for another user in the same process (admin scenario)
      const { user: otherUser } = await createTestUser(prisma, 'admin@example.com');
      await createTestActivityLog(prisma, {
        userId: otherUser.id,
        processId,
        action: 'ADMIN_PROCESSES_VIEWED',
        details: JSON.stringify({ adminAction: true }),
      });

      // Request logs for specific user
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .query({ userId: otherUser.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].action).toBe('ADMIN_PROCESSES_VIEWED');
      expect(response.body.data[0].userId).toBe(otherUser.id);
    });

    it('should return empty array for process with no logs', async () => {
      // Create a new process with no logs
      const newProcess = await createTestProcess(prisma, userId, 'Empty Process');

      const response = await request(app)
        .get(`/api/processes/${newProcess.id}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should parse JSON details correctly', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const uploadLog = response.body.data.find((log: any) => log.action === 'MANUSCRIPT_UPLOADED');
      expect(uploadLog.details).toEqual({ filename: 'test.pdf' });
    });

    it('should handle non-JSON details gracefully', async () => {
      // Create a log with non-JSON details
      await createTestActivityLog(prisma, {
        userId,
        processId,
        action: 'CUSTOM_ACTION',
        details: 'plain text details',
      });

      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const customLog = response.body.data.find((log: any) => log.action === 'CUSTOM_ACTION');
      expect(customLog.details).toBe('plain text details');
    });

    it('should format timestamps in user-friendly format', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const log = response.body.data[0];
      expect(log.formattedTimestamp).toBeDefined();
      expect(typeof log.formattedTimestamp).toBe('string');
      // Should be a relative time format like "Just now", "5 minutes ago", etc.
      expect(log.formattedTimestamp).toMatch(/^(Just now|\d+ (minute|hour|day)s? ago|[A-Z][a-z]{2} \d{1,2}, \d{4})/);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid process ID format that passes validation
      // but fails at the database level
      jest.spyOn(prisma.process, 'findUnique').mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to fetch process logs');
    });

    it('should include request ID in error responses', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large number of logs efficiently', async () => {
      // Create many logs
      const logPromises = [];
      for (let i = 0; i < 50; i++) {
        logPromises.push(createTestActivityLog(prisma, {
          userId,
          processId,
          action: `ACTION_${i}`,
          details: JSON.stringify({ index: i }),
        }));
      }
      await Promise.all(logPromises);

      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .query({ limit: 20 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data).toHaveLength(20);
      expect(response.body.pagination.total).toBe(53); // 50 + 3 from beforeEach
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});