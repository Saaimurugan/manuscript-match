/**
 * Tests for RecommendationsStep component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RecommendationsStep } from '../RecommendationsStep';

// Mock the hooks
vi.mock('../../../hooks/useScholarFinderApi', () => ({
  useRecommendations: vi.fn(() => ({
    data: {
      data: {
        reviewers: [
          {
            reviewer: 'Dr. John Doe',
            email: 'john.doe@university.edu',
            aff: 'University of Technology',
            city: 'Boston',
            country: 'USA',
            Total_Publications: 85,
            English_Pubs: 80,
            'Publications (last 10 years)': 45,
            'Relevant Publications (last 5 years)': 25,
            'Publications (last 2 years)': 8,
            'Publications (last year)': 3,
            Clinical_Trials_no: 2,
            Clinical_study_no: 5,
            Case_reports_no: 1,
            Retracted_Pubs_no: 0,
            TF_Publications_last_year: 2,
            coauthor: false,
            country_match: 'different',
            aff_match: 'different',
            conditions_met: 8,
            conditions_satisfied: '8 of 8'
          },
          {
            reviewer: 'Dr. Jane Smith',
            email: 'jane.smith@research.org',
            aff: 'Research Institute',
            city: 'New York',
            country: 'USA',
            Total_Publications: 120,
            English_Pubs: 115,
            'Publications (last 10 years)': 60,
            'Relevant Publications (last 5 years)': 35,
            'Publications (last 2 years)': 12,
            'Publications (last year)': 5,
            Clinical_Trials_no: 3,
            Clinical_study_no: 8,
            Case_reports_no: 2,
            Retracted_Pubs_no: 0,
            TF_Publications_last_year: 4,
            coauthor: false,
            country_match: 'different',
            aff_match: 'different',
            conditions_met: 8,
            conditions_satisfied: '8 of 8'
          }
        ],
        total_count: 2,
        validation_summary: {
          total_authors: 150,
          authors_validated: 150,
          conditions_applied: [
            'No co-authorship',
            'Different affiliation',
            'Sufficient publications'
          ],
          average_conditions_met: 7.8
        }
      }
    },
    isLoading: false,
    error: null,
    refetch: vi.fn()
  }))
}));

vi.mock('../../../hooks/useProcessManagement', () => ({
  useUpdateProcessStep: () => ({
    mutateAsync: vi.fn().mockResolvedValue({})
  })
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Filter: () => <div data-testid="filter-icon" />,
  SortAsc: () => <div data-testid="sort-asc-icon" />,
  SortDesc: () => <div data-testid="sort-desc-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Users: () => <div data-testid="users-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RecommendationsStep', () => {
  const defaultProps = {
    processId: 'test-process-123',
    jobId: 'test-job-123',
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recommendations step with reviewer table', () => {
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Reviewer Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Review and filter potential reviewers')).toBeInTheDocument();
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
  });

  it('displays validation summary', () => {
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('150 authors validated')).toBeInTheDocument();
    expect(screen.getByText('Average conditions met: 7.8')).toBeInTheDocument();
  });

  it('shows reviewer details correctly', () => {
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('University of Technology')).toBeInTheDocument();
    expect(screen.getByText('Boston, USA')).toBeInTheDocument();
    expect(screen.getByText('85 publications')).toBeInTheDocument();
    expect(screen.getByText('8 of 8')).toBeInTheDocument();
  });

  it('handles filtering by country', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    // Open filter panel
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Select country filter
    const countrySelect = screen.getByLabelText('Country');
    await user.selectOptions(countrySelect, 'USA');

    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);

    // Should still show USA reviewers
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
  });

  it('handles filtering by minimum publications', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    // Open filter panel
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Set minimum publications
    const minPubsInput = screen.getByLabelText('Minimum Publications');
    await user.clear(minPubsInput);
    await user.type(minPubsInput, '100');

    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);

    // Should only show Jane Smith (120 publications)
    expect(screen.queryByText('Dr. John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
  });

  it('handles sorting by different columns', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    // Click on publications column header to sort
    const publicationsHeader = screen.getByText('Publications');
    await user.click(publicationsHeader);

    // Should sort by publications (Jane Smith first with 120)
    const reviewerRows = screen.getAllByTestId('reviewer-row');
    expect(reviewerRows[0]).toHaveTextContent('Dr. Jane Smith');
  });

  it('handles reviewer selection for shortlist', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    // Select first reviewer
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(firstCheckbox);

    expect(firstCheckbox).toBeChecked();
    expect(screen.getByText('1 reviewer selected')).toBeInTheDocument();

    // Select second reviewer
    const secondCheckbox = screen.getAllByRole('checkbox')[1];
    await user.click(secondCheckbox);

    expect(screen.getByText('2 reviewers selected')).toBeInTheDocument();
  });

  it('handles bulk selection operations', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    // Select all reviewers
    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    expect(screen.getByText('2 reviewers selected')).toBeInTheDocument();

    // Clear selection
    const clearAllButton = screen.getByText('Clear All');
    await user.click(clearAllButton);

    expect(screen.getByText('0 reviewers selected')).toBeInTheDocument();
  });

  it('shows navigation buttons', () => {
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Continue to Shortlist')).toBeInTheDocument();
  });

  it('calls onPrevious when Previous button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    const previousButton = screen.getByText('Previous');
    await user.click(previousButton);

    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when Continue button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    const continueButton = screen.getByText('Continue to Shortlist');
    await user.click(continueButton);

    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('handles loading state correctly', () => {
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} isLoading={true} />
      </TestWrapper>
    );

    const previousButton = screen.getByText('Previous');
    const continueButton = screen.getByText('Continue to Shortlist');
    
    expect(previousButton).toBeDisabled();
    expect(continueButton).toBeDisabled();
  });

  it('displays empty state when no reviewers found', () => {
    // Mock empty recommendations
    vi.mocked(require('../../../hooks/useScholarFinderApi').useRecommendations).mockReturnValue({
      data: {
        data: {
          reviewers: [],
          total_count: 0,
          validation_summary: {
            total_authors: 0,
            authors_validated: 0,
            conditions_applied: [],
            average_conditions_met: 0
          }
        }
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('No reviewers found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or validation rules')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    // Mock error state
    vi.mocked(require('../../../hooks/useScholarFinderApi').useRecommendations).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load recommendations'),
      refetch: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Error loading recommendations')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search reviewers...');
    await user.type(searchInput, 'John');

    // Should filter to show only John Doe
    await waitFor(() => {
      expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Dr. Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('shows validation score indicators correctly', () => {
    render(
      <TestWrapper>
        <RecommendationsStep {...defaultProps} />
      </TestWrapper>
    );

    // Should show validation scores with proper styling
    const scoreElements = screen.getAllByText('8 of 8');
    expect(scoreElements).toHaveLength(2);
    
    // Should have success styling for perfect scores
    scoreElements.forEach(element => {
      expect(element).toHaveClass('text-green-600');
    });
  });
});