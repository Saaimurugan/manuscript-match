/**
 * ProcessSwitcher Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProcessSwitcher from '../ProcessSwitcher';
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
  useProcess: vi.fn(),
  useCreateProcess: vi.fn(),
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
    title: 'Active Process 1',
    status: ProcessStatus.IN_PROGRESS,
    currentStep: ProcessStep.METADATA,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    metadata: {
      userId: 'user-1',
      manuscriptTitle: 'Test Manuscript',
    },
    stepData: {},
  },
  {
    id: 'process-2',
    jobId: 'job-2',
    title: 'Completed Process 1',
    status: ProcessStatus.COMPLETED,
    currentStep: ProcessStep.EXPORT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-03'),
    metadata: {
      userId: 'user-1',
      manuscriptTitle: 'Another Manuscript',
    },
    stepData: {},
  },
  {
    id: 'process-3',
    jobId: 'job-3',
    title: 'Failed Process 1',
    status: ProcessStatus.FAILED,
    currentStep: ProcessStep.SEARCH,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-04'),
    metadata: {
      userId: 'user-1',
      manuscriptTitle: 'Failed Manuscript',
    },
    stepData: {},
  },
];

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

describe('ProcessSwitcher', () => {
  const mockOnProcessChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { useProcessList, useProcess, useCreateProcess } = 
      require('../../../hooks/useProcessManagement');
    
    useProcessList.mockReturnValue({
      data: mockProcesses,
      isLoading: false,
    });
    
    useProcess.mockReturnValue({
      data: mockProcesses[0],
    });
    
    useCreateProcess.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockProcesses[0]),
      isPending: false,
    });
  });

  it('renders with current process selected', () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    expect(screen.getByText('Active Process 1')).toBeInTheDocument();
  });

  it('renders with no process selected', () => {
    const { useProcess } = require('../../../hooks/useProcessManagement');
    useProcess.mockReturnValue({ data: null });

    renderWithProviders(
      <ProcessSwitcher onProcessChange={mockOnProcessChange} />
    );
    
    expect(screen.getByText('Select process...')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Process')).toBeInTheDocument();
      expect(screen.getByText('Active Processes')).toBeInTheDocument();
      expect(screen.getByText('Completed Processes')).toBeInTheDocument();
    });
  });

  it('groups processes correctly', async () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      // Active processes section
      expect(screen.getByText('Active Processes')).toBeInTheDocument();
      expect(screen.getByText('Active Process 1')).toBeInTheDocument();
      
      // Completed processes section
      expect(screen.getByText('Completed Processes')).toBeInTheDocument();
      expect(screen.getByText('Completed Process 1')).toBeInTheDocument();
      
      // Other processes section (failed/cancelled)
      expect(screen.getByText('Other Processes')).toBeInTheDocument();
      expect(screen.getByText('Failed Process 1')).toBeInTheDocument();
    });
  });

  it('handles process selection', async () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      const processOption = screen.getByText('Completed Process 1');
      fireEvent.click(processOption);
    });
    
    expect(mockOnProcessChange).toHaveBeenCalledWith('process-2');
  });

  it('handles search functionality', async () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search processes...');
      fireEvent.change(searchInput, { target: { value: 'Active' } });
    });
    
    // Should filter processes based on search term
    expect(screen.getByText('Active Process 1')).toBeInTheDocument();
  });

  it('handles create new process', async () => {
    const mockCreateProcess = vi.fn().mockResolvedValue(mockProcesses[0]);
    const { useCreateProcess } = require('../../../hooks/useProcessManagement');
    useCreateProcess.mockReturnValue({
      mutateAsync: mockCreateProcess,
      isPending: false,
    });

    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      const createButton = screen.getByText('Create New Process');
      fireEvent.click(createButton);
    });
    
    expect(mockCreateProcess).toHaveBeenCalledWith({
      title: expect.stringContaining('New Analysis'),
      jobId: '',
      userId: 'user-1',
    });
  });

  it('shows current badge for selected process', async () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  it('shows back button when enabled', () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
        showBackButton={true}
      />
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays process metadata in dropdown', async () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Metadata')).toBeInTheDocument(); // Current step
      expect(screen.getByText('Export')).toBeInTheDocument(); // Current step for completed
    });
  });

  it('handles loading state', () => {
    const { useProcessList, useProcess } = require('../../../hooks/useProcessManagement');
    useProcessList.mockReturnValue({
      data: [],
      isLoading: true,
    });
    useProcess.mockReturnValue({
      data: null,
    });

    renderWithProviders(
      <ProcessSwitcher onProcessChange={mockOnProcessChange} />
    );
    
    // Should show skeleton loader
    const skeletons = document.querySelectorAll('[data-testid="skeleton"], .animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows current process info when available', () => {
    renderWithProviders(
      <ProcessSwitcher
        currentProcessId="process-1"
        onProcessChange={mockOnProcessChange}
      />
    );
    
    // Should show current step badge and metadata (on larger screens)
    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  it('handles empty process list', async () => {
    const { useProcessList } = require('../../../hooks/useProcessManagement');
    useProcessList.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderWithProviders(
      <ProcessSwitcher onProcessChange={mockOnProcessChange} />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText('No processes found')).toBeInTheDocument();
    });
  });

  it('limits completed processes display', async () => {
    const manyCompletedProcesses = Array.from({ length: 10 }, (_, i) => ({
      ...mockProcesses[1],
      id: `completed-${i}`,
      title: `Completed Process ${i + 1}`,
    }));

    const { useProcessList } = require('../../../hooks/useProcessManagement');
    useProcessList.mockReturnValue({
      data: manyCompletedProcesses,
      isLoading: false,
    });

    renderWithProviders(
      <ProcessSwitcher onProcessChange={mockOnProcessChange} />
    );
    
    const triggerButton = screen.getByRole('combobox');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText('View all completed processes...')).toBeInTheDocument();
    });
  });
});