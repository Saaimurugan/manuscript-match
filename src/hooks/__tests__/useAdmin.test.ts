/**
 * Tests for admin hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminStats, useAdminProcesses, useAdminPermissions, useUpdateUserRole } from '../useAdmin';
import { adminService } from '../../services/adminService';
import type { AdminStats } from '../../types/api';

// Mock the admin service
vi.mock('../../services/adminService', () => ({
  adminService: {
    getStats: vi.fn(),
    getProcesses: vi.fn(),
    checkAdminPermissions: vi.fn(),
    updateUserRole: vi.fn(),
  },
}));

// Mock the error handling hook
vi.mock('../useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

const mockAdminService = adminService as any;

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

describe('Admin Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAdminStats', () => {
    it('should fetch admin statistics', async () => {
      const mockStats: AdminStats = {
        totalUsers: 150,
        totalProcesses: 300,
        activeProcesses: 45,
        completedProcesses: 200,
        totalSearches: 500,
        totalReviewers: 1200,
      };

      mockAdminService.getStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useAdminStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockAdminService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching stats', async () => {
      const error = new Error('Failed to fetch stats');
      mockAdminService.getStats.mockRejectedValue(error);

      const { result } = renderHook(() => useAdminStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useAdminProcesses', () => {
    it('should fetch admin processes with default parameters', async () => {
      const mockProcesses = {
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
      };

      mockAdminService.getProcesses.mockResolvedValue(mockProcesses);

      const { result } = renderHook(() => useAdminProcesses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProcesses);
      expect(mockAdminService.getProcesses).toHaveBeenCalledWith(undefined);
    });

    it('should fetch processes with custom parameters', async () => {
      const params = {
        page: 2,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc' as const,
        status: 'COMPLETED',
      };

      mockAdminService.getProcesses.mockResolvedValue({ data: [], pagination: {} });

      const { result } = renderHook(() => useAdminProcesses(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAdminService.getProcesses).toHaveBeenCalledWith(params);
    });
  });

  describe('useAdminPermissions', () => {
    it('should return true for admin users', async () => {
      mockAdminService.checkAdminPermissions.mockResolvedValue(true);

      const { result } = renderHook(() => useAdminPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
      expect(mockAdminService.checkAdminPermissions).toHaveBeenCalledTimes(1);
    });

    it('should return false for non-admin users', async () => {
      mockAdminService.checkAdminPermissions.mockResolvedValue(false);

      const { result } = renderHook(() => useAdminPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(false);
    });

    it('should not retry on authentication errors', async () => {
      const error = { type: 'AUTHENTICATION_ERROR' };
      mockAdminService.checkAdminPermissions.mockRejectedValue(error);

      const { result } = renderHook(() => useAdminPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries)
      expect(mockAdminService.checkAdminPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe('useUpdateUserRole', () => {
    it('should update user role successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'ADMIN' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAdminService.updateUserRole.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUpdateUserRole(), {
        wrapper: createWrapper(),
      });

      const variables = { userId: 'user-123', role: 'ADMIN' as const };
      
      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAdminService.updateUserRole).toHaveBeenCalledWith('user-123', 'ADMIN');
      expect(result.current.data).toEqual(mockUser);
    });

    it('should handle errors when updating user role', async () => {
      const error = new Error('Failed to update role');
      mockAdminService.updateUserRole.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateUserRole(), {
        wrapper: createWrapper(),
      });

      const variables = { userId: 'user-123', role: 'ADMIN' as const };
      
      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });
});