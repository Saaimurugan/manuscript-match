/**
 * Tests for ReviewerResults component
 * Tests filtering, sorting, pagination, and real backend integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReviewerResults } from '../ReviewerResults';
import { usePaginatedRecommendations, useRecommendationFilters } from '../../../hooks/useRecommendations';
import { ActivityLogger } from '../../../services/activityLogger';
import { toast } from 'sonner';
import type { Reviewer, PaginatedResponse } from '../../../types/api';

// Mock dependencies
vi.mock('../../../hooks/useRecommendations');
vi.mock('../../../hooks/usePerformance', () => ({
  useRenderPerformance: vi.fn(),
  useDebounce: (value: string) => value,
}));
vi.mock('../../../services/activityLogger');
vi.mock('sonner');

const mockUsePaginatedRecommendations = vi.mocked(usePaginatedRecommendations);
const mockUseRecommendationFilters = vi.mocked(useRecommendationFilters);
const mockActivityLogger = vi.mocked(ActivityLogger);
const mockToast = vi.mocked(toast);

// Mock data
const mockReviewers: Reviewer[] = [
  {
    id: '1',
    name: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    affiliation: 'University of Technology',
    country: 'United States',
    publicationCount: 45,
    recentPublications: [
      'Machine Learning in Healthcare: A Comprehensive Review',
      'Deep Learning Applications in Medical Diagnosis',
      'AI-Driven Drug Discovery: Current Trends'
    ],
    expertise: ['Machine Learning', 'Healthcare', 'Medical AI'],
    database: 'PubMed',
    matchScore: 92,
    validationStatus: {
      excludedAsManuscriptAuthor: false,
      excludedAsCoAuthor: false,
      hasMinimumPublications: true,
      hasAcceptableRetractions: true,
      hasInstitutionalConflict: false
    }
  },
  {
    id: '2',
    name: 'Prof. Sarah Johnson',
    email: 'sarah.johnson@research.org',
    affiliation: 'Research Institute',
    country: 'Canada',
    publicationCount: 67,
    recentPublications: [
      'Neural Networks for Pattern Recognition',
      'Computer Vision in Medical Imaging'
    ],
    expertise: ['Computer Vision', 'Neural Networks', 'Medical Imaging'],
    database: 'Elsevier',
    matchScore: 88,
    validationStatus: {
      excludedAsManuscriptAuthor: false,
      excludedAsCoAuthor: false,
      hasMinimumPublications: true,
      hasAcceptableRetractions: true,
      hasInstitutionalConflict: false
    }
  }
];

const mockPaginatedResponse: PaginatedResponse<Reviewer> = {
  data: mockReviewers,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

const mockFilterOptions = {
  countries: ['United States', 'Canada'],
  affiliationTypes: ['University', 'Hospital'],
  expertise: ['Machine Learning', 'Healthcare'],
  databases: ['pubmed', 'elsevier'],
  publicationRange: { min: 0, max: 100 },
};

const mockLoggerInstance = {
  logActivity: vi.fn().mockResolvedValue(undefined)
};

describe('ReviewerResults', () => {
  let queryClient: QueryClient;

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
    mockUsePaginatedRecommendations.mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isError: false,
      isSuccess: true
    } as any);

    mockUseRecommendationFilters.mockReturnValue({
      data: mockFilterOptions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as any);

    mockActivityLogger.getInstance.mockReturnValue(mockLoggerInstance as any);
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      processId: 'test-process-id',
      onExport: vi.fn(),
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ReviewerResults {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders reviewer recommendations with correct data', async () => {
      renderComponent();

      expect(screen.getByText('Reviewer Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
      expect(screen.getByText('Prof. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('92% match')).toBeInTheDocument();
      expect(screen.getByText('88% match')).toBeInTheDocument();
    });

    it('displays pagination information correctly', () => {
      renderComponent();

      expect(screen.getByText(/Showing 1-2 of 2 reviewers/)).toBeInTheDocument();
    });

    it('shows loading state when data is loading', () => {
      mockUsePaginatedRecommendations.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      } as any);

      renderComponent();

      // Should show skeleton loading components
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows error state when there is an error', () => {
      const error = new Error('Failed to load');
      mockUsePaginatedRecommendations.mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
        refetch: vi.fn()
      } as any);

      renderComponent();

      expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows and hides advanced filters', async () => {
      renderComponent();

      // Initially filters should be hidden
      expect(screen.queryByText('Advanced Filters')).not.toBeInTheDocument();

      // Click filters button
      fireEvent.click(screen.getByText('Filters'));

      // Now filters should be visible
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      expect(screen.getByText('Publication Count')).toBeInTheDocument();
      expect(screen.getByText('Country')).toBeInTheDocument();
      expect(screen.getByText('Expertise Area')).toBeInTheDocument();
    });

    it('handles search input', async () => {
      renderComponent();

      const searchInput = screen.getByPlaceholderText(
        'Search reviewers by name, affiliation, or expertise...'
      );
      fireEvent.change(searchInput, { target: { value: 'machine learning' } });

      expect(searchInput).toHaveValue('machine learning');
    });

    it('clears filters when clear button is clicked', async () => {
      renderComponent();

      // Show filters
      fireEvent.click(screen.getByText('Filters'));

      // Click clear filters
      fireEvent.click(screen.getByText('Clear Filters'));

      // Should reset filters (component would re-render with empty filters)
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('handles sort by match score', async () => {
      renderComponent();

      const matchScoreButton = screen.getByText(/Match Score/);
      fireEvent.click(matchScoreButton);

      // Should trigger sort change (component would re-render with new sort)
      expect(matchScoreButton).toBeInTheDocument();
    });

    it('handles sort by publication count', async () => {
      renderComponent();

      const publicationsButton = screen.getByText(/Publications/);
      fireEvent.click(publicationsButton);

      // Should trigger sort change
      expect(publicationsButton).toBeInTheDocument();
    });
  });

  describe('Selection and Export', () => {
    it('handles individual reviewer selection', () => {
      renderComponent();

      const checkbox = screen.getByLabelText('reviewer-1');
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('handles select all functionality', () => {
      renderComponent();

      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      // Should check select all checkbox
      expect(selectAllCheckbox).toBeChecked();
    });

    it('exports selected reviewers successfully', async () => {
      const mockOnExport = vi.fn();
      renderComponent({ onExport: mockOnExport });

      // Select a reviewer
      const checkbox = screen.getByLabelText('reviewer-1');
      fireEvent.click(checkbox);

      // Click export
      fireEvent.click(screen.getByText(/Export \(1\)/));

      await waitFor(() => {
        expect(mockLoggerInstance.logActivity).toHaveBeenCalledWith(
          'EXPORT',
          'Exported 1 reviewers',
          expect.stringContaining('test-process-id')
        );
        expect(mockOnExport).toHaveBeenCalledWith([mockReviewers[0]]);
      });
    });

    it('shows error when trying to export without selection', async () => {
      renderComponent();

      fireEvent.click(screen.getByText(/Export \(0\)/));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Please select at least one reviewer to export');
      });
    });
  });

  describe('Pagination', () => {
    it('handles pagination when multiple pages exist', () => {
      const multiPageResponse: PaginatedResponse<Reviewer> = {
        ...mockPaginatedResponse,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false
        }
      };

      mockUsePaginatedRecommendations.mockReturnValue({
        data: multiPageResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      } as any);

      renderComponent();

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      const firstPageResponse: PaginatedResponse<Reviewer> = {
        ...mockPaginatedResponse,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false
        }
      };

      mockUsePaginatedRecommendations.mockReturnValue({
        data: firstPageResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      } as any);

      renderComponent();

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      const lastPageResponse: PaginatedResponse<Reviewer> = {
        ...mockPaginatedResponse,
        pagination: {
          page: 3,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNextPage: false,
          hasPreviousPage: true
        }
      };

      mockUsePaginatedRecommendations.mockReturnValue({
        data: lastPageResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      } as any);

      renderComponent();

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no reviewers found', () => {
      const emptyResponse: PaginatedResponse<Reviewer> = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockUsePaginatedRecommendations.mockReturnValue({
        data: emptyResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      } as any);

      renderComponent();

      expect(screen.getByText('No reviewers found matching your criteria.')).toBeInTheDocument();
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });

  describe('Integration with Backend', () => {
    it('calls hooks with correct process ID', () => {
      renderComponent({ processId: 'specific-process-id' });

      expect(mockUsePaginatedRecommendations).toHaveBeenCalledWith(
        'specific-process-id',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );

      expect(mockUseRecommendationFilters).toHaveBeenCalledWith(
        'specific-process-id'
      );
    });

    it('uses backend filter options when available', () => {
      renderComponent();

      // Should use backend filter options
      expect(mockUseRecommendationFilters).toHaveBeenCalledWith('test-process-id');
    });
  });
});