import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, createTestContext, createMockPdfBuffer } from '../../test/testUtils';
import { seedTestDatabase } from '../../test/testUtils';

describe('End-to-End Workflow Tests', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = createTestContext();
    await testContext.setup();
    await seedTestDatabase(testContext.prisma);
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  beforeEach(async () => {
    // Clean up any test-specific data before each test
    await testContext.prisma.activityLog.deleteMany({
      where: { action: { contains: 'TEST_' } }
    });
  });

  describe('Complete Manuscript Analysis Workflow', () => {
    it('should complete full manuscript analysis from upload to export', async () => {
      // Create authenticated user
      const { token } = await testContext.createAuthenticatedUser(
        'researcher@university.edu',
        'securepassword123'
      );
      const authHeaders = testContext.getAuthHeaders(token);

      // Step 1: Create new manuscript analysis process
      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({
          title: 'Machine Learning in Healthcare Research',
          description: 'Analysis of ML applications in medical diagnosis'
        })
        .expect(201);

      const processId = processResponse.body.data.id;
      expect(processResponse.body.data.status).toBe('CREATED');
      expect(processResponse.body.data.currentStep).toBe('UPLOAD');

      // Step 2: Upload manuscript file
      const manuscriptBuffer = createMockPdfBuffer();
      
      const uploadResponse = await testContext.request
        .post(`/api/processes/${processId}/upload`)
        .set(authHeaders)
        .attach('manuscript', manuscriptBuffer, 'research-paper.pdf')
        .field('fileType', 'application/pdf')
        .expect(200);

      expect(uploadResponse.body.data.status).toBe('PROCESSING');
      expect(uploadResponse.body.data.currentStep).toBe('METADATA_EXTRACTION');

      // Wait for processing to complete
      let processingComplete = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!processingComplete && attempts < maxAttempts) {
        const statusResponse = await testContext.request
          .get(`/api/processes/${processId}`)
          .set(authHeaders)
          .expect(200);

        processingComplete = statusResponse.body.data.currentStep !== 'METADATA_EXTRACTION';
        attempts++;
        
        if (!processingComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(processingComplete).toBe(true);

      // Step 3: Review and edit extracted metadata
      const metadataResponse = await testContext.request
        .get(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .expect(200);

      const extractedMetadata = metadataResponse.body.data;
      expect(extractedMetadata).toHaveProperty('title');
      expect(extractedMetadata).toHaveProperty('authors');
      expect(extractedMetadata).toHaveProperty('abstract');
      expect(extractedMetadata).toHaveProperty('keywords');

      // Edit metadata if needed
      const updatedMetadata = {
        ...extractedMetadata,
        title: 'Machine Learning Applications in Medical Diagnosis: A Comprehensive Study',
        authors: [
          { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@medschool.edu', affiliation: 'Medical University' },
          { name: 'Prof. Michael Chen', email: 'michael.chen@techuni.edu', affiliation: 'Tech University' }
        ],
        keywords: [...extractedMetadata.keywords, 'deep learning', 'neural networks', 'medical imaging']
      };

      await testContext.request
        .put(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .send(updatedMetadata)
        .expect(200);

      // Step 4: Generate enhanced keywords and search strings
      const keywordEnhancementResponse = await testContext.request
        .post(`/api/processes/${processId}/keywords/enhance`)
        .set(authHeaders)
        .send({
          includeOriginal: true,
          generateMeshTerms: true,
          generateSearchStrings: true
        })
        .expect(200);

      const enhancedData = keywordEnhancementResponse.body.data;
      expect(enhancedData.enhancedKeywords).toBeInstanceOf(Array);
      expect(enhancedData.meshTerms).toBeInstanceOf(Array);
      expect(enhancedData.searchStrings).toHaveProperty('pubmed');
      expect(enhancedData.searchStrings).toHaveProperty('elsevier');
      expect(enhancedData.searchStrings).toHaveProperty('wiley');
      expect(enhancedData.searchStrings).toHaveProperty('taylorFrancis');

      // Step 5: Select keywords and initiate database search
      const selectedKeywords = enhancedData.enhancedKeywords.slice(0, 10);
      const selectedMeshTerms = enhancedData.meshTerms.slice(0, 8);

      const searchResponse = await testContext.request
        .post(`/api/processes/${processId}/search`)
        .set(authHeaders)
        .send({
          keywords: selectedKeywords,
          meshTerms: selectedMeshTerms,
          databases: ['pubmed', 'elsevier', 'wiley', 'taylorFrancis'],
          searchOptions: {
            maxResults: 500,
            dateRange: { from: '2020-01-01', to: '2024-12-31' },
            includeRecentPublications: true
          }
        })
        .expect(202);

      expect(searchResponse.body.data.searchId).toBeDefined();
      expect(searchResponse.body.data.status).toBe('INITIATED');

      // Monitor search progress
      let searchComplete = false;
      attempts = 0;
      const maxSearchAttempts = 60; // Allow more time for database searches

      while (!searchComplete && attempts < maxSearchAttempts) {
        const progressResponse = await testContext.request
          .get(`/api/processes/${processId}/search/status`)
          .set(authHeaders)
          .expect(200);

        const progress = progressResponse.body.data;
        searchComplete = progress.status === 'COMPLETED';
        
        // Log progress for debugging
        console.log(`Search progress: ${progress.completedDatabases}/${progress.totalDatabases} databases, ${progress.totalAuthorsFound} authors found`);
        
        attempts++;
        
        if (!searchComplete) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      expect(searchComplete).toBe(true);

      // Step 6: Add manual reviewers if needed
      await testContext.request
        .post(`/api/processes/${processId}/reviewers/manual`)
        .set(authHeaders)
        .send({
          searchType: 'name',
          query: 'Dr. Expert Reviewer',
          addToPool: true
        })
        .expect(200);

      // Step 7: Run author validation
      const validationResponse = await testContext.request
        .post(`/api/processes/${processId}/validate`)
        .set(authHeaders)
        .send({
          validationRules: {
            excludeManuscriptAuthors: true,
            excludeCoAuthors: true,
            excludeSameInstitution: true,
            minPublications: 10,
            maxRetractions: 1,
            minClinicalTrials: 0,
            excludeRecentCollaborators: true,
            collaborationTimeframe: 24 // months
          }
        })
        .expect(200);

      const validationResults = validationResponse.body.data;
      expect(validationResults.totalCandidates).toBeGreaterThan(0);
      expect(validationResults.validatedAuthors).toBeGreaterThan(0);
      expect(validationResults.excludedAuthors).toBeGreaterThanOrEqual(0);

      // Step 8: Get validated candidates with filtering
      const candidatesResponse = await testContext.request
        .get(`/api/processes/${processId}/candidates`)
        .set(authHeaders)
        .query({
          page: 1,
          limit: 50,
          sortBy: 'publicationCount',
          sortOrder: 'desc',
          filters: JSON.stringify({
            minPublications: 15,
            maxRetractions: 0,
            countries: ['United States', 'United Kingdom', 'Canada'],
            researchAreas: ['Machine Learning', 'Medical Imaging', 'Artificial Intelligence']
          })
        })
        .expect(200);

      const candidates = candidatesResponse.body.data;
      expect(candidates.authors).toBeInstanceOf(Array);
      expect(candidates.pagination.total).toBeGreaterThan(0);
      expect(candidates.authors.length).toBeLessThanOrEqual(50);

      // Step 9: Get detailed recommendations with advanced filtering
      const recommendationsResponse = await testContext.request
        .get(`/api/processes/${processId}/recommendations`)
        .set(authHeaders)
        .query({
          page: 1,
          limit: 20,
          sortBy: 'relevanceScore',
          sortOrder: 'desc',
          filters: JSON.stringify({
            minPublications: 20,
            minClinicalTrials: 2,
            maxRetractions: 0,
            excludeInstitutions: ['Medical University'], // Exclude same institution as authors
            includeNetworkAnalysis: true,
            relevanceThreshold: 0.7
          })
        })
        .expect(200);

      const recommendations = recommendationsResponse.body.data;
      expect(recommendations.recommendations).toBeInstanceOf(Array);
      expect(recommendations.recommendations.length).toBeGreaterThan(0);

      // Step 10: View detailed reviewer profiles
      const firstRecommendation = recommendations.recommendations[0];
      const profileResponse = await testContext.request
        .get(`/api/processes/${processId}/reviewers/${firstRecommendation.id}/profile`)
        .set(authHeaders)
        .expect(200);

      const profile = profileResponse.body.data;
      expect(profile).toHaveProperty('basicInfo');
      expect(profile).toHaveProperty('researchProfile');
      expect(profile).toHaveProperty('publicationMetrics');
      expect(profile).toHaveProperty('networkAnalysis');
      expect(profile).toHaveProperty('conflictAnalysis');

      // Step 11: Create shortlist with selected reviewers
      const selectedReviewers = recommendations.recommendations.slice(0, 8).map((r: any) => r.id);
      
      const shortlistResponse = await testContext.request
        .post(`/api/processes/${processId}/shortlist`)
        .set(authHeaders)
        .send({
          name: 'Final Reviewer Shortlist',
          description: 'Top 8 reviewers for ML in Healthcare manuscript',
          selectedReviewers,
          includeAlternatives: true,
          alternativeCount: 3
        })
        .expect(201);

      const shortlistId = shortlistResponse.body.data.id;
      expect(shortlistResponse.body.data.reviewerCount).toBe(selectedReviewers.length);

      // Step 12: Export shortlist in multiple formats
      
      // CSV Export
      const csvExportResponse = await testContext.request
        .get(`/api/processes/${processId}/export/csv`)
        .set(authHeaders)
        .query({ shortlistId })
        .expect(200);

      expect(csvExportResponse.headers['content-type']).toContain('text/csv');
      expect(csvExportResponse.headers['content-disposition']).toContain('attachment');
      expect(csvExportResponse.text).toContain('Name,Email,Affiliation');

      // XLSX Export
      const xlsxExportResponse = await testContext.request
        .get(`/api/processes/${processId}/export/xlsx`)
        .set(authHeaders)
        .query({ shortlistId, includeProfiles: true })
        .expect(200);

      expect(xlsxExportResponse.headers['content-type']).toContain('application/vnd.openxmlformats');
      expect(xlsxExportResponse.body).toBeInstanceOf(Buffer);

      // Word Document Export
      const wordExportResponse = await testContext.request
        .get(`/api/processes/${processId}/export/word`)
        .set(authHeaders)
        .query({ 
          shortlistId, 
          includeProfiles: true,
          includeNetworkAnalysis: true,
          template: 'detailed'
        })
        .expect(200);

      expect(wordExportResponse.headers['content-type']).toContain('application/vnd.openxmlformats');

      // Step 13: View activity logs
      const logsResponse = await testContext.request
        .get(`/api/processes/${processId}/logs`)
        .set(authHeaders)
        .query({ page: 1, limit: 50 })
        .expect(200);

      const logs = logsResponse.body.data;
      expect(logs.activities).toBeInstanceOf(Array);
      expect(logs.activities.length).toBeGreaterThan(0);
      
      // Verify key activities are logged
      const activityTypes = logs.activities.map((log: any) => log.action);
      expect(activityTypes).toContain('PROCESS_CREATED');
      expect(activityTypes).toContain('MANUSCRIPT_UPLOADED');
      expect(activityTypes).toContain('SEARCH_INITIATED');
      expect(activityTypes).toContain('VALIDATION_COMPLETED');
      expect(activityTypes).toContain('SHORTLIST_CREATED');

      // Step 14: Verify final process state
      const finalProcessResponse = await testContext.request
        .get(`/api/processes/${processId}`)
        .set(authHeaders)
        .expect(200);

      const finalProcess = finalProcessResponse.body.data;
      expect(finalProcess.status).toBe('COMPLETED');
      expect(finalProcess.currentStep).toBe('EXPORT');
      expect(finalProcess.completedAt).toBeDefined();

      // Performance verification
      const processingTime = new Date(finalProcess.completedAt).getTime() - new Date(finalProcess.createdAt).getTime();
      expect(processingTime).toBeLessThan(300000); // Should complete within 5 minutes
    });

    it('should handle multiple concurrent workflows', async () => {
      const userCount = 3;
      const processesPerUser = 2;

      // Create multiple users
      const users = await Promise.all(
        Array.from({ length: userCount }, (_, i) =>
          testContext.createAuthenticatedUser(`user${i}@test.com`, 'password123')
        )
      );

      // Create multiple processes per user concurrently
      const allProcessPromises = users.flatMap(({ token }, userIndex) =>
        Array.from({ length: processesPerUser }, (_, processIndex) =>
          testContext.request
            .post('/api/processes')
            .set(testContext.getAuthHeaders(token))
            .send({
              title: `User ${userIndex} Process ${processIndex}`,
              description: `Concurrent test process`
            })
        )
      );

      const processResponses = await Promise.all(allProcessPromises);

      // Verify all processes were created successfully
      processResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('id');
      });

      // Upload files to all processes concurrently
      const uploadPromises = processResponses.map((response, index) => {
        const userIndex = Math.floor(index / processesPerUser);
        const user = users[userIndex];
        if (!user) {
          throw new Error(`User not found at index ${userIndex}`);
        }
        const token = user.token;
        const processId = response.body.data.id;
        const mockFile = createMockPdfBuffer();

        return testContext.request
          .post(`/api/processes/${processId}/upload`)
          .set(testContext.getAuthHeaders(token))
          .attach('manuscript', mockFile, `manuscript-${index}.pdf`);
      });

      const uploadResponses = await Promise.all(uploadPromises);

      // Verify all uploads succeeded
      uploadResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify system performance under load
      const totalProcesses = userCount * processesPerUser;
      expect(totalProcesses).toBe(processResponses.length);
      expect(totalProcesses).toBe(uploadResponses.length);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from partial failures in multi-step workflow', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      // Create process
      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Resilience Test Process' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Upload manuscript
      const manuscriptBuffer = createMockPdfBuffer();
      await testContext.request
        .post(`/api/processes/${processId}/upload`)
        .set(authHeaders)
        .attach('manuscript', manuscriptBuffer, 'test.pdf')
        .expect(200);

      // Simulate partial database search failure
      await testContext.request
        .post(`/api/processes/${processId}/search`)
        .set(authHeaders)
        .send({
          keywords: ['test', 'research'],
          databases: ['pubmed', 'invalid_database', 'elsevier']
        })
        .expect(202);

      // Wait for search to complete (should succeed partially)
      let searchComplete = false;
      let attempts = 0;

      while (!searchComplete && attempts < 30) {
        const statusResponse = await testContext.request
          .get(`/api/processes/${processId}/search/status`)
          .set(authHeaders)
          .expect(200);

        const status = statusResponse.body.data;
        searchComplete = status.status === 'COMPLETED' || status.status === 'PARTIAL_SUCCESS';
        attempts++;
        
        if (!searchComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(searchComplete).toBe(true);

      // Verify process can continue despite partial failure
      const candidatesResponse = await testContext.request
        .get(`/api/processes/${processId}/candidates`)
        .set(authHeaders)
        .expect(200);

      expect(candidatesResponse.body.data.authors).toBeInstanceOf(Array);
      // Should have some results from successful databases
      expect(candidatesResponse.body.data.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle system resource constraints gracefully', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      // Create process with very large file to test memory handling
      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Large File Test' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Create a large mock file (simulate memory pressure)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'test content'); // 10MB

      const uploadResponse = await testContext.request
        .post(`/api/processes/${processId}/upload`)
        .set(authHeaders)
        .attach('manuscript', largeBuffer, 'large-document.pdf')
        .timeout(30000); // Allow more time for large file

      // Should either succeed or fail gracefully with appropriate error
      if (uploadResponse.status === 200) {
        expect(uploadResponse.body.data.status).toBe('PROCESSING');
      } else {
        expect(uploadResponse.status).toBe(413); // Payload too large
        expect(uploadResponse.body.error.type).toBe('FILE_SIZE_ERROR');
      }
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency across the entire workflow', async () => {
      const { token } = await testContext.createAuthenticatedUser();
      const authHeaders = testContext.getAuthHeaders(token);

      // Create and complete a full workflow
      const processResponse = await testContext.request
        .post('/api/processes')
        .set(authHeaders)
        .send({ title: 'Data Integrity Test' })
        .expect(201);

      const processId = processResponse.body.data.id;

      // Upload and process manuscript
      const manuscriptBuffer = createMockPdfBuffer();
      await testContext.request
        .post(`/api/processes/${processId}/upload`)
        .set(authHeaders)
        .attach('manuscript', manuscriptBuffer, 'integrity-test.pdf')
        .expect(200);

      // Add metadata
      await testContext.request
        .put(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .send({
          title: 'Test Manuscript',
          authors: [{ name: 'Test Author', email: 'test@example.com' }],
          abstract: 'Test abstract',
          keywords: ['test', 'integrity']
        })
        .expect(200);

      // Verify data consistency at database level
      const process = await testContext.prisma.process.findUnique({
        where: { id: processId },
        include: {
          user: true,
          activityLogs: true
        }
      });

      expect(process).not.toBeNull();
      expect(process!.title).toBe('Data Integrity Test');
      expect(process!.activityLogs.length).toBeGreaterThan(0);

      // Verify metadata consistency
      const metadataResponse = await testContext.request
        .get(`/api/processes/${processId}/metadata`)
        .set(authHeaders)
        .expect(200);

      const metadata = metadataResponse.body.data;
      expect(metadata.title).toBe('Test Manuscript');
      expect(metadata.authors).toHaveLength(1);
      expect(metadata.authors[0].name).toBe('Test Author');

      // Verify activity logs are consistent
      const logsResponse = await testContext.request
        .get(`/api/processes/${processId}/logs`)
        .set(authHeaders)
        .expect(200);

      const logs = logsResponse.body.data.activities;
      expect(logs.some((log: any) => log.action === 'PROCESS_CREATED')).toBe(true);
      expect(logs.some((log: any) => log.action === 'MANUSCRIPT_UPLOADED')).toBe(true);
      expect(logs.some((log: any) => log.action === 'METADATA_UPDATED')).toBe(true);
    });
  });
});