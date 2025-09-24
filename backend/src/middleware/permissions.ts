import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '@/services/PermissionService';
import { PermissionRepository } from '@/repositories/PermissionRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { prisma } from '@/config/database';
import { AuthUser, UserRole } from '@/types';
import { CustomError, ErrorType } from './errorHandler';

// Create service instances
const permissionRepository = new PermissionRepository(prisma);
const userRepository = new UserRepository(prisma);
const activityLogRepository = new ActivityLogRepository(prisma);
const permissionService = new PermissionService(
  permissionRepository,
  userRepository,
  activityLogRepository
);

/**
 * Permission-based authorization middleware
 * Checks if the authenticated user has the required permission
 */
export const requirePermission = (permissionName: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const hasPermission = await permissionService.hasPermission(
        req.user.id,
        permissionName
      );

      if (!hasPermission) {
        // Log unauthorized access attempt
        await activityLogRepository.create({
          userId: req.user.id,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          details: JSON.stringify({
            requiredPermission: permissionName,
            userRole: req.user.role,
            endpoint: req.path,
            method: req.method,
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          resourceType: 'permission',
          resourceId: permissionName,
        });

        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient permissions. Required: ${permissionName}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Multiple permissions middleware - requires ALL specified permissions
 */
export const requirePermissions = (permissionNames: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const permissionCheck = await permissionService.checkPermissions(
        req.user.id,
        permissionNames
      );

      if (!permissionCheck.hasPermission) {
        // Log unauthorized access attempt
        await activityLogRepository.create({
          userId: req.user.id,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          details: JSON.stringify({
            requiredPermissions: permissionNames,
            missingPermissions: permissionCheck.missingPermissions,
            userRole: req.user.role,
            endpoint: req.path,
            method: req.method,
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          resourceType: 'permissions',
        });

        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient permissions. Missing: ${permissionCheck.missingPermissions.join(', ')}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Any permission middleware - requires ANY of the specified permissions
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      let hasAnyPermission = false;
      for (const permissionName of permissionNames) {
        const hasPermission = await permissionService.hasPermission(
          req.user.id,
          permissionName
        );
        if (hasPermission) {
          hasAnyPermission = true;
          break;
        }
      }

      if (!hasAnyPermission) {
        // Log unauthorized access attempt
        await activityLogRepository.create({
          userId: req.user.id,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          details: JSON.stringify({
            requiredPermissions: permissionNames,
            userRole: req.user.role,
            endpoint: req.path,
            method: req.method,
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          resourceType: 'permissions',
        });

        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient permissions. Required any of: ${permissionNames.join(', ')}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Role hierarchy middleware - checks if user has higher or equal role
 */
export const requireRoleOrHigher = (minimumRole: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const userRole = req.user.role || UserRole.USER;
      const userLevel = PermissionService.getRoleHierarchyLevel(userRole);
      const requiredLevel = PermissionService.getRoleHierarchyLevel(minimumRole);

      if (userLevel < requiredLevel) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient role. Required: ${minimumRole} or higher`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Resource ownership middleware - checks if user owns the resource or has admin permissions
 */
export const requireOwnershipOrPermission = (
  resourceUserIdField: string,
  fallbackPermission: string
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      if (resourceUserId === req.user.id) {
        return next();
      }

      // Check if user has fallback permission
      const hasPermission = await permissionService.hasPermission(
        req.user.id,
        fallbackPermission
      );

      if (!hasPermission) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Access denied. You can only access your own resources or need admin permissions.',
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * User blocking check middleware - ensures user is not blocked
 */
export const checkUserBlocked = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next();
    }

    // Get fresh user data to check blocked status
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new CustomError(
        ErrorType.AUTHENTICATION_ERROR,
        'User not found',
        401
      );
    }

    if (user.status === 'BLOCKED') {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Account has been blocked. Please contact an administrator.',
        403
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Convenience middleware combinations for common admin operations
export const requireUserManagement = requirePermission('users.manage');
export const requireUserRead = requirePermission('users.read');
export const requireUserCreate = requirePermission('users.create');
export const requireUserUpdate = requirePermission('users.update');
export const requireUserDelete = requirePermission('users.delete');
export const requireUserBlock = requirePermission('users.block');
export const requireUserInvite = requirePermission('users.invite');

export const requireProcessManagement = requirePermission('processes.manage');
export const requireProcessRead = requirePermission('processes.read');
export const requireProcessCreate = requirePermission('processes.create');
export const requireProcessUpdate = requirePermission('processes.update');
export const requireProcessDelete = requirePermission('processes.delete');
export const requireProcessReset = requirePermission('processes.reset');

export const requirePermissionManagement = requirePermission('permissions.manage');
export const requirePermissionRead = requirePermission('permissions.read');
export const requirePermissionAssign = requirePermission('permissions.assign');
export const requirePermissionRevoke = requirePermission('permissions.revoke');

export const requireSystemAdmin = requirePermission('system.admin');
export const requireSystemLogs = requirePermission('system.logs');
export const requireSystemMonitor = requirePermission('system.monitor');
export const requireSystemConfig = requirePermission('system.config');

// Admin role shortcuts
export const requireAdmin = requireRoleOrHigher(UserRole.ADMIN);
export const requireManager = requireRoleOrHigher(UserRole.MANAGER);
export const requireQC = requireRoleOrHigher(UserRole.QC);

/**
 * Decorator function for easy permission checking in controllers
 * Usage: @RequirePermission('users.read')
 */
export function RequirePermission(permissionName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const req = args[0] as Request;
      const res = args[1] as Response;
      
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const hasPermission = await permissionService.hasPermission(
        req.user.id,
        permissionName
      );

      if (!hasPermission) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient permissions. Required: ${permissionName}`,
          403
        );
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Decorator function for role-based access control
 * Usage: @RequireRole(UserRole.ADMIN)
 */
export function RequireRole(minimumRole: UserRole) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const req = args[0] as Request;
      
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const userRole = req.user.role || UserRole.USER;
      const userLevel = PermissionService.getRoleHierarchyLevel(userRole);
      const requiredLevel = PermissionService.getRoleHierarchyLevel(minimumRole);

      if (userLevel < requiredLevel) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient role. Required: ${minimumRole} or higher`,
          403
        );
      }

      return method.apply(this, args);
    };
  };
}

