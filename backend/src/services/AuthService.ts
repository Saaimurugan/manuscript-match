import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { 
  AuthUser, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  JwtPayload,
  UserRole 
} from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export class AuthService {
  private userRepository: UserRepository;
  private activityLogRepository: ActivityLogRepository;

  constructor(
    userRepository: UserRepository,
    activityLogRepository: ActivityLogRepository
  ) {
    this.userRepository = userRepository;
    this.activityLogRepository = activityLogRepository;
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
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await this.activityLogRepository.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: JSON.stringify({ email, reason: 'invalid_password' }),
      });

      throw new CustomError(
        ErrorType.AUTHENTICATION_ERROR,
        'Invalid email or password',
        401
      );
    }

    // Log successful login
    await this.activityLogRepository.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
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
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // Verify user still exists
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new CustomError(
          ErrorType.AUTHENTICATION_ERROR,
          'User not found',
          401
        );
      }

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
}