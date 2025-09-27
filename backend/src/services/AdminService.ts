import { ProcessRepository } from '@/repositories/ProcessRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ProcessStatus, ProcessStep } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';



export interface AdminLogFilters {
  userId?: string;
  processId?: string;
  action?: string;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminExportFilters {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

export interface AdminStats {
  totalUsers: number;
  totalLogs: number;
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  topUsers: Array<{
    userId: string;
    email: string;
    activityCount: number;
    lastActivity: Date;
  }>;
}

export interface ExportResult {
  data: Buffer;
  filename: string;
  mimeType: string;
}

export class AdminService {
  constructor(
    private processRepository: ProcessRepository,
    private activityLogRepository: ActivityLogRepository,
    private userRepository: UserRepository
  ) { }



  /**
   * Get all user activity logs with filtering and pagination
   */
  async getAllLogs(
    page: number,
    limit: number,
    filters: AdminLogFilters
  ): Promise<{ logs: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Build search options
      const searchOptions: any = {
        skip,
        take: limit
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

      if (filters.startDate) {
        searchOptions.startDate = filters.startDate;
      }

      if (filters.endDate) {
        searchOptions.endDate = filters.endDate;
      }

      // Get logs
      const logs = await this.activityLogRepository.search(searchOptions);

      // Get total count
      const totalSearchOptions = { ...searchOptions };
      delete totalSearchOptions.skip;
      delete totalSearchOptions.take;

      const allLogs = await this.activityLogRepository.search(totalSearchOptions);
      const total = allLogs.length;

      // Enrich logs with user and process information (sanitized)
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          // Get user info (sanitized)
          const user = log.userId ? await this.userRepository.findById(log.userId) : null;

          // Get process info if available
          let process = null;
          if (log.processId) {
            process = await this.processRepository.findById(log.processId);
          }

          return {
            id: log.id,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp,
            user: user ? {
              id: user.id,
              email: this.sanitizeEmail(user.email),
              role: user.role
            } : null,
            process: process ? {
              id: process.id,
              title: process.title,
              status: process.status,
              currentStep: process.currentStep
            } : null
          };
        })
      );

      return {
        logs: enrichedLogs,
        total
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch admin logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      // Get basic counts
      const totalUsers = await this.userRepository.count();
      const totalLogs = await this.activityLogRepository.getPrismaClient().activityLog.count();

      // Get recent activity stats
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentActivity = {
        last24Hours: await this.activityLogRepository.getPrismaClient().activityLog.count({
          where: { timestamp: { gte: last24Hours } }
        }),
        last7Days: await this.activityLogRepository.getPrismaClient().activityLog.count({
          where: { timestamp: { gte: last7Days } }
        }),
        last30Days: await this.activityLogRepository.getPrismaClient().activityLog.count({
          where: { timestamp: { gte: last30Days } }
        })
      };

      // Get top users by activity count
      const topUsersData = await this.activityLogRepository.getPrismaClient().activityLog.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
        where: { userId: { not: null } }
      });

      const topUsers = await Promise.all(
        topUsersData.map(async (userData) => {
          const user = await this.userRepository.findById(userData.userId!);
          const lastActivity = await this.activityLogRepository.getPrismaClient().activityLog.findFirst({
            where: { userId: userData.userId },
            orderBy: { timestamp: 'desc' }
          });

          return {
            userId: userData.userId!,
            email: user ? this.sanitizeEmail(user.email) : 'Unknown',
            activityCount: userData._count.id,
            lastActivity: lastActivity?.timestamp || new Date(0)
          };
        })
      );

      return {
        totalUsers,
        totalLogs,
        recentActivity,
        topUsers
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch admin stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get detailed user information with processes and activity
   */
  async getUserDetails(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return null;
      }

      // Get user's processes
      const processes = await this.processRepository.findByUserId(userId);

      // Get user's recent activity
      const recentLogs = await this.activityLogRepository.findByUserId(userId, {
        take: 20
      });

      // Get user statistics
      const processCount = await this.processRepository.getPrismaClient().process.count({
        where: { userId }
      });

      const logCount = await this.activityLogRepository.countByUserId(userId);

      return {
        user: {
          id: user.id,
          email: user.email, // Full email for detailed view
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        statistics: {
          processCount,
          logCount,
          lastActivity: recentLogs[0]?.timestamp || null
        },
        recentProcesses: processes.slice(0, 10).map(process => ({
          id: process.id,
          title: process.title,
          status: process.status,
          currentStep: process.currentStep,
          createdAt: process.createdAt,
          updatedAt: process.updatedAt
        })),
        recentActivity: recentLogs.map(log => ({
          id: log.id,
          action: log.action,
          details: log.details,
          timestamp: log.timestamp,
          processId: log.processId
        }))
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch user details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }



  /**
   * Export admin data in various formats
   */
  async exportData(
    type: 'processes' | 'logs' | 'users',
    format: 'csv' | 'xlsx',
    filters: AdminExportFilters
  ): Promise<ExportResult> {
    try {
      let data: any[];
      let filename: string;

      switch (type) {
        case 'processes':
          data = await this.getProcessesForExport(filters);
          filename = `processes_export_${new Date().toISOString().split('T')[0]}.${format}`;
          break;
        case 'logs':
          data = await this.getLogsForExport(filters);
          filename = `logs_export_${new Date().toISOString().split('T')[0]}.${format}`;
          break;
        case 'users':
          data = await this.getUsersForExport(filters);
          filename = `users_export_${new Date().toISOString().split('T')[0]}.${format}`;
          break;
        default:
          throw new CustomError(
            ErrorType.VALIDATION_ERROR,
            'Invalid export type',
            400
          );
      }

      // Convert data to requested format
      const exportBuffer = format === 'csv'
        ? this.convertToCSV(data)
        : this.convertToXLSX(data);

      const mimeType = format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      return {
        data: exportBuffer,
        filename,
        mimeType
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.EXPORT_ERROR,
        `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Sanitize email for privacy (show first 2 chars and domain)
   */
  private sanitizeEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return 'invalid@email.com';
    }
    if (localPart.length <= 2) {
      return `${localPart}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  }

  /**
   * Get processes data for export
   */
  private async getProcessesForExport(filters: AdminExportFilters): Promise<any[]> {
    const queryOptions: any = {};

    if (filters.startDate || filters.endDate) {
      queryOptions.where = {};
      if (filters.startDate) {
        queryOptions.where.createdAt = { gte: filters.startDate };
      }
      if (filters.endDate) {
        queryOptions.where.createdAt = {
          ...queryOptions.where.createdAt,
          lte: filters.endDate
        };
      }
    }

    const processes = await this.processRepository.getPrismaClient().process.findMany({
      ...queryOptions,
      include: { user: true }
    });

    return processes.map(process => ({
      id: process.id,
      title: process.title,
      status: process.status,
      currentStep: process.currentStep,
      userEmail: (process as any).user ? this.sanitizeEmail((process as any).user.email) : 'Unknown',
      createdAt: process.createdAt.toISOString(),
      updatedAt: process.updatedAt.toISOString()
    }));
  }

  /**
   * Get logs data for export
   */
  private async getLogsForExport(filters: AdminExportFilters): Promise<any[]> {
    const searchOptions: any = {};

    if (filters.startDate) {
      searchOptions.startDate = filters.startDate;
    }
    if (filters.endDate) {
      searchOptions.endDate = filters.endDate;
    }

    const logs = await this.activityLogRepository.search(searchOptions);

    return Promise.all(logs.map(async (log) => {
      const user = log.userId ? await this.userRepository.findById(log.userId) : null;
      const process = log.processId ? await this.processRepository.findById(log.processId) : null;

      return {
        id: log.id,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp.toISOString(),
        userEmail: user ? this.sanitizeEmail(user.email) : 'Unknown',
        processTitle: process?.title || 'N/A'
      };
    }));
  }

  /**
   * Get users data for export
   */
  private async getUsersForExport(filters: AdminExportFilters): Promise<any[]> {
    const queryOptions: any = {};

    if (filters.startDate || filters.endDate) {
      queryOptions.where = {};
      if (filters.startDate) {
        queryOptions.where.createdAt = { gte: filters.startDate };
      }
      if (filters.endDate) {
        queryOptions.where.createdAt = {
          ...queryOptions.where.createdAt,
          lte: filters.endDate
        };
      }
    }

    const users = await this.userRepository.getPrismaClient().user.findMany(queryOptions);

    return Promise.all(users.map(async (user) => {
      const processCount = await this.processRepository.getPrismaClient().process.count({
        where: { userId: user.id }
      });

      const lastActivity = await this.activityLogRepository.getPrismaClient().activityLog.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' }
      });

      return {
        id: user.id,
        email: this.sanitizeEmail(user.email),
        role: user.role,
        processCount,
        lastActivity: lastActivity?.timestamp?.toISOString() || 'Never',
        createdAt: user.createdAt.toISOString()
      };
    }));
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): Buffer {
    if (data.length === 0) {
      return Buffer.from('No data available');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Convert data to XLSX format (simplified implementation)
   */
  private convertToXLSX(data: any[]): Buffer {
    // For now, return CSV format with XLSX extension
    // In a real implementation, you would use a library like 'xlsx' or 'exceljs'
    return this.convertToCSV(data);
  }



  // Activity Log Management Methods

  /**
   * Get activity logs with advanced filtering and pagination
   */
  async getActivityLogs(
    page: number,
    limit: number,
    filters: {
      userId?: string;
      processId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      ipAddress?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ logs: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Build search options for activity log repository
      const searchOptions: any = {
        skip,
        take: limit
      };

      // Apply filters
      if (filters.userId) searchOptions.userId = filters.userId;
      if (filters.processId) searchOptions.processId = filters.processId;
      if (filters.action) searchOptions.action = filters.action;
      if (filters.resourceType) searchOptions.resourceType = filters.resourceType;
      if (filters.resourceId) searchOptions.resourceId = filters.resourceId;
      if (filters.ipAddress) searchOptions.ipAddress = filters.ipAddress;
      if (filters.startDate) searchOptions.startDate = filters.startDate;
      if (filters.endDate) searchOptions.endDate = filters.endDate;

      // Get logs
      const logs = await this.activityLogRepository.search(searchOptions);

      // Get total count for pagination
      const totalSearchOptions = { ...searchOptions };
      delete totalSearchOptions.skip;
      delete totalSearchOptions.take;

      const allLogs = await this.activityLogRepository.search(totalSearchOptions);
      let total = allLogs.length;

      // Apply text search filter if provided (post-processing since repository doesn't support it)
      let filteredLogs = logs;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredLogs = logs.filter(log =>
          log.action.toLowerCase().includes(searchTerm) ||
          (log.details && log.details.toLowerCase().includes(searchTerm))
        );

        // Recalculate total for search
        const allFilteredLogs = allLogs.filter(log =>
          log.action.toLowerCase().includes(searchTerm) ||
          (log.details && log.details.toLowerCase().includes(searchTerm))
        );
        total = allFilteredLogs.length;
      }

      // Apply sorting if specified (post-processing since repository doesn't support custom sorting)
      if (filters.sortBy && filters.sortBy !== 'timestamp') {
        filteredLogs.sort((a, b) => {
          let aValue: any, bValue: any;

          switch (filters.sortBy) {
            case 'action':
              aValue = a.action;
              bValue = b.action;
              break;
            case 'userId':
              aValue = a.userId;
              bValue = b.userId;
              break;
            case 'resourceType':
              aValue = a.resourceType || '';
              bValue = b.resourceType || '';
              break;
            default:
              aValue = a.timestamp;
              bValue = b.timestamp;
          }

          if (filters.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }

      // Enrich logs with user and process information
      const enrichedLogs = await Promise.all(
        filteredLogs.map(async (log) => {
          // Get user info (sanitized for privacy)
          const user = log.userId ? await this.userRepository.findById(log.userId) : null;

          // Get process info if available
          let process = null;
          if (log.processId) {
            process = await this.processRepository.findById(log.processId);
          }

          return {
            id: log.id,
            action: log.action,
            details: log.details,
            resourceType: log.resourceType || 'system',
            resourceId: log.resourceId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.timestamp,
            user: user ? {
              id: user.id,
              email: this.sanitizeEmail(user.email),
              role: user.role
            } : null,
            process: process ? {
              id: process.id,
              title: process.title,
              status: process.status,
              currentStep: process.currentStep
            } : null
          };
        })
      );

      return {
        logs: enrichedLogs,
        total
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Export activity logs in various formats
   */
  async exportActivityLogs(
    filters: {
      userId?: string;
      processId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    },
    format: 'json' | 'csv' | 'pdf'
  ): Promise<ExportResult> {
    try {
      // Build search options (no pagination for export)
      const searchOptions: any = {};

      if (filters.userId) searchOptions.userId = filters.userId;
      if (filters.processId) searchOptions.processId = filters.processId;
      if (filters.action) searchOptions.action = filters.action;
      if (filters.resourceType) searchOptions.resourceType = filters.resourceType;
      if (filters.resourceId) searchOptions.resourceId = filters.resourceId;
      if (filters.startDate) searchOptions.startDate = filters.startDate;
      if (filters.endDate) searchOptions.endDate = filters.endDate;

      // Get all matching logs
      let logs = await this.activityLogRepository.search(searchOptions);

      // Apply text search filter if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        logs = logs.filter(log =>
          log.action.toLowerCase().includes(searchTerm) ||
          (log.details && log.details.toLowerCase().includes(searchTerm))
        );
      }

      // Enrich logs with user and process information for export
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const user = log.userId ? await this.userRepository.findById(log.userId) : null;
          const process = log.processId ? await this.processRepository.findById(log.processId) : null;

          return {
            id: log.id,
            timestamp: log.timestamp.toISOString(),
            action: log.action,
            details: log.details,
            resourceType: log.resourceType || 'system',
            resourceId: log.resourceId || 'N/A',
            ipAddress: log.ipAddress || 'N/A',
            userAgent: log.userAgent || 'N/A',
            userEmail: user ? this.sanitizeEmail(user.email) : 'Unknown',
            userRole: user?.role || 'Unknown',
            processTitle: process?.title || 'N/A',
            processStatus: process?.status || 'N/A'
          };
        })
      );

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `activity_logs_export_${timestamp}.${format}`;

      // Convert to requested format
      let exportBuffer: Buffer;
      let mimeType: string;

      switch (format) {
        case 'json':
          exportBuffer = Buffer.from(JSON.stringify(enrichedLogs, null, 2), 'utf-8');
          mimeType = 'application/json';
          break;
        case 'csv':
          exportBuffer = this.convertLogsToCSV(enrichedLogs);
          mimeType = 'text/csv';
          break;
        case 'pdf':
          exportBuffer = await this.convertLogsToPDF(enrichedLogs);
          mimeType = 'application/pdf';
          break;
        default:
          throw new CustomError(
            ErrorType.VALIDATION_ERROR,
            'Invalid export format',
            400
          );
      }

      return {
        data: exportBuffer,
        filename,
        mimeType
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.EXPORT_ERROR,
        `Failed to export activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get user-specific activity logs with filtering and pagination
   */
  async getUserActivityLogs(
    userId: string,
    page: number,
    limit: number,
    filters: {
      processId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ user: any; logs: any[]; total: number }> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { user: null, logs: [], total: 0 };
      }

      const skip = (page - 1) * limit;

      // Build search options
      const searchOptions: any = {
        userId,
        skip,
        take: limit
      };

      // Apply additional filters
      if (filters.processId) searchOptions.processId = filters.processId;
      if (filters.action) searchOptions.action = filters.action;
      if (filters.resourceType) searchOptions.resourceType = filters.resourceType;
      if (filters.startDate) searchOptions.startDate = filters.startDate;
      if (filters.endDate) searchOptions.endDate = filters.endDate;

      // Get logs
      let logs = await this.activityLogRepository.search(searchOptions);

      // Get total count
      const totalSearchOptions = { ...searchOptions };
      delete totalSearchOptions.skip;
      delete totalSearchOptions.take;

      let allLogs = await this.activityLogRepository.search(totalSearchOptions);

      // Apply text search filter if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        logs = logs.filter(log =>
          log.action.toLowerCase().includes(searchTerm) ||
          (log.details && log.details.toLowerCase().includes(searchTerm))
        );

        allLogs = allLogs.filter(log =>
          log.action.toLowerCase().includes(searchTerm) ||
          (log.details && log.details.toLowerCase().includes(searchTerm))
        );
      }

      const total = allLogs.length;

      // Apply sorting if specified
      if (filters.sortBy && filters.sortBy !== 'timestamp') {
        logs.sort((a, b) => {
          let aValue: any, bValue: any;

          switch (filters.sortBy) {
            case 'action':
              aValue = a.action;
              bValue = b.action;
              break;
            case 'userId':
              aValue = a.userId;
              bValue = b.userId;
              break;
            case 'resourceType':
              aValue = a.resourceType || '';
              bValue = b.resourceType || '';
              break;
            default:
              aValue = a.timestamp;
              bValue = b.timestamp;
          }

          if (filters.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }

      // Enrich logs with process information
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          let process = null;
          if (log.processId) {
            process = await this.processRepository.findById(log.processId);
          }

          return {
            id: log.id,
            action: log.action,
            details: log.details,
            resourceType: log.resourceType || 'system',
            resourceId: log.resourceId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.timestamp,
            process: process ? {
              id: process.id,
              title: process.title,
              status: process.status,
              currentStep: process.currentStep
            } : null
          };
        })
      );

      return {
        user: {
          id: user.id,
          email: user.email, // Full email for user-specific view
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        },
        logs: enrichedLogs,
        total
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch user activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Convert logs to CSV format
   */
  private convertLogsToCSV(logs: any[]): Buffer {
    if (logs.length === 0) {
      return Buffer.from('No activity logs available');
    }

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Details',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'User Email',
      'User Role',
      'Process Title',
      'Process Status'
    ];

    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.timestamp,
        log.action,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        log.resourceType,
        log.resourceId,
        log.ipAddress,
        `"${(log.userAgent || '').replace(/"/g, '""')}"`,
        log.userEmail,
        log.userRole,
        `"${(log.processTitle || '').replace(/"/g, '""')}"`,
        log.processStatus
      ].join(','))
    ].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Convert logs to PDF format (simplified implementation)
   */
  private async convertLogsToPDF(logs: any[]): Promise<Buffer> {
    // For now, return a simple text-based PDF content
    // In a real implementation, you would use a library like 'pdfkit' or 'puppeteer'
    const content = `Activity Logs Export
Generated: ${new Date().toISOString()}
Total Records: ${logs.length}

${logs.map(log => `
Timestamp: ${log.timestamp}
Action: ${log.action}
User: ${log.userEmail} (${log.userRole})
Resource: ${log.resourceType}${log.resourceId ? ` - ${log.resourceId}` : ''}
Details: ${log.details || 'N/A'}
IP Address: ${log.ipAddress}
${log.processTitle ? `Process: ${log.processTitle} (${log.processStatus})` : ''}
${'='.repeat(80)}
`).join('')}`;

    return Buffer.from(content, 'utf-8');
  }
}