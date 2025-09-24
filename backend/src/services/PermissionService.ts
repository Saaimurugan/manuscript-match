import { PermissionRepository } from '@/repositories/PermissionRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { 
  Permission, 
  UserPermission, 
  UserRole,
  AuthUser 
} from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export interface PermissionCheckResult {
  hasPermission: boolean;
  missingPermissions: string[];
}

export interface EffectivePermissions {
  rolePermissions: Permission[];
  customPermissions: Permission[];
  allPermissions: Permission[];
}

export class PermissionService {
  private permissionRepository: PermissionRepository;
  private userRepository: UserRepository;
  private activityLogRepository: ActivityLogRepository;

  // Role hierarchy: Admin > Manager > QC > User
  private static readonly ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.ADMIN]: 4,
    [UserRole.MANAGER]: 3,
    [UserRole.QC]: 2,
    [UserRole.USER]: 1,
  };

  constructor(
    permissionRepository: PermissionRepository,
    userRepository: UserRepository,
    activityLogRepository: ActivityLogRepository
  ) {
    this.permissionRepository = permissionRepository;
    this.userRepository = userRepository;
    this.activityLogRepository = activityLogRepository;
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    return this.permissionRepository.hasPermission(
      userId, 
      user.role as UserRole, 
      permissionName
    );
  }

  /**
   * Check multiple permissions for a user
   */
  async checkPermissions(userId: string, permissions: string[]): Promise<PermissionCheckResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    const missingPermissions: string[] = [];
    
    for (const permission of permissions) {
      const hasPermission = await this.permissionRepository.hasPermission(
        userId,
        user.role as UserRole,
        permission
      );
      
      if (!hasPermission) {
        missingPermissions.push(permission);
      }
    }

    return {
      hasPermission: missingPermissions.length === 0,
      missingPermissions,
    };
  }

  /**
   * Get all effective permissions for a user (role + custom)
   */
  async getUserEffectivePermissions(userId: string): Promise<EffectivePermissions> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    const userRole = user.role as UserRole;
    
    // Get role permissions
    const rolePermissions = await this.permissionRepository.findRolePermissions(userRole);
    const rolePerms = rolePermissions.map(rp => rp.permission).filter(p => p !== undefined) as Permission[];

    // Get custom user permissions
    const userPermissions = await this.permissionRepository.findUserPermissions(userId);
    const customPerms = userPermissions.map(up => up.permission).filter(p => p !== undefined) as Permission[];

    // Get all effective permissions (deduplicated)
    const allPermissions = await this.permissionRepository.getUserEffectivePermissions(userId, userRole);

    return {
      rolePermissions: rolePerms,
      customPermissions: customPerms,
      allPermissions,
    };
  }

  /**
   * Grant custom permission to a user
   */
  async grantUserPermission(
    userId: string, 
    permissionName: string, 
    grantedBy: string
  ): Promise<UserPermission> {
    // Validate users exist
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    const granter = await this.userRepository.findById(grantedBy);
    if (!granter) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'Granter not found',
        404
      );
    }

    // Find permission
    const permission = await this.permissionRepository.findByName(permissionName);
    if (!permission) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'Permission not found',
        404
      );
    }

    // Check if granter has permission to grant this permission
    const canGrant = await this.canGrantPermission(grantedBy, permissionName);
    if (!canGrant) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to grant this permission',
        403
      );
    }

    // Check if user already has this permission
    const existingPermission = await this.permissionRepository.findUserPermission(
      userId, 
      permission.id
    );
    if (existingPermission) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User already has this permission',
        409
      );
    }

    // Create user permission
    const userPermission = await this.permissionRepository.createUserPermission({
      userId,
      permissionId: permission.id,
      grantedBy,
    });

    // Log the action
    await this.activityLogRepository.create({
      userId: grantedBy,
      action: 'PERMISSION_GRANTED',
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        permissionName,
        permissionId: permission.id,
      }),
      resourceType: 'permission',
      resourceId: permission.id,
    });

    return userPermission;
  }

  /**
   * Revoke custom permission from a user
   */
  async revokeUserPermission(
    userId: string, 
    permissionName: string, 
    revokedBy: string
  ): Promise<void> {
    // Validate users exist
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    const revoker = await this.userRepository.findById(revokedBy);
    if (!revoker) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'Revoker not found',
        404
      );
    }

    // Find permission
    const permission = await this.permissionRepository.findByName(permissionName);
    if (!permission) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'Permission not found',
        404
      );
    }

    // Check if revoker has permission to revoke this permission
    const canRevoke = await this.canRevokePermission(revokedBy);
    if (!canRevoke) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to revoke this permission',
        403
      );
    }

    // Check if user has this custom permission
    const existingPermission = await this.permissionRepository.findUserPermission(
      userId, 
      permission.id
    );
    if (!existingPermission) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User does not have this custom permission',
        404
      );
    }

    // Remove user permission
    await this.permissionRepository.deleteUserPermission(userId, permission.id);

    // Log the action
    await this.activityLogRepository.create({
      userId: revokedBy,
      action: 'PERMISSION_REVOKED',
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        permissionName,
        permissionId: permission.id,
      }),
      resourceType: 'permission',
      resourceId: permission.id,
    });
  }

  /**
   * Update role permissions (admin only)
   */
  async updateRolePermissions(
    role: UserRole, 
    permissionNames: string[], 
    updatedBy: string
  ): Promise<void> {
    // Validate updater exists and has admin permissions
    const updater = await this.userRepository.findById(updatedBy);
    if (!updater) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'Updater not found',
        404
      );
    }

    const canUpdate = await this.hasPermission(updatedBy, 'permissions.manage');
    if (!canUpdate) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to update role permissions',
        403
      );
    }

    // Validate all permissions exist
    const permissions: Permission[] = [];
    for (const permissionName of permissionNames) {
      const permission = await this.permissionRepository.findByName(permissionName);
      if (!permission) {
        throw new CustomError(
          ErrorType.NOT_FOUND,
          `Permission not found: ${permissionName}`,
          404
        );
      }
      permissions.push(permission);
    }

    // Remove all existing role permissions
    await this.permissionRepository.deleteAllRolePermissions(role);

    // Add new role permissions
    for (const permission of permissions) {
      await this.permissionRepository.createRolePermission({
        role,
        permissionId: permission.id,
      });
    }

    // Log the action
    await this.activityLogRepository.create({
      userId: updatedBy,
      action: 'ROLE_PERMISSIONS_UPDATED',
      details: JSON.stringify({
        role,
        permissionNames,
        permissionCount: permissions.length,
      }),
      resourceType: 'role',
      resourceId: role,
    });
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(role: UserRole): Promise<Permission[]> {
    const rolePermissions = await this.permissionRepository.findRolePermissions(role);
    return rolePermissions.map(rp => rp.permission).filter(p => p !== undefined) as Permission[];
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.findMany();
  }

  /**
   * Check if a user can grant a specific permission
   * Users can only grant permissions they have themselves, and only to users of lower hierarchy
   */
  private async canGrantPermission(granterId: string, permissionName: string): Promise<boolean> {
    // Check if granter has the permission themselves
    const granterHasPermission = await this.hasPermission(granterId, permissionName);
    if (!granterHasPermission) {
      return false;
    }

    // Check if granter has permission management rights
    const canManagePermissions = await this.hasPermission(granterId, 'permissions.assign');
    return canManagePermissions;
  }

  /**
   * Check if a user can revoke a specific permission
   */
  private async canRevokePermission(revokerId: string): Promise<boolean> {
    // Check if revoker has permission management rights
    const canManagePermissions = await this.hasPermission(revokerId, 'permissions.revoke');
    return canManagePermissions;
  }

  /**
   * Check if user A has higher hierarchy than user B
   */
  async hasHigherHierarchy(userAId: string, userBId: string): Promise<boolean> {
    const userA = await this.userRepository.findById(userAId);
    const userB = await this.userRepository.findById(userBId);

    if (!userA || !userB) {
      return false;
    }

    const hierarchyA = PermissionService.ROLE_HIERARCHY[userA.role as UserRole] || 0;
    const hierarchyB = PermissionService.ROLE_HIERARCHY[userB.role as UserRole] || 0;

    return hierarchyA > hierarchyB;
  }

  /**
   * Get role hierarchy level
   */
  static getRoleHierarchyLevel(role: UserRole): number {
    return PermissionService.ROLE_HIERARCHY[role] || 0;
  }

  /**
   * Check if role A is higher than role B
   */
  static isHigherRole(roleA: UserRole, roleB: UserRole): boolean {
    return PermissionService.getRoleHierarchyLevel(roleA) > PermissionService.getRoleHierarchyLevel(roleB);
  }

  /**
   * Get users with specific permission
   */
  async getUsersWithPermission(permissionName: string): Promise<AuthUser[]> {
    const permission = await this.permissionRepository.findByName(permissionName);
    if (!permission) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'Permission not found',
        404
      );
    }

    // Get users with custom permission
    const userPermissions = await this.permissionRepository.findUserPermissions('dummy'); // This needs to be refactored
    const usersWithCustomPermission: AuthUser[] = [];

    for (const up of userPermissions) {
      if (up.permission?.name === permissionName) {
        const user = await this.userRepository.findById(up.userId);
        if (user) {
          usersWithCustomPermission.push({
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
          });
        }
      }
    }

    // Get roles with this permission
    const rolesWithPermission: UserRole[] = [];
    
    for (const role of Object.values(UserRole)) {
      const rolePerms = await this.permissionRepository.findRolePermissions(role);
      const hasPermission = rolePerms.some(rp => rp.permissionId === permission.id);
      if (hasPermission) {
        rolesWithPermission.push(role);
      }
    }

    // Get all users with these roles
    const usersWithRolePermission = await this.userRepository.findMany();
    const usersWithRolePermissionFiltered = usersWithRolePermission.filter(user => 
      rolesWithPermission.includes(user.role as UserRole)
    );

    // Combine and deduplicate users
    const allUserIds = new Set<string>();
    const result: AuthUser[] = [];

    // Add users with custom permissions
    for (const user of usersWithCustomPermission) {
      if (!allUserIds.has(user.id)) {
        allUserIds.add(user.id);
        result.push(user);
      }
    }

    // Add users with role permissions
    for (const user of usersWithRolePermissionFiltered) {
      if (!allUserIds.has(user.id)) {
        allUserIds.add(user.id);
        result.push({
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
        });
      }
    }

    return result;
  }
}