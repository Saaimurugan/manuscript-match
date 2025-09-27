import { PrismaClient, ActivityLog } from '@prisma/client';
import { ActivityLogRepository, CreateActivityLogInput } from '../repositories/ActivityLogRepository';
import { ExtendedActivityLog, PaginatedResponse } from '../types';
import { AuditIntegrityService } from './AuditIntegrityService';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  processId?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: Date;
  formattedTimestamp: string;
}

export interface ActivityLogQuery {
  processId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ActivityLogFilters {
  userId?: string;
  processId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  userAgent?: string;
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

export interface UserActionContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemEventContext {
  triggeredBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf'
}

export interface ActivityLogMetrics {
  totalLogs: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  activityByHour: { hour: number; count: number }[];
  activityByDay: { date: string; count: number }[];
}

export class ActivityLogService {
  private activityLogRepository: ActivityLogRepository;
  private auditIntegrityService: AuditIntegrityService | null = null;

  constructor(prisma: PrismaClient) {
    this.activityLogRepository = new ActivityLogRepository(prisma);
  }

  private getAuditIntegrityService(): AuditIntegrityService {
    if (!this.auditIntegrityService) {
      this.auditIntegrityService = new AuditIntegrityService();
      // Set up the bidirectional relationship
      this.auditIntegrityService.setActivityLogService(this);
    }
    return this.auditIntegrityService;
  }

  /**
   * Create a new activity log entry with comprehensive tracking and audit signing
   */
  async logActivity(data: CreateActivityLogInput): Promise<ActivityLog> {
    // Ensure details are properly serialized
    const logData: CreateActivityLogInput = {
      action: data.action,
    };

    if (data.userId) logData.userId = data.userId;

    if (data.processId) logData.processId = data.processId;
    if (data.details) {
      logData.details = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
    }
    if (data.ipAddress) logData.ipAddress = data.ipAddress;
    if (data.userAgent) logData.userAgent = data.userAgent;
    if (data.resourceType) logData.resourceType = data.resourceType;
    if (data.resourceId) logData.resourceId = data.resourceId;
    
    // Create the log entry first to get the ID
    const createdLog = await this.activityLogRepository.create(logData);
    
    // Sign the log entry for audit integrity
    try {
      const signedEntry = await this.getAuditIntegrityService().signAuditLogEntry({
        id: createdLog.id,
        userId: createdLog.userId,
        processId: createdLog.processId,
        action: createdLog.action,
        resourceType: createdLog.resourceType || '',
        resourceId: createdLog.resourceId,
        details: createdLog.details ? JSON.parse(createdLog.details) : null,
        ipAddress: createdLog.ipAddress,
        userAgent: createdLog.userAgent,
        timestamp: createdLog.timestamp
      });
      
      // Update the log entry with signature and previous hash
      const updateData: any = {};
      if (signedEntry.signature) updateData.signature = signedEntry.signature;
      if (signedEntry.previousHash) updateData.previousHash = signedEntry.previousHash;
      
      const updatedLog = await this.activityLogRepository.update(createdLog.id, updateData);
      
      return updatedLog;
    } catch (error) {
      console.error('Failed to sign audit log entry:', error);
      // Return the unsigned log entry rather than failing completely
      return createdLog;
    }
  }

  /**
   * Log user-specific actions with context
   */
  async logUserAction(
    action: string,
    context: UserActionContext,
    details?: any,
    resourceType?: string,
    resourceId?: string
  ): Promise<ActivityLog> {
    const logData: CreateActivityLogInput = {
      userId: context.userId,
      action,
    };

    if (details) logData.details = JSON.stringify(details);
    if (context.ipAddress) logData.ipAddress = context.ipAddress;
    if (context.userAgent) logData.userAgent = context.userAgent;
    if (resourceType) logData.resourceType = resourceType;
    if (resourceId) logData.resourceId = resourceId;

    return this.logActivity(logData);
  }

  /**
   * Log system events with optional trigger context
   */
  async logSystemEvent(
    action: string,
    context: SystemEventContext,
    details?: any,
    resourceType?: string,
    resourceId?: string
  ): Promise<ActivityLog> {
    // For system events, use a system user ID or the triggering user
    const systemUserId = context.triggeredBy || 'system';
    
    const logData: CreateActivityLogInput = {
      userId: systemUserId,
      action,
    };

    if (details) logData.details = JSON.stringify(details);
    if (context.ipAddress) logData.ipAddress = context.ipAddress;
    if (context.userAgent) logData.userAgent = context.userAgent;
    if (resourceType) logData.resourceType = resourceType;
    if (resourceId) logData.resourceId = resourceId;

    return this.logActivity(logData);
  }

  /**
   * Log user management actions automatically
   */
  async logUserManagementAction(
    action: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_PROMOTED' | 'USER_BLOCKED' | 'USER_UNBLOCKED' | 'USER_INVITED',
    performedBy: string,
    targetUserId: string,
    context: UserActionContext,
    details?: any
  ): Promise<ActivityLog> {
    return this.logUserAction(
      action,
      { ...context, userId: performedBy },
      {
        targetUserId,
        performedBy,
        ...details,
      },
      'user',
      targetUserId
    );
  }



  /**
   * Log permission management actions automatically
   */
  async logPermissionAction(
    action: 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED' | 'ROLE_PERMISSIONS_UPDATED' | 'CUSTOM_PERMISSION_ASSIGNED',
    performedBy: string,
    targetUserId: string,
    context: UserActionContext,
    details?: any
  ): Promise<ActivityLog> {
    return this.logUserAction(
      action,
      { ...context, userId: performedBy },
      {
        targetUserId,
        performedBy,
        ...details,
      },
      'permission',
      targetUserId
    );
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent(
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH' | 'PASSWORD_RESET',
    userId: string,
    context: UserActionContext,
    details?: any
  ): Promise<ActivityLog> {
    return this.logUserAction(
      action,
      context,
      details,
      'authentication',
      userId
    );
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
   * Get activity logs with advanced filtering capabilities
   */
  async getActivityLogs(filters: ActivityLogFilters, page: number = 1, limit: number = 20): Promise<PaginatedResponse<ExtendedActivityLog>> {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(100, Math.max(1, limit));
    const skip = (validatedPage - 1) * validatedLimit;

    // Build search options
    const searchOptions: any = {
      skip,
      take: validatedLimit,
    };

    // Apply filters
    if (filters.userId) {
      searchOptions.userId = filters.userId;
    }

    if (filters.processId) {
      searchOptions.processId = filters.processId;
    }

    if (filters.action) {
      searchOptions.action = filters.action;
    }

    if (filters.resourceType) {
      // Add resourceType filter to repository if not exists
      searchOptions.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      searchOptions.resourceId = filters.resourceId;
    }

    if (filters.startDate) {
      searchOptions.startDate = filters.startDate;
    }

    if (filters.endDate) {
      searchOptions.endDate = filters.endDate;
    }

    // Get logs and total count
    const [logs, total] = await Promise.all([
      this.activityLogRepository.search(searchOptions),
      this.getFilteredLogsCount(filters),
    ]);

    // Format logs with enhanced information
    const formattedLogs = logs.map(log => this.formatExtendedActivityLog(log));

    // Calculate pagination info
    const totalPages = Math.ceil(total / validatedLimit);
    const hasNext = validatedPage < totalPages;
    const hasPrev = validatedPage > 1;

    return {
      success: true,
      data: formattedLogs,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Get activity logs for a specific user with advanced filtering
   */
  async getUserActivity(userId: string, filters?: Omit<ActivityLogFilters, 'userId'>): Promise<ExtendedActivityLog[]> {
    const searchOptions: any = {
      userId,
    };

    if (filters?.processId) {
      searchOptions.processId = filters.processId;
    }

    if (filters?.action) {
      searchOptions.action = filters.action;
    }

    if (filters?.resourceType) {
      searchOptions.resourceType = filters.resourceType;
    }

    if (filters?.resourceId) {
      searchOptions.resourceId = filters.resourceId;
    }

    if (filters?.startDate) {
      searchOptions.startDate = filters.startDate;
    }

    if (filters?.endDate) {
      searchOptions.endDate = filters.endDate;
    }

    const logs = await this.activityLogRepository.search(searchOptions);
    return logs.map(log => this.formatExtendedActivityLog(log));
  }

  /**
   * Get activity logs for a specific resource
   */
  async getResourceActivity(resourceType: string, resourceId: string, filters?: Omit<ActivityLogFilters, 'resourceType' | 'resourceId'>): Promise<ExtendedActivityLog[]> {
    const searchOptions: any = {
      resourceType,
      resourceId,
    };

    if (filters?.userId) {
      searchOptions.userId = filters.userId;
    }

    if (filters?.processId) {
      searchOptions.processId = filters.processId;
    }

    if (filters?.action) {
      searchOptions.action = filters.action;
    }

    if (filters?.startDate) {
      searchOptions.startDate = filters.startDate;
    }

    if (filters?.endDate) {
      searchOptions.endDate = filters.endDate;
    }

    const logs = await this.activityLogRepository.search(searchOptions);
    return logs.map(log => this.formatExtendedActivityLog(log));
  }

  /**
   * Search activity logs with advanced filtering (legacy method for backward compatibility)
   */
  async searchLogs(query: ActivityLogQuery): Promise<PaginatedActivityLogs> {
    const filters: ActivityLogFilters = {};
    
    if (query.userId) filters.userId = query.userId;
    if (query.processId) filters.processId = query.processId;
    if (query.action) filters.action = query.action;
    if (query.resourceType) filters.resourceType = query.resourceType;
    if (query.resourceId) filters.resourceId = query.resourceId;
    if (query.startDate) filters.startDate = query.startDate;
    if (query.endDate) filters.endDate = query.endDate;

    const result = await this.getActivityLogs(filters, query.page, query.limit);
    
    return {
      logs: result.data?.map(log => {
        const entry: ActivityLogEntry = {
          id: log.id,
          userId: log.userId,
          action: log.action,
          details: log.details,
          timestamp: log.timestamp,
          formattedTimestamp: this.formatTimestamp(log.timestamp),
        };
        
        if (log.processId) entry.processId = log.processId;
        if (log.ipAddress) entry.ipAddress = log.ipAddress;
        if (log.userAgent) entry.userAgent = log.userAgent;
        if (log.resourceType) entry.resourceType = log.resourceType;
        if (log.resourceId) entry.resourceId = log.resourceId;
        
        return entry;
      }) || [],
      pagination: result.pagination!,
    };
  }

  /**
   * Get activity metrics for dashboard and reporting
   */
  async getActivityMetrics(filters?: ActivityLogFilters, days: number = 30): Promise<ActivityLogMetrics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const searchFilters = {
      ...filters,
      startDate: filters?.startDate || startDate,
      endDate: filters?.endDate || endDate,
    };

    const logs = await this.activityLogRepository.search(searchFilters);

    // Calculate metrics
    const totalLogs = logs.length;
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;

    // Top actions
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Activity by hour (0-23)
    const activityByHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      const hourEntry = activityByHour[hour];
      if (hourEntry) {
        hourEntry.count++;
      }
    });

    // Activity by day
    const activityByDay: { date: string; count: number }[] = [];
    const dayMap = new Map<string, number>();
    
    logs.forEach(log => {
      const dateKey = log.timestamp.toISOString().split('T')[0];
      if (dateKey) {
        dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1);
      }
    });

    for (const [date, count] of dayMap.entries()) {
      activityByDay.push({ date, count });
    }

    activityByDay.sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalLogs,
      uniqueUsers,
      topActions,
      activityByHour,
      activityByDay,
    };
  }

  /**
   * Get count of filtered logs for pagination
   */
  private async getFilteredLogsCount(filters: ActivityLogFilters): Promise<number> {
    const searchOptions: any = {};

    if (filters.userId) {
      searchOptions.userId = filters.userId;
    }

    if (filters.processId) {
      searchOptions.processId = filters.processId;
    }

    if (filters.action) {
      searchOptions.action = filters.action;
    }

    if (filters.startDate) {
      searchOptions.startDate = filters.startDate;
    }

    if (filters.endDate) {
      searchOptions.endDate = filters.endDate;
    }

    const allLogs = await this.activityLogRepository.search(searchOptions);
    return allLogs.length;
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
   * Export activity logs in specified format
   */
  async exportActivityLogs(filters: ActivityLogFilters, format: ExportFormat): Promise<Buffer> {
    // Get all logs matching filters (no pagination for export)
    const logs = await this.activityLogRepository.search(filters);
    const formattedLogs = logs.map(log => this.formatExtendedActivityLog(log));

    switch (format) {
      case ExportFormat.JSON:
        return this.exportAsJSON(formattedLogs);
      case ExportFormat.CSV:
        return this.exportAsCSV(formattedLogs);
      case ExportFormat.PDF:
        return this.exportAsPDF(formattedLogs);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export logs as JSON
   */
  private exportAsJSON(logs: ExtendedActivityLog[]): Buffer {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRecords: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        processId: log.processId,
        action: log.action,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        timestamp: log.timestamp.toISOString(),
      })),
    };

    return Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Export logs as CSV
   */
  private exportAsCSV(logs: ExtendedActivityLog[]): Buffer {
    const headers = [
      'ID',
      'User ID',
      'Process ID',
      'Action',
      'Details',
      'IP Address',
      'User Agent',
      'Resource Type',
      'Resource ID',
      'Timestamp',
    ];

    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.id,
        log.userId,
        log.processId || '',
        log.action,
        this.escapeCsvField(JSON.stringify(log.details || {})),
        log.ipAddress || '',
        this.escapeCsvField(log.userAgent || ''),
        log.resourceType || '',
        log.resourceId || '',
        log.timestamp.toISOString(),
      ];
      csvRows.push(row.join(','));
    });

    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }

  /**
   * Export logs as PDF (basic implementation)
   */
  private exportAsPDF(logs: ExtendedActivityLog[]): Buffer {
    // For a basic implementation, we'll create a simple text-based PDF content
    // In a real implementation, you'd use a library like PDFKit or jsPDF
    const content = [
      'Activity Log Report',
      `Generated: ${new Date().toISOString()}`,
      `Total Records: ${logs.length}`,
      '',
      '='.repeat(80),
      '',
    ];

    logs.forEach((log, index) => {
      content.push(`${index + 1}. ${log.action}`);
      content.push(`   User: ${log.userId}`);
      content.push(`   Time: ${log.timestamp.toISOString()}`);
      if (log.processId) content.push(`   Process: ${log.processId}`);
      if (log.resourceType) content.push(`   Resource: ${log.resourceType}/${log.resourceId}`);
      if (log.ipAddress) content.push(`   IP: ${log.ipAddress}`);
      if (log.details) content.push(`   Details: ${JSON.stringify(log.details)}`);
      content.push('');
    });

    // This is a simplified PDF - in production, use a proper PDF library
    return Buffer.from(content.join('\n'), 'utf-8');
  }

  /**
   * Escape CSV field to handle commas and quotes
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
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

    const result: ActivityLogEntry = {
      id: log.id,
      userId: log.userId || '',
      action: log.action,
      details: parsedDetails,
      timestamp: log.timestamp,
      formattedTimestamp: this.formatTimestamp(log.timestamp),
    };

    if (log.processId) result.processId = log.processId;
    if (log.ipAddress) result.ipAddress = log.ipAddress;
    if (log.userAgent) result.userAgent = log.userAgent;
    if (log.resourceType) result.resourceType = log.resourceType;
    if (log.resourceId) result.resourceId = log.resourceId;

    return result;
  }

  /**
   * Format activity log as ExtendedActivityLog type
   */
  private formatExtendedActivityLog(log: ActivityLog): ExtendedActivityLog {
    let parsedDetails;
    try {
      parsedDetails = log.details ? JSON.parse(log.details) : undefined;
    } catch {
      parsedDetails = log.details;
    }

    const result: ExtendedActivityLog = {
      id: log.id,
      userId: log.userId || '',
      action: log.action,
      details: parsedDetails,
      timestamp: log.timestamp,
    };

    if (log.processId) result.processId = log.processId;
    if (log.ipAddress) result.ipAddress = log.ipAddress;
    if (log.userAgent) result.userAgent = log.userAgent;
    if (log.resourceType) result.resourceType = log.resourceType;
    if (log.resourceId) result.resourceId = log.resourceId;

    return result;
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