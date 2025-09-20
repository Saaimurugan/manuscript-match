/**
 * Streaming Processor for Large Test Result Sets
 * 
 * Implements streaming processing to handle large test result datasets
 * without loading everything into memory at once.
 */

import { Transform, Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { 
  TestSuiteData, 
  TestCaseData, 
  AggregatedTestData, 
  JestTestResult
} from '../types';

export interface StreamingProcessorConfig {
  batchSize: number;
  maxMemoryUsage: number; // in MB
  enableBackpressure: boolean;
  processingTimeout: number; // in ms
}

export interface ProcessingStats {
  totalProcessed: number;
  batchesProcessed: number;
  memoryUsage: number;
  processingTime: number;
  throughput: number; // items per second
}

export class StreamingProcessor {
  private config: StreamingProcessorConfig;
  private stats: ProcessingStats;

  constructor(config: Partial<StreamingProcessorConfig> = {}) {
    this.config = {
      batchSize: 100,
      maxMemoryUsage: 50, // 50MB default
      enableBackpressure: true,
      processingTimeout: 30000, // 30 seconds
      ...config
    };

    this.stats = {
      totalProcessed: 0,
      batchesProcessed: 0,
      memoryUsage: 0,
      processingTime: 0,
      throughput: 0
    };
  }

  /**
   * Stream process test suites in batches
   */
  async processTestSuitesStream(
    testSuites: JestTestResult[],
    processor: (batch: JestTestResult[]) => Promise<TestSuiteData[]>
  ): Promise<TestSuiteData[]> {
    const startTime = Date.now();
    const results: TestSuiteData[] = [];

    try {
      // Create readable stream from test suites
      const sourceStream = this.createTestSuiteStream(testSuites);
      
      // Create batch processing transform stream
      const batchProcessor = this.createBatchProcessor(processor);
      
      // Create result collector stream
      const resultCollector = this.createResultCollector(results);

      // Process with pipeline
      await pipeline(sourceStream, batchProcessor, resultCollector);

      // Update stats
      this.stats.processingTime = Date.now() - startTime;
      this.stats.throughput = this.stats.totalProcessed / (this.stats.processingTime / 1000);

      return results;
    } catch (error) {
      throw new Error(`Streaming processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stream process test cases for large test suites
   */
  async processTestCasesStream(
    testCases: any[],
    processor: (batch: any[]) => Promise<TestCaseData[]>
  ): Promise<TestCaseData[]> {
    const startTime = Date.now();
    const results: TestCaseData[] = [];

    try {
      const sourceStream = this.createTestCaseStream(testCases);
      const batchProcessor = this.createBatchProcessor(processor);
      const resultCollector = this.createResultCollector(results);

      await pipeline(sourceStream, batchProcessor, resultCollector);

      this.stats.processingTime = Date.now() - startTime;
      this.stats.throughput = this.stats.totalProcessed / (this.stats.processingTime / 1000);

      return results;
    } catch (error) {
      throw new Error(`Test case streaming failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create readable stream from test suites
   */
  private createTestSuiteStream(testSuites: JestTestResult[]): Readable {
    let index = 0;

    return new Readable({
      objectMode: true,
      read() {
        if (index < testSuites.length) {
          this.push(testSuites[index++]);
        } else {
          this.push(null); // End of stream
        }
      }
    });
  }

  /**
   * Create readable stream from test cases
   */
  private createTestCaseStream(testCases: any[]): Readable {
    let index = 0;

    return new Readable({
      objectMode: true,
      read() {
        if (index < testCases.length) {
          this.push(testCases[index++]);
        } else {
          this.push(null);
        }
      }
    });
  }

  /**
   * Create batch processing transform stream
   */
  private createBatchProcessor<T, R>(
    processor: (batch: T[]) => Promise<R[]>
  ): Transform {
    let batch: T[] = [];
    const self = this;

    return new Transform({
      objectMode: true,
      async transform(chunk: T, _encoding, callback) {
        try {
          batch.push(chunk);

          // Check memory usage
          if (self.config.enableBackpressure) {
            self.updateMemoryStats();
            if (self.stats.memoryUsage > self.config.maxMemoryUsage) {
              // Force process current batch to free memory
              if (batch.length > 0) {
                const results = await processor(batch);
                results.forEach(result => this.push(result));
                batch = [];
                self.stats.batchesProcessed++;
                
                // Force garbage collection if available
                if (global.gc) {
                  global.gc();
                }
              }
            }
          }

          // Process batch when it reaches configured size
          if (batch.length >= self.config.batchSize) {
            const results = await processor(batch);
            results.forEach(result => this.push(result));
            self.stats.totalProcessed += batch.length;
            batch = [];
            self.stats.batchesProcessed++;
          }

          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      },

      async flush(callback) {
        try {
          // Process remaining items in batch
          if (batch.length > 0) {
            const results = await processor(batch);
            results.forEach(result => this.push(result));
            self.stats.totalProcessed += batch.length;
            self.stats.batchesProcessed++;
          }
          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }

  /**
   * Create result collector stream
   */
  private createResultCollector<T>(results: T[]): Writable {
    return new Writable({
      objectMode: true,
      write(chunk: T, _encoding, callback) {
        results.push(chunk);
        callback();
      }
    });
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryStats(): void {
    const memUsage = process.memoryUsage();
    this.stats.memoryUsage = memUsage.heapUsed / 1024 / 1024; // Convert to MB
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      batchesProcessed: 0,
      memoryUsage: 0,
      processingTime: 0,
      throughput: 0
    };
  }

  /**
   * Check if memory usage is within limits
   */
  isMemoryUsageHealthy(): boolean {
    this.updateMemoryStats();
    return this.stats.memoryUsage <= this.config.maxMemoryUsage;
  }

  /**
   * Create memory-efficient iterator for large datasets
   */
  async* createMemoryEfficientIterator<T>(
    items: T[],
    batchSize: number = this.config.batchSize
  ): AsyncGenerator<T[], void, unknown> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Check memory before yielding
      if (this.config.enableBackpressure) {
        this.updateMemoryStats();
        if (this.stats.memoryUsage > this.config.maxMemoryUsage) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          // Wait a bit for memory to be freed
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      yield batch;
    }
  }

  /**
   * Process large aggregated data in chunks
   */
  async processAggregatedDataStream(
    data: AggregatedTestData,
    chunkProcessor: (chunk: Partial<AggregatedTestData>) => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Process suite results in chunks
      const suiteChunks = this.chunkArray(data.suiteResults, this.config.batchSize);
      
      for (const chunk of suiteChunks) {
        const chunkData: Partial<AggregatedTestData> = {
          suiteResults: chunk,
          timestamp: data.timestamp,
          buildMetadata: data.buildMetadata
        };
        
        await chunkProcessor(chunkData);
        
        // Memory check
        if (this.config.enableBackpressure && !this.isMemoryUsageHealthy()) {
          if (global.gc) {
            global.gc();
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      this.stats.processingTime = Date.now() - startTime;
    } catch (error) {
      throw new Error(`Aggregated data streaming failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * Create backpressure-aware processing pipeline
   */
  async createBackpressurePipeline<T, R>(
    source: T[],
    processor: (item: T) => Promise<R>,
    options: {
      concurrency?: number;
      maxQueueSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<R[]> {
    const {
      concurrency = 5,
      maxQueueSize = 100,
      onProgress
    } = options;

    const results: R[] = [];
    const queue: Promise<void>[] = [];
    let processed = 0;

    for (let i = 0; i < source.length; i++) {
      const item = source[i];
      if (!item) continue;

      // Wait if queue is full (backpressure)
      if (queue.length >= maxQueueSize) {
        await Promise.race(queue);
      }

      // Create processing promise
      const processingPromise = processor(item)
        .then(result => {
          results[i] = result;
          processed++;
          if (onProgress) {
            onProgress(processed, source.length);
          }
        })
        .finally(() => {
          // Remove from queue when done
          const index = queue.indexOf(processingPromise);
          if (index > -1) {
            queue.splice(index, 1);
          }
        });

      queue.push(processingPromise);

      // Limit concurrency
      if (queue.length >= concurrency) {
        await Promise.race(queue);
      }
    }

    // Wait for all remaining promises
    await Promise.all(queue);

    return results;
  }
}