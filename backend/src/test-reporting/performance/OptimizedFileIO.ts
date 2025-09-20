/**
 * Optimized File I/O Operations
 * 
 * Implements efficient file operations with buffering, streaming, and
 * performance optimizations for report generation.
 */

import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import * as path from 'path';
import * as zlib from 'zlib';

export interface FileIOConfig {
  bufferSize: number; // Buffer size in bytes
  enableCompression: boolean;
  compressionLevel: number; // 1-9 for gzip
  enableCaching: boolean;
  maxCacheSize: number; // Maximum cache size in MB
  enableBatching: boolean;
  batchSize: number; // Number of operations to batch
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface WriteOperation {
  filePath: string;
  content: string | Buffer;
  encoding?: BufferEncoding;
  compress?: boolean;
}

export interface ReadOperation {
  filePath: string;
  encoding?: BufferEncoding;
  decompress?: boolean;
}

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  compressed: boolean;
}

export class OptimizedFileIO {
  private config: FileIOConfig;
  private writeQueue: WriteOperation[] = [];
  private readCache: Map<string, { content: string | Buffer; timestamp: number }> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private stats = {
    filesWritten: 0,
    filesRead: 0,
    bytesWritten: 0,
    bytesRead: 0,
    cacheHits: 0,
    cacheMisses: 0,
    compressionSavings: 0
  };

  constructor(config: Partial<FileIOConfig> = {}) {
    this.config = {
      bufferSize: 64 * 1024, // 64KB default
      enableCompression: false,
      compressionLevel: 6,
      enableCaching: true,
      maxCacheSize: 50, // 50MB
      enableBatching: true,
      batchSize: 10,
      retryAttempts: 3,
      retryDelay: 100,
      ...config
    };
  }

  /**
   * Optimized file write with buffering and optional compression
   */
  async writeFile(
    filePath: string,
    content: string | Buffer,
    options: {
      encoding?: BufferEncoding;
      compress?: boolean;
      immediate?: boolean;
    } = {}
  ): Promise<void> {
    const operation: WriteOperation = {
      filePath,
      content,
      encoding: options.encoding || 'utf8',
      compress: options.compress ?? this.config.enableCompression
    };

    if (options.immediate || !this.config.enableBatching) {
      await this.executeWriteOperation(operation);
    } else {
      this.queueWriteOperation(operation);
    }
  }

  /**
   * Optimized file read with caching and optional decompression
   */
  async readFile(
    filePath: string,
    options: {
      encoding?: BufferEncoding;
      decompress?: boolean;
      useCache?: boolean;
    } = {}
  ): Promise<string | Buffer> {
    const cacheKey = this.getCacheKey(filePath, options);
    
    // Check cache first
    if (options.useCache !== false && this.config.enableCaching) {
      const cached = this.readCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.stats.cacheHits++;
        return cached.content;
      }
    }

    // Read from file
    this.stats.cacheMisses++;
    const readOp: ReadOperation = {
      filePath,
      decompress: options.decompress ?? this.config.enableCompression
    };
    
    if (options.encoding) {
      readOp.encoding = options.encoding;
    }
    
    const content = await this.executeReadOperation(readOp);

    // Cache the result
    if (this.config.enableCaching && options.useCache !== false) {
      await this.cacheContent(cacheKey, content);
    }

    return content;
  }

  /**
   * Stream large files efficiently
   */
  async streamFile(
    inputPath: string,
    outputPath: string,
    transform?: (chunk: Buffer) => Buffer
  ): Promise<void> {
    const readStream = createReadStream(inputPath, { 
      highWaterMark: this.config.bufferSize 
    });
    
    const writeStream = createWriteStream(outputPath, {
      highWaterMark: this.config.bufferSize
    });

    let transformStream: Transform | undefined;

    if (transform) {
      transformStream = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          try {
            const transformed = transform(chunk);
            callback(null, transformed);
          } catch (error) {
            callback(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });
    }

    if (transformStream) {
      await pipeline(readStream, transformStream, writeStream);
    } else {
      await pipeline(readStream, writeStream);
    }
  }

  /**
   * Batch write multiple files efficiently
   */
  async writeMultipleFiles(operations: WriteOperation[]): Promise<void> {
    const chunks = this.chunkArray(operations, this.config.batchSize);
    
    for (const chunk of chunks) {
      const writePromises = chunk.map(op => this.executeWriteOperation(op));
      await Promise.all(writePromises);
    }
  }

  /**
   * Batch read multiple files efficiently
   */
  async readMultipleFiles(
    filePaths: string[],
    options: {
      encoding?: BufferEncoding;
      decompress?: boolean;
      useCache?: boolean;
    } = {}
  ): Promise<Array<{ filePath: string; content: string | Buffer; error?: string }>> {
    const readPromises = filePaths.map(async (filePath) => {
      try {
        const content = await this.readFile(filePath, options);
        return { filePath, content };
      } catch (error) {
        return { 
          filePath, 
          content: '', 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    return Promise.all(readPromises);
  }

  /**
   * Create optimized write stream
   */
  createOptimizedWriteStream(
    filePath: string,
    options: {
      compress?: boolean;
      encoding?: BufferEncoding;
    } = {}
  ): NodeJS.WritableStream {
    const writeStream = createWriteStream(filePath, {
      highWaterMark: this.config.bufferSize,
      encoding: options.encoding
    });

    if (options.compress ?? this.config.enableCompression) {
      const gzipStream = zlib.createGzip({ 
        level: this.config.compressionLevel,
        chunkSize: this.config.bufferSize
      });
      
      gzipStream.pipe(writeStream);
      return gzipStream;
    }

    return writeStream;
  }

  /**
   * Create optimized read stream
   */
  createOptimizedReadStream(
    filePath: string,
    options: {
      decompress?: boolean;
      encoding?: BufferEncoding;
    } = {}
  ): NodeJS.ReadableStream {
    const readStream = createReadStream(filePath, {
      highWaterMark: this.config.bufferSize,
      encoding: options.encoding
    });

    if (options.decompress ?? this.config.enableCompression) {
      const gunzipStream = zlib.createGunzip({
        chunkSize: this.config.bufferSize
      });
      
      readStream.pipe(gunzipStream);
      return gunzipStream;
    }

    return readStream;
  }

  /**
   * Execute write operation with retry logic
   */
  private async executeWriteOperation(operation: WriteOperation): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Ensure directory exists
        await this.ensureDirectoryExists(path.dirname(operation.filePath));

        let content = operation.content;
        let originalSize = 0;

        if (typeof content === 'string') {
          originalSize = Buffer.byteLength(content, operation.encoding);
        } else {
          originalSize = content.length;
        }

        // Compress if enabled
        if (operation.compress) {
          if (typeof content === 'string') {
            content = Buffer.from(content, operation.encoding);
          }
          content = await this.compressContent(content as Buffer);
          
          // Track compression savings
          this.stats.compressionSavings += originalSize - (content as Buffer).length;
        }

        // Write file
        await fs.writeFile(operation.filePath, content, {
          encoding: operation.compress ? undefined : operation.encoding
        });

        // Update stats
        this.stats.filesWritten++;
        this.stats.bytesWritten += originalSize;

        return; // Success, exit retry loop

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Write operation failed after all retries');
  }

  /**
   * Execute read operation with retry logic
   */
  private async executeReadOperation(operation: ReadOperation): Promise<string | Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        let content = await fs.readFile(operation.filePath);

        // Decompress if needed
        if (operation.decompress) {
          content = await this.decompressContent(content);
        }

        // Convert to string if encoding specified
        if (operation.encoding && !operation.decompress) {
          const result = content.toString(operation.encoding);
          this.stats.filesRead++;
          this.stats.bytesRead += content.length;
          return result;
        }

        this.stats.filesRead++;
        this.stats.bytesRead += content.length;
        return content;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Read operation failed after all retries');
  }

  /**
   * Queue write operation for batching
   */
  private queueWriteOperation(operation: WriteOperation): void {
    this.writeQueue.push(operation);

    if (this.writeQueue.length >= this.config.batchSize) {
      this.flushWriteQueue();
    } else if (!this.batchTimer) {
      // Set timer to flush queue after a delay
      this.batchTimer = setTimeout(() => {
        this.flushWriteQueue();
      }, 100); // 100ms delay
    }
  }

  /**
   * Flush write queue
   */
  private async flushWriteQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.writeQueue.length === 0) return;

    const operations = [...this.writeQueue];
    this.writeQueue.length = 0;

    const writePromises = operations.map(op => this.executeWriteOperation(op));
    await Promise.allSettled(writePromises);
  }

  /**
   * Compress content using gzip
   */
  private async compressContent(content: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(content, { level: this.config.compressionLevel }, (error, compressed) => {
        if (error) {
          reject(error);
        } else {
          resolve(compressed);
        }
      });
    });
  }

  /**
   * Decompress content using gunzip
   */
  private async decompressContent(content: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(content, (error, decompressed) => {
        if (error) {
          reject(error);
        } else {
          resolve(decompressed);
        }
      });
    });
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as any)?.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(filePath: string, options: any): string {
    return `${filePath}:${JSON.stringify(options)}`;
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isCacheValid(timestamp: number): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - timestamp < maxAge;
  }

  /**
   * Cache content with size management
   */
  private async cacheContent(key: string, content: string | Buffer): Promise<void> {
    const contentSize = typeof content === 'string' ? 
      Buffer.byteLength(content, 'utf8') : content.length;
    
    // Check if adding this content would exceed cache size limit
    const maxCacheBytes = this.config.maxCacheSize * 1024 * 1024;
    const currentCacheSize = this.getCurrentCacheSize();
    
    if (currentCacheSize + contentSize > maxCacheBytes) {
      await this.evictOldestCacheEntries(contentSize);
    }

    this.readCache.set(key, {
      content,
      timestamp: Date.now()
    });
  }

  /**
   * Get current cache size in bytes
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.readCache.values()) {
      totalSize += typeof entry.content === 'string' ? 
        Buffer.byteLength(entry.content, 'utf8') : entry.content.length;
    }
    return totalSize;
  }

  /**
   * Evict oldest cache entries to make space
   */
  private async evictOldestCacheEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.readCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      const entrySize = typeof entry.content === 'string' ? 
        Buffer.byteLength(entry.content, 'utf8') : entry.content.length;
      
      this.readCache.delete(key);
      freedSpace += entrySize;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);
    
    // Check if file is compressed by trying to read magic bytes
    let compressed = false;
    try {
      const buffer = Buffer.alloc(2);
      const fd = await fs.open(filePath, 'r');
      await fd.read(buffer, 0, 2, 0);
      await fd.close();
      
      // Check for gzip magic bytes (1f 8b)
      compressed = buffer[0] === 0x1f && buffer[1] === 0x8b;
    } catch {
      // Ignore errors when checking compression
    }

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      compressed
    };
  }

  /**
   * Get I/O statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.readCache.size,
      cacheSizeBytes: this.getCurrentCacheSize(),
      queueSize: this.writeQueue.length
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.readCache.clear();
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Flush any pending writes
    await this.flushWriteQueue();
    
    // Clear cache
    this.clearCache();
    
    // Clear timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}