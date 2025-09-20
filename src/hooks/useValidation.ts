/**
 * Validation hooks for author validation functionality
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { validationService } from '@/services/validationService';
import { useErrorHandling } from './useErrorHandling';
import type { ValidationRequest, ValidationResults } from '@/types/api';

/**
 * Hook for validating authors
 */
export const useValidateAuthors = (processId: string) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandling();

  return useMutation({
    mutationFn: (request: ValidationRequest) => 
      validationService.validateAuthors(processId, request),
    onSuccess: (data) => {
      // Invalidate and refetch validation results
      queryClient.invalidateQueries({ queryKey: ['validation-results', processId] });
      queryClient.setQueryData(['validation-results', processId], data);
    },
    onError: handleError,
  });
};

/**
 * Hook for fetching validation results
 */
export const useValidationResults = (processId: string, enabled = true) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['validation-results', processId],
    queryFn: () => validationService.getValidationResults(processId),
    enabled: enabled && !!processId,
    onError: handleError,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if validation hasn't been run yet (404)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for managing validation state and operations
 */
export const useValidation = (processId: string) => {
  const validateMutation = useValidateAuthors(processId);
  const validationResults = useValidationResults(processId, false);

  const validateAuthors = (rules: ValidationRequest['rules']) => {
    return validateMutation.mutateAsync({ rules });
  };

  const refetchResults = () => {
    return validationResults.refetch();
  };

  return {
    // Validation operations
    validateAuthors,
    refetchResults,
    
    // Validation state
    isValidating: validateMutation.isPending,
    validationError: validateMutation.error,
    
    // Results state
    results: validationResults.data,
    isLoadingResults: validationResults.isLoading,
    resultsError: validationResults.error,
    hasResults: !!validationResults.data,
    
    // Combined loading state
    isLoading: validateMutation.isPending || validationResults.isLoading,
  };
};