import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import { UserRole, UserStatus } from '../../types';
import { generateToken } from '../../utils/jwt';
import { AuthService } from '../../services/AuthService';

describe('Admin Activity Log Routes - Simple', () => {
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'simple-admin-test' }
      }
    });

    // Create test admin user
    const authService = new AuthService();
    const hashedPassword = await authService.hashPassword('password123');
    const adminUser = await prisma.user.create({
      data: {
        email: 'simple-admin-test@example.com',
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { id: adminUserId }
    });
  });

  describe('GET /api/admin/activity-logs', () => {
    it('should allow admin access to activity logs endpoint', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });
});