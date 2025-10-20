/**
 * usePrefetch Hook
 * Custom hook for progressive loading and background prefetching of workflow steps
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ProcessStep } from '../types/process';
import { useScholarFinderApi } from './useScholarFinderApi';

interface PrefetchOptions {
  enabled?: boolean;
  staleTime?: number;
  priority?: 'high' | 'normal' | 'low';
  delay?: number;
}

interface StepPrefetchConfig {
  step: ProcessStep;
  dependencies?: ProcessStep[];
  prefetchFn: () => Promise<any>;
  options?: PrefetchOptions;
}

/**
 * Hook for prefetching data for upcoming workflow steps
 */
export function usePrefetch(
  currentStep: ProcessStep,
  jobId: string,
  processId: string,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const api = useScholarFinderApi();
  const prefetchTimeoutsRef = useRef<Map<ProcessStep, NodeJS.Timeout>>(new Map());

  // Define prefetch configurations for each step
  const prefetchConfigs: StepPrefetchConfig[] = [
    {
      step: ProcessStep.METADATA,
      dependencies: [ProcessStep.UPLOAD],
      prefetchFn: () => api.getMetadata(jobId),
      options: { priority: 'high', delay: 1000 }
    },
    {
      step: ProcessStep.KEYWORDS,
      dependencies: [ProcessStep.METADATA],
      prefetchFn: () => api.enhanceKeywords(jobId),
      options: { priority: 'high', delay: 2000 }
    },
    {
      step: ProcessStep.SEARCH,
      dependencies: [ProcessStep.KEYWORDS],
      prefetchFn: () => api.getSearchProgress(jobId),
      options: { priority: 'normal', delay: 3000 }
    },
    {
      step: ProcessStep.VALIDATION,
      dependencies: [ProcessStep.SEARCH, ProcessStep.MANUAL],
      prefetchFn: () => api.getValidationStatus(jobId),
      options: { priority: 'normal', delay: 5000 }
    },
    {
      step: ProcessStep.RECOMMENDATIONS,
      dependencies: [ProcessStep.VALIDATION],
      prefetchFn: () => api.getRecommendations(jobId),
      options: { priority: 'high', delay: 1000 }
    },
    {
      step: ProcessStep.SHORTLIST,
      dependencies: [ProcessStep.RECOMMENDATIONS],
      prefetchFn: () => queryClient.prefetchQuery({
        queryKey: ['shortlist', processId],
        queryFn: () => Promise.resolve([]), // Shortlist is managed locally
        staleTime: 5 * 60 * 1000
      }),
      options: { priority: 'low', delay: 2000 }
    }
  ];

  // Get the next steps to prefetch based on current step
  const getNextSteps = useCallback((current: ProcessStep): ProcessStep[] => {
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

    const currentIndex = stepOrder.indexOf(current);
    if (currentIndex === -1) return [];

    // Return next 2-3 steps for prefetching
    return stepOrder.slice(currentIndex + 1, currentIndex + 4);
  }, []);

  // Check if dependencies are met for a step
  const areDependenciesMet = useCallback((
    step: ProcessStep,
    dependencies: ProcessStep[] = [],
    completedSteps: ProcessStep[]
  ): boolean => {
    if (dependencies.length === 0) return true;
    return dependencies.every(dep => completedSteps.includes(dep));
  }, []);

  // Prefetch function with priority and delay handling
  const prefetchStep = useCallback(async (
    config: StepPrefetchConfig,
    completedSteps: ProcessStep[]
  ) => {
    const { step, dependencies = [], prefetchFn, options = {} } = config;
    const { 
      enabled: stepEnabled = true, 
      priority = 'normal', 
      delay = 0,
      staleTime = 5 * 60 * 1000 
    } = options;

    if (!stepEnabled || !enabled) return;
    if (!areDependenciesMet(step, dependencies, completedSteps)) return;

    // Clear any existing timeout for this step
    const existingTimeout = prefetchTimeoutsRef.current.get(step);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule prefetch with delay based on priority
    const actualDelay = priority === 'high' ? delay / 2 : 
                       priority === 'low' ? delay * 2 : delay;

    const timeoutId = setTimeout(async () => {
      try {
        const queryKey = ['prefetch', step, jobId];
        
        // Check if data is already cached and fresh
        const existingData = queryClient.getQueryData(queryKey);
        const queryState = queryClient.getQueryState(queryKey);
        
        if (existingData && queryState && 
            Date.now() - queryState.dataUpdatedAt < staleTime) {
          return; // Data is fresh, skip prefetch
        }

        // Perform prefetch
        await queryClient.prefetchQuery({
          queryKey,
          queryFn: prefetchFn,
          staleTime,
          // Lower priority queries can be cancelled if higher priority ones are needed
          meta: { priority }
        });

        console.debug(`Prefetched data for step: ${step}`);
      } catch (error) {
        console.warn(`Failed to prefetch step ${step}:`, error);
      } finally {
        prefetchTimeoutsRef.current.delete(step);
      }
    }, actualDelay);

    prefetchTimeoutsRef.current.set(step, timeoutId);
  }, [enabled, queryClient, areDependenciesMet]);

  // Main prefetch effect
  useEffect(() => {
    if (!enabled || !jobId) return;

    const nextSteps = getNextSteps(currentStep);
    const completedSteps = [currentStep]; // In real implementation, this would come from context

    // Prefetch next steps
    nextSteps.forEach(step => {
      const config = prefetchConfigs.find(c => c.step === step);
      if (config) {
        prefetchStep(config, completedSteps);
      }
    });

    // Cleanup function
    return () => {
      prefetchTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      prefetchTimeoutsRef.current.clear();
    };
  }, [currentStep, jobId, enabled, getNextSteps, prefetchStep, prefetchConfigs]);

  // Manual prefetch function for specific steps
  const prefetchSpecificStep = useCallback(async (
    step: ProcessStep,
    options: PrefetchOptions = {}
  ) => {
    const config = prefetchConfigs.find(c => c.step === step);
    if (!config) return;

    const mergedConfig = {
      ...config,
      options: { ...config.options, ...options }
    };

    await prefetchStep(mergedConfig, [currentStep]);
  }, [prefetchConfigs, prefetchStep, currentStep]);

  // Cancel all pending prefetches
  const cancelPrefetches = useCallback(() => {
    prefetchTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    prefetchTimeoutsRef.current.clear();
  }, []);

  // Get prefetch status
  const getPrefetchStatus = useCallback((step: ProcessStep) => {
    const queryKey = ['prefetch', step, jobId];
    const queryState = queryClient.getQueryState(queryKey);
    
    return {
      isPrefetched: !!queryState?.data,
      isStale: queryState ? Date.now() - queryState.dataUpdatedAt > (5 * 60 * 1000) : true,
      lastUpdated: queryState?.dataUpdatedAt,
      isPending: prefetchTimeoutsRef.current.has(step)
    };
  }, [queryClient, jobId]);

  return {
    prefetchSpecificStep,
    cancelPrefetches,
    getPrefetchStatus
  };
}

/**
 * Hook for progressive loading with skeleton states
 */
export function useProgressiveLoading<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    showSkeleton?: boolean;
    skeletonDelay?: number;
    staleTime?: number;
  } = {}
) {
  const {
    enabled = true,
    showSkeleton = true,
    skeletonDelay = 200,
    staleTime = 5 * 60 * 1000
  } = options;

  const queryClient = useQueryClient();
  const [showSkeletonState, setShowSkeletonState] = useState(false);
  const skeletonTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if we have cached data
  const cachedData = queryClient.getQueryData<T>(queryKey);
  const hasCache = !!cachedData;

  // Show skeleton after delay if no cached data
  useEffect(() => {
    if (!enabled || hasCache || !showSkeleton) return;

    skeletonTimeoutRef.current = setTimeout(() => {
      setShowSkeletonState(true);
    }, skeletonDelay);

    return () => {
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current);
      }
    };
  }, [enabled, hasCache, showSkeleton, skeletonDelay]);

  // Use React Query with progressive loading
  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    // Return cached data immediately while fetching fresh data
    placeholderData: cachedData,
    // Keep previous data while loading new data
    keepPreviousData: true
  });

  // Hide skeleton when data loads
  useEffect(() => {
    if (query.data) {
      setShowSkeletonState(false);
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current);
      }
    }
  }, [query.data]);

  return {
    ...query,
    showSkeleton: showSkeletonState && !hasCache,
    hasCache,
    isLoadingFresh: query.isLoading && !hasCache
  };
}