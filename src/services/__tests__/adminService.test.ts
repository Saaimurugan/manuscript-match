/**
 * Tests for admin service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../adminService';
import { apiService } from '../apiService';
import type { AdminStats, AdminProcess, ActivityLog, AdminUserDetails } from '../../types/api';

// Mock the API service
vi.mock('../apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

const mockApiService = apiService as any;

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('should fetch admin statistics', async () => {
      const mockStats: AdminStats = {
        totalUsers: 150,
        totalProcesses: 300,
        activeProcesses: 45,
        completedProcesses: 200,
        totalSearches: 500,
        totalReviewers: 1200,
      };

      mockApiService.get.mockResolvedValue({ data: mockStats });

      const result = await adminService.getStats();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/stats');
      expect(result).toEqual(mockStats);
    });

    it('should handle errors when fetching stats', async () => {
      const error = new Error('Failed to fetch stats');
      mockApiService.get.mockRejectedValue(error);

      await expect(adminService.getStats()).rejects.toThrow('Failed to fetch stats');
      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/stats');
    });
  });

  describe('getProcesses', () => {
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

      mockApiService.get.mockResolvedValue({ data: mockProcesses });

      const result = await adminService.getProcesses();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/processes', undefined);
      expect(result).toEqual(mockProcesses);
    });

    it('should fetch admin processes with custom parameters', async () => {
      const params = {
        page: 2,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc' as const,
        status: 'COMPLETED',
        userId: 'user-123',
        search: 'test',
      };

      mockApiService.get.mockResolvedValue({ data: { data: [], pagination: {} } });

      await adminService.getProcesses(params);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/processes', params);
    });
  });

  describe('getProcess', () => {
    it('should fetch specific process details', async () => {
      const processId = 'process-123';
      const mockProcess: AdminProcess = {
        id: processId,
        title: 'Test Process',
        description: 'Test Description',
        currentStep: 5,
        status: 'COMPLETED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        userId: 'user-1',
        userEmail: 'user@example.com',
      };

      mockApiService.get.mockResolvedValue({ data: mockProcess });

      const result = await adminService.getProcess(processId);

      expect(mockApiService.get).toHaveBeenCalledWith(`/api/admin/processes/${processId}`);
      expect(result).toEqual(mockProcess);
    });
  });

  describe('getLogs', () => {
    it('should fetch admin activity logs', async () => {
      const mockLogs = {
        data: [
          {
            id: 'log-1',
            userId: 'user-1',
            processId: 'process-1',
            action: 'FILE_UPLOAD',
            details: { fileName: 'test.pdf' },
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockApiService.get.mockResolvedValue({ data: mockLogs });

      const result = await adminService.getLogs();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/logs', undefined);
      expect(result).toEqual(mockLogs);
    });

    it('should fetch logs with filters', async () => {
      const params = {
        userId: 'user-123',
        action: 'FILE_UPLOAD',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      mockApiService.get.mockResolvedValue({ data: { data: [], pagination: {} } });

      await adminService.getLogs(params);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/logs', params);
    });
  });

  describe('getUserDetails', () => {
    it('should fetch user details', async () => {
      const userId = 'user-123';
      const mockUser: AdminUserDetails = {
        id: userId,
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastLoginAt: '2024-01-15T10:00:00Z',
        processCount: 5,
        activityCount: 25,
      };

      mockApiService.get.mockResolvedValue({ data: mockUser });

      const result = await adminService.getUserDetails(userId);

      expect(mockApiService.get).toHaveBeenCalledWith(`/api/admin/users/${userId}`);
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUsers', () => {
    it('should fetch all users', async () => {
      const mockUsers = {
        data: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'USER',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            processCount: 3,
            activityCount: 15,
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

      mockApiService.get.mockResolvedValue({ data: mockUsers });

      const result = await adminService.getUsers();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/users', undefined);
      expect(result).toEqual(mockUsers);
    });
  });

  describe('exportData', () => {
    it('should export data in CSV format', async () => {
      const request = {
        type: 'users' as const,
        format: 'csv' as const,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      mockApiService.downloadFile.mockResolvedValue(undefined);

      await adminService.exportData(request);

      expect(mockApiService.downloadFile).toHaveBeenCalledWith(
        '/api/admin/export/users?format=csv&dateFrom=2024-01-01&dateTo=2024-01-31',
        'admin-users-export.csv'
      );
    });

    it('should export data with filters', async () => {
      const request = {
        type: 'processes' as const,
        format: 'xlsx' as const,
        filters: { status: 'COMPLETED' },
      };

      mockApiService.downloadFile.mockResolvedValue(undefined);

      await adminService.exportData(request);

      expect(mockApiService.downloadFile).toHaveBeenCalledWith(
        '/api/admin/export/processes?format=xlsx&filters=%7B%22status%22%3A%22COMPLETED%22%7D',
        'admin-processes-export.xlsx'
      );
    });
  });

  describe('checkAdminPermissions', () => {
    it('should return true for admin users', async () => {
      mockApiService.get.mockResolvedValue({ data: {} });

      const result = await adminService.checkAdminPermissions();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/permissions');
      expect(result).toBe(true);
    });

    it('should return false for non-admin users', async () => {
      const error = { type: 'AUTHENTICATION_ERROR', response: { status: 403 } };
      mockApiService.get.mockRejectedValue(error);

      const result = await adminService.checkAdminPermissions();

      expect(result).toBe(false);
    });

    it('should throw error for other types of errors', async () => {
      const error = new Error('Network error');
      mockApiService.get.mockRejectedValue(error);

      await expect(adminService.checkAdminPermissions()).rejects.toThrow('Network error');
    });
  });

  describe('getSystemHealth', () => {
    it('should fetch system health status', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        services: {
          database: 'up' as const,
          externalApis: 'up' as const,
          fileStorage: 'up' as const,
        },
        uptime: 86400,
        version: '1.0.0',
      };

      mockApiService.get.mockResolvedValue({ data: mockHealth });

      const result = await adminService.getSystemHealth();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/health');
      expect(result).toEqual(mockHealth);
    });
  });

  describe('getSystemAlerts', () => {
    it('should fetch system alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          severity: 'high' as const,
          message: 'High CPU usage detected',
          timestamp: '2024-01-01T00:00:00Z',
          resolved: false,
        },
      ];

      mockApiService.get.mockResolvedValue({ data: mockAlerts });

      const result = await adminService.getSystemAlerts();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/alerts', undefined);
      expect(result).toEqual(mockAlerts);
    });

    it('should fetch alerts with filters', async () => {
      const params = {
        severity: 'critical' as const,
        limit: 10,
        resolved: false,
      };

      mockApiService.get.mockResolvedValue({ data: [] });

      await adminService.getSystemAlerts(params);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/admin/alerts', params);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const userId = 'user-123';
      const role = 'ADMIN';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.put.mockResolvedValue({ data: mockUser });

      const result = await adminService.updateUserRole(userId, role);

      expect(mockApiService.put).toHaveBeenCalledWith(`/api/admin/users/${userId}/role`, { role });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status', async () => {
      const userId = 'user-123';
      const status = 'suspended';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.put.mockResolvedValue({ data: mockUser });

      const result = await adminService.updateUserStatus(userId, status);

      expect(mockApiService.put).toHaveBeenCalledWith(`/api/admin/users/${userId}/status`, { status });
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = 'user-123';

      mockApiService.delete.mockResolvedValue({ data: {} });

      await adminService.deleteUser(userId);

      expect(mockApiService.delete).toHaveBeenCalledWith(`/api/admin/users/${userId}`);
    });
  });

  describe('deleteProcess', () => {
    it('should delete process', async () => {
      const processId = 'process-123';

      mockApiService.delete.mockResolvedValue({ data: {} });

      await adminService.deleteProcess(processId);

      expect(mockApiService.delete).toHaveBeenCalledWith(`/api/admin/processes/${processId}`);
    });
  });
});