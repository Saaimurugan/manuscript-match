import { apiService } from "./apiService";
import type { PaginatedResponse } from "@/types/api";

export interface ActivityLog {
  id: string;
  userId: string;
  processId?: string;
  action: string;
  details?: any;
  timestamp: string;
  formattedTimestamp: string;
}

export interface ActivityLogFilters {
  userId?: string;
  processId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ActivityLogQuery extends ActivityLogFilters {
  page?: number;
  limit?: number;
}

export class ActivityLogger {
  private static instance: ActivityLogger;
  private currentUser: string | null = null;

  private constructor() {}

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  setUser(userId: string) {
    this.currentUser = userId;
  }

  clearUser() {
    this.currentUser = null;
  }

  async logActivity(
    action: string,
    details?: any,
    processId?: string
  ): Promise<void> {
    if (!this.currentUser) {
      console.warn("No user set for activity logging");
      return;
    }

    try {
      // Activity logging is handled automatically by the backend middleware
      // This method is kept for compatibility but doesn't need to make API calls
      // as the backend logs activities automatically for authenticated requests
      console.log(`Activity logged: ${action}`, { details, processId });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  }

  async getUserActivities(
    query: ActivityLogQuery = {}
  ): Promise<PaginatedResponse<ActivityLog>> {
    try {
      const params = new URLSearchParams();
      
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.userId) params.append('userId', query.userId);
      if (query.processId) params.append('processId', query.processId);
      if (query.action) params.append('action', query.action);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.search) params.append('search', query.search);
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);

      const response = await apiService.request<PaginatedResponse<ActivityLog>>({
        method: 'GET',
        url: `/admin/logs?${params.toString()}`,
      });

      return response.data;
    } catch (err) {
      console.error("Error fetching user activities:", err);
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }

  async getProcessActivities(
    processId: string,
    query: Omit<ActivityLogQuery, 'processId'> = {}
  ): Promise<PaginatedResponse<ActivityLog>> {
    try {
      const params = new URLSearchParams();
      
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.userId) params.append('userId', query.userId);

      const response = await apiService.request<PaginatedResponse<ActivityLog>>({
        method: 'GET',
        url: `/processes/${processId}/logs?${params.toString()}`,
      });

      return response.data;
    } catch (err) {
      console.error("Error fetching process activities:", err);
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }
}