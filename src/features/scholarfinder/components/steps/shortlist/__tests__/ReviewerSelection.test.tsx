/**
 * ReviewerSelection Component Tests
 * Tests for the reviewer selection component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReviewerSelection } from '../ReviewerSelection';
import { Reviewer } from '../../../../types/api';

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
  {
    reviewer: 'Dr. Bob Wilson',
    email: 'reviewer3@example.com',
    aff: 'Medical Center',
    city: 'Medical City',
    country: 'UK',
    Total_Publications: 25,
    English_Pubs: 25,
    'Publications (last 10 years)': 20,
    'Relevant Publications (last 5 years)': 15,
    'Publications (last 2 years)': 8,
    'Publications (last year)': 3,
    Clinical_Trials_no: 1,
    Clinical_study_no: 2,
    Case_reports_no: 0,
    Retracted_Pubs_no: 2,
    TF_Publications_last_year: 1,
    coauthor: false,
    country_match: 'different',
    aff_match: 'none',
    conditions_met: 4,
    conditions_satisfied: 'condition1,condition2,condition3,condition4,condition5,condition6,condition7,condition8',
  },
];

describe('ReviewerSelection', () => {
  const mockProps = {
    availableReviewers: mockReviewers,
    selectedReviewers: [],
    onAddToShortlist: vi.fn(),
    onBulkAdd: vi.fn(),
    maxReviewers: 20,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reviewer selection component with available reviewers', () => {
    render(<ReviewerSelection {...mockProps} />);

    expect(screen.getByText('Available Reviewers')).toBeInTheDocument();
    expect(screen.getByText(/3 available, 20 slots remaining/)).toBeInTheDocument();
    expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bob Wilson')).toBeInTheDocument();
  });

  it('filters reviewers based on search term', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/Search reviewers/);
    await user.type(searchInput, 'John');

    expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Dr. Jane Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Dr. Bob Wilson')).not.toBeInTheDocument();
  });

  it('filters reviewers by country', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Open filters
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    // Select country filter
    const countrySelect = screen.getByRole('combobox');
    await user.click(countrySelect);
    await user.click(screen.getByText('Canada'));

    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Dr. John Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Dr. Bob Wilson')).not.toBeInTheDocument();
  });

  it('filters reviewers by minimum publications', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Open filters
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    // Set minimum publications filter
    const minPubsInput = screen.getByPlaceholderText('e.g., 10');
    await user.type(minPubsInput, '60');

    // Only Dr. Jane Doe has 75 publications
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Dr. John Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Dr. Bob Wilson')).not.toBeInTheDocument();
  });

  it('filters out co-authors when exclude co-authors is checked', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Open filters
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    // Check exclude co-authors
    const excludeCoauthorsCheckbox = screen.getByLabelText('Exclude co-authors');
    await user.click(excludeCoauthorsCheckbox);

    // Dr. Jane Doe is a co-author, so should be filtered out
    expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Dr. Jane Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Bob Wilson')).toBeInTheDocument();
  });

  it('sorts reviewers by different columns', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Click on Publications column header to sort
    const publicationsHeader = screen.getByText('Publications');
    await user.click(publicationsHeader);

    // Should sort by publications (ascending first click)
    const rows = screen.getAllByRole('row');
    // First row is header, second should be Dr. Bob Wilson (25 pubs)
    expect(rows[1]).toHaveTextContent('Dr. Bob Wilson');
  });

  it('handles individual reviewer selection', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    const addButton = screen.getAllByText('Add')[0];
    await user.click(addButton);

    expect(mockProps.onAddToShortlist).toHaveBeenCalledWith(mockReviewers[0]);
  });

  it('handles bulk selection and bulk add', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Select first two reviewers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First reviewer checkbox (index 0 is select all)
    await user.click(checkboxes[2]); // Second reviewer checkbox

    // Click bulk add button
    const bulkAddButton = screen.getByText(/Add Selected \(2\)/);
    await user.click(bulkAddButton);

    expect(mockProps.onBulkAdd).toHaveBeenCalledWith([mockReviewers[0], mockReviewers[1]]);
  });

  it('handles select all functionality', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Click select all button
    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    // Should show bulk add button with all reviewers
    expect(screen.getByText(/Add Selected \(3\)/)).toBeInTheDocument();
  });

  it('excludes already selected reviewers from available list', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedReviewers: [mockReviewers[0]], // Dr. John Smith is already selected
    };

    render(<ReviewerSelection {...propsWithSelected} />);

    // Should show 2 available, 19 slots remaining
    expect(screen.getByText(/2 available, 19 slots remaining/)).toBeInTheDocument();
    expect(screen.queryByText('Dr. John Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bob Wilson')).toBeInTheDocument();
  });

  it('disables add buttons when at maximum reviewers', () => {
    const propsAtMax = {
      ...mockProps,
      selectedReviewers: Array.from({ length: 20 }, (_, i) => ({
        ...mockReviewers[0],
        email: `reviewer${i}@example.com`,
      })),
    };

    render(<ReviewerSelection {...propsAtMax} />);

    const addButtons = screen.getAllByText('Add');
    addButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('displays reviewer badges correctly', () => {
    render(<ReviewerSelection {...mockProps} />);

    // Should show co-author badge for Dr. Jane Doe
    expect(screen.getByText('Co-author')).toBeInTheDocument();
    
    // Should show retracted publications badge for Dr. Bob Wilson
    expect(screen.getByText('2 retracted')).toBeInTheDocument();
  });

  it('displays validation scores with correct styling', () => {
    render(<ReviewerSelection {...mockProps} />);

    // Dr. John Smith has 8/8 conditions met (should be green/default)
    expect(screen.getByText('8/8')).toBeInTheDocument();
    
    // Dr. Jane Doe has 6/8 conditions met (should be secondary)
    expect(screen.getByText('6/8')).toBeInTheDocument();
    
    // Dr. Bob Wilson has 4/8 conditions met (should be outline)
    expect(screen.getByText('4/8')).toBeInTheDocument();
  });

  it('clears all filters when clear filters button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    // Open filters and set some filters
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    const searchInput = screen.getByPlaceholderText(/Search reviewers/);
    await user.type(searchInput, 'John');

    const minPubsInput = screen.getByPlaceholderText('e.g., 10');
    await user.type(minPubsInput, '30');

    // Clear filters
    const clearFiltersButton = screen.getByText('Clear Filters');
    await user.click(clearFiltersButton);

    // All reviewers should be visible again
    expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bob Wilson')).toBeInTheDocument();
  });

  it('shows empty state when no reviewers match filters', async () => {
    const user = userEvent.setup();
    
    render(<ReviewerSelection {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/Search reviewers/);
    await user.type(searchInput, 'NonexistentReviewer');

    expect(screen.getByText('No reviewers available')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters to see more reviewers')).toBeInTheDocument();
  });

  it('shows empty state when all reviewers are already selected', () => {
    const propsAllSelected = {
      ...mockProps,
      selectedReviewers: mockReviewers,
    };

    render(<ReviewerSelection {...propsAllSelected} />);

    expect(screen.getByText('No reviewers available')).toBeInTheDocument();
    expect(screen.getByText('All available reviewers have been added to your shortlist')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    const loadingProps = {
      ...mockProps,
      isLoading: true,
    };

    render(<ReviewerSelection {...loadingProps} />);

    const addButtons = screen.getAllByText('Add');
    addButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});