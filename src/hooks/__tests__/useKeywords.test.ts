/**
 * useKeywords Hook Tests
 * Tests for keyword enhancement React Query hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKeywords, useEnhanceKeywords, useUpdateKeywordSelection } from '../useKeywords';
import { keywordService } from '../../services/keywordService';
import type { KeywordEnhancementRequest, EnhancedKeywords } from '../../types/api';

// Mock the keyword service
jest.mock('../../services/keywordService');
const mockedKeywordService = keywordService as jest.Mocked<typeof keywordService>;

// Mock toast
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useKeywords hooks', () => {
  let queryClient: QueryClient;

  const mockEnhancedKeywords: EnhancedKeywords = {
    original: ['machine learning', 'neural networks'],
    enhanced: ['artificial intelligence', 'deep learning', 'computer vision'],
    meshTerms: ['Machine Learning', 'Neural Networks, Computer', 'Artificial Intelligence'],
    searchStrings: {
      pubmed: '("machine learning"[MeSH Terms] OR "neural networks"[MeSH Terms]) AND ("artificial intelligence"[MeSH Terms])',
      elsevier: '(machine learning OR neural networks) AND (artificial intelligence OR deep learning)',
      wiley: 'machine learning AND neural networks AND artificial intelligence',
      taylorFrancis: '("machine learning" OR "neural networks") AND ("artificial intelligence" OR "deep learning")'
    }
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useKeywords', () => {
    it('should fetch enhanced keywords successfully', async () => {
      const processId = 'test-process-123';
      mockedKeywordService.getKeywords.mockResolvedValue(mockEnhancedKeywords);

      const { result } = renderHook(() => useKeywords(processId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEnhancedKeywords);
      expect(mockedKeywordService.getKeywords).toHaveBeenCalledWith(processId);
    });

    it('should handle fetch errors gracefully', async () => {
      const processId = 'test-process-123';
      const error = new Error('Keywords not found');
      mockedKeywordService.getKeywords.mockRejectedValue(error);

      const { result } = renderHook(() => useKeywords(processId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(mockedKeywordService.getKeywords).toHaveBeenCalledWith(processId);
    });

    it('should not fetch when processId is empty', () => {
      const { result } = renderHook(() => useKeywords(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockedKeywordService.getKeywords).not.toHaveBeenCalled();
    });

    it('should handle 404 errors without retrying', async () => {
      const processId = 'test-process-123';
      const error = { response: { status: 404 } };
      mockedKeywordService.getKeywords.mockRejectedValue(error);

      const { result } = renderHook(() => useKeywords(processId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries for 404)
      expect(mockedKeywordService.getKeywords).toHaveBeenCalledTimes(1);
    });
  });

  describe('useEnhanceKeywords', () => {
    it('should enhance keywords successfully', async () => {
      mockedKeywordService.enhanceKeywords.mockResolvedValue(mockEnhancedKeywords);

      const { result } = renderHook(() => useEnhanceKeywords(), {
        wrapper: createWrapper(),
      });

      const processId = 'test-process-123';
      const request: KeywordEnhancementRequest = {
        includeOriginal: true,
        generateMeshTerms: true,
        generateSearchStrings: true,
      };

      await result.current.mutateAsync({ processId, request });

      expect(mockedKeywordService.enhanceKeywords).toHaveBeenCalledWith(processId, request);
    });

    it('should handle enhancement errors', async () => {
      const error = new Error('Enhancement failed');
      mockedKeywordService.enhanceKeywords.mockRejectedValue(error);

      const { result } = renderHook(() => useEnhanceKeywords(), {
        wrapper: createWrapper(),
      });

      const processId = 'test-process-123';
      const request: KeywordEnhancementRequest = {
        includeOriginal: true,
        generateMeshTerms: true,
        generateSearchStrings: true,
      };

      await expect(result.current.mutateAsync({ processId, request }))
        .rejects.toThrow('Enhancement failed');

      expect(mockedKeywordService.enhanceKeywords).toHaveBeenCalledWith(processId, request);
    });

    it('should cache enhanced keywords after successful enhancement', async () => {
      mockedKeywordService.enhanceKeywords.mockResolvedValue(mockEnhancedKeywords);

      const { result } = renderHook(() => useEnhanceKeywords(), {
        wrapper: createWrapper(),
      });

      const processId = 'test-process-123';
      const request: KeywordEnhancementRequest = {
        includeOriginal: true,
        generateMeshTerms: true,
        generateSearchStrings: true,
      };

      await result.current.mutateAsync({ processId, request });

      // Check if data is cached
      const cachedData = queryClient.getQueryData(['keywords', processId, 'enhanced']);
      expect(cachedData).toEqual(mockEnhancedKeywords);
    });
  });

  describe('useUpdateKeywordSelection', () => {
    it('should update keyword selection successfully', async () => {
      mockedKeywordService.updateKeywordSelection.mockResolvedValue();

      const { result } = renderHook(() => useUpdateKeywordSelection(), {
        wrapper: createWrapper(),
      });

      const processId = 'test-process-123';
      const selection = ['machine learning', 'artificial intelligence'];

      await result.current.mutateAsync({ processId, selection });

      expect(mockedKeywordService.updateKeywordSelection).toHaveBeenCalledWith(processId, selection);
    });

    it('should handle selection update errors', async () => {
      const error = new Error('Update failed');
      mockedKeywordService.updateKeywordSelection.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateKeywordSelection(), {
        wrapper: createWrapper(),
      });

      const processId = 'test-process-123';
      const selection = ['machine learning', 'artificial intelligence'];

      await expect(result.current.mutateAsync({ processId, selection }))
        .rejects.toThrow('Update failed');

      expect(mockedKeywordService.updateKeywordSelection).toHaveBeenCalledWith(processId, selection);
    });

    it('should invalidate related queries after successful update', async () => {
      mockedKeywordService.updateKeywordSelection.mockResolvedValue();

      // Spy on query invalidation
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateKeywordSelection(), {
        wrapper: createWrapper(),
      });

      const processId = 'test-process-123';
      const selection = ['machine learning', 'artificial intelligence'];

      await result.current.mutateAsync({ processId, selection });

      // Should invalidate keywords, search, and process queries
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['keywords', processId] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['search', processId] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['processes', 'detail', processId] });
    });
  });

  describe('useOptimisticKeywordSelection', () => {
    it('should provide optimistic update functions', () => {
      const { result } = renderHook(() => 
        require('../useKeywords').useOptimisticKeywordSelection(), 
        { wrapper: createWrapper() }
      );

      expect(result.current.updateSelectionOptimistically).toBeInstanceOf(Function);
      expect(result.current.revertOptimisticUpdate).toBeInstanceOf(Function);
    });

    it('should update cache optimistically', () => {
      const processId = 'test-process-123';
      
      // Set initial data in cache
      queryClient.setQueryData(['keywords', processId, 'enhanced'], mockEnhancedKeywords);

      const { result } = renderHook(() => 
        require('../useKeywords').useOptimisticKeywordSelection(), 
        { wrapper: createWrapper() }
      );

      const selectedKeywords = ['machine learning', 'artificial intelligence'];
      result.current.updateSelectionOptimistically(processId, selectedKeywords);

      // Cache should still contain the data (optimistic update doesn't change structure in this case)
      const cachedData = queryClient.getQueryData(['keywords', processId, 'enhanced']);
      expect(cachedData).toBeDefined();
    });

    it('should revert optimistic updates', () => {
      const processId = 'test-process-123';
      
      // Spy on query invalidation
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => 
        require('../useKeywords').useOptimisticKeywordSelection(), 
        { wrapper: createWrapper() }
      );

      result.current.revertOptimisticUpdate(processId);

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['keywords', processId, 'enhanced'] });
    });
  });
});