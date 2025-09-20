/**
 * Tests for AdminDashboard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '../AdminDashboard';

// Mock the hooks
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
  }),
}));

vi.mock('../../../hooks/useAdmin', () => ({
  useAdminStats: () => ({
    data: {
      totalUsers: 150,
      totalProcesses: 300,
      activeProcesses: 45,
      completedProcesses: 200,
      totalSearches: 500,
      totalReviewers: 1200,
    },
    isLoading: false,
    error: null,
  }),
  useAdminProcesses: () => ({
    data: {
      data: [
        {
          id: 'process-1',
          title: 'Test Process',
          description: 'Test Description',
          currentStep: 3,
          status: 'IN_PROGRESS',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          userId: 'user-1',
          userEmail: 'user@example.com',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
  }),
  useAdminUsers: () => ({
    data: {
      data: [
        {
          id: 'user-1',
          email: 'user@example.com',
          role: 'USER',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          processCount: 3,
          activityCount: 15,
          lastLoginAt: '2024-01-15T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
  }),
  useAdminLogs: () => ({
    data: {
      data: [
        {
          id: 'log-1',
          userId: 'user-1',
          processId: 'process-1',
          action: 'FILE_UPLOAD',
          details: { fileName: 'test.pdf' },
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
  }),
  useAdminPermissions: () => ({
    data: true,
    isLoading: false,
  }),
  useAdminSystemHealth: () => ({
    data: {
      status: 'healthy',
      services: {
        database: 'up',
        externalApis: 'up',
        fileStorage: 'up',
      },
      uptime: 86400,
      version: '1.0.0',
    },
    isLoading: false,
  }),
  useAdminSystemAlerts: () => ({
    data: [
      {
        id: 'alert-1',
        severity: 'medium',
        message: 'System maintenance scheduled',
        timestamp: '2024-01-01T00:00:00Z',
        resolved: false,
      },
    ],
    isLoading: false,
  }),
  useRefreshAdminData: () => ({
    refreshAll: vi.fn(),
  }),
  useAdminExport: () => ({
    mutate: vi.fn(),
    isLoading: false,
  }),
}));

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

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render admin dashboard with statistics', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Check if main title is rendered
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor user activities and system usage')).toBeInTheDocument();

    // Check if statistics are displayed
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
      expect(screen.getByText('300')).toBeInTheDocument(); // Total Processes
      expect(screen.getByText('45')).toBeInTheDocument(); // Active Processes
      expect(screen.getByText('500')).toBeInTheDocument(); // Total Searches
    });
  });

  it('should render system health information', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('HEALTHY')).toBeInTheDocument();
      expect(screen.getByText('UP')).toBeInTheDocument(); // Database status
    });
  });

  it('should render system alerts', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('System Alerts')).toBeInTheDocument();
      expect(screen.getByText('System maintenance scheduled')).toBeInTheDocument();
    });
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Initially on overview tab
    expect(screen.getByText('Total Users')).toBeInTheDocument();

    // Click on processes tab
    await user.click(screen.getByText('Processes'));
    await waitFor(() => {
      expect(screen.getByText('All Processes')).toBeInTheDocument();
      expect(screen.getByText('Test Process')).toBeInTheDocument();
    });

    // Click on users tab
    await user.click(screen.getByText('Users'));
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Click on activities tab
    await user.click(screen.getByText('Activity Logs'));
    await waitFor(() => {
      expect(screen.getByText('System-wide user activity monitoring')).toBeInTheDocument();
      expect(screen.getByText('FILE_UPLOAD')).toBeInTheDocument();
    });

    // Click on system tab
    await user.click(screen.getByText('System'));
    await waitFor(() => {
      expect(screen.getByText('System Information')).toBeInTheDocument();
      expect(screen.getByText('Version:')).toBeInTheDocument();
    });
  });

  it('should show export buttons', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Switch to processes tab to see export button
    const user = userEvent.setup();
    await user.click(screen.getByText('Processes'));

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  it('should handle refresh action', async () => {
    const mockRefreshAll = vi.fn();
    
    // Mock the refresh function
    vi.mocked(require('../../../hooks/useAdmin').useRefreshAdminData).mockReturnValue({
      refreshAll: mockRefreshAll,
    });

    const user = userEvent.setup();
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Find and click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefreshAll).toHaveBeenCalledTimes(1);
  });
});

describe('AdminDashboard - Permission Checks', () => {
  it('should show loading state while checking permissions', () => {
    // Mock loading state
    vi.mocked(require('../../../hooks/useAdmin').useAdminPermissions).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<AdminDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Checking admin permissions...')).toBeInTheDocument();
  });

  it('should show access denied for non-admin users', () => {
    // Mock no admin permissions
    vi.mocked(require('../../../hooks/useAdmin').useAdminPermissions).mockReturnValue({
      data: false,
      isLoading: false,
    });

    render(<AdminDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You don't have admin permissions/)).toBeInTheDocument();
  });

  it('should show error state when stats fail to load', () => {
    // Mock stats error
    vi.mocked(require('../../../hooks/useAdmin').useAdminStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load stats'),
    });

    render(<AdminDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load admin data. Please try refreshing the page.')).toBeInTheDocument();
  });
});