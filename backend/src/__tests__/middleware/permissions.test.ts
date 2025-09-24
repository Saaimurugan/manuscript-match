import { Request, Response, NextFunction } from 'express';
import { 
  requirePermission, 
  requirePermissions, 
  requireAnyPermission,
  requireRoleOrHigher,
  checkUserBlocked,
  RequirePermission,
  RequireRole
} from '../../middleware/permissions';
import { PermissionService } from '../../services/PermissionService';
import { UserRepository } from '../../repositories/UserRepository';
import { ActivityLogRepository } from '../../repositories/ActivityLogRepository';
import { UserRole } from '../../types';
import { CustomError } from '../../middleware/errorHandler';

// Mock the services
jest.mock('../../services/PermissionService');
jest.mock('../../repositories/UserRepository');
jest.mock('../../repositories/ActivityLogRepository');
jest.mock('../../repositories/PermissionRepository');

const mockPermissionService = {
  hasPermission: jest.fn(),
  checkPermissions: jest.fn(),
} as unknown as PermissionService;

const mockUserRepository = {
  findById: jest.fn(),
} as unknown as UserRepository;

const mockActivityLogRepository = {
  create: jest.fn(),
} as unknown as ActivityLogRepository;

// Mock the service instances
jest.mock('../../middleware/permissions', () => {
  const actual = jest.requireActual('../../middleware/permissions');
  return {
    ...actual,
    permissionService: mockPermissionService,
    userRepository: mockUserRepository,
    activityLogRepository: mockActivityLogRepository,
  };
});

describe('Permission Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.USER,
      },
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      params: {},
      body: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requirePermission', () => {
    it('should call next when user has permission', async () => {
      (mockPermissionService.hasPermission as jest.Mock).mockResolvedValue(true);

      const middleware = requirePermission('users.read');
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-1', 'users.read');
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw error when user lacks permission', async () => {
      (mockPermissionService.hasPermission as jest.Mock).mockResolvedValue(false);

      const middleware = requirePermission('users.delete');
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        details: JSON.stringify({
          requiredPermission: 'users.delete',
          userRole: UserRole.USER,
          endpoint: '/api/test',
          method: 'GET',
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceType: 'permission',
        resourceId: 'users.delete',
      });
    });

    it('should throw error when user is not authenticated', async () => {
      delete mockRequest.user;

      const middleware = requirePermission('users.read');
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });
  });

  describe('requirePermissions', () => {
    it('should call next when user has all permissions', async () => {
      (mockPermissionService.checkPermissions as jest.Mock).mockResolvedValue({
        hasPermission: true,
        missingPermissions: [],
      });

      const middleware = requirePermissions(['users.read', 'users.update']);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockPermissionService.checkPermissions).toHaveBeenCalledWith(
        'user-1',
        ['users.read', 'users.update']
      );
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw error when user lacks some permissions', async () => {
      (mockPermissionService.checkPermissions as jest.Mock).mockResolvedValue({
        hasPermission: false,
        missingPermissions: ['users.delete'],
      });

      const middleware = requirePermissions(['users.read', 'users.delete']);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        details: JSON.stringify({
          requiredPermissions: ['users.read', 'users.delete'],
          missingPermissions: ['users.delete'],
          userRole: UserRole.USER,
          endpoint: '/api/test',
          method: 'GET',
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceType: 'permissions',
      });
    });
  });

  describe('requireAnyPermission', () => {
    it('should call next when user has any of the permissions', async () => {
      (mockPermissionService.hasPermission as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const middleware = requireAnyPermission(['users.delete', 'users.update']);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw error when user lacks all permissions', async () => {
      (mockPermissionService.hasPermission as jest.Mock).mockResolvedValue(false);

      const middleware = requireAnyPermission(['users.delete', 'users.manage']);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
    });
  });

  describe('requireRoleOrHigher', () => {
    it('should call next when user has sufficient role', () => {
      mockRequest.user!.role = UserRole.ADMIN;

      const middleware = requireRoleOrHigher(UserRole.MANAGER);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw error when user has insufficient role', () => {
      mockRequest.user!.role = UserRole.USER;

      const middleware = requireRoleOrHigher(UserRole.ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
    });

    it('should call next when user has exact role', () => {
      mockRequest.user!.role = UserRole.QC;

      const middleware = requireRoleOrHigher(UserRole.QC);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('checkUserBlocked', () => {
    it('should call next when user is active', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
      });

      await checkUserBlocked(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw error when user is blocked', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue({
        id: 'user-1',
        status: 'BLOCKED',
      });

      await checkUserBlocked(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
    });

    it('should call next when no user is authenticated', async () => {
      delete mockRequest.user;

      await checkUserBlocked(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      await checkUserBlocked(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(CustomError));
    });
  });

  describe('Decorators', () => {
    describe('RequirePermission', () => {
      it('should allow method execution when user has permission', async () => {
        (mockPermissionService.hasPermission as jest.Mock).mockResolvedValue(true);

        class TestController {
          @RequirePermission('users.read')
          async testMethod(_req: Request, _res: Response) {
            return 'success';
          }
        }

        const controller = new TestController();
        const result = await controller.testMethod(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(result).toBe('success');
        expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-1', 'users.read');
      });

      it('should throw error when user lacks permission', async () => {
        (mockPermissionService.hasPermission as jest.Mock).mockResolvedValue(false);

        class TestController {
          @RequirePermission('users.delete')
          async testMethod(_req: Request, _res: Response) {
            return 'success';
          }
        }

        const controller = new TestController();
        
        await expect(
          controller.testMethod(mockRequest as Request, mockResponse as Response)
        ).rejects.toThrow(CustomError);
      });
    });

    describe('RequireRole', () => {
      it('should allow method execution when user has sufficient role', () => {
        mockRequest.user!.role = UserRole.ADMIN;

        class TestController {
          @RequireRole(UserRole.MANAGER)
          testMethod(_req: Request, _res: Response) {
            return 'success';
          }
        }

        const controller = new TestController();
        const result = controller.testMethod(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(result).toBe('success');
      });

      it('should throw error when user has insufficient role', () => {
        mockRequest.user!.role = UserRole.USER;

        class TestController {
          @RequireRole(UserRole.ADMIN)
          testMethod(_req: Request, _res: Response) {
            return 'success';
          }
        }

        const controller = new TestController();
        
        expect(() =>
          controller.testMethod(mockRequest as Request, mockResponse as Response)
        ).toThrow(CustomError);
      });
    });
  });
});