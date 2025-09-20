/**
 * Database search service
 * Handles database searches, status tracking, and manual reviewer searches
 */

import { apiService } from './apiService';
import type { 
  SearchRequest, 
  SearchStatus, 
  Author,
  ManualSearchRequest,
  ApiResponse 
} from '../types/api';

/**
 * Search service class for database searches and manual searches
 */
class SearchService {
  /**
   * Initiate a database search for a process
   */
  async initiateSearch(processId: string, request: SearchRequest): Promise<void> {
    await apiService.post(`/api/processes/${processId}/search`, request);
  }

  /**
   * Get search status for a process
   */
  async getSearchStatus(processId: string): Promise<SearchStatus> {
    const response = await apiService.get<SearchStatus>(`/api/processes/${processId}/search/status`);
    return response.data;
  }

  /**
   * Search for reviewers by name
   */
  async searchByName(processId: string, name: string): Promise<Author[]> {
    const response = await apiService.post<Author[]>(
      `/api/processes/${processId}/search/manual/name`,
      { query: name }
    );
    return response.data;
  }

  /**
   * Search for reviewers by email
   */
  async searchByEmail(processId: string, email: string): Promise<Author[]> {
    const response = await apiService.post<Author[]>(
      `/api/processes/${processId}/search/manual/email`,
      { query: email }
    );
    return response.data;
  }
}

// Create and export service instance
export const searchService = new SearchService();
export default searchService;