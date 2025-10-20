/**
 * ShortlistManager Component Tests
 * Tests for the shortlist manager component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShortlistManager } from '../ShortlistManager';
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

const mockSelectionHistory = [
  {
    type: 'add' as const,
    reviewerId: 'reviewer1@example.com',
    timestamp: new Date(Date.now() - 60000), // 1 minute ago
  },
  {
    type: 'add' as const,
    reviewerId: 'reviewer2@example.com',
    timestamp: new Date(Date.now() - 30000), // 30 seconds ago
  },
  {
    type: 'remove' as const,
    reviewerId: 'reviewer3@example.com',
    timestamp: new Date(Date.now() - 10000), // 10 seconds ago
  },
];

describe('ShortlistManager', () => {
  const mockProps = {
    selectedReviewers: mockReviewers,
    onRemoveFromShortlist: vi.fn(),
    onBulkRemove: vi.fn(),
    onReorderShortlist: vi.fn(),
    selectionHistory: mockSelectionHistory,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shortlist manager with selected reviewers', () => {
    render(<ShortlistManager {...mockProps} />);

    expect(screen.getByText('Your Shortlist')).toBeInTheDocument();
    expect(screen.getByText(/3 reviewers selected/)).toBeInTheDocument();
    expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bob Wilson')).toBeInTheDocument();
  });

  it('displays reviewers with correct numbering', () => {
    render(<ShortlistManager {...mockProps} />);

    const rows = screen.getAllByRole('row');
    // First row is header, check data rows
    expect(rows[1]).toHaveTextContent('1'); // First reviewer
    expect(rows[2]).toHaveTextContent('2'); // Second reviewer
    expect(rows[3]).toHaveTextContent('3'); // Third reviewer
  });

  it('displays reviewer information correctly', () => {
    render(<ShortlistManager {...mockProps} />);

    // Check that all reviewer details are displayed
    expect(screen.getByText('reviewer1@example.com')).toBeInTheDocument();
    expect(screen.getByText('University of Example')).toBeInTheDocument();
    expect(screen.getByText('Example City, USA')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument(); // Total publications
    expect(screen.getByText('20 (5yr)')).toBeInTheDocument(); // 5-year publications
  });

  it('displays badges for co-authors and retracted publications', () => {
    render(<ShortlistManager {...mockProps} />);

    // Dr. Jane Doe is a co-author
    expect(screen.getByText('Co-author')).toBeInTheDocument();
    
    // Dr. Bob Wilson has retracted publications
    expect(screen.getByText('2 retracted')).toBeInTheDocument();
  });

  it('displays validation scores with correct styling', () => {
    render(<ShortlistManager {...mockProps} />);

    expect(screen.getByText('8/8')).toBeInTheDocument(); // Dr. John Smith
    expect(screen.getByText('6/8')).toBeInTheDocument(); // Dr. Jane Doe
    expect(screen.getByText('4/8')).toBeInTheDocument(); // Dr. Bob Wilson
  });

  it('handles individual reviewer removal', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click on the first reviewer's actions menu
    const actionButtons = screen.getAllByRole('button', { name: '' }); // Menu trigger buttons
    await user.click(actionButtons[0]);

    // Click remove option
    const removeOption = screen.getByText('Remove');
    await user.click(removeOption);

    // Confirm removal in dialog
    const confirmButton = screen.getByText('Remove');
    await user.click(confirmButton);

    expect(mockProps.onRemoveFromShortlist).toHaveBeenCalledWith('reviewer1@example.com');
  });

  it('handles bulk selection and removal', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Select first two reviewers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First reviewer checkbox (index 0 is select all)
    await user.click(checkboxes[2]); // Second reviewer checkbox

    // Click bulk remove button
    const bulkRemoveButton = screen.getByText(/Remove Selected \(2\)/);
    await user.click(bulkRemoveButton);

    // Confirm bulk removal in dialog
    const confirmButton = screen.getByText('Remove 2 Reviewers');
    await user.click(confirmButton);

    expect(mockProps.onBulkRemove).toHaveBeenCalledWith([
      'reviewer1@example.com',
      'reviewer2@example.com'
    ]);
  });

  it('handles select all functionality', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click select all button
    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    // Should show bulk remove button with all reviewers
    expect(screen.getByText(/Remove Selected \(3\)/)).toBeInTheDocument();

    // Click deselect all
    const deselectAllButton = screen.getByText('Deselect All');
    await user.click(deselectAllButton);

    // Bulk remove button should disappear
    expect(screen.queryByText(/Remove Selected/)).not.toBeInTheDocument();
  });

  it('handles move up action', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click on the second reviewer's actions menu (can move up)
    const actionButtons = screen.getAllByRole('button', { name: '' });
    await user.click(actionButtons[1]);

    // Click move up option
    const moveUpOption = screen.getByText('Move Up');
    await user.click(moveUpOption);

    expect(mockProps.onReorderShortlist).toHaveBeenCalledWith(1, 0);
  });

  it('handles move down action', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click on the first reviewer's actions menu (can move down)
    const actionButtons = screen.getAllByRole('button', { name: '' });
    await user.click(actionButtons[0]);

    // Click move down option
    const moveDownOption = screen.getByText('Move Down');
    await user.click(moveDownOption);

    expect(mockProps.onReorderShortlist).toHaveBeenCalledWith(0, 1);
  });

  it('disables move up for first reviewer', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click on the first reviewer's actions menu
    const actionButtons = screen.getAllByRole('button', { name: '' });
    await user.click(actionButtons[0]);

    // Move up option should be disabled
    const moveUpOption = screen.getByText('Move Up');
    expect(moveUpOption.closest('div')).toHaveAttribute('data-disabled', 'true');
  });

  it('disables move down for last reviewer', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click on the last reviewer's actions menu
    const actionButtons = screen.getAllByRole('button', { name: '' });
    await user.click(actionButtons[2]);

    // Move down option should be disabled
    const moveDownOption = screen.getByText('Move Down');
    expect(moveDownOption.closest('div')).toHaveAttribute('data-disabled', 'true');
  });

  it('displays selection history when history button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click history button
    const historyButton = screen.getByText('History');
    await user.click(historyButton);

    // Should show recent actions
    expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    expect(screen.getByText(/Added Dr. John Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Added Dr. Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Removed reviewer/)).toBeInTheDocument();
  });

  it('handles drag and drop reordering', async () => {
    render(<ShortlistManager {...mockProps} />);

    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1]; // Skip header row

    // Simulate drag start
    fireEvent.dragStart(firstDataRow);

    // Simulate drop on second row
    const secondDataRow = rows[2];
    fireEvent.dragOver(secondDataRow);
    fireEvent.drop(secondDataRow);

    expect(mockProps.onReorderShortlist).toHaveBeenCalledWith(0, 1);
  });

  it('shows empty state when no reviewers are selected', () => {
    const emptyProps = {
      ...mockProps,
      selectedReviewers: [],
    };

    render(<ShortlistManager {...emptyProps} />);

    expect(screen.getByText('No reviewers in shortlist')).toBeInTheDocument();
    expect(screen.getByText('Add reviewers from the available recommendations above')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    const loadingProps = {
      ...mockProps,
      isLoading: true,
    };

    render(<ShortlistManager {...loadingProps} />);

    // Action buttons should be disabled during loading
    const actionButtons = screen.getAllByRole('button', { name: '' });
    actionButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('cancels removal dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click on the first reviewer's actions menu
    const actionButtons = screen.getAllByRole('button', { name: '' });
    await user.click(actionButtons[0]);

    // Click remove option
    const removeOption = screen.getByText('Remove');
    await user.click(removeOption);

    // Cancel removal in dialog
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockProps.onRemoveFromShortlist).not.toHaveBeenCalled();
  });

  it('cancels bulk removal dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Select a reviewer
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Click bulk remove button
    const bulkRemoveButton = screen.getByText(/Remove Selected \(1\)/);
    await user.click(bulkRemoveButton);

    // Cancel bulk removal in dialog
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockProps.onBulkRemove).not.toHaveBeenCalled();
  });

  it('formats action timestamps correctly', async () => {
    const user = userEvent.setup();
    
    render(<ShortlistManager {...mockProps} />);

    // Click history button
    const historyButton = screen.getByText('History');
    await user.click(historyButton);

    // Should show time ago format
    expect(screen.getByText(/1m ago/)).toBeInTheDocument();
    expect(screen.getByText(/Just now/)).toBeInTheDocument();
  });
});