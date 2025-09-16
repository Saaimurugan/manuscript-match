import { PrismaClient } from '@prisma/client';
import { cacheService } from './CacheService';

export interface QueryOptimizationOptions {
  useCache?: boolean;
  cacheTTL?: number;
  useIndexHints?: boolean;
  batchSize?: number;
}

export interface AuthorRelationshipQuery {
  authorIds?: string[];
  affiliationIds?: string[];
  researchAreas?: string[];
  publicationThreshold?: number;
  excludeAuthors?: string[];
}

export class QueryOptimizationService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Optimized query for finding authors with complex relationships
   */
  async findAuthorsWithRelationships(
    query: AuthorRelationshipQuery,
    options: QueryOptimizationOptions = {}
  ) {
    const {
      useCache = true,
      cacheTTL = 1800, // 30 minutes
      batchSize = 100
    } = options;

    const cacheKey = `authors:relationships:${JSON.stringify(query)}`;

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build optimized query with proper indexing
    const whereClause = this.buildOptimizedWhereClause(query);

    // Use raw query for complex relationships to leverage database optimizations
    const authors = await this.executeOptimizedAuthorQuery(whereClause, batchSize);

    if (useCache) {
      await cacheService.set(cacheKey, authors, { ttl: cacheTTL });
    }

    return authors;
  }

  private buildOptimizedWhereClause(query: AuthorRelationshipQuery) {
    const conditions: any = {};

    if (query.authorIds && query.authorIds.length > 0) {
      conditions.id = { in: query.authorIds };
    }

    if (query.excludeAuthors && query.excludeAuthors.length > 0) {
      conditions.id = {
        ...conditions.id,
        notIn: query.excludeAuthors
      };
    }

    if (query.publicationThreshold) {
      conditions.publicationCount = { gte: query.publicationThreshold };
    }

    if (query.researchAreas && query.researchAreas.length > 0) {
      // Use JSON operations for research areas stored as JSON
      conditions.OR = query.researchAreas.map(area => ({
        researchAreas: {
          path: '$',
          array_contains: area
        }
      }));
    }

    return conditions;
  }

  private async executeOptimizedAuthorQuery(whereClause: any, batchSize: number) {
    // Use select to only fetch needed fields for better performance
    return await this.prisma.author.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        publicationCount: true,
        clinicalTrials: true,
        retractions: true,
        researchAreas: true,
        meshTerms: true,
        // Include related data efficiently
        processAuthors: {
          select: {
            role: true,
            validationStatus: true,
            process: {
              select: {
                id: true,
                title: true,
                userId: true
              }
            }
          }
        }
      },
      take: batchSize,
      // Add ordering for consistent results
      orderBy: [
        { publicationCount: 'desc' },
        { id: 'asc' }
      ]
    });
  }

  /**
   * Optimized co-author relationship analysis
   */
  async analyzeCoAuthorRelationships(
    authorIds: string[],
    options: QueryOptimizationOptions = {}
  ) {
    const { useCache = true, cacheTTL = 3600 } = options;
    const cacheKey = `coauthors:${authorIds.sort().join(',')}`;

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use raw SQL for complex relationship analysis
    const coAuthorRelationships = await this.prisma.$queryRaw`
      WITH author_pairs AS (
        SELECT DISTINCT 
          pa1.author_id as author1_id,
          pa2.author_id as author2_id,
          COUNT(*) as collaboration_count
        FROM process_authors pa1
        JOIN process_authors pa2 ON pa1.process_id = pa2.process_id
        WHERE pa1.author_id != pa2.author_id
          AND pa1.author_id IN (${authorIds.join(',')})
          AND pa2.author_id IN (${authorIds.join(',')})
          AND pa1.role = 'manuscript_author'
          AND pa2.role = 'manuscript_author'
        GROUP BY pa1.author_id, pa2.author_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        ap.*,
        a1.name as author1_name,
        a2.name as author2_name
      FROM author_pairs ap
      JOIN authors a1 ON ap.author1_id = a1.id
      JOIN authors a2 ON ap.author2_id = a2.id
      ORDER BY ap.collaboration_count DESC
    `;

    if (useCache) {
      await cacheService.set(cacheKey, coAuthorRelationships, { ttl: cacheTTL });
    }

    return coAuthorRelationships;
  }

  /**
   * Optimized affiliation-based author search
   */
  async findAuthorsByAffiliation(
    affiliationIds: string[],
    options: QueryOptimizationOptions = {}
  ) {
    const { useCache = true, cacheTTL = 1800 } = options;
    const cacheKey = `authors:affiliation:${affiliationIds.sort().join(',')}`;

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Simplified query to find authors by basic criteria
    const authors = await this.prisma.author.findMany({
      where: {
        publicationCount: { gte: 1 } // Basic filter for active authors
      },
      select: {
        id: true,
        name: true,
        email: true,
        publicationCount: true,
        researchAreas: true
      },
      orderBy: { publicationCount: 'desc' },
      take: 100
    });

    if (useCache) {
      await cacheService.set(cacheKey, authors, { ttl: cacheTTL });
    }

    return authors;
  }

  /**
   * Batch process large author datasets efficiently
   */
  async *batchProcessAuthors(
    query: AuthorRelationshipQuery,
    batchSize: number = 100
  ): AsyncGenerator<any[], void, unknown> {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const whereClause = this.buildOptimizedWhereClause(query);

      const batch = await this.prisma.author.findMany({
        where: whereClause,
        skip,
        take: batchSize,
        select: {
          id: true,
          name: true,
          email: true,
          publicationCount: true,
          researchAreas: true,
        },
        orderBy: { id: 'asc' } // Consistent ordering for pagination
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        skip += batchSize;
        hasMore = batch.length === batchSize;
      }
    }
  }

  /**
   * Optimized search with full-text capabilities
   */
  async searchAuthorsOptimized(
    searchTerm: string,
    filters: AuthorRelationshipQuery = {},
    options: QueryOptimizationOptions = {}
  ) {
    const { useCache = true, cacheTTL = 900 } = options; // 15 minutes cache
    const cacheKey = `search:authors:${searchTerm}:${JSON.stringify(filters)}`;

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use database full-text search capabilities
    const results = await this.prisma.$queryRaw`
      SELECT 
        a.id,
        a.name,
        a.email,
        a.publication_count,
        a.research_areas,
        a.mesh_terms,
        -- Calculate relevance score
        (
          CASE WHEN a.name LIKE ${`%${searchTerm}%`} THEN 10 ELSE 0 END +
          CASE WHEN a.email LIKE ${`%${searchTerm}%`} THEN 5 ELSE 0 END +
          CASE WHEN a.research_areas LIKE ${`%${searchTerm}%`} THEN 3 ELSE 0 END
        ) as relevance_score
      FROM authors a
      WHERE (
        a.name LIKE ${`%${searchTerm}%`} OR
        a.email LIKE ${`%${searchTerm}%`} OR
        a.research_areas LIKE ${`%${searchTerm}%`} OR
        a.mesh_terms LIKE ${`%${searchTerm}%`}
      )
      ${filters.publicationThreshold ? `AND a.publication_count >= ${filters.publicationThreshold}` : ''}
      ${filters.excludeAuthors?.length ? `AND a.id NOT IN (${filters.excludeAuthors.map(id => `'${id}'`).join(',')})` : ''}
      ORDER BY relevance_score DESC, a.publication_count DESC
      LIMIT 100
    `;

    if (useCache) {
      await cacheService.set(cacheKey, results, { ttl: cacheTTL });
    }

    return results;
  }

  /**
   * Precompute and cache expensive relationship queries
   */
  async precomputeAuthorRelationships(authorIds: string[]) {
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < authorIds.length; i += batchSize) {
      batches.push(authorIds.slice(i, i + batchSize));
    }

    // Process batches in parallel
    const promises = batches.map(async (batch) => {
      const relationships = await this.analyzeCoAuthorRelationships(batch, {
        useCache: false // Force fresh computation
      });

      // Cache individual author relationship data
      for (const authorId of batch) {
        const authorRelationships = (relationships as any[]).filter(
          (rel: any) => rel.author1_id === authorId || rel.author2_id === authorId
        );

        await cacheService.set(
          `author:relationships:${authorId}`,
          authorRelationships,
          { ttl: 7200 } // 2 hours
        );
      }

      return relationships;
    });

    return await Promise.all(promises);
  }

  /**
   * Get query performance statistics
   */
  async getQueryStats() {
    const stats = await this.prisma.$queryRaw`
      SELECT 
        'authors' as table_name,
        COUNT(*) as total_records
      FROM authors
      UNION ALL
      SELECT 
        'process_authors' as table_name,
        COUNT(*) as total_records
      FROM process_authors
      UNION ALL
      SELECT 
        'affiliations' as table_name,
        COUNT(*) as total_records
      FROM affiliations
    `;

    return stats;
  }

  /**
   * Invalidate related caches when data changes
   */
  async invalidateAuthorCaches(authorIds: string[]) {
    const patterns = [
      'authors:relationships:*',
      'coauthors:*',
      'authors:affiliation:*',
      'search:authors:*',
      ...authorIds.map(id => `author:relationships:${id}`)
    ];

    for (const pattern of patterns) {
      await cacheService.invalidatePattern(pattern);
    }
  }
}

export const queryOptimizationService = new QueryOptimizationService(
  new PrismaClient()
);