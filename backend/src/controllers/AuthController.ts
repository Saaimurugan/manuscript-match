import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserSessionRepository } from '@/repositories/UserSessionRepository';
import { prisma } from '@/config/database';
import { 
  LoginRequest, 
  RegisterRequest, 
  ApiResponse, 
  AuthResponse,
  AuthUser
} from '@/types';
import { validateData } from '@/validation';
import { loginSchema, registerSchema, changePasswordSchema } from '@/validation/schemas';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    const userRepository = new UserRepository(prisma);
    const activityLogRepository = new ActivityLogRepository(prisma);
    const userSessionRepository = new UserSessionRepository(prisma);
    this.authService = new AuthService(userRepository, activityLogRepository, userSessionRepository);
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = validateData(registerSchema, req.body) as RegisterRequest;
      
      const result = await this.authService.register(validatedData);
      
      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: result,
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user with session tracking
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = validateData(loginSchema, req.body) as LoginRequest;
      
      // Extract client info for session tracking
      const clientInfo = (req as any).clientInfo || {};
      const ipAddress = clientInfo.ipAddress || req.ip;
      const userAgent = clientInfo.userAgent || req.get('User-Agent');
      
      const result = await this.authService.login(validatedData, ipAddress, userAgent);
      
      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: result,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify token and get current user
   */
  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const response: ApiResponse<AuthUser> = {
        success: true,
        data: req.user,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user with session cleanup
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : authHeader;

        if (token) {
          await this.authService.logout(token, req.user?.id);
        }
      }

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Logged out successfully' },
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout all sessions for current user
   */
  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      await this.authService.logoutAllSessions(req.user.id);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'All sessions logged out successfully' },
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get active sessions for current user
   */
  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const sessions = await this.authService.getActiveSessions(req.user.id);

      // Remove sensitive token information from response
      const safeSessions = sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
      }));

      const response: ApiResponse<typeof safeSessions> = {
        success: true,
        data: safeSessions,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change user password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const validatedData = validateData(changePasswordSchema, req.body);
      const { currentPassword, newPassword } = validatedData;

      // Get user repository to update password
      const userRepository = new UserRepository(prisma);
      const user = await userRepository.findById(req.user.id);
      
      if (!user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'User not found',
          404
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await this.authService.verifyPassword(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Current password is incorrect',
          400
        );
      }

      // Hash new password and update
      const newPasswordHash = await this.authService.hashPassword(newPassword);
      await userRepository.update(user.id, { passwordHash: newPasswordHash });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Password changed successfully' },
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   */
  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      // Get full user details
      const userRepository = new UserRepository(prisma);
      const user = await userRepository.findById(req.user.id);
      
      if (!user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'User not found',
          404
        );
      }

      const userProfile: AuthUser = {
        id: user.id,
        email: user.email,
        role: user.role as any,
        name: user.name,
        phone: user.phone,
        department: user.department,
        bio: user.bio,
        profileImage: user.profileImage,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      const response: ApiResponse<AuthUser> = {
        success: true,
        data: userProfile,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}