import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { prisma } from '@/config/database';
import { AuthUser, UserRole } from '@/types';
import { CustomError, ErrorType } from './errorHandler';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

// Create service instances
const userRepository = new UserRepository(prisma);
const activityLogRepository = new ActivityLogRepository(prisma);
const authService = new AuthService(userRepository, activityLogRepository);

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new CustomError(
        ErrorType.AUTHENTICATION_ERROR,
        'Authorization header is required',
        401
      );
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      throw new CustomError(
        ErrorType.AUTHENTICATION_ERROR,
        'Token is required',
        401
      );
    }

    // Verify token and get user
    const user = await authService.verifyToken(token);
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware - checks user roles
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication required',
          401
        );
      }

      const userRole = req.user.role || UserRole.USER;
      
      if (!allowedRoles.includes(userRole)) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Insufficient permissions',
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = authorize([UserRole.ADMIN]);

/**
 * User context enrichment middleware - adds user context to request
 */
export const enrichUserContext = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user) {
      // Add additional user context if needed
      // For example, fetch user preferences, settings, etc.
      // This is where you could add more user-specific data to the request
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (token) {
        try {
          const user = await authService.verifyToken(token);
          req.user = user;
        } catch (error) {
          // Ignore token errors for optional auth
          console.warn('Optional auth token verification failed:', error);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};