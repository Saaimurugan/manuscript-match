/**
 * React Query hooks for Process Management
 * Provides caching, error handling, and state management for process operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  processManagementService, 
  CreateProcessRequest, 
  UpdateProcessRequest, 
  ProcessListFilters 
} from '../services/ProcessManagementService';
import { ProcessStep, ProcessStatus, type Process } from '../types/process';
import type { Reviewer } from '../types/api';

/**
 * Query keys for React Query caching
 */
export const processQueryKeys = {
  all: ['processes'] as const,
  lists: () => [...processQueryKeys.all, 'list'] as const,
  list: (filters?: ProcessListFilters) => [...processQueryKeys.lists(), filters] as const,
  details: () => [...processQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...processQueryKeys.details(), id] as const,
  statistics: () => [...processQueryKeys.all, 'statistics'] as const,
};

/**
 * Hook for creating a new process
 */
export const useCreateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateProcessRequest) => processManagementService.createProcess(request),
    onSuccess: (newProcess: Process) => {
      // Add to process list cache
      queryClient.setQueryData(processQueryKeys.detail(newProcess.id), newProcess);
      
      // Invalidate process lists to include new process
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
      
      toast.success('Process created successfully!', {
        description: `"${newProcess.title}" is ready for manuscript upload.`
      });
    },
    onError: (error: any) => {
      console.error('[Process Creation]', error);
      toast.error('Failed to create process', {
        description: error.message || 'Please try again.'
      });
    },
  });
};

/**
 * Hook for getting a specific process
 */
export const useProcess = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: processQueryKeys.detail(processId),
    queryFn: () => processManagementService.getProcess(processId),
    enabled: enabled && !!processId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if process not found
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};/**
 * H
ook for updating a process
 */
export const useUpdateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, updates }: { processId: string; updates: UpdateProcessRequest }) =>
      processManagementService.updateProcess(processId, updates),
    onSuccess: (updatedProcess: Process) => {
      // Update cached process data
      queryClient.setQueryData(processQueryKeys.detail(updatedProcess.id), updatedProcess);
      
      // Invalidate process lists to reflect changes
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      
      toast.success('Process updated successfully!');
    },
    onError: (error: any) => {
      console.error('[Process Update]', error);
      toast.error('Failed to update process', {
        description: error.message || 'Please try again.'
      });
    },
  });
};

/**
 * Hook for updating process step
 */
export const useUpdateProcessStep = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, step, stepData }: { processId: string; step: ProcessStep; stepData?: any }) =>
      processManagementService.updateProcessStep(processId, step, stepData),
    onSuccess: (updatedProcess: Process) => {
      // Update cached process data
      queryClient.setQueryData(processQueryKeys.detail(updatedProcess.id), updatedProcess);
      
      // Invalidate process lists
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
    },
    onError: (error: any) => {
      console.error('[Process Step Update]', error);
      toast.error('Failed to update process step', {
        description: error.message || 'Please try again.'
      });
    },
  });
};

/**
 * Hook for getting user's process list
 */
export const useProcessList = (filters?: ProcessListFilters) => {
  return useQuery({
    queryKey: processQueryKeys.list(filters),
    queryFn: () => processManagementService.listUserProcesses(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for deleting a process
 */
export const useDeleteProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (processId: string) => processManagementService.deleteProcess(processId),
    onSuccess: (_, processId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: processQueryKeys.detail(processId) });
      
      // Invalidate process lists
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
      
      toast.success('Process deleted successfully!');
    },
    onError: (error: any) => {
      console.error('[Process Deletion]', error);
      toast.error('Failed to delete process', {
        description: error.message || 'Please try again.'
      });
    },
  });
};

/**
 * Hook for managing shortlist operations
 */
export const useShortlistManagement = (processId: string) => {
  const queryClient = useQueryClient();
  
  const addToShortlist = useMutation({
    mutationFn: (reviewer: Reviewer) => processManagementService.addToShortlist(processId, reviewer),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      
      toast.success('Reviewer added to shortlist!');
    },
    onError: (error: any) => {
      console.error('[Add to Shortlist]', error);
      toast.error('Failed to add reviewer to shortlist', {
        description: error.message || 'Please try again.'
      });
    },
  });

  const removeFromShortlist = useMutation({
    mutationFn: (reviewerEmail: string) => processManagementService.removeFromShortlist(processId, reviewerEmail),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      
      toast.success('Reviewer removed from shortlist!');
    },
    onError: (error: any) => {
      console.error('[Remove from Shortlist]', error);
      toast.error('Failed to remove reviewer from shortlist', {
        description: error.message || 'Please try again.'
      });
    },
  });

  const clearShortlist = useMutation({
    mutationFn: () => processManagementService.clearShortlist(processId),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      
      toast.success('Shortlist cleared!');
    },
    onError: (error: any) => {
      console.error('[Clear Shortlist]', error);
      toast.error('Failed to clear shortlist', {
        description: error.message || 'Please try again.'
      });
    },
  });

  return {
    addToShortlist,
    removeFromShortlist,
    clearShortlist,
  };
};/*
*
 * Hook for process statistics
 */
export const useProcessStatistics = () => {
  return useQuery({
    queryKey: processQueryKeys.statistics(),
    queryFn: () => processManagementService.getProcessStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

/**
 * Hook for duplicating a process
 */
export const useDuplicateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, newTitle }: { processId: string; newTitle: string }) =>
      processManagementService.duplicateProcess(processId, newTitle),
    onSuccess: (newProcess: Process) => {
      // Add to cache
      queryClient.setQueryData(processQueryKeys.detail(newProcess.id), newProcess);
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
      
      toast.success('Process duplicated successfully!', {
        description: `"${newProcess.title}" is ready for use.`
      });
    },
    onError: (error: any) => {
      console.error('[Process Duplication]', error);
      toast.error('Failed to duplicate process', {
        description: error.message || 'Please try again.'
      });
    },
  });
};

/**
 * Hook for process status operations
 */
export const useProcessStatusOperations = () => {
  const queryClient = useQueryClient();
  
  const completeProcess = useMutation({
    mutationFn: (processId: string) => processManagementService.completeProcess(processId),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(updatedProcess.id), updatedProcess);
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
      
      toast.success('Process completed successfully!', {
        description: 'All steps have been finished.'
      });
    },
    onError: (error: any) => {
      console.error('[Complete Process]', error);
      toast.error('Failed to complete process', {
        description: error.message || 'Please try again.'
      });
    },
  });

  const failProcess = useMutation({
    mutationFn: ({ processId, error }: { processId: string; error?: string }) =>
      processManagementService.failProcess(processId, error),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(updatedProcess.id), updatedProcess);
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
    },
    onError: (error: any) => {
      console.error('[Fail Process]', error);
      toast.error('Failed to update process status', {
        description: error.message || 'Please try again.'
      });
    },
  });

  const cancelProcess = useMutation({
    mutationFn: (processId: string) => processManagementService.cancelProcess(processId),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(updatedProcess.id), updatedProcess);
      queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
      
      toast.success('Process cancelled successfully!');
    },
    onError: (error: any) => {
      console.error('[Cancel Process]', error);
      toast.error('Failed to cancel process', {
        description: error.message || 'Please try again.'
      });
    },
  });

  return {
    completeProcess,
    failProcess,
    cancelProcess,
  };
};

/**
 * Hook for step-specific data updates
 */
export const useStepDataUpdates = (processId: string) => {
  const queryClient = useQueryClient();
  
  const updateUploadData = useMutation({
    mutationFn: (data: Parameters<typeof processManagementService.updateUploadStepData>[1]) =>
      processManagementService.updateUploadStepData(processId, data),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
    },
  });

  const updateMetadataData = useMutation({
    mutationFn: (data: Parameters<typeof processManagementService.updateMetadataStepData>[1]) =>
      processManagementService.updateMetadataStepData(processId, data),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
    },
  });

  const updateKeywordData = useMutation({
    mutationFn: (data: Parameters<typeof processManagementService.updateKeywordStepData>[1]) =>
      processManagementService.updateKeywordStepData(processId, data),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
    },
  });

  const updateSearchData = useMutation({
    mutationFn: (data: Parameters<typeof processManagementService.updateSearchStepData>[1]) =>
      processManagementService.updateSearchStepData(processId, data),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
    },
  });

  const updateValidationData = useMutation({
    mutationFn: (data: Parameters<typeof processManagementService.updateValidationStepData>[1]) =>
      processManagementService.updateValidationStepData(processId, data),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
    },
  });

  const updateRecommendationsData = useMutation({
    mutationFn: (data: Parameters<typeof processManagementService.updateRecommendationsStepData>[1]) =>
      processManagementService.updateRecommendationsStepData(processId, data),
    onSuccess: (updatedProcess: Process) => {
      queryClient.setQueryData(processQueryKeys.detail(processId), updatedProcess);
    },
  });

  return {
    updateUploadData,
    updateMetadataData,
    updateKeywordData,
    updateSearchData,
    updateValidationData,
    updateRecommendationsData,
  };
};/**

 * Hook for process navigation and step management
 */
export const useProcessNavigation = (processId: string) => {
  const { data: process } = useProcess(processId);
  const updateStep = useUpdateProcessStep();
  
  const canNavigateToStep = (targetStep: ProcessStep): boolean => {
    if (!process) return false;
    
    const stepOrder = [
      ProcessStep.UPLOAD,
      ProcessStep.METADATA,
      ProcessStep.KEYWORDS,
      ProcessStep.SEARCH,
      ProcessStep.MANUAL,
      ProcessStep.VALIDATION,
      ProcessStep.RECOMMENDATIONS,
      ProcessStep.SHORTLIST,
      ProcessStep.EXPORT
    ];
    
    const currentIndex = stepOrder.indexOf(process.currentStep);
    const targetIndex = stepOrder.indexOf(targetStep);
    
    // Can navigate to current step or any previous completed step
    return targetIndex <= currentIndex;
  };

  const navigateToStep = (step: ProcessStep) => {
    if (!canNavigateToStep(step)) {
      toast.error('Cannot navigate to this step', {
        description: 'Please complete the previous steps first.'
      });
      return;
    }
    
    updateStep.mutate({ processId, step });
  };

  const nextStep = () => {
    if (!process) return;
    
    const stepOrder = [
      ProcessStep.UPLOAD,
      ProcessStep.METADATA,
      ProcessStep.KEYWORDS,
      ProcessStep.SEARCH,
      ProcessStep.MANUAL,
      ProcessStep.VALIDATION,
      ProcessStep.RECOMMENDATIONS,
      ProcessStep.SHORTLIST,
      ProcessStep.EXPORT
    ];
    
    const currentIndex = stepOrder.indexOf(process.currentStep);
    if (currentIndex < stepOrder.length - 1) {
      const nextStepValue = stepOrder[currentIndex + 1];
      updateStep.mutate({ processId, step: nextStepValue });
    }
  };

  const previousStep = () => {
    if (!process) return;
    
    const stepOrder = [
      ProcessStep.UPLOAD,
      ProcessStep.METADATA,
      ProcessStep.KEYWORDS,
      ProcessStep.SEARCH,
      ProcessStep.MANUAL,
      ProcessStep.VALIDATION,
      ProcessStep.RECOMMENDATIONS,
      ProcessStep.SHORTLIST,
      ProcessStep.EXPORT
    ];
    
    const currentIndex = stepOrder.indexOf(process.currentStep);
    if (currentIndex > 0) {
      const prevStepValue = stepOrder[currentIndex - 1];
      updateStep.mutate({ processId, step: prevStepValue });
    }
  };

  return {
    currentStep: process?.currentStep,
    canNavigateToStep,
    navigateToStep,
    nextStep,
    previousStep,
    isNavigating: updateStep.isPending,
  };
};

/**
 * Hook for invalidating process-related queries
 */
export const useInvalidateProcessQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: processQueryKeys.all });
    },
    invalidateProcess: (processId: string) => {
      queryClient.invalidateQueries({ queryKey: processQueryKeys.detail(processId) });
    },
    invalidateProcessList: (filters?: ProcessListFilters) => {
      if (filters) {
        queryClient.invalidateQueries({ queryKey: processQueryKeys.list(filters) });
      } else {
        queryClient.invalidateQueries({ queryKey: processQueryKeys.lists() });
      }
    },
    invalidateStatistics: () => {
      queryClient.invalidateQueries({ queryKey: processQueryKeys.statistics() });
    },
  };
};

/**
 * Hook for prefetching process data
 */
export const usePrefetchProcess = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchProcess: (processId: string) => {
      queryClient.prefetchQuery({
        queryKey: processQueryKeys.detail(processId),
        queryFn: () => processManagementService.getProcess(processId),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchProcessList: (filters?: ProcessListFilters) => {
      queryClient.prefetchQuery({
        queryKey: processQueryKeys.list(filters),
        queryFn: () => processManagementService.listUserProcesses(filters),
        staleTime: 2 * 60 * 1000,
      });
    },
  };
};