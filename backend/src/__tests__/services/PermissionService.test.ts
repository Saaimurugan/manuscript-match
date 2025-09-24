import { PermissionService } from '../../services/PermissionService';
import { PermissionRepository } from '../../repositories/PermissionRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { ActivityLogRepository } from '../../repositories/ActivityLogRepository';
import { UserRole } from '../../types';
import { CustomError } from '../../middleware/errorHandler';

// Mock repositories
const mockPermissionRepository = {
  hasPermission: jest.fn(),
  findRolePermissions: jest.fn(),
  findUserPermissions: jest.fn(),
  getUserEffectivePermissions: jest.fn(),
  findByName: jest.fn(),
  findUserPermission: jest.fn(),
  createUserPermission: jest.fn(),
  deleteUserPermission: jest.fn(),
  deleteAllRolePermissions: jest.fn(),
  createRolePermission: jest.fn(),
  findMany: jest.fn(),
} as unknown as PermissionRepository;

const mockUserRepository = {
  findById: jest.fn(),
  findMany: jest.fn(),
} as unknown as UserRepository;

const mockActivityLogRepository = {
  create: jest.fn(),
} as unknown as ActivityLogRepository;

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService(
      mockPermissionRepository,
      mockUserRepository,
      mockActivityLogRepository
    );
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    role: UserRole.USER,
    passwordHash: 'hash',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    passwordHash: 'hash',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPermission = {
    id: 'perm-1',
    name: 'users.read',
    description: 'Read users',
    resource: 'users',
    action: 'read',
    createdAt: new Date(),
  };

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockPermissionRepository.hasPermission as jest.Mock).mockResolvedValue(true);

      const result = await service.hasPermission('user-1', 'users.read');

      expect(result).toBe(true);
      expect(mockPermissionRepository.hasPermission).toHaveBeenCalledWith(
        'user-1',
        UserRole.USER,
        'users.read'
      );
    });

    it('should return false when user does not have permission', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockPermissionRepository.hasPermission as jest.Mock).mockResolvedValue(false);

      const result = await service.hasPermission('user-1', 'users.delete');

      expect(result).toBe(false);
    });

    it('should throw error when user not found', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.hasPermission('invalid-id', 'users.read'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('checkPermissions', () => {
    it('should return success when user has all permissions', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockPermissionRepository.hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const result = await service.checkPermissions('user-1', ['users.read', 'processes.read']);

      expect(result).toEqual({
        hasPermission: true,
        missingPermissions: [],
      });
    });

    it('should return missing permissions when user lacks some permissions', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockPermissionRepository.hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.checkPermissions('user-1', ['users.read', 'users.delete']);

      expect(result).toEqual({
        hasPermission: false,
        missingPermissions: ['users.delete'],
      });
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should return combined role and custom permissions', async () => {
      const rolePermissions = [
        { permission: { ...mockPermission, name: 'users.read' } },
      ];
      const userPermissions = [
        { permission: { ...mockPermission, name: 'users.write' } },
      ];
      const allPermissions = [
        { ...mockPermission, name: 'users.read' },
        { ...mockPermission, name: 'users.write' },
      ];

      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockPermissionRepository.findRolePermissions as jest.Mock).mockResolvedValue(rolePermissions);
      (mockPermissionRepository.findUserPermissions as jest.Mock).mockResolvedValue(userPermissions);
      (mockPermissionRepository.getUserEffectivePermissions as jest.Mock).mockResolvedValue(allPermissions);

      const result = await service.getUserEffectivePermissions('user-1');

      expect(result.rolePermissions).toHaveLength(1);
      expect(result.customPermissions).toHaveLength(1);
      expect(result.allPermissions).toHaveLength(2);
    });
  });

  describe('grantUserPermission', () => {
    it('should grant permission successfully', async () => {
      const mockUserPermission = {
        id: 'up-1',
        userId: 'user-1',
        permissionId: 'perm-1',
        grantedBy: 'admin-1',
        grantedAt: new Date(),
      };

      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.hasPermission as jest.Mock)
        .mockResolvedValueOnce(true) // granter has permission
        .mockResolvedValueOnce(true); // granter can assign permissions
      (mockPermissionRepository.findUserPermission as jest.Mock).mockResolvedValue(null);
      (mockPermissionRepository.createUserPermission as jest.Mock).mockResolvedValue(mockUserPermission);

      const result = await service.grantUserPermission('user-1', 'users.read', 'admin-1');

      expect(result).toEqual(mockUserPermission);
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'PERMISSION_GRANTED',
        details: JSON.stringify({
          targetUserId: 'user-1',
          targetUserEmail: 'user@test.com',
          permissionName: 'users.read',
          permissionId: 'perm-1',
        }),
        resourceType: 'permission',
        resourceId: 'perm-1',
      });
    });

    it('should throw error when user not found', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.grantUserPermission('invalid-id', 'users.read', 'admin-1'))
        .rejects.toThrow(CustomError);
    });

    it('should throw error when permission not found', async () => {
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(null);

      await expect(service.grantUserPermission('user-1', 'invalid.permission', 'admin-1'))
        .rejects.toThrow(CustomError);
    });

    it('should throw error when granter lacks permission', async () => {
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser); // granter is regular user
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.hasPermission as jest.Mock)
        .mockResolvedValueOnce(false); // granter doesn't have permission

      await expect(service.grantUserPermission('user-1', 'users.read', 'user-2'))
        .rejects.toThrow(CustomError);
    });

    it('should throw error when user already has permission', async () => {
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      (mockPermissionRepository.findUserPermission as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.grantUserPermission('user-1', 'users.read', 'admin-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('revokeUserPermission', () => {
    it('should revoke permission successfully', async () => {
      const existingPermission = {
        id: 'up-1',
        userId: 'user-1',
        permissionId: 'perm-1',
        grantedBy: 'admin-1',
        grantedAt: new Date(),
      };

      // Mock the sequence of calls
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)      // First call in revokeUserPermission
        .mockResolvedValueOnce(mockAdmin)     // Second call in revokeUserPermission
        .mockResolvedValueOnce(mockAdmin);    // Third call in canRevokePermission -> hasPermission
      
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.hasPermission as jest.Mock).mockResolvedValue(true); // For canRevokePermission
      (mockPermissionRepository.findUserPermission as jest.Mock).mockResolvedValue(existingPermission);
      (mockPermissionRepository.deleteUserPermission as jest.Mock).mockResolvedValue(undefined);

      await service.revokeUserPermission('user-1', 'users.read', 'admin-1');

      expect(mockPermissionRepository.deleteUserPermission).toHaveBeenCalledWith('user-1', 'perm-1');
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'PERMISSION_REVOKED',
        details: JSON.stringify({
          targetUserId: 'user-1',
          targetUserEmail: 'user@test.com',
          permissionName: 'users.read',
          permissionId: 'perm-1',
        }),
        resourceType: 'permission',
        resourceId: 'perm-1',
      });
    });

    it('should throw error when user does not have custom permission', async () => {
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.hasPermission as jest.Mock).mockResolvedValue(true);
      (mockPermissionRepository.findUserPermission as jest.Mock).mockResolvedValue(null);

      await expect(service.revokeUserPermission('user-1', 'users.read', 'admin-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('updateRolePermissions', () => {
    it('should update role permissions successfully', async () => {
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockAdmin) // For initial user lookup
        .mockResolvedValueOnce(mockAdmin); // For hasPermission call
      (mockPermissionRepository.hasPermission as jest.Mock).mockResolvedValue(true);
      (mockPermissionRepository.findByName as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.deleteAllRolePermissions as jest.Mock).mockResolvedValue(undefined);
      (mockPermissionRepository.createRolePermission as jest.Mock).mockResolvedValue({});

      await service.updateRolePermissions(UserRole.USER, ['users.read'], 'admin-1');

      expect(mockPermissionRepository.deleteAllRolePermissions).toHaveBeenCalledWith(UserRole.USER);
      expect(mockPermissionRepository.createRolePermission).toHaveBeenCalledWith({
        role: UserRole.USER,
        permissionId: 'perm-1',
      });
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'ROLE_PERMISSIONS_UPDATED',
        details: JSON.stringify({
          role: UserRole.USER,
          permissionNames: ['users.read'],
          permissionCount: 1,
        }),
        resourceType: 'role',
        resourceId: UserRole.USER,
      });
    });

    it('should throw error when updater lacks permissions', async () => {
      (mockUserRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser) // For initial user lookup
        .mockResolvedValueOnce(mockUser); // For hasPermission call
      (mockPermissionRepository.hasPermission as jest.Mock).mockResolvedValue(false);

      await expect(service.updateRolePermissions(UserRole.USER, ['users.read'], 'user-1'))
        .rejects.toThrow(CustomError);
    });
  });

  describe('Role Hierarchy', () => {
    describe('getRoleHierarchyLevel', () => {
      it('should return correct hierarchy levels', () => {
        expect(PermissionService.getRoleHierarchyLevel(UserRole.ADMIN)).toBe(4);
        expect(PermissionService.getRoleHierarchyLevel(UserRole.MANAGER)).toBe(3);
        expect(PermissionService.getRoleHierarchyLevel(UserRole.QC)).toBe(2);
        expect(PermissionService.getRoleHierarchyLevel(UserRole.USER)).toBe(1);
      });
    });

    describe('isHigherRole', () => {
      it('should correctly compare role hierarchy', () => {
        expect(PermissionService.isHigherRole(UserRole.ADMIN, UserRole.USER)).toBe(true);
        expect(PermissionService.isHigherRole(UserRole.MANAGER, UserRole.QC)).toBe(true);
        expect(PermissionService.isHigherRole(UserRole.USER, UserRole.ADMIN)).toBe(false);
        expect(PermissionService.isHigherRole(UserRole.QC, UserRole.QC)).toBe(false);
      });
    });

    describe('hasHigherHierarchy', () => {
      it('should return true when user A has higher role than user B', async () => {
        (mockUserRepository.findById as jest.Mock)
          .mockResolvedValueOnce(mockAdmin)
          .mockResolvedValueOnce(mockUser);

        const result = await service.hasHigherHierarchy('admin-1', 'user-1');

        expect(result).toBe(true);
      });

      it('should return false when user A has lower role than user B', async () => {
        (mockUserRepository.findById as jest.Mock)
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAdmin);

        const result = await service.hasHigherHierarchy('user-1', 'admin-1');

        expect(result).toBe(false);
      });

      it('should return false when users not found', async () => {
        (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

        const result = await service.hasHigherHierarchy('invalid-1', 'invalid-2');

        expect(result).toBe(false);
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const rolePermissions = [
        { permission: mockPermission },
      ];

      (mockPermissionRepository.findRolePermissions as jest.Mock).mockResolvedValue(rolePermissions);

      const result = await service.getRolePermissions(UserRole.USER);

      expect(result).toEqual([mockPermission]);
      expect(mockPermissionRepository.findRolePermissions).toHaveBeenCalledWith(UserRole.USER);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all available permissions', async () => {
      const permissions = [mockPermission];

      (mockPermissionRepository.findMany as jest.Mock).mockResolvedValue(permissions);

      const result = await service.getAllPermissions();

      expect(result).toEqual(permissions);
      expect(mockPermissionRepository.findMany).toHaveBeenCalled();
    });
  });
});