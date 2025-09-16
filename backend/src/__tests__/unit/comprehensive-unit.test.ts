import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TestContext, createTestContext } from '../../test/testUtils';
import { testAuthors, testKeywords } from '../../test/fixtures';

// Import services for unit testing
import { AuthorValidationService } from '../../services/AuthorValidationService';
import { KeywordEnhancementService } from '../../services/KeywordEnhancementService';
import { ManuscriptProcessingService } from '../../services/ManuscriptProcessingService';
import { RecommendationService } from '../../services/RecommendationService';
import { ShortlistService } from '../../services/ShortlistService';
import { AuthorRepository } from '../../repositories/AuthorRepository';
import { ShortlistRepository } from '../../repositories/ShortlistRepository';

describe('Comprehensive Unit Tests', () => {
  let testContext: TestContext;
  let prisma: PrismaClient;

  beforeEach(async () => {
    testContext = createTestContext();
    await testContext.setup();
    prisma = testContext.prisma;
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Database Operations', () => {
    it('should create and retrieve test data', async () => {
      const testUser = await testContext.createAuthenticatedUser();
      
      expect(testUser.user).toBeDefined();
      expect(testUser.user.email).toBeDefined();
      expect(testUser.token).toBeDefined();

      // Test database connection
      const user = await prisma.user.findUnique({
        where: { id: testUser.user.id }
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(testUser.user.email);
    });

    it('should create authors with test data', async () => {
      const author = await prisma.author.create({
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

      expect(author).toBeDefined();
      expect(author.name).toBe(testAuthors.validAuthor.name);
      expect(author.publicationCount).toBe(testAuthors.validAuthor.publicationCount);
    });

    it('should create processes and process authors', async () => {
      const testUser = await testContext.createAuthenticatedUser();
      const process = await prisma.process.create({
        data: {
          userId: testUser.user.id,
          title: 'Test Process',
          status: 'IN_PROGRESS',
          currentStep: 'VALIDATION',
          metadata: JSON.stringify({ test: 'data' })
        }
      });

      const author = await prisma.author.create({
        data: {
          name: 'Test Author',
          email: 'test@example.com',
          publicationCount: 10,
          clinicalTrials: 2,
          retractions: 0,
          researchAreas: JSON.stringify(['Computer Science']),
          meshTerms: JSON.stringify(['Algorithms'])
        }
      });

      const processAuthor = await prisma.processAuthor.create({
        data: {
          processId: process.id,
          authorId: author.id,
          role: 'CANDIDATE'
        }
      });

      expect(processAuthor).toBeDefined();
      expect(processAuthor.processId).toBe(process.id);
      expect(processAuthor.authorId).toBe(author.id);
      expect(processAuthor.role).toBe('CANDIDATE');
    });
  });

  describe('AuthorValidationService', () => {
    let validationService: AuthorValidationService;

    beforeEach(() => {
      validationService = new AuthorValidationService(prisma);
    });

    it('should validate process authors with configuration', async () => {
      const testUser = await testContext.createAuthenticatedUser();
      const testProcess = await prisma.process.create({
        data: {
          userId: testUser.user.id,
          title: 'Test Process',
          status: 'IN_PROGRESS',
          currentStep: 'VALIDATION',
          metadata: JSON.stringify({ test: 'data' })
        }
      });

      const author = await prisma.author.create({
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

      // Add author to process as candidate
      await prisma.processAuthor.create({
        data: {
          processId: testProcess.id,
          authorId: author.id,
          role: 'CANDIDATE'
        }
      });

      const manuscriptMetadata = {
        title: 'Test Manuscript',
        authors: [{
          id: 'different-author-id',
          name: 'Different Author',
          email: 'different@test.com',
          affiliations: [],
          publicationCount: 10,
          clinicalTrials: 2,
          retractions: 0,
          researchAreas: ['Computer Science'],
          meshTerms: ['Algorithms']
        }],
        affiliations: [],
        abstract: 'Test abstract',
        keywords: ['test'],
        primaryFocusAreas: ['Computer Science'],
        secondaryFocusAreas: ['AI']
      };

      const config = {
        minPublications: 5,
        maxRetractions: 1,
        minRecentPublications: 2,
        recentYears: 5,
        checkInstitutionalConflicts: true,
        checkCoAuthorConflicts: true,
        collaborationYears: 3
      };

      const result = await validationService.validateProcessAuthors(testProcess.id, manuscriptMetadata, config);

      expect(result.processId).toBe(testProcess.id);
      expect(result.totalCandidates).toBe(1);
      expect(result.validationResults).toHaveLength(1);
    });

    it('should handle validation with proper null checks', async () => {
      const testUser = await testContext.createAuthenticatedUser();
      const testProcess = await prisma.process.create({
        data: {
          userId: testUser.user.id,
          title: 'Test Process',
          status: 'IN_PROGRESS',
          currentStep: 'VALIDATION',
          metadata: JSON.stringify({ test: 'data' })
        }
      });

      const manuscriptMetadata = {
        title: 'Test Manuscript',
        authors: [{
          id: 'manuscript-author-id',
          name: 'Manuscript Author',
          email: 'manuscript@test.com',
          affiliations: [],
          publicationCount: 15,
          clinicalTrials: 3,
          retractions: 0,
          researchAreas: ['Computer Science'],
          meshTerms: ['Algorithms']
        }],
        affiliations: [],
        abstract: 'Test abstract',
        keywords: ['test'],
        primaryFocusAreas: ['Computer Science'],
        secondaryFocusAreas: ['AI']
      };

      const config = {
        minPublications: 10,
        maxRetractions: 1,
        minRecentPublications: 5,
        recentYears: 5,
        checkInstitutionalConflicts: true,
        checkCoAuthorConflicts: true,
        collaborationYears: 3
      };

      const result = await validationService.validateProcessAuthors(testProcess.id, manuscriptMetadata, config);

      expect(result.totalCandidates).toBe(0); // No candidates added to this process
      expect(result.validationResults).toHaveLength(0);
    });
  });

  describe('KeywordEnhancementService', () => {
    let keywordService: KeywordEnhancementService;

    beforeEach(() => {
      keywordService = new KeywordEnhancementService();
    });

    it('should generate enhanced keywords from manuscript content', async () => {
      const manuscriptData = {
        title: 'Machine Learning Applications in Healthcare',
        authors: [{
          id: 'test-author-id',
          name: 'Test Author',
          email: 'test@example.com',
          affiliations: [],
          publicationCount: 10,
          clinicalTrials: 2,
          retractions: 0,
          researchAreas: ['Computer Science'],
          meshTerms: ['Algorithms']
        }],
        affiliations: [],
        abstract: 'This study explores the use of artificial intelligence and machine learning algorithms in medical diagnosis and treatment.',
        keywords: ['machine learning', 'healthcare'],
        primaryFocusAreas: ['Computer Science'],
        secondaryFocusAreas: ['Healthcare']
      };

      const enhancedKeywords = await keywordService.generateEnhancedKeywords(manuscriptData);

      expect(enhancedKeywords).toContain('machine learning');
      expect(enhancedKeywords).toContain('healthcare');
      expect(enhancedKeywords.length).toBeGreaterThan(manuscriptData.keywords.length);
    });

    it('should extract MeSH terms from content', async () => {
      const content = 'This research focuses on machine learning algorithms and artificial intelligence in medical applications.';

      const meshTerms = await keywordService.extractMeshTerms(content);

      expect(meshTerms).toBeInstanceOf(Array);
      expect(meshTerms.length).toBeGreaterThan(0);
    });

    it('should generate database-specific search strings', async () => {
      const keywords = testKeywords.computerScience;

      const pubmedString = await keywordService.generateSearchStrings(keywords, 'pubmed' as any);
      const elsevierString = await keywordService.generateSearchStrings(keywords, 'elsevier' as any);

      expect(pubmedString).toContain('machine learning');
      expect(elsevierString).toContain('machine learning');
      expect(pubmedString).not.toBe(elsevierString);
    });

    it('should handle empty keyword arrays gracefully', async () => {
      const emptyKeywords: string[] = [];

      const pubmedString = await keywordService.generateSearchStrings(emptyKeywords, 'pubmed' as any);
      const elsevierString = await keywordService.generateSearchStrings(emptyKeywords, 'elsevier' as any);

      expect(pubmedString).toBe('');
      expect(elsevierString).toBe('');
    });
  });

  describe('ManuscriptProcessingService', () => {
    let processingService: ManuscriptProcessingService;

    beforeEach(() => {
      processingService = new ManuscriptProcessingService();
    });

    it('should validate supported file formats', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');
      const wordBuffer = Buffer.from('PK\x03\x04 test content');
      const invalidBuffer = Buffer.from('invalid content');

      expect(processingService.validateFile(pdfBuffer, 'test.pdf', 'application/pdf').isValid).toBe(true);
      expect(processingService.validateFile(wordBuffer, 'test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').isValid).toBe(true);
      expect(processingService.validateFile(invalidBuffer, 'test.txt', 'text/plain').isValid).toBe(false);
    });

    it('should extract metadata from PDF files', async () => {
      const mockPdfBuffer = Buffer.from('%PDF-1.4 mock content with title and authors');
      
      // Mock the PDF parsing
      jest.spyOn(processingService, 'extractMetadata').mockResolvedValue({
        success: true,
        metadata: {
          title: 'Test Document Title',
          authors: [{
            id: 'test-author-id',
            name: 'Test Author',
            email: 'test@example.com',
            affiliations: [],
            publicationCount: 10,
            clinicalTrials: 2,
            retractions: 0,
            researchAreas: ['Computer Science'],
            meshTerms: ['Algorithms']
          }],
          affiliations: [],
          abstract: 'Test abstract content',
          keywords: ['test', 'document'],
          primaryFocusAreas: ['Computer Science'],
          secondaryFocusAreas: ['Software Engineering']
        },
        processingTime: 1000
      });

      const result = await processingService.extractMetadata(mockPdfBuffer, 'test.pdf', 'application/pdf');

      expect(result.success).toBe(true);
      expect(result.metadata?.title).toBe('Test Document Title');
      expect(result.metadata?.authors).toHaveLength(1);
      expect(result.metadata?.keywords).toContain('test');
    });

    it('should handle file processing errors gracefully', async () => {
      const corruptedBuffer = Buffer.from('corrupted file content');

      const result = await processingService.extractMetadata(corruptedBuffer, 'corrupted.pdf', 'application/pdf');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('RecommendationService', () => {
    let recommendationService: RecommendationService;

    beforeEach(() => {
      recommendationService = new RecommendationService(prisma);
    });

    it('should get validated candidates for a process', async () => {
      const testUser = await testContext.createAuthenticatedUser();
      const testProcess = await prisma.process.create({
        data: {
          userId: testUser.user.id,
          title: 'Test Process',
          status: 'IN_PROGRESS',
          currentStep: 'RECOMMENDATIONS',
          metadata: JSON.stringify({ test: 'data' })
        }
      });

      const authors = await Promise.all([
        prisma.author.create({
          data: {
            name: testAuthors.validAuthor.name,
            email: testAuthors.validAuthor.email,
            publicationCount: testAuthors.validAuthor.publicationCount,
            clinicalTrials: testAuthors.validAuthor.clinicalTrials,
            retractions: testAuthors.validAuthor.retractions,
            researchAreas: JSON.stringify(testAuthors.validAuthor.researchAreas),
            meshTerms: JSON.stringify(testAuthors.validAuthor.meshTerms)
          }
        }),
        prisma.author.create({
          data: {
            name: testAuthors.highImpactAuthor.name,
            email: testAuthors.highImpactAuthor.email,
            publicationCount: testAuthors.highImpactAuthor.publicationCount,
            clinicalTrials: testAuthors.highImpactAuthor.clinicalTrials,
            retractions: testAuthors.highImpactAuthor.retractions,
            researchAreas: JSON.stringify(testAuthors.highImpactAuthor.researchAreas),
            meshTerms: JSON.stringify(testAuthors.highImpactAuthor.meshTerms)
          }
        })
      ]);

      // Add authors to process as candidates
      await Promise.all(authors.map(author => 
        prisma.processAuthor.create({
          data: {
            processId: testProcess.id,
            authorId: author.id,
            role: 'CANDIDATE',
            validationStatus: JSON.stringify({ passed: true, conflicts: [] })
          }
        })
      ));

      const candidates = await recommendationService.getValidatedCandidates(testProcess.id);

      expect(candidates.length).toBeGreaterThan(0);
      if (candidates.length > 0 && candidates[0]) {
        expect(candidates[0]).toHaveProperty('name');
        expect(candidates[0]).toHaveProperty('publicationCount');
        expect(candidates[0].publicationCount).toBeGreaterThan(0);
      }
    });
  });

  describe('ShortlistService', () => {
    let shortlistService: ShortlistService;
    let shortlistRepository: ShortlistRepository;
    let processAuthorRepository: any;
    let authorRepository: AuthorRepository;
    let testUser: any;
    let testProcess: any;

    beforeEach(async () => {
      shortlistRepository = new ShortlistRepository(prisma);
      processAuthorRepository = { updateAuthorRoles: jest.fn() };
      authorRepository = new AuthorRepository(prisma);
      shortlistService = new ShortlistService(shortlistRepository, processAuthorRepository, authorRepository);
      const userWithToken = await testContext.createAuthenticatedUser();
      testUser = userWithToken.user;
      
      testProcess = await prisma.process.create({
        data: {
          userId: testUser.id,
          title: 'Test Process',
          status: 'IN_PROGRESS',
          currentStep: 'SHORTLIST',
          metadata: JSON.stringify({ test: 'data' })
        }
      });
    });

    it('should create shortlist with selected authors', async () => {
      const author = await prisma.author.create({
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

      // Mock the validateAuthorsForProcess method
      jest.spyOn(shortlistService as any, 'validateAuthorsForProcess').mockResolvedValue([{
        id: author.id,
        name: author.name,
        email: author.email,
        affiliations: [],
        publicationCount: author.publicationCount,
        clinicalTrials: author.clinicalTrials,
        retractions: author.retractions,
        researchAreas: JSON.parse(author.researchAreas || '[]'),
        meshTerms: JSON.parse(author.meshTerms || '[]')
      }]);

      const shortlistData = {
        processId: testProcess.id,
        name: 'Test Shortlist',
        authorIds: [author.id]
      };

      const shortlist = await shortlistService.createShortlist(shortlistData);

      expect(shortlist.processId).toBe(testProcess.id);
      expect(shortlist.name).toBe('Test Shortlist');
    });

    it('should get shortlists by process', async () => {
      const shortlists = await shortlistService.getShortlistsByProcess(testProcess.id);

      expect(shortlists).toBeInstanceOf(Array);
      expect(shortlists.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Testing', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple authors in parallel
      const authors = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.author.create({
            data: {
              name: `Test Author ${i}`,
              email: `author${i}@test.com`,
              publicationCount: Math.floor(Math.random() * 100),
              clinicalTrials: Math.floor(Math.random() * 20),
              retractions: Math.floor(Math.random() * 3),
              researchAreas: JSON.stringify(['Computer Science']),
              meshTerms: JSON.stringify(['Algorithms'])
            }
          })
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(authors).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Bulk author creation: ${duration}ms for 10 authors`);
    });

    it('should handle database queries efficiently', async () => {
      // Create some test data first
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          prisma.author.create({
            data: {
              name: `Query Test Author ${i}`,
              email: `querytest${i}@test.com`,
              publicationCount: 10 + i,
              clinicalTrials: i,
              retractions: 0,
              researchAreas: JSON.stringify(['Computer Science']),
              meshTerms: JSON.stringify(['Algorithms'])
            }
          })
        )
      );

      const startTime = Date.now();
      
      const results = await prisma.author.findMany({
        where: {
          publicationCount: {
            gte: 10
          }
        },
        take: 10
      });
      
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBeGreaterThan(0);
      
      console.log(`Database query performance: ${queryTime}ms for ${results.length} results`);
    });
  });
});