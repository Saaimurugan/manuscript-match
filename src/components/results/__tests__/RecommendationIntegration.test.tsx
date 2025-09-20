/**
 * Integration test for reviewer recommendation system
 * Tests the complete flow from service to component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerResults } from '../ReviewerResults';
import { recommendationService } from '../../../services/recommendationService';
import type { PaginatedResponse, Reviewer } from '../../../types/api';

// Mock the API service
vi.mock('../../../services/apiService', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

// Mock performance hooks
vi.mock('../../../hooks/usePerformance', () => ({
  useRenderPerformance: vi.fn(),
  useDebounce: (value: string) => value,
}));

// Mock activity logger
vi.mock('../../../services/activityLogger', () => ({
  ActivityLogger: {
    getInstance: () => ({
      logActivity: vi.fn(),
    }),
  },
}));

const mockReviewer: Reviewer = {
  id: 'reviewer-1',
  name: 'Dr. John Smith',
  email: 'john.smith@university.edu',
  affiliation: 'University of Technology',
  country: 'United States',
  publicationCount: 25,
  recentPublications: [
    'Machine Learning in Healthcare',
    'AI Applications in Medical Diagnosis'
  ],
  expertise: ['Machine Learning', 'Healthcare', 'Medical AI'],
  database: 'pubmed',
  matchScore: 85,
  validationStatus: {
    excludedAsManuscriptAuthor: false,
    excludedAsCoAuthor: false,
    hasMinimumPublications: true,
    hasAcceptableRetractions: true,
    hasInstitutionalConflict: false,
  },
};

const mockPaginatedResponse: PaginatedResponse<Reviewer> = {
  data: [mockReviewer],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

describe('Recommendation Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('integrates recommendation service with component', async () => {
    // Mock the API service to return our test data
    const { apiService } = await import('../../../services/apiService');
    vi.mocked(apiService.get).mockResolvedValue({ data: mockPaginatedResponse });

    renderWithQueryClient(
      <ReviewerResults processId="test-process-id" />
    );

    // Should eventually show the reviewer data
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('85% match')).toBeInTheDocument();
    expect(screen.getByText('University of Technology, United States')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock the API service to throw an error
    const { apiService } = await import('../../../services/apiService');
    vi.mocked(apiService.get).mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(
      <ReviewerResults processId="test-process-id" />
    );

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('calls correct API endpoint with filters', async () => {
    const { apiService } = await import('../../../services/apiService');
    vi.mocked(apiService.get).mockResolvedValue({ data: mockPaginatedResponse });

    // Test the service directly
    await recommendationService.getRecommendations('test-process-id', {
      page: 1,
      limit: 20,
      filters: {
        minPublications: 10,
        countries: ['United States'],
        search: 'machine learning',
      },
      sort: {
        field: 'matchScore',
        direction: 'desc',
      },
    });

    expect(apiService.get).toHaveBeenCalledWith(
      '/api/processes/test-process-id/recommendations',
      {
        page: 1,
        limit: 20,
        minPublications: 10,
        countries: 'United States',
        search: 'machine learning',
        sortBy: 'matchScore',
        sortOrder: 'desc',
      }
    );
  });

  it('handles filter options endpoint', async () => {
    const { apiService } = await import('../../../services/apiService');
    const mockFilterOptions = {
      countries: ['United States', 'Canada'],
      affiliationTypes: ['University', 'Hospital'],
      expertise: ['Machine Learning', 'Healthcare'],
      databases: ['pubmed', 'elsevier'],
      publicationRange: { min: 0, max: 100 },
    };

    vi.mocked(apiService.get).mockResolvedValue({ data: mockFilterOptions });

    const result = await recommendationService.getFilterOptions('test-process-id');

    expect(apiService.get).toHaveBeenCalledWith(
      '/api/processes/test-process-id/recommendations/filters'
    );
    expect(result).toEqual(mockFilterOptions);
  });

  it('handles recommendation stats endpoint', async () => {
    const { apiService } = await import('../../../services/apiService');
    const mockStats = {
      total: 50,
      byDatabase: { pubmed: 20, elsevier: 15, wiley: 15 },
      byCountry: { 'United States': 25, 'Canada': 15, 'United Kingdom': 10 },
      averageMatchScore: 75.5,
      averagePublications: 22.3,
    };

    vi.mocked(apiService.get).mockResolvedValue({ data: mockStats });

    const result = await recommendationService.getRecommendationStats('test-process-id');

    expect(apiService.get).toHaveBeenCalledWith(
      '/api/processes/test-process-id/recommendations/stats'
    );
    expect(result).toEqual(mockStats);
  });

  it('falls back to calculating stats from recommendations', async () => {
    const { apiService } = await import('../../../services/apiService');
    
    // First call (stats endpoint) fails
    vi.mocked(apiService.get)
      .mockRejectedValueOnce(new Error('Stats endpoint not available'))
      .mockResolvedValueOnce({ data: mockPaginatedResponse });

    const result = await recommendationService.getRecommendationStats('test-process-id');

    expect(apiService.get).toHaveBeenCalledTimes(2);
    expect(apiService.get).toHaveBeenNthCalledWith(1, '/api/processes/test-process-id/recommendations/stats');
    expect(apiService.get).toHaveBeenNthCalledWith(2, '/api/processes/test-process-id/recommendations', { limit: 1000 });
    
    expect(result.total).toBe(1);
    expect(result.averageMatchScore).toBe(85);
    expect(result.averagePublications).toBe(25);
  });
});