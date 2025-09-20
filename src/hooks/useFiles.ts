/**
 * File upload and metadata React Query hooks
 * Provides hooks for file upload, metadata extraction, and metadata management
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
 * Hook for uploading files
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