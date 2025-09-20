import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ActivityLogger, ActivityLog, ActivityLogQuery } from '@/services/activityLogger';
import type { PaginatedResponse } from '@/types/api';

/**
 * Hook for fetching user activity logs with pagination and filtering
 */
export function useActivityLogs(
  query: ActivityLogQuery = {}
): UseQueryResult<PaginatedResponse<ActivityLog>, Error> {
  return useQuery({
    queryKey: ['activityLogs', query],
    queryFn: async () => {
      const logger = ActivityLogger.getInstance();
      return logger.getUserActivities(query);
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for fetching process-specific activity logs
 */
export function useProcessActivityLogs(
  processId: string,
  query: Omit<ActivityLogQuery, 'processId'> = {}
): UseQueryResult<PaginatedResponse<ActivityLog>, Error> {
  return useQuery({
    queryKey: ['processActivityLogs', processId, query],
    queryFn: async () => {
      const logger = ActivityLogger.getInstance();
      return logger.getProcessActivities(processId, query);
    },
    enabled: !!processId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for real-time activity logs with auto-refresh
 */
export function useRealtimeActivityLogs(
  query: ActivityLogQuery = {},
  refreshInterval: number = 5000
): UseQueryResult<PaginatedResponse<ActivityLog>, Error> {
  return useQuery({
    queryKey: ['realtimeActivityLogs', query],
    queryFn: async () => {
      const logger = ActivityLogger.getInstance();
      return logger.getUserActivities(query);
    },
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true,
  });
}