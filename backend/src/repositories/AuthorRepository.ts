import { PrismaClient, Author } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { cacheService } from '../services/CacheService';
import { createAuthorPagination } from '../utils/CursorPagination';
import { queryOptimizationService } from '../services/QueryOptimizationService';
import { performanceMonitoringService } from '../services/PerformanceMonitoringService';

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
  private readonly cacheTTL = 1800; // 30 minutes
  private readonly paginationService = createAuthorPagination();

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
    
    const cacheKey = `author:${id}`;
    const cached = await cacheService.get<Author>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const author = await this.prisma.author.findUnique({
      where: { id },
    });

    if (author) {
      await cacheService.set(cacheKey, author, { ttl: this.cacheTTL });
    }

    return author;
  }

  async findByIdWithAffiliations(id: string): Promise<AuthorWithAffiliations | null> {
    this.validateId(id);
    
    const cacheKey = `author:${id}:affiliations`;
    const cached = await cacheService.get<AuthorWithAffiliations>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        affiliations: {
          include: {
            affiliation: true,
          },
        },
      },
    });

    if (author) {
      await cacheService.set(cacheKey, author, { ttl: this.cacheTTL });
    }

    return author;
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
    const cacheKey = `author:search:${JSON.stringify(options)}`;
    const cached = await cacheService.get<Author[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

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

    const authors = await this.prisma.author.findMany(query);
    
    // Cache search results for 15 minutes (shorter TTL for search results)
    await cacheService.set(cacheKey, authors, { ttl: 900 });
    
    return authors;
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

  async updateAuthor(id: string, data: UpdateAuthorInput): Promise<Author> {
    this.validateId(id);
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.publicationCount !== undefined) updateData.publicationCount = data.publicationCount;
    if (data.clinicalTrials !== undefined) updateData.clinicalTrials = data.clinicalTrials;
    if (data.retractions !== undefined) updateData.retractions = data.retractions;
    if (data.researchAreas !== undefined) updateData.researchAreas = data.researchAreas ? JSON.stringify(data.researchAreas) : null;
    if (data.meshTerms !== undefined) updateData.meshTerms = data.meshTerms ? JSON.stringify(data.meshTerms) : null;

    const author = await this.prisma.author.update({
      where: { id },
      data: updateData,
    });

    // Invalidate cache after update
    await this.invalidateAuthorCache(id);
    return author;
  }

  async deleteAuthor(id: string): Promise<void> {
    this.validateId(id);
    await this.prisma.author.delete({
      where: { id },
    });
    // Invalidate cache after deletion
    await this.invalidateAuthorCache(id);
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
      
      // Invalidate related caches
      await this.invalidateAuthorCache(authorId);
    }
  }

  // Cache management methods
  private async invalidateAuthorCache(authorId: string): Promise<void> {
    await Promise.all([
      cacheService.del(`author:${authorId}`),
      cacheService.del(`author:${authorId}:affiliations`),
      cacheService.invalidatePattern('author:search:*')
    ]);
  }

  async searchWithPagination(
    options: AuthorSearchOptions & { cursor?: string; limit?: number }
  ) {
    const where: any = {};

    if (options.name) {
      where.name = { contains: options.name };
    }
    if (options.email) {
      where.email = { contains: options.email };
    }
    if (options.minPublications !== undefined) {
      where.publicationCount = { gte: options.minPublications };
    }
    if (options.maxRetractions !== undefined) {
      where.retractions = { lte: options.maxRetractions };
    }
    if (options.researchArea) {
      where.researchAreas = { contains: options.researchArea };
    }

    const paginationOptions: any = {
      orderBy: { publicationCount: 'desc' }
    };
    
    if (options.cursor) {
      paginationOptions.cursor = options.cursor;
    }
    
    if (options.limit) {
      paginationOptions.limit = options.limit;
    }

    return this.paginationService.paginate(
      this.prisma.author,
      paginationOptions,
      where
    );
  }

  // Advanced search with query optimization
  async findAuthorsWithRelationships(options: {
    authorIds?: string[];
    affiliationIds?: string[];
    researchAreas?: string[];
    publicationThreshold?: number;
    excludeAuthors?: string[];
  }) {
    return performanceMonitoringService.measureExecutionTime(
      'author_repository.find_with_relationships',
      async () => {
        return queryOptimizationService.findAuthorsWithRelationships(options, {
          useCache: true,
          cacheTTL: this.cacheTTL
        });
      },
      { query_type: 'complex_relationships' }
    );
  }

  // Optimized co-author analysis
  async analyzeCoAuthorRelationships(authorIds: string[]) {
    return performanceMonitoringService.measureExecutionTime(
      'author_repository.analyze_coauthors',
      async () => {
        return queryOptimizationService.analyzeCoAuthorRelationships(authorIds, {
          useCache: true,
          cacheTTL: 3600 // 1 hour cache for relationship analysis
        });
      },
      { author_count: authorIds.length.toString() }
    );
  }

  // Batch processing for large datasets
  async *batchProcessAuthors(
    query: {
      minPublications?: number;
      researchAreas?: string[];
      excludeAuthors?: string[];
    },
    batchSize: number = 100
  ) {
    for await (const batch of queryOptimizationService.batchProcessAuthors(query, batchSize)) {
      yield batch;
    }
  }

  // Optimized search with full-text capabilities
  async searchOptimized(
    searchTerm: string,
    filters: {
      minPublications?: number;
      maxRetractions?: number;
      researchAreas?: string[];
      excludeAuthors?: string[];
    } = {}
  ) {
    return performanceMonitoringService.measureExecutionTime(
      'author_repository.search_optimized',
      async () => {
        return queryOptimizationService.searchAuthorsOptimized(searchTerm, filters, {
          useCache: true,
          cacheTTL: 900 // 15 minutes cache for search results
        });
      },
      { search_term_length: searchTerm.length.toString() }
    );
  }

  // Implement abstract methods from BaseRepository
  async update(id: string, data: UpdateAuthorInput): Promise<Author> {
    return this.updateAuthor(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.deleteAuthor(id);
  }
}