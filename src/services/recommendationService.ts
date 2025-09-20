/**
 * Reviewer recommendation service
 * Handles fetching, filtering, and sorting reviewer recommendations from backend API
 */

import { apiService } from './apiService';
import type { 
  Reviewer, 
  RecommendationRequest,
  RecommendationFilters,
  RecommendationSort,
  PaginatedResponse,
  ApiResponse 
} from '../types/api';

/**
 * Recommendation service class for reviewer recommendations
 */
class RecommendationService {
  /**
   * Get reviewer recommendations for a process with filtering, sorting, and pagination
   */
  async getRecommendations(processId: string, request?: RecommendationRequest): Promise<PaginatedResponse<Reviewer>> {
    const params: Record<string, any> = {};
    
    if (request) {
      // Add pagination parameters
      if (request.page !== undefined) params.page = request.page;
      if (request.limit !== undefined) params.limit = request.limit;
      
      // Add filter parameters
      if (request.filters) {
        const filters = request.filters;
        if (filters.minPublications !== undefined) params.minPublications = filters.minPublications;
        if (filters.maxPublications !== undefined) params.maxPublications = filters.maxPublications;
        if (filters.countries && filters.countries.length > 0) params.countries = filters.countries.join(',');
        if (filters.affiliationTypes && filters.affiliationTypes.length > 0) params.affiliationTypes = filters.affiliationTypes.join(',');
        if (filters.expertise && filters.expertise.length > 0) params.expertise = filters.expertise.join(',');
        if (filters.databases && filters.databases.length > 0) params.databases = filters.databases.join(',');
        if (filters.search) params.search = filters.search;
      }
      
      // Add sort parameters (using backend API format)
      if (request.sort) {
        params.sortBy = request.sort.field;
        params.sortOrder = request.sort.direction;
      }
    }
    
    const response = await apiService.get<PaginatedResponse<Reviewer>>(
      `/api/processes/${processId}/recommendations`,
      params
    );
    return response.data;
  }

  /**
   * Get available filter options for recommendations from backend
   */
  async getFilterOptions(processId: string): Promise<{
    countries: string[];
    affiliationTypes: string[];
    expertise: string[];
    databases: string[];
    publicationRange: { min: number; max: number };
  }> {
    const response = await apiService.get<{
      countries: string[];
      affiliationTypes: string[];
      expertise: string[];
      databases: string[];
      publicationRange: { min: number; max: number };
    }>(`/api/processes/${processId}/recommendations/filters`);
    return response.data;
  }

  /**
   * Get recommendation statistics from backend
   */
  async getRecommendationStats(processId: string): Promise<{
    total: number;
    byDatabase: Record<string, number>;
    byCountry: Record<string, number>;
    averageMatchScore: number;
    averagePublications: number;
  }> {
    try {
      // Try to get stats from dedicated endpoint if available
      const response = await apiService.get<{
        total: number;
        byDatabase: Record<string, number>;
        byCountry: Record<string, number>;
        averageMatchScore: number;
        averagePublications: number;
      }>(`/api/processes/${processId}/recommendations/stats`);
      return response.data;
    } catch (error) {
      // Fallback: calculate stats from all recommendations
      const response = await this.getRecommendations(processId, { limit: 1000 });
      const reviewers = response.data;
      
      const stats = {
        total: response.pagination.total,
        byDatabase: {} as Record<string, number>,
        byCountry: {} as Record<string, number>,
        averageMatchScore: 0,
        averagePublications: 0,
      };
      
      if (reviewers.length > 0) {
        // Group by database and country
        reviewers.forEach(reviewer => {
          stats.byDatabase[reviewer.database] = (stats.byDatabase[reviewer.database] || 0) + 1;
          stats.byCountry[reviewer.country] = (stats.byCountry[reviewer.country] || 0) + 1;
        });
        
        // Calculate averages
        stats.averageMatchScore = reviewers.reduce((sum, r) => sum + r.matchScore, 0) / reviewers.length;
        stats.averagePublications = reviewers.reduce((sum, r) => sum + r.publicationCount, 0) / reviewers.length;
      }
      
      return stats;
    }
  }
}

// Create and export service instance
export const recommendationService = new RecommendationService();
export default recommendationService;