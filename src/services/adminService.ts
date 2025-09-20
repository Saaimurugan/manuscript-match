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
  UserProfile
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
      const response = await apiService.get<AdminStats>('/api/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get admin stats:', error);
      throw error;
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
      const response = await apiService.get<PaginatedResponse<AdminUserDetails>>('/api/admin/users', params);
      return response.data;
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
      console.error('Failed to get system health:', error);
      throw error;
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
      console.error('Failed to get system alerts:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<UserProfile> {
    try {
      const response = await apiService.put<UserProfile>(`/api/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  }

  /**
   * Suspend or activate user account (admin only)
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<UserProfile> {
    try {
      const response = await apiService.put<UserProfile>(`/api/admin/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Failed to update user status:', error);
      throw error;
    }
  }

  /**
   * Delete user account (admin only)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await apiService.delete(`/api/admin/users/${userId}`);
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
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
}

// Create and export default admin service instance
export const adminService = new AdminService();

export default adminService;