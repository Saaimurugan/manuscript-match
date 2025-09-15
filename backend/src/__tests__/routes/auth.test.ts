import request from 'supertest';
import app from '@/app';
import { UserRole } from '@/types';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';

// Mock external dependencies
jest.mock('@/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

// Get the mocked prisma
const { prisma: mockPrisma } = jest.requireMock('@/config/database');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.role).toBe(UserRole.USER);
    });

    it('should return 409 if user already exists', async () => {
      // Arrange
      const existingUser = {
        id: 'existing-user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid email', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for short password', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 for non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('different-password', 12),
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user-id');
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should return 401 for missing token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/verify');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Authorization header is required');
    });

    it('should return 401 for invalid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should return 401 for missing token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    const changePasswordData = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
    };

    it('should change password successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('oldpassword123', 12),
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Password changed successfully');
    });

    it('should return 400 for incorrect current password', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('differentpassword', 12),
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Current password is incorrect');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user-id');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.role).toBe(UserRole.USER);
    });

    it('should return 401 for missing token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/profile');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});