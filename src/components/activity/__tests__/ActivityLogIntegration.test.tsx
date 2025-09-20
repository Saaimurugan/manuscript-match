import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityLog } from '../ActivityLog';
import { ProcessActivityLog } from '../ProcessActivityLog';
import { apiService } from '@/services/apiService';
import type { PaginatedResponse } from '@/types/api';

// Mock the API service
jest.mock('@/services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockActivityResponse: PaginatedResponse<any> = {
  data: [
    {
      id: '1',
      userId: 'user-123',
      action: 'PROCESS_CREATED',
      timestamp: '2024-01-01T10:00:00Z',
      formattedTimestamp: 'Jan 01, 10:00:00',
      details: 'Created new manuscript analysis process',
      processId: 'process-123'
    },
    {
      id: '2',
      userId: 'user-123',
      action: 'FILE_UPLOADED',
      timestamp: '2024-01-01T10:30:00Z',
      formattedTimestamp: 'Jan 01, 10:30:00',
      details: { fileName: 'manuscript.pdf', size: 2048576 },
      processId: 'process-123'
    },
    {
      id: '3',
      userId: 'user-123',
      action: 'METADATA_EXTRACTED',
      timestamp: '2024-01-01T10:35:00Z',
      formattedTimestamp: 'Jan 01, 10:35:00',
      details: { title: 'AI in Healthcare', authors: 3, keywords: 5 },
      processId: 'process-123'
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

describe('Activity Logging Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ActivityLog Component Integration', () => {
    it('should fetch and display admin activity logs', async () => {
      mockApiService.request.mockResolvedValue({ data: mockActivityResponse });

      render(
        <ActivityLog currentUser="admin" showFilters={true} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Process Created')).toBeInTheDocument();
      });

      expect(mockApiService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/admin/logs?'
      });

      expect(screen.getByText('File Uploaded')).toBeInTheDocument();
      expect(screen.getByText('Metadata Extracted')).toBeInTheDocument();
      expect(screen.getByText('Created new manuscript analysis process')).toBeInTheDocument();
    });

    it('should handle search and filtering', async () => {
      mockApiService.request.mockResolvedValue({ data: mockActivityResponse });

      render(
        <ActivityLog showFilters={true} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Process Created')).toBeInTheDocument();
      });

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search activities...');
      fireEvent.change(searchInput, { target: { value: 'upload' } });

      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledWith({
          method: 'GET',
          url: '/admin/logs?search=upload&page=1'
        });
      });
    });

    it('should handle pagination correctly', async () => {
      const paginatedResponse = {
        ...mockActivityResponse,
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: paginatedResponse });

      render(
        <ActivityLog />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Process Created')).toBeInTheDocument();
      });

      expect(screen.getByText('Showing 1 to 2 of 3 activities')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledWith({
          method: 'GET',
          url: '/admin/logs?'
        });
      });
    });
  });

  describe('ProcessActivityLog Component Integration', () => {
    it('should fetch and display process-specific activity logs', async () => {
      const processResponse = {
        data: mockActivityResponse.data.filter(activity => activity.processId === 'process-123'),
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: processResponse });

      render(
        <ProcessActivityLog processId="process-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Process Activity')).toBeInTheDocument();
      });

      expect(mockApiService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/processes/process-123/logs?'
      });

      expect(screen.getByText('Process Created')).toBeInTheDocument();
      expect(screen.getByText('File Uploaded')).toBeInTheDocument();
      expect(screen.getByText('Metadata Extracted')).toBeInTheDocument();
    });

    it('should handle process activity pagination', async () => {
      const processResponse = {
        data: mockActivityResponse.data.slice(0, 2),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: processResponse });

      render(
        <ProcessActivityLog processId="process-123" showPagination={true} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Process Activity')).toBeInTheDocument();
      });

      expect(screen.getByText('3 total activities')).toBeInTheDocument();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();

      // Test pagination
      const nextButton = screen.getByRole('button', { name: '' }); // Next button with only icon
      const buttons = screen.getAllByRole('button');
      const nextBtn = buttons.find(btn => btn.querySelector('svg')); // Find button with chevron icon
      
      if (nextBtn) {
        fireEvent.click(nextBtn);
        
        await waitFor(() => {
          expect(mockApiService.request).toHaveBeenCalledWith({
            method: 'GET',
            url: '/processes/process-123/logs?'
          });
        });
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully in ActivityLog', async () => {
      mockApiService.request.mockRejectedValue(new Error('Network error'));

      render(
        <ActivityLog />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle API errors gracefully in ProcessActivityLog', async () => {
      mockApiService.request.mockRejectedValue(new Error('Process not found'));

      render(
        <ProcessActivityLog processId="invalid-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load process activities')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time updates in ActivityLog', async () => {
      // Initial data
      mockApiService.request.mockResolvedValueOnce({ data: mockActivityResponse });

      render(
        <ActivityLog enableRealtime={true} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Process Created')).toBeInTheDocument();
      });

      // Simulate new activity being added
      const updatedResponse = {
        ...mockActivityResponse,
        data: [
          {
            id: '4',
            userId: 'user-123',
            action: 'SEARCH_INITIATED',
            timestamp: '2024-01-01T11:00:00Z',
            formattedTimestamp: 'Jan 01, 11:00:00',
            details: 'Started database search',
            processId: 'process-123'
          },
          ...mockActivityResponse.data
        ],
        pagination: {
          ...mockActivityResponse.pagination,
          total: 4
        }
      };

      mockApiService.request.mockResolvedValueOnce({ data: updatedResponse });

      // Wait for the real-time update (the hook should refetch automatically)
      await waitFor(() => {
        expect(mockApiService.request).toHaveBeenCalledTimes(2);
      }, { timeout: 6000 }); // Wait longer for real-time updates
    });
  });

  describe('Activity Details Integration', () => {
    it('should display complex activity details correctly', async () => {
      const complexActivityResponse = {
        data: [
          {
            id: '1',
            userId: 'user-123',
            action: 'VALIDATION_COMPLETED',
            timestamp: '2024-01-01T12:00:00Z',
            formattedTimestamp: 'Jan 01, 12:00:00',
            details: {
              totalCandidates: 150,
              validatedReviewers: 45,
              excludedReviewers: 105,
              validationRules: {
                excludeManuscriptAuthors: true,
                excludeCoAuthors: true,
                minPublications: 10
              },
              processingTime: '2.3s'
            },
            processId: 'process-123'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: complexActivityResponse });

      render(
        <ActivityLog />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Validation Completed')).toBeInTheDocument();
      });

      // Check that complex object details are displayed
      expect(screen.getByText('total candidates:')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('validated reviewers:')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('processing time:')).toBeInTheDocument();
      expect(screen.getByText('2.3s')).toBeInTheDocument();
    });
  });
});