import { PrismaClient, ProcessAuthor } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { AuthorRole } from '../types';

export interface CreateProcessAuthorInput {
  processId: string;
  authorId: string;
  role: AuthorRole;
  validationStatus?: string;
}

export interface UpdateProcessAuthorInput {
  role?: AuthorRole;
  validationStatus?: string;
}

export interface ProcessAuthorWithRelations extends ProcessAuthor {
  process?: any;
  author?: any;
}

export class ProcessAuthorRepository extends BaseRepository<ProcessAuthor, CreateProcessAuthorInput, UpdateProcessAuthorInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateProcessAuthorInput): Promise<ProcessAuthor> {
    return this.prisma.processAuthor.create({
      data,
    });
  }

  async findById(id: string): Promise<ProcessAuthor | null> {
    this.validateId(id);
    return this.prisma.processAuthor.findUnique({
      where: { id },
    });
  }

  async findByIdWithRelations(id: string): Promise<ProcessAuthorWithRelations | null> {
    this.validateId(id);
    return this.prisma.processAuthor.findUnique({
      where: { id },
      include: {
        process: true,
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
    });
  }

  async findByProcessId(processId: string, role?: AuthorRole): Promise<ProcessAuthor[]> {
    this.validateId(processId);
    
    const where: any = { processId };
    if (role) {
      where.role = role;
    }

    return this.prisma.processAuthor.findMany({
      where,
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
      orderBy: { addedAt: 'desc' },
    });
  }

  async findByAuthorId(authorId: string): Promise<ProcessAuthor[]> {
    this.validateId(authorId);
    return this.prisma.processAuthor.findMany({
      where: { authorId },
      include: {
        process: true,
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  async findByProcessAndRole(processId: string, role: AuthorRole): Promise<ProcessAuthor[]> {
    this.validateId(processId);
    return this.prisma.processAuthor.findMany({
      where: {
        processId,
        role,
      },
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
      orderBy: { addedAt: 'desc' },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    processId?: string;
    authorId?: string;
    role?: AuthorRole;
  }): Promise<ProcessAuthor[]> {
    const where: any = {};
    
    if (options?.processId) {
      where.processId = options.processId;
    }
    if (options?.authorId) {
      where.authorId = options.authorId;
    }
    if (options?.role) {
      where.role = options.role;
    }

    const query: any = {
      where,
      orderBy: { addedAt: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.processAuthor.findMany(query);
  }

  async update(id: string, data: UpdateProcessAuthorInput): Promise<ProcessAuthor> {
    this.validateId(id);
    return this.prisma.processAuthor.update({
      where: { id },
      data,
    });
  }

  async updateValidationStatus(id: string, validationStatus: string): Promise<ProcessAuthor> {
    this.validateId(id);
    return this.prisma.processAuthor.update({
      where: { id },
      data: { validationStatus },
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.processAuthor.delete({
      where: { id },
    });
  }

  async deleteByProcessAndAuthor(processId: string, authorId: string, role?: AuthorRole): Promise<void> {
    this.validateId(processId);
    this.validateId(authorId);
    
    const where: any = { processId, authorId };
    if (role) {
      where.role = role;
    }

    await this.prisma.processAuthor.deleteMany({
      where,
    });
  }

  async bulkCreate(processAuthors: CreateProcessAuthorInput[]): Promise<number> {
    const result = await this.prisma.processAuthor.createMany({
      data: processAuthors,
    });
    return result.count;
  }

  async countByProcessId(processId: string, role?: AuthorRole): Promise<number> {
    this.validateId(processId);
    
    const where: any = { processId };
    if (role) {
      where.role = role;
    }

    return this.prisma.processAuthor.count({
      where,
    });
  }

  async existsByProcessAuthorRole(processId: string, authorId: string, role: AuthorRole): Promise<boolean> {
    this.validateId(processId);
    this.validateId(authorId);
    
    const record = await this.prisma.processAuthor.findFirst({
      where: {
        processId,
        authorId,
        role,
      },
    });
    
    return record !== null;
  }
}