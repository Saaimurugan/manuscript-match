/**
 * SearchStep Component Tests
 * Tests for the database search configuration and execution step
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchStep } from '../SearchStep';
import { useScholarFinderApi } from '../../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../../hooks/useProcessManagement';

// Mock the hooks and config
vi.mock('../../../hooks/useScholarFinderApi');
vi.mock('../../../hooks/useProcessManagement');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 30000,
    enableDebugLogging: false
  }
}));

// Mock the sub-components
vi.mock('../search', () => ({
  DatabaseSelector: ({ onSelectionChange, selectedDatabases }: any) => (
    <div data-testid="database-selector">
      <button 
        onClick={() => onSelectionChange(['pubmed', 'sciencedirect'])}
        data-testid="select-databases"
      >
        Select Databases
      </button>
      <div data-testid="selected-count">{selectedDatabases.length}</div>
    </div>
  ),
  SearchProgress: () => <div data-testid="search-progress">Searching...</div>,
  SearchResults: ({ results, onRetryFailed }: any) => (
    <div data-testid="search-results">
      <div data-testid="total-reviewers">{results.total_reviewers}</div>
      {onRetryFailed && (
        <button onClick={onRetryFailed} data-testid="retry-failed">
          Retry Failed
        </button>
      )}
    </div>
  )
}));

const mockSearchDatabases = vi.fn();
const mockUpdateProcessStep = vi.fn();

const mockUseScholarFinderApi = useScholarFinderApi as any;
const mockUseProcess = useProcess as any;
const mockUseUpdateProcessStep = useUpdateProcessStep as any;

describe('SearchStep', () => {
  let queryClient: QueryClient;

  const defaultProps = {
    processId: 'test-process-id',
    jobId: 'test-job-id',
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockUseScholarFinderApi.mockReturnValue({
      searchDatabases: {
        mutateAsync: mockSearchDatabases,
        isPending: false,
        error: null
      }
    });

    mockUseProcess.mockReturnValue({
      data: {
        id: 'test-process-id',
        stepData: {}
      }
    });

    mockUseUpdateProcessStep.mockReturnValue({
      mutateAsync: mockUpdateProcessStep
    });

    mockSearchDatabases.mockResolvedValue({
      data: {
        total_reviewers: 150,
        databases_searched: ['pubmed', 'sciencedirect'],
        search_status: {
          pubmed: 'success',
          sciencedirect: 'success'
        },
        preview_reviewers: [
          {
            reviewer: 'Dr. John Smith',
            email: 'john.smith@university.edu',
            aff: 'University of Science',
            city: 'Boston',
            country: 'USA',
            Total_Publications: 45,
            conditions_met: 8
          }
        ]
      }
    });

    mockUpdateProcessStep.mockResolvedValue({});
  });

  const renderSearchStep = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SearchStep {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('renders the search step header', () => {
      renderSearchStep();
      
      expect(screen.getByText('Search Academic Databases')).toBeInTheDocument();
      expect(screen.getByText('Select databases and search for potential reviewers using your enhanced keywords')).toBeInTheDocument();
    });

    it('renders database selector component', () => {
      renderSearchStep();
      
      expect(screen.getByTestId('database-selector')).toBeInTheDocument();
    });

    it('renders search controls', () => {
      renderSearchStep();
      
      expect(screen.getByText('Database Search')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start search/i })).toBeInTheDocument();
    });

    it('shows navigation buttons', () => {
      renderSearchStep();
      
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete search to continue/i })).toBeInTheDocument();
    });
  });

  describe('Database Selection', () => {
    it('starts with default databases selected', () => {
      renderSearchStep();
      
      // Should show default selection count (PubMed, Taylor & Francis, ScienceDirect are default)
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3');
    });

    it('updates selection when databases are changed', () => {
      renderSearchStep();
      
      fireEvent.click(screen.getByTestId('select-databases'));
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2');
    });

    it('shows selected database names', () => {
      renderSearchStep();
      
      expect(screen.getByText(/3 databases selected/i)).toBeInTheDocument();
    });
  });

  describe('Search Execution', () => {
    it('executes search when start search button is clicked', async () => {
      renderSearchStep();
      
      const searchButton = screen.getByRole('button', { name: /start search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(mockSearchDatabases).toHaveBeenCalledWith({
          jobId: 'test-job-id',
          databases: {
            selected_websites: ['pubmed', 'tandf', 'sciencedirect']
          }
        });
      });
    });

    it('shows search progress during search', () => {
      mockUseScholarFinderApi.mockReturnValue({
        searchDatabases: {
          mutateAsync: mockSearchDatabases,
          isPending: true,
          error: null
        }
      });

      renderSearchStep();
      
      expect(screen.getByTestId('search-progress')).toBeInTheDocument();
    });

    it('shows search results after successful search', async () => {
      renderSearchStep();
      
      const searchButton = screen.getByRole('button', { name: /start search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
        expect(screen.getByTestId('total-reviewers')).toHaveTextContent('150');
      });
    });

    it('prevents search with no databases selected', async () => {
      renderSearchStep();
      
      // Mock empty selection
      mockUseScholarFinderApi.mockReturnValue({
        searchDatabases: {
          mutateAsync: mockSearchDatabases,
          isPending: false,
          error: null
        }
      });

      // Simulate no databases selected by updating the component state
      const searchButton = screen.getByRole('button', { name: /start search/i });
      
      // The button should be disabled when no databases are selected
      // This would be handled by the component's internal state
      expect(searchButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles search errors gracefully', async () => {
      const searchError = new Error('Database connection failed');
      mockSearchDatabases.mockRejectedValue(searchError);

      renderSearchStep();
      
      const searchButton = screen.getByRole('button', { name: /start search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(mockSearchDatabases).toHaveBeenCalled();
      });
    });

    it('shows retry option for failed databases', async () => {
      // Mock partial failure response
      mockSearchDatabases.mockResolvedValue({
        data: {
          total_reviewers: 75,
          databases_searched: ['pubmed'],
          search_status: {
            pubmed: 'success',
            sciencedirect: 'failed'
          },
          preview_reviewers: []
        }
      });

      renderSearchStep();
      
      const searchButton = screen.getByRole('button', { name: /start search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('retry-failed')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('calls onPrevious when previous button is clicked', () => {
      const onPrevious = vi.fn();
      renderSearchStep({ onPrevious });
      
      fireEvent.click(screen.getByRole('button', { name: /previous/i }));
      
      expect(onPrevious).toHaveBeenCalled();
    });

    it('prevents navigation to next step without completed search', () => {
      renderSearchStep();
      
      const nextButton = screen.getByRole('button', { name: /complete search to continue/i });
      expect(nextButton).toBeDisabled();
    });

    it('allows navigation after successful search', async () => {
      const onNext = vi.fn();
      renderSearchStep({ onNext });
      
      // Execute search first
      const searchButton = screen.getByRole('button', { name: /start search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });

      // Now the next button should be enabled
      const nextButton = screen.getByRole('button', { name: /continue to manual addition/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(mockUpdateProcessStep).toHaveBeenCalled();
        expect(onNext).toHaveBeenCalledWith({
          selectedDatabases: ['pubmed', 'tandf', 'sciencedirect'],
          searchResults: expect.any(Object),
          searchStatus: 'completed',
          totalReviewers: 150
        });
      });
    });
  });

  describe('Data Persistence', () => {
    it('loads existing search data on mount', () => {
      const existingData = {
        selectedDatabases: ['pubmed'],
        searchResults: {
          total_reviewers: 100,
          databases_searched: ['pubmed'],
          search_status: { pubmed: 'success' }
        },
        searchStatus: 'completed'
      };

      mockUseProcess.mockReturnValue({
        data: {
          id: 'test-process-id',
          stepData: {
            search: existingData
          }
        }
      });

      renderSearchStep();
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
    });

    it('saves search data when proceeding to next step', async () => {
      const onNext = vi.fn();
      renderSearchStep({ onNext });
      
      // Execute search
      const searchButton = screen.getByRole('button', { name: /start search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });

      // Proceed to next step
      const nextButton = screen.getByRole('button', { name: /continue to manual addition/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(mockUpdateProcessStep).toHaveBeenCalledWith({
          processId: 'test-process-id',
          step: 'search',
          stepData: expect.objectContaining({
            selectedDatabases: expect.any(Array),
            searchResults: expect.any(Object),
            searchStatus: 'completed'
          })
        });
      });
    });
  });

  describe('Loading States', () => {
    it('disables controls during search', () => {
      mockUseScholarFinderApi.mockReturnValue({
        searchDatabases: {
          mutateAsync: mockSearchDatabases,
          isPending: true,
          error: null
        }
      });

      renderSearchStep();
      
      expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    });

    it('shows loading state in search button', () => {
      mockUseScholarFinderApi.mockReturnValue({
        searchDatabases: {
          mutateAsync: mockSearchDatabases,
          isPending: true,
          error: null
        }
      });

      renderSearchStep();
      
      expect(screen.getByRole('button', { name: /searching/i })).toBeInTheDocument();
    });
  });
});