/**
 * Shortlist management React Query hooks
 * Provides hooks for creating, managing, and exporting reviewer shortlists
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shortlistService } from '../services/shortlistService';
import { queryKeys } from '../lib/queryClient';
import type { 
  Shortlist, 
  CreateShortlistRequest, 
  UpdateShortlistRequest,
  ExportFormat 
} from '../types/api';

/**
 * Hook for fetching all shortlists for a process
 */
export const useShortlists = (processId: string) => {
  return useQuery({
    queryKey: queryKeys.shortlists.lists(processId),
    queryFn: (): Promise<Shortlist[]> => shortlistService.getShortlists(processId),
    enabled: !!processId, // Only run query if processId is provided
    staleTime: 5 * 60 * 1000, // Shortlists are stable for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
};

/**
 * Hook for fetching a specific shortlist
 */
export const useShortlist = (processId: string, shortlistId: string) => {
  return useQuery({
    queryKey: queryKeys.shortlists.detail(processId, shortlistId),
    queryFn: (): Promise<Shortlist> => shortlistService.getShortlist(processId, shortlistId),
    enabled: !!processId && !!shortlistId, // Only run query if both IDs are provided
    staleTime: 5 * 60 * 1000, // Shortlist details are stable for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
};

/**
 * Hook for creating a new shortlist
 */
export const useCreateShortlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, data }: { 
      processId: string; 
      data: CreateShortlistRequest;
    }): Promise<Shortlist> => 
      shortlistService.createShortlist(processId, data),
    onSuccess: (newShortlist, { processId }) => {
      // Add new shortlist to the list cache
      queryClient.setQueryData<Shortlist[]>(
        queryKeys.shortlists.lists(processId),
        (oldData) => oldData ? [newShortlist, ...oldData] : [newShortlist]
      );
      
      // Cache the new shortlist details
      queryClient.setQueryData(
        queryKeys.shortlists.detail(processId, newShortlist.id),
        newShortlist
      );
    },
    onError: (error) => {
      console.error('Failed to create shortlist:', error);
    },
  });
};

/**
 * Hook for updating a shortlist
 */
export const useUpdateShortlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, shortlistId, data }: { 
      processId: string; 
      shortlistId: string;
      data: UpdateShortlistRequest;
    }): Promise<Shortlist> => 
      shortlistService.updateShortlist(processId, shortlistId, data),
    onSuccess: (updatedShortlist, { processId }) => {
      // Update shortlist in the list cache
      queryClient.setQueryData<Shortlist[]>(
        queryKeys.shortlists.lists(processId),
        (oldData) => 
          oldData?.map(shortlist => 
            shortlist.id === updatedShortlist.id ? updatedShortlist : shortlist
          ) || []
      );
      
      // Update shortlist details cache
      queryClient.setQueryData(
        queryKeys.shortlists.detail(processId, updatedShortlist.id),
        updatedShortlist
      );
    },
    onError: (error) => {
      console.error('Failed to update shortlist:', error);
    },
  });
};

/**
 * Hook for deleting a shortlist
 */
export const useDeleteShortlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, shortlistId }: { 
      processId: string; 
      shortlistId: string;
    }): Promise<void> => 
      shortlistService.deleteShortlist(processId, shortlistId),
    onSuccess: (_, { processId, shortlistId }) => {
      // Remove shortlist from the list cache
      queryClient.setQueryData<Shortlist[]>(
        queryKeys.shortlists.lists(processId),
        (oldData) => oldData?.filter(shortlist => shortlist.id !== shortlistId) || []
      );
      
      // Remove shortlist details from cache
      queryClient.removeQueries({ 
        queryKey: queryKeys.shortlists.detail(processId, shortlistId) 
      });
    },
    onError: (error) => {
      console.error('Failed to delete shortlist:', error);
    },
  });
};

/**
 * Hook for exporting a shortlist
 */
export const useExportShortlist = () => {
  return useMutation({
    mutationFn: ({ processId, shortlistId, format }: { 
      processId: string; 
      shortlistId: string;
      format: ExportFormat['format'];
    }): Promise<void> => 
      shortlistService.exportShortlist(processId, shortlistId, format),
    onError: (error) => {
      console.error('Failed to export shortlist:', error);
    },
  });
};

/**
 * Hook for optimistic shortlist updates
 */
export const useOptimisticShortlistUpdate = () => {
  const queryClient = useQueryClient();
  
  const updateShortlistOptimistically = (
    processId: string, 
    shortlistId: string, 
    updates: Partial<Shortlist>
  ) => {
    // Update shortlist in list cache
    queryClient.setQueryData<Shortlist[]>(
      queryKeys.shortlists.lists(processId),
      (oldData) => 
        oldData?.map(shortlist => 
          shortlist.id === shortlistId ? { ...shortlist, ...updates } : shortlist
        ) || []
    );
    
    // Update shortlist details cache
    queryClient.setQueryData<Shortlist>(
      queryKeys.shortlists.detail(processId, shortlistId),
      (oldData) => oldData ? { ...oldData, ...updates } : undefined
    );
  };
  
  const revertOptimisticUpdate = (processId: string, shortlistId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shortlists.lists(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.shortlists.detail(processId, shortlistId) });
  };
  
  return {
    updateShortlistOptimistically,
    revertOptimisticUpdate,
  };
};