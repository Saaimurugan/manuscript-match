import { PrismaClient } from '@prisma/client';
import { PermissionRepository } from '../../repositories/PermissionRepository';
import { UserRole } from '../../types';

// Mock Prisma Client
const mockPrisma = {
  permission: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
  },
  userPermission: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
  },
  rolePermission: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
  },
} as unknown as PrismaClient;

describe('PermissionRepository', () => {
  let repository: PermissionRepository;

  beforeEach(() => {
    repository = new PermissionRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('Permission CRUD Operations', () => {
    const mockPermission = {
      id: 'perm-1',
      name: 'users.read',
      description: 'Read user information',
      resource: 'users',
      action: 'read',
      createdAt: new Date(),
    };

    describe('create', () => {
      it('should create a new permission', async () => {
        const createData = {
          name: 'users.read',
          description: 'Read user information',
          resource: 'users',
          action: 'read',
        };

        (mockPrisma.permission.create as jest.Mock).mockResolvedValue(mockPermission);

        const result = await repository.create(createData);

        expect(mockPrisma.permission.create).toHaveBeenCalledWith({
          data: createData,
        });
        expect(result).toEqual(mockPermission);
      });
    });

    describe('findById', () => {
      it('should find permission by id', async () => {
        (mockPrisma.permission.findUnique as jest.Mock).mockResolvedValue(mockPermission);

        const result = await repository.findById('perm-1');

        expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
          where: { id: 'perm-1' },
        });
        expect(result).toEqual(mockPermission);
      });

      it('should throw error for invalid id', async () => {
        await expect(repository.findById('')).rejects.toThrow('Invalid ID provided');
        await expect(repository.findById(null as any)).rejects.toThrow('Invalid ID provided');
      });
    });

    describe('findByName', () => {
      it('should find permission by name', async () => {
        (mockPrisma.permission.findUnique as jest.Mock).mockResolvedValue(mockPermission);

        const result = await repository.findByName('users.read');

        expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
          where: { name: 'users.read' },
        });
        expect(result).toEqual(mockPermission);
      });

      it('should throw error for invalid name', async () => {
        await expect(repository.findByName('')).rejects.toThrow('Invalid permission name provided');
        await expect(repository.findByName(null as any)).rejects.toThrow('Invalid permission name provided');
      });
    });

    describe('findMany', () => {
      it('should find permissions with default options', async () => {
        const mockPermissions = [mockPermission];
        (mockPrisma.permission.findMany as jest.Mock).mockResolvedValue(mockPermissions);

        const result = await repository.findMany();

        expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
          orderBy: { name: 'asc' },
        });
        expect(result).toEqual(mockPermissions);
      });

      it('should find permissions with custom options', async () => {
        const mockPermissions = [mockPermission];
        (mockPrisma.permission.findMany as jest.Mock).mockResolvedValue(mockPermissions);

        const options = {
          skip: 10,
          take: 5,
          orderBy: { createdAt: 'desc' },
          where: { resource: 'users' },
        };

        const result = await repository.findMany(options);

        expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
          skip: 10,
          take: 5,
          orderBy: { createdAt: 'desc' },
          where: { resource: 'users' },
        });
        expect(result).toEqual(mockPermissions);
      });
    });

    describe('update', () => {
      it('should update permission', async () => {
        const updateData = { description: 'Updated description' };
        const updatedPermission = { ...mockPermission, ...updateData };
        (mockPrisma.permission.update as jest.Mock).mockResolvedValue(updatedPermission);

        const result = await repository.update('perm-1', updateData);

        expect(mockPrisma.permission.update).toHaveBeenCalledWith({
          where: { id: 'perm-1' },
          data: updateData,
        });
        expect(result).toEqual(updatedPermission);
      });
    });

    describe('delete', () => {
      it('should delete permission', async () => {
        (mockPrisma.permission.delete as jest.Mock).mockResolvedValue(mockPermission);

        await repository.delete('perm-1');

        expect(mockPrisma.permission.delete).toHaveBeenCalledWith({
          where: { id: 'perm-1' },
        });
      });
    });
  });

  describe('User Permission Operations', () => {
    const mockUserPermission = {
      id: 'up-1',
      userId: 'user-1',
      permissionId: 'perm-1',
      grantedBy: 'admin-1',
      grantedAt: new Date(),
    };

    describe('createUserPermission', () => {
      it('should create user permission', async () => {
        const createData = {
          userId: 'user-1',
          permissionId: 'perm-1',
          grantedBy: 'admin-1',
        };

        (mockPrisma.userPermission.create as jest.Mock).mockResolvedValue(mockUserPermission);

        const result = await repository.createUserPermission(createData);

        expect(mockPrisma.userPermission.create).toHaveBeenCalledWith({
          data: createData,
        });
        expect(result).toEqual(mockUserPermission);
      });
    });

    describe('findUserPermission', () => {
      it('should find user permission', async () => {
        (mockPrisma.userPermission.findUnique as jest.Mock).mockResolvedValue(mockUserPermission);

        const result = await repository.findUserPermission('user-1', 'perm-1');

        expect(mockPrisma.userPermission.findUnique).toHaveBeenCalledWith({
          where: {
            userId_permissionId: {
              userId: 'user-1',
              permissionId: 'perm-1',
            },
          },
        });
        expect(result).toEqual(mockUserPermission);
      });
    });

    describe('findUserPermissions', () => {
      it('should find all user permissions', async () => {
        const mockUserPermissions = [
          {
            ...mockUserPermission,
            permission: { name: 'users.read' },
            granter: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
          },
        ];
        (mockPrisma.userPermission.findMany as jest.Mock).mockResolvedValue(mockUserPermissions);

        const result = await repository.findUserPermissions('user-1');

        expect(mockPrisma.userPermission.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          include: {
            permission: true,
            granter: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });
        expect(result).toEqual(mockUserPermissions);
      });
    });

    describe('deleteUserPermission', () => {
      it('should delete user permission', async () => {
        (mockPrisma.userPermission.delete as jest.Mock).mockResolvedValue(mockUserPermission);

        await repository.deleteUserPermission('user-1', 'perm-1');

        expect(mockPrisma.userPermission.delete).toHaveBeenCalledWith({
          where: {
            userId_permissionId: {
              userId: 'user-1',
              permissionId: 'perm-1',
            },
          },
        });
      });
    });
  });

  describe('Role Permission Operations', () => {
    const mockRolePermission = {
      id: 'rp-1',
      role: UserRole.ADMIN,
      permissionId: 'perm-1',
    };

    describe('createRolePermission', () => {
      it('should create role permission', async () => {
        const createData = {
          role: UserRole.ADMIN,
          permissionId: 'perm-1',
        };

        (mockPrisma.rolePermission.create as jest.Mock).mockResolvedValue(mockRolePermission);

        const result = await repository.createRolePermission(createData);

        expect(mockPrisma.rolePermission.create).toHaveBeenCalledWith({
          data: {
            role: UserRole.ADMIN,
            permissionId: 'perm-1',
          },
        });
        expect(result).toEqual(mockRolePermission);
      });
    });

    describe('findRolePermissions', () => {
      it('should find role permissions', async () => {
        const mockRolePermissions = [
          {
            ...mockRolePermission,
            permission: { name: 'users.read' },
          },
        ];
        (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue(mockRolePermissions);

        const result = await repository.findRolePermissions(UserRole.ADMIN);

        expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
          where: { role: UserRole.ADMIN },
          include: {
            permission: true,
          },
        });
        expect(result).toEqual(mockRolePermissions);
      });
    });
  });

  describe('Permission Checking Operations', () => {
    describe('getUserEffectivePermissions', () => {
      it('should get combined role and user permissions', async () => {
        const mockRolePermissions = [
          {
            permission: {
              id: 'perm-1',
              name: 'users.read',
              description: 'Read users',
              resource: 'users',
              action: 'read',
              createdAt: new Date(),
            },
          },
        ];

        const mockUserPermissions = [
          {
            permission: {
              id: 'perm-2',
              name: 'users.write',
              description: 'Write users',
              resource: 'users',
              action: 'write',
              createdAt: new Date(),
            },
          },
        ];

        (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue(mockRolePermissions);
        (mockPrisma.userPermission.findMany as jest.Mock).mockResolvedValue(mockUserPermissions);

        const result = await repository.getUserEffectivePermissions('user-1', UserRole.USER);

        expect(result).toHaveLength(2);
        expect(result.map(p => p.name)).toContain('users.read');
        expect(result.map(p => p.name)).toContain('users.write');
      });

      it('should deduplicate permissions', async () => {
        const duplicatePermission = {
          id: 'perm-1',
          name: 'users.read',
          description: 'Read users',
          resource: 'users',
          action: 'read',
          createdAt: new Date(),
        };

        const mockRolePermissions = [{ permission: duplicatePermission }];
        const mockUserPermissions = [{ permission: duplicatePermission }];

        (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue(mockRolePermissions);
        (mockPrisma.userPermission.findMany as jest.Mock).mockResolvedValue(mockUserPermissions);

        const result = await repository.getUserEffectivePermissions('user-1', UserRole.USER);

        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe('users.read');
      });
    });

    describe('hasPermission', () => {
      it('should return true for user permission', async () => {
        (mockPrisma.userPermission.findFirst as jest.Mock).mockResolvedValue({ id: 'up-1' });

        const result = await repository.hasPermission('user-1', UserRole.USER, 'users.read');

        expect(result).toBe(true);
        expect(mockPrisma.userPermission.findFirst).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            permission: {
              name: 'users.read',
            },
          },
        });
      });

      it('should return true for role permission when no user permission', async () => {
        (mockPrisma.userPermission.findFirst as jest.Mock).mockResolvedValue(null);
        (mockPrisma.rolePermission.findFirst as jest.Mock).mockResolvedValue({ id: 'rp-1' });

        const result = await repository.hasPermission('user-1', UserRole.ADMIN, 'users.read');

        expect(result).toBe(true);
        expect(mockPrisma.rolePermission.findFirst).toHaveBeenCalledWith({
          where: {
            role: UserRole.ADMIN,
            permission: {
              name: 'users.read',
            },
          },
        });
      });

      it('should return false when no permission found', async () => {
        (mockPrisma.userPermission.findFirst as jest.Mock).mockResolvedValue(null);
        (mockPrisma.rolePermission.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await repository.hasPermission('user-1', UserRole.USER, 'users.delete');

        expect(result).toBe(false);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('createManyPermissions', () => {
      it('should create multiple permissions', async () => {
        const permissions = [
          {
            name: 'users.read',
            description: 'Read users',
            resource: 'users',
            action: 'read',
          },
          {
            name: 'users.write',
            description: 'Write users',
            resource: 'users',
            action: 'write',
          },
        ];

        (mockPrisma.permission.createMany as jest.Mock).mockResolvedValue({ count: 2 });

        await repository.createManyPermissions(permissions);

        expect(mockPrisma.permission.createMany).toHaveBeenCalledWith({
          data: permissions,
        });
      });
    });

    describe('createManyRolePermissions', () => {
      it('should create multiple role permissions', async () => {
        const rolePermissions = [
          {
            role: UserRole.ADMIN,
            permissionId: 'perm-1',
          },
          {
            role: UserRole.ADMIN,
            permissionId: 'perm-2',
          },
        ];

        (mockPrisma.rolePermission.createMany as jest.Mock).mockResolvedValue({ count: 2 });

        await repository.createManyRolePermissions(rolePermissions);

        expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
          data: rolePermissions,
        });
      });
    });
  });
});