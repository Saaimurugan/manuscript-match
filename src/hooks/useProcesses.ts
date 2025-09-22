/**
 * Process management React Query hooks
 * Provides hooks for CRUD operations on manuscript analysis processes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { processService } from '../services/processService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import type { 
  Process, 
  CreateProcessRequest, 
  UpdateProcessRequest 
} from '../types/api';

/**
 * Hook for fetching all user processes
 */
export const useProcesses = () => {
  return useQuery({
    queryKey: queryKeys.processes.list(),
    queryFn: (): Promise<Process[]> => processService.getProcesses(),
    staleTime: 2 * 60 * 1000, // Process list is stable for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Hook for fetching a specific process
 */
export const useProcess = (processId: string) => {
  return useQuery({
    queryKey: queryKeys.processes.detail(processId),
    queryFn: (): Promise<Process> => processService.getProcess(processId),
    enabled: !!processId, // Only run query if processId is provided
    staleTime: 5 * 60 * 1000, // Process details are stable for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
};

/**
 * Hook for creating a new process
 */
export const useCreateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProcessRequest): Promise<Process> => 
      processService.createProcess(data),
    onSuccess: (newProcess) => {
      // Add new process to the processes list cache
      queryClient.setQueryData<Process[]>(
        queryKeys.processes.list(),
        (oldData) => oldData ? [newProcess, ...oldData] : [newProcess]
      );
      
      // Cache the new process details
      queryClient.setQueryData(
        queryKeys.processes.detail(newProcess.id),
        newProcess
      );
    },
    onError: (error) => {
      console.error('Failed to create process:', error);
    },
  });
};

/**
 * Hook for updating a process
 */
export const useUpdateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, data }: { processId: string; data: UpdateProcessRequest }): Promise<Process> => 
      processService.updateProcess(processId, data),
    onSuccess: (updatedProcess) => {
      // Update process in the list cache
      queryClient.setQueryData<Process[]>(
        queryKeys.processes.list(),
        (oldData) => 
          oldData?.map(process => 
            process.id === updatedProcess.id ? updatedProcess : process
          ) || []
      );
      
      // Update process details cache
      queryClient.setQueryData(
        queryKeys.processes.detail(updatedProcess.id),
        updatedProcess
      );
    },
    onError: (error) => {
      console.error('Failed to update process:', error);
    },
  });
};

/**
 * Hook for updating process step
 */
export const useUpdateProcessStep = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, step }: { processId: string; step: string }): Promise<Process> => 
      processService.updateProcessStep(processId, step),
    onSuccess: (updatedProcess) => {
      console.log('DEBUG: updateProcessStep onSuccess called with:', updatedProcess);
      
      // Safety check for updatedProcess
      if (!updatedProcess || !updatedProcess.id) {
        console.error('Invalid updatedProcess received:', updatedProcess);
        return;
      }
      
      // Update process in the list cache
      queryClient.setQueryData<Process[]>(
        queryKeys.processes.list(),
        (oldData) => 
          oldData?.map(process => 
            process.id === updatedProcess.id ? updatedProcess : process
          ) || []
      );
      
      // Update process details cache
      queryClient.setQueryData(
        queryKeys.processes.detail(updatedProcess.id),
        updatedProcess
      );
    },
    onError: (error) => {
      console.error('Failed to update process step:', error);
    },
  });
};

/**
 * Hook for deleting a process
 */
export const useDeleteProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (processId: string): Promise<void> => 
      processService.deleteProcess(processId),
    onSuccess: (_, processId) => {
      // Remove process from the list cache
      queryClient.setQueryData<Process[]>(
        queryKeys.processes.list(),
        (oldData) => oldData?.filter(process => process.id !== processId) || []
      );
      
      // Remove all process-related data from cache
      cacheUtils.removeProcess(queryClient, processId);
    },
    onError: (error) => {
      console.error('Failed to delete process:', error);
    },
  });
};

/**
 * Hook for optimistic process updates
 */
export const useOptimisticProcessUpdate = () => {
  const queryClient = useQueryClient();
  
  const updateProcessOptimistically = (processId: string, updates: Partial<Process>) => {
    // Optimistically update process in list cache
    queryClient.setQueryData<Process[]>(
      queryKeys.processes.list(),
      (oldData) => 
        oldData?.map(process => 
          process.id === processId ? { ...process, ...updates } : process
        ) || []
    );
    
    // Optimistically update process details cache
    queryClient.setQueryData<Process>(
      queryKeys.processes.detail(processId),
      (oldData) => oldData ? { ...oldData, ...updates } : undefined
    );
  };
  
  const revertOptimisticUpdate = (processId: string) => {
    // Invalidate caches to revert optimistic updates
    queryClient.invalidateQueries({ queryKey: queryKeys.processes.list() });
    queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
  };
  
  return {
    updateProcessOptimistically,
    revertOptimisticUpdate,
  };
};