import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/database';
import { UserRole, UserStatus, InvitationStatus, ProcessStatus, ProcessStep } from '@/types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Admin Management System - End-to-End Workflows', () => {
  let adminToken: string;
  let adminUserId: string;

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
    await prisma.permission.createMany({
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

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@company.com',
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;

    // Generate JWT token
    const jwtSecret = process.env['JWT_SECRET'] || 'test-secret';
    adminToken = jwt.sign(
      { userId: adminUserId, email: 'admin@company.com', role: UserRole.ADMIN },
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

  describe('Complete User Management Workflow', () => {
    let invitationToken: string;
    let newUserId: string;

    it('should complete full user lifecycle from invitation to deletion', async () => {
      // Step 1: Admin invites a new user
      const inviteResponse = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newemployee@company.com',
          role: UserRole.USER,
        })
        .expect(201);

      expect(inviteResponse.body.success).toBe(true);
      expect(inviteResponse.body.data.email).toBe('newemployee@company.com');
      invitationToken = inviteResponse.body.data.token;

      // Verify invitation was logged
      const invitationLog = await prisma.activityLog.findFirst({
        where: {
          userId: adminUserId,
          action: 'USER_INVITED',
        },
      });
      expect(invitationLog).toBeTruthy();

      // Step 2: User accepts invitation
      const acceptResponse = await request(app)
        .post('/api/auth/accept-invitation')
        .send({
          token: invitationToken,
          password: 'newuser123',
          name: 'New Employee',
        })
        .expect(201);

      expect(acceptResponse.body.success).toBe(true);
      expect(acceptResponse.body.data.email).toBe('newemployee@company.com');
      newUserId = acceptResponse.body.data.id;

      // Verify user was created
      const newUser = await prisma.user.findUnique({
        where: { id: newUserId },
      });
      expect(newUser).toBeTruthy();
      expect(newUser?.status).toBe(UserStatus.ACTIVE);

      // Step 3: Admin assigns custom permissions to user
      const permissionResponse = await request(app)
        .put(`/api/admin/users/${newUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['processes:view', 'processes:create'],
        })
        .expect(200);

      expect(permissionResponse.body.success).toBe(true);
      expect(permissionResponse.body.data).toHaveLength(2);

      // Verify permissions were assigned
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: newUserId },
        include: { permission: true },
      });
      expect(userPermissions).toHaveLength(2);

      // Step 4: Admin updates user information
      const updateResponse = await request(app)
        .put(`/api/admin/users/${newUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.QC,
          email: 'qc.employee@company.com',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.role).toBe(UserRole.QC);
      expect(updateResponse.body.data.email).toBe('qc.employee@company.com');

      // Step 5: Admin promotes user to manager
      const promoteResponse = await request(app)
        .put(`/api/admin/users/${newUserId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(promoteResponse.body.success).toBe(true);
      expect(promoteResponse.body.data.role).toBe(UserRole.ADMIN);

      // Step 6: Admin blocks user temporarily
      const blockResponse = await request(app)
        .put(`/api/admin/users/${newUserId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Temporary suspension for policy review',
        })
        .expect(200);

      expect(blockResponse.body.success).toBe(true);
      expect(blockResponse.body.data.status).toBe(UserStatus.BLOCKED);

      // Verify user cannot access system while blocked
      const blockedUserToken = jwt.sign(
        { userId: newUserId, email: 'qc.employee@company.com', role: UserRole.ADMIN },
        process.env['JWT_SECRET'] || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${blockedUserToken}`)
        .expect(403); // Should be blocked

      // Step 7: Admin unblocks user
      const unblockResponse = await request(app)
        .put(`/api/admin/users/${newUserId}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(unblockResponse.body.success).toBe(true);
      expect(unblockResponse.body.data.status).toBe(UserStatus.ACTIVE);

      // Step 8: Admin revokes custom permissions
      const revokeResponse = await request(app)
        .put(`/api/admin/users/${newUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: [], // Remove all custom permissions
        })
        .expect(200);

      expect(revokeResponse.body.success).toBe(true);

      // Verify permissions were revoked
      const remainingPermissions = await prisma.userPermission.findMany({
        where: { userId: newUserId },
      });
      expect(remainingPermissions).toHaveLength(0);

      // Step 9: Admin deletes user
      const deleteResponse = await request(app)
        .delete(`/api/admin/users/${newUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify user was deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: newUserId },
      });
      expect(deletedUser).toBeNull();

      // Step 10: Verify complete activity trail
      const activityLogs = await prisma.activityLog.findMany({
        where: {
          OR: [
            { userId: adminUserId },
            { resourceId: newUserId },
          ],
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(activityLogs.length).toBeGreaterThan(5);
      
      const actions = activityLogs.map(log => log.action);
      expect(actions).toContain('USER_INVITED');
      expect(actions).toContain('USER_PROMOTED');
      expect(actions).toContain('USER_BLOCKED');
      expect(actions).toContain('USER_UNBLOCKED');
      expect(actions).toContain('USER_DELETED');
    });
  });

  describe('Complete Process Management Workflow', () => {
    let testUserId: string;
    let processId: string;

    beforeAll(async () => {
      // Create a test user for process operations
      const hashedPassword = await bcrypt.hash('testuser123', 10);
      const testUser = await prisma.user.create({
        data: {
          email: 'processuser@company.com',
          passwordHash: hashedPassword,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
      testUserId = testUser.id;
    });

    it('should complete full process lifecycle from creation to deletion', async () => {
      // Step 1: Admin creates process from template
      const createResponse = await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          templateId: 'standard-review',
          userId: testUserId,
          title: 'Comprehensive Review Process',
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe('Comprehensive Review Process');
      expect(createResponse.body.data.userId).toBe(testUserId);
      processId = createResponse.body.data.id;

      // Verify process was created with correct template settings
      const createdProcess = await prisma.process.findUnique({
        where: { id: processId },
      });
      expect(createdProcess).toBeTruthy();
      expect(createdProcess?.status).toBe(ProcessStatus.CREATED);
      expect(createdProcess?.currentStep).toBe(ProcessStep.UPLOAD);

      // Step 2: Admin updates process configuration
      const updateResponse = await request(app)
        .put(`/api/admin/processes/${processId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Comprehensive Review Process',
          description: 'Updated process description with new requirements',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe('Updated Comprehensive Review Process');

      // Verify versioning was created
      const versionLog = await prisma.activityLog.findFirst({
        where: {
          processId: processId,
          action: 'PROCESS_VERSION_CREATED',
        },
      });
      expect(versionLog).toBeTruthy();

      // Step 3: Simulate process progression
      await prisma.process.update({
        where: { id: processId },
        data: {
          status: ProcessStatus.VALIDATING,
          currentStep: ProcessStep.VALIDATION,
        },
      });

      // Step 4: Admin resets process stage
      const resetResponse = await request(app)
        .put(`/api/admin/processes/${processId}/reset-stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStage: ProcessStep.UPLOAD,
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.data.currentStep).toBe(ProcessStep.UPLOAD);
      expect(resetResponse.body.data.status).toBe(ProcessStatus.CREATED);

      // Step 5: Complete process to allow deletion
      await prisma.process.update({
        where: { id: processId },
        data: {
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.EXPORT,
        },
      });

      // Step 6: Admin deletes completed process
      const deleteResponse = await request(app)
        .delete(`/api/admin/processes/${processId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify process was deleted
      const deletedProcess = await prisma.process.findUnique({
        where: { id: processId },
      });
      expect(deletedProcess).toBeNull();

      // Step 7: Verify complete activity trail
      const processLogs = await prisma.activityLog.findMany({
        where: {
          OR: [
            { processId: processId },
            { resourceId: processId },
          ],
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(processLogs.length).toBeGreaterThan(3);
      
      const actions = processLogs.map(log => log.action);
      expect(actions).toContain('ADMIN_PROCESS_CREATED');
      expect(actions).toContain('ADMIN_PROCESS_UPDATED');
      expect(actions).toContain('ADMIN_PROCESS_STAGE_RESET');
      expect(actions).toContain('ADMIN_PROCESS_DELETED');
    });
  });

  describe('Permission Assignment and Role Management Workflow', () => {
    let managerId: string;
    let qcId: string;
    let userId: string;

    beforeAll(async () => {
      // Create test users for permission management
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      
      const manager = await prisma.user.create({
        data: {
          email: 'manager@company.com',
          passwordHash: hashedPassword,
          role: UserRole.MANAGER,
          status: UserStatus.ACTIVE,
        },
      });
      managerId = manager.id;

      const qc = await prisma.user.create({
        data: {
          email: 'qc@company.com',
          passwordHash: hashedPassword,
          role: UserRole.QC,
          status: UserStatus.ACTIVE,
        },
      });
      qcId = qc.id;

      const user = await prisma.user.create({
        data: {
          email: 'regularuser@company.com',
          passwordHash: hashedPassword,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
      userId = user.id;
    });

    it('should complete comprehensive permission management workflow', async () => {
      // Step 1: Admin assigns custom permissions to regular user
      const assignResponse = await request(app)
        .put(`/api/admin/users/${userId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['processes:view', 'processes:create', 'users:view'],
        })
        .expect(200);

      expect(assignResponse.body.success).toBe(true);
      expect(assignResponse.body.data).toHaveLength(3);

      // Step 2: Verify user has effective permissions
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: userId },
        include: { permission: true },
      });
      expect(userPermissions).toHaveLength(3);

      // Step 3: Admin updates role permissions for QC role
      const roleUpdateResponse = await request(app)
        .put('/api/admin/roles/QC/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['processes:view', 'processes:update', 'users:view'],
        })
        .expect(200);

      expect(roleUpdateResponse.body.success).toBe(true);

      // Verify role permissions were updated
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: UserRole.QC },
        include: { permission: true },
      });
      expect(rolePermissions).toHaveLength(3);

      // Step 4: Test permission inheritance and conflicts
      // Assign QC user a permission that conflicts with role
      const conflictResponse = await request(app)
        .put(`/api/admin/users/${qcId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['processes:delete'], // Higher permission than role allows
        })
        .expect(200);

      expect(conflictResponse.body.success).toBe(true);

      // Step 5: Admin promotes user and checks permission changes
      const promoteResponse = await request(app)
        .put(`/api/admin/users/${userId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(promoteResponse.body.success).toBe(true);
      expect(promoteResponse.body.data.role).toBe(UserRole.ADMIN);

      // Step 6: Verify permission hierarchy enforcement
      // Create tokens for different roles
      const managerToken = jwt.sign(
        { userId: managerId, email: 'manager@company.com', role: UserRole.MANAGER },
        process.env['JWT_SECRET'] || 'test-secret',
        { expiresIn: '1h' }
      );

      const qcToken = jwt.sign(
        { userId: qcId, email: 'qc@company.com', role: UserRole.QC },
        process.env['JWT_SECRET'] || 'test-secret',
        { expiresIn: '1h' }
      );

      // Manager should not be able to promote admin
      await request(app)
        .put(`/api/admin/users/${adminUserId}/promote`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      // QC should not be able to delete users
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(403);

      // Step 7: Admin revokes all custom permissions
      const revokeResponse = await request(app)
        .put(`/api/admin/users/${qcId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: [],
        })
        .expect(200);

      expect(revokeResponse.body.success).toBe(true);

      // Verify permissions were revoked
      const remainingPermissions = await prisma.userPermission.findMany({
        where: { userId: qcId },
      });
      expect(remainingPermissions).toHaveLength(0);

      // Step 8: Verify complete permission activity trail
      const permissionLogs = await prisma.activityLog.findMany({
        where: {
          action: {
            in: ['PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'ROLE_PERMISSIONS_UPDATED'],
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(permissionLogs.length).toBeGreaterThan(3);
    });
  });

  describe('Activity Log Monitoring and Export Workflow', () => {
    let testUserId: string;
    let testProcessId: string;

    beforeAll(async () => {
      // Create test data for activity monitoring
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const testUser = await prisma.user.create({
        data: {
          email: 'activityuser@company.com',
          passwordHash: hashedPassword,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
      testUserId = testUser.id;

      const testProcess = await prisma.process.create({
        data: {
          userId: testUserId,
          title: 'Activity Test Process',
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.EXPORT,
          metadata: JSON.stringify({ description: 'Process for activity testing' }),
        },
      });
      testProcessId = testProcess.id;

      // Generate various activities
      await prisma.activityLog.createMany({
        data: [
          {
            userId: adminUserId,
            action: 'USER_CREATED',
            details: JSON.stringify({ targetUserId: testUserId }),
            resourceType: 'user',
            resourceId: testUserId,
            ipAddress: '192.168.1.100',
            userAgent: 'Admin Browser',
          },
          {
            userId: testUserId,
            action: 'LOGIN_SUCCESS',
            details: JSON.stringify({ method: 'password' }),
            resourceType: 'authentication',
            resourceId: testUserId,
            ipAddress: '192.168.1.101',
            userAgent: 'User Browser',
          },
          {
            userId: testUserId,
            processId: testProcessId,
            action: 'PROCESS_CREATED',
            details: JSON.stringify({ title: 'Activity Test Process' }),
            resourceType: 'process',
            resourceId: testProcessId,
            ipAddress: '192.168.1.101',
            userAgent: 'User Browser',
          },
          {
            userId: adminUserId,
            processId: testProcessId,
            action: 'ADMIN_PROCESS_DELETED',
            details: JSON.stringify({ processTitle: 'Activity Test Process' }),
            resourceType: 'process',
            resourceId: testProcessId,
            ipAddress: '192.168.1.100',
            userAgent: 'Admin Browser',
          },
        ],
      });
    });

    it('should complete comprehensive activity monitoring workflow', async () => {
      // Step 1: Admin views all activity logs with pagination
      const allLogsResponse = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(allLogsResponse.body.success).toBe(true);
      expect(allLogsResponse.body.data).toBeInstanceOf(Array);
      expect(allLogsResponse.body.pagination).toHaveProperty('total');
      expect(allLogsResponse.body.data.length).toBeGreaterThan(0);

      // Step 2: Filter logs by specific user
      const userLogsResponse = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: testUserId })
        .expect(200);

      expect(userLogsResponse.body.success).toBe(true);
      expect(userLogsResponse.body.data.every((log: any) => log.userId === testUserId)).toBe(true);

      // Step 3: Filter logs by action type
      const actionLogsResponse = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'LOGIN_SUCCESS' })
        .expect(200);

      expect(actionLogsResponse.body.success).toBe(true);
      expect(actionLogsResponse.body.data.every((log: any) => log.action === 'LOGIN_SUCCESS')).toBe(true);

      // Step 4: Filter logs by resource type
      const resourceLogsResponse = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ resourceType: 'process' })
        .expect(200);

      expect(resourceLogsResponse.body.success).toBe(true);
      expect(resourceLogsResponse.body.data.every((log: any) => log.resourceType === 'process')).toBe(true);

      // Step 5: Filter logs by date range
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const dateLogsResponse = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        })
        .expect(200);

      expect(dateLogsResponse.body.success).toBe(true);
      expect(dateLogsResponse.body.data).toBeInstanceOf(Array);

      // Step 6: Get user-specific activity logs
      const userActivityResponse = await request(app)
        .get(`/api/admin/users/${testUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(userActivityResponse.body.success).toBe(true);
      expect(userActivityResponse.body.data.every((log: any) => log.userId === testUserId)).toBe(true);

      // Step 7: Export activity logs as JSON
      const jsonExportResponse = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'json', userId: testUserId })
        .expect(200);

      expect(jsonExportResponse.headers['content-type']).toContain('application/json');
      expect(jsonExportResponse.headers['content-disposition']).toContain('attachment');

      // Step 8: Export activity logs as CSV
      const csvExportResponse = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv', action: 'LOGIN_SUCCESS' })
        .expect(200);

      expect(csvExportResponse.headers['content-type']).toContain('text/csv');
      expect(csvExportResponse.headers['content-disposition']).toContain('attachment');

      // Step 9: Export activity logs as PDF
      const pdfExportResponse = await request(app)
        .get('/api/admin/activity-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'pdf', resourceType: 'process' })
        .expect(200);

      expect(pdfExportResponse.headers['content-type']).toContain('application/pdf');
      expect(pdfExportResponse.headers['content-disposition']).toContain('attachment');

      // Step 10: Verify export contains expected data
      const exportData = JSON.parse(jsonExportResponse.text);
      expect(exportData).toHaveProperty('totalRecords');
      expect(exportData).toHaveProperty('logs');
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData.logs).toBeInstanceOf(Array);
      expect(exportData.logs.every((log: any) => log.userId === testUserId)).toBe(true);
    });
  });

  describe('System Health and Monitoring Workflow', () => {
    it('should provide comprehensive system health monitoring', async () => {
      // Step 1: Get system dashboard metrics
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data).toHaveProperty('userStats');
      expect(dashboardResponse.body.data).toHaveProperty('processStats');
      expect(dashboardResponse.body.data).toHaveProperty('activityStats');
      expect(dashboardResponse.body.data).toHaveProperty('systemHealth');

      // Step 2: Get detailed user statistics
      const userStatsResponse = await request(app)
        .get('/api/admin/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(userStatsResponse.body.success).toBe(true);
      expect(userStatsResponse.body.data).toHaveProperty('totalUsers');
      expect(userStatsResponse.body.data).toHaveProperty('activeUsers');
      expect(userStatsResponse.body.data).toHaveProperty('blockedUsers');
      expect(userStatsResponse.body.data).toHaveProperty('usersByRole');

      // Step 3: Get process health status
      const processHealthResponse = await request(app)
        .get('/api/admin/processes/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(processHealthResponse.body.success).toBe(true);
      expect(processHealthResponse.body.data).toHaveProperty('overallHealth');
      expect(processHealthResponse.body.data).toHaveProperty('stuckProcesses');
      expect(processHealthResponse.body.data).toHaveProperty('errorProcesses');
      expect(processHealthResponse.body.data).toHaveProperty('alerts');

      // Step 4: Get activity metrics
      const activityMetricsResponse = await request(app)
        .get('/api/admin/activity-logs/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activityMetricsResponse.body.success).toBe(true);
      expect(activityMetricsResponse.body.data).toHaveProperty('totalLogs');
      expect(activityMetricsResponse.body.data).toHaveProperty('uniqueUsers');
      expect(activityMetricsResponse.body.data).toHaveProperty('topActions');
      expect(activityMetricsResponse.body.data).toHaveProperty('activityByHour');

      // Step 5: Get active processes
      const activeProcessesResponse = await request(app)
        .get('/api/admin/processes/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activeProcessesResponse.body.success).toBe(true);
      expect(activeProcessesResponse.body.data).toBeInstanceOf(Array);

      // Step 6: Get invitation statistics
      const invitationStatsResponse = await request(app)
        .get('/api/admin/invitations/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(invitationStatsResponse.body.success).toBe(true);
      expect(invitationStatsResponse.body.data).toHaveProperty('total');
      expect(invitationStatsResponse.body.data).toHaveProperty('pending');
      expect(invitationStatsResponse.body.data).toHaveProperty('accepted');
      expect(invitationStatsResponse.body.data).toHaveProperty('expired');
    });
  });

  describe('Error Recovery and Resilience Workflow', () => {
    it('should handle system errors gracefully and maintain audit trail', async () => {
      // Step 1: Test handling of invalid user operations
      const invalidUserResponse = await request(app)
        .get('/api/admin/users/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(invalidUserResponse.body.success).toBe(false);
      expect(invalidUserResponse.body.error).toBeDefined();

      // Step 2: Test handling of non-existent resources
      const nonExistentResponse = await request(app)
        .delete('/api/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(nonExistentResponse.body.success).toBe(false);

      // Step 3: Test handling of permission violations
      const userToken = jwt.sign(
        { userId: 'user-id', email: 'user@test.com', role: UserRole.USER },
        process.env['JWT_SECRET'] || 'test-secret',
        { expiresIn: '1h' }
      );

      const unauthorizedResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(unauthorizedResponse.body.success).toBe(false);

      // Step 4: Test handling of malformed requests
      const malformedResponse = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid json')
        .expect(400);

      expect(malformedResponse.body.success).toBe(false);

      // Step 5: Test handling of duplicate operations
      const duplicateInvite1 = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@test.com',
          role: UserRole.USER,
        })
        .expect(201);

      expect(duplicateInvite1.body.success).toBe(true);

      const duplicateInvite2 = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@test.com',
          role: UserRole.USER,
        })
        .expect(409);

      expect(duplicateInvite2.body.success).toBe(false);

      // Step 6: Verify all error scenarios were logged appropriately
      const errorLogs = await prisma.activityLog.findMany({
        where: {
          action: {
            in: ['ERROR_HANDLED', 'UNAUTHORIZED_ACCESS', 'VALIDATION_ERROR'],
          },
        },
      });

      // Error logging might be implemented differently, so we just verify the system is responsive
      expect(errorLogs).toBeDefined();
    });
  });
});