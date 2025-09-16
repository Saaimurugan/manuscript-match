import { PrismaClient, ActivityLog } from '@prisma/client';
import { ActivityLogRepository, CreateActivityLogInput } from '../repositories/ActivityLogRepository';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  processId?: string | undefined;
  action: string;
  details?: any;
  timestamp: Date;
  formattedTimestamp: string;
}

export interface ActivityLogQuery {
  processId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedActivityLogs {
  logs: ActivityLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ActivityLogService {
  private activityLogRepository: ActivityLogRepository;

  constructor(prisma: PrismaClient) {
    this.activityLogRepository = new ActivityLogRepository(prisma);
  }

  /**
   * Create a new activity log entry
   */
  async logActivity(data: CreateActivityLogInput): Promise<ActivityLog> {
    return this.activityLogRepository.create(data);
  }

  /**
   * Get activity logs for a specific process with pagination
   */
  async getProcessLogs(
    processId: string,
    options: {
      page?: number;
      limit?: number;
      userId?: string;
    } = {}
  ): Promise<PaginatedActivityLogs> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // Build search options
    const searchOptions: any = {
      processId,
      skip,
      take: limit,
    };

    if (options.userId) {
      searchOptions.userId = options.userId;
    }

    // Get logs and total count
    const [logs, total] = await Promise.all([
      this.activityLogRepository.search(searchOptions),
      this.activityLogRepository.countByProcessId(processId),
    ]);

    // Format logs with user-friendly timestamps
    const formattedLogs = logs.map(log => this.formatActivityLog(log));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Get activity logs for a specific user with pagination
   */
  async getUserLogs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      processId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<PaginatedActivityLogs> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // Build search options
    const searchOptions: any = {
      userId,
      skip,
      take: limit,
    };

    if (options.processId) {
      searchOptions.processId = options.processId;
    }

    if (options.startDate) {
      searchOptions.startDate = options.startDate;
    }

    if (options.endDate) {
      searchOptions.endDate = options.endDate;
    }

    // Get logs and total count
    const [logs, total] = await Promise.all([
      this.activityLogRepository.search(searchOptions),
      this.activityLogRepository.countByUserId(userId),
    ]);

    // Format logs with user-friendly timestamps
    const formattedLogs = logs.map(log => this.formatActivityLog(log));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Search activity logs with advanced filtering
   */
  async searchLogs(query: ActivityLogQuery): Promise<PaginatedActivityLogs> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // Build search options
    const searchOptions: any = {
      skip,
      take: limit,
    };

    if (query.userId) {
      searchOptions.userId = query.userId;
    }

    if (query.processId) {
      searchOptions.processId = query.processId;
    }

    if (query.action) {
      searchOptions.action = query.action;
    }

    if (query.startDate) {
      searchOptions.startDate = query.startDate;
    }

    if (query.endDate) {
      searchOptions.endDate = query.endDate;
    }

    // Get logs
    const logs = await this.activityLogRepository.search(searchOptions);

    // Get total count for pagination (without skip/take)
    const countOptions = { ...searchOptions };
    delete countOptions.skip;
    delete countOptions.take;
    const allLogs = await this.activityLogRepository.search(countOptions);
    const total = allLogs.length;

    // Format logs with user-friendly timestamps
    const formattedLogs = logs.map(log => this.formatActivityLog(log));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Get activity summary for a process
   */
  async getProcessActivitySummary(processId: string): Promise<{
    totalActivities: number;
    lastActivity?: Date;
    activityTypes: { action: string; count: number }[];
  }> {
    const logs = await this.activityLogRepository.findByProcessId(processId);
    
    const totalActivities = logs.length;
    const lastActivity = logs.length > 0 ? logs[0]?.timestamp : undefined;
    
    // Count activities by type
    const activityCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activityTypes = Object.entries(activityCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalActivities,
      ...(lastActivity && { lastActivity }),
      activityTypes,
    };
  }

  /**
   * Format activity log with user-friendly timestamp and parsed details
   */
  private formatActivityLog(log: ActivityLog): ActivityLogEntry {
    let parsedDetails;
    try {
      parsedDetails = log.details ? JSON.parse(log.details) : undefined;
    } catch {
      parsedDetails = log.details;
    }

    return {
      id: log.id,
      userId: log.userId,
      processId: log.processId ?? undefined,
      action: log.action,
      details: parsedDetails,
      timestamp: log.timestamp,
      formattedTimestamp: this.formatTimestamp(log.timestamp),
    };
  }

  /**
   * Format timestamp in user-friendly format
   */
  private formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Less than 1 minute ago
    if (diffMinutes < 1) {
      return 'Just now';
    }

    // Less than 1 hour ago
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }

    // Less than 24 hours ago
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    // Less than 7 days ago
    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    // More than 7 days ago - show formatted date
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get action display name for better UX
   */
  static getActionDisplayName(action: string): string {
    const actionMap: Record<string, string> = {
      'PROCESS_CREATED': 'Process Created',
      'MANUSCRIPT_UPLOADED': 'Manuscript Uploaded',
      'METADATA_UPDATED': 'Metadata Updated',
      'DATABASE_SEARCH_INITIATED': 'Database Search Started',
      'AUTHOR_VALIDATION_RUN': 'Author Validation Completed',
      'SHORTLIST_CREATED': 'Shortlist Created',
      'SHORTLIST_EXPORTED': 'Shortlist Exported',
      'PROCESS_STEP_UPDATED': 'Process Step Updated',
      'PROCESS_DELETED': 'Process Deleted',
      'LOGIN_ATTEMPT': 'Login Attempt',
      'LOGOUT': 'Logout',
    };

    return actionMap[action] || action.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}