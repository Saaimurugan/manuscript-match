/**
 * React hooks for admin dashboard functionality
 * Provides hooks for admin data fetching, user management, and system monitoring
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminExportRequest, type AdminUserDetails } from '../services/adminService';
import { useErrorHandling } from './useErrorHandling';
import type { 
  AdminStats,
  AdminProcess,
  ActivityLog,
  PaginatedResponse,
  UserProfile
} from '../types/api';

/**
 * Hook for fetching admin statistics
 */
export const useAdminStats = () => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching admin processes with pagination and filtering
 */
export const useAdminProcesses = (params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'processes', params],
    queryFn: () => adminService.getProcesses(params),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching specific admin process details
 */
export const useAdminProcess = (processId: string) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'process', processId],
    queryFn: () => adminService.getProcess(processId),
    enabled: !!processId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching admin activity logs
 */
export const useAdminLogs = (params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  processId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => adminService.getLogs(params),
    keepPreviousData: true,
    staleTime: 1 * 60 * 1000, // 1 minute
    onError: handleError,
  });
};

/**
 * Hook for fetching admin user details
 */
export const useAdminUserDetails = (userId: string) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminService.getUserDetails(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching all users (admin only)
 */
export const useAdminUsers = (params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: 'USER' | 'ADMIN';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminService.getUsers(params),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for checking admin permissions
 */
export const useAdminPermissions = () => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => adminService.checkAdminPermissions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry permission checks
    onError: (error) => {
      // Don't show error toast for permission checks
      if (error.type !== 'AUTHENTICATION_ERROR') {
        handleError(error);
      }
    },
  });
};

/**
 * Hook for fetching system performance metrics
 */
export const useAdminPerformanceMetrics = (params?: {
  timeRange?: '1h' | '24h' | '7d' | '30d';
  metrics?: string[];
}) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'performance', params],
    queryFn: () => adminService.getPerformanceMetrics(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching database statistics
 */
export const useAdminDatabaseStats = () => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'database', 'stats'],
    queryFn: () => adminService.getDatabaseStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching system health status
 */
export const useAdminSystemHealth = () => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: () => adminService.getSystemHealth(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching system alerts
 */
export const useAdminSystemAlerts = (params?: {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
  resolved?: boolean;
}) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'system', 'alerts', params],
    queryFn: () => adminService.getSystemAlerts(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for exporting admin data
 */
export const useAdminExport = () => {
  const { handleError, showSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (request: AdminExportRequest) => adminService.exportData(request),
    onSuccess: () => {
      showSuccess('Data export started successfully');
    },
    onError: handleError,
  });
};

/**
 * Hook for updating user role
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'USER' | 'ADMIN' }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: (data, variables) => {
      showSuccess(`User role updated to ${variables.role}`);
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.invalidateQueries(['admin', 'user', variables.userId]);
    },
    onError: handleError,
  });
};

/**
 * Hook for updating user status
 */
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) =>
      adminService.updateUserStatus(userId, status),
    onSuccess: (data, variables) => {
      showSuccess(`User ${variables.status === 'active' ? 'activated' : 'suspended'} successfully`);
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.invalidateQueries(['admin', 'user', variables.userId]);
    },
    onError: handleError,
  });
};

/**
 * Hook for deleting user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: (data, userId) => {
      showSuccess('User deleted successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.removeQueries(['admin', 'user', userId]);
    },
    onError: handleError,
  });
};

/**
 * Hook for deleting process (admin)
 */
export const useDeleteAdminProcess = () => {
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (processId: string) => adminService.deleteProcess(processId),
    onSuccess: (data, processId) => {
      showSuccess('Process deleted successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'processes']);
      queryClient.removeQueries(['admin', 'process', processId]);
      queryClient.invalidateQueries(['admin', 'stats']);
    },
    onError: handleError,
  });
};

/**
 * Hook for refreshing admin data
 */
export const useRefreshAdminData = () => {
  const queryClient = useQueryClient();

  return {
    refreshStats: () => queryClient.invalidateQueries(['admin', 'stats']),
    refreshProcesses: () => queryClient.invalidateQueries(['admin', 'processes']),
    refreshLogs: () => queryClient.invalidateQueries(['admin', 'logs']),
    refreshUsers: () => queryClient.invalidateQueries(['admin', 'users']),
    refreshAll: () => queryClient.invalidateQueries(['admin']),
  };
};