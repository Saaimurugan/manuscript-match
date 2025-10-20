/**
 * React Query hooks for ScholarFinder API integration
 * Provides caching, error handling, and state management for all API operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scholarFinderApiService, ScholarFinderError, ScholarFinderErrorType } from '../services/ScholarFinderApiService';
import type {
  UploadResponse,
  MetadataResponse,
  KeywordEnhancementResponse,
  KeywordStringResponse,
  DatabaseSearchResponse,
  ManualAuthorResponse,
  ValidationResponse,
  RecommendationsResponse,
  KeywordSelection,
  DatabaseSelection
} from '../types/api';

/**
 * Query keys for React Query caching
 */
export const scholarFinderQueryKeys = {
  all: ['scholarfinder'] as const,
  metadata: (jobId: string) => [...scholarFinderQueryKeys.all, 'metadata', jobId] as const,
  keywords: (jobId: string) => [...scholarFinderQueryKeys.all, 'keywords', jobId] as const,
  validation: (jobId: string) => [...scholarFinderQueryKeys.all, 'validation', jobId] as const,
  recommendations: (jobId: string) => [...scholarFinderQueryKeys.all, 'recommendations', jobId] as const,
  jobStatus: (jobId: string) => [...scholarFinderQueryKeys.all, 'jobStatus', jobId] as const,
};

/**
 * Error handler for ScholarFinder operations
 */
const handleScholarFinderError = (error: ScholarFinderError, operation: string) => {
  console.error(`[ScholarFinder ${operation}]`, error);
  
  // Show user-friendly toast notification
  toast.error(error.message, {
    description: error.retryable ? 'You can try again in a moment.' : undefined,
    duration: error.type === ScholarFinderErrorType.FILE_FORMAT_ERROR ? 8000 : 5000,
  });
  
  return error;
};

/**
 * Hook for manuscript upload and metadata extraction
 */
export const useUploadManuscript = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => scholarFinderApiService.uploadManuscript(file),
    onSuccess: (data: UploadResponse) => {
      // Cache the metadata immediately
      queryClient.setQueryData(
        scholarFinderQueryKeys.metadata(data.data.job_id),
        {
          message: data.message,
          job_id: data.data.job_id,
          data: {
            heading: data.data.heading,
            authors: data.data.authors,
            affiliations: data.data.affiliations,
            keywords: data.data.keywords,
            abstract: data.data.abstract,
            author_aff_map: data.data.author_aff_map
          }
        } as MetadataResponse
      );
      
      toast.success('Manuscript uploaded successfully!', {
        description: 'Metadata has been extracted and is ready for review.'
      });
    },
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Upload');
    },
  });
};

/**
 * Hook for retrieving extracted metadata
 */
export const useMetadata = (jobId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: scholarFinderQueryKeys.metadata(jobId),
    queryFn: () => scholarFinderApiService.getMetadata(jobId),
    enabled: enabled && !!jobId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error: ScholarFinderError) => {
      // Don't retry validation errors or file format errors
      if (error.type === ScholarFinderErrorType.VALIDATION_ERROR || 
          error.type === ScholarFinderErrorType.FILE_FORMAT_ERROR) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for keyword enhancement
 */
export const useKeywordEnhancement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobId: string) => scholarFinderApiService.enhanceKeywords(jobId),
    onSuccess: (data: KeywordEnhancementResponse) => {
      // Cache the enhanced keywords
      queryClient.setQueryData(
        scholarFinderQueryKeys.keywords(data.job_id),
        data
      );
      
      toast.success('Keywords enhanced successfully!', {
        description: 'AI-generated keywords and MeSH terms are ready for selection.'
      });
    },
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Keyword Enhancement');
    },
  });
};

/**
 * Hook for keyword string generation
 */
export const useKeywordStringGeneration = () => {
  return useMutation({
    mutationFn: ({ jobId, keywords }: { jobId: string; keywords: KeywordSelection }) =>
      scholarFinderApiService.generateKeywordString(jobId, keywords),
    onSuccess: (data: KeywordStringResponse) => {
      toast.success('Search string generated!', {
        description: 'Boolean search query is ready for database search.'
      });
    },
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Keyword String Generation');
    },
  });
};

/**
 * Hook for database search
 */
export const useDatabaseSearch = () => {
  return useMutation({
    mutationFn: ({ jobId, databases }: { jobId: string; databases: DatabaseSelection }) =>
      scholarFinderApiService.searchDatabases(jobId, databases),
    onSuccess: (data: DatabaseSearchResponse) => {
      toast.success('Database search completed!', {
        description: `Found ${data.data.total_reviewers} potential reviewers across ${data.data.databases_searched.length} databases.`
      });
    },
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Database Search');
    },
  });
};

/**
 * Hook for manual author addition
 */
export const useManualAuthorAddition = () => {
  return useMutation({
    mutationFn: ({ jobId, authorName }: { jobId: string; authorName: string }) =>
      scholarFinderApiService.addManualAuthor(jobId, authorName),
    onSuccess: (data: ManualAuthorResponse) => {
      if (data.data.total_found > 0) {
        toast.success(`Found ${data.data.total_found} authors!`, {
          description: 'Select the authors you want to add to your candidate pool.'
        });
      } else {
        toast.info('No authors found', {
          description: 'Try searching with a different name or partial name.'
        });
      }
    },
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Manual Author Search');
    },
  });
};

/**
 * Hook for author validation
 */
export const useAuthorValidation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobId: string) => scholarFinderApiService.validateAuthors(jobId),
    onSuccess: (data: ValidationResponse) => {
      // Cache the validation response
      queryClient.setQueryData(
        scholarFinderQueryKeys.validation(data.job_id),
        data
      );
      
      if (data.data.validation_status === 'completed') {
        toast.success('Author validation completed!', {
          description: `Processed ${data.data.total_authors_processed} authors successfully.`
        });
      } else if (data.data.validation_status === 'in_progress') {
        toast.info('Validation started', {
          description: `Processing authors... ${data.data.progress_percentage}% complete.`
        });
      }
    },
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Author Validation');
    },
  });
};

/**
 * Hook for getting validation status (for manual status checks)
 */
export const useGetValidationStatus = () => {
  return useMutation({
    mutationFn: (jobId: string) => scholarFinderApiService.getValidationStatus(jobId),
    onError: (error: ScholarFinderError) => {
      handleScholarFinderError(error, 'Validation Status Check');
    },
  });
};

/**
 * Hook for polling validation status during long-running validation
 */
export const useValidationStatus = (jobId: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: scholarFinderQueryKeys.validation(jobId),
    queryFn: () => scholarFinderApiService.getValidationStatus(jobId),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      // Poll every 5 seconds if validation is in progress
      if (query.state.data?.data.validation_status === 'in_progress') {
        return 5000;
      }
      // Stop polling if completed or failed
      return false;
    },
    staleTime: 0, // Always fetch fresh data for status
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry validation errors
      if (error?.type === ScholarFinderErrorType.VALIDATION_ERROR) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for retrieving reviewer recommendations
 */
export const useRecommendations = (jobId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: scholarFinderQueryKeys.recommendations(jobId),
    queryFn: () => scholarFinderApiService.getRecommendations(jobId),
    enabled: enabled && !!jobId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error: ScholarFinderError) => {
      // Don't retry validation errors
      if (error.type === ScholarFinderErrorType.VALIDATION_ERROR) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for checking job status
 */
export const useJobStatus = (jobId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: scholarFinderQueryKeys.jobStatus(jobId),
    queryFn: () => scholarFinderApiService.checkJobStatus(jobId),
    enabled: enabled && !!jobId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry job status checks
  });
};

/**
 * Hook for invalidating all ScholarFinder queries
 */
export const useInvalidateScholarFinderQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.all });
    },
    invalidateJob: (jobId: string) => {
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.metadata(jobId) });
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.keywords(jobId) });
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.validation(jobId) });
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.recommendations(jobId) });
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.jobStatus(jobId) });
    },
    invalidateMetadata: (jobId: string) => {
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.metadata(jobId) });
    },
    invalidateKeywords: (jobId: string) => {
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.keywords(jobId) });
    },
    invalidateValidation: (jobId: string) => {
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.validation(jobId) });
    },
    invalidateRecommendations: (jobId: string) => {
      queryClient.invalidateQueries({ queryKey: scholarFinderQueryKeys.recommendations(jobId) });
    },
  };
};

/**
 * Hook for managing query cache and optimistic updates
 */
export const useScholarFinderCache = () => {
  const queryClient = useQueryClient();
  
  return {
    // Optimistically update metadata
    setOptimisticMetadata: (jobId: string, metadata: Partial<MetadataResponse['data']>) => {
      queryClient.setQueryData(
        scholarFinderQueryKeys.metadata(jobId),
        (old: MetadataResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: { ...old.data, ...metadata }
          };
        }
      );
    },
    
    // Optimistically update keyword selection
    setOptimisticKeywords: (jobId: string, keywords: Partial<KeywordEnhancementResponse['data']>) => {
      queryClient.setQueryData(
        scholarFinderQueryKeys.keywords(jobId),
        (old: KeywordEnhancementResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: { ...old.data, ...keywords }
          };
        }
      );
    },
    
    // Optimistically update validation progress
    setOptimisticValidation: (jobId: string, validation: Partial<ValidationResponse['data']>) => {
      queryClient.setQueryData(
        scholarFinderQueryKeys.validation(jobId),
        (old: ValidationResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: { ...old.data, ...validation }
          };
        }
      );
    },
    
    // Clear all cached data for a job
    clearJobCache: (jobId: string) => {
      queryClient.removeQueries({ queryKey: scholarFinderQueryKeys.metadata(jobId) });
      queryClient.removeQueries({ queryKey: scholarFinderQueryKeys.keywords(jobId) });
      queryClient.removeQueries({ queryKey: scholarFinderQueryKeys.validation(jobId) });
      queryClient.removeQueries({ queryKey: scholarFinderQueryKeys.recommendations(jobId) });
      queryClient.removeQueries({ queryKey: scholarFinderQueryKeys.jobStatus(jobId) });
    },
    
    // Prefetch related data
    prefetchJobData: async (jobId: string) => {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: scholarFinderQueryKeys.metadata(jobId),
          queryFn: () => scholarFinderApiService.getMetadata(jobId),
          staleTime: 10 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: scholarFinderQueryKeys.jobStatus(jobId),
          queryFn: () => scholarFinderApiService.checkJobStatus(jobId),
          staleTime: 2 * 60 * 1000,
        }),
      ]);
    },
  };
};

/**
 * Hook for prefetching next step data
 */
export const usePrefetchNextStep = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchMetadata: (jobId: string) => {
      queryClient.prefetchQuery({
        queryKey: scholarFinderQueryKeys.metadata(jobId),
        queryFn: () => scholarFinderApiService.getMetadata(jobId),
        staleTime: 10 * 60 * 1000,
      });
    },
    prefetchRecommendations: (jobId: string) => {
      queryClient.prefetchQuery({
        queryKey: scholarFinderQueryKeys.recommendations(jobId),
        queryFn: () => scholarFinderApiService.getRecommendations(jobId),
        staleTime: 15 * 60 * 1000,
      });
    },
  };
};

/**
 * Utility hook for error recovery
 */
export const useScholarFinderErrorRecovery = () => {
  const queryClient = useQueryClient();
  
  return {
    retryOperation: (jobId: string, operation: 'metadata' | 'keywords' | 'validation' | 'recommendations') => {
      const queryKey = {
        metadata: scholarFinderQueryKeys.metadata(jobId),
        keywords: scholarFinderQueryKeys.keywords(jobId),
        validation: scholarFinderQueryKeys.validation(jobId),
        recommendations: scholarFinderQueryKeys.recommendations(jobId),
      }[operation];
      
      queryClient.invalidateQueries({ queryKey });
      queryClient.refetchQueries({ queryKey });
    },
    clearErrorState: (jobId: string) => {
      // Remove any cached error states
      queryClient.removeQueries({ 
        queryKey: scholarFinderQueryKeys.all,
        predicate: (query) => query.state.error !== null 
      });
    },
  };
};

/**
 * Combined hook for all ScholarFinder API operations
 * Provides a single interface for all API hooks
 */
export const useScholarFinderApi = () => {
  return {
    // Upload and metadata
    uploadManuscript: useUploadManuscript(),
    useMetadata,
    
    // Keywords
    enhanceKeywords: useKeywordEnhancement(),
    generateKeywordString: useKeywordStringGeneration(),
    
    // Search and validation
    searchDatabases: useDatabaseSearch(),
    addManualAuthor: useManualAuthorAddition(),
    validateAuthors: useAuthorValidation(),
    getValidationStatus: useGetValidationStatus(),
    useValidationStatus,
    
    // Recommendations
    useRecommendations,
    
    // Utilities
    useJobStatus,
    cache: useScholarFinderCache(),
    prefetch: usePrefetchNextStep(),
    errorRecovery: useScholarFinderErrorRecovery(),
    invalidate: useInvalidateScholarFinderQueries(),
  };
};