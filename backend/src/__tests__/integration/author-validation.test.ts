import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';
import { AuthService } from '../../services/AuthService';
import { ProcessService } from '../../services/ProcessService';
import { 
  ProcessStatus, 
  ProcessStep, 
  ManuscriptMetadata,
  Affiliation
} from '../../types';

const prisma = new PrismaClient();

describe('Author Validation Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let processId: string;
  let authService: AuthService;
  let processService: ProcessService;

  const testUser = {
    email: 'validation.test@example.com',
    password: 'testpassword123'
  };

  const mockAffiliation: Affiliation = {
    id: 'aff-test-1',
    institutionName: 'Test University',
    department: 'Computer Science',
    address: '123 Test St, Test City',
    country: 'Test Country'
  };

  const mockManuscriptMetadata: ManuscriptMetadata = {
    title: 'Test Manuscript for Validation',
    authors: [{
      id: 'manuscript-author-1',
      name: 'John Manuscript',
      email: 'john.manuscript@test.edu',
      affiliations: [mockAffiliation],
      publicationCount: 20,
      clinicalTrials: 5,
      retractions: 0,
      researchAreas: ['Machine Learning', 'AI'],
      meshTerms: ['Artificial Intelligence', 'Machine Learning']
    }],
    affiliations: [mockAffiliation],
    abstract: 'This is a test manuscript abstract for validation testing.',
    keywords: ['AI', 'ML', 'Testing'],
    primaryFocusAreas: ['Artificial Intelligence'],
    secondaryFocusAreas: ['Machine Learning', 'Testing']
  };

  beforeAll(async () => {
    authService = new AuthService(prisma);
    processService = new ProcessService(prisma);

    // Clean up any existing test data
    await prisma.processAuthor.deleteMany({
      where: { process: { user: { email: testUser.email } } }
    });
    await prisma.process.deleteMany({
      where: { user: { email: testUser.email } }
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });

    // Create test user
    const user = await authService.register(testUser.email, testUser.password);
    userId = user.user.id;

    // Login to get token
    const loginResult = await authService.login(testUser.email, testUser.password);
    authToken = loginResult.token;

    // Create test process
    const process = await processService.createProcess({
      userId,
      title: 'Validation Test Process'
    });
    processId = process.id;

    // Store manuscript metadata
    await processService.storeManuscriptMetadata(
      processId,
      userId,
      mockManuscriptMetadata,
      'test-manuscript.pdf'
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.processAuthor.deleteMany({
      where: { process: { user: { email: testUser.email } } }
    });
    await prisma.process.deleteMany({
      where: { user: { email: testUser.email } }
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up process authors before each test
    await prisma.processAuthor.deleteMany({
      where: { processId }
    });
  });

  describe('POST /api/processes/:id/validate', () => {
    it('should validate authors with default configuration', async () => {
      // Add some candidate authors
      const candidateAuthors = [
        {
          name: 'Valid Candidate',
          email: 'valid.candidate@other.edu',
          publicationCount: 10,
          clinicalTrials: 2,
          retractions: 0,
          researchAreas: ['Computer Vision', 'Deep Learning'],
          meshTerms: ['Computer Vision', 'Neural Networks'],
          affiliations: [{
            institutionName: 'Other University',
            department: 'Engineering',
            address: '456 Other St',
            country: 'Other Country'
          }]
        },
        {
          name: 'Low Publication Candidate',
          email: 'low.pub@another.edu',
          publicationCount: 2, // Below default minimum of 5
          clinicalTrials: 0,
          retractions: 0,
          researchAreas: ['Statistics'],
          meshTerms: ['Statistics'],
          affiliations: [{
            institutionName: 'Another University',
            department: 'Statistics',
            address: '789 Another St',
            country: 'Another Country'
          }]
        }
      ];

      // Add candidates to the process
      for (const candidate of candidateAuthors) {
        await processService.addCandidateAuthor(processId, candidate);
      }

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.totalCandidates).toBe(2);
      expect(response.body.data.validatedCandidates).toBe(1); // Only one should pass
      expect(response.body.data.validationResults).toHaveLength(2);

      // Check that the valid candidate passed
      const validResult = response.body.data.validationResults.find(
        (r: any) => r.author.name === 'Valid Candidate'
      );
      expect(validResult.passed).toBe(true);
      expect(validResult.conflicts).toHaveLength(0);

      // Check that the low publication candidate failed
      const invalidResult = response.body.data.validationResults.find(
        (r: any) => r.author.name === 'Low Publication Candidate'
      );
      expect(invalidResult.passed).toBe(false);
      expect(invalidResult.validationSteps.some((step: any) => 
        step.stepName === 'Publication Threshold Check' && !step.passed
      )).toBe(true);
    });

    it('should validate authors with custom configuration', async () => {
      // Add a candidate with moderate publications
      const candidate = {
        name: 'Moderate Candidate',
        email: 'moderate@test.edu',
        publicationCount: 7,
        clinicalTrials: 1,
        retractions: 0,
        researchAreas: ['Data Science'],
        meshTerms: ['Data Science'],
        affiliations: [{
          institutionName: 'Moderate University',
          department: 'Data Science',
          address: '321 Moderate St',
          country: 'Moderate Country'
        }]
      };

      await processService.addCandidateAuthor(processId, candidate);

      // Use custom config with higher minimum publications
      const customConfig = {
        minPublications: 10,
        maxRetractions: 0,
        checkInstitutionalConflicts: false,
        checkCoAuthorConflicts: false
      };

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(customConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validatedCandidates).toBe(0); // Should fail with higher threshold
      
      const result = response.body.data.validationResults[0];
      expect(result.passed).toBe(false);
      expect(result.validationSteps.some((step: any) => 
        step.stepName === 'Publication Threshold Check' && !step.passed
      )).toBe(true);
    });

    it('should detect manuscript author conflicts', async () => {
      // Add the manuscript author as a candidate (should be rejected)
      const manuscriptAuthorAsCandidate = {
        name: 'John Manuscript', // Same name as manuscript author
        email: 'john.manuscript@test.edu', // Same email
        publicationCount: 20,
        clinicalTrials: 5,
        retractions: 0,
        researchAreas: ['Machine Learning', 'AI'],
        meshTerms: ['Artificial Intelligence', 'Machine Learning'],
        affiliations: [mockAffiliation]
      };

      await processService.addCandidateAuthor(processId, manuscriptAuthorAsCandidate);

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validatedCandidates).toBe(0);
      
      const result = response.body.data.validationResults[0];
      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain('manuscript_author');
      expect(result.validationSteps.some((step: any) => 
        step.stepName === 'Manuscript Author Check' && !step.passed
      )).toBe(true);
    });

    it('should detect institutional conflicts', async () => {
      // Add a candidate from the same institution as manuscript author
      const sameInstitutionCandidate = {
        name: 'Same Institution Candidate',
        email: 'same.inst@test.edu',
        publicationCount: 15,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: ['Different Field'],
        meshTerms: ['Different Field'],
        affiliations: [mockAffiliation] // Same affiliation as manuscript author
      };

      await processService.addCandidateAuthor(processId, sameInstitutionCandidate);

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validatedCandidates).toBe(0);
      
      const result = response.body.data.validationResults[0];
      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain('institutional');
      expect(result.validationSteps.some((step: any) => 
        step.stepName === 'Institutional Conflict Check' && !step.passed
      )).toBe(true);
    });

    it('should handle retraction conflicts', async () => {
      // Add a candidate with retractions
      const retractionCandidate = {
        name: 'Retraction Candidate',
        email: 'retraction@test.edu',
        publicationCount: 20,
        clinicalTrials: 5,
        retractions: 2, // Has retractions
        researchAreas: ['Controversial Field'],
        meshTerms: ['Controversial Field'],
        affiliations: [{
          institutionName: 'Retraction University',
          department: 'Controversial Department',
          address: '999 Retraction St',
          country: 'Retraction Country'
        }]
      };

      await processService.addCandidateAuthor(processId, retractionCandidate);

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validatedCandidates).toBe(0);
      
      const result = response.body.data.validationResults[0];
      expect(result.passed).toBe(false);
      expect(result.retractionFlags).toHaveLength(2);
      expect(result.validationSteps.some((step: any) => 
        step.stepName === 'Retraction Check' && !step.passed
      )).toBe(true);
    });

    it('should return 404 for non-existent process', async () => {
      const fakeProcessId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .post(`/api/processes/${fakeProcessId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .post('/api/processes/invalid-id/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid validation configuration', async () => {
      const invalidConfig = {
        minPublications: -1, // Invalid negative value
        maxRetractions: 'invalid' // Invalid type
      };

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update process status during validation', async () => {
      // Add a candidate
      const candidate = {
        name: 'Status Test Candidate',
        email: 'status@test.edu',
        publicationCount: 10,
        clinicalTrials: 2,
        retractions: 0,
        researchAreas: ['Status Testing'],
        meshTerms: ['Status Testing'],
        affiliations: [{
          institutionName: 'Status University',
          department: 'Testing',
          address: '123 Status St',
          country: 'Status Country'
        }]
      };

      await processService.addCandidateAuthor(processId, candidate);

      const response = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that process status was updated
      const updatedProcess = await processService.getProcessById(processId, userId);
      expect(updatedProcess?.currentStep).toBe(ProcessStep.VALIDATION);
      expect(updatedProcess?.status).toBe(ProcessStatus.COMPLETED);
    });
  });

  describe('GET /api/processes/:id/validation/results', () => {
    it('should retrieve validation results after validation', async () => {
      // Add and validate a candidate
      const candidate = {
        name: 'Results Test Candidate',
        email: 'results@test.edu',
        publicationCount: 12,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: ['Results Testing'],
        meshTerms: ['Results Testing'],
        affiliations: [{
          institutionName: 'Results University',
          department: 'Testing',
          address: '456 Results St',
          country: 'Results Country'
        }]
      };

      await processService.addCandidateAuthor(processId, candidate);

      // Run validation first
      await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get validation results
      const response = await request(app)
        .get(`/api/processes/${processId}/validation/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.totalResults).toBe(1);
      expect(response.body.data.validatedAuthors).toBe(1);
      expect(response.body.data.results).toHaveLength(1);

      const result = response.body.data.results[0];
      expect(result.author.name).toBe('Results Test Candidate');
      expect(result.passed).toBe(true);
      expect(result.validationSteps).toBeDefined();
      expect(Array.isArray(result.validationSteps)).toBe(true);
    });

    it('should return empty results for process without validation', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/validation/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalResults).toBe(0);
      expect(response.body.data.validatedAuthors).toBe(0);
      expect(response.body.data.results).toHaveLength(0);
    });

    it('should return 404 for non-existent process', async () => {
      const fakeProcessId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/processes/${fakeProcessId}/validation/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/validation/results`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation workflow integration', () => {
    it('should complete full validation workflow', async () => {
      // Add multiple candidates with different validation outcomes
      const candidates = [
        {
          name: 'Perfect Candidate',
          email: 'perfect@external.edu',
          publicationCount: 25,
          clinicalTrials: 8,
          retractions: 0,
          researchAreas: ['Unrelated Field'],
          meshTerms: ['Unrelated Field'],
          affiliations: [{
            institutionName: 'External University',
            department: 'Unrelated Department',
            address: '111 External St',
            country: 'External Country'
          }]
        },
        {
          name: 'Manuscript Author Clone',
          email: 'john.manuscript@test.edu', // Same as manuscript author
          publicationCount: 20,
          clinicalTrials: 5,
          retractions: 0,
          researchAreas: ['Machine Learning'],
          meshTerms: ['Machine Learning'],
          affiliations: [mockAffiliation]
        },
        {
          name: 'Low Publications',
          email: 'low@external.edu',
          publicationCount: 3, // Below threshold
          clinicalTrials: 1,
          retractions: 0,
          researchAreas: ['Some Field'],
          meshTerms: ['Some Field'],
          affiliations: [{
            institutionName: 'Low Pub University',
            department: 'Some Department',
            address: '222 Low St',
            country: 'Low Country'
          }]
        }
      ];

      // Add all candidates
      for (const candidate of candidates) {
        await processService.addCandidateAuthor(processId, candidate);
      }

      // Run validation
      const validationResponse = await request(app)
        .post(`/api/processes/${processId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(validationResponse.body.data.totalCandidates).toBe(3);
      expect(validationResponse.body.data.validatedCandidates).toBe(1); // Only perfect candidate should pass

      // Get detailed results
      const resultsResponse = await request(app)
        .get(`/api/processes/${processId}/validation/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const results = resultsResponse.body.data.results;
      
      // Perfect candidate should pass
      const perfectResult = results.find((r: any) => r.author.name === 'Perfect Candidate');
      expect(perfectResult.passed).toBe(true);
      expect(perfectResult.conflicts).toHaveLength(0);

      // Manuscript author clone should fail
      const cloneResult = results.find((r: any) => r.author.name === 'Manuscript Author Clone');
      expect(cloneResult.passed).toBe(false);
      expect(cloneResult.conflicts).toContain('manuscript_author');

      // Low publications candidate should fail
      const lowPubResult = results.find((r: any) => r.author.name === 'Low Publications');
      expect(lowPubResult.passed).toBe(false);
      expect(lowPubResult.validationSteps.some((step: any) => 
        step.stepName === 'Publication Threshold Check' && !step.passed
      )).toBe(true);
    });
  });
});