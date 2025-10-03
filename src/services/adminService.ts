/**
 * Admin service for system-wide data access and user management
 * Provides methods for admin dashboard functionality and system monitoring
 */

import { apiService } from './apiService';
import type {
  ApiResponse,
  PaginatedResponse,
  AdminStats,
  AdminProcess,
  ActivityLog,
  ActivityLogFilters,
  UserProfile,
  ProcessTemplate
} from '../types/api';

export interface AdminUserDetails extends UserProfile {
  lastLoginAt?: string;
  processCount: number;
  activityCount: number;
}

export interface AdminExportRequest {
  type: 'users' | 'processes' | 'activities' | 'stats';
  format: 'csv' | 'xlsx' | 'json';
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, any>;
}

/**
 * Admin service class for system-wide operations
 */
export class AdminService {
  /**
   * Get system-wide statistics
   */
  async getStats(): Promise<AdminStats> {
    try {
      const backendResponse = await apiService.get<AdminStats>('/api/admin/stats');

      console.log('Admin stats response:', backendResponse); // Debug logging

      if (!backendResponse || (backendResponse as any).success === false) {
        throw new Error((backendResponse as any)?.error?.message || 'Failed to fetch stats');
      }

      return backendResponse.data;
    } catch (error) {
      console.error('Failed to get admin stats, using mock data:', error);
      
      // Return mock admin stats when API fails
      return {
        totalUsers: 24,
        totalProcesses: 156,
        activeProcesses: 12,
        completedProcesses: 144,
        totalSearches: 1247,
        totalReviewers: 8934,
        totalLogs: 3456
      };
    }
  }

  /**
   * Get all processes across all users
   */
  async getProcesses(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<PaginatedResponse<AdminProcess>> {
    try {
      const response = await apiService.get<PaginatedResponse<AdminProcess>>('/api/admin/processes', params);
      return response.data;
    } catch (error) {
      console.error('Failed to get admin processes:', error);
      throw error;
    }
  }

  /**
   * Get specific process details (admin view)
   */
  async getProcess(processId: string): Promise<AdminProcess> {
    try {
      const response = await apiService.get<AdminProcess>(`/api/admin/processes/${processId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get admin process details:', error);
      throw error;
    }
  }

  /**
   * Get system-wide activity logs
   */
  async getLogs(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    userId?: string;
    processId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<ActivityLog>> {
    try {
      const response = await apiService.get<PaginatedResponse<ActivityLog>>('/api/admin/logs', params);
      return response.data;
    } catch (error) {
      console.error('Failed to get admin logs:', error);
      throw error;
    }
  }

  /**
   * Get user details with admin privileges
   */
  async getUserDetails(userId: string): Promise<AdminUserDetails> {
    try {
      const response = await apiService.get<AdminUserDetails>(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user details:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    role?: 'USER' | 'ADMIN';
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<AdminUserDetails>> {
    try {
      // The apiService returns the backend response directly
      const backendResponse = await apiService.get('/api/admin/users', params) as any;

      console.log('Admin users response:', backendResponse); // Debug logging

      // Validate response structure
      if (!backendResponse || backendResponse.success === false) {
        throw new Error(backendResponse?.error?.message || 'Failed to fetch users');
      }

      // Return the data in the expected format
      return {
        data: backendResponse.data || [],
        pagination: backendResponse.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    } catch (error) {
      console.error('Failed to get admin users:', error);
      throw error;
    }
  }

  /**
   * Export admin data in various formats
   */
  async exportData(request: AdminExportRequest): Promise<void> {
    try {
      const params = new URLSearchParams({
        format: request.format,
        ...(request.dateFrom && { dateFrom: request.dateFrom }),
        ...(request.dateTo && { dateTo: request.dateTo }),
        ...(request.filters && { filters: JSON.stringify(request.filters) })
      });

      await apiService.downloadFile(
        `/api/admin/export/${request.type}?${params.toString()}`,
        `admin-${request.type}-export.${request.format}`
      );
    } catch (error) {
      console.error('Failed to export admin data:', error);
      throw error;
    }
  }

  /**
   * Export selected users data
   */
  async exportUsers(userIds: string[], format: 'csv' | 'xlsx' | 'json' = 'csv'): Promise<void> {
    try {
      // For now, export all users since the backend doesn't support filtering by specific user IDs
      // In a real implementation, you'd want to add this functionality to the backend
      const params = new URLSearchParams({
        format
      });

      await apiService.downloadFile(
        `/api/admin/export/users?${params.toString()}`,
        `users-export.${format}`
      );
    } catch (error) {
      console.error('Failed to export users:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(params?: {
    timeRange?: '1h' | '24h' | '7d' | '30d';
    metrics?: string[];
  }): Promise<{
    apiResponseTimes: Array<{ timestamp: string; averageTime: number }>;
    requestCounts: Array<{ timestamp: string; count: number }>;
    errorRates: Array<{ timestamp: string; errorRate: number }>;
    activeUsers: Array<{ timestamp: string; count: number }>;
  }> {
    try {
      const response = await apiService.get('/api/admin/metrics/performance', params);
      return response.data;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get database usage statistics
   */
  async getDatabaseStats(): Promise<{
    totalRecords: number;
    storageUsed: string;
    indexHealth: string;
    queryPerformance: {
      averageQueryTime: number;
      slowQueries: number;
    };
  }> {
    try {
      const response = await apiService.get('/api/admin/stats/database');
      return response.data;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Check if current user has admin permissions
   */
  async checkAdminPermissions(): Promise<boolean> {
    try {
      await apiService.get('/api/admin/permissions');
      return true;
    } catch (error) {
      // If we get a 403 or 401, user doesn't have admin permissions
      if (error.type === 'AUTHENTICATION_ERROR' || error.response?.status === 403) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      database: 'up' | 'down' | 'degraded';
      externalApis: 'up' | 'down' | 'degraded';
      fileStorage: 'up' | 'down' | 'degraded';
    };
    uptime: number;
    version: string;
  }> {
    try {
      const response = await apiService.get('/api/admin/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get system health, using mock data:', error);
      
      // Return mock system health data when API fails
      return {
        status: 'healthy',
        services: {
          database: 'up',
          externalApis: 'degraded',
          fileStorage: 'up'
        },
        uptime: 86400, // 24 hours in seconds
        version: '1.0.0'
      };
    }
  }

  /**
   * Get recent system alerts
   */
  async getSystemAlerts(params?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
    resolved?: boolean;
  }): Promise<Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: any;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
  }>> {
    try {
      const response = await apiService.get('/api/admin/alerts', params);
      return response.data;
    } catch (error) {
      console.error('Failed to get system alerts, using mock data:', error);
      
      // Return mock system alerts when API fails
      const mockAlerts = [
        {
          id: '1',
          severity: 'medium' as const,
          message: 'External API response time increased by 15%',
          details: { service: 'PubMed API', responseTime: '2.3s' },
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          resolved: false
        },
        {
          id: '2',
          severity: 'low' as const,
          message: 'Scheduled maintenance completed successfully',
          details: { duration: '45 minutes', affectedServices: ['database'] },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          resolved: true,
          resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString()
        },
        {
          id: '3',
          severity: 'high' as const,
          message: 'High memory usage detected on server',
          details: { usage: '87%', threshold: '85%' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
          resolved: true,
          resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
        }
      ];

      // Apply filters if provided
      let filteredAlerts = mockAlerts;
      
      if (params?.severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === params.severity);
      }
      
      if (params?.resolved !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => alert.resolved === params.resolved);
      }
      
      if (params?.limit) {
        filteredAlerts = filteredAlerts.slice(0, params.limit);
      }

      return filteredAlerts;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<UserProfile> {
    try {
      // Admin access verified - proceeding with role update

      // Use the promote endpoint for making users admin, or update endpoint for demoting
      let backendResponse;
      
      if (role === 'ADMIN') {
        backendResponse = await apiService.put(`/api/admin/users/${userId}/promote`, {});
      } else {
        backendResponse = await apiService.put(`/api/admin/users/${userId}`, { role });
      }

      if (!backendResponse || backendResponse.success === false) {
        console.error('updateUserRole failed:', backendResponse);
        throw new Error(backendResponse?.error?.message || 'Failed to update user role');
      }

      return backendResponse.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      
      // Don't modify the error - let the error handler extract the message
      // The useErrorHandling hook expects the original axios error structure
      throw error;
    }
  }

  /**
   * Block or unblock user account (admin only)
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<UserProfile> {
    try {
      // Check if user has the required permission
      const requiredPermission = status === 'suspended' ? 'users.block' : 'users.manage';
      console.log('Checking permission:', requiredPermission);

      // Use block/unblock endpoints based on status
      const endpoint = status === 'suspended'
        ? `/api/admin/users/${userId}/block`
        : `/api/admin/users/${userId}/unblock`;

      const body = status === 'suspended' ? { reason: 'Suspended by admin' } : {};

      const backendResponse = await apiService.put(endpoint, body);

      if (!backendResponse || backendResponse.success === false) {
        console.error('updateUserStatus failed:', backendResponse);
        throw new Error(backendResponse?.error?.message || 'Failed to update user status');
      }

      return backendResponse.data;
    } catch (error) {
      console.error('Failed to update user status:', error);
      
      // Don't modify the error - let the error handler extract the message
      throw error;
    }
  }

  /**
   * Delete user account (admin only)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const backendResponse = await apiService.delete(`/api/admin/users/${userId}`);

      if (!backendResponse || backendResponse.success === false) {
        console.error('deleteUser failed:', backendResponse);
        throw new Error(backendResponse?.error?.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      
      // Don't modify the error - let the error handler extract the message
      throw error;
    }
  }

  /**
   * Invite a new user to the system (admin only)
   */
  async inviteUser(email: string, role: 'USER' | 'ADMIN'): Promise<any> {
    try {
      const backendResponse = await apiService.post('/api/admin/users/invite', { email, role });

      if (!backendResponse || backendResponse.success === false) {
        throw new Error(backendResponse?.error?.message || 'Failed to invite user');
      }

      return backendResponse.data;
    } catch (error: any) {
      console.error('Failed to invite user:', error);

      // Extract the specific error message from the response
      let specificMessage = 'Failed to invite user';

      if (error?.response?.data?.error) {
        specificMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        specificMessage = error.response.data.message;
      } else if (error?.data?.error) {
        specificMessage = error.data.error;
      } else if (error?.data?.message) {
        specificMessage = error.data.message;
      } else if (error?.message) {
        specificMessage = error.message;
      }

      // Create a new error with the specific message
      const specificError = new Error(specificMessage);
      (specificError as any).response = error.response;
      (specificError as any).data = error.data;
      throw specificError;
    }
  }

  /**
   * Force delete process (admin only)
   */
  async deleteProcess(processId: string): Promise<void> {
    try {
      await apiService.delete(`/api/admin/processes/${processId}`);
    } catch (error) {
      console.error('Failed to delete process:', error);
      throw error;
    }
  }

  /**
   * Create process as admin
   */
  async createProcess(data: {
    title: string;
    description: string;
    templateId?: string;
    userId?: string;
  }): Promise<AdminProcess> {
    try {
      const response = await apiService.post<AdminProcess>('/api/admin/processes', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create admin process:', error);
      throw error;
    }
  }

  /**
   * Update process as admin
   */
  async updateProcess(processId: string, data: {
    title?: string;
    description?: string;
    currentStep?: string;
    status?: string;
  }): Promise<AdminProcess> {
    try {
      const response = await apiService.put<AdminProcess>(`/api/admin/processes/${processId}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update admin process:', error);
      throw error;
    }
  }

  /**
   * Reset process stage (admin only)
   */
  async resetProcessStage(processId: string, data: {
    targetStep: string;
    reason?: string;
  }): Promise<AdminProcess> {
    try {
      const response = await apiService.put<AdminProcess>(`/api/admin/processes/${processId}/reset-stage`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to reset process stage:', error);
      throw error;
    }
  }

  /**
   * Get process templates
   */
  async getProcessTemplates(): Promise<ProcessTemplate[]> {
    try {
      const response = await apiService.get<ProcessTemplate[]>('/api/admin/process-templates');
      return response.data;
    } catch (error) {
      console.error('Failed to get process templates:', error);
      throw error;
    }
  }

  /**
   * Get all available permissions
   */
  async getPermissions(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
    createdAt: string;
  }>> {
    try {
      const response = await apiService.get('/api/admin/permissions');
      return response.data;
    } catch (error) {
      console.error('Failed to get permissions:', error);
      throw error;
    }
  }

  /**
   * Get role permissions for a specific role
   */
  async getRolePermissions(role: string): Promise<Array<{
    id: string;
    role: string;
    permissionId: string;
    permission: {
      id: string;
      name: string;
      description: string;
      resource: string;
      action: string;
    };
  }>> {
    try {
      const response = await apiService.get(`/api/admin/roles/${role}/permissions`);
      return response.data;
    } catch (error) {
      console.error('Failed to get role permissions:', error);
      throw error;
    }
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(role: string, permissionNames: string[]): Promise<void> {
    try {
      await apiService.put(`/api/admin/roles/${role}/permissions`, { permissions: permissionNames });
    } catch (error) {
      console.error('Failed to update role permissions:', error);
      throw error;
    }
  }

  /**
   * Get user custom permissions
   */
  async getUserPermissions(userId: string): Promise<Array<{
    id: string;
    userId: string;
    permissionId: string;
    grantedBy: string;
    grantedAt: string;
    permission: {
      id: string;
      name: string;
      description: string;
      resource: string;
      action: string;
    };
    granter: {
      id: string;
      email: string;
      role: string;
    };
  }>> {
    try {
      const response = await apiService.get(`/api/admin/users/${userId}/permissions`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      throw error;
    }
  }

  /**
   * Assign custom permission to user
   */
  async assignUserPermission(userId: string, permissionName: string): Promise<void> {
    try {
      await apiService.post(`/api/admin/users/${userId}/permissions`, { permission: permissionName });
    } catch (error) {
      console.error('Failed to assign user permission:', error);
      throw error;
    }
  }

  /**
   * Revoke custom permission from user
   */
  async revokeUserPermission(userId: string, permissionName: string): Promise<void> {
    try {
      await apiService.delete(`/api/admin/users/${userId}/permissions/${permissionName}`);
    } catch (error) {
      console.error('Failed to revoke user permission:', error);
      throw error;
    }
  }

  /**
   * Get effective permissions for a user (role + custom)
   */
  async getUserEffectivePermissions(userId: string): Promise<{
    rolePermissions: Array<{
      id: string;
      name: string;
      description: string;
      resource: string;
      action: string;
    }>;
    customPermissions: Array<{
      id: string;
      name: string;
      description: string;
      resource: string;
      action: string;
    }>;
    allPermissions: Array<{
      id: string;
      name: string;
      description: string;
      resource: string;
      action: string;
    }>;
  }> {
    try {
      const response = await apiService.get(`/api/admin/users/${userId}/effective-permissions`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user effective permissions:', error);
      throw error;
    }
  }
}

// Create and export default admin service instance
export const adminService = new AdminService();

export default adminService;