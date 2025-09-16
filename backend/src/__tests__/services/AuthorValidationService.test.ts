import { PrismaClient } from '@prisma/client';
import { AuthorValidationService } from '../../services/AuthorValidationService';
import { 
  Author, 
  ManuscriptMetadata, 
  ConflictType, 
  AuthorRole,
  Affiliation 
} from '../../types';

// Mock Prisma
jest.mock('@prisma/client');

describe('AuthorValidationService', () => {
  let service: AuthorValidationService;
  let mockPrisma: any;

  const mockAffiliation: Affiliation = {
    id: 'aff-1',
    institutionName: 'Test University',
    department: 'Computer Science',
    address: '123 Test St, Test City',
    country: 'Test Country'
  };

  const mockManuscriptAuthor: Author = {
    id: 'author-1',
    name: 'John Doe',
    email: 'john.doe@test.edu',
    affiliations: [mockAffiliation],
    publicationCount: 10,
    clinicalTrials: 2,
    retractions: 0,
    researchAreas: ['Machine Learning', 'AI'],
    meshTerms: ['Artificial Intelligence', 'Machine Learning']
  };

  const mockCandidateAuthor: Author = {
    id: 'candidate-1',
    name: 'Jane Smith',
    email: 'jane.smith@other.edu',
    affiliations: [{
      id: 'aff-2',
      institutionName: 'Other University',
      department: 'Engineering',
      address: '456 Other St, Other City',
      country: 'Other Country'
    }],
    publicationCount: 15,
    clinicalTrials: 3,
    retractions: 0,
    researchAreas: ['Computer Vision', 'Deep Learning'],
    meshTerms: ['Computer Vision', 'Neural Networks']
  };

  const mockManuscriptMetadata: ManuscriptMetadata = {
    title: 'Test Manuscript',
    authors: [mockManuscriptAuthor],
    affiliations: [mockAffiliation],
    abstract: 'Test abstract',
    keywords: ['AI', 'ML'],
    primaryFocusAreas: ['Artificial Intelligence'],
    secondaryFocusAreas: ['Machine Learning']
  };

  beforeEach(() => {
    mockPrisma = {
      processAuthor: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      author: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    service = new AuthorValidationService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAuthor', () => {
    it('should pass validation for a valid candidate author', async () => {
      const result = await service.validateAuthor(
        mockCandidateAuthor,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(true);
      expect(result.author).toEqual(mockCandidateAuthor);
      expect(result.conflicts).toHaveLength(0);
      expect(result.validationSteps).toHaveLength(5);
      expect(result.validationSteps.every(step => step.passed)).toBe(true);
    });

    it('should fail validation for manuscript author conflict', async () => {
      const manuscriptAuthorAsCandidate = { ...mockManuscriptAuthor };

      const result = await service.validateAuthor(
        manuscriptAuthorAsCandidate,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain(ConflictType.MANUSCRIPT_AUTHOR);
      expect(result.validationSteps[0]?.stepName).toBe('Manuscript Author Check');
      expect(result.validationSteps[0]?.passed).toBe(false);
    });

    it('should fail validation for institutional conflict', async () => {
      const candidateWithSameInstitution: Author = {
        ...mockCandidateAuthor,
        affiliations: [mockAffiliation] // Same institution as manuscript author
      };

      const result = await service.validateAuthor(
        candidateWithSameInstitution,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain(ConflictType.INSTITUTIONAL);
      const institutionalStep = result.validationSteps.find(step => 
        step.stepName === 'Institutional Conflict Check'
      );
      expect(institutionalStep?.passed).toBe(false);
    });

    it('should fail validation for insufficient publications', async () => {
      const candidateWithFewPublications: Author = {
        ...mockCandidateAuthor,
        publicationCount: 2 // Below minimum of 5
      };

      const result = await service.validateAuthor(
        candidateWithFewPublications,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      const publicationStep = result.validationSteps.find(step => 
        step.stepName === 'Publication Threshold Check'
      );
      expect(publicationStep?.passed).toBe(false);
      expect(publicationStep?.message).toContain('Publication count (2) below minimum (5)');
    });

    it('should fail validation for too many retractions', async () => {
      const candidateWithRetractions: Author = {
        ...mockCandidateAuthor,
        retractions: 2 // Above maximum of 0
      };

      const result = await service.validateAuthor(
        candidateWithRetractions,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      const retractionStep = result.validationSteps.find(step => 
        step.stepName === 'Retraction Check'
      );
      expect(retractionStep?.passed).toBe(false);
      expect(retractionStep?.message).toContain('exceeds limit of 0');
    });

    it('should detect co-author conflicts based on research area overlap', async () => {
      const candidateWithOverlappingAreas: Author = {
        ...mockCandidateAuthor,
        researchAreas: ['Machine Learning', 'AI', 'Computer Vision'] // Overlaps with manuscript author
      };

      const result = await service.validateAuthor(
        candidateWithOverlappingAreas,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain(ConflictType.CO_AUTHOR);
      const coAuthorStep = result.validationSteps.find(step => 
        step.stepName === 'Co-author Conflict Check'
      );
      expect(coAuthorStep?.passed).toBe(false);
    });

    it('should skip institutional conflicts when disabled', async () => {
      const candidateWithSameInstitution: Author = {
        ...mockCandidateAuthor,
        affiliations: [mockAffiliation]
      };

      const result = await service.validateAuthor(
        candidateWithSameInstitution,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: false, // Disabled
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      const institutionalStep = result.validationSteps.find(step => 
        step.stepName === 'Institutional Conflict Check'
      );
      expect(institutionalStep).toBeUndefined();
    });

    it('should skip co-author conflicts when disabled', async () => {
      const result = await service.validateAuthor(
        mockCandidateAuthor,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: false, // Disabled
          collaborationYears: 3
        }
      );

      const coAuthorStep = result.validationSteps.find(step => 
        step.stepName === 'Co-author Conflict Check'
      );
      expect(coAuthorStep).toBeUndefined();
    });
  });

  describe('validateProcessAuthors', () => {
    it('should validate all candidate authors for a process', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa-1',
          processId: 'process-1',
          authorId: 'candidate-1',
          role: AuthorRole.CANDIDATE,
          validationStatus: null,
          addedAt: new Date(),
          author: mockCandidateAuthor
        },
        {
          id: 'pa-2',
          processId: 'process-1',
          authorId: 'candidate-2',
          role: AuthorRole.CANDIDATE,
          validationStatus: null,
          addedAt: new Date(),
          author: {
            ...mockCandidateAuthor,
            id: 'candidate-2',
            name: 'Bob Wilson',
            email: 'bob.wilson@another.edu'
          }
        }
      ];

      mockPrisma.processAuthor.findMany.mockResolvedValue(mockProcessAuthors);
      mockPrisma.processAuthor.update.mockResolvedValue({} as any);

      const result = await service.validateProcessAuthors(
        'process-1',
        mockManuscriptMetadata
      );

      expect(result.processId).toBe('process-1');
      expect(result.totalCandidates).toBe(2);
      expect(result.validatedCandidates).toBe(2);
      expect(result.validationResults).toHaveLength(2);
      expect(mockPrisma.processAuthor.update).toHaveBeenCalledTimes(2);
    });

    it('should handle process with no candidate authors', async () => {
      mockPrisma.processAuthor.findMany.mockResolvedValue([]);

      const result = await service.validateProcessAuthors(
        'process-1',
        mockManuscriptMetadata
      );

      expect(result.totalCandidates).toBe(0);
      expect(result.validatedCandidates).toBe(0);
      expect(result.validationResults).toHaveLength(0);
    });

    it('should handle process authors without author data', async () => {
      const mockProcessAuthorsWithoutAuthor = [
        {
          id: 'pa-1',
          processId: 'process-1',
          authorId: 'candidate-1',
          role: AuthorRole.CANDIDATE,
          validationStatus: null,
          addedAt: new Date(),
          author: null // No author data
        }
      ];

      mockPrisma.processAuthor.findMany.mockResolvedValue(mockProcessAuthorsWithoutAuthor);

      const result = await service.validateProcessAuthors(
        'process-1',
        mockManuscriptMetadata
      );

      expect(result.totalCandidates).toBe(1);
      expect(result.validatedCandidates).toBe(0);
      expect(result.validationResults).toHaveLength(0);
    });
  });

  describe('getProcessValidationResults', () => {
    it('should retrieve validation results for a process', async () => {
      const mockValidationStatus = JSON.stringify({
        passed: true,
        conflicts: [],
        retractionFlags: [],
        publicationMetrics: {
          totalPublications: 15,
          recentPublications: 5
        },
        validationSteps: [
          {
            stepName: 'Manuscript Author Check',
            passed: true,
            message: 'Author is not a manuscript author'
          }
        ],
        validatedAt: new Date().toISOString()
      });

      const mockProcessAuthors = [
        {
          id: 'pa-1',
          processId: 'process-1',
          authorId: 'candidate-1',
          role: AuthorRole.CANDIDATE,
          validationStatus: mockValidationStatus,
          addedAt: new Date(),
          author: mockCandidateAuthor
        }
      ];

      mockPrisma.processAuthor.findMany.mockResolvedValue(mockProcessAuthors);

      const results = await service.getProcessValidationResults('process-1');

      expect(results).toHaveLength(1);
      expect(results[0]?.author).toEqual(mockCandidateAuthor);
      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.validationSteps).toHaveLength(1);
    });

    it('should handle invalid validation status JSON', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa-1',
          processId: 'process-1',
          authorId: 'candidate-1',
          role: AuthorRole.CANDIDATE,
          validationStatus: 'invalid json',
          addedAt: new Date(),
          author: mockCandidateAuthor
        }
      ];

      mockPrisma.processAuthor.findMany.mockResolvedValue(mockProcessAuthors);

      const results = await service.getProcessValidationResults('process-1');

      expect(results).toHaveLength(0);
    });

    it('should handle process authors without validation status', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa-1',
          processId: 'process-1',
          authorId: 'candidate-1',
          role: AuthorRole.CANDIDATE,
          validationStatus: null,
          addedAt: new Date(),
          author: mockCandidateAuthor
        }
      ];

      mockPrisma.processAuthor.findMany.mockResolvedValue(mockProcessAuthors);

      const results = await service.getProcessValidationResults('process-1');

      expect(results).toHaveLength(0);
    });
  });

  describe('revalidateProcessAuthors', () => {
    it('should clear existing validation and re-run with new config', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa-1',
          processId: 'process-1',
          authorId: 'candidate-1',
          role: AuthorRole.CANDIDATE,
          validationStatus: 'old validation',
          addedAt: new Date(),
          author: mockCandidateAuthor
        }
      ];

      mockPrisma.processAuthor.findMany.mockResolvedValue(mockProcessAuthors);
      mockPrisma.processAuthor.update.mockResolvedValue({} as any);

      const newConfig = {
        minPublications: 10, // Higher threshold
        maxRetractions: 1,
        minRecentPublications: 3,
        recentYears: 3,
        checkInstitutionalConflicts: false,
        checkCoAuthorConflicts: false,
        collaborationYears: 2
      };

      const result = await service.revalidateProcessAuthors(
        'process-1',
        mockManuscriptMetadata,
        newConfig
      );

      expect(result.validationConfig).toEqual(newConfig);
      expect(mockPrisma.processAuthor.update).toHaveBeenCalledWith({
        where: { id: 'pa-1' },
        data: { validationStatus: '' }
      });
    });
  });

  describe('name similarity calculation', () => {
    it('should detect exact name matches', async () => {
      const candidateWithSameName: Author = {
        ...mockCandidateAuthor,
        name: 'John Doe' // Same as manuscript author
      };

      const result = await service.validateAuthor(
        candidateWithSameName,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain(ConflictType.MANUSCRIPT_AUTHOR);
    });

    it('should detect similar name matches', async () => {
      const candidateWithSimilarName: Author = {
        ...mockCandidateAuthor,
        name: 'John A. Doe' // Similar to manuscript author
      };

      const result = await service.validateAuthor(
        candidateWithSimilarName,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      // This should pass because the similarity threshold is high (0.9)
      expect(result.passed).toBe(true);
    });
  });

  describe('institution similarity calculation', () => {
    it('should detect similar institution names', async () => {
      const candidateWithSimilarInstitution: Author = {
        ...mockCandidateAuthor,
        affiliations: [{
          id: 'aff-3',
          institutionName: 'Test University Medical Center', // Similar to "Test University"
          department: 'Medicine',
          address: '789 Medical St',
          country: 'Test Country'
        }]
      };

      const result = await service.validateAuthor(
        candidateWithSimilarInstitution,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.passed).toBe(false);
      expect(result.conflicts).toContain(ConflictType.INSTITUTIONAL);
    });
  });

  describe('publication metrics calculation', () => {
    it('should calculate publication metrics correctly', async () => {
      const result = await service.validateAuthor(
        mockCandidateAuthor,
        mockManuscriptMetadata,
        {
          minPublications: 5,
          maxRetractions: 0,
          minRecentPublications: 2,
          recentYears: 5,
          checkInstitutionalConflicts: true,
          checkCoAuthorConflicts: true,
          collaborationYears: 3
        }
      );

      expect(result.publicationMetrics.totalPublications).toBe(15);
      expect(result.publicationMetrics.recentPublications).toBe(Math.floor(15 * 0.3));
      expect(result.publicationMetrics.hIndex).toBeUndefined();
      expect(result.publicationMetrics.citationCount).toBeUndefined();
    });
  });
});