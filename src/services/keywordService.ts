/**
 * Keyword enhancement service
 * Handles keyword enhancement, MeSH term generation, and search string creation
 */

import { apiService } from './apiService';
import type { 
  KeywordEnhancementRequest, 
  EnhancedKeywords, 
  KeywordSelectionRequest,
  ApiResponse 
} from '../types/api';

/**
 * Keyword service class for keyword enhancement and management
 */
class KeywordService {
  /**
   * Enhance keywords for a process
   */
  async enhanceKeywords(processId: string, request: KeywordEnhancementRequest): Promise<EnhancedKeywords> {
    const response = await apiService.post<EnhancedKeywords>(
      `/api/processes/${processId}/keywords/enhance`,
      request
    );
    return response.data;
  }

  /**
   * Get enhanced keywords for a process
   */
  async getKeywords(processId: string): Promise<EnhancedKeywords> {
    const response = await apiService.get<EnhancedKeywords>(`/api/processes/${processId}/keywords`);
    return response.data;
  }

  /**
   * Update keyword selection for a process
   */
  async updateKeywordSelection(processId: string, selection: string[]): Promise<void> {
    await apiService.put(`/api/processes/${processId}/keywords/selection`, { 
      selectedKeywords: selection 
    });
  }
}

// Create and export service instance
export const keywordService = new KeywordService();
export default keywordService;