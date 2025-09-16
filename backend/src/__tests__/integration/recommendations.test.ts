import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { ProcessService } from '../../services/ProcessService';
import { ProcessStatus, ProcessStep, AuthorRole, ConflictType } from '../../types';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const processService = new ProcessService(prisma);

describe('Recommendation System Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let processId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.processAuthor.deleteMany({});
    await prisma.authorAffiliation.deleteMany({});
    await prisma.author.deleteMany({});
    await prisma.affiliation.deleteMany({});
    await prisma.process.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      },
    });

    userId = testUser.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Create a test process
    const process = await processService.createProcess(userId, {
      title: 'Test Manuscript for Recommendations',
    });
    processId = process.id;

    // Update process to validation step
    await processService.updateProcessStep(
      processId,
      userId,
      ProcessStep.VALIDATION,
      ProcessStatus.COMPLETED
    );

    // Add test candidate authors with different characteristics
    await addTestCandidates();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.processAuthor.deleteMany({});
    await prisma.authorAffiliation.deleteMany({});
    await prisma.author.deleteMany({});
    await prisma.affiliation.deleteMany({});
    await prisma.process.deleteMany({});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/processes/:id/candidates', () => {
    it('should return all validated candidates', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.candidates).toHaveLength(5);
      expect(response.body.data.candidates[0]).toHaveProperty('id');
      expect(response.body.data.candidates[0]).toHaveProperty('name');
      expect(response.body.data.candidates[0]).toHaveProperty('publicationCount');
      expect(response.body.data.candidates[0]).toHaveProperty('relevanceScore');
      expect(response.body.data.candidates[0]).toHaveProperty('primaryAffiliation');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/processes/${nonExistentId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/candidates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/processes/:id/recommendations', () => {
    it('should return filtered and sorted recommendations with default settings', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('candidates');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('filteredCount');
      expect(response.body.data).toHaveProperty('appliedFilters');
      expect(response.body.data.totalCount).toBe(5);
      expect(response.body.data.filteredCount).toBe(5);
    });

    it('should filter by minimum publications', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ minPublications: 15 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filteredCount).toBeLessThan(response.body.data.totalCount);
      
      // All returned candidates should have at least 15 publications
      response.body.data.candidates.forEach((candidate: any) => {
        expect(candidate.publicationCount).toBeGreaterThanOrEqual(15);
      });
    });

    it('should filter by maximum retractions', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ maxRetractions: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned candidates should have 0 retractions
      response.body.data.candidates.forEach((candidate: any) => {
        expect(candidate.retractions).toBe(0);
      });
    });

    it('should filter by countries', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ countries: ['United States', 'United Kingdom'] })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned candidates should be from specified countries
      response.body.data.candidates.forEach((candidate: any) => {
        const candidateCountries = candidate.affiliations.map((aff: any) => aff.country);
        expect(candidateCountries.some((country: string) => 
          ['United States', 'United Kingdom'].includes(country)
        )).toBe(true);
      });
    });

    it('should filter by institutions', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ institutions: ['Harvard University'] })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned candidates should be from specified institutions
      response.body.data.candidates.forEach((candidate: any) => {
        const candidateInstitutions = candidate.affiliations.map((aff: any) => aff.institutionName);
        expect(candidateInstitutions.some((inst: string) => 
          inst.toLowerCase().includes('harvard')
        )).toBe(true);
      });
    });

    it('should filter by research areas', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ researchAreas: ['Machine Learning'] })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned candidates should have matching research areas
      response.body.data.candidates.forEach((candidate: any) => {
        expect(candidate.researchAreas.some((area: string) => 
          area.toLowerCase().includes('machine learning')
        )).toBe(true);
      });
    });

    it('should filter by validation status', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ onlyValidated: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned candidates should be validated
      response.body.data.candidates.forEach((candidate: any) => {
        expect(candidate.validationResult?.passed).toBe(true);
      });
    });

    it('should exclude specific conflicts', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ excludeConflicts: ['institutional'] })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // No returned candidates should have institutional conflicts
      response.body.data.candidates.forEach((candidate: any) => {
        if (candidate.validationResult?.conflicts) {
          expect(candidate.validationResult.conflicts).not.toContain('institutional');
        }
      });
    });

    it('should sort by publication count ascending', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ sortBy: 'publicationCount', sortOrder: 'asc' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check that results are sorted by publication count ascending
      const candidates = response.body.data.candidates;
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i].publicationCount).toBeGreaterThanOrEqual(candidates[i - 1].publicationCount);
      }
    });

    it('should sort by name descending', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ sortBy: 'name', sortOrder: 'desc' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check that results are sorted by name descending
      const candidates = response.body.data.candidates;
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i].name.toLowerCase()).toBeLessThanOrEqual(candidates[i - 1].name.toLowerCase());
      }
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidates).toHaveLength(2);
      expect(response.body.data.totalCount).toBe(5);
      expect(response.body.data.filteredCount).toBe(5);
    });

    it('should provide suggestions when no results found', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ minPublications: 100 }) // Unrealistic threshold
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filteredCount).toBe(0);
      expect(response.body.data.suggestions).toBeDefined();
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      expect(response.body.data.suggestions[0]).toHaveProperty('type');
      expect(response.body.data.suggestions[0]).toHaveProperty('message');
      expect(response.body.data.suggestions[0]).toHaveProperty('suggestedFilter');
    });

    it('should combine multiple filters correctly', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations`)
        .query({ 
          minPublications: 10,
          maxRetractions: 1,
          countries: ['United States'],
          onlyValidated: true
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appliedFilters).toEqual({
        minPublications: 10,
        maxRetractions: 1,
        countries: ['United States'],
        onlyValidated: true
      });
      
      // Verify all filters are applied
      response.body.data.candidates.forEach((candidate: any) => {
        expect(candidate.publicationCount).toBeGreaterThanOrEqual(10);
        expect(candidate.retractions).toBeLessThanOrEqual(1);
        expect(candidate.validationResult?.passed).toBe(true);
        const candidateCountries = candidate.affiliations.map((aff: any) => aff.country);
        expect(candidateCountries).toContain('United States');
      });
    });
  });

  describe('GET /api/processes/:id/recommendations/filters', () => {
    it('should return available filter options', async () => {
      const response = await request(app)
        .get(`/api/processes/${processId}/recommendations/filters`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('countries');
      expect(response.body.data).toHaveProperty('institutions');
      expect(response.body.data).toHaveProperty('researchAreas');
      expect(response.body.data).toHaveProperty('publicationRange');
      expect(response.body.data).toHaveProperty('retractionRange');
      expect(response.body.data).toHaveProperty('clinicalTrialRange');
      
      expect(Array.isArray(response.body.data.countries)).toBe(true);
      expect(Array.isArray(response.body.data.institutions)).toBe(true);
      expect(Array.isArray(response.body.data.researchAreas)).toBe(true);
      
      expect(response.body.data.publicationRange).toHaveProperty('min');
      expect(response.body.data.publicationRange).toHaveProperty('max');
      expect(response.body.data.retractionRange).toHaveProperty('min');
      expect(response.body.data.retractionRange).toHaveProperty('max');
      expect(response.body.data.clinicalTrialRange).toHaveProperty('min');
      expect(response.body.data.clinicalTrialRange).toHaveProperty('max');
    });
  });

  // Helper function to add test candidates
  async function addTestCandidates() {
    const testCandidates = [
      {
        name: 'Dr. Alice Johnson',
        email: 'alice.johnson@harvard.edu',
        publicationCount: 25,
        clinicalTrials: 5,
        retractions: 0,
        researchAreas: ['Machine Learning', 'Data Science'],
        meshTerms: ['Algorithms', 'Neural Networks'],
        affiliations: [{
          institutionName: 'Harvard University',
          department: 'Computer Science',
          address: 'Cambridge, MA',
          country: 'United States'
        }],
        validationPassed: true,
        conflicts: []
      },
      {
        name: 'Prof. Bob Smith',
        email: 'bob.smith@oxford.ac.uk',
        publicationCount: 18,
        clinicalTrials: 2,
        retractions: 1,
        researchAreas: ['Artificial Intelligence', 'Robotics'],
        meshTerms: ['Machine Learning', 'Computer Vision'],
        affiliations: [{
          institutionName: 'Oxford University',
          department: 'Engineering Science',
          address: 'Oxford, UK',
          country: 'United Kingdom'
        }],
        validationPassed: false,
        conflicts: [ConflictType.INSTITUTIONAL]
      },
      {
        name: 'Dr. Carol Davis',
        email: 'carol.davis@mit.edu',
        publicationCount: 12,
        clinicalTrials: 8,
        retractions: 0,
        researchAreas: ['Biomedical Engineering', 'Machine Learning'],
        meshTerms: ['Medical Imaging', 'Deep Learning'],
        affiliations: [{
          institutionName: 'MIT',
          department: 'Biomedical Engineering',
          address: 'Cambridge, MA',
          country: 'United States'
        }],
        validationPassed: true,
        conflicts: []
      },
      {
        name: 'Prof. David Wilson',
        email: 'david.wilson@stanford.edu',
        publicationCount: 30,
        clinicalTrials: 1,
        retractions: 2,
        researchAreas: ['Computer Science', 'Statistics'],
        meshTerms: ['Statistical Learning', 'Data Mining'],
        affiliations: [{
          institutionName: 'Stanford University',
          department: 'Computer Science',
          address: 'Stanford, CA',
          country: 'United States'
        }],
        validationPassed: false,
        conflicts: [ConflictType.CO_AUTHOR]
      },
      {
        name: 'Dr. Emma Brown',
        email: 'emma.brown@cambridge.ac.uk',
        publicationCount: 8,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: ['Natural Language Processing', 'Linguistics'],
        meshTerms: ['Text Mining', 'Language Models'],
        affiliations: [{
          institutionName: 'Cambridge University',
          department: 'Computer Laboratory',
          address: 'Cambridge, UK',
          country: 'United Kingdom'
        }],
        validationPassed: true,
        conflicts: []
      }
    ];

    for (const candidateData of testCandidates) {
      // Create affiliation
      const affiliation = await prisma.affiliation.create({
        data: candidateData.affiliations[0]!
      });

      // Create author
      const author = await prisma.author.create({
        data: {
          name: candidateData.name,
          email: candidateData.email,
          publicationCount: candidateData.publicationCount,
          clinicalTrials: candidateData.clinicalTrials,
          retractions: candidateData.retractions,
          researchAreas: JSON.stringify(candidateData.researchAreas),
          meshTerms: JSON.stringify(candidateData.meshTerms),
        }
      });

      // Link author to affiliation
      await prisma.authorAffiliation.create({
        data: {
          authorId: author.id,
          affiliationId: affiliation.id
        }
      });

      // Link author to process as candidate
      const processAuthor = await prisma.processAuthor.create({
        data: {
          processId,
          authorId: author.id,
          role: AuthorRole.CANDIDATE,
        }
      });

      // Add validation status
      const validationStatus = {
        passed: candidateData.validationPassed,
        conflicts: candidateData.conflicts,
        retractionFlags: candidateData.retractions > 0 ? [{
          publicationTitle: 'Sample Retracted Paper',
          journal: 'Test Journal',
          retractionDate: new Date(),
          reason: 'Data integrity concerns'
        }] : [],
        publicationMetrics: {
          totalPublications: candidateData.publicationCount,
          recentPublications: Math.floor(candidateData.publicationCount * 0.3)
        },
        validatedAt: new Date().toISOString()
      };

      await prisma.processAuthor.update({
        where: { id: processAuthor.id },
        data: { validationStatus: JSON.stringify(validationStatus) }
      });
    }
  }
});