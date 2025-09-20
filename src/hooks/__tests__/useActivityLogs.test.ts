import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActivityLogs, useProcessActivityLogs, useRealtimeActivityLogs } from '../useActivityLogs';
import { ActivityLogger } from '@/services/activityLogger';
import type { PaginatedResponse } from '@/types/api';

// Mock the ActivityLogger
jest.mock('@/services/activityLogger');
const mockActivityLogger = ActivityLogger as jest.MockedClass<typeof ActivityLogger>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useActivityLogs', () => {
  let mockLoggerInstance: jest.Mocked<ActivityLogger>;

  beforeEach(() => {
    mockLoggerInstance = {
      getUserActivities: jest.fn(),
      getProcessActivities: jest.fn(),
      logActivity: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    } as any;

    mockActivityLogger.getInstance.mockReturnValue(mockLoggerInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useActivityLogs', () => {
    it('should fetch user activities successfully', async () => {
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

      mockLoggerInstance.getUserActivities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useActivityLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockLoggerInstance.getUserActivities).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual(mockResponse);
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

      mockLoggerInstance.getUserActivities.mockResolvedValue(mockResponse);

      const query = {
        page: 2,
        limit: 10,
        userId: 'user-123',
        action: 'LOGIN'
      };

      const { result } = renderHook(() => useActivityLogs(query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockLoggerInstance.getUserActivities).toHaveBeenCalledWith(query);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('API Error');
      mockLoggerInstance.getUserActivities.mockRejectedValue(error);

      const { result } = renderHook(() => useActivityLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useProcessActivityLogs', () => {
    it('should fetch process activities successfully', async () => {
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

      mockLoggerInstance.getProcessActivities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProcessActivityLogs('process-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockLoggerInstance.getProcessActivities).toHaveBeenCalledWith('process-123', {});
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should not fetch when processId is empty', async () => {
      const { result } = renderHook(() => useProcessActivityLogs(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
      expect(mockLoggerInstance.getProcessActivities).not.toHaveBeenCalled();
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

      mockLoggerInstance.getProcessActivities.mockResolvedValue(mockResponse);

      const query = {
        page: 1,
        limit: 5,
        userId: 'user-123'
      };

      const { result } = renderHook(() => useProcessActivityLogs('process-123', query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockLoggerInstance.getProcessActivities).toHaveBeenCalledWith('process-123', query);
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  describe('useRealtimeActivityLogs', () => {
    it('should fetch activities with realtime updates', async () => {
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

      mockLoggerInstance.getUserActivities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRealtimeActivityLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockLoggerInstance.getUserActivities).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should use custom refresh interval', async () => {
      const mockResponse: PaginatedResponse<any> = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockLoggerInstance.getUserActivities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRealtimeActivityLogs({}, 1000), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockLoggerInstance.getUserActivities).toHaveBeenCalledWith({});
    });
  });
});