/**
 * Tests for AuthorValidation component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthorValidation } from '../AuthorValidation';
import { useValidation } from '@/hooks/useValidation';
import type { ValidationResults } from '@/types/api';

// Mock the validation hook
jest.mock('@/hooks/useValidation');
const mockUseValidation = useValidation as jest.MockedFunction<typeof useValidation>;

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

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

describe('AuthorValidation', () => {
  const mockValidateAuthors = jest.fn();
  const mockRefetchResults = jest.fn();
  const onValidationComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchResults: mockRefetchResults,
      isValidating: false,
      validationError: null,
      results: null,
      isLoadingResults: false,
      resultsError: null,
      hasResults: false,
      isLoading: false,
    });
  });

  it('should render validation form', () => {
    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Author Validation')).toBeInTheDocument();
    expect(screen.getByText('Configure validation rules to filter potential reviewers and avoid conflicts of interest.')).toBeInTheDocument();
    expect(screen.getByText('Validate Authors')).toBeInTheDocument();
  });

  it('should display validation rules form', () => {
    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Exclude Manuscript Authors')).toBeInTheDocument();
    expect(screen.getByText('Exclude Co-Authors')).toBeInTheDocument();
    expect(screen.getByText('Exclude Institutional Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Minimum Publications')).toBeInTheDocument();
    expect(screen.getByText('Maximum Retractions')).toBeInTheDocument();
  });

  it('should handle validation button click', async () => {
    mockValidateAuthors.mockResolvedValue(mockValidationResults);

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    const validateButton = screen.getByText('Validate Authors');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(mockValidateAuthors).toHaveBeenCalledWith({
        excludeManuscriptAuthors: true,
        excludeCoAuthors: true,
        minimumPublications: 5,
        maxRetractions: 2,
        excludeInstitutionalConflicts: true,
      });
    });
  });

  it('should show loading state during validation', () => {
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchResults: mockRefetchResults,
      isValidating: true,
      validationError: null,
      results: null,
      isLoadingResults: false,
      resultsError: null,
      hasResults: false,
      isLoading: true,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Validate Authors')).toBeDisabled();
  });

  it('should display validation error', () => {
    const error = new Error('Validation failed');
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchResults: mockRefetchResults,
      isValidating: false,
      validationError: error,
      results: null,
      isLoadingResults: false,
      resultsError: null,
      hasResults: false,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Validation failed: Validation failed')).toBeInTheDocument();
  });

  it('should display validation results when available', () => {
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchResults: mockRefetchResults,
      isValidating: false,
      validationError: null,
      results: mockValidationResults,
      isLoadingResults: false,
      resultsError: null,
      hasResults: true,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Validation Results')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // Validated reviewers
    expect(screen.getByText('25')).toBeInTheDocument(); // Excluded reviewers
  });

  it('should show re-validate button when results exist', () => {
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchResults: mockRefetchResults,
      isValidating: false,
      validationError: null,
      results: mockValidationResults,
      isLoadingResults: false,
      resultsError: null,
      hasResults: true,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Re-validate Authors')).toBeInTheDocument();
    expect(screen.getByText('Apply New Rules')).toBeInTheDocument();
  });

  it('should call onValidationComplete after successful validation', async () => {
    mockValidateAuthors.mockResolvedValue(mockValidationResults);

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    const validateButton = screen.getByText('Validate Authors');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(onValidationComplete).toHaveBeenCalled();
    });
  });

  it('should update validation rules', () => {
    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    const minimumPublicationsInput = screen.getByDisplayValue('5');
    fireEvent.change(minimumPublicationsInput, { target: { value: '10' } });

    expect(minimumPublicationsInput).toHaveValue(10);
  });
});