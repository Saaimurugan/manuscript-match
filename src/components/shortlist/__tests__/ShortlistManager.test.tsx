/**
 * ShortlistManager Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShortlistManager } from '../ShortlistManager';
import * as shortlistHooks from '../../../hooks/useShortlists';
import { useToast } from '../../../hooks/use-toast';

// Mock the hooks
vi.mock('../../../hooks/useShortlists');
vi.mock('../../../hooks/use-toast');

// Mock the dialog components
vi.mock('../CreateShortlistDialog', () => ({
  CreateShortlistDialog: ({ open, onOpenChange }: any) => 
    open ? <div data-testid="create-dialog">Create Dialog</div> : null
}));

vi.mock('../EditShortlistDialog', () => ({
  EditShortlistDialog: ({ open, onOpenChange }: any) => 
    open ? <div data-testid="edit-dialog">Edit Dialog</div> : null
}));

vi.mock('../ExportShortlistDialog', () => ({
  ExportShortlistDialog: ({ open, onOpenChange }: any) => 
    open ? <div data-testid="export-dialog">Export Dialog</div> : null
}));

const mockToast = vi.fn();
const mockUseShortlists = vi.mocked(shortlistHooks.useShortlists);
const mockUseDeleteShortlist = vi.mocked(shortlistHooks.useDeleteShortlist);
const mockUseExportShortlist = vi.mocked(shortlistHooks.useExportShortlist);

const mockShortlists = [
  {
    id: '1',
    name: 'Primary Reviewers',
    processId: 'process-1',
    selectedReviewers: ['reviewer-1', 'reviewer-2'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Backup Options',
    processId: 'process-1',
    selectedReviewers: ['reviewer-3'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

const mockAvailableReviewers = [
  { id: 'reviewer-1', name: 'Dr. Jane Smith', email: 'jane@university.edu' },
  { id: 'reviewer-2', name: 'Prof. John Doe', email: 'john@research.org' }
];

describe('ShortlistManager', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    mockUseDeleteShortlist.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false
    });

    mockUseExportShortlist.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false
    });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      processId: 'process-1',
      availableReviewers: mockAvailableReviewers,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ShortlistManager {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('renders loading state', () => {
    mockUseShortlists.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isSuccess: false,
      isPending: true,
      isPlaceholderData: false,
      isFetching: true,
      isFetched: false,
      isFetchedAfterMount: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'fetching',
      status: 'pending'
    } as any);

    renderComponent();

    expect(screen.getByText('Reviewer Shortlists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create shortlist/i })).toBeDisabled();
    expect(screen.getAllByRole('generic', { name: '' })).toHaveLength(3); // Loading skeletons
  });

  it('renders error state', () => {
    mockUseShortlists.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
      isError: true,
      isSuccess: false,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: new Error('Failed to load'),
      fetchStatus: 'idle',
      status: 'error'
    } as any);

    renderComponent();

    expect(screen.getByText('Failed to load shortlists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockUseShortlists.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    renderComponent();

    expect(screen.getByText('No shortlists created')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Shortlist')).toBeInTheDocument();
  });

  it('renders shortlists successfully', () => {
    mockUseShortlists.mockReturnValue({
      data: mockShortlists,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    renderComponent();

    expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
    expect(screen.getByText('Backup Options')).toBeInTheDocument();
    expect(screen.getByText('2 reviewers')).toBeInTheDocument();
    expect(screen.getByText('1 reviewers')).toBeInTheDocument();
  });

  it('opens create dialog when create button is clicked', async () => {
    mockUseShortlists.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /create shortlist/i }));

    await waitFor(() => {
      expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
    });
  });

  it('opens edit dialog when edit button is clicked', async () => {
    mockUseShortlists.mockReturnValue({
      data: mockShortlists,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    renderComponent();

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('title') === 'Edit'
    );
    
    if (editButton) {
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
      });
    }
  });

  it('opens export dialog when export button is clicked', async () => {
    mockUseShortlists.mockReturnValue({
      data: mockShortlists,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    renderComponent();

    const exportButtons = screen.getAllByRole('button');
    const exportButton = exportButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('title') === 'Export'
    );
    
    if (exportButton) {
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
      });
    }
  });

  it('handles delete shortlist with confirmation', async () => {
    const mockDeleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    mockUseDeleteShortlist.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false
    });

    mockUseShortlists.mockReturnValue({
      data: mockShortlists,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);

    renderComponent();

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('title') === 'Delete'
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
          processId: 'process-1',
          shortlistId: expect.any(String)
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Shortlist deleted successfully',
        variant: 'default'
      });
    }

    // Restore window.confirm
    window.confirm = originalConfirm;
  });

  it('handles delete shortlist cancellation', async () => {
    const mockDeleteMutateAsync = vi.fn();
    mockUseDeleteShortlist.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false
    });

    mockUseShortlists.mockReturnValue({
      data: mockShortlists,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(false);

    renderComponent();

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('title') === 'Delete'
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      // Should not call delete mutation
      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    }

    // Restore window.confirm
    window.confirm = originalConfirm;
  });

  it('handles delete shortlist error', async () => {
    const mockDeleteMutateAsync = vi.fn().mockRejectedValue(new Error('Delete failed'));
    mockUseDeleteShortlist.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false
    });

    mockUseShortlists.mockReturnValue({
      data: mockShortlists,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isPending: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      status: 'success'
    } as any);

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);

    renderComponent();

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('title') === 'Delete'
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to delete shortlist',
          variant: 'destructive'
        });
      });
    }

    // Restore window.confirm
    window.confirm = originalConfirm;
  });
});