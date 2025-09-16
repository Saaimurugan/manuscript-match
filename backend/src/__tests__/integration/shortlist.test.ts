import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';
import { ProcessStatus, ProcessStep, AuthorRole } from '../../types';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

describe('Shortlist Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let processId: string;
  let authorId: string;

  beforeAll(async () => {
    // Clean up database
    await prisma.activityLog.deleteMany();
    await prisma.processAuthor.deleteMany();
    await prisma.shortlist.deleteMany();
    await prisma.process.deleteMany();
    await prisma.authorAffiliation.deleteMany();
    await prisma.author.deleteMany();
    await prisma.affiliation.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });
    userId = user.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test process
    const testProcess = await prisma.process.create({
      data: {
        userId: user.id,
        title: 'Test Process',
        status: ProcessStatus.COMPLETED,
        currentStep: ProcessStep.SHORTLIST,
        metadata: JSON.stringify({
          manuscriptTitle: 'Test Manuscript',
          totalCandidates: 1,
          validatedCandidates: 1
        }),
      },
    });
    processId = testProcess.id;

    // Create test affiliation
    const affiliation = await prisma.affiliation.create({
      data: {
        institutionName: 'Test University',
        department: 'Computer Science',
        address: '123 Test Street',
        country: 'USA',
      },
    });

    // Create test author
    const author = await prisma.author.create({
      data: {
        name: 'Dr. Test Author',
        email: 'author@test.com',
        publicationCount: 25,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: JSON.stringify(['Machine Learning', 'AI']),
        meshTerms: JSON.stringify(['Artificial Intelligence', 'Computer Science']),
      },
    });
    authorId = author.id;

    // Link author to affiliation
    await prisma.authorAffiliation.create({
      data: {
        authorId: author.id,
        affiliationId: affiliation.id,
      },
    });

    // Add author to process as candidate
    await prisma.processAuthor.create({
      data: {
        processId: testProcess.id,
        authorId: author.id,
        role: AuthorRole.CANDIDATE,
        validationStatus: JSON.stringify({ passed: true, conflicts: [] }),
      },
    });
  });

  afterAll(async () => {
    // Clean up test files
    const exportDir = path.join(process.cwd(), 'exports');
    if (fs.existsSync(exportDir)) {
      const files = fs.readdirSync(exportDir);
      files.forEach(file => {
        if (file.startsWith('shortlist-')) {
          fs.unlinkSync(path.join(exportDir, file));
        }
      });
    }

    // Clean up database
    await prisma.activityLog.deleteMany();
    await prisma.processAuthor.deleteMany();
    await prisma.shortlist.deleteMany();
    await prisma.process.deleteMany();
    await prisma.authorAffiliation.deleteMany();
    await prisma.author.deleteMany();
    await prisma.affiliation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/processes/:id/shortlist', () => {
    it('should create a shortlist successfully', async () => {
      const shortlistData = {
        name: 'My Shortlist',
        authorIds: [authorId]
      };

      const response = await request(app)
        .post(`/api/processes/${processId}/shortlist`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(shortlistData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        processId,
        name: 'My Shortlist',
        authors: expect.arrayContaining([
          expect.objectContaining({
            id: authorId,
            name: 'Dr. Test Author'
          })
        ])
      });

      // Verify author role was updated
      const processAuthor = await prisma.processAuthor.findFirst({
        where: { processId, authorId }
      });
      expect(processAuthor?.role).toBe(AuthorRole.SHORTLISTED);
    });

    it('should return 400 for invalid process ID', async () => {
      const shortlistData = {
        name: 'My Shortlist',
        authorIds: [authorId]
      };

      const response = await request(app)
        .post('/api/processes/invalid-id/shortlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shortlistData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/shortlist`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentProcessId = '12345678-1234-1234-1234-123456789012';
      const shortlistData = {
        name: 'My Shortlist',
        authorIds: [authorId]
      };

      const response = await request(app)
        .post(`/api/processes/${nonExistentProcessId}/shortlist`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(shortlistData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const shortlistData = {
        name: 'My Shortlist',
        authorIds: [authorId]
      };

      await request(app)
        .post(`/api/processes/${processId}/shortlist`)
        .send(shortlistData)
        .expect(401);
    });
  });

  describe('GET /api/processes/:id/shortlists', () => {
    it('should get shortlists for process', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/shortlists`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toMatchObject({
        processId,
        name: expect.any(String),
        authors: expect.any(Array)
      });
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/shortlists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentProcessId = '12345678-1234-1234-1234-123456789012';

      const response = await request(app)
        .get(`/api/processes/${nonExistentProcessId}/shortlists`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/processes/${processId}/shortlists`)
        .expect(401);
    });
  });

  describe('GET /api/processes/:id/export/:format', () => {
    it('should export shortlist as CSV', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/export/csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="shortlist-.*\.csv"/);
    });

    it('should export shortlist as XLSX', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/export/xlsx`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="shortlist-.*\.xlsx"/);
    });

    it('should export shortlist as DOCX', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/export/docx`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="shortlist-.*\.docx"/);
    });

    it('should return 400 for invalid export format', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/export/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid export format');
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/export/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentProcessId = '12345678-1234-1234-1234-123456789012';

      const response = await request(app)
        .get(`/api/processes/${nonExistentProcessId}/export/csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/processes/${processId}/export/csv`)
        .expect(401);
    });
  });

  describe('Export with no shortlisted authors', () => {
    let emptyProcessId: string;

    beforeAll(async () => {
      // Create process with no shortlisted authors
      const emptyProcess = await prisma.process.create({
        data: {
          userId,
          title: 'Empty Process',
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.SHORTLIST,
          metadata: JSON.stringify({
            manuscriptTitle: 'Empty Manuscript',
            totalCandidates: 0,
            validatedCandidates: 0
          }),
        },
      });
      emptyProcessId = emptyProcess.id;
    });

    it('should return error when no shortlisted authors found', async () => {
      const response = await request(app)
        .get(`/api/processes/${emptyProcessId}/export/csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('EXPORT_ERROR');
      expect(response.body.error.message).toBe('No shortlisted authors found for export');
    });
  });
});