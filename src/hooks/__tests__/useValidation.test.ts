/**
 * Tests for validation hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useValidation, useValidateAuthors, useValidationResults } from '../useValidation';
import { validationService } from '@/services/validationService';
import type { ValidationRequest, ValidationResults } from '@/types/api';

// Mock the validation service
jest.mock('@/services/validationService');
const mockValidationService = validationService as jest.Mocked<typeof validationService>;

// Mock error handling hook
jest.mock('../useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockValidationResults: ValidationResults = {
  totalCandidates: 100,
  validatedReviewers: 75,
  excludedReviewers: 25,
  validationSteps: {
    manuscriptAuthors: { excluded: 5, passed: 95 },
    coAuthors: { excluded: 10, passed: 90 },
    publications: { excluded: 8, passed: 92 },
    retractions: { excluded: 2, passed: 98 },
    institutions: { excluded: 0, passed: 100 },
  },
};

const mockValidationRequest: ValidationRequest = {
  rules: {
    excludeManuscriptAuthors: true,
    excludeCoAuthors: true,
    minimumPublications: 5,
    maxRetractions: 2,
    excludeInstitutionalConflicts: true,
  },
};

describe('useValidateAuthors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate authors successfully', async () => {
    mockValidationService.validateAuthors.mockResolvedValue(mockValidationResults);

    const { result } = renderHook(
      () => useValidateAuthors('process-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockValidationRequest);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockValidationService.validateAuthors).toHaveBeenCalledWith(
      'process-1',
      mockValidationRequest
    );
    expect(result.current.data).toEqual(mockValidationResults);
  });

  it('should handle validation errors', async () => {
    const error = new Error('Validation failed');
    mockValidationService.validateAuthors.mockRejectedValue(error);

    const { result } = renderHook(
      () => useValidateAuthors('process-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockValidationRequest);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useValidationResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch validation results successfully', async () => {
    mockValidationService.getValidationResults.mockResolvedValue(mockValidationResults);

    const { result } = renderHook(
      () => useValidationResults('process-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockValidationService.getValidationResults).toHaveBeenCalledWith('process-1');
    expect(result.current.data).toEqual(mockValidationResults);
  });

  it('should not fetch when disabled', () => {
    const { result } = renderHook(
      () => useValidationResults('process-1', false),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockValidationService.getValidationResults).not.toHaveBeenCalled();
  });

  it('should not retry on 404 errors', async () => {
    const error = { response: { status: 404 } };
    mockValidationService.getValidationResults.mockRejectedValue(error);

    const { result } = renderHook(
      () => useValidationResults('process-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should only be called once (no retries for 404)
    expect(mockValidationService.getValidationResults).toHaveBeenCalledTimes(1);
  });
});

describe('useValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide combined validation functionality', async () => {
    mockValidationService.validateAuthors.mockResolvedValue(mockValidationResults);
    mockValidationService.getValidationResults.mockResolvedValue(mockValidationResults);

    const { result } = renderHook(
      () => useValidation('process-1'),
      { wrapper: createWrapper() }
    );

    // Test validation
    await result.current.validateAuthors(mockValidationRequest.rules);

    await waitFor(() => {
      expect(result.current.hasResults).toBe(true);
    });

    expect(result.current.results).toEqual(mockValidationResults);
    expect(result.current.isValidating).toBe(false);
  });

  it('should handle loading states correctly', () => {
    const { result } = renderHook(
      () => useValidation('process-1'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBeDefined();
    expect(result.current.isValidating).toBeDefined();
    expect(result.current.isLoadingResults).toBeDefined();
  });
});