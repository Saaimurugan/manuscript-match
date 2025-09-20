/**
 * Keyword Service Tests
 * Tests for keyword enhancement, MeSH term generation, and search string creation
 */

import { keywordService } from '../keywordService';
import { apiService } from '../apiService';
import type { KeywordEnhancementRequest, EnhancedKeywords } from '../../types/api';

// Mock the API service
jest.mock('../apiService');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('KeywordService', () => {
  const mockProcessId = 'test-process-123';
  
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enhanceKeywords', () => {
    it('should enhance keywords successfully', async () => {
      const request: KeywordEnhancementRequest = {
        includeOriginal: true,
        generateMeshTerms: true,
        generateSearchStrings: true
      };

      mockedApiService.post.mockResolvedValue({
        data: mockEnhancedKeywords,
        message: 'Keywords enhanced successfully',
        timestamp: new Date().toISOString()
      });

      const result = await keywordService.enhanceKeywords(mockProcessId, request);

      expect(mockedApiService.post).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/enhance`,
        request
      );
      expect(result).toEqual(mockEnhancedKeywords);
    });

    it('should handle enhancement errors', async () => {
      const request: KeywordEnhancementRequest = {
        includeOriginal: true,
        generateMeshTerms: true,
        generateSearchStrings: true
      };

      const error = new Error('Enhancement failed');
      mockedApiService.post.mockRejectedValue(error);

      await expect(keywordService.enhanceKeywords(mockProcessId, request))
        .rejects.toThrow('Enhancement failed');

      expect(mockedApiService.post).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/enhance`,
        request
      );
    });

    it('should handle different enhancement options', async () => {
      const request: KeywordEnhancementRequest = {
        includeOriginal: false,
        generateMeshTerms: false,
        generateSearchStrings: true
      };

      const limitedKeywords: EnhancedKeywords = {
        original: [],
        enhanced: ['artificial intelligence', 'deep learning'],
        meshTerms: [],
        searchStrings: {
          pubmed: 'artificial intelligence OR deep learning',
          elsevier: 'artificial intelligence OR deep learning',
          wiley: 'artificial intelligence OR deep learning',
          taylorFrancis: 'artificial intelligence OR deep learning'
        }
      };

      mockedApiService.post.mockResolvedValue({
        data: limitedKeywords,
        message: 'Keywords enhanced successfully',
        timestamp: new Date().toISOString()
      });

      const result = await keywordService.enhanceKeywords(mockProcessId, request);

      expect(result).toEqual(limitedKeywords);
      expect(result.original).toHaveLength(0);
      expect(result.meshTerms).toHaveLength(0);
      expect(result.enhanced.length).toBeGreaterThan(0);
    });
  });

  describe('getKeywords', () => {
    it('should fetch enhanced keywords successfully', async () => {
      mockedApiService.get.mockResolvedValue({
        data: mockEnhancedKeywords,
        message: 'Keywords retrieved successfully',
        timestamp: new Date().toISOString()
      });

      const result = await keywordService.getKeywords(mockProcessId);

      expect(mockedApiService.get).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords`
      );
      expect(result).toEqual(mockEnhancedKeywords);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Keywords not found');
      mockedApiService.get.mockRejectedValue(error);

      await expect(keywordService.getKeywords(mockProcessId))
        .rejects.toThrow('Keywords not found');

      expect(mockedApiService.get).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords`
      );
    });

    it('should handle empty keywords response', async () => {
      const emptyKeywords: EnhancedKeywords = {
        original: [],
        enhanced: [],
        meshTerms: [],
        searchStrings: {
          pubmed: '',
          elsevier: '',
          wiley: '',
          taylorFrancis: ''
        }
      };

      mockedApiService.get.mockResolvedValue({
        data: emptyKeywords,
        message: 'No keywords found',
        timestamp: new Date().toISOString()
      });

      const result = await keywordService.getKeywords(mockProcessId);

      expect(result).toEqual(emptyKeywords);
      expect(result.original).toHaveLength(0);
      expect(result.enhanced).toHaveLength(0);
      expect(result.meshTerms).toHaveLength(0);
    });
  });

  describe('updateKeywordSelection', () => {
    it('should update keyword selection successfully', async () => {
      const selection = ['machine learning', 'artificial intelligence', 'deep learning'];

      mockedApiService.put.mockResolvedValue({
        data: null,
        message: 'Selection updated successfully',
        timestamp: new Date().toISOString()
      });

      await keywordService.updateKeywordSelection(mockProcessId, selection);

      expect(mockedApiService.put).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/selection`,
        { selectedKeywords: selection }
      );
    });

    it('should handle selection update errors', async () => {
      const selection = ['machine learning', 'artificial intelligence'];
      const error = new Error('Update failed');
      mockedApiService.put.mockRejectedValue(error);

      await expect(keywordService.updateKeywordSelection(mockProcessId, selection))
        .rejects.toThrow('Update failed');

      expect(mockedApiService.put).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/selection`,
        { selectedKeywords: selection }
      );
    });

    it('should handle empty selection', async () => {
      const selection: string[] = [];

      mockedApiService.put.mockResolvedValue({
        data: null,
        message: 'Selection cleared',
        timestamp: new Date().toISOString()
      });

      await keywordService.updateKeywordSelection(mockProcessId, selection);

      expect(mockedApiService.put).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/selection`,
        { selectedKeywords: [] }
      );
    });

    it('should handle duplicate keywords in selection', async () => {
      const selection = ['machine learning', 'machine learning', 'artificial intelligence'];

      mockedApiService.put.mockResolvedValue({
        data: null,
        message: 'Selection updated successfully',
        timestamp: new Date().toISOString()
      });

      await keywordService.updateKeywordSelection(mockProcessId, selection);

      expect(mockedApiService.put).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/selection`,
        { selectedKeywords: selection }
      );
    });
  });

  describe('API endpoint validation', () => {
    it('should use correct endpoints for all methods', async () => {
      const request: KeywordEnhancementRequest = {
        includeOriginal: true,
        generateMeshTerms: true,
        generateSearchStrings: true
      };

      // Mock all API calls
      mockedApiService.post.mockResolvedValue({ data: mockEnhancedKeywords, message: '', timestamp: '' });
      mockedApiService.get.mockResolvedValue({ data: mockEnhancedKeywords, message: '', timestamp: '' });
      mockedApiService.put.mockResolvedValue({ data: null, message: '', timestamp: '' });

      // Test enhance keywords endpoint
      await keywordService.enhanceKeywords(mockProcessId, request);
      expect(mockedApiService.post).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/enhance`,
        request
      );

      // Test get keywords endpoint
      await keywordService.getKeywords(mockProcessId);
      expect(mockedApiService.get).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords`
      );

      // Test update selection endpoint
      await keywordService.updateKeywordSelection(mockProcessId, ['test']);
      expect(mockedApiService.put).toHaveBeenCalledWith(
        `/api/processes/${mockProcessId}/keywords/selection`,
        { selectedKeywords: ['test'] }
      );
    });
  });
});