import { PrismaClient, Process } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { ProcessStatus, ProcessStep } from '../types';

export interface CreateProcessInput {
  userId: string;
  title: string;
  status?: ProcessStatus;
  currentStep?: ProcessStep;
  metadata?: string;
}

export interface UpdateProcessInput {
  title?: string;
  status?: ProcessStatus;
  currentStep?: ProcessStep;
  metadata?: string;
}

export interface ProcessWithRelations extends Process {
  user?: any;
  processAuthors?: any[];
  shortlists?: any[];
  activityLogs?: any[];
}

export class ProcessRepository extends BaseRepository<Process, CreateProcessInput, UpdateProcessInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateProcessInput): Promise<Process> {
    return this.prisma.process.create({
      data: {
        ...data,
        status: data.status || ProcessStatus.CREATED,
        currentStep: data.currentStep || ProcessStep.UPLOAD,
      },
    });
  }

  async findById(id: string): Promise<Process | null> {
    this.validateId(id);
    return this.prisma.process.findUnique({
      where: { id },
    });
  }

  async findByIdWithRelations(id: string): Promise<ProcessWithRelations | null> {
    this.validateId(id);
    return this.prisma.process.findUnique({
      where: { id },
      include: {
        user: true,
        processAuthors: {
          include: {
            author: {
              include: {
                affiliations: {
                  include: {
                    affiliation: true,
                  },
                },
              },
            },
          },
        },
        shortlists: true,
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findByUserId(userId: string, options?: {
    skip?: number;
    take?: number;
    status?: ProcessStatus;
  }): Promise<Process[]> {
    this.validateId(userId);
    
    const where: any = { userId };
    if (options?.status) {
      where.status = options.status;
    }

    const query: any = {
      where,
      orderBy: { createdAt: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.process.findMany(query);
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    userId?: string;
    status?: ProcessStatus;
    orderBy?: any;
  }): Promise<Process[]> {
    const where: any = {};
    if (options?.userId) {
      where.userId = options.userId;
    }
    if (options?.status) {
      where.status = options.status;
    }

    const query: any = {
      where,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.process.findMany(query);
  }

  async update(id: string, data: UpdateProcessInput): Promise<Process> {
    this.validateId(id);
    return this.prisma.process.update({
      where: { id },
      data,
    });
  }

  async updateStep(id: string, step: ProcessStep, status?: ProcessStatus): Promise<Process> {
    this.validateId(id);
    return this.prisma.process.update({
      where: { id },
      data: {
        currentStep: step,
        ...(status && { status }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.process.delete({
      where: { id },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    this.validateId(userId);
    return this.prisma.process.count({
      where: { userId },
    });
  }

  async countByStatus(status: ProcessStatus): Promise<number> {
    return this.prisma.process.count({
      where: { status },
    });
  }
}