import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';
import { ProcessStatus, ProcessStep, AuthorRole } from '../../types';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Shortlist Simple Integration Tests', () => {
  let authToken: string;

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
        name: 'My Shortlist'
      });
      expect(response.body.data.authors).toHaveLength(1);
      expect(response.body.data.authors[0].name).toBe('Dr. Test Author');
    });
  });
});