import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserSessionRepository } from '@/repositories/UserSessionRepository';
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
const userSessionRepository = new UserSessionRepository(prisma);
const authService = new AuthService(userRepository, activityLogRepository, userSessionRepository);

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

/**
 * Enhanced role-based authorization middleware with hierarchy support
 */
export const requireRoleOrHigher = (minimumRole: UserRole) => {
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
      
      // Role hierarchy: ADMIN > MANAGER > QC > USER
      const roleHierarchy = {
        [UserRole.USER]: 1,
        [UserRole.QC]: 2,
        [UserRole.MANAGER]: 3,
        [UserRole.ADMIN]: 4,
      };

      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[minimumRole] || 0;

      if (userLevel < requiredLevel) {
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          `Insufficient role. Required: ${minimumRole} or higher, current: ${userRole}`,
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
 * QC or higher authorization middleware
 */
export const requireQC = requireRoleOrHigher(UserRole.QC);

/**
 * Manager or higher authorization middleware
 */
export const requireManager = requireRoleOrHigher(UserRole.MANAGER);

/**
 * Session validation middleware - ensures session is active and valid
 */
export const validateSession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    // The verifyToken method already validates the session
    // This middleware is mainly for explicit session checks if needed
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Logout middleware - handles token cleanup
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (token) {
        await authService.logout(token, req.user?.id);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to extract IP address and user agent for session tracking
 */
export const extractClientInfo = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Extract IP address
  const ipAddress = req.ip || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();

  // Extract user agent
  const userAgent = req.get('User-Agent');

  // Store in request for use by other middleware/controllers
  (req as any).clientInfo = {
    ipAddress,
    userAgent,
  };

  next();
};