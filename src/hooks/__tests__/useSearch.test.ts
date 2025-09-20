/**
 * Tests for search-related React Query hooks
 * Verifies search initiation, status tracking, and manual search functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { 
  useInitiateSearch, 
  useSearchStatus, 
  useSearchByName, 
  useSearchByEmail,
  useSearchProgress 
} from '../useSearch';
import { searchService } from '../../services/searchService';
import type { SearchStatus, Author } from '../../types/api';

// Mock the search service
vi.mock('../../services/searchService', () => ({
  searchService: {
    initiateSearch: vi.fn(),
    getSearchStatus: vi.fn(),
    searchByName: vi.fn(),
    searchByEmail: vi.fn(),
  },
}));

const mockSearchService = searchService as any;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Search Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInitiateSearch', () => {
    it('should initiate search successfully', async () => {
      const wrapper = createWrapper();
      mockSearchService.initiateSearch.mockResolvedValue(undefined);

      const { result } = renderHook(() => useInitiateSearch(), { wrapper });

      const searchRequest = {
        keywords: ['machine learning'],
        databases: ['pubmed'],
        searchOptions: {
          maxResults: 100,
          dateRange: {
            from: '2023-01-01T00:00:00.000Z',
            to: '2024-01-01T00:00:00.000Z'
          }
        }
      };

      await result.current.mutateAsync({
        processId: 'process-123',
        request: searchRequest
      });

      expect(mockSearchService.initiateSearch).toHaveBeenCalledWith(
        'process-123',
        searchRequest
      );
    });

    it('should handle search initiation errors', async () => {
      const wrapper = createWrapper();
      const error = new Error('Search initiation failed');
      mockSearchService.initiateSearch.mockRejectedValue(error);

      const { result } = renderHook(() => useInitiateSearch(), { wrapper });

      await expect(
        result.current.mutateAsync({
          processId: 'process-123',
          request: {
            keywords: ['test'],
            databases: ['pubmed'],
            searchOptions: {
              maxResults: 100,
              dateRange: {
                from: '2023-01-01T00:00:00.000Z',
                to: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        })
      ).rejects.toThrow('Search initiation failed');
    });
  });

  describe('useSearchStatus', () => {
    it('should fetch search status successfully', async () => {
      const wrapper = createWrapper();
      const mockStatus: SearchStatus = {
        status: 'IN_PROGRESS',
        progress: {
          pubmed: { status: 'COMPLETED', count: 100 },
          elsevier: { status: 'IN_PROGRESS', count: 50 },
          wiley: { status: 'PENDING', count: 0 },
          taylorFrancis: { status: 'PENDING', count: 0 }
        },
        totalFound: 150
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(
        () => useSearchStatus('process-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStatus);
      });

      expect(mockSearchService.getSearchStatus).toHaveBeenCalledWith('process-123');
    });

    it('should not fetch when processId is empty', () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useSearchStatus(''),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockSearchService.getSearchStatus).not.toHaveBeenCalled();
    });

    it('should not fetch when disabled', () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useSearchStatus('process-123', false),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockSearchService.getSearchStatus).not.toHaveBeenCalled();
    });
  });

  describe('useSearchByName', () => {
    it('should search by name successfully', async () => {
      const wrapper = createWrapper();
      const mockAuthors: Author[] = [
        {
          id: 'author-1',
          name: 'John Smith',
          email: 'john@example.com',
          affiliation: 'University',
          country: 'US',
          publicationCount: 10,
          recentPublications: [],
          expertise: [],
          database: 'pubmed',
          matchScore: 0.9
        }
      ];

      mockSearchService.searchByName.mockResolvedValue(mockAuthors);

      const { result } = renderHook(() => useSearchByName(), { wrapper });

      const searchResult = await result.current.mutateAsync({
        processId: 'process-123',
        name: 'John Smith'
      });

      expect(searchResult).toEqual(mockAuthors);
      expect(mockSearchService.searchByName).toHaveBeenCalledWith(
        'process-123',
        'John Smith'
      );
    });

    it('should handle search by name errors', async () => {
      const wrapper = createWrapper();
      const error = new Error('Name search failed');
      mockSearchService.searchByName.mockRejectedValue(error);

      const { result } = renderHook(() => useSearchByName(), { wrapper });

      await expect(
        result.current.mutateAsync({
          processId: 'process-123',
          name: 'John Smith'
        })
      ).rejects.toThrow('Name search failed');
    });
  });

  describe('useSearchByEmail', () => {
    it('should search by email successfully', async () => {
      const wrapper = createWrapper();
      const mockAuthors: Author[] = [
        {
          id: 'author-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          affiliation: 'Research Institute',
          country: 'UK',
          publicationCount: 25,
          recentPublications: [],
          expertise: [],
          database: 'elsevier',
          matchScore: 1.0
        }
      ];

      mockSearchService.searchByEmail.mockResolvedValue(mockAuthors);

      const { result } = renderHook(() => useSearchByEmail(), { wrapper });

      const searchResult = await result.current.mutateAsync({
        processId: 'process-123',
        email: 'jane@example.com'
      });

      expect(searchResult).toEqual(mockAuthors);
      expect(mockSearchService.searchByEmail).toHaveBeenCalledWith(
        'process-123',
        'jane@example.com'
      );
    });

    it('should handle search by email errors', async () => {
      const wrapper = createWrapper();
      const error = new Error('Email search failed');
      mockSearchService.searchByEmail.mockRejectedValue(error);

      const { result } = renderHook(() => useSearchByEmail(), { wrapper });

      await expect(
        result.current.mutateAsync({
          processId: 'process-123',
          email: 'jane@example.com'
        })
      ).rejects.toThrow('Email search failed');
    });
  });

  describe('useSearchProgress', () => {
    it('should calculate progress correctly for in-progress search', async () => {
      const wrapper = createWrapper();
      const mockStatus: SearchStatus = {
        status: 'IN_PROGRESS',
        progress: {
          pubmed: { status: 'COMPLETED', count: 100 },
          elsevier: { status: 'COMPLETED', count: 75 },
          wiley: { status: 'IN_PROGRESS', count: 25 },
          taylorFrancis: { status: 'PENDING', count: 0 }
        },
        totalFound: 200
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(
        () => useSearchProgress('process-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('IN_PROGRESS');
        expect(result.current.totalFound).toBe(200);
        expect(result.current.progressPercentage).toBe(50); // 2 out of 4 databases completed
        expect(result.current.isSearching).toBe(true);
        expect(result.current.isCompleted).toBe(false);
        expect(result.current.isFailed).toBe(false);
      });
    });

    it('should handle completed search status', async () => {
      const wrapper = createWrapper();
      const mockStatus: SearchStatus = {
        status: 'COMPLETED',
        progress: {
          pubmed: { status: 'COMPLETED', count: 150 },
          elsevier: { status: 'COMPLETED', count: 120 },
          wiley: { status: 'COMPLETED', count: 80 },
          taylorFrancis: { status: 'COMPLETED', count: 50 }
        },
        totalFound: 400
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(
        () => useSearchProgress('process-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('COMPLETED');
        expect(result.current.totalFound).toBe(400);
        expect(result.current.progressPercentage).toBe(100);
        expect(result.current.isSearching).toBe(false);
        expect(result.current.isCompleted).toBe(true);
        expect(result.current.isFailed).toBe(false);
      });
    });

    it('should handle failed search status', async () => {
      const wrapper = createWrapper();
      const mockStatus: SearchStatus = {
        status: 'FAILED',
        progress: {
          pubmed: { status: 'FAILED', count: 0 },
          elsevier: { status: 'FAILED', count: 0 },
          wiley: { status: 'FAILED', count: 0 },
          taylorFrancis: { status: 'FAILED', count: 0 }
        },
        totalFound: 0
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(
        () => useSearchProgress('process-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('FAILED');
        expect(result.current.totalFound).toBe(0);
        expect(result.current.progressPercentage).toBe(0);
        expect(result.current.isSearching).toBe(false);
        expect(result.current.isCompleted).toBe(false);
        expect(result.current.isFailed).toBe(true);
      });
    });

    it('should handle empty progress data', async () => {
      const wrapper = createWrapper();
      const mockStatus: SearchStatus = {
        status: 'PENDING',
        progress: {},
        totalFound: 0
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(
        () => useSearchProgress('process-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.progressPercentage).toBe(0);
        expect(result.current.isSearching).toBe(true); // PENDING is considered searching
      });
    });
  });
});