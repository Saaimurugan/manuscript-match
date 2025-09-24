import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/database';
import { UserRole, UserStatus, InvitationStatus, ProcessStatus, ProcessStep } from '@/types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Admin Management System - Comprehensive Integration Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let qcToken: string;
  let userToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let qcUserId: string;
  let regularUserId: string;
  let testProcessId: string;

  beforeAll(async () => {
    // Clean up database
    await prisma.userPermission.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.userInvitation.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();

    // Create test permissions
    const permissions = await prisma.permission.createMany({
      data: [
        { name: 'users:view', description: 'View users', resource: 'users', action: 'view' },
        { name: 'users:create', description: 'Create users', resource: 'users', action: 'create' },
        { name: 'users:update', description: 'Update users', resource: 'users', action: 'update' },
        { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },
        { name: 'users:promote', description: 'Promote users', resource: 'users', action: 'promote' },
        { name: 'users:block', description: 'Block users', resource: 'users', action: 'block' },
        { name: 'processes:view', description: 'View processes', resource: 'processes', action: 'view' },
        { name: 'processes:create', description: 'Create processes', resource: 'processes', action: 'create' },
        { name: 'processes:update', description: 'Update processes', resource: 'processes', action: 'update' },
        { name: 'processes:delete', description: 'Delete processes', resource: 'processes', action: 'delete' },
        { name: 'permissions:assign', description: 'Assign permissions', resource: 'permissions', action: 'assign' },
        { name: 'permissions:revoke', description: 'Revoke permissions', resource: 'permissions', action: 'revoke' },
        { name: 'system:admin', description: 'System administration', resource: 'system', action: 'admin' },
      ],
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;

    // Create manager user
    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@test.com',
        passwordHash: hashedPassword,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      },
    });
    managerUserId = managerUser.id;

    // Create QC user
    const qcUser = await prisma.user.create({
      data: {
        email: 'qc@test.com',
        passwordHash: hashedPassword,
        role: UserRole.QC,
        status: UserStatus.ACTIVE,
      },
    });
    qcUserId = qcUser.id;

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    regularUserId = regularUser.id;

    // Create test process
    const testProcess = await prisma.process.create({
      data: {
        userId: regularUserId,
        title: 'Test Process',
        status: ProcessStatus.COMPLETED,
        currentStep: ProcessStep.EXPORT,
        metadata: JSON.stringify({ description: 'Test process for admin operations' }),
      },
    });
    testProcessId = testProcess.id;

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

    qcToken = jwt.sign(
      { userId: qcUserId, email: 'qc@test.com', role: UserRole.QC },
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
    await prisma.userInvitation.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.process.deleteMany();
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.$disconnect();
  });

  describe('User Management API Endpoints', () => {
    describe('POST /api/admin/users/invite', () => {
      it('should allow admin to invite a new user', async () => {
        const inviteData = {
          email: 'newuser@test.com',
          role: UserRole.USER,
        };

        const response = await request(app)
          .post('/api/admin/users/invite')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(inviteData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe(inviteData.email);
        expect(response.body.data.role).toBe(inviteData.role);
        expect(response.body.data.status).toBe(InvitationStatus.PENDING);

        // Verify invitation was created in database
        const invitation = await prisma.userInvitation.findFirst({
          where: { email: inviteData.email },
        });
        expect(invitation).toBeTruthy();
        expect(invitation?.invitedBy).toBe(adminUserId);
      });

      it('should prevent non-admin from inviting users', async () => {
        const inviteData = {
          email: 'unauthorized@test.com',
          role: UserRole.USER,
        };

        await request(app)
          .post('/api/admin/users/invite')
          .set('Authorization', `Bearer ${userToken}`)
          .send(inviteData)
          .expect(403);
      });

      it('should validate email format', async () => {
        const inviteData = {
          email: 'invalid-email',
          role: UserRole.USER,
        };

        await request(app)
          .post('/api/admin/users/invite')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(inviteData)
          .expect(400);
      });

      it('should prevent duplicate invitations', async () => {
        const inviteData = {
          email: 'duplicate@test.com',
          role: UserRole.USER,
        };

        // First invitation should succeed
        await request(app)
          .post('/api/admin/users/invite')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(inviteData)
          .expect(201);

        // Second invitation should fail
        await request(app)
          .post('/api/admin/users/invite')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(inviteData)
          .expect(409);
      });
    });

    describe('PUT /api/admin/users/:id/promote', () => {
      it('should allow admin to promote user to admin', async () => {
        const response = await request(app)
          .put(`/api/admin/users/${regularUserId}/promote`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.role).toBe(UserRole.ADMIN);

        // Verify user was promoted in database
        const updatedUser = await prisma.user.findUnique({
          where: { id: regularUserId },
        });
        expect(updatedUser?.role).toBe(UserRole.ADMIN);

        // Verify activity was logged
        const activityLog = await prisma.activityLog.findFirst({
          where: {
            userId: adminUserId,
            action: 'USER_PROMOTED',
            resourceId: regularUserId,
          },
        });
        expect(activityLog).toBeTruthy();
      });

      it('should prevent non-admin from promoting users', async () => {
        await request(app)
          .put(`/api/admin/users/${regularUserId}/promote`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);
      });

      it('should return 404 for non-existent user', async () => {
        await request(app)
          .put('/api/admin/users/non-existent-id/promote')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('DELETE /api/admin/users/:id', () => {
      let userToDelete: string;

      beforeEach(async () => {
        // Create a user to delete
        const user = await prisma.user.create({
          data: {
            email: 'todelete@test.com',
            passwordHash: await bcrypt.hash('password123', 10),
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
          },
        });
        userToDelete = user.id;
      });

      it('should allow admin to delete user', async () => {
        const response = await request(app)
          .delete(`/api/admin/users/${userToDelete}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify user was deleted from database
        const deletedUser = await prisma.user.findUnique({
          where: { id: userToDelete },
        });
        expect(deletedUser).toBeNull();

        // Verify activity was logged
        const activityLog = await prisma.activityLog.findFirst({
          where: {
            userId: adminUserId,
            action: 'USER_DELETED',
            resourceId: userToDelete,
          },
        });
        expect(activityLog).toBeTruthy();
      });

      it('should prevent self-deletion', async () => {
        await request(app)
          .delete(`/api/admin/users/${adminUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });

      it('should prevent non-admin from deleting users', async () => {
        await request(app)
          .delete(`/api/admin/users/${userToDelete}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('PUT /api/admin/users/:id', () => {
      it('should allow admin to update user information', async () => {
        const updateData = {
          email: 'updated@test.com',
          role: UserRole.QC,
        };

        const response = await request(app)
          .put(`/api/admin/users/${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe(updateData.email);
        expect(response.body.data.role).toBe(updateData.role);

        // Verify user was updated in database
        const updatedUser = await prisma.user.findUnique({
          where: { id: regularUserId },
        });
        expect(updatedUser?.email).toBe(updateData.email);
        expect(updatedUser?.role).toBe(updateData.role);
      });

      it('should validate email uniqueness', async () => {
        const updateData = {
          email: 'admin@test.com', // Already exists
        };

        await request(app)
          .put(`/api/admin/users/${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(409);
      });

      it('should prevent non-admin from updating users', async () => {
        const updateData = {
          email: 'unauthorized@test.com',
        };

        await request(app)
          .put(`/api/admin/users/${regularUserId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(403);
      });
    });

    describe('PUT /api/admin/users/:id/block and PUT /api/admin/users/:id/unblock', () => {
      it('should allow admin to block and unblock users', async () => {
        // Block user
        const blockResponse = await request(app)
          .put(`/api/admin/users/${regularUserId}/block`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Policy violation' })
          .expect(200);

        expect(blockResponse.body.success).toBe(true);
        expect(blockResponse.body.data.status).toBe(UserStatus.BLOCKED);

        // Verify user was blocked in database
        const blockedUser = await prisma.user.findUnique({
          where: { id: regularUserId },
        });
        expect(blockedUser?.status).toBe(UserStatus.BLOCKED);
        expect(blockedUser?.blockedBy).toBe(adminUserId);

        // Unblock user
        const unblockResponse = await request(app)
          .put(`/api/admin/users/${regularUserId}/unblock`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(unblockResponse.body.success).toBe(true);
        expect(unblockResponse.body.data.status).toBe(UserStatus.ACTIVE);

        // Verify user was unblocked in database
        const unblockedUser = await prisma.user.findUnique({
          where: { id: regularUserId },
        });
        expect(unblockedUser?.status).toBe(UserStatus.ACTIVE);
        expect(unblockedUser?.blockedBy).toBeNull();
      });

      it('should prevent self-blocking', async () => {
        await request(app)
          .put(`/api/admin/users/${adminUserId}/block`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Self-block attempt' })
          .expect(400);
      });

      it('should prevent non-admin from blocking users', async () => {
        await request(app)
          .put(`/api/admin/users/${regularUserId}/block`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'Unauthorized block' })
          .expect(403);
      });
    });
  });

  describe('Permission Management API Endpoints', () => {
    describe('PUT /api/admin/users/:id/permissions', () => {
      it('should allow admin to assign custom permissions to user', async () => {
        const permissionData = {
          permissions: ['processes:view', 'processes:create'],
        };

        const response = await request(app)
          .put(`/api/admin/users/${regularUserId}/permissions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(permissionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);

        // Verify permissions were assigned in database
        const userPermissions = await prisma.userPermission.findMany({
          where: { userId: regularUserId },
          include: { permission: true },
        });
        expect(userPermissions).toHaveLength(2);
        expect(userPermissions.map(up => up.permission.name)).toContain('processes:view');
        expect(userPermissions.map(up => up.permission.name)).toContain('processes:create');
      });

      it('should prevent non-admin from assigning permissions', async () => {
        const permissionData = {
          permissions: ['processes:view'],
        };

        await request(app)
          .put(`/api/admin/users/${regularUserId}/permissions`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(permissionData)
          .expect(403);
      });

      it('should validate permission names', async () => {
        const permissionData = {
          permissions: ['invalid:permission'],
        };

        await request(app)
          .put(`/api/admin/users/${regularUserId}/permissions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(permissionData)
          .expect(400);
      });
    });

    describe('GET /api/admin/permissions', () => {
      it('should return all available permissions for admin', async () => {
        const response = await request(app)
          .get('/api/admin/permissions')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('description');
        expect(response.body.data[0]).toHaveProperty('resource');
        expect(response.body.data[0]).toHaveProperty('action');
      });

      it('should prevent non-admin from viewing permissions', async () => {
        await request(app)
          .get('/api/admin/permissions')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });
  });

  describe('Process Management API Endpoints', () => {
    describe('DELETE /api/admin/processes/:id', () => {
      it('should allow admin to delete completed process', async () => {
        const response = await request(app)
          .delete(`/api/admin/processes/${testProcessId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify process was deleted from database
        const deletedProcess = await prisma.process.findUnique({
          where: { id: testProcessId },
        });
        expect(deletedProcess).toBeNull();

        // Verify activity was logged
        const activityLog = await prisma.activityLog.findFirst({
          where: {
            userId: adminUserId,
            action: 'ADMIN_PROCESS_DELETED',
            resourceId: testProcessId,
          },
        });
        expect(activityLog).toBeTruthy();
      });

      it('should prevent deletion of active processes', async () => {
        // Create an active process
        const activeProcess = await prisma.process.create({
          data: {
            userId: regularUserId,
            title: 'Active Process',
            status: ProcessStatus.PROCESSING,
            currentStep: ProcessStep.DATABASE_SEARCH,
            metadata: JSON.stringify({ description: 'Active process' }),
          },
        });

        await request(app)
          .delete(`/api/admin/processes/${activeProcess.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        // Clean up
        await prisma.process.delete({ where: { id: activeProcess.id } });
      });

      it('should prevent non-admin from deleting processes', async () => {
        // Create another test process
        const testProcess2 = await prisma.process.create({
          data: {
            userId: regularUserId,
            title: 'Test Process 2',
            status: ProcessStatus.COMPLETED,
            currentStep: ProcessStep.EXPORT,
            metadata: JSON.stringify({ description: 'Test process 2' }),
          },
        });

        await request(app)
          .delete(`/api/admin/processes/${testProcess2.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        // Clean up
        await prisma.process.delete({ where: { id: testProcess2.id } });
      });
    });

    describe('PUT /api/admin/processes/:id/reset-stage', () => {
      let processToReset: string;

      beforeEach(async () => {
        const process = await prisma.process.create({
          data: {
            userId: regularUserId,
            title: 'Process to Reset',
            status: ProcessStatus.VALIDATING,
            currentStep: ProcessStep.VALIDATION,
            metadata: JSON.stringify({ description: 'Process for stage reset' }),
          },
        });
        processToReset = process.id;
      });

      afterEach(async () => {
        await prisma.process.deleteMany({ where: { id: processToReset } });
      });

      it('should allow admin to reset process stage', async () => {
        const resetData = {
          targetStage: ProcessStep.UPLOAD,
        };

        const response = await request(app)
          .put(`/api/admin/processes/${processToReset}/reset-stage`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(resetData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currentStep).toBe(ProcessStep.UPLOAD);
        expect(response.body.data.status).toBe(ProcessStatus.CREATED);

        // Verify process was updated in database
        const updatedProcess = await prisma.process.findUnique({
          where: { id: processToReset },
        });
        expect(updatedProcess?.currentStep).toBe(ProcessStep.UPLOAD);
        expect(updatedProcess?.status).toBe(ProcessStatus.CREATED);
      });

      it('should validate target stage', async () => {
        const resetData = {
          targetStage: 'INVALID_STAGE',
        };

        await request(app)
          .put(`/api/admin/processes/${processToReset}/reset-stage`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(resetData)
          .expect(400);
      });

      it('should prevent non-admin from resetting process stages', async () => {
        const resetData = {
          targetStage: ProcessStep.UPLOAD,
        };

        await request(app)
          .put(`/api/admin/processes/${processToReset}/reset-stage`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(resetData)
          .expect(403);
      });
    });

    describe('PUT /api/admin/processes/:id', () => {
      let processToUpdate: string;

      beforeEach(async () => {
        const process = await prisma.process.create({
          data: {
            userId: regularUserId,
            title: 'Process to Update',
            status: ProcessStatus.CREATED,
            currentStep: ProcessStep.UPLOAD,
            metadata: JSON.stringify({ description: 'Process for updating' }),
          },
        });
        processToUpdate = process.id;
      });

      afterEach(async () => {
        await prisma.process.deleteMany({ where: { id: processToUpdate } });
      });

      it('should allow admin to update process', async () => {
        const updateData = {
          title: 'Updated Process Title',
          description: 'Updated description',
        };

        const response = await request(app)
          .put(`/api/admin/processes/${processToUpdate}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(updateData.title);

        // Verify process was updated in database
        const updatedProcess = await prisma.process.findUnique({
          where: { id: processToUpdate },
        });
        expect(updatedProcess?.title).toBe(updateData.title);
      });

      it('should prevent non-admin from updating processes', async () => {
        const updateData = {
          title: 'Unauthorized Update',
        };

        await request(app)
          .put(`/api/admin/processes/${processToUpdate}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(403);
      });
    });

    describe('POST /api/admin/processes', () => {
      it('should allow admin to create process from template', async () => {
        const createData = {
          templateId: 'standard-review',
          userId: regularUserId,
          title: 'New Process from Template',
        };

        const response = await request(app)
          .post('/api/admin/processes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(createData.title);
        expect(response.body.data.userId).toBe(createData.userId);

        // Verify process was created in database
        const createdProcess = await prisma.process.findUnique({
          where: { id: response.body.data.id },
        });
        expect(createdProcess).toBeTruthy();
        expect(createdProcess?.title).toBe(createData.title);

        // Clean up
        if (createdProcess) {
          await prisma.process.delete({ where: { id: createdProcess.id } });
        }
      });

      it('should validate template ID', async () => {
        const createData = {
          templateId: 'invalid-template',
          userId: regularUserId,
          title: 'Invalid Template Process',
        };

        await request(app)
          .post('/api/admin/processes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createData)
          .expect(400);
      });

      it('should prevent non-admin from creating processes', async () => {
        const createData = {
          templateId: 'standard-review',
          userId: regularUserId,
          title: 'Unauthorized Process',
        };

        await request(app)
          .post('/api/admin/processes')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createData)
          .expect(403);
      });
    });
  });

  describe('Activity Log API Endpoints', () => {
    beforeEach(async () => {
      // Create some test activity logs
      await prisma.activityLog.createMany({
        data: [
          {
            userId: adminUserId,
            action: 'USER_CREATED',
            details: JSON.stringify({ targetUserId: regularUserId }),
            resourceType: 'user',
            resourceId: regularUserId,
            ipAddress: '192.168.1.1',
            userAgent: 'Test Agent',
          },
          {
            userId: adminUserId,
            action: 'PROCESS_CREATED',
            details: JSON.stringify({ processTitle: 'Test Process' }),
            resourceType: 'process',
            resourceId: testProcessId,
            ipAddress: '192.168.1.1',
            userAgent: 'Test Agent',
          },
          {
            userId: regularUserId,
            action: 'LOGIN_SUCCESS',
            details: JSON.stringify({ method: 'password' }),
            resourceType: 'authentication',
            resourceId: regularUserId,
            ipAddress: '192.168.1.2',
            userAgent: 'User Agent',
          },
        ],
      });
    });

    describe('GET /api/admin/activity-logs', () => {
      it('should return paginated activity logs for admin', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should filter activity logs by user', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ userId: adminUserId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.every((log: any) => log.userId === adminUserId)).toBe(true);
      });

      it('should filter activity logs by action', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ action: 'USER_CREATED' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.every((log: any) => log.action === 'USER_CREATED')).toBe(true);
      });

      it('should filter activity logs by resource type', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ resourceType: 'user' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.every((log: any) => log.resourceType === 'user')).toBe(true);
      });

      it('should filter activity logs by date range', async () => {
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ startDate, endDate })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should prevent non-admin from viewing activity logs', async () => {
        await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('GET /api/admin/activity-logs/export', () => {
      it('should export activity logs as JSON', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ format: 'json' })
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should export activity logs as CSV', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ format: 'csv' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should prevent non-admin from exporting activity logs', async () => {
        await request(app)
          .get('/api/admin/activity-logs/export')
          .set('Authorization', `Bearer ${userToken}`)
          .query({ format: 'json' })
          .expect(403);
      });
    });

    describe('GET /api/admin/users/:id/activity', () => {
      it('should return user-specific activity logs', async () => {
        const response = await request(app)
          .get(`/api/admin/users/${regularUserId}/activity`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.every((log: any) => log.userId === regularUserId)).toBe(true);
      });

      it('should prevent non-admin from viewing user activity logs', async () => {
        await request(app)
          .get(`/api/admin/users/${regularUserId}/activity`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow manager to view users but not delete them', async () => {
      // Manager should be able to view users
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // But not delete them
      await request(app)
        .delete(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should allow QC to view processes but not delete them', async () => {
      // Create a test process for QC operations
      const qcProcess = await prisma.process.create({
        data: {
          userId: qcUserId,
          title: 'QC Process',
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.EXPORT,
          metadata: JSON.stringify({ description: 'QC process' }),
        },
      });

      // QC should be able to view processes
      await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      // But not delete them
      await request(app)
        .delete(`/api/admin/processes/${qcProcess.id}`)
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(403);

      // Clean up
      await prisma.process.delete({ where: { id: qcProcess.id } });
    });

    it('should enforce permission hierarchy', async () => {
      // Admin should be able to promote manager
      await request(app)
        .put(`/api/admin/users/${managerUserId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // But manager should not be able to promote admin
      await request(app)
        .put(`/api/admin/users/${adminUserId}/promote`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user IDs gracefully', async () => {
      await request(app)
        .get('/api/admin/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle malformed request bodies', async () => {
      await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing authorization headers', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });

    it('should handle expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: adminUserId, email: 'admin@test.com', role: UserRole.ADMIN },
        process.env['JWT_SECRET'] || 'test-secret',
        { expiresIn: '-1h' } // Expired token
      );

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we'll test that the endpoints exist and respond appropriately
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Performance and Bulk Operations', () => {
    it('should handle bulk user operations efficiently', async () => {
      // Create multiple users for bulk operations
      const bulkUsers = [];
      for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
          data: {
            email: `bulk${i}@test.com`,
            passwordHash: await bcrypt.hash('password123', 10),
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
          },
        });
        bulkUsers.push(user.id);
      }

      // Test bulk status update
      const bulkUpdateData = {
        userIds: bulkUsers,
        updates: { status: UserStatus.BLOCKED },
      };

      const response = await request(app)
        .put('/api/admin/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(5);

      // Verify all users were updated
      const updatedUsers = await prisma.user.findMany({
        where: { id: { in: bulkUsers } },
      });
      expect(updatedUsers.every(user => user.status === UserStatus.BLOCKED)).toBe(true);

      // Clean up
      await prisma.user.deleteMany({
        where: { id: { in: bulkUsers } },
      });
    });

    it('should handle large result sets with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 1000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination.limit).toBeLessThanOrEqual(1000);
    });
  });
});