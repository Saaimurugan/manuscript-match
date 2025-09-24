import { PrismaClient, UserInvitation } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { UserRole, InvitationStatus } from '@/types';

export interface CreateUserInvitationInput {
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
}

export interface UpdateUserInvitationInput {
  status?: InvitationStatus;
  acceptedAt?: Date;
}

export interface UserInvitationWithInviter extends UserInvitation {
  inviter?: {
    id: string;
    email: string;
    role: string;
  };
}

export class UserInvitationRepository extends BaseRepository<UserInvitation, CreateUserInvitationInput, UpdateUserInvitationInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateUserInvitationInput): Promise<UserInvitation> {
    return this.prisma.userInvitation.create({
      data: {
        email: data.email,
        role: data.role,
        token: data.token,
        invitedBy: data.invitedBy,
        expiresAt: data.expiresAt,
        status: InvitationStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<UserInvitation | null> {
    this.validateId(id);
    return this.prisma.userInvitation.findUnique({
      where: { id },
    });
  }

  async findByToken(token: string): Promise<UserInvitationWithInviter | null> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided');
    }
    return this.prisma.userInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<UserInvitation[]> {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email provided');
    }
    return this.prisma.userInvitation.findMany({
      where: { email },
      orderBy: { invitedAt: 'desc' },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
    where?: any;
  }): Promise<UserInvitation[]> {
    const query: any = {
      orderBy: options?.orderBy || { invitedAt: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    if (options?.where) {
      query.where = options.where;
    }
    
    return this.prisma.userInvitation.findMany(query);
  }

  async findManyWithInviter(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
    where?: any;
  }): Promise<UserInvitationWithInviter[]> {
    const query: any = {
      orderBy: options?.orderBy || { invitedAt: 'desc' },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    if (options?.where) {
      query.where = options.where;
    }
    
    return this.prisma.userInvitation.findMany(query);
  }

  async update(id: string, data: UpdateUserInvitationInput): Promise<UserInvitation> {
    this.validateId(id);
    return this.prisma.userInvitation.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.userInvitation.delete({
      where: { id },
    });
  }

  async findPendingInvitations(): Promise<UserInvitation[]> {
    return this.prisma.userInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  async findExpiredInvitations(): Promise<UserInvitation[]> {
    const now = new Date();
    return this.prisma.userInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
    });
  }

  async markExpiredInvitations(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.userInvitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });
    return result.count;
  }

  async count(where?: any): Promise<number> {
    return this.prisma.userInvitation.count({ where });
  }

  async revokeInvitation(id: string): Promise<UserInvitation> {
    this.validateId(id);
    return this.prisma.userInvitation.update({
      where: { id },
      data: {
        status: InvitationStatus.REVOKED,
      },
    });
  }
}