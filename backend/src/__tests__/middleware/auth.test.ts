import { Request, Response, NextFunction } from 'express';
import { 
  authorize, 
  requireAdmin, 
  requireRoleOrHigher, 
  requireQC, 
  requireManager,
  extractClientInfo 
} from '@/middleware/auth';
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

  describe('requireRoleOrHigher', () => {
    it('should allow access for user with exact required role', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'qc@example.com',
        role: UserRole.QC,
      };

      const middleware = requireRoleOrHigher(UserRole.QC);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for user with higher role', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      const middleware = requireRoleOrHigher(UserRole.QC);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for user with lower role', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const middleware = requireRoleOrHigher(UserRole.QC);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient role. Required: QC or higher, current: USER',
          403
        )
      );
    });

    it('should deny access for unauthenticated user', () => {
      // Arrange
      delete mockRequest.user;
      const middleware = requireRoleOrHigher(UserRole.QC);

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

    it('should default to USER role if no role specified', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        // role is undefined
      };

      const middleware = requireRoleOrHigher(UserRole.USER);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireQC', () => {
    it('should allow access for QC user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'qc@example.com',
        role: UserRole.QC,
      };

      // Act
      requireQC(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for Manager user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
      };

      // Act
      requireQC(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for Admin user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Act
      requireQC(mockRequest as Request, mockResponse as Response, mockNext);

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
      requireQC(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient role. Required: QC or higher, current: USER',
          403
        )
      );
    });
  });

  describe('requireManager', () => {
    it('should allow access for Manager user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
      };

      // Act
      requireManager(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for Admin user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Act
      requireManager(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for QC user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'qc@example.com',
        role: UserRole.QC,
      };

      // Act
      requireManager(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient role. Required: MANAGER or higher, current: QC',
          403
        )
      );
    });

    it('should deny access for regular user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      // Act
      requireManager(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient role. Required: MANAGER or higher, current: USER',
          403
        )
      );
    });
  });

  describe('extractClientInfo', () => {
    it('should extract IP address from req.ip', () => {
      // Arrange
      mockRequest.ip = '192.168.1.1';
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0 Test Browser',
      };

      // Act
      extractClientInfo(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).clientInfo).toEqual({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract IP address from x-forwarded-for header', () => {
      // Arrange
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser',
      };

      // Act
      extractClientInfo(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).clientInfo).toEqual({
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle missing IP address and user agent', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      extractClientInfo(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).clientInfo).toEqual({
        ipAddress: undefined,
        userAgent: undefined,
      });
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  // Note: authenticate, optionalAuth, and session-related middleware tests 
  // are covered in integration tests since they require complex mocking 
  // of the AuthService and database operations
});