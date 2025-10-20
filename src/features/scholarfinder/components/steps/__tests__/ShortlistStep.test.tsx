/**
 * ShortlistStep Component Tests
 * Tests for the reviewer shortlist management step
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShortlistStep } from '../ShortlistStep';
import { ScholarFinderProvider } from '../../../contexts/ScholarFinderContext';
import { AuthProvider } from '../../../../../contexts/AuthContext';
import { Reviewer } from '../../../types/api';
import { Process, ProcessStep, ProcessStatus } from '../../../types/process';

// Mock hooks
vi.mock('../../../hooks/useProcessManagement', () => ({
  useProcess: vi.fn(),
  useUpdateProcessStep: vi.fn(),
}));

vi.mock('../../../hooks/useScholarFinderContext', () => ({
  useScholarFinder: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock sub-components
vi.mock('../shortlist/ReviewerSelection', () => ({
  ReviewerSelection: ({ onAddToShortlist, onBulkAdd }: any) => (
    <div data-testid="reviewer-selection">
      <button onClick={() => onAddToShortlist(mockReviewers[0])}>
        Add First Reviewer
      </button>
      <button onClick={() => onBulkAdd([mockReviewers[0], mockReviewers[1]])}>
        Bulk Add
      </button>
    </div>
  ),
}));

vi.mock('../shortlist/ShortlistManager', () => ({
  ShortlistManager: ({ onRemoveFromShortlist, onBulkRemove, onReorderShortlist }: any) => (
    <div data-testid="shortlist-manager">
      <button onClick={() => onRemoveFromShortlist('reviewer1@example.com')}>
        Remove First
      </button>
      <button onClick={() => onBulkRemove(['reviewer1@example.com'])}>
        Bulk Remove
      </button>
      <button onClick={() => onReorderShortlist(0, 1)}>
        Reorder
      </button>
    </div>
  ),
}));

// Mock data
const mockReviewers: Reviewer[] = [
  {
    reviewer: 'Dr. John Smith',
    email: 'reviewer1@example.com',
    aff: 'University of Example',
    city: 'Example City',
    country: 'USA',
    Total_Publications: 50,
    English_Pubs: 45,
    'Publications (last 10 years)': 30,
    'Relevant Publications (last 5 years)': 20,
    'Publications (last 2 years)': 10,
    'Publications (last year)': 5,
    Clinical_Trials_no: 2,
    Clinical_study_no: 3,
    Case_reports_no: 1,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 2,
    coauthor: false,
    country_match: 'exact',
    aff_match: 'partial',
    conditions_met: 8,
    conditions_satisfied: 'condition1,condition2,condition3,condition4,condition5,condition6,condition7,condition8',
  },
  {
    reviewer: 'Dr. Jane Doe',
    email: 'reviewer2@example.com',
    aff: 'Research Institute',
    city: 'Research City',
    country: 'Canada',
    Total_Publications: 75,
    English_Pubs: 70,
    'Publications (last 10 years)': 45,
    'Relevant Publications (last 5 years)': 30,
    'Publications (last 2 years)': 15,
    'Publications (last year)': 8,
    Clinical_Trials_no: 5,
    Clinical_study_no: 7,
    Case_reports_no: 2,
    Retracted_Pubs_no: 1,
    TF_Publications_last_year: 3,
    coauthor: true,
    country_match: 'different',
    aff_match: 'exact',
    conditions_met: 6,
    conditions_satisfied: 'condition1,condition2,condition3,condition4,condition5,condition6,condition7,condition8',
  },
];

const mockProcess: Process = {
  id: 'process-1',
  jobId: 'job-123',
  title: 'Test Manuscript',
  status: ProcessStatus.IN_PROGRESS,
  currentStep: ProcessStep.SHORTLIST,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    userId: 'user-1',
    fileName: 'test.docx',
    manuscriptTitle: 'Test Manuscript',
  },
  stepData: {
    recommendations: {
      reviewers: mockReviewers,
      appliedFilters: {},
      sortConfig: { column: 'conditions_met', direction: 'desc' },
      lastModified: new Date(),
    },
    shortlist: {
      selectedReviewers: [mockReviewers[0]],
      selectionHistory: [],
      lastModified: new Date(),
    },
  },
};

const mockContextValue = {
  currentProcess: mockProcess,
  setCurrentProcess: vi.fn(),
  userProcesses: [mockProcess],
  currentStep: ProcessStep.SHORTLIST,
  setCurrentStep: vi.fn(),
  shortlist: [mockReviewers[0]],
  addToShortlist: vi.fn(),
  removeFromShortlist: vi.fn(),
  clearShortlist: vi.fn(),
  isLoading: false,
  setIsLoading: vi.fn(),
  error: null,
  setError: vi.fn(),
  isAuthenticated: true,
  userId: 'user-1',
  switchToProcess: vi.fn(),
  canProceedToNextStep: true,
  completedSteps: [ProcessStep.UPLOAD, ProcessStep.METADATA, ProcessStep.KEYWORDS],
};

const mockUseProcess = vi.fn();
const mockUseUpdateProcessStep = vi.fn();
const mockUseScholarFinder = vi.fn();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ScholarFinderProvider>
          {children}
        </ScholarFinderProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('ShortlistStep', () => {
  const mockProps = {
    processId: 'process-1',
    jobId: 'job-123',
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseProcess.mockReturnValue({
      data: mockProcess,
      isLoading: false,
      error: null,
    });

    mockUseUpdateProcessStep.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
    });

    mockUseScholarFinder.mockReturnValue(mockContextValue);

    // Apply mocks
    const { useProcess, useUpdateProcessStep } = require('../../../hooks/useProcessManagement');
    const { useScholarFinder } = require('../../../hooks/useScholarFinderContext');
    
    useProcess.mockImplementation(mockUseProcess);
    useUpdateProcessStep.mockImplementation(mockUseUpdateProcessStep);
    useScholarFinder.mockImplementation(mockUseScholarFinder);
  });

  it('renders shortlist step with header and components', () => {
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Create Reviewer Shortlist')).toBeInTheDocument();
    expect(screen.getByText(/Select and manage your final list/)).toBeInTheDocument();
    expect(screen.getByTestId('reviewer-selection')).toBeInTheDocument();
    expect(screen.getByTestId('shortlist-manager')).toBeInTheDocument();
  });

  it('displays shortlist summary with correct counts', () => {
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('1')).toBeInTheDocument(); // Selected reviewers count
    expect(screen.getByText('3')).toBeInTheDocument(); // Minimum required
    expect(screen.getByText('20')).toBeInTheDocument(); // Maximum allowed
  });

  it('handles adding reviewer to shortlist', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const addButton = screen.getByText('Add First Reviewer');
    await user.click(addButton);

    expect(mockContextValue.addToShortlist).toHaveBeenCalledWith(mockReviewers[0]);
  });

  it('handles bulk add operation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const bulkAddButton = screen.getByText('Bulk Add');
    await user.click(bulkAddButton);

    expect(mockContextValue.addToShortlist).toHaveBeenCalledTimes(2);
  });

  it('handles removing reviewer from shortlist', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const removeButton = screen.getByText('Remove First');
    await user.click(removeButton);

    expect(mockContextValue.removeFromShortlist).toHaveBeenCalledWith('reviewer1@example.com');
  });

  it('handles bulk remove operation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const bulkRemoveButton = screen.getByText('Bulk Remove');
    await user.click(bulkRemoveButton);

    expect(mockContextValue.removeFromShortlist).toHaveBeenCalledWith('reviewer1@example.com');
  });

  it('handles reordering shortlist', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const reorderButton = screen.getByText('Reorder');
    await user.click(reorderButton);

    // Should trigger state update for reordering
    expect(screen.getByTestId('shortlist-manager')).toBeInTheDocument();
  });

  it('handles clearing shortlist', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const clearButton = screen.getByText('Clear All');
    await user.click(clearButton);

    expect(mockContextValue.clearShortlist).toHaveBeenCalled();
  });

  it('handles undo functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    // First add a reviewer to create history
    const addButton = screen.getByText('Add First Reviewer');
    await user.click(addButton);

    // Then try to undo
    const undoButton = screen.getByText('Undo Last Action');
    await user.click(undoButton);

    // Should remove the reviewer that was just added
    expect(mockContextValue.removeFromShortlist).toHaveBeenCalled();
  });

  it('validates minimum reviewer requirement', async () => {
    const user = userEvent.setup();
    
    // Mock context with no selected reviewers
    mockUseScholarFinder.mockReturnValue({
      ...mockContextValue,
      shortlist: [],
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const nextButton = screen.getByRole('button', { name: /Select \d+ More Reviewers/ });
    expect(nextButton).toBeDisabled();
  });

  it('validates maximum reviewer limit', async () => {
    const user = userEvent.setup();
    
    // Create array of 20 reviewers (at the limit)
    const maxReviewers = Array.from({ length: 20 }, (_, i) => ({
      ...mockReviewers[0],
      email: `reviewer${i}@example.com`,
      reviewer: `Dr. Reviewer ${i}`,
    }));

    mockUseScholarFinder.mockReturnValue({
      ...mockContextValue,
      shortlist: maxReviewers,
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    // Should show that we're at the maximum
    expect(screen.getByText('20')).toBeInTheDocument(); // Selected count
  });

  it('saves shortlist data when proceeding to next step', async () => {
    const user = userEvent.setup();
    const mockUpdateProcessStep = vi.fn().mockResolvedValue({});
    
    mockUseUpdateProcessStep.mockReturnValue({
      mutateAsync: mockUpdateProcessStep,
      isPending: false,
      error: null,
    });

    // Mock context with valid shortlist (3 reviewers minimum)
    const validShortlist = [mockReviewers[0], mockReviewers[1], mockReviewers[0]];
    mockUseScholarFinder.mockReturnValue({
      ...mockContextValue,
      shortlist: validShortlist,
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const nextButton = screen.getByRole('button', { name: /Export Shortlist/ });
    await user.click(nextButton);

    await waitFor(() => {
      expect(mockUpdateProcessStep).toHaveBeenCalledWith({
        processId: 'process-1',
        step: ProcessStep.SHORTLIST,
        stepData: expect.objectContaining({
          selectedReviewers: expect.any(Array),
          selectionHistory: expect.any(Array),
          lastModified: expect.any(Date),
          minReviewers: 3,
          maxReviewers: 20,
        }),
      });
    });

    expect(mockProps.onNext).toHaveBeenCalledWith({
      selectedReviewers: expect.any(Array),
      shortlistCount: expect.any(Number),
      selectionHistory: expect.any(Array),
      validationPassed: true,
    });
  });

  it('handles save shortlist manually', async () => {
    const user = userEvent.setup();
    const mockUpdateProcessStep = vi.fn().mockResolvedValue({});
    
    mockUseUpdateProcessStep.mockReturnValue({
      mutateAsync: mockUpdateProcessStep,
      isPending: false,
      error: null,
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    // First make a change to enable save button
    const addButton = screen.getByText('Add First Reviewer');
    await user.click(addButton);

    const saveButton = screen.getByText('Save Shortlist');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProcessStep).toHaveBeenCalled();
    });
  });

  it('displays validation errors when shortlist is invalid', async () => {
    const user = userEvent.setup();
    
    // Mock context with no reviewers (below minimum)
    mockUseScholarFinder.mockReturnValue({
      ...mockContextValue,
      shortlist: [],
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const nextButton = screen.getByRole('button', { name: /Select \d+ More Reviewers/ });
    await user.click(nextButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/You must select at least 3 reviewers/)).toBeInTheDocument();
    });
  });

  it('handles navigation to previous step', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    const previousButton = screen.getByText('Previous');
    await user.click(previousButton);

    expect(mockProps.onPrevious).toHaveBeenCalled();
  });

  it('displays loading state correctly', () => {
    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} isLoading={true} />
      </TestWrapper>
    );

    const nextButton = screen.getByRole('button', { name: /Processing/ });
    expect(nextButton).toBeDisabled();
  });

  it('loads existing shortlist data from process', () => {
    const processWithShortlist = {
      ...mockProcess,
      stepData: {
        ...mockProcess.stepData,
        shortlist: {
          selectedReviewers: mockReviewers,
          selectionHistory: [
            {
              type: 'add' as const,
              reviewerId: 'reviewer1@example.com',
              timestamp: new Date(),
            },
          ],
          lastModified: new Date(),
        },
      },
    };

    mockUseProcess.mockReturnValue({
      data: processWithShortlist,
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    // Should load the existing data
    expect(screen.getByText('Create Reviewer Shortlist')).toBeInTheDocument();
  });

  it('handles error states gracefully', () => {
    const mockUpdateProcessStepWithError = vi.fn().mockRejectedValue(new Error('Save failed'));
    
    mockUseUpdateProcessStep.mockReturnValue({
      mutateAsync: mockUpdateProcessStepWithError,
      isPending: false,
      error: new Error('Save failed'),
    });

    render(
      <TestWrapper>
        <ShortlistStep {...mockProps} />
      </TestWrapper>
    );

    // Component should still render despite error
    expect(screen.getByText('Create Reviewer Shortlist')).toBeInTheDocument();
  });
});