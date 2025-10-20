/**
 * ManualStep Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ManualStep } from '../ManualStep';
import { useScholarFinderApi } from '../../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../../hooks/useProcessManagement';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('../../../hooks/useScholarFinderApi');
vi.mock('../../../hooks/useProcessManagement');
vi.mock('@/hooks/use-toast');

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 10000,
    enableDebugLogging: false,
  },
}));

// Mock sub-components
vi.mock('../manual', () => ({
  AuthorSearch: ({ onSearch, isLoading }: any) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchTerm.length >= 2) {
        onSearch(searchTerm);
      }
    };
    
    return (
      <div data-testid="author-search">
        <form onSubmit={handleSubmit}>
          <input
            data-testid="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || searchTerm.length < 2}>
            Search
          </button>
        </form>
      </div>
    );
  },
  SearchResults: ({ results, onAddAuthor, addedAuthors }: any) => (
    <div data-testid="search-results">
      {results.map((author: any, index: number) => {
        const isAdded = addedAuthors.some((a: any) => 
          a.name === author.name && a.affiliation === author.affiliation
        );
        return (
          <div key={index} data-testid={`result-${index}`}>
            <span>{author.name}</span>
            <button
              onClick={() => onAddAuthor(author)}
              disabled={isAdded}
            >
              {isAdded ? 'Added' : 'Add'}
            </button>
          </div>
        );
      })}
    </div>
  ),
}));

const mockUseScholarFinderApi = vi.mocked(useScholarFinderApi);
const mockUseProcess = vi.mocked(useProcess);
const mockUseUpdateProcessStep = vi.mocked(useUpdateProcessStep);
const mockUseToast = vi.mocked(useToast);

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

const defaultProps = {
  processId: 'test-process-id',
  jobId: 'test-job-id',
  onNext: vi.fn(),
  onPrevious: vi.fn(),
  isLoading: false,
};

const mockManualAuthor = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  affiliation: 'Test University',
  country: 'USA',
  publications: 25,
};

const mockApiResponse = {
  message: 'Success',
  job_id: 'test-job-id',
  data: {
    found_authors: [mockManualAuthor],
    search_term: 'John Doe',
    total_found: 1,
  },
};

describe('ManualStep', () => {
  const mockToast = vi.fn();
  const mockAddManualAuthor = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  };
  const mockUpdateProcessStep = {
    mutateAsync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockUseScholarFinderApi.mockReturnValue({
      addManualAuthor: mockAddManualAuthor,
    } as any);
    mockUseProcess.mockReturnValue({
      data: {
        id: 'test-process-id',
        stepData: {},
      },
    } as any);
    mockUseUpdateProcessStep.mockReturnValue(mockUpdateProcessStep as any);
  });

  it('renders step header and components', () => {
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Add Reviewers Manually')).toBeInTheDocument();
    expect(screen.getByText(/Search for and add specific reviewers by name/)).toBeInTheDocument();
    expect(screen.getByTestId('author-search')).toBeInTheDocument();
  });

  it('handles author search successfully', async () => {
    mockAddManualAuthor.mutateAsync.mockResolvedValue(mockApiResponse);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    await waitFor(() => {
      expect(mockAddManualAuthor.mutateAsync).toHaveBeenCalledWith({
        jobId: 'test-job-id',
        authorName: 'John Doe',
      });
    });
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Search Completed',
      description: 'Found 1 author matching "John Doe".',
      variant: 'default',
    });
  });

  it('handles search with no results', async () => {
    const noResultsResponse = {
      ...mockApiResponse,
      data: {
        ...mockApiResponse.data,
        found_authors: [],
        total_found: 0,
      },
    };
    
    mockAddManualAuthor.mutateAsync.mockResolvedValue(noResultsResponse);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Unknown Author' } });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'No Results Found',
        description: 'No authors found for "Unknown Author". Try using different search terms or partial names.',
        variant: 'default',
      });
    });
  });

  it('handles search error', async () => {
    const error = new Error('Search failed');
    mockAddManualAuthor.mutateAsync.mockRejectedValue(error);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Search Failed',
        description: 'Search failed',
        variant: 'destructive',
      });
    });
  });

  it('validates search term length', async () => {
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'J' } });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid Search Term',
        description: 'Author name must be at least 2 characters long.',
        variant: 'destructive',
      });
    });
    
    expect(mockAddManualAuthor.mutateAsync).not.toHaveBeenCalled();
  });

  it('requires job ID for search', async () => {
    render(<ManualStep {...defaultProps} jobId="" />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Job ID is required for author search',
        variant: 'destructive',
      });
    });
    
    expect(mockAddManualAuthor.mutateAsync).not.toHaveBeenCalled();
  });

  it('adds author to list', async () => {
    mockAddManualAuthor.mutateAsync.mockResolvedValue(mockApiResponse);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    // First search for author
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
    
    // Then add the author
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Author Added',
      description: 'John Doe has been added to your reviewer candidates.',
      variant: 'default',
    });
  });

  it('prevents duplicate author addition', async () => {
    mockAddManualAuthor.mutateAsync.mockResolvedValue(mockApiResponse);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    // Search and add author first time
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
    
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    // Try to add same author again
    fireEvent.click(addButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Author Already Added',
      description: 'John Doe from Test University is already in your list.',
      variant: 'default',
    });
  });

  it('saves progress successfully', async () => {
    mockUpdateProcessStep.mutateAsync.mockResolvedValue(undefined);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const saveButton = screen.getByText('Save Progress');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateProcessStep.mutateAsync).toHaveBeenCalledWith({
        processId: 'test-process-id',
        step: 'manual',
        stepData: {
          addedAuthors: [],
          searchHistory: [],
          lastSearched: undefined,
        },
      });
    });
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Manual Authors Saved',
      description: 'Your manually added authors have been saved.',
      variant: 'default',
    });
  });

  it('handles save error', async () => {
    const error = new Error('Save failed');
    mockUpdateProcessStep.mutateAsync.mockRejectedValue(error);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const saveButton = screen.getByText('Save Progress');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Save Failed',
        description: 'Save failed',
        variant: 'destructive',
      });
    });
  });

  it('navigates to next step', async () => {
    mockUpdateProcessStep.mutateAsync.mockResolvedValue(undefined);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const nextButton = screen.getByText(/Continue to Validation/);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(defaultProps.onNext).toHaveBeenCalledWith({
        addedAuthors: [],
        totalManualAuthors: 0,
      });
    });
  });

  it('navigates to previous step', () => {
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    const previousButton = screen.getByText('Previous');
    fireEvent.click(previousButton);
    
    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  it('loads existing data from process', () => {
    const existingData = {
      addedAuthors: [mockManualAuthor],
      searchHistory: [{
        searchTerm: 'John Doe',
        results: [mockManualAuthor],
        timestamp: new Date('2024-01-01'),
      }],
      lastSearched: new Date('2024-01-01'),
    };
    
    mockUseProcess.mockReturnValue({
      data: {
        id: 'test-process-id',
        stepData: {
          manual: existingData,
        },
      },
    } as any);
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Added Authors (1)')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows loading state during search', () => {
    mockAddManualAuthor.isPending = true;
    
    render(<ManualStep {...defaultProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('disables buttons during loading', () => {
    render(<ManualStep {...defaultProps} isLoading={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText(/Continue to Validation/)).toBeDisabled();
  });
});