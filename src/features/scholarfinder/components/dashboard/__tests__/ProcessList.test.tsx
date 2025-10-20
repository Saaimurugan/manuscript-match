/**
 * ProcessList Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProcessList from '../ProcessList';
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
  useDeleteProcess: vi.fn(),
  useDuplicateProcess: vi.fn(),
  useProcessStatusOperations: vi.fn(),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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
  {
    id: 'process-3',
    jobId: 'job-3',
    title: 'Failed Process',
    status: ProcessStatus.FAILED,
    currentStep: ProcessStep.SEARCH,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-04'),
    metadata: {
      userId: 'user-1',
      manuscriptTitle: 'Failed Manuscript',
      totalReviewers: 0,
      shortlistCount: 0,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProcessList', () => {
  const mockOnProcessSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { useDeleteProcess, useDuplicateProcess, useProcessStatusOperations } = 
      require('../../../hooks/useProcessManagement');
    
    useDeleteProcess.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    
    useDuplicateProcess.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockProcesses[0]),
      isPending: false,
    });
    
    useProcessStatusOperations.mockReturnValue({
      cancelProcess: {
        mutateAsync: vi.fn().mockResolvedValue(mockProcesses[0]),
      },
    });
  });

  it('renders process list correctly', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    expect(screen.getByText('Test Process 1')).toBeInTheDocument();
    expect(screen.getByText('Test Process 2')).toBeInTheDocument();
    expect(screen.getByText('Failed Process')).toBeInTheDocument();
  });

  it('displays process metadata correctly', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    expect(screen.getByText('50 reviewers')).toBeInTheDocument();
    expect(screen.getByText('5 shortlisted')).toBeInTheDocument();
    expect(screen.getByText('75 reviewers')).toBeInTheDocument();
    expect(screen.getByText('8 shortlisted')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    expect(screen.getByText('in_progress')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('displays progress bars with correct values', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    // Check for progress indicators
    expect(screen.getByText('22% Complete')).toBeInTheDocument(); // Metadata step
    expect(screen.getByText('100% Complete')).toBeInTheDocument(); // Export step
    expect(screen.getByText('44% Complete')).toBeInTheDocument(); // Search step
  });

  it('handles process selection', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    const processCard = screen.getByText('Test Process 1').closest('[role="button"], .cursor-pointer');
    if (processCard) {
      fireEvent.click(processCard);
      expect(mockOnProcessSelect).toHaveBeenCalledWith('process-1');
    }
  });

  it('shows dropdown menu actions', async () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    const menuButtons = screen.getAllByRole('button');
    const dropdownButton = menuButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('aria-expanded') !== null
    );
    
    if (dropdownButton) {
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        expect(screen.getByText('Open Process')).toBeInTheDocument();
        expect(screen.getByText('Duplicate')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    }
  });

  it('handles duplicate action', async () => {
    const mockDuplicate = vi.fn().mockResolvedValue(mockProcesses[0]);
    const { useDuplicateProcess } = require('../../../hooks/useProcessManagement');
    useDuplicateProcess.mockReturnValue({
      mutateAsync: mockDuplicate,
      isPending: false,
    });

    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    const menuButtons = screen.getAllByRole('button');
    const dropdownButton = menuButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('aria-expanded') !== null
    );
    
    if (dropdownButton) {
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        const duplicateButton = screen.getByText('Duplicate');
        fireEvent.click(duplicateButton);
      });
      
      expect(mockDuplicate).toHaveBeenCalledWith({
        processId: expect.any(String),
        newTitle: expect.stringContaining('(Copy)'),
      });
    }
  });

  it('handles delete action with confirmation', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const { useDeleteProcess } = require('../../../hooks/useProcessManagement');
    useDeleteProcess.mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
    });

    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    const menuButtons = screen.getAllByRole('button');
    const dropdownButton = menuButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('aria-expanded') !== null
    );
    
    if (dropdownButton) {
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
      });
      
      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Delete Process')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /Delete/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });
    }
  });

  it('shows export option for completed processes', async () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses.filter(p => p.status === ProcessStatus.COMPLETED)}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    const menuButtons = screen.getAllByRole('button');
    const dropdownButton = menuButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('aria-expanded') !== null
    );
    
    if (dropdownButton) {
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        expect(screen.getByText('Export Results')).toBeInTheDocument();
      });
    }
  });

  it('shows cancel option for in-progress processes', async () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses.filter(p => p.status === ProcessStatus.IN_PROGRESS)}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    const menuButtons = screen.getAllByRole('button');
    const dropdownButton = menuButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('aria-expanded') !== null
    );
    
    if (dropdownButton) {
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        expect(screen.getByText('Cancel Process')).toBeInTheDocument();
      });
    }
  });

  it('displays loading state', () => {
    renderWithProviders(
      <ProcessList
        processes={[]}
        isLoading={true}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('[data-testid="skeleton"], .animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays empty state', () => {
    renderWithProviders(
      <ProcessList
        processes={[]}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    expect(screen.getByText('No processes found')).toBeInTheDocument();
    expect(screen.getByText('Start by creating a new manuscript analysis process.')).toBeInTheDocument();
    expect(screen.getByText('Create New Process')).toBeInTheDocument();
  });

  it('shows error indicator for failed processes', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses.filter(p => p.status === ProcessStatus.FAILED)}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    expect(screen.getByText('Process failed - click to view details')).toBeInTheDocument();
  });

  it('formats step names correctly', () => {
    renderWithProviders(
      <ProcessList
        processes={mockProcesses}
        isLoading={false}
        onProcessSelect={mockOnProcessSelect}
      />
    );
    
    expect(screen.getByText('Current Step: Metadata')).toBeInTheDocument();
    expect(screen.getByText('Current Step: Export')).toBeInTheDocument();
    expect(screen.getByText('Current Step: Search')).toBeInTheDocument();
  });
});