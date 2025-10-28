/**
 * File upload and metadata React Query hooks
 * Provides hooks for file upload, metadata extraction, and metadata management
 * Now integrated with ScholarFinder external API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '../services/fileService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import type { 
  UploadResponse, 
  ExtractedMetadata, 
  UpdateMetadataRequest 
} from '../types/api';

/**
 * Hook for uploading files - uses ScholarFinder external API
 */
export const useFileUpload = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, file, onProgress }: { 
      processId: string; 
      file: File; 
      onProgress?: (progress: number) => void;
    }): Promise<UploadResponse> => 
      fileService.uploadFile(processId, file, onProgress),
    onSuccess: (_, { processId }) => {
      // Invalidate metadata cache to fetch new extracted data
      queryClient.invalidateQueries({ queryKey: queryKeys.metadata.all(processId) });
      // Invalidate process cache to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('File upload failed:', error);
    },
  });
};

/**
 * Hook for fetching extracted metadata
 */
export const useMetadata = (processId: string) => {
  return useQuery({
    queryKey: queryKeys.metadata.detail(processId),
    queryFn: (): Promise<ExtractedMetadata> => fileService.getMetadata(processId),
    enabled: !!processId, // Only run query if processId is provided
    staleTime: 10 * 60 * 1000, // Metadata is stable for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if no metadata exists yet
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for updating metadata
 */
export const useUpdateMetadata = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, metadata }: { 
      processId: string; 
      metadata: UpdateMetadataRequest;
    }): Promise<ExtractedMetadata> => 
      fileService.updateMetadata(processId, metadata),
    onSuccess: (updatedMetadata, { processId }) => {
      // Update metadata cache
      queryClient.setQueryData(
        queryKeys.metadata.detail(processId),
        updatedMetadata
      );
      
      // Invalidate related caches that depend on metadata
      queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all(processId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('Failed to update metadata:', error);
    },
  });
};

/**
 * Hook for optimistic metadata updates
 */
export const useOptimisticMetadataUpdate = () => {
  const queryClient = useQueryClient();
  
  const updateMetadataOptimistically = (processId: string, updates: Partial<ExtractedMetadata>) => {
    queryClient.setQueryData<ExtractedMetadata>(
      queryKeys.metadata.detail(processId),
      (oldData) => oldData ? { ...oldData, ...updates } : undefined
    );
  };
  
  const revertOptimisticUpdate = (processId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.metadata.detail(processId) });
  };
  
  return {
    updateMetadataOptimistically,
    revertOptimisticUpdate,
  };
};

/**
 * Hook for generating keyword string - uses ScholarFinder API
 */
export const useGenerateKeywordString = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, keywords }: {
      processId: string;
      keywords: {
        primary_keywords_input?: string;
        secondary_keywords_input?: string;
      };
    }) => fileService.generateKeywordString(processId, keywords),
    onSuccess: (_, { processId }) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', processId] });
    },
    onError: (error) => {
      console.error('Keyword generation failed:', error);
    },
  });
};

/**
 * Hook for searching databases - uses ScholarFinder API
 */
export const useSearchDatabases = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, databases }: {
      processId: string;
      databases: {
        selected_websites: string[];
      };
    }) => fileService.searchDatabases(processId, databases),
    onSuccess: (_, { processId }) => {
      queryClient.invalidateQueries({ queryKey: ['search', processId] });
    },
    onError: (error) => {
      console.error('Database search failed:', error);
    },
  });
};

/**
 * Hook for adding manual author - uses ScholarFinder API
 */
export const useAddManualAuthor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, authorName }: {
      processId: string;
      authorName: string;
    }) => fileService.addManualAuthor(processId, authorName),
    onSuccess: (_, { processId }) => {
      queryClient.invalidateQueries({ queryKey: ['authors', processId] });
    },
    onError: (error) => {
      console.error('Add manual author failed:', error);
    },
  });
};

/**
 * Hook for validating authors - uses ScholarFinder API
 */
export const useValidateAuthors = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId }: { processId: string }) => 
      fileService.validateAuthors(processId),
    onSuccess: (_, { processId }) => {
      queryClient.invalidateQueries({ queryKey: ['validation', processId] });
      queryClient.invalidateQueries({ queryKey: ['recommendations', processId] });
    },
    onError: (error) => {
      console.error('Author validation failed:', error);
    },
  });
};

/**
 * Hook for getting validation status - uses ScholarFinder API
 */
export const useValidationStatus = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['validation', processId],
    queryFn: () => fileService.getValidationStatus(processId),
    enabled: enabled && !!processId,
    refetchInterval: (query) => {
      // Poll every 5 seconds if validation is in progress
      const data = query.state.data;
      if (data && typeof data === 'object' && 'validation_status' in data && data.validation_status === 'in_progress') {
        return 5000;
      }
      return false;
    },
  });
};

/**
 * Hook for getting recommended reviewers - uses ScholarFinder API
 */
export const useRecommendations = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['recommendations', processId],
    queryFn: () => fileService.getRecommendations(processId),
    enabled: enabled && !!processId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching all authors - uses ScholarFinder API
 */
export const useFetchAllAuthors = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['authors', 'all', processId],
    queryFn: () => fileService.fetchAllAuthors(processId),
    enabled: enabled && !!processId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};