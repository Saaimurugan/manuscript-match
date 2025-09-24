import { InvitationService } from '@/services/InvitationService';
import { UserInvitationRepository } from '@/repositories/UserInvitationRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { EmailService } from '@/services/EmailService';
import { UserRole, InvitationStatus } from '@/types';
import { CustomError } from '@/middleware/errorHandler';

// Mock dependencies
jest.mock('@/repositories/UserInvitationRepository');
jest.mock('@/repositories/UserRepository');
jest.mock('@/repositories/ActivityLogRepository');
jest.mock('@/services/EmailService');
jest.mock('bcrypt');

describe('InvitationService', () => {
  let invitationService: InvitationService;
  let mockUserInvitationRepository: jest.Mocked<UserInvitationRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockActivityLogRepository: jest.Mocked<ActivityLogRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  const mockInviter = {
    id: 'inviter-id',
    email: 'inviter@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN',
    status: 'ACTIVE',
    blockedAt: null,
    blockedBy: null,
    invitedBy: null,
    invitationToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvitation = {
    id: 'invitation-id',
    email: 'test@example.com',
    role: UserRole.USER,
    token: 'test-token',
    invitedBy: 'inviter-id',
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    status: InvitationStatus.PENDING,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockUserInvitationRepository = new UserInvitationRepository({} as any) as jest.Mocked<UserInvitationRepository>;
    mockUserRepository = new UserRepository({} as any) as jest.Mocked<UserRepository>;
    mockActivityLogRepository = new ActivityLogRepository({} as any) as jest.Mocked<ActivityLogRepository>;
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;

    // Create service instance
    invitationService = new InvitationService({
      userInvitationRepository: mockUserInvitationRepository,
      userRepository: mockUserRepository,
      activityLogRepository: mockActivityLogRepository,
      emailService: mockEmailService,
    });
  });

  describe('inviteUser', () => {
    const inviteRequest = {
      email: 'test@example.com',
      role: UserRole.USER,
      invitedBy: 'inviter-id',
    };

    beforeEach(() => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserInvitationRepository.findByEmail.mockResolvedValue([]);
      mockUserRepository.findById.mockResolvedValue(mockInviter);
      mockUserInvitationRepository.create.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue({ success: true, messageId: 'test-id' });
      mockActivityLogRepository.create.mockResolvedValue({} as any);
    });

    it('should successfully invite a new user', async () => {
      const result = await invitationService.inviteUser(inviteRequest);

      expect(result).toEqual(mockInvitation);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserInvitationRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('inviter-id');
      expect(mockUserInvitationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          role: UserRole.USER,
          invitedBy: 'inviter-id',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalled();
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'inviter-id',
          action: 'USER_INVITED',
        })
      );
    });

    it('should throw error if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockInviter);

      await expect(invitationService.inviteUser(inviteRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserInvitationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if pending invitation already exists', async () => {
      const pendingInvitation = {
        ...mockInvitation,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
      };
      mockUserInvitationRepository.findByEmail.mockResolvedValue([pendingInvitation]);

      await expect(invitationService.inviteUser(inviteRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserInvitationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if inviter not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(invitationService.inviteUser(inviteRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserInvitationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for invalid email format', async () => {
      const invalidRequest = { ...inviteRequest, email: 'invalid-email' };

      await expect(invitationService.inviteUser(invalidRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should continue if email sending fails', async () => {
      mockEmailService.sendInvitationEmail.mockResolvedValue({ 
        success: false, 
        error: 'Email service unavailable' 
      });

      const result = await invitationService.inviteUser(inviteRequest);

      expect(result).toEqual(mockInvitation);
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVITATION_EMAIL_FAILED',
        })
      );
    });
  });

  describe('acceptInvitation', () => {
    const acceptRequest = {
      token: 'test-token',
      password: 'newpassword123',
    };

    const mockUser = {
      id: 'new-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: 'USER',
      status: 'ACTIVE',
      blockedAt: null,
      blockedBy: null,
      invitedBy: null,
      invitationToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockUserInvitationRepository.findByToken.mockResolvedValue({
        ...mockInvitation,
        inviter: mockInviter,
      });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockUserInvitationRepository.update.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      // Mock bcrypt
      const bcrypt = require('bcrypt');
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
    });

    it('should successfully accept invitation and create user', async () => {
      const result = await invitationService.acceptInvitation(acceptRequest);

      expect(result).toEqual(expect.objectContaining({
        id: 'new-user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      }));
      
      expect(mockUserInvitationRepository.findByToken).toHaveBeenCalledWith('test-token');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
      });
      expect(mockUserInvitationRepository.update).toHaveBeenCalledWith(
        'invitation-id',
        expect.objectContaining({
          status: InvitationStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        })
      );
      expect(mockActivityLogRepository.create).toHaveBeenCalledTimes(2); // User creation and inviter notification
    });

    it('should throw error for invalid token', async () => {
      mockUserInvitationRepository.findByToken.mockResolvedValue(null);

      await expect(invitationService.acceptInvitation(acceptRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for non-pending invitation', async () => {
      mockUserInvitationRepository.findByToken.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
        inviter: mockInviter,
      });

      await expect(invitationService.acceptInvitation(acceptRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for expired invitation', async () => {
      mockUserInvitationRepository.findByToken.mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        inviter: mockInviter,
      });

      await expect(invitationService.acceptInvitation(acceptRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserInvitationRepository.update).toHaveBeenCalledWith(
        'invitation-id',
        { status: InvitationStatus.EXPIRED }
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(invitationService.acceptInvitation(acceptRequest))
        .rejects.toThrow(CustomError);
      
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation for valid token', async () => {
      mockUserInvitationRepository.findByToken.mockResolvedValue({
        ...mockInvitation,
        inviter: mockInviter,
      });

      const result = await invitationService.getInvitationByToken('test-token');

      expect(result).toEqual(expect.objectContaining({
        id: 'invitation-id',
        email: 'test@example.com',
        status: InvitationStatus.PENDING,
      }));
    });

    it('should return null for invalid token', async () => {
      mockUserInvitationRepository.findByToken.mockResolvedValue(null);

      const result = await invitationService.getInvitationByToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      const result = await invitationService.getInvitationByToken('');

      expect(result).toBeNull();
      expect(mockUserInvitationRepository.findByToken).not.toHaveBeenCalled();
    });

    it('should mark expired invitation and return updated status', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        inviter: mockInviter,
      };
      mockUserInvitationRepository.findByToken.mockResolvedValue(expiredInvitation);
      mockUserInvitationRepository.update.mockResolvedValue({
        ...expiredInvitation,
        status: InvitationStatus.EXPIRED,
      });

      const result = await invitationService.getInvitationByToken('test-token');

      expect(result).toEqual(expect.objectContaining({
        status: InvitationStatus.EXPIRED,
      }));
      expect(mockUserInvitationRepository.update).toHaveBeenCalledWith(
        'invitation-id',
        { status: InvitationStatus.EXPIRED }
      );
    });
  });

  describe('revokeInvitation', () => {
    beforeEach(() => {
      mockUserInvitationRepository.findById.mockResolvedValue(mockInvitation);
      mockUserInvitationRepository.revokeInvitation.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.REVOKED,
      });
      mockActivityLogRepository.create.mockResolvedValue({} as any);
    });

    it('should successfully revoke pending invitation', async () => {
      const result = await invitationService.revokeInvitation('invitation-id', 'admin-id');

      expect(result.status).toBe(InvitationStatus.REVOKED);
      expect(mockUserInvitationRepository.revokeInvitation).toHaveBeenCalledWith('invitation-id');
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-id',
          action: 'INVITATION_REVOKED',
        })
      );
    });

    it('should throw error for non-existent invitation', async () => {
      mockUserInvitationRepository.findById.mockResolvedValue(null);

      await expect(invitationService.revokeInvitation('invalid-id', 'admin-id'))
        .rejects.toThrow(CustomError);
      
      expect(mockUserInvitationRepository.revokeInvitation).not.toHaveBeenCalled();
    });

    it('should throw error for non-pending invitation', async () => {
      mockUserInvitationRepository.findById.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(invitationService.revokeInvitation('invitation-id', 'admin-id'))
        .rejects.toThrow(CustomError);
      
      expect(mockUserInvitationRepository.revokeInvitation).not.toHaveBeenCalled();
    });
  });

  describe('getInvitations', () => {
    it('should return invitations with optional filtering', async () => {
      const mockInvitations = [mockInvitation];
      mockUserInvitationRepository.findManyWithInviter.mockResolvedValue(mockInvitations);

      const result = await invitationService.getInvitations({
        status: InvitationStatus.PENDING,
        skip: 0,
        take: 10,
      });

      expect(result).toEqual(mockInvitations);
      expect(mockUserInvitationRepository.findManyWithInviter).toHaveBeenCalledWith({
        where: { status: InvitationStatus.PENDING },
        skip: 0,
        take: 10,
      });
    });

    it('should return all invitations when no filters provided', async () => {
      const mockInvitations = [mockInvitation];
      mockUserInvitationRepository.findManyWithInviter.mockResolvedValue(mockInvitations);

      const result = await invitationService.getInvitations();

      expect(result).toEqual(mockInvitations);
      expect(mockUserInvitationRepository.findManyWithInviter).toHaveBeenCalledWith({
        where: {},
        skip: undefined,
        take: undefined,
      });
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should return count of expired invitations marked', async () => {
      mockUserInvitationRepository.markExpiredInvitations.mockResolvedValue(3);

      const result = await invitationService.cleanupExpiredInvitations();

      expect(result).toBe(3);
      expect(mockUserInvitationRepository.markExpiredInvitations).toHaveBeenCalled();
    });
  });

  describe('resendInvitation', () => {
    beforeEach(() => {
      mockUserInvitationRepository.findById.mockResolvedValue({
        ...mockInvitation,
        inviter: mockInviter,
      });
      mockEmailService.sendInvitationEmail.mockResolvedValue({ success: true, messageId: 'test-id' });
      mockActivityLogRepository.create.mockResolvedValue({} as any);
    });

    it('should successfully resend pending invitation', async () => {
      const result = await invitationService.resendInvitation('invitation-id', 'admin-id');

      expect(result.success).toBe(true);
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalled();
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-id',
          action: 'INVITATION_RESENT',
        })
      );
    });

    it('should throw error for non-existent invitation', async () => {
      mockUserInvitationRepository.findById.mockResolvedValue(null);

      await expect(invitationService.resendInvitation('invalid-id', 'admin-id'))
        .rejects.toThrow(CustomError);
    });

    it('should throw error for non-pending invitation', async () => {
      mockUserInvitationRepository.findById.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
        inviter: mockInviter,
      });

      await expect(invitationService.resendInvitation('invitation-id', 'admin-id'))
        .rejects.toThrow(CustomError);
    });

    it('should handle email sending failure', async () => {
      mockEmailService.sendInvitationEmail.mockResolvedValue({ 
        success: false, 
        error: 'Email service unavailable' 
      });

      const result = await invitationService.resendInvitation('invitation-id', 'admin-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service unavailable');
    });
  });

  describe('getInvitationStatistics', () => {
    it('should return comprehensive invitation statistics', async () => {
      const mockStats = {
        total: 10,
        pending: 3,
        accepted: 5,
        expired: 1,
        revoked: 1,
      };
      mockUserInvitationRepository.getInvitationStatistics.mockResolvedValue(mockStats);

      const result = await invitationService.getInvitationStatistics();

      expect(result).toEqual(mockStats);
      expect(mockUserInvitationRepository.getInvitationStatistics).toHaveBeenCalled();
    });
  });

  describe('bulkInviteUsers', () => {
    const bulkInviteRequest = {
      emails: ['user1@example.com', 'user2@example.com'],
      role: UserRole.USER,
      invitedBy: 'admin-id',
    };

    beforeEach(() => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserInvitationRepository.findByEmail.mockResolvedValue([]);
      mockUserRepository.findById.mockResolvedValue(mockInviter);
      mockUserInvitationRepository.create
        .mockResolvedValueOnce({ ...mockInvitation, email: 'user1@example.com' })
        .mockResolvedValueOnce({ ...mockInvitation, email: 'user2@example.com' });
      mockEmailService.sendInvitationEmail.mockResolvedValue({ success: true, messageId: 'test-id' });
      mockActivityLogRepository.create.mockResolvedValue({} as any);
    });

    it('should successfully invite multiple users', async () => {
      const result = await invitationService.bulkInviteUsers(bulkInviteRequest);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(mockUserInvitationRepository.create).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures gracefully', async () => {
      mockUserRepository.findByEmail
        .mockResolvedValueOnce(null) // First email is available
        .mockResolvedValueOnce(mockInviter); // Second email already exists

      const result = await invitationService.bulkInviteUsers(bulkInviteRequest);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.email).toBe('user2@example.com');
      expect(result.failed[0]?.reason).toContain('already exists');
    });

    it('should validate email format for all emails', async () => {
      const invalidRequest = {
        ...bulkInviteRequest,
        emails: ['valid@example.com', 'invalid-email'],
      };

      const result = await invitationService.bulkInviteUsers(invalidRequest);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.email).toBe('invalid-email');
      expect(result.failed[0]?.reason).toContain('Invalid email format');
    });
  });

  describe('sendInvitationReminders', () => {
    it('should send reminders for pending invitations', async () => {
      const pendingInvitations = [
        { ...mockInvitation, inviter: mockInviter },
        { ...mockInvitation, id: 'invitation-2', email: 'user2@example.com', inviter: mockInviter },
      ];
      mockUserInvitationRepository.findPendingInvitations.mockResolvedValue(pendingInvitations);
      mockEmailService.sendInvitationReminderEmail.mockResolvedValue({ success: true, messageId: 'test-id' });
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      const result = await invitationService.sendInvitationReminders('admin-id');

      expect(result.remindersSent).toBe(2);
      expect(result.failures).toBe(0);
      expect(mockEmailService.sendInvitationReminderEmail).toHaveBeenCalledTimes(2);
    });

    it('should handle email sending failures', async () => {
      const pendingInvitations = [{ ...mockInvitation, inviter: mockInviter }];
      mockUserInvitationRepository.findPendingInvitations.mockResolvedValue(pendingInvitations);
      mockEmailService.sendInvitationReminderEmail.mockResolvedValue({ 
        success: false, 
        error: 'Email service unavailable' 
      });

      const result = await invitationService.sendInvitationReminders('admin-id');

      expect(result.remindersSent).toBe(0);
      expect(result.failures).toBe(1);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle database connection errors', async () => {
      mockUserInvitationRepository.findByToken.mockRejectedValue(new Error('Database connection failed'));

      await expect(invitationService.getInvitationByToken('test-token'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle email service errors gracefully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserInvitationRepository.findByEmail.mockResolvedValue([]);
      mockUserRepository.findById.mockResolvedValue(mockInviter);
      mockUserInvitationRepository.create.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockRejectedValue(new Error('Email service down'));
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      const result = await invitationService.inviteUser({
        email: 'test@example.com',
        role: UserRole.USER,
        invitedBy: 'inviter-id',
      });

      expect(result).toEqual(mockInvitation);
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVITATION_EMAIL_FAILED',
        })
      );
    });

    it('should validate invitation token format', async () => {
      const result = await invitationService.getInvitationByToken('invalid-token-format');

      expect(result).toBeNull();
    });

    it('should handle concurrent invitation acceptance', async () => {
      mockUserInvitationRepository.findByToken.mockResolvedValue({
        ...mockInvitation,
        inviter: mockInviter,
      });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(invitationService.acceptInvitation({
        token: 'test-token',
        password: 'password123',
      })).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('token generation and validation', () => {
    it('should generate secure tokens', () => {
      const mockRandomBytes = Buffer.from('random-bytes-data');
      jest.spyOn(crypto, 'randomBytes').mockReturnValue(mockRandomBytes);

      const token = invitationService.generateInvitationToken();

      expect(token).toBe(mockRandomBytes.toString('hex'));
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('should validate token format', () => {
      expect(invitationService.isValidTokenFormat('a'.repeat(64))).toBe(true);
      expect(invitationService.isValidTokenFormat('invalid')).toBe(false);
      expect(invitationService.isValidTokenFormat('')).toBe(false);
      expect(invitationService.isValidTokenFormat('a'.repeat(63))).toBe(false);
    });
  });

  describe('invitation expiry handling', () => {
    it('should calculate correct expiry date', () => {
      const now = new Date('2024-01-01T00:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const expiryDate = invitationService.calculateExpiryDate();
      const expectedExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect(expiryDate).toEqual(expectedExpiry);
    });

    it('should check if invitation is expired', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      expect(invitationService.isInvitationExpired(futureDate)).toBe(false);
      expect(invitationService.isInvitationExpired(pastDate)).toBe(true);
    });
  });
});