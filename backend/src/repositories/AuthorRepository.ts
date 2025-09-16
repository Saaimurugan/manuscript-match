import { PrismaClient, Author } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateAuthorInput {
  name: string;
  email?: string;
  publicationCount?: number;
  clinicalTrials?: number;
  retractions?: number;
  researchAreas?: string[];
  meshTerms?: string[];
}

export interface UpdateAuthorInput {
  name?: string;
  email?: string;
  publicationCount?: number;
  clinicalTrials?: number;
  retractions?: number;
  researchAreas?: string[];
  meshTerms?: string[];
}

export interface AuthorWithAffiliations extends Author {
  affiliations?: any[];
}

export interface AuthorSearchOptions {
  name?: string;
  email?: string;
  minPublications?: number;
  maxRetractions?: number;
  researchArea?: string;
  skip?: number;
  take?: number;
}

export class AuthorRepository extends BaseRepository<Author, CreateAuthorInput, UpdateAuthorInput> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateAuthorInput): Promise<Author> {
    return this.prisma.author.create({
      data: {
        name: data.name,
        email: data.email || null,
        publicationCount: data.publicationCount || 0,
        clinicalTrials: data.clinicalTrials || 0,
        retractions: data.retractions || 0,
        researchAreas: data.researchAreas ? JSON.stringify(data.researchAreas) : null,
        meshTerms: data.meshTerms ? JSON.stringify(data.meshTerms) : null,
      },
    });
  }

  async findById(id: string): Promise<Author | null> {
    this.validateId(id);
    return this.prisma.author.findUnique({
      where: { id },
    });
  }

  async findByIdWithAffiliations(id: string): Promise<AuthorWithAffiliations | null> {
    this.validateId(id);
    return this.prisma.author.findUnique({
      where: { id },
      include: {
        affiliations: {
          include: {
            affiliation: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<Author | null> {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email provided');
    }
    return this.prisma.author.findFirst({
      where: { email },
    });
  }

  async findByName(name: string): Promise<Author[]> {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid name provided');
    }
    return this.prisma.author.findMany({
      where: {
        name: {
          contains: name,
        },
      },
    });
  }

  async search(options: AuthorSearchOptions): Promise<Author[]> {
    const where: any = {};

    if (options.name) {
      where.name = {
        contains: options.name,
      };
    }

    if (options.email) {
      where.email = {
        contains: options.email,
      };
    }

    if (options.minPublications !== undefined) {
      where.publicationCount = {
        gte: options.minPublications,
      };
    }

    if (options.maxRetractions !== undefined) {
      where.retractions = {
        lte: options.maxRetractions,
      };
    }

    if (options.researchArea) {
      where.researchAreas = {
        contains: options.researchArea,
      };
    }

    const query: any = {
      where,
      orderBy: { publicationCount: 'desc' },
    };
    
    if (options.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options.take !== undefined) {
      query.take = options.take;
    }

    return this.prisma.author.findMany(query);
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<Author[]> {
    const query: any = {
      orderBy: options?.orderBy || { publicationCount: 'desc' },
    };
    
    if (options?.skip !== undefined) {
      query.skip = options.skip;
    }
    
    if (options?.take !== undefined) {
      query.take = options.take;
    }
    
    return this.prisma.author.findMany(query);
  }

  async update(id: string, data: UpdateAuthorInput): Promise<Author> {
    this.validateId(id);
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.publicationCount !== undefined) updateData.publicationCount = data.publicationCount;
    if (data.clinicalTrials !== undefined) updateData.clinicalTrials = data.clinicalTrials;
    if (data.retractions !== undefined) updateData.retractions = data.retractions;
    if (data.researchAreas !== undefined) updateData.researchAreas = data.researchAreas ? JSON.stringify(data.researchAreas) : null;
    if (data.meshTerms !== undefined) updateData.meshTerms = data.meshTerms ? JSON.stringify(data.meshTerms) : null;

    return this.prisma.author.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.author.delete({
      where: { id },
    });
  }

  async bulkCreate(authors: CreateAuthorInput[]): Promise<number> {
    const transformedAuthors = authors.map(author => ({
      name: author.name,
      email: author.email || null,
      publicationCount: author.publicationCount || 0,
      clinicalTrials: author.clinicalTrials || 0,
      retractions: author.retractions || 0,
      researchAreas: author.researchAreas ? JSON.stringify(author.researchAreas) : null,
      meshTerms: author.meshTerms ? JSON.stringify(author.meshTerms) : null,
    }));

    const result = await this.prisma.author.createMany({
      data: transformedAuthors,
    });
    return result.count;
  }

  async findOrCreate(data: CreateAuthorInput): Promise<Author> {
    // Try to find existing author by email or name
    let existingAuthor = null;
    
    if (data.email) {
      existingAuthor = await this.findByEmail(data.email);
    }
    
    if (!existingAuthor) {
      const nameMatches = await this.findByName(data.name);
      existingAuthor = nameMatches.find(author => 
        author.name.toLowerCase() === data.name.toLowerCase()
      ) || null;
    }

    if (existingAuthor) {
      return existingAuthor;
    }

    return this.create(data);
  }

  async count(): Promise<number> {
    return this.prisma.author.count();
  }

  async addAffiliation(authorId: string, affiliationId: string): Promise<void> {
    this.validateId(authorId);
    this.validateId(affiliationId);
    
    // Check if relationship already exists
    const existing = await this.prisma.authorAffiliation.findFirst({
      where: {
        authorId,
        affiliationId,
      },
    });

    if (!existing) {
      await this.prisma.authorAffiliation.create({
        data: {
          authorId,
          affiliationId,
        },
      });
    }
  }
}