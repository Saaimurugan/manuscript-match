import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { PermissionService } from '@/services/PermissionService';
import { 
  ExtendedUser, 
  UserRole, 
  UserStatus,
  Permission,
  UserPermission
} from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export interface UserUpdateData {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserLifecycleService {
  promoteToAdmin(userId: string, promotedBy: string): Promise<ExtendedUser>;
  deleteUser(userId: string, deletedBy: string): Promise<void>;
  updateUser(userId: string, updates: UserUpdateData, updatedBy: string): Promise<ExtendedUser>;
  blockUser(userId: string, blockedBy: string, reason?: string): Promise<ExtendedUser>;
  unblockUser(userId: string, unblockedBy: string): Promise<ExtendedUser>;
}

export interface UserPermissionService {
  assignCustomPermissions(userId: string, permissions: string[], assignedBy: string): Promise<UserPermission[]>;
  revokeCustomPermissions(userId: string, permissions: string[], revokedBy: string): Promise<void>;
  getUserEffectivePermissions(userId: string): Promise<{
    rolePermissions: Permission[];
    customPermissions: Permission[];
    allPermissions: Permission[];
    conflicts: PermissionConflict[];
  }>;
}

export interface PermissionConflict {
  permissionName: string;
  conflictType: 'role_override' | 'duplicate_custom' | 'hierarchy_violation';
  description: string;
  resolution: 'role_takes_precedence' | 'custom_overrides' | 'higher_role_wins';
}

export class UserService implements UserLifecycleService, UserPermissionService {
  private userRepository: UserRepository;
  private activityLogRepository: ActivityLogRepository;
  private permissionService: PermissionService;

  constructor(
    userRepository: UserRepository,
    activityLogRepository: ActivityLogRepository,
    permissionService: PermissionService
  ) {
    this.userRepository = userRepository;
    this.activityLogRepository = activityLogRepository;
    this.permissionService = permissionService;
  }

  /**
   * Promote a user to admin status
   */
  async promoteToAdmin(userId: string, promotedBy: string): Promise<ExtendedUser> {
    // Validate inputs
    if (!userId || !promotedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and promoter ID are required',
        400
      );
    }

    // Check if promoter has permission
    const hasPermission = await this.permissionService.hasPermission(
      promotedBy, 
      'users:promote'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to promote users',
        403
      );
    }

    // Find the user to promote
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Check if user is already an admin
    if (user.role === UserRole.ADMIN) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User is already an admin',
        400
      );
    }

    // Check if user is blocked
    if ((user as any).status === UserStatus.BLOCKED) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Cannot promote blocked user',
        400
      );
    }

    // Update user role to admin
    const updatedUser = await this.userRepository.update(userId, {
      role: UserRole.ADMIN,
    });

    // Log the promotion activity
    await this.activityLogRepository.create({
      userId: promotedBy,
      action: 'USER_PROMOTED_TO_ADMIN',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        previousRole: user.role,
        newRole: UserRole.ADMIN,
      }),
    });

    return updatedUser as ExtendedUser;
  }

  /**
   * Delete a user from the system
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    // Validate inputs
    if (!userId || !deletedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and deleter ID are required',
        400
      );
    }

    // Prevent self-deletion
    if (userId === deletedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Cannot delete your own account',
        400
      );
    }

    // Check if deleter has permission
    const hasPermission = await this.permissionService.hasPermission(
      deletedBy, 
      'users:delete'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to delete users',
        403
      );
    }

    // Find the user to delete
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Get deleter info for hierarchy validation
    const deleter = await this.userRepository.findById(deletedBy);
    if (!deleter) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'Deleter not found',
        404
      );
    }

    // Validate admin hierarchy - prevent lower roles from deleting higher roles
    if (!this.canManageUser(deleter.role as UserRole, user.role as UserRole)) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Cannot delete user with equal or higher role',
        403
      );
    }

    // Log the deletion activity before deleting
    await this.activityLogRepository.create({
      userId: deletedBy,
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        targetUserRole: user.role,
      }),
    });

    // Delete the user
    await this.userRepository.delete(userId);
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string, 
    updates: UserUpdateData, 
    updatedBy: string
  ): Promise<ExtendedUser> {
    // Validate inputs
    if (!userId || !updatedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and updater ID are required',
        400
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'No updates provided',
        400
      );
    }

    // Check if updater has permission
    const hasPermission = await this.permissionService.hasPermission(
      updatedBy, 
      'users:update'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to update users',
        403
      );
    }

    // Find the user to update
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Get updater info for hierarchy validation
    const updater = await this.userRepository.findById(updatedBy);
    if (!updater) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'Updater not found',
        404
      );
    }

    // If role is being updated, validate hierarchy
    if (updates.role && updates.role !== user.role) {
      if (!this.canManageUser(updater.role as UserRole, user.role as UserRole)) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Cannot update user with equal or higher role',
          403
        );
      }

      // Validate new role assignment
      if (!this.canAssignRole(updater.role as UserRole, updates.role)) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Cannot assign role equal or higher than your own',
          403
        );
      }
    }

    // Validate email uniqueness if email is being updated
    if (updates.email && updates.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR,
          'Email already exists',
          400
        );
      }
    }

    // Prepare update data for repository
    const updateData: any = {};
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;
    // Note: status updates are handled by blockUser/unblockUser methods

    // Update the user
    const updatedUser = await this.userRepository.update(userId, updateData);

    // Log the update activity
    await this.activityLogRepository.create({
      userId: updatedBy,
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        updates: updates,
        previousData: {
          email: user.email,
          role: user.role,
        },
      }),
    });

    return updatedUser as ExtendedUser;
  }

  /**
   * Block a user temporarily
   */
  async blockUser(
    userId: string, 
    blockedBy: string, 
    reason?: string
  ): Promise<ExtendedUser> {
    // Validate inputs
    if (!userId || !blockedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and blocker ID are required',
        400
      );
    }

    // Prevent self-blocking
    if (userId === blockedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Cannot block your own account',
        400
      );
    }

    // Check if blocker has permission
    const hasPermission = await this.permissionService.hasPermission(
      blockedBy, 
      'users:block'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to block users',
        403
      );
    }

    // Find the user to block
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Check if user is already blocked
    if ((user as any).status === UserStatus.BLOCKED) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User is already blocked',
        400
      );
    }

    // Get blocker info for hierarchy validation
    const blocker = await this.userRepository.findById(blockedBy);
    if (!blocker) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'Blocker not found',
        404
      );
    }

    // Validate admin hierarchy
    if (!this.canManageUser(blocker.role as UserRole, user.role as UserRole)) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Cannot block user with equal or higher role',
        403
      );
    }

    // Update user status to blocked
    // Note: In a real implementation, we'd update the extended user fields
    // For now, we'll use the existing update method and log the blocking
    const updatedUser = await this.userRepository.update(userId, {
      // We can't update status directly with current schema, 
      // but we'll log it and handle it in the extended implementation
    });

    // Log the blocking activity
    await this.activityLogRepository.create({
      userId: blockedBy,
      action: 'USER_BLOCKED',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        reason: reason || 'No reason provided',
        blockedAt: new Date().toISOString(),
      }),
    });

    return updatedUser as ExtendedUser;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, unblockedBy: string): Promise<ExtendedUser> {
    // Validate inputs
    if (!userId || !unblockedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and unblocker ID are required',
        400
      );
    }

    // Check if unblocker has permission
    const hasPermission = await this.permissionService.hasPermission(
      unblockedBy, 
      'users:unblock'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to unblock users',
        403
      );
    }

    // Find the user to unblock
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Check if user is actually blocked
    if ((user as any).status !== UserStatus.BLOCKED) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User is not blocked',
        400
      );
    }

    // Get unblocker info for hierarchy validation
    const unblocker = await this.userRepository.findById(unblockedBy);
    if (!unblocker) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'Unblocker not found',
        404
      );
    }

    // Validate admin hierarchy
    if (!this.canManageUser(unblocker.role as UserRole, user.role as UserRole)) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Cannot unblock user with equal or higher role',
        403
      );
    }

    // Update user status to active
    const updatedUser = await this.userRepository.update(userId, {
      // We can't update status directly with current schema, 
      // but we'll log it and handle it in the extended implementation
    });

    // Log the unblocking activity
    await this.activityLogRepository.create({
      userId: unblockedBy,
      action: 'USER_UNBLOCKED',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        unblockedAt: new Date().toISOString(),
      }),
    });

    return updatedUser as ExtendedUser;
  }

  /**
   * Check if a user can manage another user based on role hierarchy
   */
  private canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.QC]: 2,
      [UserRole.USER]: 1,
    };

    return roleHierarchy[managerRole] > roleHierarchy[targetRole];
  }

  /**
   * Check if a user can assign a specific role
   */
  private canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.QC]: 2,
      [UserRole.USER]: 1,
    };

    return roleHierarchy[assignerRole] > roleHierarchy[targetRole];
  }

  /**
   * Assign custom permissions to a user
   */
  async assignCustomPermissions(
    userId: string, 
    permissions: string[], 
    assignedBy: string
  ): Promise<UserPermission[]> {
    // Validate inputs
    if (!userId || !assignedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and assigner ID are required',
        400
      );
    }

    if (!permissions || permissions.length === 0) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'At least one permission must be specified',
        400
      );
    }

    // Check if assigner has permission to assign custom permissions
    const hasPermission = await this.permissionService.hasPermission(
      assignedBy, 
      'permissions:assign'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to assign custom permissions',
        403
      );
    }

    // Find the target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Get assigner info for hierarchy validation
    const assigner = await this.userRepository.findById(assignedBy);
    if (!assigner) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'Assigner not found',
        404
      );
    }

    // Validate admin hierarchy - can only assign permissions to users of lower hierarchy
    if (!this.canManageUser(assigner.role as UserRole, user.role as UserRole)) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Cannot assign permissions to user with equal or higher role',
        403
      );
    }

    const assignedPermissions: UserPermission[] = [];
    const errors: string[] = [];

    // Process each permission
    for (const permissionName of permissions) {
      try {
        // Check if assigner has the permission they're trying to assign
        const assignerHasPermission = await this.permissionService.hasPermission(
          assignedBy, 
          permissionName
        );
        if (!assignerHasPermission) {
          errors.push(`Cannot assign permission '${permissionName}' - assigner does not have this permission`);
          continue;
        }

        // Grant the permission
        const userPermission = await this.permissionService.grantUserPermission(
          userId, 
          permissionName, 
          assignedBy
        );
        assignedPermissions.push(userPermission);
      } catch (error: any) {
        if (error.statusCode === 409) {
          // User already has this permission - skip silently
          continue;
        }
        errors.push(`Failed to assign permission '${permissionName}': ${error.message}`);
      }
    }

    // Log the assignment activity
    await this.activityLogRepository.create({
      userId: assignedBy,
      action: 'CUSTOM_PERMISSIONS_ASSIGNED',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        assignedPermissions: assignedPermissions.map(p => p.permission?.name).filter(Boolean),
        errors: errors,
        totalRequested: permissions.length,
        totalAssigned: assignedPermissions.length,
      }),
    });

    // If there were errors but some permissions were assigned, include errors in response
    if (errors.length > 0 && assignedPermissions.length === 0) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        `Failed to assign permissions: ${errors.join(', ')}`,
        400
      );
    }

    return assignedPermissions;
  }

  /**
   * Revoke custom permissions from a user
   */
  async revokeCustomPermissions(
    userId: string, 
    permissions: string[], 
    revokedBy: string
  ): Promise<void> {
    // Validate inputs
    if (!userId || !revokedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User ID and revoker ID are required',
        400
      );
    }

    if (!permissions || permissions.length === 0) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'At least one permission must be specified',
        400
      );
    }

    // Check if revoker has permission to revoke custom permissions
    const hasPermission = await this.permissionService.hasPermission(
      revokedBy, 
      'permissions:revoke'
    );
    if (!hasPermission) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Insufficient permissions to revoke custom permissions',
        403
      );
    }

    // Find the target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Get revoker info for hierarchy validation
    const revoker = await this.userRepository.findById(revokedBy);
    if (!revoker) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'Revoker not found',
        404
      );
    }

    // Validate admin hierarchy - can only revoke permissions from users of lower hierarchy
    if (!this.canManageUser(revoker.role as UserRole, user.role as UserRole)) {
      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Cannot revoke permissions from user with equal or higher role',
        403
      );
    }

    const revokedPermissions: string[] = [];
    const errors: string[] = [];

    // Process each permission
    for (const permissionName of permissions) {
      try {
        await this.permissionService.revokeUserPermission(
          userId, 
          permissionName, 
          revokedBy
        );
        revokedPermissions.push(permissionName);
      } catch (error: any) {
        if (error.statusCode === 404) {
          // User doesn't have this custom permission - skip silently
          continue;
        }
        errors.push(`Failed to revoke permission '${permissionName}': ${error.message}`);
      }
    }

    // Log the revocation activity
    await this.activityLogRepository.create({
      userId: revokedBy,
      action: 'CUSTOM_PERMISSIONS_REVOKED',
      resourceType: 'user',
      resourceId: userId,
      details: JSON.stringify({
        targetUserId: userId,
        targetUserEmail: user.email,
        revokedPermissions: revokedPermissions,
        errors: errors,
        totalRequested: permissions.length,
        totalRevoked: revokedPermissions.length,
      }),
    });

    // If there were errors and no permissions were revoked, throw error
    if (errors.length > 0 && revokedPermissions.length === 0) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        `Failed to revoke permissions: ${errors.join(', ')}`,
        400
      );
    }
  }

  /**
   * Get user's effective permissions with conflict resolution
   */
  async getUserEffectivePermissions(userId: string): Promise<{
    rolePermissions: Permission[];
    customPermissions: Permission[];
    allPermissions: Permission[];
    conflicts: PermissionConflict[];
  }> {
    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND_ERROR,
        'User not found',
        404
      );
    }

    // Get effective permissions from PermissionService
    const effectivePermissions = await this.permissionService.getUserEffectivePermissions(userId);

    // Analyze conflicts between role and custom permissions
    const conflicts = this.analyzePermissionConflicts(
      effectivePermissions.rolePermissions,
      effectivePermissions.customPermissions,
      user.role as UserRole
    );

    // Resolve conflicts and create final permission list
    const resolvedPermissions = this.resolvePermissionConflicts(
      effectivePermissions.rolePermissions,
      effectivePermissions.customPermissions,
      conflicts
    );

    return {
      rolePermissions: effectivePermissions.rolePermissions,
      customPermissions: effectivePermissions.customPermissions,
      allPermissions: resolvedPermissions,
      conflicts: conflicts,
    };
  }

  /**
   * Analyze conflicts between role and custom permissions
   */
  private analyzePermissionConflicts(
    rolePermissions: Permission[],
    customPermissions: Permission[],
    userRole: UserRole
  ): PermissionConflict[] {
    const conflicts: PermissionConflict[] = [];
    const rolePermissionNames = new Set(rolePermissions.map(p => p.name));

    // Check for duplicate permissions (role and custom have same permission)
    for (const customPerm of customPermissions) {
      if (rolePermissionNames.has(customPerm.name)) {
        conflicts.push({
          permissionName: customPerm.name,
          conflictType: 'role_override',
          description: `Permission '${customPerm.name}' is granted by both role (${userRole}) and custom assignment`,
          resolution: 'role_takes_precedence'
        });
      }
    }

    // Check for custom permissions that might violate role hierarchy
    // (This is more of a warning than a conflict)
    for (const customPerm of customPermissions) {
      // Check if this permission is typically associated with higher roles
      if (this.isHigherRolePermission(customPerm.name, userRole)) {
        conflicts.push({
          permissionName: customPerm.name,
          conflictType: 'hierarchy_violation',
          description: `Permission '${customPerm.name}' is typically associated with higher roles than ${userRole}`,
          resolution: 'custom_overrides'
        });
      }
    }

    // Check for duplicate custom permissions (shouldn't happen but good to check)
    const seenCustomPermissions = new Set<string>();
    for (const customPerm of customPermissions) {
      if (seenCustomPermissions.has(customPerm.name)) {
        conflicts.push({
          permissionName: customPerm.name,
          conflictType: 'duplicate_custom',
          description: `Permission '${customPerm.name}' is assigned multiple times as custom permission`,
          resolution: 'custom_overrides'
        });
      }
      seenCustomPermissions.add(customPerm.name);
    }

    return conflicts;
  }

  /**
   * Resolve permission conflicts and return final permission list
   */
  private resolvePermissionConflicts(
    rolePermissions: Permission[],
    customPermissions: Permission[],
    conflicts: PermissionConflict[]
  ): Permission[] {
    const resolvedPermissions = new Map<string, Permission>();

    // Add all role permissions first (they take precedence)
    for (const rolePerm of rolePermissions) {
      resolvedPermissions.set(rolePerm.name, rolePerm);
    }

    // Add custom permissions, but only if they don't conflict with role permissions
    for (const customPerm of customPermissions) {
      const hasConflict = conflicts.some(
        c => c.permissionName === customPerm.name && c.conflictType === 'role_override'
      );

      if (!hasConflict) {
        resolvedPermissions.set(customPerm.name, customPerm);
      }
    }

    return Array.from(resolvedPermissions.values());
  }

  /**
   * Check if a permission is typically associated with higher roles
   */
  private isHigherRolePermission(permissionName: string, userRole: UserRole): boolean {
    // Define permissions that are typically associated with higher roles
    const adminPermissions = [
      'users:delete',
      'users:promote',
      'permissions:manage',
      'system:admin'
    ];

    const managerPermissions = [
      'processes:delete',
      'processes:reset',
      'users:block',
      'users:unblock'
    ];

    const qcPermissions = [
      'processes:validate',
      'processes:approve'
    ];

    const roleHierarchy = {
      [UserRole.ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.QC]: 2,
      [UserRole.USER]: 1,
    };

    const currentRoleLevel = roleHierarchy[userRole];

    // Check if permission requires higher role
    if (adminPermissions.includes(permissionName) && currentRoleLevel < roleHierarchy[UserRole.ADMIN]) {
      return true;
    }

    if (managerPermissions.includes(permissionName) && currentRoleLevel < roleHierarchy[UserRole.MANAGER]) {
      return true;
    }

    if (qcPermissions.includes(permissionName) && currentRoleLevel < roleHierarchy[UserRole.QC]) {
      return true;
    }

    return false;
  }

  /**
   * Get user by ID (utility method)
   */
  async getUserById(userId: string): Promise<ExtendedUser | null> {
    const user = await this.userRepository.findById(userId);
    return user as ExtendedUser;
  }

  /**
   * Get user by email (utility method)
   */
  async getUserByEmail(email: string): Promise<ExtendedUser | null> {
    const user = await this.userRepository.findByEmail(email);
    return user as ExtendedUser;
  }

  /**
   * Get all users with pagination (utility method)
   */
  async getUsers(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<ExtendedUser[]> {
    const users = await this.userRepository.findMany(options);
    return users as ExtendedUser[];
  }

  /**
   * Get all users with pagination and filtering for admin interface
   */
  async getAllUsers(
    page: number,
    limit: number,
    filters: {
      role?: UserRole;
      status?: UserStatus;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ users: ExtendedUser[]; total: number }> {
    console.log('UserService.getAllUsers called with filters:', filters);
    
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where: any = {};
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.status) {
      // Note: In current schema, we don't have status field
      // This would need to be implemented when schema is extended
      // For now, we'll skip this filter
    }
    
    if (filters.search) {
      console.log('Adding search filter for:', filters.search);
      where.email = { 
        contains: filters.search
      };
    }
    
    console.log('Final where clause:', JSON.stringify(where, null, 2));

    // Build orderBy clause
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    try {
      console.log('Executing user query with params:', { skip, limit, where, orderBy });
      
      // Get users with pagination
      const users = await this.userRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy,
      });

      console.log('Users query successful, found:', users.length, 'users');

      // Get total count for pagination
      const total = await this.userRepository.count(where);

      console.log('Total count:', total);

      return {
        users: users as ExtendedUser[],
        total,
      };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }
}