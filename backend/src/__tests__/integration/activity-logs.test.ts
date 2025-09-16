import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Activity Logs Integration', () => {
  let authToken: string;
  let userId: string;
  let processId: string;

  beforeAll(async () => {
    // Clean up database
    await prisma.activityLog.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const passwordHash = await bcrypt.hash('testpassword123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash,
        role: 'USER',
      },
    });
    userId = user.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env['JWT_SECRET']!,
      { expiresIn: '1h' }
    );

    // Create test process
    const testProcess = await prisma.process.create({
      data: {
        userId,
        title: 'Test Process',
        status: 'CREATED',
        currentStep: 'UPLOAD',
        metadata: JSON.stringify({ test: true }),
      },
    });
    processId = testProcess.id;

    // Create some test activity logs
    await prisma.activityLog.createMany({
      data: [
        {
          userId,
          processId,
          action: 'PROCESS_CREATED',
          details: JSON.stringify({ method: 'POST' }),
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
        {
          userId,
          processId,
          action: 'MANUSCRIPT_UPLOADED',
          details: JSON.stringify({ filename: 'test.pdf' }),
          timestamp: new Date('2023-01-01T11:00:00Z'),
        },
        {
          userId,
          processId,
          action: 'DATABASE_SEARCH_INITIATED',
          details: JSON.stringify({ databases: ['pubmed'] }),
          timestamp: new Date('2023-01-01T12:00:00Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/processes/:id/logs', () => {
    it('should return activity logs for a process', async () => {
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

      // Logs should be in reverse chronological order
      expect(response.body.data[0].action).toBe('DATABASE_SEARCH_INITIATED');
      expect(response.body.data[1].action).toBe('MANUSCRIPT_UPLOADED');
      expect(response.body.data[2].action).toBe('PROCESS_CREATED');
    });

    it('should handle pagination', async () => {
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

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/logs`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const fakeProcessId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/processes/${fakeProcessId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });
});