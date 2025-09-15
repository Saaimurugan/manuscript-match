import { Request, Response, NextFunction } from 'express';
import { authorize, requireAdmin } from '@/middleware/auth';
import { UserRole } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

// Mock the dependencies
jest.mock('@/services/AuthService');
jest.mock('@/repositories/UserRepository');
jest.mock('@/repositories/ActivityLogRepository');
jest.mock('@/config/database');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request> & { user?: any };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: {},
    };
    
    mockResponse = {};
    mockNext = jest.fn();
  });

  // Note: authenticate middleware tests are covered in integration tests
  // since they require complex mocking of the AuthService

  describe('authorize', () => {
    it('should allow access for user with correct role', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      
      const middleware = authorize([UserRole.ADMIN]);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for user with any of the allowed roles', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      
      const middleware = authorize([UserRole.USER, UserRole.ADMIN]);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should default to USER role if no role specified', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        // role is undefined
      };
      
      const middleware = authorize([UserRole.USER]);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw error if user not authenticated', () => {
      // Arrange
      delete mockRequest.user;
      const middleware = authorize([UserRole.USER]);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        )
      );
    });

    it('should throw error if user has insufficient permissions', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      
      const middleware = authorize([UserRole.ADMIN]);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient permissions',
          403
        )
      );
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Act
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for regular user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      // Act
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient permissions',
          403
        )
      );
    });
  });

  // Note: optionalAuth middleware tests are covered in integration tests
  // since they require complex mocking of the AuthService
});