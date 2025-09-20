/**
 * Activity logging service
 * Handles fetching user activity logs with pagination and filtering
 */

import { apiService } from './apiService';
import type { 
  ActivityLog, 
  ActivityLogFilters,
  PaginatedResponse,
  ApiResponse 
} from '../types/api';

/**
 * Activity log service class for activity logging
 */
class ActivityLogService {
  /**
   * Get activity logs with pagination and filtering
   */
  async getActivityLogs(
    page: number = 1,
    limit: number = 20,
    filters?: ActivityLogFilters
  ): Promise<PaginatedResponse<ActivityLog>> {
    const params: Record<string, any> = {
      page,
      limit,
    };
    
    if (filters) {
      if (filters.userId) params.userId = filters.userId;
      if (filters.processId) params.processId = filters.processId;
      if (filters.action) params.action = filters.action;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
    }
    
    const response = await apiService.get<PaginatedResponse<ActivityLog>>('/api/activity-logs', params);
    return response.data;
  }
}

// Create and export service instance
export const activityLogService = new ActivityLogService();
export default activityLogService;