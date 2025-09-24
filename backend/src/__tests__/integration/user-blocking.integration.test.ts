/**
 * Integration tests for user blocking enforcement
 */

import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { ActivityLogRepository } from '../../repositories/ActivityLogRepository';
import { UserSessionRepository } from '../../repositories/UserSessionRepository';

describe('User Blocking Enforcement Integration', () => {
  let authService: AuthService;
  let userRepository: UserRepository;
  let activityLogRepository: ActivityLogRepository;
  let userSessionRepository: UserSessionRepository;
  let testUser: any;
  let adminUser: any;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Initialize services
    userRepository = new UserRepository(prisma);
    activityLogRepository = new ActivityLogRepository(prisma);
    userSessionRepository = new UserSessionRepository(prisma);
    authService = new AuthService(userRepository, activityLogRepository, userSessionRepository);

    // Create test users
    testUser = await userRepository.create({
      email: 'testuser@example.com',
      passwordHash: await authService.hashPassword('password123'),
      role: 'USER',
      status: 'ACTIVE',
    });

    adminUser = await userRepository.create({
      email: 'admin@example.com',
      passwordHash: await authService.hashPassword('admin123'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    // Generate tokens
    userToken = await authService.login(
      { email: 'testuser@example.com', password: 'password123' },
      '127.0.0.1',
      'Test User Agent'
    ).then(response => response.token);

    adminToken = await authService.login(
      { email: 'admin@example.com', password: 'admin123' },
      '127.0.0.1',
      'Test Admin Agent'
    ).then(response => response.token);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.userSession.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset user status before each test
    await userRepository.update(testUser.id, { status: 'ACTIVE' });
  });

  describe('Login Blocking', () => {
    it('should prevent blocked user from logging in', async () => {
      // Block the user
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('blocked');
    });

    it('should log blocked user login attempts', async () => {
      // Block the user
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        });

      // Check activity log
      const logs = await activityLogRepository.findByUserId(testUser.id);
      const blockedLoginLog = logs.find(log => log.action === 'LOGIN_BLOCKED');
      
      expect(blockedLoginLog).toBeDefined();
      expect(blockedLoginLog?.details).toContain('user_blocked');
    });
  });

  describe('Session Termination', () => {
    it('should terminate all sessions when user is blocked', async () => {
      // Verify user has active session
      const activeSessions = await userSessionRepository.findActiveByUserId(testUser.id);
      expect(activeSessions.length).toBeGreaterThan(0);

      // Block the user
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      // Try to access protected endpoint
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('blocked');

      // Check that sessions are deactivated
      const remainingActiveSessions = await userSessionRepository.findActiveByUserId(testUser.id);
      expect(remainingActiveSessions.length).toBe(0);
    });

    it('should prevent blocked user from accessing protected routes', async () => {
      // Block the user
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      const protectedRoutes = [
        '/api/auth/profile',
        '/api/auth/verify',
        '/api/auth/sessions',
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.message).toContain('blocked');
      }
    });
  });

  describe('Token Validation', () => {
    it('should invalidate tokens for blocked users', async () => {
      // Verify token works initially
      let response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      // Block the user
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      // Token should now be invalid
      response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('blocked');
    });

    it('should handle token validation for non-existent sessions', async () => {
      // Manually deactivate session
      await userSessionRepository.deactivateAllForUser(testUser.id);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Session expired or invalid');
    });
  });

  describe('Admin Operations', () => {
    it('should allow admin to block users', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUser.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Policy violation',
        });

      expect(response.status).toBe(200);

      // Verify user is blocked
      const updatedUser = await userRepository.findById(testUser.id);
      expect(updatedUser?.status).toBe('BLOCKED');
      expect(updatedUser?.blockedBy).toBe(adminUser.id);
    });

    it('should allow admin to unblock users', async () => {
      // First block the user
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      const response = await request(app)
        .put(`/api/admin/users/${testUser.id}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Verify user is unblocked
      const updatedUser = await userRepository.findById(testUser.id);
      expect(updatedUser?.status).toBe('ACTIVE');
      expect(updatedUser?.blockedAt).toBeNull();
      expect(updatedUser?.blockedBy).toBeNull();
    });

    it('should log admin blocking actions', async () => {
      await request(app)
        .put(`/api/admin/users/${testUser.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Policy violation',
        });

      // Check activity log
      const logs = await activityLogRepository.findByUserId(adminUser.id);
      const blockLog = logs.find(log => 
        log.action === 'USER_BLOCKED' && log.resourceId === testUser.id
      );
      
      expect(blockLog).toBeDefined();
      expect(blockLog?.details).toContain('Policy violation');
    });
  });

  describe('Session Management', () => {
    it('should track user sessions with IP and user agent', async () => {
      const sessions = await userSessionRepository.findActiveByUserId(testUser.id);
      const session = sessions[0];

      expect(session).toBeDefined();
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.userAgent).toBe('Test User Agent');
    });

    it('should allow users to view their active sessions', async () => {
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const session = response.body.data[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('ipAddress');
      expect(session).toHaveProperty('userAgent');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('lastUsedAt');
      expect(session).not.toHaveProperty('token'); // Token should be excluded
    });

    it('should allow users to logout all sessions', async () => {
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      // Verify all sessions are deactivated
      const activeSessions = await userSessionRepository.findActiveByUserId(testUser.id);
      expect(activeSessions.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during blocking check', async () => {
      // Mock database error
      const originalFindById = userRepository.findById;
      userRepository.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(500);

      // Restore original method
      userRepository.findById = originalFindById;
    });

    it('should handle session cleanup errors gracefully', async () => {
      // Mock session repository error
      const originalDeactivateAll = userSessionRepository.deactivateAllForUser;
      userSessionRepository.deactivateAllForUser = jest.fn().mockRejectedValue(new Error('Session error'));

      // Block user should still work even if session cleanup fails
      await userRepository.update(testUser.id, { 
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: adminUser.id,
      });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);

      // Restore original method
      userSessionRepository.deactivateAllForUser = originalDeactivateAll;
    });
  });
});