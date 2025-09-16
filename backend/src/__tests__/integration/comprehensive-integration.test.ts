import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestContext, createTestContext, PerformanceTracker } from '../../test/testUtils';
import { testUsers, testProcesses, testAuthors, testPerformanceThresholds } from '../../test/fixtures';

describe('Comprehensive Integration Tests', () => {
  let testContext: TestContext;
  let performanceTracker: PerformanceTracker;

  beforeEach(async () => {
    testContext = createTestContext();
    await testContext.setup();
    performanceTracker = new PerformanceTracker();
    performanceTracker.startTracking();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Complete Manuscript Processing Workflow', () => {
    it('should complete full workflow from upload to shortlist export', async () => {
      // Step 1: Create authenticated user
      const { token } = await testContext.createAuthenticatedUser(testUsers.regularUser.email);
      const authHeaders = testContext.getAuthHeaders(token);

      // Step 2: Create new process
      const startTime = Date.now();
      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: testProcesses.basicProcess.title })
        .expect(201);

      const processId = processResponse.body.data.id;
      performanceTracker.recordMetric(Date.now() - startTime);

      // Step 3: Upload manuscript
      const uploadStartTime = Date.now();
      const mockFile = Buffer.from('Mock PDF content for testing');
      
      await testContext.request
        .post(`/api/processes/${processId}/upload`)
        .set(authHeaders)
        .attach('manuscript', mockFile, 'test-manuscript.pdf')
        .expect(200);

      performanceTracker.recordMetric(Date.now() - uploadStartTime);

      // Step 4: Get extracted metadata
      const metadataResponse = await testContext.request
        .get(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .expect(200);

      expect(metadataResponse.body.data).toHaveProperty('title');
      expect(metadataResponse.body.data).toHaveProperty('authors');

      // Step 5: Update metadata if needed
      await testContext.request
        .put(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .send({
          title: 'Updated Manuscript Title',
          authors: testProcesses.basicProcess.metadata.authors,
          abstract: testProcesses.basicProcess.metadata.abstract,
          keywords: testProcesses.basicProcess.metadata.keywords
        })
        .expect(200);

      // Step 6: Generate enhanced keywords
      const keywordResponse = await testContext.request
        .post(`/api/processes/${processId}/keywords/enhance`)
        .set(authHeaders)
        .expect(200);

      expect(keywordResponse.body.data.enhancedKeywords).toBeInstanceOf(Array);
      expect(keywordResponse.body.data.searchStrings).toHaveProperty('pubmed');

      // Step 7: Initiate database search
      const searchStartTime = Date.now();
      await testContext.request
        .post(`/api/processes/${processId}/search`)
        .set(authHeaders)
        .send({
          keywords: testProcesses.basicProcess.metadata.keywords,
          databases: ['pubmed', 'elsevier']
        })
        .expect(202);

      performanceTracker.recordMetric(Date.now() - searchStartTime);

      // Step 8: Check search status
      let searchComplete = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!searchComplete && attempts < maxAttempts) {
        const statusResponse = await testContext.request
          .get(`/api/processes/${processId}/search/status`)
          .set(authHeaders)
          .expect(200);

        searchComplete = statusResponse.body.data.status === 'completed';
        attempts++;
        
        if (!searchComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(searchComplete).toBe(true);

      // Step 9: Run author validation
      const validationStartTime = Date.now();
      await testContext.request
        .post(`/api/processes/${processId}/validate`)
        .set(authHeaders)
        .send({
          rules: {
            minPublications: 5,
            maxRetractions: 1,
            excludeCoAuthors: true
          }
        })
        .expect(200);

      performanceTracker.recordMetric(Date.now() - validationStartTime);

      // Step 10: Get validated candidates
      const candidatesResponse = await testContext.request
        .get(`/api/processes/${processId}/candidates`)
        .set(authHeaders)
        .expect(200);

      expect(candidatesResponse.body.data).toBeInstanceOf(Array);

      // Step 11: Get filtered recommendations
      const recommendationsResponse = await testContext.request
        .get(`/api/processes/${processId}/recommendations`)
        .set(authHeaders)
        .query({
          minPublications: 10,
          maxRetractions: 0,
          sortBy: 'publicationCount',
          sortOrder: 'desc',
          limit: 20
        })
        .expect(200);

      expect(recommendationsResponse.body.data.recommendations).toBeInstanceOf(Array);
      expect(recommendationsResponse.body.data.pagination).toHaveProperty('total');

      // Step 12: Create shortlist
      const shortlistData = {
        name: 'Final Reviewer Shortlist',
        selectedAuthors: candidatesResponse.body.data.slice(0, 5).map((author: any) => author.id)
      };

      const shortlistResponse = await testContext.request
        .post(`/api/processes/${processId}/shortlist`)
        .set(authHeaders)
        .send(shortlistData)
        .expect(201);

      const shortlistId = shortlistResponse.body.data.id;

      // Step 13: Export shortlist in different formats
      const csvExportResponse = await testContext.request
        .get(`/api/processes/${processId}/export/csv`)
        .set(authHeaders)
        .query({ shortlistId })
        .expect(200);

      expect(csvExportResponse.headers['content-type']).toContain('text/csv');

      const xlsxExportResponse = await testContext.request
        .get(`/api/processes/${processId}/export/xlsx`)
        .set(authHeaders)
        .query({ shortlistId })
        .expect(200);

      expect(xlsxExportResponse.headers['content-type']).toContain('application/vnd.openxmlformats');

      // Step 14: Verify process completion
      const finalProcessResponse = await testContext.request
        .get(`/api/processes/${processId}`)
        .set(authHeaders)
        .expect(200);

      expect(finalProcessResponse.body.data.status).toBe('COMPLETED');

      // Performance assertions
      const avgResponseTime = performanceTracker.getAverageResponseTime();
      expect(avgResponseTime).toBeLessThan(testPerformanceThresholds.responseTime.slow);
    });

    it('should handle concurrent process creation', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        testContext.request
          .post('/api/processes')
          .set(authHeaders)
          .send({ title: `Concurrent Process ${i + 1}` })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('id');
      });

      // Verify all processes were created with unique IDs
      const processIds = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(processIds);
      expect(uniqueIds.size).toBe(processIds.length);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid file uploads gracefully', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Test Process' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Test invalid file format
      const invalidFile = Buffer.from('This is not a valid PDF or Word document');
      
      const uploadResponse = await testContext.request
        .post(`/api/processes/${processId}/upload`)
        .set(authHeaders)
        .attach('manuscript', invalidFile, 'invalid.txt')
        .expect(400);

      expect(uploadResponse.body.error.type).toBe('FILE_PROCESSING_ERROR');
      expect(uploadResponse.body.error.message).toContain('Unsupported file format');
    });

    it('should handle database connection failures', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      // Simulate database connection failure by disconnecting
      await testContext.prisma.$disconnect();

      const response = await testContext.request
        .get('/api/processes')
        .set(authHeaders)
        .expect(500);

      expect(response.body.error.type).toBe('DATABASE_CONNECTION_ERROR');

      // Reconnect for cleanup
      await testContext.prisma.$connect();
    });

    it('should handle external API failures with circuit breaker', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Test Process' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Mock external API failure
      const searchResponse = await testContext.request
        .post(`/api/processes/${processId}/search`)
        .set(authHeaders)
        .send({
          keywords: ['test'],
          databases: ['invalid_database']
        })
        .expect(400);

      expect(searchResponse.body.error.type).toBe('EXTERNAL_API_ERROR');
    });

    it('should handle rate limiting correctly', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      // Make rapid requests to trigger rate limiting
      const rapidRequests = Array.from({ length: 20 }, () =>
        testContext.request
          .get('/api/processes')
          .set(authHeaders)
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await testContext.request
        .get('/api/processes')
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should enforce role-based authorization for admin endpoints', async () => {
      const { token } = await testContext.createAuthenticatedUser(testUsers.regularUser.email);
      const authHeaders = testContext.getAuthHeaders(token);

      const response = await testContext.request
        .get('/api/admin/processes')
        .set(authHeaders)
        .expect(403);

      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
    });

    it('should allow admin access to admin endpoints', async () => {
      // Create admin user
      const adminUser = await testContext.prisma.user.create({
        data: {
          email: testUsers.adminUser.email,
          passwordHash: 'hashed_password',
          role: 'ADMIN'
        }
      });

      const jwt = require('jsonwebtoken');
      const adminToken = jwt.sign(
        { userId: adminUser.id, email: adminUser.email, role: 'ADMIN' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await testContext.request
        .get('/api/admin/processes')
        .set({ Authorization: `Bearer ${adminToken}` })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across related entities', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      // Create process
      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Consistency Test Process' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Add authors to process
      const author = await testContext.prisma.author.create({
        data: {
          name: testAuthors.validAuthor.name,
          email: testAuthors.validAuthor.email,
          publicationCount: testAuthors.validAuthor.publicationCount,
          clinicalTrials: testAuthors.validAuthor.clinicalTrials,
          retractions: testAuthors.validAuthor.retractions,
          researchAreas: JSON.stringify(testAuthors.validAuthor.researchAreas),
          meshTerms: JSON.stringify(testAuthors.validAuthor.meshTerms)
        }
      });

      await testContext.prisma.processAuthor.create({
        data: {
          processId,
          authorId: author.id,
          role: 'CANDIDATE',
          validationStatus: JSON.stringify({ passed: true })
        }
      });

      // Delete process and verify cascade deletion
      await testContext.request
        .delete(`/api/processes/${processId}`)
        .set(authHeaders)
        .expect(200);

      // Verify related ProcessAuthor records are deleted
      const remainingProcessAuthors = await testContext.prisma.processAuthor.findMany({
        where: { processId }
      });

      expect(remainingProcessAuthors).toHaveLength(0);

      // Verify Author record still exists (should not be cascade deleted)
      const remainingAuthor = await testContext.prisma.author.findUnique({
        where: { id: author.id }
      });

      expect(remainingAuthor).not.toBeNull();
    });

    it('should handle concurrent updates to the same resource', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Concurrent Update Test' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Simulate concurrent updates
      const update1 = testContext.request
        .put(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .send({
          title: 'Updated Title 1',
          authors: [{ name: 'Author 1', email: 'author1@test.com' }]
        });

      const update2 = testContext.request
        .put(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .send({
          title: 'Updated Title 2',
          authors: [{ name: 'Author 2', email: 'author2@test.com' }]
        });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both updates should succeed (last write wins)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify final state
      const finalState = await testContext.request
        .get(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .expect(200);

      expect(finalState.body.data.title).toMatch(/Updated Title [12]/);
    });
  });
});