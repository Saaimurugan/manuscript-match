/**
 * Loading states React Query hooks
 * Provides hooks for managing loading states and progress indicators
 */

import { useMemo } from 'react';

/**
 * Hook for combining multiple loading states
 */
export const useCombinedLoading = (...loadingStates: boolean[]) => {
  return useMemo(() => {
    return loadingStates.some(state => state);
  }, [loadingStates]);
};

/**
 * Hook for process workflow loading states
 */
export const useProcessWorkflowLoading = (
  processLoading: boolean,
  metadataLoading: boolean,
  keywordsLoading: boolean,
  searchLoading: boolean,
  validationLoading: boolean,
  recommendationsLoading: boolean
) => {
  const isAnyLoading = useCombinedLoading(
    processLoading,
    metadataLoading,
    keywordsLoading,
    searchLoading,
    validationLoading,
    recommendationsLoading
  );
  
  const loadingSteps = useMemo(() => {
    return {
      process: processLoading,
      metadata: metadataLoading,
      keywords: keywordsLoading,
      search: searchLoading,
      validation: validationLoading,
      recommendations: recommendationsLoading,
    };
  }, [
    processLoading,
    metadataLoading,
    keywordsLoading,
    searchLoading,
    validationLoading,
    recommendationsLoading,
  ]);
  
  const completedSteps = useMemo(() => {
    return Object.values(loadingSteps).filter(loading => !loading).length;
  }, [loadingSteps]);
  
  const totalSteps = Object.keys(loadingSteps).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  
  return {
    isAnyLoading,
    loadingSteps,
    completedSteps,
    totalSteps,
    progressPercentage,
  };
};

/**
 * Hook for pagination loading states
 */
export const usePaginationLoading = (
  isLoading: boolean,
  isFetching: boolean,
  isPreviousData: boolean
) => {
  const isInitialLoading = isLoading && !isPreviousData;
  const isLoadingMore = isFetching && isPreviousData;
  const isRefreshing = isFetching && !isLoading && !isPreviousData;
  
  return {
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    isAnyLoading: isLoading || isFetching,
  };
};

/**
 * Hook for mutation loading states with progress
 */
export const useMutationProgress = (
  isLoading: boolean,
  progress?: number
) => {
  const progressPercentage = progress ?? (isLoading ? undefined : 100);
  const isIndeterminate = isLoading && progress === undefined;
  
  return {
    isLoading,
    progress: progressPercentage,
    isIndeterminate,
    isComplete: !isLoading && progress === 100,
  };
};

/**
 * Hook for file upload progress
 */
export const useUploadProgress = (
  isUploading: boolean,
  uploadProgress?: number
) => {
  const progress = uploadProgress ?? 0;
  const isComplete = !isUploading && progress === 100;
  const isStarted = isUploading || progress > 0;
  
  return {
    isUploading,
    progress,
    isComplete,
    isStarted,
    progressText: `${Math.round(progress)}%`,
  };
};

/**
 * Hook for search progress tracking
 */
export const useSearchProgressStates = (
  searchStatus?: string,
  progress?: Record<string, { status: string; count: number }>
) => {
  const isSearching = searchStatus === 'IN_PROGRESS' || searchStatus === 'PENDING';
  const isCompleted = searchStatus === 'COMPLETED';
  const isFailed = searchStatus === 'FAILED';
  
  const databaseProgress = useMemo(() => {
    if (!progress) return {};
    
    return Object.entries(progress).reduce((acc, [database, info]) => {
      acc[database] = {
        ...info,
        isCompleted: info.status === 'COMPLETED',
        isFailed: info.status === 'FAILED',
        isInProgress: info.status === 'IN_PROGRESS',
      };
      return acc;
    }, {} as Record<string, any>);
  }, [progress]);
  
  const overallProgress = useMemo(() => {
    if (!progress) return 0;
    
    const databases = Object.keys(progress);
    const completedDatabases = databases.filter(db => 
      progress[db].status === 'COMPLETED'
    ).length;
    
    return databases.length > 0 ? (completedDatabases / databases.length) * 100 : 0;
  }, [progress]);
  
  return {
    isSearching,
    isCompleted,
    isFailed,
    databaseProgress,
    overallProgress,
    progressText: `${Math.round(overallProgress)}%`,
  };
};