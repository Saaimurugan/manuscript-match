import { Request, Response, NextFunction } from 'express';
import { AdminService } from '@/services/AdminService';
import { UserService } from '@/services/UserService';
import { InvitationService } from '@/services/InvitationService';
import { PermissionService } from '@/services/PermissionService';
import { EmailService } from '@/services/EmailService';
import { ProcessRepository } from '@/repositories/ProcessRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { UserInvitationRepository } from '@/repositories/UserInvitationRepository';
import { PermissionRepository } from '@/repositories/PermissionRepository';
import { prisma } from '@/config/database';
import { ApiResponse, PaginatedResponse, UserRole, UserStatus, Permission } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import {
  validatePaginationParams,
  validateDateRange,
  inviteUserSchema,
  adminUpdateUserSchema,
  blockUserSchema,
  assignPermissionsSchema,
  updateRolePermissionsSchema,

  adminActivityLogFiltersSchema,
  activityLogExportSchema
} from '@/validation/schemas';
import { AdminExportFilters } from '@/services/AdminService';
import { AdminLogFilters } from '@/services/AdminService';
import { AdminProcessFilters } from '@/services/AdminService';


export class AdminController {
  private adminService: AdminService;
  private userService: UserService;
  private invitationService: InvitationService;

  private permissionService: PermissionService;

  constructor() {
    const processRepository = new ProcessRepository(prisma);
    const activityLogRepository = new ActivityLogRepository(prisma);
    const userRepository = new UserRepository(prisma);
    const userInvitationRepository = new UserInvitationRepository(prisma);
    const permissionRepository = new PermissionRepository(prisma);

    // Initialize services with their dependencies
    this.permissionService = new PermissionService(
      permissionRepository,
      userRepository,
      activityLogRepository
    );
    const emailService = new EmailService();

    this.adminService = new AdminService(
      processRepository,
      activityLogRepository,
      userRepository
    );

    this.userService = new UserService(
      userRepository,
      activityLogRepository,
      this.permissionService
    );

    this.invitationService = new InvitationService({
      userInvitationRepository,
      userRepository,
      activityLogRepository,
      emailService
    });
  }



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

  // User Management Methods

  /**
   * Invite a new user to the system
   * POST /api/admin/users/invite
   */
  inviteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = inviteUserSchema.validate(req.body);
      if (error) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          error.details?.[0]?.message || 'Validation error',
          400
        );
      }

      const { email, role } = value;
      const invitedBy = req.user!.id;

      const invitation = await this.invitationService.inviteUser({ email, role, invitedBy });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          invitedAt: invitation.invitedAt,
          expiresAt: invitation.expiresAt
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Promote a user to admin status
   * PUT /api/admin/users/:id/promote
   */
  promoteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const promotedBy = req.user!.id;

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      if (id === promotedBy) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Cannot promote yourself',
          400
        );
      }

      const user = await this.userService.promoteToAdmin(id, promotedBy);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          updatedAt: user.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a user from the system
   * DELETE /api/admin/users/:id
   */
  deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = req.user!.id;

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      if (id === deletedBy) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Cannot delete yourself',
          400
        );
      }

      await this.userService.deleteUser(id, deletedBy);

      const response: ApiResponse<any> = {
        success: true,
        data: { message: 'User deleted successfully' }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user information
   * PUT /api/admin/users/:id
   */
  updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = adminUpdateUserSchema.validate(req.body);

      if (error) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          error.details?.[0]?.message || 'Validation error',
          400
        );
      }

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      const user = await this.userService.updateUser(id, value, req.user!.id);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          updatedAt: user.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Block a user temporarily
   * PUT /api/admin/users/:id/block
   */
  blockUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = blockUserSchema.validate(req.body);

      if (error) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          error.details?.[0]?.message || 'Validation error',
          400
        );
      }

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      const blockedBy = req.user!.id;
      const { reason } = value;

      if (id === blockedBy) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Cannot block yourself',
          400
        );
      }

      const user = await this.userService.blockUser(id, blockedBy, reason);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          status: user.status,
          blockedAt: user.blockedAt,
          blockedBy: user.blockedBy
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Unblock a previously blocked user
   * PUT /api/admin/users/:id/unblock
   */
  unblockUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const unblockedBy = req.user!.id;

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      const user = await this.userService.unblockUser(id, unblockedBy);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          status: user.status,
          blockedAt: user.blockedAt,
          blockedBy: user.blockedBy
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all users with pagination and filtering
   * GET /api/admin/users
   */
  getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 20 } = validatePaginationParams(req.query);

      const {
        role,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        role: role as UserRole,
        status: status as UserStatus,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.userService.getAllUsers(page, limit, filters);

      const response: PaginatedResponse<any> = {
        success: true,
        data: result.users,
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

  // Permission Management Methods

  /**
   * Assign custom permissions to a user
   * PUT /api/admin/users/:id/permissions
   */
  assignUserPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = assignPermissionsSchema.validate(req.body);

      if (error) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          error.details?.[0]?.message || 'Validation error',
          400
        );
      }

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      const { permissions } = value;
      const assignedBy = req.user!.id;

      // Validate that all permission IDs exist and convert to names
      const permissionNames: string[] = [];
      for (const permissionId of permissions) {
        const permission = await this.permissionService.getAllPermissions();
        const foundPermission = permission.find(p => p.id === permissionId);
        if (!foundPermission) {
          throw new CustomError(
            ErrorType.NOT_FOUND,
            `Permission not found: ${permissionId}`,
            404
          );
        }
        permissionNames.push(foundPermission.name);
      }

      // Get current user permissions to determine what to add/remove
      const currentPermissions = await this.permissionService.getUserEffectivePermissions(id);
      const currentCustomPermissionNames = currentPermissions.customPermissions.map(p => p.name);

      // Determine permissions to add and remove
      const permissionsToAdd = permissionNames.filter(name => !currentCustomPermissionNames.includes(name));
      const permissionsToRemove = currentCustomPermissionNames.filter(name => !permissionNames.includes(name));

      // Add new permissions
      for (const permissionName of permissionsToAdd) {
        await this.permissionService.grantUserPermission(id, permissionName, assignedBy);
      }

      // Remove permissions that are no longer assigned
      for (const permissionName of permissionsToRemove) {
        await this.permissionService.revokeUserPermission(id, permissionName, assignedBy);
      }

      // Get updated permissions
      const updatedPermissions = await this.permissionService.getUserEffectivePermissions(id);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          userId: id,
          customPermissions: updatedPermissions.customPermissions,
          allPermissions: updatedPermissions.allPermissions
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update permissions for a role
   * PUT /api/admin/roles/:role/permissions
   */
  updateRolePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { role } = req.params;
      const { error, value } = updateRolePermissionsSchema.validate(req.body);

      if (error) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          error.details?.[0]?.message || 'Validation error',
          400
        );
      }

      if (!role || !Object.values(UserRole).includes(role as UserRole)) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Invalid role specified',
          400
        );
      }

      const { permissions } = value;
      const updatedBy = req.user!.id;

      // Validate that all permission IDs exist and convert to names
      const permissionNames: string[] = [];
      const allPermissions = await this.permissionService.getAllPermissions();

      for (const permissionId of permissions) {
        const foundPermission = allPermissions.find(p => p.id === permissionId);
        if (!foundPermission) {
          throw new CustomError(
            ErrorType.NOT_FOUND,
            `Permission not found: ${permissionId}`,
            404
          );
        }
        permissionNames.push(foundPermission.name);
      }

      // Update role permissions
      await this.permissionService.updateRolePermissions(
        role as UserRole,
        permissionNames,
        updatedBy
      );

      // Get updated role permissions
      const updatedRolePermissions = await this.permissionService.getRolePermissions(role as UserRole);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          role,
          permissions: updatedRolePermissions
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all available permissions
   * GET /api/admin/permissions
   */
  getAllPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = await this.permissionService.getAllPermissions();

      // Group permissions by resource for better organization
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource]?.push(permission);
        return acc;
      }, {} as Record<string, Permission[]>);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          permissions,
          groupedPermissions,
          total: permissions.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };



  // Audit Management Methods

  /**
   * Verify audit trail integrity
   */
  verifyAuditTrail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { AuditVerificationUtils } = await import('@/utils/auditVerification');
      const auditUtils = new AuditVerificationUtils();

      const result = await auditUtils.verifyFullAuditTrail();

      const response: ApiResponse<any> = {
        success: result.isValid,
        message: result.summary,
        data: result.details
      };

      res.status(result.isValid ? 200 : 422).json(response);
      await auditUtils.close();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get audit trail statistics
   */
  getAuditStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { AuditVerificationUtils } = await import('@/utils/auditVerification');
      const auditUtils = new AuditVerificationUtils();

      const result = await auditUtils.getAuditStatistics();

      const response: ApiResponse<any> = {
        success: true,
        message: result.summary,
        data: result.details
      };

      res.json(response);
      await auditUtils.close();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Manually trigger audit log rotation
   */
  rotateAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { AuditVerificationUtils } = await import('@/utils/auditVerification');
      const auditUtils = new AuditVerificationUtils();

      const result = await auditUtils.performLogRotation();

      const response: ApiResponse<any> = {
        success: result.success,
        message: result.summary,
        data: result.details
      };

      res.status(result.success ? 200 : 500).json(response);
      await auditUtils.close();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clean up old audit archive files
   */
  cleanupAuditArchives = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { AuditVerificationUtils } = await import('@/utils/auditVerification');
      const auditUtils = new AuditVerificationUtils();

      const result = await auditUtils.cleanupOldArchives();

      const response: ApiResponse<any> = {
        success: result.success,
        message: result.summary,
        data: result.details
      };

      res.status(result.success ? 200 : 500).json(response);
      await auditUtils.close();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Run comprehensive audit health check
   */
  auditHealthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { AuditVerificationUtils } = await import('@/utils/auditVerification');
      const auditUtils = new AuditVerificationUtils();

      const result = await auditUtils.runHealthCheck();

      const response: ApiResponse<any> = {
        success: result.overallHealth !== 'critical',
        message: result.summary,
        data: {
          overallHealth: result.overallHealth,
          checks: result.checks
        }
      };

      const statusCode = result.overallHealth === 'critical' ? 500 :
        result.overallHealth === 'warning' ? 422 : 200;

      res.status(statusCode).json(response);
      await auditUtils.close();
    } catch (error) {
      next(error);
    }
  };

  // Activity Log Management Methods

  /**
   * Get activity logs with advanced filtering and pagination
   * GET /api/admin/activity-logs
   */
  getActivityLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = validatePaginationParams(req.query);

      const {
        userId,
        processId,
        action,
        resourceType,
        resourceId,
        ipAddress,
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

      const result = await this.adminService.getAllLogs(page, limit, filters);

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
   * Export activity logs in various formats
   * GET /api/admin/activity-logs/export
   */
  exportActivityLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = activityLogExportSchema.validate(req.query);
      if (error) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          error.details?.[0]?.message || 'Validation error',
          400
        );
      }

      const {
        format,
        userId,
        processId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        search
      } = value;

      // Helper function to remove undefined properties
      const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
        return Object.fromEntries(
          Object.entries(obj).filter(([_, value]) => value !== undefined)
        ) as Partial<T>;
      };

      const filters = removeUndefined({
        userId,
        processId,
        action,
        resourceType,
        resourceId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        search
      });

      const exportResult = await this.adminService.exportActivityLogs(filters, format);

      // Set appropriate headers for file download
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.data);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user-specific activity logs
   * GET /api/admin/users/:id/activity
   */
  getUserActivityLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User ID is required',
          400
        );
      }

      // Validate pagination and filter parameters
      const { page = 1, limit = 20 } = validatePaginationParams(req.query);

      const {
        processId,
        action,
        resourceType,
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
        userId: id,
        processId: processId as string,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.adminService.getAllLogs(page, limit, filters);

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
}