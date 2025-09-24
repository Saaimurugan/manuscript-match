import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/database';
import { UserRole, InvitationStatus } from '@/types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Admin User Management API', () => {
  let adminToken: string;
  // let managerToken: string;
  let userToken: string;
  let adminUserId: string;
  // let managerUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Clean up database
    await prisma.userPermission.deleteMany();
    await prisma.userInvitation.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();

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

    // Create manager user (not used in current tests)
    await prisma.user.create({
      data: {
        email: 'manager@test.com',
        passwordHash: hashedPassword,
        role: UserRole.MANAGER,
      },
    });

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: hashedPassword,
        role: UserRole.USER,
      },
    });
    regularUserId = regularUser.id;

    // Generate JWT tokens
    const jwtSecret = process.env['JWT_SECRET'] || 'test-secret';
    adminToken = jwt.sign(
      { userId: adminUserId, email: 'admin@test.com', role: UserRole.ADMIN },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // managerToken = jwt.sign(
    //   { userId: managerUserId, email: 'manager@test.com', role: UserRole.MANAGER },
    //   jwtSecret,
    //   { expiresIn: '1h' }
    // );

    userToken = jwt.sign(
      { userId: regularUserId, email: 'user@test.com', role: UserRole.USER },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up database
    await prisma.userPermission.deleteMany();
    await prisma.userInvitation.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

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
      expect(invitation?.role).toBe(inviteData.role);
    });

    it('should reject invitation with invalid email', async () => {
      const inviteData = {
        email: 'invalid-email',
        role: UserRole.USER,
      };

      const response = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('email');
    });

    it('should reject invitation with invalid role', async () => {
      const inviteData = {
        email: 'test@test.com',
        role: 'INVALID_ROLE',
      };

      const response = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('role');
    });

    it('should reject invitation from non-admin user', async () => {
      const inviteData = {
        email: 'test@test.com',
        role: UserRole.USER,
      };

      await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', `Bearer ${userToken}`)
        .send(inviteData)
        .expect(403);
    });

    it('should reject invitation without authentication', async () => {
      const inviteData = {
        email: 'test@test.com',
        role: UserRole.USER,
      };

      await request(app)
        .post('/api/admin/users/invite')
        .send(inviteData)
        .expect(401);
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
      const user = await prisma.user.findUnique({
        where: { id: regularUserId },
      });
      expect(user?.role).toBe(UserRole.ADMIN);

      // Reset user role for other tests
      await prisma.user.update({
        where: { id: regularUserId },
        data: { role: UserRole.USER },
      });
    });

    it('should reject promotion of non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/admin/users/${fakeUserId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject self-promotion', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${adminUserId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('yourself');
    });

    it('should reject promotion from non-admin user', async () => {
      await request(app)
        .put(`/api/admin/users/${regularUserId}/promote`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    let userToDelete: any;

    beforeEach(async () => {
      // Create a user to delete for each test
      const hashedPassword = await bcrypt.hash('password123', 10);
      userToDelete = await prisma.user.create({
        data: {
          email: `delete-test-${Date.now()}@test.com`,
          passwordHash: hashedPassword,
          role: UserRole.USER,
        },
      });
    });

    it('should allow admin to delete user', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify user was deleted from database
      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should reject deletion of non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/admin/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject self-deletion', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('yourself');
    });

    it('should reject deletion from non-admin user', async () => {
      await request(app)
        .delete(`/api/admin/users/${userToDelete.id}`)
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
      const user = await prisma.user.findUnique({
        where: { id: regularUserId },
      });
      expect(user?.email).toBe(updateData.email);
      expect(user?.role).toBe(updateData.role);

      // Reset user data for other tests
      await prisma.user.update({
        where: { id: regularUserId },
        data: { email: 'user@test.com', role: UserRole.USER },
      });
    });

    it('should reject update with invalid email', async () => {
      const updateData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('email');
    });

    it('should reject update with duplicate email', async () => {
      const updateData = {
        email: 'admin@test.com', // Email already exists
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should reject update from non-admin user', async () => {
      const updateData = {
        email: 'test@test.com',
      };

      await request(app)
        .put(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('PUT /api/admin/users/:id/block', () => {
    it('should allow admin to block user', async () => {
      const blockData = {
        reason: 'Violation of terms',
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUserId);

      // Verify activity was logged
      const activityLog = await prisma.activityLog.findFirst({
        where: {
          userId: adminUserId,
          action: 'USER_BLOCKED',
          resourceId: regularUserId,
        },
      });
      expect(activityLog).toBeTruthy();
    });

    it('should reject blocking non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/admin/users/${fakeUserId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject self-blocking', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${adminUserId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('yourself');
    });

    it('should reject blocking from non-admin user', async () => {
      await request(app)
        .put(`/api/admin/users/${regularUserId}/block`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Test' })
        .expect(403);
    });
  });

  describe('PUT /api/admin/users/:id/unblock', () => {
    it('should allow admin to unblock user', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUserId);

      // Verify activity was logged
      const activityLog = await prisma.activityLog.findFirst({
        where: {
          userId: adminUserId,
          action: 'USER_UNBLOCKED',
          resourceId: regularUserId,
        },
      });
      expect(activityLog).toBeTruthy();
    });

    it('should reject unblocking non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/admin/users/${fakeUserId}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject unblocking from non-admin user', async () => {
      await request(app)
        .put(`/api/admin/users/${regularUserId}/unblock`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should allow admin to get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should allow filtering by role', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ role: UserRole.ADMIN })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned users should have ADMIN role
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe(UserRole.ADMIN);
      });
    });

    it('should allow searching by email', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // At least one user should match the search
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should reject request from non-admin user', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });
  });
});