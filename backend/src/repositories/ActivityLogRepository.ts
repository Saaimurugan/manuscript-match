import { PrismaClient, ActivityLog } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateActivityLogInput {
  userId?: string; // Made optional for system logs
  processId?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  signature?: string;
  previousHash?: string;
}

export interface UpdateActivityLogInput {
  action?: string;
  details?: string;
  signature?: string;
  previousHash?: string;
}

export interface ActivityLogWithRelations extends ActivityLog {
  user?: any;
  process?: any;
}

export interface ActivityLogSearchOptions {
  userId?: string;
  processId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

export class ActivityLogRepository extends BaseRepository<ActivityLog, CreateActivityLogInput, UpdateActivityLogInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateActivityLogInput): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data,
    });
  }

  async findById(id: string): Promise<ActivityLog | null> {
    this.validateId(id);
    return this.prisma.activityLog.findUnique({
      where: { id },
    });
  }

  async findByIdWithRelations(id: string): Promise<ActivityLogWithRelations | null> {
    this.validateId(id);
    return this.prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: true,
        process: true,
      },
    });
  }

  async findByUserId(userId: string, options?: {
    skip?: number;
    take?: number;
    processId?: string;
  }): Promise<ActivityLog[]> {
    this.validateId(userId);
    
    const where: any = { userId };
    if (options?.processId) {
      where.processId = options.processId;
    }

    const query: any = {
      where,
      orderBy: { timestamp: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.activityLog.findMany(query);
  }

  async findByProcessId(processId: string, options?: {
    skip?: number;
    take?: number;
  }): Promise<ActivityLog[]> {
    this.validateId(processId);

    const query: any = {
      where: { processId },
      orderBy: { timestamp: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.activityLog.findMany(query);
  }

  async search(options: ActivityLogSearchOptions): Promise<ActivityLog[]> {
    const where: any = {};

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.processId) {
      where.processId = options.processId;
    }

    if (options.action) {
      where.action = {
        contains: options.action,
      };
    }

    if (options.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options.resourceId) {
      where.resourceId = options.resourceId;
    }

    if (options.ipAddress) {
      where.ipAddress = {
        contains: options.ipAddress,
      };
    }

    if (options.userAgent) {
      where.userAgent = {
        contains: options.userAgent,
      };
    }

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    const query: any = {
      where,
      orderBy: { timestamp: 'desc' },
    };
    
    if (options.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.activityLog.findMany(query);
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    userId?: string;
    processId?: string;
    orderBy?: any;
  }): Promise<ActivityLog[]> {
    const where: any = {};
    
    if (options?.userId) {
      where.userId = options.userId;
    }
    if (options?.processId) {
      where.processId = options.processId;
    }

    const query: any = {
      where,
      orderBy: options?.orderBy || { timestamp: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.activityLog.findMany(query);
  }

  async update(id: string, data: UpdateActivityLogInput): Promise<ActivityLog> {
    this.validateId(id);
    return this.prisma.activityLog.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.activityLog.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.validateId(userId);
    await this.prisma.activityLog.deleteMany({
      where: { userId },
    });
  }

  async deleteByProcessId(processId: string): Promise<void> {
    this.validateId(processId);
    await this.prisma.activityLog.deleteMany({
      where: { processId },
    });
  }

  async bulkCreate(logs: CreateActivityLogInput[]): Promise<number> {
    const result = await this.prisma.activityLog.createMany({
      data: logs as any, // Type assertion to handle Prisma strict typing
    });
    return result.count;
  }

  async countByUserId(userId: string): Promise<number> {
    this.validateId(userId);
    return this.prisma.activityLog.count({
      where: { userId },
    });
  }

  async countByProcessId(processId: string): Promise<number> {
    this.validateId(processId);
    return this.prisma.activityLog.count({
      where: { processId },
    });
  }

  async findByProcessAndAction(
    processId: string,
    action: string,
    options?: {
      limit?: number;
      orderBy?: any;
    }
  ): Promise<ActivityLog[]> {
    this.validateId(processId);

    const query: any = {
      where: { 
        processId,
        action 
      },
      orderBy: options?.orderBy || { timestamp: 'desc' },
    };
    
    if (options?.limit !== undefined) {
      query.take = options.limit;
    }

    return this.prisma.activityLog.findMany(query);
  }
}