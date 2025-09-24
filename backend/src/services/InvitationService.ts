import crypto from 'crypto';
import { UserInvitationRepository } from '@/repositories/UserInvitationRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { EmailService } from './EmailService';
import { 
  UserInvitation, 
  UserRole, 
  InvitationStatus, 
  ExtendedUser 
} from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export interface InviteUserRequest {
  email: string;
  role: UserRole;
  invitedBy: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  name?: string;
}

export interface InvitationServiceDependencies {
  userInvitationRepository: UserInvitationRepository;
  userRepository: UserRepository;
  activityLogRepository: ActivityLogRepository;
  emailService: EmailService;
}

export class InvitationService {
  private userInvitationRepository: UserInvitationRepository;
  private userRepository: UserRepository;
  private activityLogRepository: ActivityLogRepository;
  private emailService: EmailService;

  // Default invitation expiry: 7 days
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(dependencies: InvitationServiceDependencies) {
    this.userInvitationRepository = dependencies.userInvitationRepository;
    this.userRepository = dependencies.userRepository;
    this.activityLogRepository = dependencies.activityLogRepository;
    this.emailService = dependencies.emailService;
  }

  /**
   * Invite a new user to the system
   */
  async inviteUser(request: InviteUserRequest): Promise<UserInvitation> {
    const { email, role, invitedBy } = request;

    // Validate email format
    this.validateEmail(email);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'A user with this email already exists',
        409
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitations = await this.userInvitationRepository.findByEmail(email);
    const pendingInvitation = existingInvitations.find(
      inv => inv.status === InvitationStatus.PENDING && new Date(inv.expiresAt) > new Date()
    );

    if (pendingInvitation) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'A pending invitation already exists for this email',
        409
      );
    }

    // Get inviter information
    const inviter = await this.userRepository.findById(invitedBy);
    if (!inviter) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Inviter not found',
        404
      );
    }

    // Generate secure invitation token
    const token = this.generateInvitationToken();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    // Create invitation record
    const invitation = await this.userInvitationRepository.create({
      email,
      role,
      token,
      invitedBy,
      expiresAt,
    });

    // Send invitation email
    try {
      const emailResult = await this.emailService.sendInvitationEmail({
        email,
        inviterName: inviter.email, // Using email as name for now
        inviterEmail: inviter.email,
        role,
        invitationToken: token,
        expiresAt,
      });

      if (!emailResult.success) {
        // Log email failure but don't fail the invitation creation
        await this.activityLogRepository.create({
          userId: invitedBy,
          action: 'INVITATION_EMAIL_FAILED',
          details: JSON.stringify({
            email,
            role,
            error: emailResult.error,
          }),
        });
      }
    } catch (error) {
      // Log email error but don't fail the invitation
      await this.activityLogRepository.create({
        userId: invitedBy,
        action: 'INVITATION_EMAIL_ERROR',
        details: JSON.stringify({
          email,
          role,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }

    // Log invitation activity
    await this.activityLogRepository.create({
      userId: invitedBy,
      action: 'USER_INVITED',
      details: JSON.stringify({
        invitedEmail: email,
        role,
        invitationId: invitation.id,
        expiresAt: expiresAt.toISOString(),
      }),
    });

    const result: UserInvitation = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role as UserRole,
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.invitedAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      status: invitation.status as InvitationStatus,
    };
    return result;
  }

  /**
   * Accept an invitation and create user account
   */
  async acceptInvitation(request: AcceptInvitationRequest): Promise<ExtendedUser> {
    const { token, password } = request;

    // Find invitation by token
    const invitation = await this.userInvitationRepository.findByToken(token);
    if (!invitation) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Invalid invitation token',
        404
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        `Invitation is ${invitation.status.toLowerCase()}`,
        400
      );
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expiresAt)) {
      // Mark as expired
      await this.userInvitationRepository.update(invitation.id, {
        status: InvitationStatus.EXPIRED,
      });

      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Invitation has expired',
        400
      );
    }

    // Check if user already exists (race condition protection)
    const existingUser = await this.userRepository.findByEmail(invitation.email);
    if (existingUser) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User account already exists',
        409
      );
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user account
    const user = await this.userRepository.create({
      email: invitation.email,
      passwordHash,
      role: invitation.role,
    });

    // Update invitation status
    await this.userInvitationRepository.update(invitation.id, {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    // Log account creation activity
    await this.activityLogRepository.create({
      userId: user.id,
      action: 'ACCOUNT_CREATED_FROM_INVITATION',
      details: JSON.stringify({
        invitationId: invitation.id,
        invitedBy: invitation.invitedBy,
        role: invitation.role,
      }),
    });

    // Log activity for the inviter
    await this.activityLogRepository.create({
      userId: invitation.invitedBy,
      action: 'INVITATION_ACCEPTED',
      details: JSON.stringify({
        invitationId: invitation.id,
        newUserId: user.id,
        email: invitation.email,
        role: invitation.role,
      }),
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as any,
      blockedAt: user.blockedAt || undefined,
      blockedBy: user.blockedBy || undefined,
      invitedBy: user.invitedBy || undefined,
      invitationToken: user.invitationToken || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    } as ExtendedUser;
  }

  /**
   * Get invitation by token (for validation)
   */
  async getInvitationByToken(token: string): Promise<UserInvitation | null> {
    if (!token) {
      return null;
    }

    const invitation = await this.userInvitationRepository.findByToken(token);
    if (!invitation) {
      return null;
    }

    // Check if expired and update status if needed
    if (invitation.status === InvitationStatus.PENDING && new Date() > new Date(invitation.expiresAt)) {
      await this.userInvitationRepository.update(invitation.id, {
        status: InvitationStatus.EXPIRED,
      });
      const expiredResult: UserInvitation = { 
        id: invitation.id,
        email: invitation.email,
        role: invitation.role as UserRole,
        token: invitation.token,
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        status: InvitationStatus.EXPIRED,
      };
      if (invitation.inviter) {
        expiredResult.inviter = {
          ...invitation.inviter,
          role: invitation.inviter.role as UserRole,
        };
      }
      return expiredResult;
    }

    const result: UserInvitation = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role as UserRole,
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.invitedAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      status: invitation.status as InvitationStatus,
    };
    if (invitation.inviter) {
      result.inviter = {
        ...invitation.inviter,
        role: invitation.inviter.role as UserRole,
      };
    }
    return result;
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string, revokedBy: string): Promise<UserInvitation> {
    const invitation = await this.userInvitationRepository.findById(invitationId);
    if (!invitation) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Invitation not found',
        404
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Only pending invitations can be revoked',
        400
      );
    }

    const revokedInvitation = await this.userInvitationRepository.revokeInvitation(invitationId);

    // Log revocation activity
    await this.activityLogRepository.create({
      userId: revokedBy,
      action: 'INVITATION_REVOKED',
      details: JSON.stringify({
        invitationId,
        email: invitation.email,
        role: invitation.role,
        originalInviter: invitation.invitedBy,
      }),
    });

    const result: UserInvitation = {
      id: revokedInvitation.id,
      email: revokedInvitation.email,
      role: revokedInvitation.role as UserRole,
      token: revokedInvitation.token,
      invitedBy: revokedInvitation.invitedBy,
      invitedAt: revokedInvitation.invitedAt,
      expiresAt: revokedInvitation.expiresAt,
      acceptedAt: revokedInvitation.acceptedAt,
      status: revokedInvitation.status as InvitationStatus,
    };
    return result;
  }

  /**
   * Get all invitations with optional filtering
   */
  async getInvitations(options?: {
    status?: InvitationStatus;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }

    const queryOptions: any = { where };
    if (options?.skip !== undefined) {
      queryOptions.skip = options.skip;
    }
    if (options?.take !== undefined) {
      queryOptions.take = options.take;
    }
    
    return this.userInvitationRepository.findManyWithInviter(queryOptions);
  }

  /**
   * Clean up expired invitations (utility method)
   */
  async cleanupExpiredInvitations(): Promise<number> {
    return this.userInvitationRepository.markExpiredInvitations();
  }

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!email || typeof email !== 'string') {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Email is required and must be a string',
        400
      );
    }
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Email cannot be empty',
        400
      );
    }
    
    if (!emailRegex.test(trimmedEmail)) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Invalid email format',
        400
      );
    }
  }
}