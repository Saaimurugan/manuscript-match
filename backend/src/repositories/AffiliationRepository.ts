import { PrismaClient, Affiliation } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateAffiliationInput {
  institutionName: string;
  department?: string;
  address: string;
  country: string;
}

export interface UpdateAffiliationInput {
  institutionName?: string;
  department?: string;
  address?: string;
  country?: string;
}

export interface AffiliationSearchOptions {
  institutionName?: string;
  country?: string;
  department?: string;
  skip?: number;
  take?: number;
}

export class AffiliationRepository extends BaseRepository<Affiliation, CreateAffiliationInput, UpdateAffiliationInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateAffiliationInput): Promise<Affiliation> {
    return this.prisma.affiliation.create({
      data,
    });
  }

  async findById(id: string): Promise<Affiliation | null> {
    this.validateId(id);
    return this.prisma.affiliation.findUnique({
      where: { id },
    });
  }

  async findByInstitution(institutionName: string): Promise<Affiliation[]> {
    if (!institutionName || typeof institutionName !== 'string') {
      throw new Error('Invalid institution name provided');
    }
    return this.prisma.affiliation.findMany({
      where: {
        institutionName: {
          contains: institutionName,
        },
      },
    });
  }

  async findByCountry(country: string): Promise<Affiliation[]> {
    if (!country || typeof country !== 'string') {
      throw new Error('Invalid country provided');
    }
    return this.prisma.affiliation.findMany({
      where: {
        country: {
          equals: country,
        },
      },
    });
  }

  async search(options: AffiliationSearchOptions): Promise<Affiliation[]> {
    const where: any = {};

    if (options.institutionName) {
      where.institutionName = {
        contains: options.institutionName,
      };
    }

    if (options.country) {
      where.country = {
        equals: options.country,
      };
    }

    if (options.department) {
      where.department = {
        contains: options.department,
      };
    }

    const query: any = {
      where,
      orderBy: { institutionName: 'asc' },
    };
    
    if (options.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.affiliation.findMany(query);
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<Affiliation[]> {
    const query: any = {
      orderBy: options?.orderBy || { institutionName: 'asc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }
    
    return this.prisma.affiliation.findMany(query);
  }

  async update(id: string, data: UpdateAffiliationInput): Promise<Affiliation> {
    this.validateId(id);
    return this.prisma.affiliation.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.affiliation.delete({
      where: { id },
    });
  }

  async findOrCreate(data: CreateAffiliationInput): Promise<Affiliation> {
    // Try to find existing affiliation by institution name and country
    const existingAffiliation = await this.prisma.affiliation.findFirst({
      where: {
        institutionName: {
          equals: data.institutionName,
        },
        country: {
          equals: data.country,
        },
        ...(data.department && {
          department: {
            equals: data.department,
          },
        }),
      },
    });

    if (existingAffiliation) {
      return existingAffiliation;
    }

    return this.create(data);
  }

  async bulkCreate(affiliations: CreateAffiliationInput[]): Promise<number> {
    const result = await this.prisma.affiliation.createMany({
      data: affiliations,
    });
    return result.count;
  }

  async count(): Promise<number> {
    return this.prisma.affiliation.count();
  }

  async getCountriesList(): Promise<string[]> {
    const result = await this.prisma.affiliation.findMany({
      select: {
        country: true,
      },
      distinct: ['country'],
      orderBy: {
        country: 'asc',
      },
    });

    return result.map((item: { country: string }) => item.country);
  }
}