/**
 * ValidationStep Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ValidationStep } from '../ValidationStep';
import { useScholarFinderApi } from '../../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../../hooks/useProcessManagement';
import { ProcessStep } from '../../../types/process';

// Mock the hooks and dependencies
vi.mock('../../../hooks/useScholarFinderApi');
vi.mock('../../../hooks/useProcessManagement');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 30000,
    enableDebugLogging: false,
  },
}));

// Mock the sub-components
vi.mock('../validation', () => ({
  ValidationProgress: ({ progressPercentage }: { progressPercentage: number }) => (
    <div data-testid="validation-progress">Progress: {progressPercentage}%</div>
  ),
  ValidationSummary: ({ summary }: { summary: any }) => (
    <div data-testid="validation-summary">
      Authors validated: {summary.authors_validated}
    </div>
  ),
}));

const mockValidateAuthors = vi.fn();
const mockGetValidationStatus = vi.fn();
const mockUseProcess = vi.fn();
const mockUpdateProcessStep = vi.fn();

const mockValidationResponse = {
  message: 'Validation started',
  job_id: 'test-job-123',
  data: {
    validation_status: 'in_progress' as const,
    progress_percentage: 45,
    estimated_completion_time: '5 minutes',
    total_authors_processed: 150,
    validation_criteria: [
      'No co-authorship conflicts',
      'Minimum publication count',
      'Recent publication activity',
      'Geographic diversity'
    ],
    summary: undefined
  }
};

const mockCompletedValidationResponse = {
  ...mockValidationResponse,
  data: {
    ...mockValidationResponse.data,
    validation_status: 'completed' as const,
    progress_percentage: 100,
    total_authors_processed: 200,
    summary: {
      total_authors: 200,
      authors_validated: 180,
      conditions_applied: ['No co-authorship conflicts', 'Minimum publication count'],
      average_conditions_met: 6.5
    }
  }
};

describe('ValidationStep', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    (useScholarFinderApi as any).mockReturnValue({
      validateAuthors: {
        mutateAsync: mockValidateAuthors,
        isPending: false,
        error: null,
      },
      getValidationStatus: {
        mutateAsync: mockGetValidationStatus,
        isPending: false,
        error: null,
      },
    });

    (useProcess as any).mockReturnValue({
      data: {
        id: 'test-process-123',
        stepData: {},
      },
    });

    (useUpdateProcessStep as any).mockReturnValue({
      mutateAsync: mockUpdateProcessStep,
    });
  });

  const renderValidationStep = (props = {}) => {
    const defaultProps = {
      processId: 'test-process-123',
      jobId: 'test-job-123',
      onNext: vi.fn(),
      onPrevious: vi.fn(),
      isLoading: false,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ValidationStep {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Initial State', () => {
    it('renders validation step header correctly', () => {
      renderValidationStep();
      
      expect(screen.getByText('Author Validation')).toBeInTheDocument();
      expect(screen.getByText(/Validate potential reviewers against conflict of interest rules/)).toBeInTheDocument();
    });

    it('shows start validation button when idle', () => {
      renderValidationStep();
      
      expect(screen.getByRole('button', { name: /Start Validation/i })).toBeInTheDocument();
      expect(screen.getByText('Ready to start validation')).toBeInTheDocument();
    });

    it('shows navigation buttons', () => {
      renderValidationStep();
      
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Complete Validation to Continue/i })).toBeInTheDocument();
    });
  });

  describe('Validation Process', () => {
    it('starts validation when start button is clicked', async () => {
      mockValidateAuthors.mockResolvedValue(mockValidationResponse);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockValidateAuthors).toHaveBeenCalledWith('test-job-123');
      });
    });

    it('shows validation progress when in progress', async () => {
      mockValidateAuthors.mockResolvedValue(mockValidationResponse);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('validation-progress')).toBeInTheDocument();
        expect(screen.getByText('Progress: 45%')).toBeInTheDocument();
      });
    });

    it('shows validation summary when completed', async () => {
      mockValidateAuthors.mockResolvedValue(mockCompletedValidationResponse);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('validation-summary')).toBeInTheDocument();
        expect(screen.getByText('Authors validated: 180')).toBeInTheDocument();
      });
    });

    it('enables next button when validation is completed', async () => {
      mockValidateAuthors.mockResolvedValue(mockCompletedValidationResponse);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /View Recommendations/i });
        expect(nextButton).toBeEnabled();
      });
    });
  });

  describe('Status Checking', () => {
    it('shows check status button during validation', async () => {
      mockValidateAuthors.mockResolvedValue(mockValidationResponse);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Check Status/i })).toBeInTheDocument();
      });
    });

    it('checks validation status when check status button is clicked', async () => {
      mockValidateAuthors.mockResolvedValue(mockValidationResponse);
      mockGetValidationStatus.mockResolvedValue(mockCompletedValidationResponse);
      renderValidationStep();
      
      // Start validation first
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const checkStatusButton = screen.getByRole('button', { name: /Check Status/i });
        fireEvent.click(checkStatusButton);
      });
      
      await waitFor(() => {
        expect(mockGetValidationStatus).toHaveBeenCalledWith('test-job-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('shows retry button when validation fails', async () => {
      const failedResponse = {
        ...mockValidationResponse,
        data: {
          ...mockValidationResponse.data,
          validation_status: 'failed' as const
        }
      };
      
      mockValidateAuthors.mockResolvedValue(failedResponse);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
      });
    });

    it('handles validation API errors', async () => {
      const error = new Error('Validation service unavailable');
      mockValidateAuthors.mockRejectedValue(error);
      renderValidationStep();
      
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('saves validation data when save button is clicked', async () => {
      mockValidateAuthors.mockResolvedValue(mockCompletedValidationResponse);
      mockUpdateProcessStep.mockResolvedValue({});
      renderValidationStep();
      
      // Complete validation first
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      // Wait for validation to complete and save button to be enabled
      await waitFor(() => {
        expect(screen.getByTestId('validation-summary')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByRole('button', { name: /Save Progress/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateProcessStep).toHaveBeenCalledWith({
          processId: 'test-process-123',
          step: ProcessStep.VALIDATION,
          stepData: expect.objectContaining({
            validationStatus: 'completed',
            validationResults: mockCompletedValidationResponse.data,
          }),
        });
      });
    });

    it('loads existing validation data on mount', () => {
      const existingData = {
        validationStatus: 'completed',
        validationResults: mockCompletedValidationResponse.data,
        lastValidated: new Date('2024-01-15T10:00:00Z'),
      };

      (useProcess as any).mockReturnValue({
        data: {
          id: 'test-process-123',
          stepData: {
            validation: existingData,
          },
        },
      });

      renderValidationStep();
      
      expect(screen.getByText('Validation completed successfully')).toBeInTheDocument();
      expect(screen.getByTestId('validation-summary')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('calls onPrevious when previous button is clicked', () => {
      const onPrevious = vi.fn();
      renderValidationStep({ onPrevious });
      
      const previousButton = screen.getByRole('button', { name: /Previous/i });
      fireEvent.click(previousButton);
      
      expect(onPrevious).toHaveBeenCalled();
    });

    it('calls onNext with validation data when next button is clicked', async () => {
      const onNext = vi.fn();
      mockValidateAuthors.mockResolvedValue(mockCompletedValidationResponse);
      mockUpdateProcessStep.mockResolvedValue({});
      
      renderValidationStep({ onNext });
      
      // Complete validation first
      const startButton = screen.getByRole('button', { name: /Start Validation/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /View Recommendations/i });
        fireEvent.click(nextButton);
      });
      
      await waitFor(() => {
        expect(onNext).toHaveBeenCalledWith({
          validationStatus: 'completed',
          validationResults: mockCompletedValidationResponse.data,
          totalAuthorsValidated: 200,
          validationSummary: mockCompletedValidationResponse.data.summary,
        });
      });
    });

    it('prevents navigation when validation is not completed', () => {
      const onNext = vi.fn();
      renderValidationStep({ onNext });
      
      const nextButton = screen.getByRole('button', { name: /Complete Validation to Continue/i });
      fireEvent.click(nextButton);
      
      expect(onNext).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during validation', () => {
      (useScholarFinderApi as any).mockReturnValue({
        validateAuthors: {
          mutateAsync: mockValidateAuthors,
          isPending: true,
          error: null,
        },
        getValidationStatus: {
          mutateAsync: mockGetValidationStatus,
          isPending: false,
          error: null,
        },
      });

      renderValidationStep();
      
      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });

    it('disables buttons during loading', () => {
      renderValidationStep({ isLoading: true });
      
      expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Processing.../i })).toBeDisabled();
    });
  });
});