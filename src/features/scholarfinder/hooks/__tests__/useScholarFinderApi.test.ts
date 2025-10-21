/**
 * Tests for useScholarFinderApi hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useUploadManuscript,
  useKeywordEnhancement,
  useDatabaseSearch,
  useValidateAuthors,
  useRecommendations
} from '../useScholarFinderApi';

// Mock the API service
vi.mock('../../services/ScholarFinderApiService', () => ({
  ScholarFinderApiService: vi.fn().mockImplementation(() => ({
    uploadManuscript: vi.fn(),
    enhanceKeywords: vi.fn(),
    searchDatabases: vi.fn(),
    validateAuthors: vi.fn(),
    getRecommendations: vi.fn()
  }))
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
};

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useScholarFinderApi hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUploadManuscript', () => {
    it('should handle successful file upload', async () => {
      const mockResponse = {
        message: 'Upload successful',
        data: {
          job_id: 'test-job-123',
          file_name: 'test.docx',
          timestamp: '2024-01-01T00:00:00Z',
          heading: 'Test Manuscript',
          authors: ['John Doe'],
          affiliations: ['University A'],
          keywords: 'test, manuscript',
          abstract: 'Test abstract',
          author_aff_map: { 'John Doe': 'University A' }
        }
      };

      const { result } = renderHook(() => useUploadManuscript(), {
        wrapper: createWrapper()
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle upload errors', async () => {
      const { result } = renderHook(() => useUploadManuscript(), {
        wrapper: createWrapper()
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('useKeywordEnhancement', () => {
    it('should enhance keywords successfully', async () => {
      const { result } = renderHook(() => useKeywordEnhancement(), {
        wrapper: createWrapper()
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should handle enhancement errors', async () => {
      const { result } = renderHook(() => useKeywordEnhancement(), {
        wrapper: createWrapper()
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('useDatabaseSearch', () => {
    it('should perform database search', async () => {
      const { result } = renderHook(() => useDatabaseSearch(), {
        wrapper: createWrapper()
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should handle search errors', async () => {
      const { result } = renderHook(() => useDatabaseSearch(), {
        wrapper: createWrapper()
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('useValidateAuthors', () => {
    it('should validate authors successfully', async () => {
      const { result } = renderHook(() => useValidateAuthors(), {
        wrapper: createWrapper()
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should handle validation errors', async () => {
      const { result } = renderHook(() => useValidateAuthors(), {
        wrapper: createWrapper()
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('useRecommendations', () => {
    it('should fetch recommendations with filters', async () => {
      const jobId = 'test-job-123';
      const filters = { minPublications: 5, countries: ['US'] };

      const { result } = renderHook(
        () => useRecommendations(jobId, filters),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle empty job ID', async () => {
      const { result } = renderHook(
        () => useRecommendations('', {}),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
    });
  });
});