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
  UserProfile,
  ProcessTemplate
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

  return useQuery<PaginatedResponse<AdminUserDetails>, Error>({
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
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (request: AdminExportRequest) => adminService.exportData(request),
    onSuccess: () => {
      handleSuccess('Data export started successfully');
    },
    onError: handleError,
  });
};

/**
 * Hook for updating user role
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'USER' | 'ADMIN' }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: (data, variables) => {
      handleSuccess(`User role updated to ${variables.role}`);
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
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) =>
      adminService.updateUserStatus(userId, status),
    onSuccess: (data, variables) => {
      handleSuccess(`User ${variables.status === 'active' ? 'activated' : 'suspended'} successfully`);
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
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: (data, userId) => {
      handleSuccess('User deleted successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.removeQueries(['admin', 'user', userId]);
    },
    onError: handleError,
  });
};

/**
 * Hook for inviting user
 */
export const useInviteUser = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'USER' | 'ADMIN' }) => 
      adminService.inviteUser(email, role),
    onSuccess: (data, variables) => {
      handleSuccess(`Invitation sent to ${variables.email}`);
      // Invalidate users query to refresh the list
      queryClient.invalidateQueries(['admin', 'users']);
    },
    // Error handling is done in the component
  });
};

/**
 * Hook for deleting process (admin)
 */
export const useDeleteAdminProcess = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (processId: string) => adminService.deleteProcess(processId),
    onSuccess: (data, processId) => {
      handleSuccess('Process deleted successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'processes']);
      queryClient.removeQueries(['admin', 'process', processId]);
      queryClient.invalidateQueries(['admin', 'stats']);
    },
    onError: handleError,
  });
};

/**
 * Hook for creating process as admin
 */
export const useCreateAdminProcess = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      templateId?: string;
      userId?: string;
    }) => adminService.createProcess(data),
    onSuccess: () => {
      handleSuccess('Process created successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'processes']);
      queryClient.invalidateQueries(['admin', 'stats']);
    },
    onError: handleError,
  });
};

/**
 * Hook for updating process as admin
 */
export const useUpdateAdminProcess = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ processId, data }: {
      processId: string;
      data: {
        title?: string;
        description?: string;
        currentStep?: string;
        status?: string;
      };
    }) => adminService.updateProcess(processId, data),
    onSuccess: (data, variables) => {
      handleSuccess('Process updated successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'processes']);
      queryClient.invalidateQueries(['admin', 'process', variables.processId]);
    },
    onError: handleError,
  });
};

/**
 * Hook for resetting process stage
 */
export const useResetProcessStage = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ processId, data }: {
      processId: string;
      data: {
        targetStep: string;
        reason?: string;
      };
    }) => adminService.resetProcessStage(processId, data),
    onSuccess: (data, variables) => {
      handleSuccess('Process stage reset successfully');
      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'processes']);
      queryClient.invalidateQueries(['admin', 'process', variables.processId]);
    },
    onError: handleError,
  });
};

/**
 * Hook for fetching process templates
 */
export const useProcessTemplates = () => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'process-templates'],
    queryFn: () => adminService.getProcessTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes
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

/**
 * Hook for fetching all available permissions
 */
export const useAdminAllPermissions = () => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => adminService.getPermissions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: handleError,
  });
};

/**
 * Hook for fetching role permissions
 */
export const useAdminRolePermissions = (role: string) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'role-permissions', role],
    queryFn: () => adminService.getRolePermissions(role),
    enabled: !!role,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for updating role permissions
 */
export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      adminService.updateRolePermissions(role, permissions),
    onSuccess: (data, variables) => {
      handleSuccess(`${variables.role} role permissions updated successfully`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: handleError,
  });
};

/**
 * Hook for fetching user custom permissions
 */
export const useAdminUserPermissions = (userId: string) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'user-permissions', userId],
    queryFn: () => adminService.getUserPermissions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for assigning custom permission to user
 */
export const useAssignUserPermission = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ userId, permission }: { userId: string; permission: string }) =>
      adminService.assignUserPermission(userId, permission),
    onSuccess: (data, variables) => {
      handleSuccess(`Permission ${variables.permission} assigned successfully`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.userId] });
    },
    onError: handleError,
  });
};

/**
 * Hook for revoking custom permission from user
 */
export const useRevokeUserPermission = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: ({ userId, permission }: { userId: string; permission: string }) =>
      adminService.revokeUserPermission(userId, permission),
    onSuccess: (data, variables) => {
      handleSuccess(`Permission ${variables.permission} revoked successfully`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.userId] });
    },
    onError: handleError,
  });
};

/**
 * Hook for fetching user effective permissions
 */
export const useAdminUserEffectivePermissions = (userId: string) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['admin', 'user-effective-permissions', userId],
    queryFn: () => adminService.getUserEffectivePermissions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleError,
  });
};

/**
 * Hook for bulk permission operations
 */
export const useBulkPermissionOperations = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();

  return useMutation({
    mutationFn: async ({ 
      operation, 
      userIds, 
      permissions 
    }: { 
      operation: 'assign' | 'revoke'; 
      userIds: string[]; 
      permissions: string[] 
    }) => {
      const promises = userIds.flatMap(userId =>
        permissions.map(permission =>
          operation === 'assign'
            ? adminService.assignUserPermission(userId, permission)
            : adminService.revokeUserPermission(userId, permission)
        )
      );
      
      await Promise.all(promises);
      return { operation, userIds, permissions };
    },
    onSuccess: (data) => {
      const { operation, userIds, permissions } = data;
      handleSuccess(
        `${operation === 'assign' ? 'Assigned' : 'Revoked'} ${permissions.length} permission(s) for ${userIds.length} user(s)`
      );
      
      // Invalidate related queries
      userIds.forEach(userId => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions', userId] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: handleError,
  });
};

/**
 * Hook for refreshing all admin permission data
 */
export const useRefreshAdminPermissionData = () => {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-effective-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    refreshPermissions: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
    },
    refreshRolePermissions: (role?: string) => {
      if (role) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'role-permissions', role] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin', 'role-permissions'] });
      }
    },
    refreshUserPermissions: (userId?: string) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions', userId] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'user-effective-permissions', userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'user-effective-permissions'] });
      }
    },
  };
};
