/**
 * Basic tests for ActivityLogViewer component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityLogViewer } from '../ActivityLogViewer';

// Mock the hooks
vi.mock('../../../hooks/useAdmin', () => ({
  useAdminLogs: () => ({
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
    refetch: vi.fn(),
  }),
  useAdminExport: () => ({
    mutateAsync: vi.fn(),
    isLoading: false,
    error: null,
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

describe('ActivityLogViewer - Basic Tests', () => {
  it('should render without crashing', () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Activity Log Viewer')).toBeInTheDocument();
  });

  it('should show empty state when no logs', () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No activity logs found')).toBeInTheDocument();
  });

  it('should have export and refresh buttons', () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should have streaming controls', () => {
    render(<ActivityLogViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Live Updates')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });
});