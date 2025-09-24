import Redis from 'ioredis';
import { config } from '../config/environment';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

// In-memory cache fallback when Redis is not available
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes (skip in test environment)
    if (process.env['NODE_ENV'] !== 'test') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: any, ttl: number): boolean {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });
    return true;
  }

  del(key: string): boolean {
    return this.cache.delete(key);
  }

  exists(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear() {
    this.cache.clear();
  }

  disconnect() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache: MemoryCache;
  private useRedis = false;
  private defaultTTL = 3600; // 1 hour default
  private keyPrefix = 'scholarfinder:';

  constructor() {
    this.memoryCache = new MemoryCache();

    // Skip Redis in test environment or if explicitly disabled
    if (process.env['NODE_ENV'] === 'test' || process.env['DISABLE_REDIS'] === 'true') {
      console.log('🔄 Redis disabled for test environment, using in-memory cache');
      this.useRedis = false;
      return;
    }

    // Try to connect to Redis, but fall back to memory cache if it fails
    try {
      this.redis = new Redis({
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
        password: config.redis?.password || undefined,
        db: config.redis?.db || 0,
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
        enableOfflineQueue: false,
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.useRedis = true;
      });

      this.redis.on('error', (error) => {
        console.warn('⚠️ Redis connection error, falling back to memory cache:', error.message);
        this.useRedis = false;
      });

      this.redis.on('close', () => {
        console.log('Redis connection closed, using memory cache');
        this.useRedis = false;
      });

      // Try to connect immediately
      this.redis.connect().catch(() => {
        console.log('🔄 Redis not available, using in-memory cache');
        this.useRedis = false;
      });
    } catch (error) {
      console.log('🔄 Redis initialization failed, using in-memory cache');
      this.useRedis = false;
    }
  }

  private getKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.getKey(key, options?.prefix);

      if (this.useRedis && this.redis) {
        const value = await this.redis.get(fullKey);
        if (value === null) return null;
        return JSON.parse(value) as T;
      } else {
        const value = this.memoryCache.get(fullKey);
        return value as T | null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;

      if (this.useRedis && this.redis) {
        const serializedValue = JSON.stringify(value);
        const result = await this.redis.setex(fullKey, ttl, serializedValue);
        return result === 'OK';
      } else {
        return this.memoryCache.set(fullKey, value, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);

      if (this.useRedis && this.redis) {
        const result = await this.redis.del(fullKey);
        return result > 0;
      } else {
        return this.memoryCache.del(fullKey);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);

      if (this.useRedis && this.redis) {
        const result = await this.redis.exists(fullKey);
        return result === 1;
      } else {
        return this.memoryCache.exists(fullKey);
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.getKey(key, options?.prefix));

      if (this.useRedis && this.redis) {
        const values = await this.redis.mget(...fullKeys);
        return values.map(value => {
          if (value === null) return null;
          try {
            return JSON.parse(value) as T;
          } catch {
            return null;
          }
        });
      } else {
        return fullKeys.map(key => this.memoryCache.get(key) as T | null);
      }
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<boolean> {
    try {
      const ttl = options?.ttl || this.defaultTTL;

      if (this.useRedis && this.redis) {
        const pipeline = this.redis.pipeline();
        keyValuePairs.forEach(({ key, value }) => {
          const fullKey = this.getKey(key, options?.prefix);
          const serializedValue = JSON.stringify(value);
          pipeline.setex(fullKey, ttl, serializedValue);
        });
        const results = await pipeline.exec();
        return results?.every(([error, result]) => error === null && result === 'OK') || false;
      } else {
        let allSuccess = true;
        keyValuePairs.forEach(({ key, value }) => {
          const fullKey = this.getKey(key, options?.prefix);
          if (!this.memoryCache.set(fullKey, value, ttl)) {
            allSuccess = false;
          }
        });
        return allSuccess;
      }
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const fullPattern = this.getKey(pattern, options?.prefix);

      if (this.useRedis && this.redis) {
        const keys = await this.redis.keys(fullPattern);
        if (keys.length === 0) return 0;
        const result = await this.redis.del(...keys);
        return result;
      } else {
        // For memory cache, we'll clear all keys (simple implementation)
        this.memoryCache.clear();
        return 1; // Return 1 to indicate some keys were cleared
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch the data
      const data = await fetcher();

      // Store in cache for next time
      await this.set(key, data, options);

      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      // If cache fails, still return the fetched data
      return await fetcher();
    }
  }

  async health(): Promise<boolean> {
    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.ping();
        return result === 'PONG';
      } else {
        // Memory cache is always "healthy" if it exists
        return true;
      }
    } catch (error) {
      console.error('Cache health check failed:', error);
      return !this.useRedis; // Memory cache fallback is still healthy
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.memoryCache.disconnect();
    } catch (error) {
      console.error('Cache disconnect error:', error);
    }
  }

  // Performance monitoring methods
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: Record<string, any>;
    cacheType: 'redis' | 'memory';
  }> {
    try {
      if (this.useRedis && this.redis) {
        const memory = await this.redis.info('memory');
        const keyspace = await this.redis.info('keyspace');

        return {
          connected: this.redis.status === 'ready',
          memory: memory.split('\n').find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown',
          keyspace: this.parseKeyspaceInfo(keyspace),
          cacheType: 'redis'
        };
      } else {
        return {
          connected: true,
          memory: 'in-memory',
          keyspace: { 'memory-cache': 'active' },
          cacheType: 'memory'
        };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        memory: 'unknown',
        keyspace: {},
        cacheType: this.useRedis ? 'redis' : 'memory'
      };
    }
  }

  private parseKeyspaceInfo(keyspaceInfo: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = keyspaceInfo.split('\n');

    lines.forEach(line => {
      if (line.startsWith('db')) {
        const [db, stats] = line.split(':');
        if (db && stats) {
          const statsPairs = stats.split(',');
          result[db] = {};

          statsPairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value) {
              result[db][key] = isNaN(Number(value)) ? value : Number(value);
            }
          });
        }
      }
    });

    return result;
  }
}

// Singleton instance
export const cacheService = new CacheService();