import { UserService } from '@/services/UserService';
import { UserRole, UserStatus, Permission, UserPermission } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import bcrypt from 'bcrypt';

// Mock dependencies
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
} as any;

const mockActivityLogRepository = {
  create: jest.fn(),
} as any;

const mockPermissionService = {
  hasPermission: jest.fn(),
  grantUserPermission: jest.fn(),
  revokeUserPermission: jest.fn(),
  getUserEffectivePermissions: jest.fn(),
} as any;

describe('UserService', () => {
  let userService: UserService;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    userService = new UserService(
      mockUserRepository,
      mockActivityLogRepository,
      mockPermissionService
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('promoteToAdmin', () => {
    it('should successfully promote a user to admin', async () => {
      // Arrange
      const userId = 'user-1';
      const promotedBy = 'admin-1';
      const updatedUser = { ...mockUser, role: UserRole.ADMIN };

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);
      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      const result = await userService.promoteToAdmin(userId, promotedBy);

      // Assert
      expect(result.role).toBe(UserRole.ADMIN);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(promotedBy, 'users:promote');
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { role: UserRole.ADMIN });
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error if promoter lacks permission', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(userService.promoteToAdmin('user-1', 'user-2'))
        .rejects.toThrow(CustomError);
      
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.promoteToAdmin('nonexistent', 'admin-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user', async () => {
      // Arrange
      const userId = 'user-1';
      const deletedBy = 'admin-1';

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser) // target user
        .mockResolvedValueOnce(mockAdmin); // deleter
      mockUserRepository.delete.mockResolvedValue(undefined);
      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      await userService.deleteUser(userId, deletedBy);

      // Assert
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(deletedBy, 'users:delete');
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should prevent self-deletion', async () => {
      // Act & Assert
      await expect(userService.deleteUser('user-1', 'user-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('updateUser', () => {
    it('should successfully update user information', async () => {
      // Arrange
      const userId = 'user-1';
      const updatedBy = 'admin-1';
      const updates = { email: 'newemail@example.com', role: UserRole.QC };
      const updatedUser = { ...mockUser, ...updates };

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser) // target user
        .mockResolvedValueOnce(mockAdmin); // updater
      mockUserRepository.findByEmail.mockResolvedValue(null); // email not taken
      mockUserRepository.update.mockResolvedValue(updatedUser);
      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      const result = await userService.updateUser(userId, updates, updatedBy);

      // Assert
      expect(result.email).toBe(updates.email);
      expect(result.role).toBe(updates.role);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        email: updates.email,
        role: updates.role,
      });
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error if no updates provided', async () => {
      // Act & Assert
      await expect(userService.updateUser('user-1', {}, 'admin-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('blockUser', () => {
    it('should successfully block a user', async () => {
      // Arrange
      const userId = 'user-1';
      const blockedBy = 'admin-1';
      const reason = 'Violation of terms';

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser) // target user
        .mockResolvedValueOnce(mockAdmin); // blocker
      mockUserRepository.update.mockResolvedValue(mockUser);
      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      await userService.blockUser(userId, blockedBy, reason);

      // Assert
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(blockedBy, 'users:block');
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should prevent self-blocking', async () => {
      // Act & Assert
      await expect(userService.blockUser('user-1', 'user-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('assignCustomPermissions', () => {
    const mockPermission: Permission = {
      id: 'perm-1',
      name: 'processes:view',
      description: 'View processes',
      resource: 'processes',
      action: 'view',
      createdAt: new Date(),
    };

    const mockUserPermission: UserPermission = {
      id: 'user-perm-1',
      userId: 'user-1',
      permissionId: 'perm-1',
      grantedBy: 'admin-1',
      grantedAt: new Date(),
      permission: mockPermission,
    };

    it('should successfully assign custom permissions to a user', async () => {
      // Arrange
      const userId = 'user-1';
      const assignedBy = 'admin-1';
      const permissions = ['processes:view', 'processes:edit'];

      mockPermissionService.hasPermission
        .mockResolvedValueOnce(true) // permissions:assign
        .mockResolvedValueOnce(true) // processes:view
        .mockResolvedValueOnce(true); // processes:edit
      
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser) // target user
        .mockResolvedValueOnce(mockAdmin); // assigner

      mockPermissionService.grantUserPermission
        .mockResolvedValueOnce(mockUserPermission)
        .mockResolvedValueOnce({ ...mockUserPermission, id: 'user-perm-2' });

      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      const result = await userService.assignCustomPermissions(userId, permissions, assignedBy);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(assignedBy, 'permissions:assign');
      expect(mockPermissionService.grantUserPermission).toHaveBeenCalledTimes(2);
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error if assigner lacks permission to assign', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(userService.assignCustomPermissions('user-1', ['processes:view'], 'user-2'))
        .rejects.toThrow(CustomError);
      
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if target user not found', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.assignCustomPermissions('nonexistent', ['processes:view'], 'admin-1'))
        .rejects.toThrow(CustomError);
    });

    it('should throw error if trying to assign to higher hierarchy user', async () => {
      // Arrange
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      
      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockAdmin) // target user (admin)
        .mockResolvedValueOnce(managerUser); // assigner (manager)

      // Act & Assert
      await expect(userService.assignCustomPermissions('admin-1', ['processes:view'], 'manager-1'))
        .rejects.toThrow(CustomError);
    });

    it('should skip permissions that assigner does not have', async () => {
      // Arrange
      const userId = 'user-1';
      const assignedBy = 'admin-1';
      const permissions = ['processes:view', 'system:admin'];

      mockPermissionService.hasPermission
        .mockResolvedValueOnce(true) // permissions:assign
        .mockResolvedValueOnce(true) // processes:view
        .mockResolvedValueOnce(false); // system:admin

      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);

      mockPermissionService.grantUserPermission
        .mockResolvedValueOnce(mockUserPermission);

      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      const result = await userService.assignCustomPermissions(userId, permissions, assignedBy);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPermissionService.grantUserPermission).toHaveBeenCalledTimes(1);
    });

    it('should throw error if no permissions provided', async () => {
      // Act & Assert
      await expect(userService.assignCustomPermissions('user-1', [], 'admin-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('revokeCustomPermissions', () => {
    it('should successfully revoke custom permissions from a user', async () => {
      // Arrange
      const userId = 'user-1';
      const revokedBy = 'admin-1';
      const permissions = ['processes:view', 'processes:edit'];

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);

      mockPermissionService.revokeUserPermission
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      await userService.revokeCustomPermissions(userId, permissions, revokedBy);

      // Assert
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(revokedBy, 'permissions:revoke');
      expect(mockPermissionService.revokeUserPermission).toHaveBeenCalledTimes(2);
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error if revoker lacks permission', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(userService.revokeCustomPermissions('user-1', ['processes:view'], 'user-2'))
        .rejects.toThrow(CustomError);
    });

    it('should throw error if target user not found', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.revokeCustomPermissions('nonexistent', ['processes:view'], 'admin-1'))
        .rejects.toThrow(CustomError);
    });

    it('should skip permissions that user does not have', async () => {
      // Arrange
      const userId = 'user-1';
      const revokedBy = 'admin-1';
      const permissions = ['processes:view', 'processes:edit'];

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);

      mockPermissionService.revokeUserPermission
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new CustomError(ErrorType.NOT_FOUND, 'Permission not found', 404));

      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      await userService.revokeCustomPermissions(userId, permissions, revokedBy);

      // Assert
      expect(mockPermissionService.revokeUserPermission).toHaveBeenCalledTimes(2);
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error if no permissions provided', async () => {
      // Act & Assert
      await expect(userService.revokeCustomPermissions('user-1', [], 'admin-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('getUserEffectivePermissions', () => {
    const mockRolePermission: Permission = {
      id: 'role-perm-1',
      name: 'users:view',
      description: 'View users',
      resource: 'users',
      action: 'view',
      createdAt: new Date(),
    };

    const mockCustomPermission: Permission = {
      id: 'custom-perm-1',
      name: 'processes:delete',
      description: 'Delete processes',
      resource: 'processes',
      action: 'delete',
      createdAt: new Date(),
    };

    it('should return effective permissions with conflict analysis', async () => {
      // Arrange
      const userId = 'user-1';
      const effectivePermissions = {
        rolePermissions: [mockRolePermission],
        customPermissions: [mockCustomPermission],
        allPermissions: [mockRolePermission, mockCustomPermission],
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPermissionService.getUserEffectivePermissions.mockResolvedValue(effectivePermissions);

      // Act
      const result = await userService.getUserEffectivePermissions(userId);

      // Assert
      expect(result.rolePermissions).toEqual([mockRolePermission]);
      expect(result.customPermissions).toEqual([mockCustomPermission]);
      expect(result.allPermissions).toHaveLength(2);
      expect(result.conflicts).toEqual(expect.any(Array));
    });

    it('should detect role override conflicts', async () => {
      // Arrange
      const userId = 'user-1';
      const duplicatePermission: Permission = {
        id: 'dup-perm-1',
        name: 'users:view',
        description: 'View users (custom)',
        resource: 'users',
        action: 'view',
        createdAt: new Date(),
      };

      const effectivePermissions = {
        rolePermissions: [mockRolePermission],
        customPermissions: [duplicatePermission],
        allPermissions: [mockRolePermission, duplicatePermission],
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPermissionService.getUserEffectivePermissions.mockResolvedValue(effectivePermissions);

      // Act
      const result = await userService.getUserEffectivePermissions(userId);

      // Assert
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]?.conflictType).toBe('role_override');
      expect(result.conflicts[0]?.permissionName).toBe('users:view');
      expect(result.allPermissions).toHaveLength(1); // Duplicate removed
    });

    it('should detect hierarchy violation conflicts', async () => {
      // Arrange
      const userId = 'user-1';
      const adminPermission: Permission = {
        id: 'admin-perm-1',
        name: 'users:delete',
        description: 'Delete users',
        resource: 'users',
        action: 'delete',
        createdAt: new Date(),
      };

      const effectivePermissions = {
        rolePermissions: [],
        customPermissions: [adminPermission],
        allPermissions: [adminPermission],
      };

      mockUserRepository.findById.mockResolvedValue(mockUser); // USER role
      mockPermissionService.getUserEffectivePermissions.mockResolvedValue(effectivePermissions);

      // Act
      const result = await userService.getUserEffectivePermissions(userId);

      // Assert
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]?.conflictType).toBe('hierarchy_violation');
      expect(result.conflicts[0]?.permissionName).toBe('users:delete');
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserEffectivePermissions('nonexistent'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('utility methods', () => {
    it('should get user by ID', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById('user-1');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    });

    it('should get users with pagination', async () => {
      // Arrange
      const users = [mockUser, mockAdmin];
      const options = { skip: 0, take: 10 };
      mockUserRepository.findMany.mockResolvedValue(users);

      // Act
      const result = await userService.getUsers(options);

      // Assert
      expect(result).toEqual(users);
      expect(mockUserRepository.findMany).toHaveBeenCalledWith(options);
    });

    it('should get user by email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail('user@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should return null for non-existent user by ID', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-existent user by email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('password management', () => {
    it('should hash password correctly', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Mock bcrypt.hash
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);

      // Act
      const result = await userService.hashPassword(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should verify password correctly', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword';
      
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // Act
      const result = await userService.verifyPassword(password, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const password = 'wrongPassword';
      const hashedPassword = 'hashedPassword';
      
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      // Act
      const result = await userService.verifyPassword(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('user statistics', () => {
    it('should get user statistics', async () => {
      // Arrange
      const users = [
        { ...mockUser, role: UserRole.USER, status: UserStatus.ACTIVE },
        { ...mockAdmin, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        { ...mockUser, id: 'user-2', role: UserRole.QC, status: UserStatus.BLOCKED },
        { ...mockUser, id: 'user-3', role: UserRole.MANAGER, status: UserStatus.ACTIVE },
      ];
      mockUserRepository.findMany.mockResolvedValue(users);

      // Act
      const stats = await userService.getUserStatistics();

      // Assert
      expect(stats.totalUsers).toBe(4);
      expect(stats.activeUsers).toBe(3);
      expect(stats.blockedUsers).toBe(1);
      expect(stats.usersByRole[UserRole.USER]).toBe(1);
      expect(stats.usersByRole[UserRole.ADMIN]).toBe(1);
      expect(stats.usersByRole[UserRole.QC]).toBe(1);
      expect(stats.usersByRole[UserRole.MANAGER]).toBe(1);
    });
  });

  describe('user search and filtering', () => {
    it('should search users by email pattern', async () => {
      // Arrange
      const users = [mockUser, mockAdmin];
      const searchOptions = { emailPattern: '@example.com' };
      mockUserRepository.findMany.mockResolvedValue(users);

      // Act
      const result = await userService.searchUsers(searchOptions);

      // Assert
      expect(result).toEqual(users);
      expect(mockUserRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: expect.objectContaining({
              contains: '@example.com'
            })
          })
        })
      );
    });

    it('should filter users by role', async () => {
      // Arrange
      const admins = [mockAdmin];
      const filterOptions = { role: UserRole.ADMIN };
      mockUserRepository.findMany.mockResolvedValue(admins);

      // Act
      const result = await userService.searchUsers(filterOptions);

      // Assert
      expect(result).toEqual(admins);
      expect(mockUserRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.ADMIN
          })
        })
      );
    });

    it('should filter users by status', async () => {
      // Arrange
      const activeUsers = [mockUser, mockAdmin];
      const filterOptions = { status: UserStatus.ACTIVE };
      mockUserRepository.findMany.mockResolvedValue(activeUsers);

      // Act
      const result = await userService.searchUsers(filterOptions);

      // Assert
      expect(result).toEqual(activeUsers);
      expect(mockUserRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.ACTIVE
          })
        })
      );
    });
  });

  describe('bulk operations', () => {
    it('should perform bulk user updates', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];
      const updates = { status: UserStatus.BLOCKED };
      const updatedBy = 'admin-1';

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.updateMany.mockResolvedValue({ count: 2 });
      mockActivityLogRepository.create.mockResolvedValue({});

      // Act
      const result = await userService.bulkUpdateUsers(userIds, updates, updatedBy);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockUserRepository.updateMany).toHaveBeenCalledWith(userIds, updates);
      expect(mockActivityLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error for bulk operations without permission', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(userService.bulkUpdateUsers(['user-1'], { status: UserStatus.BLOCKED }, 'user-2'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(userService.getUserById('user-1'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle permission service errors', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockRejectedValue(new Error('Permission service unavailable'));

      // Act & Assert
      await expect(userService.promoteToAdmin('user-1', 'admin-1'))
        .rejects.toThrow('Permission service unavailable');
    });

    it('should handle activity log errors gracefully', async () => {
      // Arrange
      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });
      mockActivityLogRepository.create.mockRejectedValue(new Error('Logging failed'));

      // Act - should not throw error even if logging fails
      const result = await userService.promoteToAdmin('user-1', 'admin-1');

      // Assert
      expect(result.role).toBe(UserRole.ADMIN);
    });
  });
});