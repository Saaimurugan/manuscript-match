/**
 * AuthorSearch Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthorSearch } from '../AuthorSearch';

const defaultProps = {
  onSearch: vi.fn(),
  isLoading: false,
  searchHistory: [],
};

const mockSearchHistory = [
  {
    searchTerm: 'John Smith',
    results: [
      {
        name: 'John Smith',
        email: 'john@example.com',
        affiliation: 'Test University',
        country: 'USA',
        publications: 25,
      },
    ],
    timestamp: new Date('2024-01-01'),
  },
  {
    searchTerm: 'Jane Doe',
    results: [],
    timestamp: new Date('2024-01-02'),
  },
];

describe('AuthorSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search form', () => {
    render(<AuthorSearch {...defaultProps} />);
    
    expect(screen.getByLabelText('Author Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter author's name/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: 'John Smith' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledWith('John Smith');
    });
  });

  it('handles form submission with Enter key', async () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    
    fireEvent.change(input, { target: { value: 'John Smith' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledWith('John Smith');
    });
  });

  it('trims whitespace from search term', async () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: '  John Smith  ' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledWith('John Smith');
    });
  });

  it('prevents submission with short search terms', async () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: 'J' } });
    fireEvent.click(submitButton);
    
    expect(defaultProps.onSearch).not.toHaveBeenCalled();
    expect(submitButton).toBeDisabled();
  });

  it('clears search term', () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    fireEvent.change(input, { target: { value: 'John Smith' } });
    
    const clearButton = screen.getByRole('button', { name: '' }); // Clear button has no text
    fireEvent.click(clearButton);
    
    expect(input).toHaveValue('');
  });

  it('shows search history when available', () => {
    render(<AuthorSearch {...defaultProps} searchHistory={mockSearchHistory} />);
    
    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('Show History')).toBeInTheDocument();
  });

  it('toggles search history visibility', () => {
    render(<AuthorSearch {...defaultProps} searchHistory={mockSearchHistory} />);
    
    const toggleButton = screen.getByText('Show History');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Hide History')).toBeInTheDocument();
  });

  it('handles history item click', async () => {
    render(<AuthorSearch {...defaultProps} searchHistory={mockSearchHistory} />);
    
    // Show history first
    const toggleButton = screen.getByText('Show History');
    fireEvent.click(toggleButton);
    
    // Click on history item
    const historyItem = screen.getByText('John Smith');
    fireEvent.click(historyItem);
    
    expect(screen.getByLabelText('Author Name')).toHaveValue('John Smith');
    expect(defaultProps.onSearch).toHaveBeenCalledWith('John Smith');
  });

  it('shows result count in history badges', () => {
    render(<AuthorSearch {...defaultProps} searchHistory={mockSearchHistory} />);
    
    const toggleButton = screen.getByText('Show History');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('(1)')).toBeInTheDocument(); // John Smith has 1 result
    expect(screen.getByText('(0)')).toBeInTheDocument(); // Jane Doe has 0 results
  });

  it('limits history to unique terms', () => {
    const duplicateHistory = [
      ...mockSearchHistory,
      {
        searchTerm: 'John Smith', // Duplicate
        results: [],
        timestamp: new Date('2024-01-03'),
      },
    ];
    
    render(<AuthorSearch {...defaultProps} searchHistory={duplicateHistory} />);
    
    const toggleButton = screen.getByText('Show History');
    fireEvent.click(toggleButton);
    
    const johnSmithItems = screen.getAllByText('John Smith');
    expect(johnSmithItems).toHaveLength(1); // Should only show once
  });

  it('disables input and buttons when loading', () => {
    render(<AuthorSearch {...defaultProps} isLoading={true} />);
    
    const input = screen.getByLabelText('Author Name');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('shows loading spinner when searching', () => {
    render(<AuthorSearch {...defaultProps} isLoading={true} />);
    
    // The loading spinner should be visible in the submit button
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  it('shows search tips', () => {
    render(<AuthorSearch {...defaultProps} />);
    
    expect(screen.getByText('Search Tips:')).toBeInTheDocument();
    expect(screen.getByText(/Try different name formats/)).toBeInTheDocument();
    expect(screen.getByText(/Use partial names/)).toBeInTheDocument();
  });

  it('shows minimum character requirement', () => {
    render(<AuthorSearch {...defaultProps} />);
    
    expect(screen.getByText(/Enter at least 2 characters/)).toBeInTheDocument();
  });

  it('hides clear button when input is empty', () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    expect(input).toHaveValue('');
    
    // Clear button should not be visible when input is empty
    const clearButtons = screen.queryAllByRole('button').filter(button => 
      button.querySelector('svg') && !button.textContent?.includes('Show')
    );
    
    // Should only have the search button, not the clear button
    expect(clearButtons).toHaveLength(1);
  });

  it('shows clear button when input has value', () => {
    render(<AuthorSearch {...defaultProps} />);
    
    const input = screen.getByLabelText('Author Name');
    fireEvent.change(input, { target: { value: 'John' } });
    
    // Now clear button should be visible
    const clearButtons = screen.queryAllByRole('button').filter(button => 
      button.querySelector('svg') && !button.textContent?.includes('Show')
    );
    
    // Should have both search and clear buttons
    expect(clearButtons.length).toBeGreaterThan(1);
  });
});