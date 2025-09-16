import Redis from 'ioredis';
import { config } from '../config/environment';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour default
  private keyPrefix = 'scholarfinder:';

  constructor() {
    this.redis = new Redis({
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      password: config.redis?.password || undefined,
      db: config.redis?.db || 0,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Connection pool settings
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  private getKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);
      
      const result = await this.redis.setex(fullKey, ttl, serializedValue);
      return result === 'OK';
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.getKey(key, options?.prefix));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      const ttl = options?.ttl || this.defaultTTL;

      keyValuePairs.forEach(({ key, value }) => {
        const fullKey = this.getKey(key, options?.prefix);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(fullKey, ttl, serializedValue);
      });

      const results = await pipeline.exec();
      return results?.every(([error, result]) => error === null && result === 'OK') || false;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const fullPattern = this.getKey(pattern, options?.prefix);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
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
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  // Performance monitoring methods
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: Record<string, any>;
  }> {
    try {
      const memory = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: this.redis.status === 'ready',
        memory: memory.split('\n').find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown',
        keyspace: this.parseKeyspaceInfo(keyspace)
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        connected: false,
        memory: 'unknown',
        keyspace: {}
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