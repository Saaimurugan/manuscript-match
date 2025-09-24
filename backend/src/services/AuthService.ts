import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserSessionRepository } from '@/repositories/UserSessionRepository';
import { 
  AuthUser, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  JwtPayload,
  UserRole,
  UserSession 
} from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export class AuthService {
  private userRepository: UserRepository;
  private activityLogRepository: ActivityLogRepository;
  private userSessionRepository: UserSessionRepository;

  constructor(
    userRepository: UserRepository,
    activityLogRepository: ActivityLogRepository,
    userSessionRepository: UserSessionRepository
  ) {
    this.userRepository = userRepository;
    this.activityLogRepository = activityLogRepository;
    this.userSessionRepository = userSessionRepository;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User with this email already exists',
        409
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.userRepository.create({
      email,
      passwordHash,
    });

    // Log registration activity
    await this.activityLogRepository.create({
      userId: user.id,
      action: 'USER_REGISTERED',
      details: JSON.stringify({ email }),
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      },
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Login user with session tracking
   */
  async login(data: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new CustomError(
        ErrorType.AUTHENTICATION_ERROR,
        'Invalid email or password',
        401
      );
    }

    // Check if user is blocked
    if (user.status === 'BLOCKED') {
      // Log blocked user login attempt
      await this.activityLogRepository.create({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        details: JSON.stringify({ email, reason: 'user_blocked' }),
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      });

      throw new CustomError(
        ErrorType.AUTHORIZATION_ERROR,
        'Account has been blocked. Please contact an administrator.',
        403
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await this.activityLogRepository.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: JSON.stringify({ email, reason: 'invalid_password' }),
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      });

      throw new CustomError(
        ErrorType.AUTHENTICATION_ERROR,
        'Invalid email or password',
        401
      );
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // Create session record
    const expiresAt = new Date(Date.now() + this.parseExpiresIn(config.jwt.expiresIn));
    await this.userSessionRepository.create({
      userId: user.id,
      token,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      expiresAt,
    });

    // Log successful login
    await this.activityLogRepository.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: JSON.stringify({ email }),
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      },
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Verify JWT token with session validation
   */
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // Check if session exists and is active
      const session = await this.userSessionRepository.findByToken(token);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Session expired or invalid',
          401
        );
      }

      // Verify user still exists and is not blocked
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        // Deactivate session if user no longer exists
        await this.userSessionRepository.deactivate(token);
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'User not found',
          401
        );
      }

      // Check if user is blocked
      if (user.status === 'BLOCKED') {
        // Deactivate all sessions for blocked user
        await this.userSessionRepository.deactivateAllForUser(user.id);
        throw new CustomError(
          ErrorType.AUTHORIZATION_ERROR,
          'Account has been blocked. Please contact an administrator.',
          403
        );
      }

      // Update session last used time
      await this.userSessionRepository.updateLastUsed(token);

      return {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Invalid token',
          401
        );
      }
      if (error instanceof jwt.TokenExpiredError) {
        // Deactivate expired session
        try {
          await this.userSessionRepository.deactivate(token);
        } catch (deactivateError) {
          // Ignore deactivation errors for expired tokens
        }
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'Token expired',
          401
        );
      }
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Hash password (utility method)
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password (utility method)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Logout user by deactivating session
   */
  async logout(token: string, userId?: string): Promise<void> {
    try {
      await this.userSessionRepository.deactivate(token);
      
      if (userId) {
        await this.activityLogRepository.create({
          userId,
          action: 'LOGOUT',
          details: JSON.stringify({ method: 'explicit' }),
        });
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.error('Error during logout:', error);
    }
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAllSessions(userId: string, performedBy?: string): Promise<void> {
    await this.userSessionRepository.deactivateAllForUser(userId);
    
    await this.activityLogRepository.create({
      userId: performedBy || userId,
      action: 'LOGOUT_ALL_SESSIONS',
      details: JSON.stringify({ 
        targetUserId: userId,
        performedBy: performedBy || userId,
      }),
      resourceType: 'user',
      resourceId: userId,
    });
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return this.userSessionRepository.findActiveByUserId(userId);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.userSessionRepository.cleanupExpired();
  }

  /**
   * Parse expires in string to milliseconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiresIn format');
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid time unit');
    }
  }
}