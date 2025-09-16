import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';
import { AuthorRole, ProcessStatus, ProcessStep } from '../../types';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Manual Reviewer Search Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let processId: string;

  beforeAll(async () => {
    // Clean up database
    await prisma.activityLog.deleteMany();
    await prisma.processAuthor.deleteMany();
    await prisma.authorAffiliation.deleteMany();
    await prisma.author.deleteMany();
    await prisma.affiliation.deleteMany();
    await prisma.process.deleteMany();
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
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test process
    const process = await prisma.process.create({
      data: {
        userId: user.id,
        title: 'Test Process for Manual Search',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.MANUAL_SEARCH,
      },
    });
    processId = process.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.activityLog.deleteMany();
    await prisma.processAuthor.deleteMany();
    await prisma.authorAffiliation.deleteMany();
    await prisma.author.deleteMany();
    await prisma.affiliation.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/processes/:id/search/manual/name', () => {
    it('should search reviewers by name successfully', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/name`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Smith',
          databases: ['pubmed'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authors');
      expect(response.body.data).toHaveProperty('searchTerm', 'John Smith');
      expect(response.body.data).toHaveProperty('totalFound');
      expect(Array.isArray(response.body.data.authors)).toBe(true);
    });

    it('should return suggestions when no results found', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/name`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Nonexistent Author Name',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalFound).toBe(0);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should validate name parameter', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/name`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A', // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/processes/${processId}/search/manual/name`)
        .send({
          name: 'John Smith',
        })
        .expect(401);
    });

    it('should validate process ownership', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: 'hashedpassword',
        },
      });

      const otherUserToken = jwt.sign(
        { userId: otherUser.id, email: otherUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/name`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          name: 'John Smith',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('POST /api/processes/:id/search/manual/email', () => {
    it('should search reviewers by email successfully', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'john.smith@university.edu',
          databases: ['pubmed'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authors');
      expect(response.body.data).toHaveProperty('searchTerm', 'john.smith@university.edu');
      expect(response.body.data).toHaveProperty('totalFound');
      expect(Array.isArray(response.body.data.authors)).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return suggestions when no results found', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/search/manual/email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'nonexistent@nowhere.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalFound).toBe(0);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });
  });

  describe('POST /api/processes/:id/reviewers/add', () => {
    const mockAuthor = {
      id: 'test-author-1',
      name: 'Dr. Jane Doe',
      email: 'jane.doe@research.org',
      affiliations: [
        {
          id: 'test-affiliation-1',
          institutionName: 'Research Institute',
          department: 'Biology',
          address: '456 Research Blvd',
          country: 'USA',
        },
      ],
      publicationCount: 75,
      clinicalTrials: 10,
      retractions: 0,
      researchAreas: ['Biology', 'Genetics'],
      meshTerms: ['DNA', 'Genetics'],
    };

    it('should add manual reviewer successfully', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/reviewers/add`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAuthor)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('successfully');
      expect(response.body.data.authorName).toBe('Dr. Jane Doe');

      // Verify the reviewer was added to the database
      const processAuthors = await prisma.processAuthor.findMany({
        where: {
          processId,
          role: AuthorRole.CANDIDATE,
        },
        include: {
          author: true,
        },
      });

      expect(processAuthors.length).toBeGreaterThan(0);
      const addedAuthor = processAuthors.find(pa => pa.author.name === 'Dr. Jane Doe');
      expect(addedAuthor).toBeDefined();
    });

    it('should validate author data', async () => {
      const invalidAuthor = {
        id: 'test-author-2',
        name: 'A', // Too short
        email: 'invalid-email',
      };

      const response = await request(app)
        .post(`/api/processes/${processId}/reviewers/add`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAuthor)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should not add duplicate reviewers', async () => {
      // Add the same reviewer again
      const response = await request(app)
        .post(`/api/processes/${processId}/reviewers/add`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAuthor)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify only one instance exists
      const processAuthors = await prisma.processAuthor.findMany({
        where: {
          processId,
          role: AuthorRole.CANDIDATE,
        },
        include: {
          author: true,
        },
      });

      const janeDoeCandidates = processAuthors.filter(pa => pa.author.name === 'Dr. Jane Doe');
      expect(janeDoeCandidates.length).toBe(1);
    });
  });

  describe('DELETE /api/processes/:id/reviewers/:authorId', () => {
    let authorId: string;

    beforeAll(async () => {
      // Find the author we added in previous tests
      const processAuthor = await prisma.processAuthor.findFirst({
        where: {
          processId,
          role: AuthorRole.CANDIDATE,
        },
        include: {
          author: true,
        },
      });

      if (processAuthor) {
        authorId = processAuthor.authorId;
      }
    });

    it('should remove manual reviewer successfully', async () => {
      if (!authorId) {
        // Add a reviewer first
        const mockAuthor = {
          id: 'test-author-remove',
          name: 'Dr. Remove Me',
          email: 'remove@test.com',
          affiliations: [],
          publicationCount: 10,
          clinicalTrials: 0,
          retractions: 0,
          researchAreas: [],
          meshTerms: [],
        };

        await request(app)
          .post(`/api/processes/${processId}/reviewers/add`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(mockAuthor);

        const processAuthor = await prisma.processAuthor.findFirst({
          where: {
            processId,
            role: AuthorRole.CANDIDATE,
          },
          include: {
            author: {
              where: {
                name: 'Dr. Remove Me',
              },
            },
          },
        });

        authorId = processAuthor!.authorId;
      }

      const response = await request(app)
        .delete(`/api/processes/${processId}/reviewers/${authorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('successfully');

      // Verify the reviewer was removed
      const processAuthor = await prisma.processAuthor.findFirst({
        where: {
          processId,
          authorId,
        },
      });

      expect(processAuthor).toBeNull();
    });

    it('should validate author ID format', async () => {
      const response = await request(app)
        .delete(`/api/processes/${processId}/reviewers/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent reviewer', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/processes/${processId}/reviewers/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/processes/:id/candidates', () => {
    beforeAll(async () => {
      // Add a test candidate
      const mockAuthor = {
        id: 'test-candidate-1',
        name: 'Dr. Test Candidate',
        email: 'candidate@test.com',
        affiliations: [
          {
            id: 'test-affiliation-candidate',
            institutionName: 'Test University',
            department: 'Test Department',
            address: '123 Test St',
            country: 'USA',
          },
        ],
        publicationCount: 20,
        clinicalTrials: 2,
        retractions: 0,
        researchAreas: ['Testing'],
        meshTerms: ['Test'],
      };

      await request(app)
        .post(`/api/processes/${processId}/reviewers/add`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAuthor);
    });

    it('should get candidate reviewers successfully', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const candidate = response.body.data[0];
      expect(candidate).toHaveProperty('id');
      expect(candidate).toHaveProperty('name');
      expect(candidate).toHaveProperty('email');
      expect(candidate).toHaveProperty('affiliations');
      expect(candidate).toHaveProperty('publicationCount');
      expect(candidate).toHaveProperty('role', AuthorRole.CANDIDATE);
    });

    it('should filter candidates by role', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/candidates?role=${AuthorRole.CANDIDATE}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned candidates should have the CANDIDATE role
      response.body.data.forEach((candidate: any) => {
        expect(candidate.role).toBe(AuthorRole.CANDIDATE);
      });
    });

    it('should validate role parameter', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/candidates?role=INVALID_ROLE`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return empty array for process with no candidates', async () => {
      // Create a new process with no candidates
      const emptyProcess = await prisma.process.create({
        data: {
          userId,
          title: 'Empty Process',
          status: ProcessStatus.CREATED,
          currentStep: ProcessStep.MANUAL_SEARCH,
        },
      });

      const response = await request(app)
        .get(`/api/processes/${emptyProcess.id}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);

      // Clean up
      await prisma.process.delete({ where: { id: emptyProcess.id } });
    });
  });
});