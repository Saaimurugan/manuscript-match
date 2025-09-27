/**
 * Tests for AdminDashboard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '../AdminDashboard';

// Mock the child components
vi.mock('../UserManagement', () => ({
  UserManagement: () => <div>User Management Component</div>,
}));

vi.mock('../PermissionManagement', () => ({
  PermissionManagement: () => <div>Permission Management Component</div>,
}));



vi.mock('../ActivityLogViewer', () => ({
  ActivityLogViewer: () => <div>Activity Log Viewer Component</div>,
}));

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
      totalLogs: 500,
      recentActivity: {
        last24Hours: 25,
        last7Days: 150,
        last30Days: 400
      },
      topUsers: []
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
    refreshStats: vi.fn(),
    refreshProcesses: vi.fn(),
    refreshLogs: vi.fn(),
    refreshUsers: vi.fn(),
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

  it('should render admin dashboard with sidebar navigation', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Check if main title is rendered
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('System Management')).toBeInTheDocument();

    // Check if navigation items are displayed
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Permissions')).toBeInTheDocument();

      expect(screen.getByText('Activity Logs')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });
  });

  it('should render overview statistics', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Check if statistics are displayed in overview
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
      expect(screen.getByText('500')).toBeInTheDocument(); // Total Logs
    });
  });

  it('should render system health information', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('System healthy')).toBeInTheDocument();
    });
  });

  it('should render system alerts when present', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('MEDIUM: System maintenance scheduled')).toBeInTheDocument();
    });
  });

  it('should switch between navigation tabs', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard permissions={['user.manage', 'permission.manage', 'activity.view', 'system.monitor']} />, { wrapper: createWrapper() });

    // Initially on overview tab
    expect(screen.getByText('Total Users')).toBeInTheDocument();

    // Click on user management
    await user.click(screen.getByText('User Management'));
    await waitFor(() => {
      expect(screen.getByText('User Management Component')).toBeInTheDocument();
    });

    // Click on permissions
    await user.click(screen.getByText('Permissions'));
    await waitFor(() => {
      expect(screen.getByText('Permission Management Component')).toBeInTheDocument();
    });



    // Click on activity logs
    await user.click(screen.getByText('Activity Logs'));
    await waitFor(() => {
      expect(screen.getByText('Activity Log Viewer Component')).toBeInTheDocument();
    });

    // Click on system health
    await user.click(screen.getByText('System Health'));
    await waitFor(() => {
      expect(screen.getByText('System Information')).toBeInTheDocument();
      expect(screen.getByText('Version:')).toBeInTheDocument();
    });
  });

  it('should show user information in sidebar', async () => {
    render(<AdminDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });
  });

  it('should handle refresh action', async () => {
    const mockRefreshAll = vi.fn();
    
    // Mock the refresh function
    vi.mocked(require('../../../hooks/useAdmin').useRefreshAdminData).mockReturnValue({
      refreshAll: mockRefreshAll,
      refreshStats: vi.fn(),
      refreshProcesses: vi.fn(),
      refreshLogs: vi.fn(),
      refreshUsers: vi.fn(),
    });

    const user = userEvent.setup();
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Find and click refresh button
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    expect(mockRefreshAll).toHaveBeenCalledTimes(1);
  });

  it('should support sidebar collapse functionality', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />, { wrapper: createWrapper() });

    // Find the settings button (collapse button)
    const settingsButtons = screen.getAllByRole('button');
    const collapseButton = settingsButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('h-4 w-4')
    );
    
    if (collapseButton) {
      await user.click(collapseButton);
      // After collapse, the "System Management" text should not be visible
      expect(screen.queryByText('System Management')).not.toBeInTheDocument();
    }
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

    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Failed to load admin data. Please try refreshing the page.')).toBeInTheDocument();
  });
});