/**
 * Template Caching System
 * 
 * Implements intelligent template caching to avoid repeated compilation overhead
 * for HTML and Markdown report generation.
 */

import * as fs from 'fs/promises';
import * as crypto from 'crypto';

export interface TemplateEntry {
  compiled: any;
  hash: string;
  lastUsed: Date;
  useCount: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

export interface TemplateCacheConfig {
  maxSize: number; // Maximum cache size in MB
  maxEntries: number; // Maximum number of cached templates
  ttl: number; // Time to live in milliseconds
  enableCompression: boolean;
  enableMetrics: boolean;
}

export class TemplateCache {
  private cache: Map<string, TemplateEntry> = new Map();
  private config: TemplateCacheConfig;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<TemplateCacheConfig> = {}) {
    this.config = {
      maxSize: 10, // 10MB default
      maxEntries: 50,
      ttl: 30 * 60 * 1000, // 30 minutes
      enableCompression: true,
      enableMetrics: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get compiled template from cache or compile and cache it
   */
  async getTemplate(
    templatePath: string,
    compiler: (content: string) => Promise<any>
  ): Promise<any> {
    const cacheKey = this.generateCacheKey(templatePath);
    
    // Check if template exists in cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Check if template file has been modified
      const isValid = await this.isTemplateValid(templatePath, cached.hash);
      if (isValid) {
        // Update access statistics
        cached.lastUsed = new Date();
        cached.useCount++;
        
        if (this.config.enableMetrics) {
          this.stats.hits++;
          this.updateHitRate();
        }
        
        return cached.compiled;
      } else {
        // Template has been modified, remove from cache
        this.removeFromCache(cacheKey);
      }
    }

    // Template not in cache or invalid, compile it
    if (this.config.enableMetrics) {
      this.stats.misses++;
      this.updateHitRate();
    }

    const compiled = await this.compileAndCache(templatePath, compiler);
    return compiled;
  }

  /**
   * Compile template and add to cache
   */
  private async compileAndCache(
    templatePath: string,
    compiler: (content: string) => Promise<any>
  ): Promise<any> {
    try {
      // Read template content
      const content = await fs.readFile(templatePath, 'utf-8');
      
      // Generate hash for content validation
      const hash = this.generateContentHash(content);
      
      // Compile template
      const compiled = await compiler(content);
      
      // Calculate size (approximate)
      const size = this.calculateTemplateSize(compiled, content);
      
      // Check if we need to make space
      await this.ensureSpace(size);
      
      // Create cache entry
      const entry: TemplateEntry = {
        compiled,
        hash,
        lastUsed: new Date(),
        useCount: 1,
        size
      };
      
      // Add to cache
      const cacheKey = this.generateCacheKey(templatePath);
      this.cache.set(cacheKey, entry);
      
      // Update stats
      if (this.config.enableMetrics) {
        this.stats.entryCount++;
        this.stats.totalSize += size;
      }
      
      return compiled;
    } catch (error) {
      throw new Error(`Failed to compile template ${templatePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if cached template is still valid
   */
  private async isTemplateValid(templatePath: string, cachedHash: string): Promise<boolean> {
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      const currentHash = this.generateContentHash(content);
      return currentHash === cachedHash;
    } catch (error) {
      // If we can't read the file, consider cache invalid
      return false;
    }
  }

  /**
   * Generate cache key for template path
   */
  private generateCacheKey(templatePath: string): string {
    return crypto.createHash('md5').update(templatePath).digest('hex');
  }

  /**
   * Generate content hash for validation
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Calculate approximate size of compiled template
   */
  private calculateTemplateSize(compiled: any, content: string): number {
    try {
      // Estimate size based on content length and compiled object
      const contentSize = Buffer.byteLength(content, 'utf-8');
      const compiledSize = JSON.stringify(compiled).length;
      return contentSize + compiledSize;
    } catch (error) {
      // Fallback to content size
      return Buffer.byteLength(content, 'utf-8');
    }
  }

  /**
   * Ensure there's enough space in cache
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024; // Convert MB to bytes
    
    // Check size limit
    while (this.stats.totalSize + requiredSize > maxSizeBytes || 
           this.cache.size >= this.config.maxEntries) {
      await this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Evict least recently used template
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    if (this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed.getTime() < oldestTime) {
        oldestTime = entry.lastUsed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.removeFromCache(oldestKey);
      
      if (this.config.enableMetrics) {
        this.stats.evictions++;
      }
    }
  }

  /**
   * Remove entry from cache
   */
  private removeFromCache(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      
      if (this.config.enableMetrics) {
        this.stats.entryCount--;
        this.stats.totalSize -= entry.size;
      }
    }
  }

  /**
   * Clear expired templates
   */
  private clearExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastUsed.getTime() > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.removeFromCache(key);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.clearExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all cached templates
   */
  clear(): void {
    this.cache.clear();
    
    if (this.config.enableMetrics) {
      this.stats.entryCount = 0;
      this.stats.totalSize = 0;
    }
  }

  /**
   * Get cache size in MB
   */
  getSizeInMB(): number {
    return this.stats.totalSize / 1024 / 1024;
  }

  /**
   * Check if cache is healthy (not over limits)
   */
  isHealthy(): boolean {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    return this.stats.totalSize <= maxSizeBytes && 
           this.cache.size <= this.config.maxEntries;
  }

  /**
   * Preload templates for better performance
   */
  async preloadTemplates(
    templatePaths: string[],
    compiler: (content: string) => Promise<any>
  ): Promise<void> {
    const preloadPromises = templatePaths.map(async (templatePath) => {
      try {
        await this.getTemplate(templatePath, compiler);
      } catch (error) {
        console.warn(`Failed to preload template ${templatePath}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get cache entry information
   */
  getCacheInfo(): Array<{
    key: string;
    lastUsed: Date;
    useCount: number;
    size: number;
  }> {
    const info: Array<{
      key: string;
      lastUsed: Date;
      useCount: number;
      size: number;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      info.push({
        key,
        lastUsed: entry.lastUsed,
        useCount: entry.useCount,
        size: entry.size
      });
    }

    return info.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
  }

  /**
   * Create a scoped cache for specific template types
   */
  createScopedCache(scope: string): ScopedTemplateCache {
    return new ScopedTemplateCache(this, scope);
  }
}

/**
 * Scoped template cache for organizing templates by type
 */
export class ScopedTemplateCache {
  constructor(
    private parentCache: TemplateCache,
    private scope: string
  ) {}

  async getTemplate(
    templateName: string,
    compiler: (content: string) => Promise<any>
  ): Promise<any> {
    const scopedPath = `${this.scope}:${templateName}`;
    return this.parentCache.getTemplate(scopedPath, compiler);
  }

  async preloadTemplates(
    templateNames: string[],
    compiler: (content: string) => Promise<any>
  ): Promise<void> {
    const scopedPaths = templateNames.map(name => `${this.scope}:${name}`);
    return this.parentCache.preloadTemplates(scopedPaths, compiler);
  }
}