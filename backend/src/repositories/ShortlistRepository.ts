import { PrismaClient, Shortlist } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateShortlistInput {
  processId: string;
  name: string;
}

export interface UpdateShortlistInput {
  name?: string;
}

export interface ShortlistWithProcess extends Shortlist {
  process?: any;
}

export class ShortlistRepository extends BaseRepository<Shortlist, CreateShortlistInput, UpdateShortlistInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateShortlistInput): Promise<Shortlist> {
    return this.prisma.shortlist.create({
      data,
    });
  }

  async findById(id: string): Promise<Shortlist | null> {
    this.validateId(id);
    return this.prisma.shortlist.findUnique({
      where: { id },
    });
  }

  async findByIdWithProcess(id: string): Promise<ShortlistWithProcess | null> {
    this.validateId(id);
    return this.prisma.shortlist.findUnique({
      where: { id },
      include: {
        process: true,
      },
    });
  }

  async findByProcessId(processId: string): Promise<Shortlist[]> {
    this.validateId(processId);
    return this.prisma.shortlist.findMany({
      where: { processId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    processId?: string;
    orderBy?: any;
  }): Promise<Shortlist[]> {
    const where: any = {};
    
    if (options?.processId) {
      where.processId = options.processId;
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

    return this.prisma.shortlist.findMany(query);
  }

  async update(id: string, data: UpdateShortlistInput): Promise<Shortlist> {
    this.validateId(id);
    return this.prisma.shortlist.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.shortlist.delete({
      where: { id },
    });
  }

  async deleteByProcessId(processId: string): Promise<void> {
    this.validateId(processId);
    await this.prisma.shortlist.deleteMany({
      where: { processId },
    });
  }

  async countByProcessId(processId: string): Promise<number> {
    this.validateId(processId);
    return this.prisma.shortlist.count({
      where: { processId },
    });
  }
}