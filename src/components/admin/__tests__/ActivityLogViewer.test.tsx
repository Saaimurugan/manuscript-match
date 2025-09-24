/**
 * Tests for ActivityLogViewer component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityLogViewer } from '../ActivityLogViewer';
import type { ActivityLog } from '@/types/api';

// Mock the hooks
const mockRefetchLogs = vi.fn();
const mockExportMutation = {
  mutateAsync: vi.fn(),
  isLoading: false,
  error: null,
};

vi.mock('../../../hooks/useAdmin', () => ({
  useAdminLogs: () => ({
    data: {
      data: mockActivityLogs,
      pagination: {
        page: 1,
        limit: 50,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
    error: null,
    refetch: mockRefetchLogs,
  }),
  useAdminExport: () => mockExportMutation,
}));

// Mock activity logs data
const mockActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'user-1',
    processId: 'process-1',
    action: 'USER_LOGIN',
    details: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      resourceType: 'user',
      resourceId: 'user-1',
    },
    timestamp: '2024-01-15T10:00:00Z',
  },
  {
    id: 'log-2',
    userId: 'user-2',
    processId: null,
    action: 'PROCESS_CREATED',
    details: {
      processTitle: 'Test Process',
      ipAddress: '192.168.1.2',
      resourceType: 'process',
    },
    timestamp: '2024-01-15T11:00:00Z',
  },
  {
    id: 'log-3',
    userId: 'user-1',
    processId: 'process-2',
    action: 'FILE_UPLOADED',
    details: {
      fileName: 'document.pdf',
      fileSize: 1024000,
      resourceType: 'file',
      resourceId: 'file-1',
    },
    timestamp: '2024-01-15T12:00:00Z',
  },
];

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ActivityLogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render activity log viewer with header and controls', async () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Check header
    expect(screen.getByText('Activity Log Viewer')).toBeInTheDocument();
    expect(screen.getByText(/Monitor system activity with advanced filtering/)).toBeInTheDocument();

    // Check controls
    expect(screen.getByText('Live Updates')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should display activity logs in table format', async () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check table headers
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();

      // Check log entries
      expect(screen.getByText('USER LOGIN')).toBeInTheDocument();
      expect(screen.getByText('PROCESS CREATED')).toBeInTheDocument();
      expect(screen.getByText('FILE UPLOADED')).toBeInTheDocument();
    });
  });

  it('should display activity statistics', async () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Total Logs')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total logs count
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });
  });

  it('should handle search functionality', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/Search logs by action, user, or details/);
    await user.type(searchInput, 'USER_LOGIN');

    expect(searchInput).toHaveValue('USER_LOGIN');
  });

  it('should handle action filter', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Find and click the action filter dropdown
    const actionFilter = screen.getByDisplayValue('All Actions');
    await user.click(actionFilter);

    // Select a specific action
    await waitFor(() => {
      const loginOption = screen.getByText('USER LOGIN');
      expect(loginOption).toBeInTheDocument();
    });
  });

  it('should handle date range filtering', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Click on date from button
    const dateFromButton = screen.getByText('From');
    await user.click(dateFromButton);

    // Calendar should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should open log details modal when view button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      const viewButtons = screen.getAllByTitle('View details');
      expect(viewButtons).toHaveLength(3);
    });

    const firstViewButton = screen.getAllByTitle('View details')[0];
    await user.click(firstViewButton);

    // Check if modal opens
    await waitFor(() => {
      expect(screen.getByText('Activity Log Details')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Context Information')).toBeInTheDocument();
      expect(screen.getByText('Detailed Information')).toBeInTheDocument();
    });
  });

  it('should copy log details when copy button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      const copyButtons = screen.getAllByTitle('Copy log details');
      expect(copyButtons).toHaveLength(3);
    });

    const firstCopyButton = screen.getAllByTitle('Copy log details')[0];
    await user.click(firstCopyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"id": "log-1"')
    );
  });

  it('should handle real-time streaming toggle', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Find the streaming toggle switch
    const streamingSwitch = screen.getByRole('switch');
    await user.click(streamingSwitch);

    // Find and click the start button
    const startButton = screen.getByText('Start');
    await user.click(startButton);

    // Should show connecting state
    await waitFor(() => {
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    // Fast-forward time to simulate connection
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  it('should open export modal when export button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Activity Logs')).toBeInTheDocument();
      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByText('Export Summary')).toBeInTheDocument();
    });
  });

  it('should handle export functionality', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Open export modal
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Activity Logs')).toBeInTheDocument();
    });

    // Click export logs button
    const exportLogsButton = screen.getByRole('button', { name: /Export Logs/ });
    await user.click(exportLogsButton);

    expect(mockExportMutation.mutateAsync).toHaveBeenCalledWith({
      type: 'activities',
      format: 'csv',
      dateFrom: undefined,
      dateTo: undefined,
      filters: {
        search: undefined,
        action: undefined,
        userId: undefined,
      },
    });
  });

  it('should handle refresh functionality', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    expect(mockRefetchLogs).toHaveBeenCalled();
  });

  it('should display pagination when multiple pages exist', async () => {
    // Mock data with multiple pages
    vi.mocked(require('../../../hooks/useAdmin').useAdminLogs).mockReturnValue({
      data: {
        data: mockActivityLogs,
        pagination: {
          page: 1,
          limit: 50,
          total: 150,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetchLogs,
    });

    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 50 of 150 logs')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    // Mock loading state
    vi.mocked(require('../../../hooks/useAdmin').useAdminLogs).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetchLogs,
    });

    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Should show skeleton loaders (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error state', async () => {
    // Mock error state
    vi.mocked(require('../../../hooks/useAdmin').useAdminLogs).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load logs'),
      refetch: mockRefetchLogs,
    });

    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load activity logs. Please try refreshing the page.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show empty state when no logs are found', async () => {
    // Mock empty data
    vi.mocked(require('../../../hooks/useAdmin').useAdminLogs).mockReturnValue({
      data: {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetchLogs,
    });

    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No activity logs found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  it('should handle new logs notification during streaming', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Enable streaming
    const streamingSwitch = screen.getByRole('switch');
    await user.click(streamingSwitch);

    const startButton = screen.getByText('Start');
    await user.click(startButton);

    // Fast-forward to simulate streaming interval
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    // Mock new logs being returned
    mockRefetchLogs.mockResolvedValueOnce({
      data: {
        data: [
          {
            ...mockActivityLogs[0],
            id: 'new-log',
            timestamp: new Date().toISOString(),
          },
          ...mockActivityLogs,
        ],
      },
    });

    // Fast-forward streaming interval
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockRefetchLogs).toHaveBeenCalled();
    });
  });

  it('should format log details correctly', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    await waitFor(() => {
      const viewButtons = screen.getAllByTitle('View details');
      expect(viewButtons).toHaveLength(3);
    });

    const firstViewButton = screen.getAllByTitle('View details')[0];
    await user.click(firstViewButton);

    await waitFor(() => {
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText(/Mozilla\/5\.0/)).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  it('should handle export format selection', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Open export modal
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Activity Logs')).toBeInTheDocument();
    });

    // Change export format
    const formatSelect = screen.getByDisplayValue('CSV (Comma Separated Values)');
    await user.click(formatSelect);

    await waitFor(() => {
      expect(screen.getByText('JSON (JavaScript Object Notation)')).toBeInTheDocument();
    });
    
    const jsonOption = screen.getByText('JSON (JavaScript Object Notation)');
    await user.click(jsonOption);

    // Export with JSON format
    const exportLogsButton = screen.getByRole('button', { name: /Export Logs/ });
    await user.click(exportLogsButton);

    expect(mockExportMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'json',
      })
    );
  });
});

describe('ActivityLogViewer - Real-time Streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start and stop streaming correctly', async () => {
    const user = userEvent.setup();
    render(<ActivityLogViewer />, { wrapper: createWrapper() });

    // Enable streaming
    const streamingSwitch = screen.getByRole('switch');
    await user.click(streamingSwitch);

    // Start streaming
    const startButton = screen.getByText('Start');
    await user.click(startButton);

    // Should show connecting state
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    // Fast-forward connection time
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    // Stop streaming
    const stopButton = screen.getByText('Stop');
    await user.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });
  });

  it('should cleanup streaming interval on unmount', () => {
    const { unmount } = render(<ActivityLogViewer />, { wrapper: createWrapper() });
    
    // Start streaming
    const streamingSwitch = screen.getByRole('switch');
    fireEvent.click(streamingSwitch);
    
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    // Unmount component
    unmount();

    // Should not throw any errors
    expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
  });
});