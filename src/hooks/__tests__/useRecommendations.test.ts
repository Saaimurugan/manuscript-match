/**
 * Tests for useRecommendations hooks
 * Ensures proper React Query integration for reviewer recommendations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useRecommendations, 
  usePaginatedRecommendations, 
  useRecommendationFilters,
  useFilteredRecommendations 
} from '../useRecommendations';
import { recommendationService } from '../../services/recommendationService';
import type { PaginatedResponse, Reviewer } from '../../types/api';

// Mock the recommendation service
vi.mock('../../services/recommendationService', () => ({
  recommendationService: {
    getRecommendations: vi.fn(),
    getFilterOptions: vi.fn(),
  },
}));

const mockRecommendationService = vi.mocked(recommendationService);

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useRecommendations hooks', () => {
  const processId = 'test-process-id';
  
  const mockReviewer: Reviewer = {
    id: 'reviewer-1',
    name: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    affiliation: 'University of Technology',
    country: 'United States',
    publicationCount: 25,
    recentPublications: ['Machine Learning in Healthcare'],
    expertise: ['Machine Learning', 'Healthcare'],
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

  describe('useRecommendations', () => {
    it('should fetch recommendations successfully', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => useRecommendations(processId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(processId, undefined);
    });

    it('should not fetch when processId is empty', () => {
      const { result } = renderHook(
        () => useRecommendations(''),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockRecommendationService.getRecommendations).not.toHaveBeenCalled();
    });

    it('should handle request parameters', async () => {
      const request = {
        page: 2,
        limit: 10,
        filters: { minPublications: 5 },
        sort: { field: 'matchScore' as const, direction: 'desc' as const },
      };

      mockRecommendationService.getRecommendations.mockResolvedValue(mockPaginatedResponse);

      renderHook(
        () => useRecommendations(processId, request),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(processId, request);
      });
    });
  });

  describe('usePaginatedRecommendations', () => {
    it('should fetch paginated recommendations', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePaginatedRecommendations(processId, 2, 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(processId, {
        page: 2,
        limit: 10,
        filters: undefined,
        sort: undefined,
      });
    });

    it('should use default pagination values', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockPaginatedResponse);

      renderHook(
        () => usePaginatedRecommendations(processId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(processId, {
          page: 1,
          limit: 20,
          filters: undefined,
          sort: undefined,
        });
      });
    });
  });

  describe('useRecommendationFilters', () => {
    it('should fetch filter options', async () => {
      const mockFilterOptions = {
        countries: ['United States', 'Canada'],
        affiliationTypes: ['University', 'Hospital'],
        expertise: ['Machine Learning', 'Healthcare'],
        databases: ['pubmed', 'elsevier'],
        publicationRange: { min: 0, max: 100 },
      };

      mockRecommendationService.getFilterOptions.mockResolvedValue(mockFilterOptions);

      const { result } = renderHook(
        () => useRecommendationFilters(processId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockFilterOptions);
      expect(mockRecommendationService.getFilterOptions).toHaveBeenCalledWith(processId);
    });
  });

  describe('useFilteredRecommendations', () => {
    it('should fetch filtered recommendations', async () => {
      const filters = { minPublications: 10, countries: ['United States'] };
      const sort = { field: 'matchScore' as const, direction: 'desc' as const };

      mockRecommendationService.getRecommendations.mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => useFilteredRecommendations(processId, filters, sort),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(processId, {
        filters,
        sort,
      });
    });

    it('should provide refetch function', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => useFilteredRecommendations(processId, {}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});