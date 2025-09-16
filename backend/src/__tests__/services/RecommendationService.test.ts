import { PrismaClient } from '@prisma/client';
import { RecommendationService, RecommendationFilters, SortOptions } from '../../services/RecommendationService';
import { AuthorRole, ConflictType } from '../../types';

// Mock Prisma
jest.mock('@prisma/client');

describe('RecommendationService', () => {
  let service: RecommendationService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockProcessAuthorRepository: any;

  const mockProcessId = 'test-process-id';

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    
    // Mock ProcessAuthorRepository
    mockProcessAuthorRepository = {
      findByProcessAndRole: jest.fn(),
    };

    service = new RecommendationService(mockPrisma);
    (service as any).processAuthorRepository = mockProcessAuthorRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getValidatedCandidates', () => {
    it('should return transformed candidates with validation results', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa1',
          author: {
            id: 'author1',
            name: 'Dr. Alice Johnson',
            email: 'alice@example.com',
            publicationCount: 25,
            clinicalTrials: 5,
            retractions: 0,
            researchAreas: '["Machine Learning", "Data Science"]',
            meshTerms: '["Algorithms", "Neural Networks"]',
            affiliations: [{
              affiliation: {
                id: 'aff1',
                institutionName: 'Harvard University',
                department: 'Computer Science',
                address: 'Cambridge, MA',
                country: 'United States'
              }
            }]
          },
          validationStatus: JSON.stringify({
            passed: true,
            conflicts: [],
            retractionFlags: [],
            publicationMetrics: { totalPublications: 25, recentPublications: 8 }
          })
        },
        {
          id: 'pa2',
          author: {
            id: 'author2',
            name: 'Prof. Bob Smith',
            email: 'bob@example.com',
            publicationCount: 18,
            clinicalTrials: 2,
            retractions: 1,
            researchAreas: '["Artificial Intelligence"]',
            meshTerms: '["Machine Learning"]',
            affiliations: [{
              affiliation: {
                id: 'aff2',
                institutionName: 'Oxford University',
                department: 'Engineering',
                address: 'Oxford, UK',
                country: 'United Kingdom'
              }
            }]
          },
          validationStatus: JSON.stringify({
            passed: false,
            conflicts: [ConflictType.INSTITUTIONAL],
            retractionFlags: [{
              publicationTitle: 'Retracted Paper',
              journal: 'Test Journal',
              retractionDate: new Date(),
              reason: 'Data issues'
            }],
            publicationMetrics: { totalPublications: 18, recentPublications: 5 }
          })
        }
      ];

      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue(mockProcessAuthors);

      const result = await service.getValidatedCandidates(mockProcessId);

      expect(mockProcessAuthorRepository.findByProcessAndRole).toHaveBeenCalledWith(
        mockProcessId,
        AuthorRole.CANDIDATE
      );

      expect(result).toHaveLength(2);
      
      // Check first candidate
      expect(result[0]).toMatchObject({
        id: 'author1',
        name: 'Dr. Alice Johnson',
        email: 'alice@example.com',
        publicationCount: 25,
        clinicalTrials: 5,
        retractions: 0,
        researchAreas: ['Machine Learning', 'Data Science'],
        meshTerms: ['Algorithms', 'Neural Networks']
      });
      
      expect(result[0]!.validationResult).toMatchObject({
        passed: true,
        conflicts: [],
        retractionFlags: []
      });
      
      expect(result[0]!.primaryAffiliation).toMatchObject({
        institutionName: 'Harvard University',
        country: 'United States',
        department: 'Computer Science'
      });
      
      expect(result[0]!.relevanceScore).toBeGreaterThan(0);

      // Check second candidate
      expect(result[1]).toMatchObject({
        id: 'author2',
        name: 'Prof. Bob Smith',
        publicationCount: 18
      });
      
      expect(result[1]!.validationResult).toMatchObject({
        passed: false,
        conflicts: [ConflictType.INSTITUTIONAL]
      });
    });

    it('should handle candidates without validation status', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa1',
          author: {
            id: 'author1',
            name: 'Dr. Test Author',
            email: null,
            publicationCount: 10,
            clinicalTrials: 0,
            retractions: 0,
            researchAreas: '[]',
            meshTerms: '[]',
            affiliations: []
          },
          validationStatus: null
        }
      ];

      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue(mockProcessAuthors);

      const result = await service.getValidatedCandidates(mockProcessId);

      expect(result).toHaveLength(1);
      expect(result[0]!.validationResult).toBeUndefined();
      expect(result[0]!.primaryAffiliation).toBeUndefined();
      expect(result[0]!.relevanceScore).toBeGreaterThan(0);
    });

    it('should skip candidates without author data', async () => {
      const mockProcessAuthors = [
        {
          id: 'pa1',
          author: null,
          validationStatus: null
        },
        {
          id: 'pa2',
          author: {
            id: 'author2',
            name: 'Valid Author',
            email: null,
            publicationCount: 5,
            clinicalTrials: 0,
            retractions: 0,
            researchAreas: '[]',
            meshTerms: '[]',
            affiliations: []
          },
          validationStatus: null
        }
      ];

      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue(mockProcessAuthors);

      const result = await service.getValidatedCandidates(mockProcessId);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Valid Author');
    });
  });

  describe('getRecommendations', () => {
    beforeEach(() => {
      // Mock getValidatedCandidates
      const mockCandidates = [
        {
          id: 'author1',
          name: 'Dr. Alice Johnson',
          email: 'alice@example.com',
          publicationCount: 25,
          clinicalTrials: 5,
          retractions: 0,
          researchAreas: ['Machine Learning'],
          meshTerms: ['Algorithms'],
          affiliations: [{
            id: 'aff1',
            institutionName: 'Harvard University',
            department: 'Computer Science',
            address: 'Cambridge, MA',
            country: 'United States'
          }],
          validationResult: {
            author: {} as any,
            passed: true,
            conflicts: [],
            retractionFlags: [],
            publicationMetrics: { totalPublications: 25, recentPublications: 8 }
          },
          relevanceScore: 85,
          primaryAffiliation: {
            institutionName: 'Harvard University',
            country: 'United States',
            department: 'Computer Science'
          }
        },
        {
          id: 'author2',
          name: 'Prof. Bob Smith',
          email: 'bob@example.com',
          publicationCount: 18,
          clinicalTrials: 2,
          retractions: 1,
          researchAreas: ['Artificial Intelligence'],
          meshTerms: ['Machine Learning'],
          affiliations: [{
            id: 'aff2',
            institutionName: 'Oxford University',
            department: 'Engineering',
            address: 'Oxford, UK',
            country: 'United Kingdom'
          }],
          validationResult: {
            author: {} as any,
            passed: false,
            conflicts: [ConflictType.INSTITUTIONAL],
            retractionFlags: [],
            publicationMetrics: { totalPublications: 18, recentPublications: 5 }
          },
          relevanceScore: 65,
          primaryAffiliation: {
            institutionName: 'Oxford University',
            country: 'United Kingdom',
            department: 'Engineering'
          }
        },
        {
          id: 'author3',
          name: 'Dr. Carol Davis',
          email: 'carol@example.com',
          publicationCount: 12,
          clinicalTrials: 8,
          retractions: 0,
          researchAreas: ['Biomedical Engineering'],
          meshTerms: ['Medical Imaging'],
          affiliations: [{
            id: 'aff3',
            institutionName: 'MIT',
            department: 'Biomedical Engineering',
            address: 'Cambridge, MA',
            country: 'United States'
          }],
          validationResult: {
            author: {} as any,
            passed: true,
            conflicts: [],
            retractionFlags: [],
            publicationMetrics: { totalPublications: 12, recentPublications: 4 }
          },
          relevanceScore: 75,
          primaryAffiliation: {
            institutionName: 'MIT',
            country: 'United States',
            department: 'Biomedical Engineering'
          }
        }
      ];

      jest.spyOn(service, 'getValidatedCandidates').mockResolvedValue(mockCandidates);
    });

    it('should return all candidates with default settings', async () => {
      const result = await service.getRecommendations(mockProcessId);

      expect(result.totalCount).toBe(3);
      expect(result.filteredCount).toBe(3);
      expect(result.candidates).toHaveLength(3);
      expect(result.appliedFilters).toEqual({});
      expect(result.sortOptions).toBeUndefined();
      
      // Should be sorted by relevance score by default (descending)
      expect(result.candidates[0]!.relevanceScore).toBeGreaterThanOrEqual(result.candidates[1]!.relevanceScore!);
      expect(result.candidates[1]!.relevanceScore).toBeGreaterThanOrEqual(result.candidates[2]!.relevanceScore!);
    });

    it('should filter by minimum publications', async () => {
      const filters: RecommendationFilters = { minPublications: 15 };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.totalCount).toBe(3);
      expect(result.filteredCount).toBe(2); // Only Alice (25) and Bob (18)
      expect(result.candidates).toHaveLength(2);
      expect(result.appliedFilters).toEqual(filters);
      
      result.candidates.forEach(candidate => {
        expect(candidate.publicationCount).toBeGreaterThanOrEqual(15);
      });
    });

    it('should filter by maximum retractions', async () => {
      const filters: RecommendationFilters = { maxRetractions: 0 };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(2); // Alice and Carol have 0 retractions
      
      result.candidates.forEach(candidate => {
        expect(candidate.retractions).toBe(0);
      });
    });

    it('should filter by countries', async () => {
      const filters: RecommendationFilters = { countries: ['United States'] };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(2); // Alice and Carol are in US
      
      result.candidates.forEach(candidate => {
        const candidateCountries = candidate.affiliations.map(aff => aff.country);
        expect(candidateCountries).toContain('United States');
      });
    });

    it('should filter by institutions', async () => {
      const filters: RecommendationFilters = { institutions: ['Harvard'] };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(1); // Only Alice is at Harvard
      expect(result.candidates[0]!.name).toBe('Dr. Alice Johnson');
    });

    it('should filter by research areas', async () => {
      const filters: RecommendationFilters = { researchAreas: ['Machine Learning'] };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(1); // Only Alice has Machine Learning
      expect(result.candidates[0]!.name).toBe('Dr. Alice Johnson');
    });

    it('should filter by validation status', async () => {
      const filters: RecommendationFilters = { onlyValidated: true };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(2); // Alice and Carol passed validation
      
      result.candidates.forEach(candidate => {
        expect(candidate.validationResult?.passed).toBe(true);
      });
    });

    it('should exclude specific conflicts', async () => {
      const filters: RecommendationFilters = { excludeConflicts: [ConflictType.INSTITUTIONAL] };
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(2); // Exclude Bob who has institutional conflict
      
      result.candidates.forEach(candidate => {
        if (candidate.validationResult?.conflicts) {
          expect(candidate.validationResult.conflicts).not.toContain(ConflictType.INSTITUTIONAL);
        }
      });
    });

    it('should sort by publication count ascending', async () => {
      const sortOptions: SortOptions = { field: 'publicationCount', order: 'asc' };
      const result = await service.getRecommendations(mockProcessId, {}, sortOptions);

      expect(result.sortOptions).toEqual(sortOptions);
      
      // Should be sorted by publication count ascending
      for (let i = 1; i < result.candidates.length; i++) {
        expect(result.candidates[i]!.publicationCount).toBeGreaterThanOrEqual(
          result.candidates[i - 1]!.publicationCount
        );
      }
    });

    it('should sort by name descending', async () => {
      const sortOptions: SortOptions = { field: 'name', order: 'desc' };
      const result = await service.getRecommendations(mockProcessId, {}, sortOptions);

      // Should be sorted by name descending
      for (let i = 1; i < result.candidates.length; i++) {
        const currentName = result.candidates[i]!.name.toLowerCase();
        const previousName = result.candidates[i - 1]!.name.toLowerCase();
        expect(currentName.localeCompare(previousName)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle pagination', async () => {
      const result = await service.getRecommendations(mockProcessId, {}, undefined, 1, 2);

      expect(result.candidates).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.filteredCount).toBe(3);
    });

    it('should generate suggestions when no results found', async () => {
      const filters: RecommendationFilters = { minPublications: 100 }; // Unrealistic threshold
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(0);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
      expect(result.suggestions![0]).toHaveProperty('type');
      expect(result.suggestions![0]).toHaveProperty('message');
      expect(result.suggestions![0]).toHaveProperty('suggestedFilter');
    });

    it('should generate suggestions when few results found', async () => {
      // Mock more candidates to trigger the suggestion logic
      const mockCandidatesWithMore = [
        ...Array(15).fill(null).map((_, i) => ({
          id: `author${i + 4}`,
          name: `Dr. Test Author ${i + 4}`,
          email: `test${i + 4}@example.com`,
          publicationCount: 5 + i,
          clinicalTrials: 0,
          retractions: 0,
          researchAreas: ['Test Area'],
          meshTerms: ['Test Term'],
          affiliations: [{
            id: `aff${i + 4}`,
            institutionName: 'Test University',
            department: 'Test Department',
            address: 'Test Address',
            country: 'Test Country'
          }],
          validationResult: {
            author: {} as any,
            passed: true,
            conflicts: [],
            retractionFlags: [],
            publicationMetrics: { totalPublications: 5 + i, recentPublications: 2 }
          },
          relevanceScore: 50 + i,
          primaryAffiliation: {
            institutionName: 'Test University',
            country: 'Test Country',
            department: 'Test Department'
          }
        }))
      ];

      jest.spyOn(service, 'getValidatedCandidates').mockResolvedValue(mockCandidatesWithMore);

      const filters: RecommendationFilters = { minPublications: 18 }; // Only few qualify
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBeLessThan(5);
      expect(result.totalCount).toBeGreaterThan(10);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should combine multiple filters correctly', async () => {
      const filters: RecommendationFilters = {
        minPublications: 10,
        maxRetractions: 0,
        countries: ['United States'],
        onlyValidated: true
      };
      
      const result = await service.getRecommendations(mockProcessId, filters);

      expect(result.filteredCount).toBe(2); // Alice and Carol meet all criteria
      expect(result.appliedFilters).toEqual(filters);
      
      result.candidates.forEach(candidate => {
        expect(candidate.publicationCount).toBeGreaterThanOrEqual(10);
        expect(candidate.retractions).toBe(0);
        expect(candidate.validationResult?.passed).toBe(true);
        const candidateCountries = candidate.affiliations.map(aff => aff.country);
        expect(candidateCountries).toContain('United States');
      });
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options', async () => {
      const mockCandidates = [
        {
          id: 'author1',
          name: 'Dr. Alice Johnson',
          email: 'alice@example.com',
          publicationCount: 25,
          clinicalTrials: 5,
          retractions: 0,
          researchAreas: ['Machine Learning', 'Data Science'],
          meshTerms: ['Algorithms'],
          affiliations: [{
            id: 'aff1',
            institutionName: 'Harvard University',
            department: 'Computer Science',
            address: 'Cambridge, MA',
            country: 'United States'
          }],
          relevanceScore: 85
        },
        {
          id: 'author2',
          name: 'Prof. Bob Smith',
          email: 'bob@example.com',
          publicationCount: 18,
          clinicalTrials: 2,
          retractions: 1,
          researchAreas: ['Artificial Intelligence'],
          meshTerms: ['Machine Learning'],
          affiliations: [{
            id: 'aff2',
            institutionName: 'Oxford University',
            department: 'Engineering',
            address: 'Oxford, UK',
            country: 'United Kingdom'
          }],
          relevanceScore: 65
        }
      ];

      jest.spyOn(service, 'getValidatedCandidates').mockResolvedValue(mockCandidates);

      const result = await service.getFilterOptions(mockProcessId);

      expect(result.countries).toEqual(['United Kingdom', 'United States']);
      expect(result.institutions).toEqual(['Harvard University', 'Oxford University']);
      expect(result.researchAreas).toEqual(['Artificial Intelligence', 'Data Science', 'Machine Learning']);
      
      expect(result.publicationRange).toEqual({ min: 18, max: 25 });
      expect(result.retractionRange).toEqual({ min: 0, max: 1 });
      expect(result.clinicalTrialRange).toEqual({ min: 2, max: 5 });
    });

    it('should handle empty candidates list', async () => {
      jest.spyOn(service, 'getValidatedCandidates').mockResolvedValue([]);

      const result = await service.getFilterOptions(mockProcessId);

      expect(result.countries).toEqual([]);
      expect(result.institutions).toEqual([]);
      expect(result.researchAreas).toEqual([]);
      
      expect(result.publicationRange).toEqual({ min: 0, max: 0 });
      expect(result.retractionRange).toEqual({ min: 0, max: 0 });
      expect(result.clinicalTrialRange).toEqual({ min: 0, max: 0 });
    });
  });
});