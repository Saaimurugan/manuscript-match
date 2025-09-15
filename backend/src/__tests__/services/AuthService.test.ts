import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRole } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('@/repositories/UserRepository');
jest.mock('@/repositories/ActivityLogRepository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('@/config/environment', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      expiresIn: '24h',
    },
  },
}));

const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const MockedActivityLogRepository = ActivityLogRepository as jest.MockedClass<typeof ActivityLogRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockActivityLogRepository: jest.Mocked<ActivityLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = new MockedUserRepository({} as any) as jest.Mocked<UserRepository>;
    mockActivityLogRepository = new MockedActivityLogRepository({} as any) as jest.Mocked<ActivityLogRepository>;

    authService = new AuthService(mockUserRepository, mockActivityLogRepository);
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockUserRepository.create.mockResolvedValue(mockUser as any);
      mockActivityLogRepository.create.mockResolvedValue({} as any);
      mockedJwt.sign.mockReturnValue('jwt-token' as never);

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        action: 'USER_REGISTERED',
        details: JSON.stringify({ email: 'test@example.com' }),
      });
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        'test-secret',
        { expiresIn: '24h' }
      );
      expect(result).toEqual({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        token: 'jwt-token',
        expiresIn: '24h',
      });
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        new CustomError(
          ErrorType.VALIDATION_ERROR,
          'User with this email already exists',
          409
        )
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockActivityLogRepository.create.mockResolvedValue({} as any);
      mockedJwt.sign.mockReturnValue('jwt-token' as never);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        action: 'LOGIN_SUCCESS',
        details: JSON.stringify({ email: 'test@example.com' }),
      });
      expect(result).toEqual({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        token: 'jwt-token',
        expiresIn: '24h',
      });
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(
        new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Invalid email or password',
          401
        )
      );
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error and log failed attempt if password is invalid', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(
        new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Invalid email or password',
          401
        )
      );
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        action: 'LOGIN_FAILED',
        details: JSON.stringify({ email: 'test@example.com', reason: 'invalid_password' }),
      });
    });
  });

  describe('verifyToken', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPayload = {
      userId: 'user-id',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    it('should verify token successfully', async () => {
      // Arrange
      mockedJwt.verify.mockReturnValue(mockPayload as never);
      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      // Act
      const result = await authService.verifyToken('valid-token');

      // Assert
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      });
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockedJwt.verify.mockReturnValue(mockPayload as never);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.verifyToken('valid-token')).rejects.toThrow(
        new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'User not found',
          401
        )
      );
    });

    it('should throw error if token is invalid', async () => {
      // Arrange
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      // Act & Assert
      await expect(authService.verifyToken('invalid-token')).rejects.toThrow(
        new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Invalid token',
          401
        )
      );
    });

    it('should throw error if token is expired', async () => {
      // Arrange
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      // Act & Assert
      await expect(authService.verifyToken('expired-token')).rejects.toThrow(
        new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Token expired',
          401
        )
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      // Arrange
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      // Act
      const result = await authService.hashPassword('password123');

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).toBe('hashed-password');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      // Arrange
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await authService.verifyPassword('password123', 'hashed-password');

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      // Arrange
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await authService.verifyPassword('wrong-password', 'hashed-password');

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
      expect(result).toBe(false);
    });
  });
});