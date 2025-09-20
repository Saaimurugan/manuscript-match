import { ActivityLogger } from '../activityLogger';
import { apiService } from '../apiService';
import type { PaginatedResponse } from '@/types/api';

// Mock the API service
jest.mock('../apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ActivityLogger', () => {
  let logger: ActivityLogger;

  beforeEach(() => {
    logger = ActivityLogger.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = ActivityLogger.getInstance();
      const instance2 = ActivityLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('setUser and clearUser', () => {
    it('should set and clear user', () => {
      logger.setUser('user-123');
      expect((logger as any).currentUser).toBe('user-123');

      logger.clearUser();
      expect((logger as any).currentUser).toBeNull();
    });
  });

  describe('logActivity', () => {
    it('should log activity without making API calls', async () => {
      logger.setUser('user-123');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await logger.logActivity('TEST_ACTION', { test: 'data' }, 'process-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Activity logged: TEST_ACTION',
        { details: { test: 'data' }, processId: 'process-123' }
      );

      consoleSpy.mockRestore();
    });

    it('should warn when no user is set', async () => {
      logger.clearUser();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await logger.logActivity('TEST_ACTION');

      expect(consoleSpy).toHaveBeenCalledWith('No user set for activity logging');

      consoleSpy.mockRestore();
    });
  });

  describe('getUserActivities', () => {
    it('should fetch user activities with default parameters', async () => {
      const mockResponse: PaginatedResponse<any> = {
        data: [
          {
            id: '1',
            userId: 'user-123',
            action: 'LOGIN',
            timestamp: '2024-01-01T10:00:00Z',
            formattedTimestamp: 'Jan 01, 10:00:00'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: mockResponse });

      const result = await logger.getUserActivities();

      expect(mockApiService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/admin/logs?'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch user activities with query parameters', async () => {
      const mockResponse: PaginatedResponse<any> = {
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: true
        }
      };

      mockApiService.request.mockResolvedValue({ data: mockResponse });

      const query = {
        page: 2,
        limit: 10,
        userId: 'user-123',
        action: 'LOGIN',
        search: 'test',
        sortBy: 'timestamp',
        sortOrder: 'asc' as const
      };

      const result = await logger.getUserActivities(query);

      expect(mockApiService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/admin/logs?page=2&limit=10&userId=user-123&action=LOGIN&search=test&sortBy=timestamp&sortOrder=asc'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.request.mockRejectedValue(new Error('API Error'));

      const result = await logger.getUserActivities();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user activities:', expect.any(Error));
      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getProcessActivities', () => {
    it('should fetch process activities', async () => {
      const mockResponse: PaginatedResponse<any> = {
        data: [
          {
            id: '1',
            userId: 'user-123',
            processId: 'process-123',
            action: 'FILE_UPLOADED',
            timestamp: '2024-01-01T10:00:00Z',
            formattedTimestamp: 'Jan 01, 10:00:00'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: mockResponse });

      const result = await logger.getProcessActivities('process-123');

      expect(mockApiService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/processes/process-123/logs?'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch process activities with query parameters', async () => {
      const mockResponse: PaginatedResponse<any> = {
        data: [],
        pagination: {
          page: 1,
          limit: 5,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockApiService.request.mockResolvedValue({ data: mockResponse });

      const query = {
        page: 1,
        limit: 5,
        userId: 'user-123'
      };

      const result = await logger.getProcessActivities('process-123', query);

      expect(mockApiService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/processes/process-123/logs?page=1&limit=5&userId=user-123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.request.mockRejectedValue(new Error('API Error'));

      const result = await logger.getProcessActivities('process-123');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching process activities:', expect.any(Error));
      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      consoleErrorSpy.mockRestore();
    });
  });
});