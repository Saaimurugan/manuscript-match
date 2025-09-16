import { Request, Response, NextFunction } from 'express';
import { AdminService } from '@/services/AdminService';
import { ProcessRepository } from '@/repositories/ProcessRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { prisma } from '@/config/database';
import { ApiResponse, PaginatedResponse } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import { validatePaginationParams, validateDateRange } from '@/validation/schemas';
import { AdminExportFilters } from '@/services/AdminService';
import { AdminLogFilters } from '@/services/AdminService';
import { AdminProcessFilters } from '@/services/AdminService';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    const processRepository = new ProcessRepository(prisma);
    const activityLogRepository = new ActivityLogRepository(prisma);
    const userRepository = new UserRepository(prisma);
    
    this.adminService = new AdminService(
      processRepository,
      activityLogRepository,
      userRepository
    );
  }

  /**
   * Get all user processes with pagination and filtering
   * GET /api/admin/processes
   */
  getAllProcesses = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate pagination parameters
      const { page = 1, limit = 20 } = validatePaginationParams(req.query);
      
      // Extract filter parameters
      const {
        userId,
        status,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Validate date range if provided
      if (startDate || endDate) {
        validateDateRange({ startDate: startDate as string, endDate: endDate as string });
      }

      const filters: AdminProcessFilters = {
        userId: userId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.adminService.getAllProcesses(
        page,
        limit,
        filters
      );

      const response: PaginatedResponse<any> = {
        success: true,
        data: result.processes,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get comprehensive user activity logs for administrators
   * GET /api/admin/logs
   */
  getAllLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate pagination parameters
      const { page = 1, limit = 50 } = validatePaginationParams(req.query);
      
      // Extract filter parameters
      const {
        userId,
        processId,
        action,
        startDate,
        endDate,
        search,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query;

      // Validate date range if provided
      if (startDate || endDate) {
        validateDateRange({ startDate: startDate as string, endDate: endDate as string });
      }

      const filters: AdminLogFilters = {
        userId: userId as string,
        processId: processId as string,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.adminService.getAllLogs(
        page,
        limit,
        filters
      );

      const response: PaginatedResponse<any> = {
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get admin dashboard statistics
   * GET /api/admin/stats
   */
  getAdminStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.adminService.getAdminStats();

      const response: ApiResponse<any> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get detailed user information with processes and activity
   * GET /api/admin/users/:userId
   */
  getUserDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      const userDetails = await this.adminService.getUserDetails(userId);

      if (!userDetails) {
        throw new CustomError(
          ErrorType.NOT_FOUND,
          'User not found',
          404
        );
      }

      const response: ApiResponse<any> = {
        success: true,
        data: userDetails
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get process details with full audit trail
   * GET /api/admin/processes/:processId
   */
  getProcessDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { processId } = req.params;
      
      if (!processId) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Process ID is required',
          400
        );
      }

      const processDetails = await this.adminService.getProcessDetails(processId);

      if (!processDetails) {
        throw new CustomError(
          ErrorType.NOT_FOUND,
          'Process not found',
          404
        );
      }

      const response: ApiResponse<any> = {
        success: true,
        data: processDetails
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export admin data in various formats
   * GET /api/admin/export/:type
   */
  exportAdminData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { type } = req.params;
      const { format = 'csv', startDate, endDate } = req.query;

      if (!type || !['processes', 'logs', 'users'].includes(type)) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Invalid export type. Must be one of: processes, logs, users',
          400
        );
      }

      if (!['csv', 'xlsx'].includes(format as string)) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Invalid export format. Must be csv or xlsx',
          400
        );
      }

      const filters: AdminExportFilters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const exportResult = await this.adminService.exportData(
        type as 'processes' | 'logs' | 'users',
        format as 'csv' | 'xlsx',
        filters
      );

      // Set appropriate headers for file download
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.data);
    } catch (error) {
      next(error);
    }
  };
}