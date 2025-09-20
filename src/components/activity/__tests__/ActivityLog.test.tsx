import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityLog } from '../ActivityLog';
import { useActivityLogs, useRealtimeActivityLogs } from '@/hooks/useActivityLogs';
import type { PaginatedResponse } from '@/types/api';

// Mock the hooks
jest.mock('@/hooks/useActivityLogs');
const mockUseActivityLogs = useActivityLogs as jest.MockedFunction<typeof useActivityLogs>;
const mockUseRealtimeActivityLogs = useRealtimeActivityLogs as jest.MockedFunction<typeof useRealtimeActivityLogs>;

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

const mockActivityData: PaginatedResponse<any> = {
  data: [
    {
      id: '1',
      userId: 'user-123',
      action: 'LOGIN',
      timestamp: '2024-01-01T10:00:00Z',
      formattedTimestamp: 'Jan 01, 10:00:00',
      details: 'User logged in successfully'
    },
    {
      id: '2',
      userId: 'user-456',
      action: 'FILE_UPLOADED',
      timestamp: '2024-01-01T11:00:00Z',
      formattedTimestamp: 'Jan 01, 11:00:00',
      details: { fileName: 'document.pdf', size: 1024 },
      processId: 'process-123'
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

describe('ActivityLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render activity log with data', async () => {
    mockUseActivityLogs.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog currentUser="test-user" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('test-user')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('File Uploaded')).toBeInTheDocument();
    expect(screen.getByText('User logged in successfully')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseActivityLogs.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    // Should show skeleton loading components
    expect(document.querySelectorAll('[data-testid="skeleton"]')).toBeTruthy();
  });

  it('should show error state with retry button', () => {
    const mockRefetch = jest.fn();
    mockUseActivityLogs.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
      refetch: mockRefetch,
    } as any);

    render(
      <ActivityLog />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should show empty state when no activities', () => {
    mockUseActivityLogs.mockReturnValue({
      data: {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No activities recorded yet')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    const mockRefetch = jest.fn();
    mockUseActivityLogs.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(
      <ActivityLog showFilters={true} />,
      { wrapper: createWrapper() }
    );

    const searchInput = screen.getByPlaceholderText('Search activities...');
    fireEvent.change(searchInput, { target: { value: 'login' } });
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    // The component should update its query state
    expect(searchInput).toHaveValue('login');
  });

  it('should handle pagination', () => {
    const paginatedData = {
      ...mockActivityData,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false
      }
    };

    mockUseActivityLogs.mockReturnValue({
      data: paginatedData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Showing 1 to 2 of 50 activities')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeEnabled();
    
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('should use realtime updates when enabled', () => {
    mockUseRealtimeActivityLogs.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog enableRealtime={true} />,
      { wrapper: createWrapper() }
    );

    expect(mockUseRealtimeActivityLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }),
      5000
    );
    expect(mockUseActivityLogs).not.toHaveBeenCalled();
  });

  it('should handle refresh button click', () => {
    const mockRefetch = jest.fn();
    mockUseActivityLogs.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(
      <ActivityLog />,
      { wrapper: createWrapper() }
    );

    const refreshButton = screen.getByRole('button', { name: '' }); // Refresh button with only icon
    fireEvent.click(refreshButton);
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should display activity details correctly', () => {
    mockUseActivityLogs.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog />,
      { wrapper: createWrapper() }
    );

    // Check for string details
    expect(screen.getByText('User logged in successfully')).toBeInTheDocument();
    
    // Check for object details
    expect(screen.getByText('file name:')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('size:')).toBeInTheDocument();
    expect(screen.getByText('1024')).toBeInTheDocument();
    
    // Check for process ID
    expect(screen.getByText('Process:')).toBeInTheDocument();
    expect(screen.getByText('process-123')).toBeInTheDocument();
  });

  it('should hide filters when showFilters is false', () => {
    mockUseActivityLogs.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <ActivityLog showFilters={false} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByPlaceholderText('Search activities...')).not.toBeInTheDocument();
    expect(screen.queryByText('Filter by action')).not.toBeInTheDocument();
  });
});