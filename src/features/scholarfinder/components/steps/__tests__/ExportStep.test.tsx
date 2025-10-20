import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportStep } from '../ExportStep';
import { ScholarFinderProvider } from '../../../contexts/ScholarFinderContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Reviewer } from '../../../types/api';

// Mock the config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 10000,
    scholarFinderApiUrl: 'https://api.scholarfinder.com'
  }
}));

// Mock the useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false
  })
}));

// Mock the useScholarFinderContext hook
vi.mock('../../../hooks/useScholarFinderContext', () => ({
  useScholarFinderContext: () => ({
    shortlist: [],
    currentProcess: null,
    addToShortlist: vi.fn(),
    removeFromShortlist: vi.fn(),
    clearShortlist: vi.fn()
  })
}));

// Mock the export utilities
vi.mock('../../../utils/exportUtils', () => ({
  exportReviewers: vi.fn().mockResolvedValue(undefined),
  createExportMetadata: vi.fn().mockReturnValue({
    exportDate: '2024-01-15',
    totalReviewers: 2,
    exportFormat: 'csv',
    manuscriptTitle: 'Test Manuscript',
    processId: 'test-process-id'
  })
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockReviewers: Reviewer[] = [
  {
    reviewer: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    aff: 'University of Science',
    city: 'Boston',
    country: 'USA',
    Total_Publications: 150,
    English_Pubs: 145,
    'Publications (last 10 years)': 80,
    'Relevant Publications (last 5 years)': 45,
    'Publications (last 2 years)': 20,
    'Publications (last year)': 12,
    Clinical_Trials_no: 5,
    Clinical_study_no: 8,
    Case_reports_no: 3,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 2,
    coauthor: false,
    country_match: 'different',
    aff_match: 'different',
    conditions_met: 7,
    conditions_satisfied: '7 of 8 conditions met'
  },
  {
    reviewer: 'Dr. Jane Doe',
    email: 'jane.doe@research.org',
    aff: 'Research Institute',
    city: 'London',
    country: 'UK',
    Total_Publications: 200,
    English_Pubs: 200,
    'Publications (last 10 years)': 120,
    'Relevant Publications (last 5 years)': 60,
    'Publications (last 2 years)': 25,
    'Publications (last year)': 15,
    Clinical_Trials_no: 8,
    Clinical_study_no: 12,
    Case_reports_no: 2,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 3,
    coauthor: false,
    country_match: 'different',
    aff_match: 'different',
    conditions_met: 8,
    conditions_satisfied: '8 of 8 conditions met'
  }
];

const TestWrapper: React.FC<{ children: React.ReactNode; shortlist?: Reviewer[] }> = ({ 
  children, 
  shortlist = mockReviewers 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ScholarFinderProvider 
        initialState={{
          shortlist,
          currentProcess: {
            id: 'test-process',
            jobId: 'test-job',
            title: 'Test Process',
            status: 'active',
            currentStep: 'export',
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              title: 'Test Manuscript'
            }
          }
        }}
      >
        {children}
      </ScholarFinderProvider>
    </QueryClientProvider>
  );
};

describe('ExportStep', () => {
  const mockProps = {
    processId: 'test-process-id',
    jobId: 'test-job-id',
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export step with shortlist summary', () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Export Reviewer Shortlist')).toBeInTheDocument();
    expect(screen.getByText('Download your curated list of potential reviewers in your preferred format')).toBeInTheDocument();
    
    // Check shortlist summary
    expect(screen.getByText('Shortlist Summary')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of reviewers
    expect(screen.getByText('Selected Reviewers')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of countries
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument(); // Average validation score
    expect(screen.getByText('Avg. Validation Score')).toBeInTheDocument();
  });

  it('shows export options when reviewers are available', () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('CSV Export')).toBeInTheDocument();
    expect(screen.getByText('Excel Export')).toBeInTheDocument();
    expect(screen.getByText('Formatted Report')).toBeInTheDocument();
  });

  it('shows warning when no reviewers are selected', () => {
    render(
      <TestWrapper shortlist={[]}>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('No reviewers have been selected for export. Please go back to the shortlist step to select reviewers.')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} isLoading={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Loading export options...')).toBeInTheDocument();
  });

  it('handles export process correctly', async () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    // Click export button for CSV
    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[0]);

    // Should show export progress
    await waitFor(() => {
      expect(screen.getByText('Exporting CSV File')).toBeInTheDocument();
    });

    // Wait for export to complete
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles preview functionality', async () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    // Click preview button for Excel
    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[1]);

    // Should open preview dialog
    await waitFor(() => {
      expect(screen.getByText('Export Preview - Excel Spreadsheet')).toBeInTheDocument();
    });
  });

  it('calls onPrevious when back button is clicked', () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    const backButton = screen.getByText('Back to Shortlist');
    fireEvent.click(backButton);

    expect(mockProps.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('shows complete workflow button after successful export', async () => {
    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    // Start export
    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[0]);

    // Wait for export to complete
    await waitFor(() => {
      expect(screen.getByText('Complete Workflow')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click complete workflow button
    const completeButton = screen.getByText('Complete Workflow');
    fireEvent.click(completeButton);

    expect(mockProps.onNext).toHaveBeenCalledWith({
      exported: true,
      exportCount: 2
    });
  });

  it('handles export errors correctly', async () => {
    // Mock export to fail
    const { exportReviewers } = await import('../../../utils/exportUtils');
    vi.mocked(exportReviewers).mockRejectedValueOnce(new Error('Export failed'));

    render(
      <TestWrapper>
        <ExportStep {...mockProps} />
      </TestWrapper>
    );

    // Start export
    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[0]);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});