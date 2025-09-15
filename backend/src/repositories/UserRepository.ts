import { PrismaClient, User } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  role?: string;
}

export interface UserWithProcesses extends User {
  processes?: any[];
}

export class UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findById(id: string): Promise<User | null> {
    this.validateId(id);
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email provided');
    }
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<User[]> {
    const query: any = {
      orderBy: options?.orderBy || { createdAt: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }
    
    return this.prisma.user.findMany(query);
  }

  async findWithProcesses(id: string): Promise<UserWithProcesses | null> {
    this.validateId(id);
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        processes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    this.validateId(id);
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}