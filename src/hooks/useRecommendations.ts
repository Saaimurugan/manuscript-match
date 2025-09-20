/**
 * Reviewer recommendations React Query hooks
 * Provides hooks for fetching, filtering, and sorting reviewer recommendations
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { recommendationService } from '../services/recommendationService';
import { queryKeys } from '../lib/queryClient';
import type { 
  Reviewer, 
  RecommendationRequest,
  PaginatedResponse 
} from '../types/api';

/**
 * Hook for fetching reviewer recommendations
 */
export const useRecommendations = (processId: string, request?: RecommendationRequest) => {
  return useQuery({
    queryKey: queryKeys.recommendations.list(processId, request),
    queryFn: (): Promise<PaginatedResponse<Reviewer>> => 
      recommendationService.getRecommendations(processId, request),
    enabled: !!processId, // Only run query if processId is provided
    staleTime: 5 * 60 * 1000, // Recommendations are stable for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if validation hasn't been completed yet
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for fetching recommendations with pagination
 */
export const usePaginatedRecommendations = (
  processId: string, 
  page: number = 1, 
  limit: number = 20,
  filters?: RecommendationRequest['filters'],
  sort?: RecommendationRequest['sort']
) => {
  const request: RecommendationRequest = {
    page,
    limit,
    filters,
    sort,
  };
  
  return useRecommendations(processId, request);
};

/**
 * Hook for fetching all recommendations (without pagination)
 */
export const useAllRecommendations = (processId: string) => {
  return useQuery({
    queryKey: queryKeys.recommendations.list(processId, { limit: 1000 }),
    queryFn: (): Promise<PaginatedResponse<Reviewer>> => 
      recommendationService.getRecommendations(processId, { limit: 1000 }),
    enabled: !!processId,
    staleTime: 10 * 60 * 1000, // All recommendations are stable for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};

/**
 * Hook for recommendation statistics
 */
export const useRecommendationStats = (processId: string) => {
  const { data, isLoading, error } = useAllRecommendations(processId);
  
  const totalRecommendations = data?.pagination.total || 0;
  const reviewers = data?.data || [];
  
  // Calculate statistics
  const stats = {
    total: totalRecommendations,
    byDatabase: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
    byAffiliationType: {} as Record<string, number>,
    averageMatchScore: 0,
    averagePublications: 0,
  };
  
  if (reviewers.length > 0) {
    // Group by database
    reviewers.forEach(reviewer => {
      stats.byDatabase[reviewer.database] = (stats.byDatabase[reviewer.database] || 0) + 1;
      stats.byCountry[reviewer.country] = (stats.byCountry[reviewer.country] || 0) + 1;
    });
    
    // Calculate averages
    stats.averageMatchScore = reviewers.reduce((sum, r) => sum + r.matchScore, 0) / reviewers.length;
    stats.averagePublications = reviewers.reduce((sum, r) => sum + r.publicationCount, 0) / reviewers.length;
  }
  
  return {
    stats,
    isLoading,
    error,
  };
};

/**
 * Hook for filtering recommendations with real-time backend calls
 */
export const useFilteredRecommendations = (
  processId: string,
  filters: RecommendationRequest['filters'],
  sort?: RecommendationRequest['sort']
) => {
  const queryClient = useQueryClient();
  
  // Prefetch filtered results
  const prefetchFiltered = (newFilters: RecommendationRequest['filters']) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.recommendations.list(processId, { filters: newFilters, sort }),
      queryFn: () => recommendationService.getRecommendations(processId, { filters: newFilters, sort }),
      staleTime: 2 * 60 * 1000, // Shorter stale time for filtered results
    });
  };
  
  const { data, isLoading, error, refetch } = useRecommendations(processId, { filters, sort });
  
  return {
    data,
    isLoading,
    error,
    prefetchFiltered,
    refetch, // Allow manual refetch for real-time updates
  };
};

/**
 * Hook for getting filter options from backend
 */
export const useRecommendationFilters = (processId: string) => {
  return useQuery({
    queryKey: queryKeys.recommendations.all(processId).concat('filters'),
    queryFn: () => recommendationService.getFilterOptions(processId),
    enabled: !!processId,
    staleTime: 10 * 60 * 1000, // Filter options are stable for 10 minutes
    gcTime: 30 * 60 * 1000,
  });
};