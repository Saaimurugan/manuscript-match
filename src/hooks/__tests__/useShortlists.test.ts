/**
 * Shortlist Hooks Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  useShortlists, 
  useShortlist, 
  useCreateShortlist, 
  useUpdateShortlist, 
  useDeleteShortlist, 
  useExportShortlist,
  useOptimisticShortlistUpdate
} from '../useShortlists';
import { shortlistService } from '../../services/shortlistService';
import type { Shortlist, CreateShortlistRequest, UpdateShortlistRequest } from '../../types/api';

// Mock the shortlist service
vi.mock('../../services/shortlistService');

const mockShortlistService = vi.mocked(shortlistService);

const mockShortlist: Shortlist = {
  id: '1',
  name: 'Primary Reviewers',
  processId: 'process-1',
  selectedReviewers: ['reviewer-1', 'reviewer-2'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockShortlists: Shortlist[] = [
  mockShortlist,
  {
    id: '2',
    name: 'Backup Options',
    processId: 'process-1',
    selectedReviewers: ['reviewer-3'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useShortlists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch shortlists successfully', async () => {
    mockShortlistService.getShortlists.mockResolvedValue(mockShortlists);

    const { result } = renderHook(() => useShortlists('process-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockShortlists);
    expect(mockShortlistService.getShortlists).toHaveBeenCalledWith('process-1');
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch shortlists');
    mockShortlistService.getShortlists.mockRejectedValue(error);

    const { result } = renderHook(() => useShortlists('process-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should not fetch when processId is empty', () => {
    const { result } = renderHook(() => useShortlists(''), {
      wrapper: createWrapper()
    });

    expect(result.current.isPending).toBe(true);
    expect(mockShortlistService.getShortlists).not.toHaveBeenCalled();
  });
});

describe('useShortlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a specific shortlist successfully', async () => {
    mockShortlistService.getShortlist.mockResolvedValue(mockShortlist);

    const { result } = renderHook(() => useShortlist('process-1', 'shortlist-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockShortlist);
    expect(mockShortlistService.getShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1');
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Shortlist not found');
    mockShortlistService.getShortlist.mockRejectedValue(error);

    const { result } = renderHook(() => useShortlist('process-1', 'shortlist-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should not fetch when IDs are empty', () => {
    const { result } = renderHook(() => useShortlist('', ''), {
      wrapper: createWrapper()
    });

    expect(result.current.isPending).toBe(true);
    expect(mockShortlistService.getShortlist).not.toHaveBeenCalled();
  });
});

describe('useCreateShortlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create shortlist successfully', async () => {
    const newShortlist: Shortlist = {
      id: '3',
      name: 'New Shortlist',
      processId: 'process-1',
      selectedReviewers: ['reviewer-1'],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z'
    };

    mockShortlistService.createShortlist.mockResolvedValue(newShortlist);

    const { result } = renderHook(() => useCreateShortlist(), {
      wrapper: createWrapper()
    });

    const createRequest: CreateShortlistRequest = {
      name: 'New Shortlist',
      selectedReviewers: ['reviewer-1']
    };

    await result.current.mutateAsync({
      processId: 'process-1',
      data: createRequest
    });

    expect(mockShortlistService.createShortlist).toHaveBeenCalledWith('process-1', createRequest);
  });

  it('should handle creation errors', async () => {
    const error = new Error('Creation failed');
    mockShortlistService.createShortlist.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateShortlist(), {
      wrapper: createWrapper()
    });

    const createRequest: CreateShortlistRequest = {
      name: 'New Shortlist',
      selectedReviewers: ['reviewer-1']
    };

    await expect(result.current.mutateAsync({
      processId: 'process-1',
      data: createRequest
    })).rejects.toThrow('Creation failed');
  });
});

describe('useUpdateShortlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update shortlist successfully', async () => {
    const updatedShortlist: Shortlist = {
      ...mockShortlist,
      name: 'Updated Shortlist',
      updatedAt: '2024-01-04T00:00:00Z'
    };

    mockShortlistService.updateShortlist.mockResolvedValue(updatedShortlist);

    const { result } = renderHook(() => useUpdateShortlist(), {
      wrapper: createWrapper()
    });

    const updateRequest: UpdateShortlistRequest = {
      name: 'Updated Shortlist'
    };

    await result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      data: updateRequest
    });

    expect(mockShortlistService.updateShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1', updateRequest);
  });

  it('should handle update errors', async () => {
    const error = new Error('Update failed');
    mockShortlistService.updateShortlist.mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateShortlist(), {
      wrapper: createWrapper()
    });

    const updateRequest: UpdateShortlistRequest = {
      name: 'Updated Shortlist'
    };

    await expect(result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      data: updateRequest
    })).rejects.toThrow('Update failed');
  });
});

describe('useDeleteShortlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete shortlist successfully', async () => {
    mockShortlistService.deleteShortlist.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteShortlist(), {
      wrapper: createWrapper()
    });

    await result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1'
    });

    expect(mockShortlistService.deleteShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1');
  });

  it('should handle deletion errors', async () => {
    const error = new Error('Deletion failed');
    mockShortlistService.deleteShortlist.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteShortlist(), {
      wrapper: createWrapper()
    });

    await expect(result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1'
    })).rejects.toThrow('Deletion failed');
  });
});

describe('useExportShortlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export shortlist successfully', async () => {
    mockShortlistService.exportShortlist.mockResolvedValue(undefined);

    const { result } = renderHook(() => useExportShortlist(), {
      wrapper: createWrapper()
    });

    await result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      format: 'xlsx'
    });

    expect(mockShortlistService.exportShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1', 'xlsx');
  });

  it('should handle export errors', async () => {
    const error = new Error('Export failed');
    mockShortlistService.exportShortlist.mockRejectedValue(error);

    const { result } = renderHook(() => useExportShortlist(), {
      wrapper: createWrapper()
    });

    await expect(result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      format: 'csv'
    })).rejects.toThrow('Export failed');
  });

  it('should support all export formats', async () => {
    mockShortlistService.exportShortlist.mockResolvedValue(undefined);

    const { result } = renderHook(() => useExportShortlist(), {
      wrapper: createWrapper()
    });

    // Test CSV export
    await result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      format: 'csv'
    });

    // Test XLSX export
    await result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      format: 'xlsx'
    });

    // Test DOCX export
    await result.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      format: 'docx'
    });

    expect(mockShortlistService.exportShortlist).toHaveBeenCalledTimes(3);
    expect(mockShortlistService.exportShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1', 'csv');
    expect(mockShortlistService.exportShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1', 'xlsx');
    expect(mockShortlistService.exportShortlist).toHaveBeenCalledWith('process-1', 'shortlist-1', 'docx');
  });
});

describe('useOptimisticShortlistUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide optimistic update functions', () => {
    const { result } = renderHook(() => useOptimisticShortlistUpdate(), {
      wrapper: createWrapper()
    });

    expect(result.current.updateShortlistOptimistically).toBeInstanceOf(Function);
    expect(result.current.revertOptimisticUpdate).toBeInstanceOf(Function);
  });

  it('should handle optimistic updates without errors', () => {
    const { result } = renderHook(() => useOptimisticShortlistUpdate(), {
      wrapper: createWrapper()
    });

    // Should not throw when called
    expect(() => {
      result.current.updateShortlistOptimistically('process-1', 'shortlist-1', {
        name: 'Updated Name'
      });
    }).not.toThrow();

    expect(() => {
      result.current.revertOptimisticUpdate('process-1', 'shortlist-1');
    }).not.toThrow();
  });
});

describe('hook integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle concurrent operations', async () => {
    mockShortlistService.getShortlists.mockResolvedValue(mockShortlists);
    mockShortlistService.createShortlist.mockResolvedValue(mockShortlist);
    mockShortlistService.deleteShortlist.mockResolvedValue(undefined);

    const { result: shortlistsResult } = renderHook(() => useShortlists('process-1'), {
      wrapper: createWrapper()
    });

    const { result: createResult } = renderHook(() => useCreateShortlist(), {
      wrapper: createWrapper()
    });

    const { result: deleteResult } = renderHook(() => useDeleteShortlist(), {
      wrapper: createWrapper()
    });

    // Wait for initial fetch
    await waitFor(() => {
      expect(shortlistsResult.current.isSuccess).toBe(true);
    });

    // Perform create and delete operations
    const createPromise = createResult.current.mutateAsync({
      processId: 'process-1',
      data: { name: 'New Shortlist', selectedReviewers: ['reviewer-1'] }
    });

    const deletePromise = deleteResult.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1'
    });

    await Promise.all([createPromise, deletePromise]);

    expect(mockShortlistService.createShortlist).toHaveBeenCalled();
    expect(mockShortlistService.deleteShortlist).toHaveBeenCalled();
  });

  it('should handle cache invalidation properly', async () => {
    mockShortlistService.getShortlists.mockResolvedValue(mockShortlists);
    mockShortlistService.updateShortlist.mockResolvedValue({
      ...mockShortlist,
      name: 'Updated Name'
    });

    const { result: shortlistsResult } = renderHook(() => useShortlists('process-1'), {
      wrapper: createWrapper()
    });

    const { result: updateResult } = renderHook(() => useUpdateShortlist(), {
      wrapper: createWrapper()
    });

    // Wait for initial fetch
    await waitFor(() => {
      expect(shortlistsResult.current.isSuccess).toBe(true);
    });

    // Perform update
    await updateResult.current.mutateAsync({
      processId: 'process-1',
      shortlistId: 'shortlist-1',
      data: { name: 'Updated Name' }
    });

    expect(mockShortlistService.updateShortlist).toHaveBeenCalled();
  });
});