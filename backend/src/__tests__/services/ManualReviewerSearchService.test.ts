import { PrismaClient } from '@prisma/client';
import { ProcessService } from '../../services/ProcessService';
import { DatabaseIntegrationService } from '../../services/DatabaseIntegrationService';
import { ManualReviewerSearchService } from '../../services/ManualReviewerSearchService';
import { AuthorRole, DatabaseType, Author } from '../../types';

// Mock Prisma
const mockPrisma = {
  process: {
    findUnique: jest.fn(),
  },
  author: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  affiliation: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  processAuthor: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  },
  authorAffiliation: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('Manual Reviewer Search Service', () => {
  let processService: ProcessService;
  let databaseIntegrationService: DatabaseIntegrationService;
  let manualReviewerSearchService: ManualReviewerSearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    processService = new ProcessService(mockPrisma);
    databaseIntegrationService = new DatabaseIntegrationService({
      enabledDatabases: [DatabaseType.PUBMED, DatabaseType.ELSEVIER],
    });
    manualReviewerSearchService = new ManualReviewerSearchService(
      databaseIntegrationService,
      processService
    );
  });

  describe('addManualReviewer', () => {
    const mockProcess = {
      id: 'process-1',
      userId: 'user-1',
      title: 'Test Process',
      status: 'CREATED',
      currentStep: 'MANUAL_SEARCH',
    };

    const mockAuthor: Author = {
      id: 'author-1',
      name: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      affiliations: [
        {
          id: 'affiliation-1',
          institutionName: 'University of Science',
          department: 'Computer Science',
          address: '123 University Ave',
          country: 'USA',
        },
      ],
      publicationCount: 50,
      clinicalTrials: 5,
      retractions: 0,
      researchAreas: ['Machine Learning', 'Data Science'],
      meshTerms: ['Algorithms', 'Computer Science'],
    };

    const mockStoredAffiliation = {
      id: 'stored-affiliation-1',
      institutionName: 'University of Science',
      department: 'Computer Science',
      address: '123 University Ave',
      country: 'USA',
    };

    const mockStoredAuthor = {
      id: 'stored-author-1',
      name: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      publicationCount: 50,
      clinicalTrials: 5,
      retractions: 0,
      researchAreas: JSON.stringify(['Machine Learning', 'Data Science']),
      meshTerms: JSON.stringify(['Algorithms', 'Computer Science']),
    };

    beforeEach(() => {
      (mockPrisma.process.findUnique as jest.Mock).mockResolvedValue(mockProcess);
      (mockPrisma.affiliation.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.affiliation.create as jest.Mock).mockResolvedValue(mockStoredAffiliation);
      (mockPrisma.author.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.author.create as jest.Mock).mockResolvedValue(mockStoredAuthor);
      (mockPrisma.processAuthor.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.processAuthor.create as jest.Mock).mockResolvedValue({
        id: 'process-author-1',
        processId: 'process-1',
        authorId: 'stored-author-1',
        role: AuthorRole.CANDIDATE,
      });
      (mockPrisma.authorAffiliation.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.authorAffiliation.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.activityLog.create as jest.Mock).mockResolvedValue({});
    });

    it('should successfully add a manual reviewer', async () => {
      const result = await processService.addManualReviewer('process-1', 'user-1', mockAuthor);

      expect(result).toBe(true);
      expect(mockPrisma.process.findUnique).toHaveBeenCalledWith({
        where: { id: 'process-1' },
      });
      expect(mockPrisma.affiliation.create).toHaveBeenCalledWith({
        data: {
          institutionName: 'University of Science',
          department: 'Computer Science',
          address: '123 University Ave',
          country: 'USA',
        },
      });
      expect(mockPrisma.author.create).toHaveBeenCalledWith({
        data: {
          name: 'Dr. John Smith',
          email: 'john.smith@university.edu',
          publicationCount: 50,
          clinicalTrials: 5,
          retractions: 0,
          researchAreas: JSON.stringify(['Machine Learning', 'Data Science']),
          meshTerms: JSON.stringify(['Algorithms', 'Computer Science']),
        },
      });
      expect(mockPrisma.processAuthor.create).toHaveBeenCalledWith({
        data: {
          processId: 'process-1',
          authorId: 'stored-author-1',
          role: AuthorRole.CANDIDATE,
        },
      });
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          processId: 'process-1',
          action: 'MANUAL_REVIEWER_ADDED',
          details: JSON.stringify({
            authorName: 'Dr. John Smith',
            authorEmail: 'john.smith@university.edu',
            publicationCount: 50,
          }),
        },
      });
    });

    it('should return false if process not found', async () => {
      (mockPrisma.process.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await processService.addManualReviewer('process-1', 'user-1', mockAuthor);

      expect(result).toBe(false);
    });

    it('should return false if process belongs to different user', async () => {
      const differentUserProcess = { ...mockProcess, userId: 'different-user' };
      (mockPrisma.process.findUnique as jest.Mock).mockResolvedValue(differentUserProcess);

      const result = await processService.addManualReviewer('process-1', 'user-1', mockAuthor);

      expect(result).toBe(false);
    });

    it('should not create duplicate process-author link', async () => {
      const existingProcessAuthor = {
        id: 'existing-process-author',
        processId: 'process-1',
        authorId: 'stored-author-1',
        role: AuthorRole.CANDIDATE,
      };
      (mockPrisma.processAuthor.findFirst as jest.Mock).mockResolvedValue(existingProcessAuthor);

      const result = await processService.addManualReviewer('process-1', 'user-1', mockAuthor);

      expect(result).toBe(true);
      expect(mockPrisma.processAuthor.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockPrisma.author.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await processService.addManualReviewer('process-1', 'user-1', mockAuthor);

      expect(result).toBe(false);
    });
  });

  describe('removeManualReviewer', () => {
    const mockProcess = {
      id: 'process-1',
      userId: 'user-1',
      title: 'Test Process',
    };

    const mockAuthor = {
      id: 'author-1',
      name: 'Dr. John Smith',
      email: 'john.smith@university.edu',
    };

    beforeEach(() => {
      (mockPrisma.process.findUnique as jest.Mock).mockResolvedValue(mockProcess);
      (mockPrisma.author.findUnique as jest.Mock).mockResolvedValue(mockAuthor);
      (mockPrisma.processAuthor.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.activityLog.create as jest.Mock).mockResolvedValue({});
    });

    it('should successfully remove a manual reviewer', async () => {
      const result = await processService.removeManualReviewer('process-1', 'user-1', 'author-1');

      expect(result).toBe(true);
      expect(mockPrisma.processAuthor.deleteMany).toHaveBeenCalledWith({
        where: {
          processId: 'process-1',
          authorId: 'author-1',
        },
      });
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          processId: 'process-1',
          action: 'MANUAL_REVIEWER_REMOVED',
          details: JSON.stringify({
            authorName: 'Dr. John Smith',
            authorEmail: 'john.smith@university.edu',
          }),
        },
      });
    });

    it('should return false if process not found', async () => {
      (mockPrisma.process.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await processService.removeManualReviewer('process-1', 'user-1', 'author-1');

      expect(result).toBe(false);
    });

    it('should return false if process belongs to different user', async () => {
      const differentUserProcess = { ...mockProcess, userId: 'different-user' };
      (mockPrisma.process.findUnique as jest.Mock).mockResolvedValue(differentUserProcess);

      const result = await processService.removeManualReviewer('process-1', 'user-1', 'author-1');

      expect(result).toBe(false);
    });

    it('should return false if no records were deleted', async () => {
      (mockPrisma.processAuthor.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await processService.removeManualReviewer('process-1', 'user-1', 'author-1');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (mockPrisma.processAuthor.deleteMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await processService.removeManualReviewer('process-1', 'user-1', 'author-1');

      expect(result).toBe(false);
    });
  });

  describe('generateSearchSuggestions', () => {
    it('should generate name suggestions for multi-part names', async () => {
      const suggestions = await processService.generateSearchSuggestions('John Smith', 'name');

      expect(suggestions).toContain('Smith John');
      expect(suggestions).toContain('J. Smith');
      expect(suggestions).toContain('John S.');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should generate partial name suggestions', async () => {
      const suggestions = await processService.generateSearchSuggestions('Johnson', 'name');

      expect(suggestions).toContain('Johnso');
      expect(suggestions).toContain('ohnson');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should generate email domain suggestions', async () => {
      const suggestions = await processService.generateSearchSuggestions('john@gmail.com', 'email');

      expect(suggestions.some(s => s.includes('edu'))).toBe(true);
      expect(suggestions.some(s => s.includes('ac.uk'))).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should generate email local part suggestions', async () => {
      const suggestions = await processService.generateSearchSuggestions('john.smith@university.edu', 'email');

      expect(suggestions).toContain('johnsmith@university.edu');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid inputs', async () => {
      const suggestions = await processService.generateSearchSuggestions('', 'name');

      expect(suggestions).toEqual([]);
    });

    it('should limit suggestions to 5 items', async () => {
      const suggestions = await processService.generateSearchSuggestions('Dr. John Michael Smith Jr.', 'name');

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('ManualReviewerSearchService', () => {
    const mockAuthors: Author[] = [
      {
        id: 'pubmed-author-1',
        name: 'John Smith',
        email: 'j.smith@university.edu',
        affiliations: [
          {
            id: 'affiliation-1',
            institutionName: 'University of Science',
            department: 'Computer Science',
            address: '123 University Ave',
            country: 'USA',
          },
        ],
        publicationCount: 25,
        clinicalTrials: 2,
        retractions: 0,
        researchAreas: ['Computer Science'],
        meshTerms: ['Algorithms'],
      },
    ];

    beforeEach(() => {
      jest.spyOn(databaseIntegrationService, 'searchByName').mockImplementation(async (name: string) => {
        if (name === 'John Smith') {
          return mockAuthors;
        }
        return [];
      });

      jest.spyOn(databaseIntegrationService, 'searchByEmail').mockImplementation(async (email: string) => {
        if (email === 'j.smith@university.edu') {
          return mockAuthors;
        }
        return [];
      });

      jest.spyOn(processService, 'addManualReviewer').mockResolvedValue(true);
      jest.spyOn(processService, 'removeManualReviewer').mockResolvedValue(true);
      jest.spyOn(processService, 'getProcessCandidates').mockResolvedValue(mockAuthors);
    });

    describe('searchByName', () => {
      it('should search authors by name and return results with metadata', async () => {
        const result = await manualReviewerSearchService.searchByName('John Smith');

        expect(result.authors).toHaveLength(1);
        expect(result.searchTerm).toBe('John Smith');
        expect(result.searchType).toBe('name');
        expect(result.totalFound).toBe(1);
        expect(result.searchTime).toBeGreaterThan(0);
        expect(result.suggestions).toBeUndefined();
        expect(databaseIntegrationService.searchByName).toHaveBeenCalledWith('John Smith', undefined);
      });

      it('should search with specific databases', async () => {
        const databases = [DatabaseType.PUBMED];
        await manualReviewerSearchService.searchByName('John Smith', databases);

        expect(databaseIntegrationService.searchByName).toHaveBeenCalledWith('John Smith', databases);
      });

      it('should return suggestions when no results found', async () => {
        const result = await manualReviewerSearchService.searchByName('Nonexistent Author');

        expect(result.authors).toHaveLength(0);
        expect(result.totalFound).toBe(0);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should handle search errors gracefully', async () => {
        jest.spyOn(databaseIntegrationService, 'searchByName').mockRejectedValue(new Error('Database error'));

        const result = await manualReviewerSearchService.searchByName('John Smith');

        expect(result.authors).toHaveLength(0);
        expect(result.totalFound).toBe(0);
        expect(result.suggestions).toBeDefined();
      });
    });

    describe('searchByEmail', () => {
      it('should search authors by email and return results with metadata', async () => {
        const result = await manualReviewerSearchService.searchByEmail('j.smith@university.edu');

        expect(result.authors).toHaveLength(1);
        expect(result.searchTerm).toBe('j.smith@university.edu');
        expect(result.searchType).toBe('email');
        expect(result.totalFound).toBe(1);
        expect(result.searchTime).toBeGreaterThan(0);
        expect(result.suggestions).toBeUndefined();
        expect(databaseIntegrationService.searchByEmail).toHaveBeenCalledWith('j.smith@university.edu', undefined);
      });

      it('should search with specific databases', async () => {
        const databases = [DatabaseType.ELSEVIER];
        await manualReviewerSearchService.searchByEmail('j.smith@university.edu', databases);

        expect(databaseIntegrationService.searchByEmail).toHaveBeenCalledWith('j.smith@university.edu', databases);
      });

      it('should return suggestions when no results found', async () => {
        const result = await manualReviewerSearchService.searchByEmail('nonexistent@email.com');

        expect(result.authors).toHaveLength(0);
        expect(result.totalFound).toBe(0);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should handle search errors gracefully', async () => {
        jest.spyOn(databaseIntegrationService, 'searchByEmail').mockRejectedValue(new Error('Database error'));

        const result = await manualReviewerSearchService.searchByEmail('j.smith@university.edu');

        expect(result.authors).toHaveLength(0);
        expect(result.totalFound).toBe(0);
        expect(result.suggestions).toBeDefined();
      });
    });

    describe('addManualReviewer', () => {
      it('should add a manual reviewer successfully', async () => {
        const result = await manualReviewerSearchService.addManualReviewer(
          'process-1',
          'user-1',
          mockAuthors[0]!
        );

        expect(result).toBe(true);
        expect(processService.addManualReviewer).toHaveBeenCalledWith(
          'process-1',
          'user-1',
          mockAuthors[0]
        );
      });

      it('should handle errors gracefully', async () => {
        jest.spyOn(processService, 'addManualReviewer').mockRejectedValue(new Error('Database error'));

        const result = await manualReviewerSearchService.addManualReviewer(
          'process-1',
          'user-1',
          mockAuthors[0]!
        );

        expect(result).toBe(false);
      });
    });

    describe('removeReviewer', () => {
      it('should remove a reviewer successfully', async () => {
        const result = await manualReviewerSearchService.removeReviewer(
          'process-1',
          'user-1',
          'author-1'
        );

        expect(result).toBe(true);
        expect(processService.removeManualReviewer).toHaveBeenCalledWith(
          'process-1',
          'user-1',
          'author-1'
        );
      });

      it('should handle errors gracefully', async () => {
        jest.spyOn(processService, 'removeManualReviewer').mockRejectedValue(new Error('Database error'));

        const result = await manualReviewerSearchService.removeReviewer(
          'process-1',
          'user-1',
          'author-1'
        );

        expect(result).toBe(false);
      });
    });

    describe('generateSearchSuggestions', () => {
      it('should generate name suggestions', () => {
        const suggestions = manualReviewerSearchService.generateSearchSuggestions('John Smith', 'name');

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s: any) => s.type === 'name_variation')).toBe(true);
        expect(suggestions.some((s: any) => s.term.includes('Smith'))).toBe(true);
      });

      it('should generate email suggestions', () => {
        const suggestions = manualReviewerSearchService.generateSearchSuggestions('john@gmail.com', 'email');

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((s: any) => s.type === 'email_variation')).toBe(true);
        expect(suggestions.some((s: any) => s.term.includes('edu'))).toBe(true);
      });

      it('should limit suggestions to reasonable number', () => {
        const suggestions = manualReviewerSearchService.generateSearchSuggestions('Dr. John Michael Smith Jr.', 'name');

        expect(suggestions.length).toBeLessThanOrEqual(5);
      });
    });

    describe('getManualReviewers', () => {
      it('should get manual reviewers for a process', async () => {
        const result = await manualReviewerSearchService.getManualReviewers('process-1', 'user-1');

        expect(result).toEqual(mockAuthors);
        expect(processService.getProcessCandidates).toHaveBeenCalledWith('process-1', 'user-1');
      });

      it('should handle errors gracefully', async () => {
        jest.spyOn(processService, 'getProcessCandidates').mockRejectedValue(new Error('Database error'));

        const result = await manualReviewerSearchService.getManualReviewers('process-1', 'user-1');

        expect(result).toEqual([]);
      });
    });

    describe('addMultipleReviewers', () => {
      it('should add multiple reviewers successfully', async () => {
        const authors = [mockAuthors[0]!, { ...mockAuthors[0]!, id: 'author-2', name: 'Jane Doe' }];

        const result = await manualReviewerSearchService.addMultipleReviewers(
          'process-1',
          'user-1',
          authors
        );

        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(processService.addManualReviewer).toHaveBeenCalledTimes(2);
      });

      it('should handle partial failures', async () => {
        jest.spyOn(processService, 'addManualReviewer')
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false);

        const authors = [mockAuthors[0]!, { ...mockAuthors[0]!, id: 'author-2', name: 'Jane Doe' }];

        const result = await manualReviewerSearchService.addMultipleReviewers(
          'process-1',
          'user-1',
          authors
        );

        expect(result.success).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
      });

      it('should handle errors during batch addition', async () => {
        jest.spyOn(processService, 'addManualReviewer')
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error('Database error'));

        const authors = [mockAuthors[0]!, { ...mockAuthors[0]!, id: 'author-2', name: 'Jane Doe' }];

        const result = await manualReviewerSearchService.addMultipleReviewers(
          'process-1',
          'user-1',
          authors
        );

        expect(result.success).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Jane Doe');
      });
    });

    describe('searchMultipleCriteria', () => {
      it('should search by both name and email', async () => {
        const result = await manualReviewerSearchService.searchMultipleCriteria({
          name: 'John Smith',
          email: 'j.smith@university.edu',
        });

        expect(result.authors).toHaveLength(1); // Deduplicated
        expect(result.searchTerm).toBe('name:John Smith AND email:j.smith@university.edu');
        expect(result.totalFound).toBe(1);
        expect(databaseIntegrationService.searchByName).toHaveBeenCalledWith('John Smith', undefined);
        expect(databaseIntegrationService.searchByEmail).toHaveBeenCalledWith('j.smith@university.edu', undefined);
      });

      it('should search by name only', async () => {
        const result = await manualReviewerSearchService.searchMultipleCriteria({
          name: 'John Smith',
        });

        expect(result.searchTerm).toBe('name:John Smith');
        expect(databaseIntegrationService.searchByName).toHaveBeenCalledWith('John Smith', undefined);
        expect(databaseIntegrationService.searchByEmail).not.toHaveBeenCalled();
      });

      it('should search by email only', async () => {
        const result = await manualReviewerSearchService.searchMultipleCriteria({
          email: 'j.smith@university.edu',
        });

        expect(result.searchTerm).toBe('email:j.smith@university.edu');
        expect(databaseIntegrationService.searchByEmail).toHaveBeenCalledWith('j.smith@university.edu', undefined);
        expect(databaseIntegrationService.searchByName).not.toHaveBeenCalled();
      });

      it('should deduplicate results from multiple searches', async () => {
        // Mock both searches to return the same author
        jest.spyOn(databaseIntegrationService, 'searchByName').mockResolvedValue(mockAuthors);
        jest.spyOn(databaseIntegrationService, 'searchByEmail').mockResolvedValue(mockAuthors);

        const result = await manualReviewerSearchService.searchMultipleCriteria({
          name: 'John Smith',
          email: 'j.smith@university.edu',
        });

        expect(result.authors).toHaveLength(1); // Should be deduplicated
        expect(result.totalFound).toBe(1);
      });

      it('should return suggestions when no results found', async () => {
        jest.spyOn(databaseIntegrationService, 'searchByName').mockResolvedValue([]);
        jest.spyOn(databaseIntegrationService, 'searchByEmail').mockResolvedValue([]);

        const result = await manualReviewerSearchService.searchMultipleCriteria({
          name: 'Nonexistent Author',
          email: 'nonexistent@email.com',
        });

        expect(result.authors).toHaveLength(0);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should handle errors gracefully', async () => {
        jest.spyOn(databaseIntegrationService, 'searchByName').mockRejectedValue(new Error('Database error'));

        const result = await manualReviewerSearchService.searchMultipleCriteria({
          name: 'John Smith',
        });

        expect(result.authors).toHaveLength(0);
        expect(result.totalFound).toBe(0);
      });
    });
  });

  describe('DatabaseIntegrationService manual search', () => {
    beforeEach(() => {
      // Mock the database clients
      jest.spyOn(databaseIntegrationService, 'searchByName').mockImplementation(async (name: string) => {
        if (name === 'John Smith') {
          return [
            {
              id: 'pubmed-author-1',
              name: 'John Smith',
              email: 'j.smith@university.edu',
              affiliations: [],
              publicationCount: 25,
              clinicalTrials: 2,
              retractions: 0,
              researchAreas: ['Computer Science'],
              meshTerms: ['Algorithms'],
            },
          ];
        }
        return [];
      });

      jest.spyOn(databaseIntegrationService, 'searchByEmail').mockImplementation(async (email: string) => {
        if (email === 'j.smith@university.edu') {
          return [
            {
              id: 'pubmed-author-1',
              name: 'John Smith',
              email: 'j.smith@university.edu',
              affiliations: [],
              publicationCount: 25,
              clinicalTrials: 2,
              retractions: 0,
              researchAreas: ['Computer Science'],
              meshTerms: ['Algorithms'],
            },
          ];
        }
        return [];
      });
    });

    it('should search authors by name across databases', async () => {
      const results = await databaseIntegrationService.searchByName('John Smith');

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('John Smith');
      expect(results[0]?.email).toBe('j.smith@university.edu');
    });

    it('should search authors by email across databases', async () => {
      const results = await databaseIntegrationService.searchByEmail('j.smith@university.edu');

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('John Smith');
      expect(results[0]?.email).toBe('j.smith@university.edu');
    });

    it('should return empty array for no matches', async () => {
      const results = await databaseIntegrationService.searchByName('Nonexistent Author');

      expect(results).toHaveLength(0);
    });

    it('should deduplicate authors by name', async () => {
      jest.spyOn(databaseIntegrationService, 'searchByName').mockResolvedValue([
        {
          id: 'pubmed-author-1',
          name: 'John Smith',
          email: 'j.smith@university.edu',
          affiliations: [],
          publicationCount: 25,
          clinicalTrials: 2,
          retractions: 0,
          researchAreas: ['Computer Science'],
          meshTerms: ['Algorithms'],
        },
        {
          id: 'elsevier-author-1',
          name: 'John Smith',
          email: 'j.smith@university.edu',
          affiliations: [],
          publicationCount: 30, // Higher publication count
          clinicalTrials: 3,
          retractions: 0,
          researchAreas: ['Computer Science'],
          meshTerms: ['Algorithms'],
        },
      ]);

      const results = await databaseIntegrationService.searchByName('John Smith');

      expect(results).toHaveLength(1);
      expect(results[0]?.publicationCount).toBe(30); // Should keep the one with higher publication count
    });
  });
});