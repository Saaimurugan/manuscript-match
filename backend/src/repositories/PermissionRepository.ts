import { PrismaClient, Permission, UserPermission, RolePermission } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { UserRole } from '../types';

export interface CreatePermissionInput {
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface UpdatePermissionInput {
  name?: string;
  description?: string;
  resource?: string;
  action?: string;
}

export interface CreateUserPermissionInput {
  userId: string;
  permissionId: string;
  grantedBy: string;
}

export interface CreateRolePermissionInput {
  role: UserRole;
  permissionId: string;
}

export interface PermissionWithRelations extends Permission {
  userPermissions?: UserPermission[];
  rolePermissions?: RolePermission[];
}

export interface UserPermissionWithRelations extends UserPermission {
  user?: any;
  permission?: Permission;
  granter?: any;
}

export interface RolePermissionWithRelations extends RolePermission {
  permission?: Permission;
}

export class PermissionRepository extends BaseRepository<Permission, CreatePermissionInput, UpdatePermissionInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreatePermissionInput): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  async findById(id: string): Promise<Permission | null> {
    this.validateId(id);
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Permission | null> {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid permission name provided');
    }
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
    where?: any;
  }): Promise<Permission[]> {
    const query: any = {
      orderBy: options?.orderBy || { name: 'asc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    if (options?.where) {
      query.where = options.where;
    }
    
    return this.prisma.permission.findMany(query);
  }

  async findWithRelations(id: string): Promise<PermissionWithRelations | null> {
    this.validateId(id);
    return this.prisma.permission.findUnique({
      where: { id },
      include: {
        userPermissions: {
          include: {
            user: true,
            granter: true,
          },
        },
        rolePermissions: true,
      },
    });
  }

  async update(id: string, data: UpdatePermissionInput): Promise<Permission> {
    this.validateId(id);
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.permission.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return this.prisma.permission.count();
  }

  // User Permission methods
  async createUserPermission(data: CreateUserPermissionInput): Promise<UserPermission> {
    return this.prisma.userPermission.create({
      data,
    });
  }

  async findUserPermission(userId: string, permissionId: string): Promise<UserPermission | null> {
    this.validateId(userId);
    this.validateId(permissionId);
    return this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });
  }

  async findUserPermissions(userId: string): Promise<UserPermissionWithRelations[]> {
    this.validateId(userId);
    return this.prisma.userPermission.findMany({
      where: { userId },
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
  }

  async deleteUserPermission(userId: string, permissionId: string): Promise<void> {
    this.validateId(userId);
    this.validateId(permissionId);
    await this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });
  }

  async deleteAllUserPermissions(userId: string): Promise<void> {
    this.validateId(userId);
    await this.prisma.userPermission.deleteMany({
      where: { userId },
    });
  }

  // Role Permission methods
  async createRolePermission(data: CreateRolePermissionInput): Promise<RolePermission> {
    return this.prisma.rolePermission.create({
      data: {
        role: data.role,
        permissionId: data.permissionId,
      },
    });
  }

  async findRolePermission(role: UserRole, permissionId: string): Promise<RolePermission | null> {
    this.validateId(permissionId);
    return this.prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role,
          permissionId,
        },
      },
    });
  }

  async findRolePermissions(role: UserRole): Promise<RolePermissionWithRelations[]> {
    return this.prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true,
      },
    });
  }

  async deleteRolePermission(role: UserRole, permissionId: string): Promise<void> {
    this.validateId(permissionId);
    await this.prisma.rolePermission.delete({
      where: {
        role_permissionId: {
          role,
          permissionId,
        },
      },
    });
  }

  async deleteAllRolePermissions(role: UserRole): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: { role },
    });
  }

  // Bulk operations
  async createManyPermissions(permissions: CreatePermissionInput[]): Promise<void> {
    await this.prisma.permission.createMany({
      data: permissions,
    });
  }

  async createManyRolePermissions(rolePermissions: CreateRolePermissionInput[]): Promise<void> {
    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
    });
  }

  // Query methods for permission checking
  async getUserEffectivePermissions(userId: string, userRole: UserRole): Promise<Permission[]> {
    this.validateId(userId);
    
    // Get role-based permissions
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: userRole },
      include: { permission: true },
    });

    // Get custom user permissions
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    // Combine and deduplicate permissions
    const allPermissions = new Map<string, Permission>();
    
    // Add role permissions
    rolePermissions.forEach(rp => {
      allPermissions.set(rp.permission.id, rp.permission);
    });

    // Add/override with user permissions
    userPermissions.forEach(up => {
      allPermissions.set(up.permission.id, up.permission);
    });

    return Array.from(allPermissions.values());
  }

  async hasPermission(userId: string, userRole: UserRole, permissionName: string): Promise<boolean> {
    this.validateId(userId);
    
    // Check if user has custom permission
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: permissionName,
        },
      },
    });

    if (userPermission) {
      return true;
    }

    // Check if role has permission
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        role: userRole,
        permission: {
          name: permissionName,
        },
      },
    });

    return !!rolePermission;
  }
}