import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { ActivityLogRepository } from '../../repositories/ActivityLogRepository';
import { ProcessStatus, ProcessStep, DatabaseType } from '../../types';

const prisma = new PrismaClient();
const userRepository = new UserRepository(prisma);
const activityLogRepository = new ActivityLogRepository(prisma);
const authService = new AuthService(userRepository, activityLogRepository);

describe('Database Search Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let processId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = await authService.register({ email: 'test@example.com', password: 'password123' });
    authToken = testUser.token;
    userId = testUser.user.id;
  });

  beforeEach(async () => {
    // Create a test process with keyword enhancement data
    const processResponse = await request(app)
      .post('/api/processes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Database Search Process',
      });

    processId = processResponse.body.data.id;

    // Add mock keyword enhancement data
    await prisma.process.update({
      where: { id: processId },
      data: {
        currentStep: ProcessStep.DATABASE_SEARCH,
        status: ProcessStatus.CREATED,
        metadata: JSON.stringify({
          keywordEnhancement: {
            originalKeywords: ['machine learning', 'neural networks'],
            enhancedKeywords: ['deep learning', 'artificial intelligence'],
            meshTerms: ['Machine Learning', 'Neural Networks, Computer'],
            selectedKeywords: ['machine learning', 'deep learning', 'neural networks'],
            searchStrings: {
              [DatabaseType.PUBMED]: '(machine learning[Title/Abstract] OR deep learning[Title/Abstract] OR neural networks[Title/Abstract]) OR (Machine Learning[MeSH Terms] OR Neural Networks, Computer[MeSH Terms])',
              [DatabaseType.ELSEVIER]: 'TITLE-ABS-KEY(machine learning OR deep learning OR neural networks)',
              [DatabaseType.WILEY]: 'title:machine learning OR abstract:machine learning OR title:deep learning OR abstract:deep learning OR title:neural networks OR abstract:neural networks',
              [DatabaseType.TAYLOR_FRANCIS]: 'title:machine learning OR abstract:machine learning OR title:deep learning OR abstract:deep learning OR title:neural networks OR abstract:neural networks',
            },
          },
        }),
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (processId) {
      await prisma.processAuthor.deleteMany({
        where: { processId },
      });
      await prisma.process.delete({
        where: { id: processId },
      });
    }
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({
      where: { id: userId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/processes/:id/search', () => {
    it('should initiate database search successfully', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Database search initiated');
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.searchTerms).toHaveProperty('keywordCount');
      expect(response.body.data.searchTerms).toHaveProperty('meshTermCount');
      expect(response.body.data.searchTerms).toHaveProperty('databases');
      expect(Array.isArray(response.body.data.searchTerms.databases)).toBe(true);
    });

    it('should return 404 for non-existent process', async () => {
      const fakeProcessId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .post(`/api/processes/${fakeProcessId}/search`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .post('/api/processes/invalid-id/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when keyword enhancement is missing', async () => {
      // Create a process without keyword enhancement
      const processResponse = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Process Without Keywords',
        });

      const newProcessId = processResponse.body.data.id;

      try {
        const response = await request(app)
          .post(`/api/processes/${newProcessId}/search`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('Keyword enhancement must be completed');
      } finally {
        // Clean up
        await prisma.process.delete({
          where: { id: newProcessId },
        });
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('GET /api/processes/:id/search/status', () => {
    it('should return search status after initiating search', async () => {
      // First initiate the search
      await request(app)
        .post(`/api/processes/${processId}/search`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Then check the status
      const response = await request(app)
        .get(`/api/processes/${processId}/search/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('processId', processId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('startTime');
      expect(response.body.data).toHaveProperty('databases');
      expect(Array.isArray(response.body.data.databases)).toBe(true);

      // Check database progress structure
      if (response.body.data.databases.length > 0) {
        const dbProgress = response.body.data.databases[0];
        expect(dbProgress).toHaveProperty('database');
        expect(dbProgress).toHaveProperty('status');
        expect(dbProgress).toHaveProperty('progress');
        expect(dbProgress).toHaveProperty('authorsFound');
        expect(dbProgress).toHaveProperty('startTime');
      }
    });

    it('should return 404 when no search has been initiated', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/search/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('No search found');
    });

    it('should return 404 for non-existent process', async () => {
      const fakeProcessId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/processes/${fakeProcessId}/search/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/search/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/search/status`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Search workflow integration', () => {
    it('should update process status during search lifecycle', async () => {
      // Check initial status
      let processResponse = await request(app)
        .get(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(processResponse.body.data.status).toBe(ProcessStatus.CREATED);

      // Initiate search
      await request(app)
        .post(`/api/processes/${processId}/search`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check that process status was updated to SEARCHING
      processResponse = await request(app)
        .get(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(processResponse.body.data.status).toBe(ProcessStatus.SEARCHING);
      expect(processResponse.body.data.currentStep).toBe(ProcessStep.DATABASE_SEARCH);
    });
  });
});