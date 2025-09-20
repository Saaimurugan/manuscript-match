/**
 * Integration tests for validation components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test that all validation components can be imported and rendered
describe('Validation Components Integration', () => {
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

  it('should import and render AuthorValidation component', async () => {
    const { AuthorValidation } = await import('../AuthorValidation');
    
    render(
      <AuthorValidation processId="test-process" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Author Validation')).toBeInTheDocument();
  });

  it('should import and render ValidationRulesForm component', async () => {
    const { ValidationRulesForm } = await import('../ValidationRulesForm');
    
    const mockRules = {
      excludeManuscriptAuthors: true,
      excludeCoAuthors: true,
      minimumPublications: 5,
      maxRetractions: 2,
      excludeInstitutionalConflicts: true,
    };

    render(
      <ValidationRulesForm 
        rules={mockRules} 
        onChange={() => {}} 
      />
    );

    expect(screen.getByText('Validation Rules')).toBeInTheDocument();
  });

  it('should import and render ValidationResults component', async () => {
    const { ValidationResults } = await import('../ValidationResults');
    
    const mockResults = {
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

    render(<ValidationResults results={mockResults} />);

    expect(screen.getByText('100')).toBeInTheDocument(); // Total candidates
    expect(screen.getByText('75')).toBeInTheDocument(); // Validated reviewers
  });

  it('should import and render ValidationStepDisplay component', async () => {
    const { ValidationStepDisplay } = await import('../ValidationStepDisplay');
    
    const mockSteps = {
      manuscriptAuthors: { excluded: 5, passed: 95 },
      coAuthors: { excluded: 10, passed: 90 },
      publications: { excluded: 8, passed: 92 },
      retractions: { excluded: 2, passed: 98 },
      institutions: { excluded: 0, passed: 100 },
    };

    const mockRules = {
      excludeManuscriptAuthors: true,
      excludeCoAuthors: true,
      minimumPublications: 5,
      maxRetractions: 2,
      excludeInstitutionalConflicts: true,
    };

    render(
      <ValidationStepDisplay 
        steps={mockSteps} 
        rules={mockRules} 
      />
    );

    expect(screen.getByText('Validation Steps')).toBeInTheDocument();
  });

  it('should import validation hook', async () => {
    const { useValidation } = await import('@/hooks/useValidation');
    expect(useValidation).toBeDefined();
  });

  it('should import validation service', async () => {
    const { validationService } = await import('@/services/validationService');
    expect(validationService).toBeDefined();
    expect(validationService.validateAuthors).toBeDefined();
    expect(validationService.getValidationResults).toBeDefined();
  });
});