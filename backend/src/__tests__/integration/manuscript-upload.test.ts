import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { ProcessStatus, ProcessStep } from '../../types';

const prisma = new PrismaClient();

describe('Manuscript Upload Integration Tests', () => {
  let authToken: string;
  let processId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.processAuthor.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'testpassword123',
      });

    authToken = registerResponse.body.data.token;

    // Create test process
    const processResponse = await request(app)
      .post('/api/processes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Process for Upload',
      });

    processId = processResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.processAuthor.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/processes/:id/upload', () => {
    it('should successfully upload and process a valid manuscript', async () => {
      // Create a mock PDF content
      const mockPdfContent = Buffer.from(`
        Title: Machine Learning Applications in Healthcare
        
        Authors: Dr. John Smith, Dr. Jane Doe
        
        Affiliations:
        1. University of Technology, Computer Science Department, New York, USA
        2. Medical Research Institute, AI Lab, California, USA
        
        Abstract: This paper presents a comprehensive study on machine learning applications in healthcare. We explore various algorithms including neural networks, support vector machines, and decision trees. The research demonstrates significant improvements in diagnostic accuracy and treatment recommendations. Our findings suggest that machine learning can revolutionize healthcare delivery and patient outcomes.
        
        Keywords: machine learning, healthcare, artificial intelligence, medical diagnosis, neural networks
        
        Introduction: Machine learning has emerged as a transformative technology in healthcare...
      `);

      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', mockPdfContent, {
          filename: 'test-manuscript.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('processingTime');
      expect(response.body.data).toHaveProperty('fileName', 'test-manuscript.pdf');

      const metadata = response.body.data.metadata;
      expect(metadata.title).toContain('Machine Learning Applications');
      expect(metadata.authors).toHaveLength(2);
      expect(metadata.authors[0].name).toBe('Dr. John Smith');
      expect(metadata.authors[1].name).toBe('Dr. Jane Doe');
      expect(metadata.abstract).toContain('comprehensive study');
      expect(metadata.keywords).toContain('machine learning');
      expect(metadata.primaryFocusAreas).toHaveLength(5);

      // Verify process was updated
      const processResponse = await request(app)
        .get(`/api/processes/${processId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(processResponse.body.data.currentStep).toBe(ProcessStep.METADATA_EXTRACTION);
      expect(processResponse.body.data.status).toBe(ProcessStatus.COMPLETED);
      expect(processResponse.body.data.metadata.manuscriptTitle).toContain('Machine Learning Applications');
    });

    it('should reject files that are too large', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB

      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', largeBuffer, {
          filename: 'large-file.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('FILE_UPLOAD_ERROR');
      expect(response.body.error.message).toContain('File size exceeds');
    });

    it('should reject unsupported file types', async () => {
      const textBuffer = Buffer.from('This is a text file');

      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', textBuffer, {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('FILE_VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid file type');
    });

    it('should reject requests without file', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('No file uploaded');
    });

    it('should reject requests with invalid process ID', async () => {
      const mockPdfContent = Buffer.from('PDF content');

      const response = await request(app)
        .post('/api/processes/invalid-id/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', mockPdfContent, {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid process ID');
    });

    it('should reject requests for non-existent process', async () => {
      const mockPdfContent = Buffer.from('PDF content');
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .post(`/api/processes/${nonExistentId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', mockPdfContent, {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Process not found');
    });

    it('should reject unauthorized requests', async () => {
      const mockPdfContent = Buffer.from('PDF content');

      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .attach('manuscript', mockPdfContent, {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(401);
    });

    it('should handle multiple file upload attempts', async () => {
      const mockPdfContent = Buffer.from('PDF content');

      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', mockPdfContent, { filename: 'test1.pdf', contentType: 'application/pdf' })
        .attach('manuscript', mockPdfContent, { filename: 'test2.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('FILE_UPLOAD_ERROR');
      expect(response.body.error.message).toContain('Too many files');
    });

    it('should handle wrong field name', async () => {
      const mockPdfContent = Buffer.from('PDF content');

      const response = await request(app)
        .post(`/api/processes/${processId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', mockPdfContent, {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('FILE_UPLOAD_ERROR');
      expect(response.body.error.message).toContain('Unexpected file field');
    });
  });

  describe('GET /api/processes/:id/metadata', () => {
    let processWithMetadata: string;

    beforeAll(async () => {
      // Create a process with metadata
      const processResponse = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Process with Metadata',
        });

      processWithMetadata = processResponse.body.data.id;

      // Upload a manuscript to generate metadata
      const mockPdfContent = Buffer.from(`
        Title: Advanced AI Techniques
        Authors: Dr. Alice Johnson
        Abstract: This research explores advanced artificial intelligence techniques for solving complex problems.
        Keywords: artificial intelligence, machine learning, deep learning
      `);

      await request(app)
        .post(`/api/processes/${processWithMetadata}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', mockPdfContent, {
          filename: 'ai-research.pdf',
          contentType: 'application/pdf',
        });
    });

    it('should retrieve extracted metadata', async () => {
      const response = await request(app)
        .get(`/api/processes/${processWithMetadata}/metadata`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('authors');
      expect(response.body.data).toHaveProperty('abstract');
      expect(response.body.data).toHaveProperty('keywords');
      expect(response.body.data.title).toContain('Advanced AI Techniques');
    });

    it('should return 404 for process without metadata', async () => {
      // Create a new process without uploading a manuscript
      const processResponse = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Empty Process',
        });

      const emptyProcessId = processResponse.body.data.id;

      const response = await request(app)
        .get(`/api/processes/${emptyProcessId}/metadata`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/processes/:id/metadata', () => {
    let processWithMetadata: string;

    beforeAll(async () => {
      // Create a process with metadata
      const processResponse = await request(app)
        .post('/api/processes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Process for Metadata Update',
        });

      processWithMetadata = processResponse.body.data.id;

      // Upload a manuscript to generate metadata
      const mockPdfContent = Buffer.from(`
        Title: Original Title
        Authors: Dr. Original Author
        Abstract: Original abstract content.
        Keywords: original, keywords
      `);

      await request(app)
        .post(`/api/processes/${processWithMetadata}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manuscript', mockPdfContent, {
          filename: 'original.pdf',
          contentType: 'application/pdf',
        });
    });

    it('should update manuscript metadata', async () => {
      const updatedMetadata = {
        title: 'Updated Research Title',
        authors: [
          {
            id: 'temp-author-1',
            name: 'Dr. Updated Author',
            email: 'updated@example.com',
            affiliations: [],
            publicationCount: 10,
            clinicalTrials: 2,
            retractions: 0,
            researchAreas: ['AI', 'ML'],
            meshTerms: ['Artificial Intelligence']
          }
        ],
        affiliations: [
          {
            id: 'temp-affiliation-1',
            institutionName: 'Updated University',
            department: 'Computer Science',
            address: '123 Updated St, City, State',
            country: 'USA'
          }
        ],
        abstract: 'This is the updated abstract with more detailed information about the research.',
        keywords: ['updated', 'keywords', 'artificial intelligence'],
        primaryFocusAreas: ['AI', 'Machine Learning', 'Research'],
        secondaryFocusAreas: ['Data Science', 'Algorithms']
      };

      const response = await request(app)
        .put(`/api/processes/${processWithMetadata}/metadata`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedMetadata);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Research Title');

      // Verify the metadata was actually updated
      const getResponse = await request(app)
        .get(`/api/processes/${processWithMetadata}/metadata`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.data.title).toBe('Updated Research Title');
      expect(getResponse.body.data.authors[0].name).toBe('Dr. Updated Author');
      expect(getResponse.body.data.abstract).toContain('updated abstract');
    });

    it('should validate metadata format', async () => {
      const invalidMetadata = {
        title: '', // Invalid: empty title
        authors: [], // Invalid: no authors
        affiliations: [],
        abstract: '',
        keywords: [],
        primaryFocusAreas: []
      };

      const response = await request(app)
        .put(`/api/processes/${processWithMetadata}/metadata`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMetadata);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const validMetadata = {
        title: 'Test Title',
        authors: [
          {
            id: 'temp-author-1',
            name: 'Test Author',
            affiliations: [],
            publicationCount: 0,
            clinicalTrials: 0,
            retractions: 0,
            researchAreas: [],
            meshTerms: []
          }
        ],
        affiliations: [],
        abstract: 'Test abstract',
        keywords: ['test'],
        primaryFocusAreas: ['test']
      };

      const response = await request(app)
        .put(`/api/processes/${nonExistentId}/metadata`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validMetadata);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });
});