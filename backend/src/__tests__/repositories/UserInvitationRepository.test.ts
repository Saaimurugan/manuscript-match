import { PrismaClient } from '@prisma/client';
import { UserInvitationRepository } from '@/repositories/UserInvitationRepository';
import { UserRole, InvitationStatus } from '@/types';
import { createTestUser } from '../setup/testData';

describe('UserInvitationRepository', () => {
  let prisma: PrismaClient;
  let repository: UserInvitationRepository;
  let testInviterId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test.db',
        },
      },
    });
    await prisma.$connect();
    repository = new UserInvitationRepository(prisma);

    // Create a test user to be the inviter
    const testUser = await createTestUser(prisma, 'inviter@example.com');
    testInviterId = testUser.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up invitations before each test
    await prisma.userInvitation.deleteMany();
  });

  describe('create', () => {
    it('should create a new user invitation', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'test-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const invitation = await repository.create(invitationData);

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe(invitationData.email);
      expect(invitation.role).toBe(invitationData.role);
      expect(invitation.token).toBe(invitationData.token);
      expect(invitation.invitedBy).toBe(invitationData.invitedBy);
      expect(invitation.status).toBe(InvitationStatus.PENDING);
      expect(invitation.id).toBeDefined();
      expect(invitation.invitedAt).toBeDefined();
    });

    it('should set status to PENDING by default', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'test-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const invitation = await repository.create(invitationData);
      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });
  });

  describe('findById', () => {
    it('should find invitation by id', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'test-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const created = await repository.create(invitationData);
      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.email).toBe(invitationData.email);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should throw error for invalid id', async () => {
      await expect(repository.findById('')).rejects.toThrow('Invalid ID provided');
      await expect(repository.findById(null as any)).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('findByToken', () => {
    it('should find invitation by token', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'unique-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      await repository.create(invitationData);
      const found = await repository.findByToken('unique-token-123');

      expect(found).toBeDefined();
      expect(found!.token).toBe('unique-token-123');
      expect(found!.email).toBe(invitationData.email);
      expect(found!.inviter).toBeDefined();
      expect(found!.inviter!.id).toBe(testInviterId);
    });

    it('should return null for non-existent token', async () => {
      const found = await repository.findByToken('non-existent-token');
      expect(found).toBeNull();
    });

    it('should throw error for invalid token', async () => {
      await expect(repository.findByToken('')).rejects.toThrow('Invalid token provided');
      await expect(repository.findByToken(null as any)).rejects.toThrow('Invalid token provided');
    });
  });

  describe('findByEmail', () => {
    it('should find invitations by email', async () => {
      const email = 'test@example.com';
      const invitationData1 = {
        email,
        role: UserRole.USER,
        token: 'token-1',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const invitationData2 = {
        email,
        role: UserRole.QC,
        token: 'token-2',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      await repository.create(invitationData1);
      await repository.create(invitationData2);

      const found = await repository.findByEmail(email);

      expect(found).toHaveLength(2);
      expect(found.every(inv => inv.email === email)).toBe(true);
      // Should be ordered by invitedAt desc (most recent first)
      expect(found[0]?.role).toBe(UserRole.QC); // Second invitation created
      expect(found[1]?.role).toBe(UserRole.USER); // First invitation created
    });

    it('should return empty array for email with no invitations', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');
      expect(found).toEqual([]);
    });

    it('should throw error for invalid email', async () => {
      await expect(repository.findByEmail('')).rejects.toThrow('Invalid email provided');
      await expect(repository.findByEmail(null as any)).rejects.toThrow('Invalid email provided');
    });
  });

  describe('update', () => {
    it('should update invitation status', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'test-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const created = await repository.create(invitationData);
      const acceptedAt = new Date();
      
      const updated = await repository.update(created.id, {
        status: InvitationStatus.ACCEPTED,
        acceptedAt,
      });

      expect(updated.status).toBe(InvitationStatus.ACCEPTED);
      expect(updated.acceptedAt).toEqual(acceptedAt);
    });

    it('should throw error for invalid id', async () => {
      await expect(repository.update('', { status: InvitationStatus.ACCEPTED }))
        .rejects.toThrow('Invalid ID provided');
    });
  });

  describe('delete', () => {
    it('should delete invitation', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'test-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const created = await repository.create(invitationData);
      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should throw error for invalid id', async () => {
      await expect(repository.delete('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('findPendingInvitations', () => {
    it('should find only pending invitations', async () => {
      const pendingInvitation = {
        email: 'pending@example.com',
        role: UserRole.USER,
        token: 'pending-token',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const acceptedInvitation = {
        email: 'accepted@example.com',
        role: UserRole.USER,
        token: 'accepted-token',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const pending = await repository.create(pendingInvitation);
      const accepted = await repository.create(acceptedInvitation);
      
      // Update one to accepted status
      await repository.update(accepted.id, { 
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });

      const pendingInvitations = await repository.findPendingInvitations();

      expect(pendingInvitations).toHaveLength(1);
      expect(pendingInvitations[0]?.id).toBe(pending.id);
      expect(pendingInvitations[0]?.status).toBe(InvitationStatus.PENDING);
    });
  });

  describe('findExpiredInvitations', () => {
    it('should find expired pending invitations', async () => {
      const expiredInvitation = {
        email: 'expired@example.com',
        role: UserRole.USER,
        token: 'expired-token',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      const validInvitation = {
        email: 'valid@example.com',
        role: UserRole.USER,
        token: 'valid-token',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const expired = await repository.create(expiredInvitation);
      await repository.create(validInvitation);

      const expiredInvitations = await repository.findExpiredInvitations();

      expect(expiredInvitations).toHaveLength(1);
      expect(expiredInvitations[0]?.id).toBe(expired.id);
    });
  });

  describe('markExpiredInvitations', () => {
    it('should mark expired invitations as expired', async () => {
      const expiredInvitation = {
        email: 'expired@example.com',
        role: UserRole.USER,
        token: 'expired-token',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      await repository.create(expiredInvitation);

      const count = await repository.markExpiredInvitations();
      expect(count).toBe(1);

      const pendingInvitations = await repository.findPendingInvitations();
      expect(pendingInvitations).toHaveLength(0);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: UserRole.USER,
        token: 'test-token-123',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const created = await repository.create(invitationData);
      const revoked = await repository.revokeInvitation(created.id);

      expect(revoked.status).toBe(InvitationStatus.REVOKED);
    });

    it('should throw error for invalid id', async () => {
      await expect(repository.revokeInvitation('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('count', () => {
    it('should count all invitations', async () => {
      const invitationData1 = {
        email: 'test1@example.com',
        role: UserRole.USER,
        token: 'token-1',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const invitationData2 = {
        email: 'test2@example.com',
        role: UserRole.QC,
        token: 'token-2',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      await repository.create(invitationData1);
      await repository.create(invitationData2);

      const count = await repository.count();
      expect(count).toBe(2);
    });

    it('should count invitations with where clause', async () => {
      const invitationData1 = {
        email: 'test1@example.com',
        role: UserRole.USER,
        token: 'token-1',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const invitationData2 = {
        email: 'test2@example.com',
        role: UserRole.QC,
        token: 'token-2',
        invitedBy: testInviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const created1 = await repository.create(invitationData1);
      await repository.create(invitationData2);

      // Update one to accepted
      await repository.update(created1.id, { 
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });

      const pendingCount = await repository.count({ status: InvitationStatus.PENDING });
      expect(pendingCount).toBe(1);

      const acceptedCount = await repository.count({ status: InvitationStatus.ACCEPTED });
      expect(acceptedCount).toBe(1);
    });
  });
});