import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import { ProcessStatus, ProcessStep, UserRole } from '../../types';
import { generateToken } from '../../utils/jwt';

describe('Admin Process Management Routes', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let regularUserId: string;
  let testProcessId: string;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.activityLog.deleteMany({});
    await prisma.process.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.ADMIN,
        status: 'ACTIVE'
      }
    });
    adminUserId = adminUser.id;
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });

    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.MANAGER,
        status: 'ACTIVE'
      }
    });
    managerUserId = managerUser.id;
    managerToken = generateToken({ userId: managerUser.id, email: managerUser.email, role: managerUser.role });

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.USER,
        status: 'ACTIVE'
      }
    });
    regularUserId = regularUser.id;
    userToken = generateToken({ userId: regularUser.id, email: regularUser.email, role: regularUser.role });

    // Create a test process
    const testProcess = await prisma.process.create({
      data: {
        userId: regularUserId,
        title: 'Test Process',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        metadata: JSON.stringify({ description: 'Test process for admin management' })
      }
    });
    testProcessId = testProcess.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.activityLog.deleteMany({});
    await prisma.process.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/admin/processes/templates', () => {
    it('should return process templates for admin', async () => {
      const response = await request(app)
        .get('/api/admin/processes/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toBeInstanceOf(Array);
      expect(response.body.data.templates.length).toBeGreaterThan(0);
      expect(response.body.data.templates[0]).toHaveProperty('id');
      expect(response.body.data.templates[0]).toHaveProperty('name');
      expect(response.body.data.templates[0]).toHaveProperty('description');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/admin/processes/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/processes', () => {
    it('should create a new process for admin', async () => {
      const processData = {
        userId: regularUserId,
        title: 'Admin Created Process',
        description: 'Process created by admin'
      };

      const response = await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(processData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.process).toHaveProperty('id');
      expect(response.body.data.process.title).toBe(processData.title);
      expect(response.body.data.process.userId).toBe(regularUserId);
      expect(response.body.data.process.status).toBe(ProcessStatus.CREATED);
      expect(response.body.data.process.currentStep).toBe(ProcessStep.UPLOAD);
    });

    it('should create a process from template', async () => {
      const processData = {
        userId: regularUserId,
        title: 'Template Process',
        templateId: 'standard-review',
        description: 'Process from template'
      };

      const response = await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(processData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.process.title).toBe(processData.title);
      expect(response.body.data.message).toContain('template');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: 'Missing User ID'
      };

      await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should deny access to non-admin users', async () => {
      const processData = {
        userId: regularUserId,
        title: 'Unauthorized Process'
      };

      await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(processData)
        .expect(403);
    });
  });

  describe('PUT /api/admin/processes/:id', () => {
    let updateProcessId: string;

    beforeEach(async () => {
      const process = await prisma.process.create({
        data: {
          userId: regularUserId,
          title: 'Process to Update',
          status: ProcessStatus.CREATED,
          currentStep: ProcessStep.UPLOAD,
          metadata: JSON.stringify({ description: 'Original description' })
        }
      });
      updateProcessId = process.id;
    });

    afterEach(async () => {
      await prisma.process.deleteMany({
        where: { id: updateProcessId }
      });
    });

    it('should update process information for admin', async () => {
      const updateData = {
        title: 'Updated Process Title',
        description: 'Updated description',
        status: ProcessStatus.PROCESSING,
        currentStep: ProcessStep.METADATA_EXTRACTION
      };

      const response = await request(app)
        .put(`/api/admin/processes/${updateProcessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.process.title).toBe(updateData.title);
      expect(response.body.data.process.status).toBe(updateData.status);
      expect(response.body.data.process.currentStep).toBe(updateData.currentStep);
      expect(response.body.data.version).toBeGreaterThan(0);
    });

    it('should validate process configuration', async () => {
      const invalidData = {
        status: ProcessStatus.COMPLETED,
        currentStep: ProcessStep.UPLOAD // Invalid combination
      };

      const response = await request(app)
        .put(`/api/admin/processes/${updateProcessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status-step combination');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/admin/processes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .put(`/api/admin/processes/${updateProcessId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);
    });
  });

  describe('PUT /api/admin/processes/:id/reset-stage', () => {
    let resetProcessId: string;

    beforeEach(async () => {
      const process = await prisma.process.create({
        data: {
          userId: regularUserId,
          title: 'Process to Reset',
          status: ProcessStatus.PROCESSING,
          currentStep: ProcessStep.METADATA_EXTRACTION,
          metadata: JSON.stringify({ description: 'Process in progress' })
        }
      });
      resetProcessId = process.id;
    });

    afterEach(async () => {
      await prisma.process.deleteMany({
        where: { id: resetProcessId }
      });
    });

    it('should reset process stage for admin', async () => {
      const resetData = {
        targetStep: ProcessStep.UPLOAD
      };

      const response = await request(app)
        .put(`/api/admin/processes/${resetProcessId}/reset-stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.process.currentStep).toBe(ProcessStep.UPLOAD);
      expect(response.body.data.process.status).toBe(ProcessStatus.CREATED);
      expect(response.body.data.message).toContain('reset to UPLOAD');
    });

    it('should validate target step', async () => {
      const invalidData = {
        targetStep: 'INVALID_STEP'
      };

      await request(app)
        .put(`/api/admin/processes/${resetProcessId}/reset-stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/admin/processes/${nonExistentId}/reset-stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStep: ProcessStep.UPLOAD })
        .expect(404);
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .put(`/api/admin/processes/${resetProcessId}/reset-stage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetStep: ProcessStep.UPLOAD })
        .expect(403);
    });
  });

  describe('DELETE /api/admin/processes/:id', () => {
    let deleteProcessId: string;

    beforeEach(async () => {
      const process = await prisma.process.create({
        data: {
          userId: regularUserId,
          title: 'Process to Delete',
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.EXPORT,
          metadata: JSON.stringify({ description: 'Completed process' })
        }
      });
      deleteProcessId = process.id;
    });

    it('should delete process for admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/processes/${deleteProcessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify process is deleted
      const deletedProcess = await prisma.process.findUnique({
        where: { id: deleteProcessId }
      });
      expect(deletedProcess).toBeNull();
    });

    it('should prevent deletion of active processes', async () => {
      // Create an active process
      const activeProcess = await prisma.process.create({
        data: {
          userId: regularUserId,
          title: 'Active Process',
          status: ProcessStatus.PROCESSING,
          currentStep: ProcessStep.METADATA_EXTRACTION,
          metadata: JSON.stringify({ description: 'Active process' })
        }
      });

      const response = await request(app)
        .delete(`/api/admin/processes/${activeProcess.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active status');

      // Clean up
      await prisma.process.delete({ where: { id: activeProcess.id } });
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/admin/processes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .delete(`/api/admin/processes/${deleteProcessId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Activity Logging', () => {
    it('should log process management activities', async () => {
      // Create a process
      const processData = {
        userId: regularUserId,
        title: 'Logged Process',
        description: 'Process for logging test'
      };

      await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(processData);

      // Check if activity was logged
      const logs = await prisma.activityLog.findMany({
        where: {
          userId: adminUserId,
          action: 'ADMIN_PROCESS_CREATED'
        }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].details).toContain(processData.title);
    });
  });

  describe('Permission Validation', () => {
    it('should validate process management permissions', async () => {
      // Test with manager role (should have some permissions)
      const processData = {
        userId: regularUserId,
        title: 'Manager Process'
      };

      // This should fail if manager doesn't have process.create permission
      await request(app)
        .post('/api/admin/processes')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(processData)
        .expect(403);
    });
  });

  describe('Input Validation', () => {
    it('should validate process creation input', async () => {
      const invalidInputs = [
        { title: '' }, // Empty title
        { userId: 'invalid-uuid', title: 'Test' }, // Invalid UUID
        { userId: regularUserId }, // Missing title
      ];

      for (const input of invalidInputs) {
        await request(app)
          .post('/api/admin/processes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(input)
          .expect(400);
      }
    });

    it('should validate process update input', async () => {
      const invalidInputs = [
        { title: '' }, // Empty title
        { status: 'INVALID_STATUS' }, // Invalid status
        { currentStep: 'INVALID_STEP' }, // Invalid step
      ];

      for (const input of invalidInputs) {
        await request(app)
          .put(`/api/admin/processes/${testProcessId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(input)
          .expect(400);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with malformed process ID
      await request(app)
        .get('/api/admin/processes/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle missing authorization', async () => {
      await request(app)
        .get('/api/admin/processes/templates')
        .expect(401);
    });
  });
});