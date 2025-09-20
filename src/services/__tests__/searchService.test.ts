/**
 * Tests for SearchService
 * Verifies database search functionality, status tracking, and manual searches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchService } from '../searchService';
import { apiService } from '../apiService';
import type { SearchRequest, SearchStatus, Author } from '../../types/api';

// Mock the API service
vi.mock('../apiService', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockApiService = apiService as any;

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateSearch', () => {
    it('should initiate a database search successfully', async () => {
      const processId = 'process-123';
      const searchRequest: SearchRequest = {
        keywords: ['machine learning', 'artificial intelligence'],
        databases: ['pubmed', 'elsevier'],
        searchOptions: {
          maxResults: 1000,
          dateRange: {
            from: '2019-01-01T00:00:00.000Z',
            to: '2024-01-01T00:00:00.000Z'
          }
        }
      };

      mockApiService.post.mockResolvedValue({ data: null });

      await searchService.initiateSearch(processId, searchRequest);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/processes/${processId}/search`,
        searchRequest
      );
    });

    it('should handle search initiation errors', async () => {
      const processId = 'process-123';
      const searchRequest: SearchRequest = {
        keywords: ['test'],
        databases: ['pubmed'],
        searchOptions: {
          maxResults: 100,
          dateRange: {
            from: '2023-01-01T00:00:00.000Z',
            to: '2024-01-01T00:00:00.000Z'
          }
        }
      };

      const error = new Error('Network error');
      mockApiService.post.mockRejectedValue(error);

      await expect(searchService.initiateSearch(processId, searchRequest))
        .rejects.toThrow('Network error');
    });
  });

  describe('getSearchStatus', () => {
    it('should fetch search status successfully', async () => {
      const processId = 'process-123';
      const mockStatus: SearchStatus = {
        status: 'IN_PROGRESS',
        progress: {
          pubmed: { status: 'COMPLETED', count: 150 },
          elsevier: { status: 'IN_PROGRESS', count: 75 },
          wiley: { status: 'PENDING', count: 0 },
          taylorFrancis: { status: 'PENDING', count: 0 }
        },
        totalFound: 225
      };

      mockApiService.get.mockResolvedValue({ data: mockStatus });

      const result = await searchService.getSearchStatus(processId);

      expect(result).toEqual(mockStatus);
      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/processes/${processId}/search/status`
      );
    });

    it('should handle completed search status', async () => {
      const processId = 'process-123';
      const mockStatus: SearchStatus = {
        status: 'COMPLETED',
        progress: {
          pubmed: { status: 'COMPLETED', count: 200 },
          elsevier: { status: 'COMPLETED', count: 150 },
          wiley: { status: 'COMPLETED', count: 100 },
          taylorFrancis: { status: 'COMPLETED', count: 50 }
        },
        totalFound: 500
      };

      mockApiService.get.mockResolvedValue({ data: mockStatus });

      const result = await searchService.getSearchStatus(processId);

      expect(result.status).toBe('COMPLETED');
      expect(result.totalFound).toBe(500);
    });

    it('should handle failed search status', async () => {
      const processId = 'process-123';
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

      mockApiService.get.mockResolvedValue({ data: mockStatus });

      const result = await searchService.getSearchStatus(processId);

      expect(result.status).toBe('FAILED');
      expect(result.totalFound).toBe(0);
    });
  });

  describe('searchByName', () => {
    it('should search for reviewers by name successfully', async () => {
      const processId = 'process-123';
      const name = 'John Smith';
      const mockAuthors: Author[] = [
        {
          id: 'author-1',
          name: 'John Smith',
          email: 'john.smith@university.edu',
          affiliation: 'University of Technology',
          country: 'United States',
          publicationCount: 45,
          recentPublications: ['Paper 1', 'Paper 2'],
          expertise: ['machine learning', 'data science'],
          database: 'pubmed',
          matchScore: 0.95
        },
        {
          id: 'author-2',
          name: 'John A. Smith',
          email: 'j.smith@research.org',
          affiliation: 'Research Institute',
          country: 'Canada',
          publicationCount: 32,
          recentPublications: ['Study A', 'Study B'],
          expertise: ['artificial intelligence'],
          database: 'elsevier',
          matchScore: 0.87
        }
      ];

      mockApiService.post.mockResolvedValue({ data: mockAuthors });

      const result = await searchService.searchByName(processId, name);

      expect(result).toEqual(mockAuthors);
      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/processes/${processId}/search/manual/name`,
        { query: name }
      );
    });

    it('should handle empty search results', async () => {
      const processId = 'process-123';
      const name = 'Nonexistent Author';

      mockApiService.post.mockResolvedValue({ data: [] });

      const result = await searchService.searchByName(processId, name);

      expect(result).toEqual([]);
    });

    it('should handle search by name errors', async () => {
      const processId = 'process-123';
      const name = 'John Smith';
      const error = new Error('Search failed');

      mockApiService.post.mockRejectedValue(error);

      await expect(searchService.searchByName(processId, name))
        .rejects.toThrow('Search failed');
    });
  });

  describe('searchByEmail', () => {
    it('should search for reviewers by email successfully', async () => {
      const processId = 'process-123';
      const email = 'researcher@university.edu';
      const mockAuthors: Author[] = [
        {
          id: 'author-1',
          name: 'Dr. Jane Researcher',
          email: 'researcher@university.edu',
          affiliation: 'University of Science',
          country: 'United Kingdom',
          publicationCount: 67,
          recentPublications: ['Research Paper 1', 'Research Paper 2'],
          expertise: ['computational biology', 'bioinformatics'],
          database: 'pubmed',
          matchScore: 1.0
        }
      ];

      mockApiService.post.mockResolvedValue({ data: mockAuthors });

      const result = await searchService.searchByEmail(processId, email);

      expect(result).toEqual(mockAuthors);
      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/processes/${processId}/search/manual/email`,
        { query: email }
      );
    });

    it('should handle email not found', async () => {
      const processId = 'process-123';
      const email = 'notfound@example.com';

      mockApiService.post.mockResolvedValue({ data: [] });

      const result = await searchService.searchByEmail(processId, email);

      expect(result).toEqual([]);
    });

    it('should handle search by email errors', async () => {
      const processId = 'process-123';
      const email = 'test@example.com';
      const error = new Error('Email search failed');

      mockApiService.post.mockRejectedValue(error);

      await expect(searchService.searchByEmail(processId, email))
        .rejects.toThrow('Email search failed');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in search queries', async () => {
      const processId = 'process-123';
      const nameWithSpecialChars = "O'Connor-Smith";

      mockApiService.post.mockResolvedValue({ data: [] });

      await searchService.searchByName(processId, nameWithSpecialChars);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/processes/${processId}/search/manual/name`,
        { query: nameWithSpecialChars }
      );
    });

    it('should handle unicode characters in search queries', async () => {
      const processId = 'process-123';
      const unicodeName = 'José María García';

      mockApiService.post.mockResolvedValue({ data: [] });

      await searchService.searchByName(processId, unicodeName);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/processes/${processId}/search/manual/name`,
        { query: unicodeName }
      );
    });

    it('should handle very long search queries', async () => {
      const processId = 'process-123';
      const longName = 'A'.repeat(1000);

      mockApiService.post.mockResolvedValue({ data: [] });

      await searchService.searchByName(processId, longName);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/processes/${processId}/search/manual/name`,
        { query: longName }
      );
    });
  });
});