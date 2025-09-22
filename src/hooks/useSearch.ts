/**
 * Database search React Query hooks
 * Provides hooks for database searches, status tracking, and manual searches
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchService } from '../services/searchService';
import { queryKeys } from '../lib/queryClient';
import type { 
  SearchRequest, 
  SearchStatus, 
  Author,
  ManualSearchRequest 
} from '../types/api';

/**
 * Hook for initiating database search
 */
export const useInitiateSearch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, request }: { 
      processId: string; 
      request: SearchRequest;
    }): Promise<void> => 
      searchService.initiateSearch(processId, request),
    onSuccess: (_, { processId }) => {
      // Invalidate search status to start polling
      queryClient.invalidateQueries({ queryKey: queryKeys.search.status(processId) });
      
      // Invalidate process cache to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('Failed to initiate search:', error);
    },
  });
};

/**
 * Hook for fetching search status with polling
 */
export const useSearchStatus = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.search.status(processId),
    queryFn: (): Promise<SearchStatus> => searchService.getSearchStatus(processId),
    enabled: !!processId && enabled,
    refetchInterval: (data) => {
      // Poll every 5 seconds if search is in progress
      if (data?.status === 'IN_PROGRESS' || data?.status === 'PENDING') {
        return 5000;
      }
      // Stop polling when completed or failed
      return false;
    },
    staleTime: 0, // Always fetch fresh status
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
};

/**
 * Hook for manual search by name
 */
export const useSearchByName = () => {
  return useMutation({
    mutationFn: ({ processId, name }: { 
      processId: string; 
      name: string;
    }): Promise<Author[]> => 
      searchService.searchByName(processId, name),
    onError: (error) => {
      console.error('Manual name search failed:', error);
    },
  });
};

/**
 * Hook for manual search by email
 */
export const useSearchByEmail = () => {
  return useMutation({
    mutationFn: ({ processId, email }: { 
      processId: string; 
      email: string;
    }): Promise<Author[]> => 
      searchService.searchByEmail(processId, email),
    onError: (error) => {
      console.error('Manual email search failed:', error);
    },
  });
};

/**
 * Hook for cached manual search by name
 */
export const useCachedSearchByName = (processId: string, name: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: queryKeys.search.manual.name(processId, name),
    queryFn: (): Promise<Author[]> => searchService.searchByName(processId, name),
    enabled: !!processId && !!name && enabled,
    staleTime: 5 * 60 * 1000, // Cache manual search results for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Hook for cached manual search by email
 */
export const useCachedSearchByEmail = (processId: string, email: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: queryKeys.search.manual.email(processId, email),
    queryFn: (): Promise<Author[]> => searchService.searchByEmail(processId, email),
    enabled: !!processId && !!email && enabled,
    staleTime: 5 * 60 * 1000, // Cache manual search results for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Hook for search progress tracking
 */
export const useSearchProgress = (processId: string, enabled: boolean = true) => {
  const { data: status, isLoading, error } = useSearchStatus(processId, enabled);
  
  const isSearching = status?.status === 'IN_PROGRESS' || status?.status === 'PENDING';
  const isCompleted = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED';
  const isNotStarted = status?.status === 'NOT_STARTED';
  
  const progress = status?.progress || {};
  const totalFound = status?.totalFound || 0;
  
  // Calculate overall progress percentage
  const databases = Object.keys(progress);
  const completedDatabases = databases.filter(db => 
    progress[db as keyof typeof progress]?.status === 'COMPLETED'
  ).length;
  const progressPercentage = databases.length > 0 ? (completedDatabases / databases.length) * 100 : 0;
  
  return {
    status: status?.status,
    progress,
    totalFound,
    progressPercentage,
    isSearching,
    isCompleted,
    isFailed,
    isNotStarted,
    isLoading,
    error,
  };
};

/**
 * Main search hook (alias for useSearchProgress)
 */
export const useSearch = useSearchProgress;