/**
 * SearchResults Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchResults } from '../SearchResults';

const mockAuthor1 = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  affiliation: 'Test University',
  country: 'USA',
  publications: 25,
};

const mockAuthor2 = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  affiliation: 'Research Institute',
  country: 'Canada',
  publications: 15,
};

const defaultProps = {
  results: [mockAuthor1, mockAuthor2],
  searchTerm: 'test search',
  onAddAuthor: vi.fn(),
  onClearResults: vi.fn(),
  addedAuthors: [],
  suggestions: [],
  isLoading: false,
};

describe('SearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search results with authors', () => {
    render(<SearchResults {...defaultProps} />);
    
    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('2 authors found')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays author information correctly', () => {
    render(<SearchResults {...defaultProps} />);
    
    // Check John Smith's information
    expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('25 publications')).toBeInTheDocument();
    
    // Check Jane Doe's information
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Research Institute')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('15 publications')).toBeInTheDocument();
  });

  it('handles adding authors', () => {
    render(<SearchResults {...defaultProps} />);
    
    const addButtons = screen.getAllByText('Add Author');
    fireEvent.click(addButtons[0]);
    
    expect(defaultProps.onAddAuthor).toHaveBeenCalledWith(mockAuthor1);
  });

  it('shows added state for already added authors', () => {
    const propsWithAddedAuthor = {
      ...defaultProps,
      addedAuthors: [mockAuthor1],
    };
    
    render(<SearchResults {...propsWithAddedAuthor} />);
    
    // First author should show as added
    expect(screen.getByText('Added')).toBeInTheDocument();
    
    // Second author should still show add button
    expect(screen.getByText('Add Author')).toBeInTheDocument();
  });

  it('disables add button for already added authors', () => {
    const propsWithAddedAuthor = {
      ...defaultProps,
      addedAuthors: [mockAuthor1],
    };
    
    render(<SearchResults {...propsWithAddedAuthor} />);
    
    const buttons = screen.getAllByRole('button');
    const addedButton = buttons.find(button => button.textContent?.includes('Added'));
    const addButton = buttons.find(button => button.textContent?.includes('Add Author'));
    
    expect(addedButton).toBeDisabled();
    expect(addButton).not.toBeDisabled();
  });

  it('handles clearing results', () => {
    render(<SearchResults {...defaultProps} />);
    
    const clearButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg') && !button.textContent
    );
    
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(defaultProps.onClearResults).toHaveBeenCalled();
    }
  });

  it('shows summary with added count', () => {
    const propsWithAddedAuthor = {
      ...defaultProps,
      addedAuthors: [mockAuthor1],
    };
    
    render(<SearchResults {...propsWithAddedAuthor} />);
    
    expect(screen.getByText('1 of 2 authors added')).toBeInTheDocument();
  });

  it('renders no results state', () => {
    const noResultsProps = {
      ...defaultProps,
      results: [],
    };
    
    render(<SearchResults {...noResultsProps} />);
    
    expect(screen.getByText('No Results Found')).toBeInTheDocument();
    expect(screen.getByText('No authors found for "test search"')).toBeInTheDocument();
  });

  it('shows suggestions when no results found', () => {
    const noResultsProps = {
      ...defaultProps,
      results: [],
      suggestions: [
        'Try searching for just "test"',
        'Check spelling and try alternative spellings',
      ],
    };
    
    render(<SearchResults {...noResultsProps} />);
    
    expect(screen.getByText('Try these suggestions:')).toBeInTheDocument();
    expect(screen.getByText('Try searching for just "test"')).toBeInTheDocument();
    expect(screen.getByText('Check spelling and try alternative spellings')).toBeInTheDocument();
  });

  it('shows try different search button when no results', () => {
    const noResultsProps = {
      ...defaultProps,
      results: [],
    };
    
    render(<SearchResults {...noResultsProps} />);
    
    const tryDifferentButton = screen.getByText('Try Different Search');
    fireEvent.click(tryDifferentButton);
    
    expect(defaultProps.onClearResults).toHaveBeenCalled();
  });

  it('shows new search button in results summary', () => {
    render(<SearchResults {...defaultProps} />);
    
    const newSearchButton = screen.getByText('New Search');
    fireEvent.click(newSearchButton);
    
    expect(defaultProps.onClearResults).toHaveBeenCalled();
  });

  it('handles authors without optional fields', () => {
    const authorWithoutOptionalFields = {
      name: 'Minimal Author',
      affiliation: 'Basic University',
    };
    
    const propsWithMinimalAuthor = {
      ...defaultProps,
      results: [authorWithoutOptionalFields],
    };
    
    render(<SearchResults {...propsWithMinimalAuthor} />);
    
    expect(screen.getByText('Minimal Author')).toBeInTheDocument();
    expect(screen.getByText('Basic University')).toBeInTheDocument();
    
    // Should not show email, country, or publications
    expect(screen.queryByText('@')).not.toBeInTheDocument();
    expect(screen.queryByText('publications')).not.toBeInTheDocument();
  });

  it('shows correct singular/plural text for result count', () => {
    const singleResultProps = {
      ...defaultProps,
      results: [mockAuthor1],
    };
    
    render(<SearchResults {...singleResultProps} />);
    
    expect(screen.getByText('1 author found')).toBeInTheDocument();
  });

  it('applies correct styling for added authors', () => {
    const propsWithAddedAuthor = {
      ...defaultProps,
      addedAuthors: [mockAuthor1],
    };
    
    render(<SearchResults {...propsWithAddedAuthor} />);
    
    // The added author's container should have green styling classes
    const authorContainers = screen.getAllByRole('button').map(button => 
      button.closest('div')
    );
    
    // At least one container should have green background classes
    const hasGreenStyling = authorContainers.some(container => 
      container?.className.includes('bg-green')
    );
    
    expect(hasGreenStyling).toBe(true);
  });

  it('disables buttons when loading', () => {
    const loadingProps = {
      ...defaultProps,
      isLoading: true,
    };
    
    render(<SearchResults {...loadingProps} />);
    
    const addButtons = screen.getAllByText('Add Author');
    addButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('prevents adding already added authors', () => {
    const propsWithAddedAuthor = {
      ...defaultProps,
      addedAuthors: [mockAuthor1],
    };
    
    render(<SearchResults {...propsWithAddedAuthor} />);
    
    // Try to click the "Added" button (which should be disabled)
    const addedButton = screen.getByText('Added');
    fireEvent.click(addedButton);
    
    // onAddAuthor should not be called
    expect(defaultProps.onAddAuthor).not.toHaveBeenCalled();
  });

  it('shows search term in results header', () => {
    render(<SearchResults {...defaultProps} />);
    
    expect(screen.getByText('Found 2 authors matching "test search"')).toBeInTheDocument();
  });

  it('handles empty search term gracefully', () => {
    const propsWithEmptyTerm = {
      ...defaultProps,
      searchTerm: '',
    };
    
    render(<SearchResults {...propsWithEmptyTerm} />);
    
    expect(screen.getByText('Found 2 authors matching ""')).toBeInTheDocument();
  });
});