import { ProcessRepository } from '@/repositories/ProcessRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ProcessStatus, ProcessStep } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export interface AdminProcessFilters {
  userId?: string;
  status?: string;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

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
  totalProcesses: number;
  totalLogs: number;
  processStatusBreakdown: Record<ProcessStatus, number>;
  processStepBreakdown: Record<ProcessStep, number>;
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  topUsers: Array<{
    userId: string;
    email: string;
    processCount: number;
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
  ) {}

  /**
   * Get all user processes with filtering and pagination
   */
  async getAllProcesses(
    page: number,
    limit: number,
    filters: AdminProcessFilters
  ): Promise<{ processes: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Build query options
      const queryOptions: any = {
        skip,
        take: limit,
        orderBy: {}
      };

      // Set sort order
      if (filters.sortBy) {
        queryOptions.orderBy[filters.sortBy] = filters.sortOrder || 'desc';
      } else {
        queryOptions.orderBy.createdAt = 'desc';
      }

      // Apply filters
      if (filters.userId) {
        queryOptions.userId = filters.userId;
      }
      
      if (filters.status && Object.values(ProcessStatus).includes(filters.status as ProcessStatus)) {
        queryOptions.status = filters.status as ProcessStatus;
      }

      // Get processes with user information (sanitized)
      const processes = await this.processRepository.findMany(queryOptions);
      
      // Get total count for pagination
      const totalQueryOptions: any = {};
      if (filters.userId) totalQueryOptions.userId = filters.userId;
      if (filters.status) totalQueryOptions.status = filters.status as ProcessStatus;
      
      const total = await this.processRepository.getPrismaClient().process.count({
        where: totalQueryOptions
      });

      // Sanitize and enrich process data for admin view
      const sanitizedProcesses = await Promise.all(
        processes.map(async (process) => {
          // Get user info (sanitized)
          const user = await this.userRepository.findById(process.userId);
          
          // Get process statistics
          const logCount = await this.activityLogRepository.countByProcessId(process.id);
          
          return {
            id: process.id,
            title: process.title,
            status: process.status,
            currentStep: process.currentStep,
            createdAt: process.createdAt,
            updatedAt: process.updatedAt,
            user: user ? {
              id: user.id,
              email: this.sanitizeEmail(user.email), // Partially hide email for privacy
              role: user.role
            } : null,
            metadata: process.metadata ? JSON.parse(process.metadata) : null,
            activityLogCount: logCount
          };
        })
      );

      return {
        processes: sanitizedProcesses,
        total
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch admin processes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

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
          const user = await this.userRepository.findById(log.userId);
          
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
      const totalProcesses = await this.processRepository.getPrismaClient().process.count();
      const totalLogs = await this.activityLogRepository.getPrismaClient().activityLog.count();

      // Get process status breakdown
      const processStatusBreakdown: Record<ProcessStatus, number> = {} as Record<ProcessStatus, number>;
      for (const status of Object.values(ProcessStatus)) {
        processStatusBreakdown[status] = await this.processRepository.countByStatus(status);
      }

      // Get process step breakdown
      const processStepBreakdown: Record<ProcessStep, number> = {} as Record<ProcessStep, number>;
      for (const step of Object.values(ProcessStep)) {
        const count = await this.processRepository.getPrismaClient().process.count({
          where: { currentStep: step }
        });
        processStepBreakdown[step] = count;
      }

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

      // Get top users by process count
      const topUsersData = await this.processRepository.getPrismaClient().process.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      });

      const topUsers = await Promise.all(
        topUsersData.map(async (userData) => {
          const user = await this.userRepository.findById(userData.userId);
          const lastActivity = await this.activityLogRepository.getPrismaClient().activityLog.findFirst({
            where: { userId: userData.userId },
            orderBy: { timestamp: 'desc' }
          });

          return {
            userId: userData.userId,
            email: user ? this.sanitizeEmail(user.email) : 'Unknown',
            processCount: userData._count.id,
            lastActivity: lastActivity?.timestamp || new Date(0)
          };
        })
      );

      return {
        totalUsers,
        totalProcesses,
        totalLogs,
        processStatusBreakdown,
        processStepBreakdown,
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
   * Get process details with full audit trail
   */
  async getProcessDetails(processId: string): Promise<any> {
    try {
      const process = await this.processRepository.findByIdWithRelations(processId);
      if (!process) {
        return null;
      }

      // Get all activity logs for this process
      const logs = await this.activityLogRepository.findByProcessId(processId);

      return {
        process: {
          id: process.id,
          title: process.title,
          status: process.status,
          currentStep: process.currentStep,
          createdAt: process.createdAt,
          updatedAt: process.updatedAt,
          metadata: process.metadata ? JSON.parse(process.metadata) : null
        },
        user: process.user ? {
          id: process.user.id,
          email: process.user.email,
          role: process.user.role
        } : null,
        activityLogs: logs.map(log => ({
          id: log.id,
          action: log.action,
          details: log.details,
          timestamp: log.timestamp
        })),
        statistics: {
          totalLogs: logs.length,
          duration: process.updatedAt.getTime() - process.createdAt.getTime()
        }
      };
    } catch (error) {
      throw new CustomError(
        ErrorType.DATABASE_ERROR,
        `Failed to fetch process details: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      userEmail: process.user ? this.sanitizeEmail(process.user.email) : 'Unknown',
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
      const user = await this.userRepository.findById(log.userId);
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
}