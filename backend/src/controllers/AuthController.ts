import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
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
    this.authService = new AuthService(userRepository, activityLogRepository);
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
   * Login user
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = validateData(loginSchema, req.body) as LoginRequest;
      
      const result = await this.authService.login(validatedData);
      
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
   * Logout user (client-side token removal)
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Since we're using stateless JWT tokens, logout is handled client-side
      // We just log the activity for audit purposes
      if (req.user) {
        // Activity logging is handled by the requestLogger middleware
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