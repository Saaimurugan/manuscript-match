import { PrismaClient } from '@prisma/client';
import { UserSession } from '@/types';

export class UserSessionRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new user session
   */
  async create(sessionData: {
    userId: string;
    token: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<UserSession> {
    const session = await this.prisma.userSession.create({
      data: {
        userId: sessionData.userId,
        token: sessionData.token,
        ipAddress: sessionData.ipAddress || null,
        userAgent: sessionData.userAgent || null,
        expiresAt: sessionData.expiresAt,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      isActive: session.isActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      user: session.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role as any,
      } : {
        id: '',
        email: '',
        role: 'USER' as any,
      },
    } as UserSession;
  }

  /**
   * Find session by token
   */
  async findByToken(token: string): Promise<UserSession | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      isActive: session.isActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      user: session.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role as any,
      } : {
        id: '',
        email: '',
        role: 'USER' as any,
      },
    } as UserSession;
  }

  /**
   * Find all active sessions for a user
   */
  async findActiveByUserId(userId: string): Promise<UserSession[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      token: session.token,
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      isActive: session.isActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      user: session.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role as any,
      } : {
        id: '',
        email: '',
        role: 'USER' as any,
      },
    } as UserSession));
  }

  /**
   * Update session last used time
   */
  async updateLastUsed(token: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { token },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate session
   */
  async deactivate(token: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { token },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Deactivate all sessions for a user
   */
  async deactivateAllForUser(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isActive: false,
            lastUsedAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            },
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    const [total, active, expired] = await Promise.all([
      this.prisma.userSession.count({
        where: { userId },
      }),
      this.prisma.userSession.count({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
      this.prisma.userSession.count({
        where: {
          userId,
          OR: [
            { isActive: false },
            {
              expiresAt: {
                lt: new Date(),
              },
            },
          ],
        },
      }),
    ]);

    return {
      totalSessions: total,
      activeSessions: active,
      expiredSessions: expired,
    };
  }
}