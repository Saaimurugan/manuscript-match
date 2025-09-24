import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/database';
import { UserRole } from '@/types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Admin Permission Management API', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let regularUserId: string;
  let testPermissions: any[] = [];

  beforeAll(async () => {
    // Clean up database
    await prisma.userPermission.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();

    // Create test permissions
    const permissionData = [
      { name: 'users.read', description: 'Read user information', resource: 'users', action: 'read' },
      { name: 'users.create', description: 'Create new users', resource: 'users', action: 'create' },
      { name: 'users.update', description: 'Update user information', resource: 'users', action: 'update' },
      { name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete' },
      { name: 'processes.read', description: 'Read process information', resource: 'processes', action: 'read' },
      { name: 'processes.manage', description: 'Manage processes', resource: 'processes', action: 'manage' },
      { name: 'permissions.read', description: 'Read permissions', resource: 'permissions', action: 'read' },
      { name: 'permissions.assign', description: 'Assign permissions to users', resource: 'permissions', action: 'assign' },
      { name: 'permissions.manage', description: 'Manage role permissions', resource: 'permissions', action: 'manage' },
    ];

    for (const permData of permissionData) {
      const permission = await prisma.permission.create({ data: permData });
      testPermissions.push(permission);
    }

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
      },
    });
    adminUserId = adminUser.id;

    // Create manager user
    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@test.com',
        passwordHash: hashedPassword,
        role: UserRole.MANAGER,
      },
    });
    managerUserId = managerUser.id;

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: hashedPassword,
        role: UserRole.USER,
      },
    });
    regularUserId = regularUser.id;

    // Set up default role permissions
    const adminPermissions = testPermissions.filter(p => 
      ['permissions.read', 'permissions.assign', 'permissions.manage', 'users.read', 'users.create', 'users.update', 'users.delete', 'processes.read', 'processes.manage'].includes(p.name)
    );
    
    for (const permission of adminPermissions) {
      await prisma.rolePermission.create({
        data: {
          role: UserRole.ADMIN,
          permissionId: permission.id,
        },
      });
    }

    // Generate JWT tokens
    const jwtSecret = process.env['JWT_SECRET'] || 'test-secret';
    adminToken = jwt.sign(
      { userId: adminUserId, email: 'admin@test.com', role: UserRole.ADMIN },
      jwtSecret,
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      { userId: managerUserId, email: 'manager@test.com', role: UserRole.MANAGER },
      jwtSecret,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: regularUserId, email: 'user@test.com', role: UserRole.USER },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up database
    await prisma.userPermission.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/admin/permissions', () => {
    it('should allow admin to get all permissions', async () => {
      const response = await request(app)
        .get('/api/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toBeInstanceOf(Array);
      expect(response.body.data.permissions.length).toBeGreaterThan(0);
      expect(response.body.data.groupedPermissions).toBeDefined();
      expect(response.body.data.total).toBe(response.body.data.permissions.length);

      // Check that permissions are properly structured
      const permission = response.body.data.permissions[0];
      expect(permission).toHaveProperty('id');
      expect(permission).toHaveProperty('name');
      expect(permission).toHaveProperty('description');
      expect(permission).toHaveProperty('resource');
      expect(permission).toHaveProperty('action');
    });

    it('should group permissions by resource', async () => {
      const response = await request(app)
        .get('/api/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.groupedPermissions).toBeDefined();
      expect(response.body.data.groupedPermissions.users).toBeInstanceOf(Array);
      expect(response.body.data.groupedPermissions.processes).toBeInstanceOf(Array);
      expect(response.body.data.groupedPermissions.permissions).toBeInstanceOf(Array);
    });

    it('should reject request from non-admin user', async () => {
      await request(app)
        .get('/api/admin/permissions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/admin/permissions')
        .expect(401);
    });
  });

  describe('PUT /api/admin/users/:id/permissions', () => {
    it('should allow admin to assign custom permissions to user', async () => {
      const permissionsToAssign = testPermissions
        .filter(p => ['users.read', 'processes.read'].includes(p.name))
        .map(p => p.id);

      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: permissionsToAssign })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(regularUserId);
      expect(response.body.data.customPermissions).toBeInstanceOf(Array);
      expect(response.body.data.customPermissions.length).toBe(2);

      // Verify permissions were assigned in database
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: regularUserId },
        include: { permission: true },
      });
      expect(userPermissions.length).toBe(2);
      
      const assignedPermissionNames = userPermissions.map(up => up.permission.name);
      expect(assignedPermissionNames).toContain('users.read');
      expect(assignedPermissionNames).toContain('processes.read');
    });

    it('should allow admin to update user permissions (add and remove)', async () => {
      // First assign some permissions
      const initialPermissions = testPermissions
        .filter(p => ['users.read', 'processes.read'].includes(p.name))
        .map(p => p.id);

      await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: initialPermissions });

      // Now update to different permissions
      const updatedPermissions = testPermissions
        .filter(p => ['users.read', 'users.create'].includes(p.name))
        .map(p => p.id);

      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: updatedPermissions })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customPermissions.length).toBe(2);

      // Verify permissions were updated in database
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: regularUserId },
        include: { permission: true },
      });
      
      const assignedPermissionNames = userPermissions.map(up => up.permission.name);
      expect(assignedPermissionNames).toContain('users.read');
      expect(assignedPermissionNames).toContain('users.create');
      expect(assignedPermissionNames).not.toContain('processes.read');
    });

    it('should allow admin to remove all custom permissions', async () => {
      // First assign some permissions
      const initialPermissions = testPermissions
        .filter(p => ['users.read'].includes(p.name))
        .map(p => p.id);

      await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: initialPermissions });

      // Now remove all permissions
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customPermissions.length).toBe(0);

      // Verify permissions were removed from database
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: regularUserId },
      });
      expect(userPermissions.length).toBe(0);
    });

    it('should reject assignment with invalid permission ID', async () => {
      const invalidPermissionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [invalidPermissionId] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Permission not found');
    });

    it('should reject assignment with invalid user ID', async () => {
      const invalidUserId = '00000000-0000-0000-0000-000000000000';
      const validPermissionId = testPermissions[0].id;

      const response = await request(app)
        .put(`/api/admin/users/${invalidUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [validPermissionId] })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject assignment with invalid request body', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('permissions');
    });

    it('should reject assignment from non-admin user', async () => {
      const permissionId = testPermissions[0].id;

      await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ permissions: [permissionId] })
        .expect(403);
    });

    it('should log permission assignment activity', async () => {
      const permissionId = testPermissions[0].id;

      await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [permissionId] });

      // Verify activity was logged
      const activityLog = await prisma.activityLog.findFirst({
        where: {
          userId: adminUserId,
          action: 'ADMIN_ASSIGN_USER_PERMISSIONS',
        },
      });
      expect(activityLog).toBeTruthy();
    });
  });

  describe('PUT /api/admin/roles/:role/permissions', () => {
    it('should allow admin to update role permissions', async () => {
      const permissionsToAssign = testPermissions
        .filter(p => ['users.read', 'processes.read'].includes(p.name))
        .map(p => p.id);

      const response = await request(app)
        .put(`/api/admin/roles/${UserRole.MANAGER}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: permissionsToAssign })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.MANAGER);
      expect(response.body.data.permissions).toBeInstanceOf(Array);
      expect(response.body.data.permissions.length).toBe(2);

      // Verify permissions were assigned in database
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: UserRole.MANAGER },
        include: { permission: true },
      });
      expect(rolePermissions.length).toBe(2);
      
      const assignedPermissionNames = rolePermissions.map(rp => rp.permission.name);
      expect(assignedPermissionNames).toContain('users.read');
      expect(assignedPermissionNames).toContain('processes.read');
    });

    it('should replace existing role permissions', async () => {
      // First assign some permissions
      const initialPermissions = testPermissions
        .filter(p => ['users.read', 'processes.read'].includes(p.name))
        .map(p => p.id);

      await request(app)
        .put(`/api/admin/roles/${UserRole.QC}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: initialPermissions });

      // Now update to different permissions
      const updatedPermissions = testPermissions
        .filter(p => ['users.read', 'users.create'].includes(p.name))
        .map(p => p.id);

      const response = await request(app)
        .put(`/api/admin/roles/${UserRole.QC}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: updatedPermissions })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions.length).toBe(2);

      // Verify permissions were updated in database
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: UserRole.QC },
        include: { permission: true },
      });
      
      const assignedPermissionNames = rolePermissions.map(rp => rp.permission.name);
      expect(assignedPermissionNames).toContain('users.read');
      expect(assignedPermissionNames).toContain('users.create');
      expect(assignedPermissionNames).not.toContain('processes.read');
    });

    it('should allow removing all permissions from a role', async () => {
      // First assign some permissions
      const initialPermissions = testPermissions
        .filter(p => ['users.read'].includes(p.name))
        .map(p => p.id);

      await request(app)
        .put(`/api/admin/roles/${UserRole.QC}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: initialPermissions });

      // Now remove all permissions
      const response = await request(app)
        .put(`/api/admin/roles/${UserRole.QC}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions.length).toBe(0);

      // Verify permissions were removed from database
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: UserRole.QC },
      });
      expect(rolePermissions.length).toBe(0);
    });

    it('should reject update with invalid role', async () => {
      const permissionId = testPermissions[0].id;

      const response = await request(app)
        .put('/api/admin/roles/INVALID_ROLE/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [permissionId] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid role');
    });

    it('should reject update with invalid permission ID', async () => {
      const invalidPermissionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/admin/roles/${UserRole.MANAGER}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [invalidPermissionId] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Permission not found');
    });

    it('should reject update with invalid request body', async () => {
      const response = await request(app)
        .put(`/api/admin/roles/${UserRole.MANAGER}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('permissions');
    });

    it('should reject update from non-admin user', async () => {
      const permissionId = testPermissions[0].id;

      await request(app)
        .put(`/api/admin/roles/${UserRole.MANAGER}/permissions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ permissions: [permissionId] })
        .expect(403);
    });

    it('should log role permission update activity', async () => {
      const permissionId = testPermissions[0].id;

      await request(app)
        .put(`/api/admin/roles/${UserRole.MANAGER}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [permissionId] });

      // Verify activity was logged
      const activityLog = await prisma.activityLog.findFirst({
        where: {
          userId: adminUserId,
          action: 'ADMIN_UPDATE_ROLE_PERMISSIONS',
        },
      });
      expect(activityLog).toBeTruthy();
    });
  });

  describe('Permission validation and conflict resolution', () => {
    it('should handle permission conflicts gracefully', async () => {
      // Assign a permission that the user already has through role
      const adminPermission = testPermissions.find(p => p.name === 'users.read');
      
      const response = await request(app)
        .put(`/api/admin/users/${adminUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [adminPermission.id] })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not create duplicate permissions
    });

    it('should validate permission hierarchy', async () => {
      // Test that lower-level users cannot assign permissions they don't have
      const managerOnlyPermission = testPermissions.find(p => p.name === 'permissions.manage');
      
      // This should fail because manager doesn't have permission.manage permission
      await request(app)
        .put(`/api/admin/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ permissions: [managerOnlyPermission.id] })
        .expect(403);
    });
  });
});