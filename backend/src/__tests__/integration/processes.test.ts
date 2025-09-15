import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { ProcessStatus, ProcessStep } from '../../types';

const prisma = new PrismaClient();

describe('Process Management API', () => {
  let authToken: string;
  let userId: string;
  let processId: string;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'process.test@example.com',
        password: 'testpassword123',
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.process.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { email: 'process.test@example.com' },
    });
    await disconnectDatabase();
  });

  describe('POST /api/processes', () => {
    it('should create a new process successfully', async () => {
      const response = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Manuscript Analysis',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: 'Test Manuscript Analysis',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        userId,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();

      processId = response.body.data.id;
    });

    it('should reject process creation with invalid title', async () => {
      const response = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject process creation without authentication', async () => {
      const response = await request(app)
        .post('/api/processes')
        .send({
          title: 'Test Process',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/processes', () => {
    beforeAll(async () => {
      // Create additional test processes
      await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Second Process' });

      await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Third Process' });
    });

    it('should list user processes with pagination', async () => {
      const response = await request(app)
        .get('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should filter processes by status', async () => {
      const response = await request(app)
        .get('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: ProcessStatus.CREATED });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((process: any) => {
        expect(process.status).toBe(ProcessStatus.CREATED);
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/processes');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/processes/:id', () => {
    it('should get process details', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: processId,
        title: 'Test Manuscript Analysis',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        userId,
      });
    });

    it('should get process with detailed information', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ details: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('authors');
      expect(response.body.data).toHaveProperty('shortlists');
      expect(response.body.data).toHaveProperty('recentActivity');
    });

    it('should return 404 for non-existent process', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/processes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/processes/:id/step', () => {
    it('should update process step successfully', async () => {
      const response = await request(app)
        .put(`/api/processes/${processId}/step`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: ProcessStep.METADATA_EXTRACTION,
          status: ProcessStatus.PROCESSING,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: processId,
        currentStep: ProcessStep.METADATA_EXTRACTION,
        status: ProcessStatus.PROCESSING,
      });
    });

    it('should update step without changing status', async () => {
      const response = await request(app)
        .put(`/api/processes/${processId}/step`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: ProcessStep.KEYWORD_ENHANCEMENT,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe(ProcessStep.KEYWORD_ENHANCEMENT);
      expect(response.body.data.status).toBe(ProcessStatus.PROCESSING);
    });

    it('should reject invalid step', async () => {
      const response = await request(app)
        .put(`/api/processes/${processId}/step`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'INVALID_STEP',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/processes/:id', () => {
    it('should update process title', async () => {
      const response = await request(app)
        .put(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Manuscript Analysis',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Manuscript Analysis');
    });

    it('should update process status', async () => {
      const response = await request(app)
        .put(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: ProcessStatus.COMPLETED,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(ProcessStatus.COMPLETED);
    });

    it('should reject empty update', async () => {
      const response = await request(app)
        .put(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/processes/stats', () => {
    it('should get process statistics', async () => {
      const response = await request(app)
        .get('/api/processes/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('byStep');
      expect(typeof response.body.data.total).toBe('number');
      expect(response.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/processes/:id', () => {
    let processToDelete: string;

    beforeAll(async () => {
      // Create a process specifically for deletion testing
      const response = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Process to Delete',
        });
      processToDelete = response.body.data.id;
    });

    it('should delete process successfully', async () => {
      const response = await request(app)
        .delete(`/api/processes/${processToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Process deleted successfully');

      // Verify process is deleted
      const getResponse = await request(app)
        .get(`/api/processes/${processToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent process', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/processes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('Authorization', () => {
    let otherUserToken: string;
    let otherUserProcessId: string;

    beforeAll(async () => {
      // Create another user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other.user@example.com',
          password: 'testpassword123',
        });

      otherUserToken = registerResponse.body.data.token;

      // Create a process for the other user
      const processResponse = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Other User Process',
        });

      otherUserProcessId = processResponse.body.data.id;
    });

    afterAll(async () => {
      // Clean up other user's data
      await prisma.process.deleteMany({
        where: { user: { email: 'other.user@example.com' } },
      });
      await prisma.user.deleteMany({
        where: { email: 'other.user@example.com' },
      });
    });

    it('should not allow access to other user\'s process', async () => {
      const response = await request(app)
        .get(`/api/processes/${otherUserProcessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should not allow updating other user\'s process', async () => {
      const response = await request(app)
        .put(`/api/processes/${otherUserProcessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should not allow deleting other user\'s process', async () => {
      const response = await request(app)
        .delete(`/api/processes/${otherUserProcessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });
});