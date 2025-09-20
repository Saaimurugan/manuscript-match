/**
 * Tests for recommendation service
 * Ensures proper integration with backend API for reviewer recommendations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recommendationService } from '../recommendationService';
import { apiService } from '../apiService';
import type { PaginatedResponse, Reviewer, RecommendationRequest } from '../../types/api';

// Mock the API service
vi.mock('../apiService', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

const mockApiService = vi.mocked(apiService);

describe('RecommendationService', () => {
  const processId = 'test-process-id';
  
  const mockReviewer: Reviewer = {
    id: 'reviewer-1',
    name: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    affiliation: 'University of Technology',
    country: 'United States',
    publicationCount: 25,
    recentPublications: [
      'Machine Learning in Healthcare',
      'AI Applications in Medical Diagnosis'
    ],
    expertise: ['Machine Learning', 'Healthcare', 'Medical AI'],
    database: 'pubmed',
    matchScore: 85,
    validationStatus: {
      excludedAsManuscriptAuthor: false,
      excludedAsCoAuthor: false,
      hasMinimumPublications: true,
      hasAcceptableRetractions: true,
      hasInstitutionalConflict: false,
    },
  };

  const mockPaginatedResponse: PaginatedResponse<Reviewer> = {
    data: [mockReviewer],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should fetch recommendations without filters', async () => {
      mockApiService.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await recommendationService.getRecommendations(processId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/recommendations`,
        {}
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch recommendations with pagination', async () => {
      const request: RecommendationRequest = {
        page: 2,
        limit: 10,
      };

      mockApiService.get.mockResolvedValue({ data: mockPaginatedResponse });

      await recommendationService.getRecommendations(processId, request);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/recommendations`,
        { page: 2, limit: 10 }
      );
    });

    it('should fetch recommendations with filters', async () => {
      const request: RecommendationRequest = {
        filters: {
          minPublications: 10,
          maxPublications: 50,
          countries: ['United States', 'Canada'],
          databases: ['pubmed', 'elsevier'],
          expertise: ['Machine Learning'],
          search: 'healthcare',
        },
      };

      mockApiService.get.mockResolvedValue({ data: mockPaginatedResponse });

      await recommendationService.getRecommendations(processId, request);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/recommendations`,
        {
          minPublications: 10,
          maxPublications: 50,
          countries: 'United States,Canada',
          databases: 'pubmed,elsevier',
          expertise: 'Machine Learning',
          search: 'healthcare',
        }
      );
    });

    it('should fetch recommendations with sorting', async () => {
      const request: RecommendationRequest = {
        sort: {
          field: 'matchScore',
          direction: 'desc',
        },
      };

      mockApiService.get.mockResolvedValue({ data: mockPaginatedResponse });

      await recommendationService.getRecommendations(processId, request);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/recommendations`,
        {
          sortBy: 'matchScore',
          sortOrder: 'desc',
        }
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApiService.get.mockRejectedValue(error);

      await expect(
        recommendationService.getRecommendations(processId)
      ).rejects.toThrow('API Error');
    });
  });

  describe('getFilterOptions', () => {
    it('should fetch filter options from backend', async () => {
      const mockFilterOptions = {
        countries: ['United States', 'Canada', 'United Kingdom'],
        affiliationTypes: ['University', 'Research Institute', 'Hospital'],
        expertise: ['Machine Learning', 'Healthcare', 'Medical AI'],
        databases: ['pubmed', 'elsevier', 'wiley'],
        publicationRange: { min: 0, max: 100 },
      };

      mockApiService.get.mockResolvedValue({ data: mockFilterOptions });

      const result = await recommendationService.getFilterOptions(processId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/recommendations/filters`
      );
      expect(result).toEqual(mockFilterOptions);
    });
  });

  describe('getRecommendationStats', () => {
    it('should fetch stats from dedicated endpoint', async () => {
      const mockStats = {
        total: 50,
        byDatabase: { pubmed: 20, elsevier: 15, wiley: 15 },
        byCountry: { 'United States': 25, 'Canada': 15, 'United Kingdom': 10 },
        averageMatchScore: 75.5,
        averagePublications: 22.3,
      };

      mockApiService.get.mockResolvedValue({ data: mockStats });

      const result = await recommendationService.getRecommendationStats(processId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/recommendations/stats`
      );
      expect(result).toEqual(mockStats);
    });

    it('should fallback to calculating stats from all recommendations', async () => {
      // First call (stats endpoint) fails
      mockApiService.get.mockRejectedValueOnce(new Error('Stats endpoint not available'));
      
      // Second call (all recommendations) succeeds
      const mockAllRecommendations = {
        data: [mockReviewer, { ...mockReviewer, id: 'reviewer-2', matchScore: 70, publicationCount: 30 }],
        pagination: { total: 2, page: 1, limit: 1000, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      };
      mockApiService.get.mockResolvedValueOnce({ data: mockAllRecommendations });

      const result = await recommendationService.getRecommendationStats(processId);

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
      expect(mockApiService.get).toHaveBeenNthCalledWith(1, `/api/processes/${processId}/recommendations/stats`);
      expect(mockApiService.get).toHaveBeenNthCalledWith(2, `/api/processes/${processId}/recommendations`, { limit: 1000 });
      
      expect(result.total).toBe(2);
      expect(result.averageMatchScore).toBe(77.5); // (85 + 70) / 2
      expect(result.averagePublications).toBe(27.5); // (25 + 30) / 2
    });
  });
});