// PrismaClient import removed as it's not used directly

export interface CursorPaginationOptions {
  cursor?: string | undefined;
  limit?: number | undefined;
  orderBy?: Record<string, 'asc' | 'desc'> | undefined;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string | undefined;
    previousCursor?: string | undefined;
    totalCount?: number | undefined;
  };
}

export interface CursorConfig {
  cursorField: string;
  defaultLimit: number;
  maxLimit: number;
}

export class CursorPaginationService {
  private readonly defaultConfig: CursorConfig = {
    cursorField: 'id',
    defaultLimit: 20,
    maxLimit: 100,
  };

  protected config: CursorConfig;

  constructor(config: Partial<CursorConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Generate cursor-based pagination for Prisma queries
   */
  async paginate<T extends Record<string, any>>(
    model: any, // Prisma model delegate
    options: CursorPaginationOptions = {},
    where: Record<string, any> = {},
    include?: Record<string, any>
  ): Promise<PaginatedResult<T>> {
    const {
      cursor,
      limit = this.config.defaultLimit,
      orderBy = { [this.config.cursorField!]: 'asc' }
    } = options;

    // Validate and sanitize limit
    const sanitizedLimit = Math.min(Math.max(1, limit!), this.config.maxLimit!);
    
    // Build query options
    const queryOptions: any = {
      where,
      orderBy,
      take: sanitizedLimit + 1, // Take one extra to check if there's a next page
    };

    if (include) {
      queryOptions.include = include;
    }

    // Add cursor if provided
    if (cursor) {
      queryOptions.cursor = { [this.config.cursorField!]: cursor };
      queryOptions.skip = 1; // Skip the cursor record itself
    }

    // Execute query
    const results = await model.findMany(queryOptions);
    
    // Check if there are more results
    const hasNextPage = results.length > sanitizedLimit;
    if (hasNextPage) {
      results.pop(); // Remove the extra record
    }

    // Generate cursors
    const nextCursor = hasNextPage && results.length > 0 
      ? results[results.length - 1][this.config.cursorField!]
      : undefined;

    // Previous cursor is the current cursor for reference
    // const previousCursor = cursor || undefined;

    return {
      data: results,
      pagination: {
        hasNextPage,
        hasPreviousPage: !!cursor,
        nextCursor: nextCursor || undefined,
        previousCursor: cursor || undefined,
      }
    };
  }

  /**
   * Paginate with total count (more expensive but provides complete pagination info)
   */
  async paginateWithCount<T extends Record<string, any>>(
    model: any,
    options: CursorPaginationOptions = {},
    where: Record<string, any> = {},
    include?: Record<string, any>
  ): Promise<PaginatedResult<T>> {
    // Get paginated results
    const paginatedResult = await this.paginate<T>(model, options, where, include);
    
    // Get total count
    const totalCount = await model.count({ where });
    
    return {
      ...paginatedResult,
      pagination: {
        ...paginatedResult.pagination,
        totalCount
      }
    };
  }

  /**
   * Generate pagination metadata for API responses
   */
  generatePaginationMeta(
    currentCursor: string | undefined,
    hasNextPage: boolean,
    hasPreviousPage: boolean,
    nextCursor: string | undefined,
    totalCount?: number
  ) {
    return {
      pagination: {
        current_cursor: currentCursor,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage,
        next_cursor: nextCursor,
        total_count: totalCount,
      }
    };
  }

  /**
   * Parse cursor from request query parameters
   */
  parseCursorFromQuery(query: Record<string, any>): CursorPaginationOptions {
    return {
      cursor: query['cursor'] as string,
      limit: query['limit'] ? parseInt(query['limit'] as string, 10) : undefined,
      orderBy: query['orderBy'] ? this.parseOrderBy(query['orderBy'] as string) : undefined,
    };
  }

  private parseOrderBy(orderByString: string): Record<string, 'asc' | 'desc'> {
    try {
      // Expected format: "field:direction,field2:direction2"
      const orderBy: Record<string, 'asc' | 'desc'> = {};
      
      orderByString.split(',').forEach(part => {
        const [field, direction] = part.split(':');
        if (field && (direction === 'asc' || direction === 'desc')) {
          orderBy[field] = direction;
        }
      });

      return Object.keys(orderBy).length > 0 ? orderBy : { [this.config.cursorField!]: 'asc' };
    } catch {
      return { [this.config.cursorField!]: 'asc' };
    }
  }
}

/**
 * Optimized pagination for large datasets using database-specific optimizations
 */
export class OptimizedCursorPagination extends CursorPaginationService {
  /**
   * Use database-specific optimizations for very large datasets
   */
  async paginateOptimized<T extends Record<string, any>>(
    model: any,
    options: CursorPaginationOptions = {},
    where: Record<string, any> = {},
    select?: Record<string, boolean>
  ): Promise<PaginatedResult<T>> {
    const {
      cursor,
      limit = this.config.defaultLimit,
      orderBy = { [this.config.cursorField!]: 'asc' }
    } = options;

    const sanitizedLimit = Math.min(Math.max(1, limit!), this.config.maxLimit!);
    
    // Use select instead of include for better performance
    const queryOptions: any = {
      where,
      orderBy,
      take: sanitizedLimit + 1,
    };

    if (select) {
      queryOptions.select = {
        ...select,
        [this.config.cursorField!]: true, // Always include cursor field
      };
    }

    if (cursor) {
      queryOptions.cursor = { [this.config.cursorField!]: cursor };
      queryOptions.skip = 1;
    }

    const results = await model.findMany(queryOptions);
    
    const hasNextPage = results.length > sanitizedLimit;
    if (hasNextPage) {
      results.pop();
    }

    const nextCursor = hasNextPage && results.length > 0 
      ? results[results.length - 1][this.config.cursorField!]
      : undefined;

    return {
      data: results,
      pagination: {
        hasNextPage,
        hasPreviousPage: !!cursor,
        nextCursor: nextCursor || undefined,
        previousCursor: cursor || undefined,
      }
    };
  }

  /**
   * Batch process large datasets with cursor pagination
   */
  async *batchProcess<T extends Record<string, any>>(
    model: any,
    batchSize: number = 100,
    where: Record<string, any> = {},
    select?: Record<string, boolean>
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const paginationOptions: any = { limit: batchSize };
      if (cursor) {
        paginationOptions.cursor = cursor;
      }
      
      const result = await this.paginateOptimized<T>(
        model,
        paginationOptions,
        where,
        select
      );

      if (result.data.length > 0) {
        yield result.data;
        cursor = result.pagination.nextCursor;
        hasMore = result.pagination.hasNextPage;
      } else {
        hasMore = false;
      }
    }
  }
}

// Factory functions for common use cases
export const createAuthorPagination = () => new CursorPaginationService({
  cursorField: 'id',
  defaultLimit: 20,
  maxLimit: 100,
});

export const createProcessPagination = () => new CursorPaginationService({
  cursorField: 'createdAt',
  defaultLimit: 10,
  maxLimit: 50,
});

export const createOptimizedPagination = (cursorField: string = 'id') => 
  new OptimizedCursorPagination({
    cursorField,
    defaultLimit: 50,
    maxLimit: 200,
  });