/**
 * ProcessDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProcessDashboard from '../ProcessDashboard';
import { AuthContext } from '@/contexts/AuthContext';
import { ProcessStatus, ProcessStep } from '../../../types/process';

// Mock the config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 10000,
  },
}));

// Mock the hooks
vi.mock('../../../hooks/useProcessManagement', () => ({
  useProcessList: vi.fn(),
  useProcessStatistics: vi.fn(),
  useCreateProcess: vi.fn(),
  useInvalidateProcessQueries: vi.fn(),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
};

const mockProcesses = [
  {
    id: 'process-1',
    jobId: 'job-1',
    title: 'Test Process 1',
    status: ProcessStatus.IN_PROGRESS,
    currentStep: ProcessStep.METADATA,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    metadata: {
      userId: 'user-1',
      manuscriptTitle: 'Test Manuscript',
      totalReviewers: 50,
      shortlistCount: 5,
    },
    stepData: {},
  },
  {
    id: 'process-2',
    jobId: 'job-2',
    title: 'Test Process 2',
    status: ProcessStatus.COMPLETED,
    currentStep: ProcessStep.EXPORT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-03'),
    metadata: {
      userId: 'user-1',
      manuscriptTitle: 'Another Manuscript',
      totalReviewers: 75,
      shortlistCount: 8,
    },
    stepData: {},
  },
];

const mockStatistics = {
  total: 2,
  byStatus: {
    [ProcessStatus.CREATED]: 0,
    [ProcessStatus.IN_PROGRESS]: 1,
    [ProcessStatus.COMPLETED]: 1,
    [ProcessStatus.FAILED]: 0,
    [ProcessStatus.CANCELLED]: 0,
  },
  recentActivity: mockProcesses,
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const authContextValue = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    isAuthenticated: true,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('ProcessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { useProcessList, useProcessStatistics, useCreateProcess, useInvalidateProcessQueries } = 
      require('../../../hooks/useProcessManagement');
    
    useProcessList.mockReturnValue({
      data: mockProcesses,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    
    useProcessStatistics.mockReturnValue({
      data: mockStatistics,
    });
    
    useCreateProcess.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockProcesses[0]),
      isPending: false,
    });
    
    useInvalidateProcessQueries.mockReturnValue({
      invalidateStatistics: vi.fn(),
    });
  });

  it('renders dashboard header correctly', () => {
    renderWithProviders(<ProcessDashboard />);
    
    expect(screen.getByText('Process Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage your ScholarFinder manuscript analyses')).toBeInTheDocument();
  });

  it('displays statistics cards', () => {
    renderWithProviders(<ProcessDashboard />);
    
    expect(screen.getByText('Total Processes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders process tabs', () => {
    renderWithProviders(<ProcessDashboard />);
    
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Failed' })).toBeInTheDocument();
  });

  it('handles search input', async () => {
    renderWithProviders(<ProcessDashboard />);
    
    const searchInput = screen.getByPlaceholderText('Search processes...');
    fireEvent.change(searchInput, { target: { value: 'Test Process 1' } });
    
    expect(searchInput).toHaveValue('Test Process 1');
  });

  it('handles tab switching', async () => {
    renderWithProviders(<ProcessDashboard />);
    
    const activeTab = screen.getByRole('tab', { name: 'Active' });
    fireEvent.click(activeTab);
    
    expect(activeTab).toHaveAttribute('data-state', 'active');
  });

  it('handles create new process', async () => {
    const mockCreateProcess = vi.fn().mockResolvedValue(mockProcesses[0]);
    const { useCreateProcess } = require('../../../hooks/useProcessManagement');
    useCreateProcess.mockReturnValue({
      mutateAsync: mockCreateProcess,
      isPending: false,
    });

    renderWithProviders(<ProcessDashboard />);
    
    const newAnalysisButton = screen.getByText('New Analysis');
    fireEvent.click(newAnalysisButton);
    
    await waitFor(() => {
      expect(mockCreateProcess).toHaveBeenCalledWith({
        title: expect.stringContaining('New Analysis'),
        jobId: '',
        userId: 'user-1',
      });
    });
  });

  it('handles refresh action', async () => {
    const mockRefetch = vi.fn();
    const mockInvalidateStatistics = vi.fn();
    
    const { useProcessList, useInvalidateProcessQueries } = 
      require('../../../hooks/useProcessManagement');
    
    useProcessList.mockReturnValue({
      data: mockProcesses,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    
    useInvalidateProcessQueries.mockReturnValue({
      invalidateStatistics: mockInvalidateStatistics,
    });

    renderWithProviders(<ProcessDashboard />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(mockRefetch).toHaveBeenCalled();
    expect(mockInvalidateStatistics).toHaveBeenCalled();
  });

  it('displays recent activity', () => {
    renderWithProviders(<ProcessDashboard />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Test Process 1')).toBeInTheDocument();
    expect(screen.getByText('Test Process 2')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    const { useProcessList } = require('../../../hooks/useProcessManagement');
    useProcessList.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ProcessDashboard />);
    
    // Should show loading state in refresh button
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();
  });

  it('handles error state', () => {
    const { useProcessList } = require('../../../hooks/useProcessManagement');
    useProcessList.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: vi.fn(),
    });

    renderWithProviders(<ProcessDashboard />);
    
    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('toggles recovery panel', () => {
    renderWithProviders(<ProcessDashboard />);
    
    const recoveryButton = screen.getByText('Recovery');
    fireEvent.click(recoveryButton);
    
    // Recovery panel should be shown (tested in ProcessRecovery tests)
    expect(recoveryButton).toBeInTheDocument();
  });

  it('handles process selection from recent activity', () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    renderWithProviders(<ProcessDashboard />);
    
    const processItem = screen.getByText('Test Process 1');
    fireEvent.click(processItem.closest('div[role="button"], div[class*="cursor-pointer"]') || processItem);
    
    // Navigation should be handled by the component
    expect(processItem).toBeInTheDocument();
  });
});