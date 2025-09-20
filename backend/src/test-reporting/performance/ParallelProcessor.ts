/**
 * Parallel Processing System for Multiple Report Formats
 * 
 * Implements parallel processing capabilities for generating multiple report formats
 * simultaneously with resource management and progress tracking.
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import * as os from 'os';
import { 
  ReportFormat, 
  ReportConfig, 
  GeneratedReport
} from '../ReportGenerator';
import { AggregatedTestData } from '../types';

export interface ParallelProcessingConfig {
  maxConcurrency: number;
  enableWorkerThreads: boolean;
  workerTimeout: number;
  memoryLimit: number; // MB per worker
  retryAttempts: number;
  enableResourceMonitoring: boolean;
}

export interface ProcessingTask {
  id: string;
  format: ReportFormat;
  data: AggregatedTestData;
  config: ReportConfig;
  priority: number;
}

export interface ProcessingResult {
  taskId: string;
  format: ReportFormat;
  result?: GeneratedReport;
  error?: string;
  processingTime: number;
  memoryUsed: number;
}

export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  activeWorkers: number;
  queuedTasks: number;
}

export class ParallelProcessor extends EventEmitter {
  private config: ParallelProcessingConfig;
  private taskQueue: ProcessingTask[] = [];
  private activeTasks: Map<string, ProcessingTask> = new Map();
  private workers: Map<string, Worker> = new Map();
  private resourceMonitor: NodeJS.Timeout | null = null;
  private stats = {
    tasksCompleted: 0,
    tasksErrored: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0
  };

  constructor(config: Partial<ParallelProcessingConfig> = {}) {
    super();
    
    this.config = {
      maxConcurrency: Math.min(os.cpus().length, 4), // Default to CPU cores or 4, whichever is smaller
      enableWorkerThreads: true,
      workerTimeout: 60000, // 1 minute
      memoryLimit: 256, // 256MB per worker
      retryAttempts: 2,
      enableResourceMonitoring: true,
      ...config
    };

    if (this.config.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
  }

  /**
   * Process multiple report formats in parallel
   */
  async processReportsParallel(
    data: AggregatedTestData,
    formatConfigs: Array<{ format: ReportFormat; config: ReportConfig }>
  ): Promise<ProcessingResult[]> {
    const tasks: ProcessingTask[] = formatConfigs.map((formatConfig, index) => ({
      id: `task-${Date.now()}-${index}`,
      format: formatConfig.format,
      data,
      config: formatConfig.config,
      priority: this.getFormatPriority(formatConfig.format)
    }));

    return this.processTasks(tasks);
  }

  /**
   * Process a batch of tasks with parallel execution
   */
  async processTasks(tasks: ProcessingTask[]): Promise<ProcessingResult[]> {
    // Sort tasks by priority
    tasks.sort((a, b) => b.priority - a.priority);
    
    // Add tasks to queue
    this.taskQueue.push(...tasks);
    
    const results: ProcessingResult[] = [];
    const processingPromises: Promise<ProcessingResult>[] = [];

    // Start processing tasks up to concurrency limit
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrency) {
      const task = this.taskQueue.shift()!;
      const processingPromise = this.processTask(task);
      processingPromises.push(processingPromise);
    }

    // Wait for all tasks to complete
    const settledResults = await Promise.allSettled(processingPromises);
    
    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      } else {
        // Handle rejected promises
        results.push({
          taskId: 'unknown',
          format: ReportFormat.HTML, // Default format for error
          error: settledResult.reason?.message || 'Unknown error',
          processingTime: 0,
          memoryUsed: 0
        });
      }
    }

    return results;
  }

  /**
   * Process a single task
   */
  private async processTask(task: ProcessingTask): Promise<ProcessingResult> {
    const startTime = Date.now();
    let memoryUsed = 0;

    try {
      this.activeTasks.set(task.id, task);
      this.emit('taskStarted', task);

      let result: GeneratedReport;

      if (this.config.enableWorkerThreads && this.shouldUseWorkerThread(task)) {
        result = await this.processInWorkerThread(task);
      } else {
        result = await this.processInMainThread(task);
      }

      const processingTime = Date.now() - startTime;
      memoryUsed = this.getMemoryUsage();

      // Update statistics
      this.stats.tasksCompleted++;
      this.stats.totalProcessingTime += processingTime;
      this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.tasksCompleted;

      const processingResult: ProcessingResult = {
        taskId: task.id,
        format: task.format,
        result,
        processingTime,
        memoryUsed
      };

      this.emit('taskCompleted', processingResult);
      return processingResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.stats.tasksErrored++;

      const processingResult: ProcessingResult = {
        taskId: task.id,
        format: task.format,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        memoryUsed
      };

      this.emit('taskError', processingResult);
      return processingResult;

    } finally {
      this.activeTasks.delete(task.id);
      
      // Process next task in queue if available
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!;
        setImmediate(() => this.processTask(nextTask));
      }
    }
  }

  /**
   * Process task in worker thread
   */
  private async processInWorkerThread(task: ProcessingTask): Promise<GeneratedReport> {
    return new Promise((resolve, reject) => {
      const workerData = {
        task: {
          format: task.format,
          data: task.data,
          config: task.config
        }
      };

      const worker = new Worker(this.getWorkerScript(), {
        workerData,
        resourceLimits: {
          maxOldGenerationSizeMb: this.config.memoryLimit,
          maxYoungGenerationSizeMb: Math.floor(this.config.memoryLimit / 4)
        }
      });

      const workerId = `worker-${task.id}`;
      this.workers.set(workerId, worker);

      // Set timeout
      const timeout = setTimeout(() => {
        worker.terminate();
        this.workers.delete(workerId);
        reject(new Error(`Worker timeout for task ${task.id}`));
      }, this.config.workerTimeout);

      worker.on('message', (result: GeneratedReport) => {
        clearTimeout(timeout);
        this.workers.delete(workerId);
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        this.workers.delete(workerId);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        this.workers.delete(workerId);
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Process task in main thread
   */
  private async processInMainThread(task: ProcessingTask): Promise<GeneratedReport> {
    // Import report generators dynamically to avoid circular dependencies
    const { ReportGeneratorFactory } = await import('../ReportGeneratorFactory');
    
    const factory = new ReportGeneratorFactory();
    const generator = factory.getGenerator(task.format);
    
    if (!generator) {
      throw new Error(`No generator available for format: ${task.format}`);
    }

    return generator.generateReport(task.data, task.config);
  }

  /**
   * Determine if task should use worker thread
   */
  private shouldUseWorkerThread(task: ProcessingTask): boolean {
    if (!this.config.enableWorkerThreads) {
      return false;
    }

    // Use worker threads for large datasets or complex formats
    const dataSize = this.estimateDataSize(task.data);
    const isComplexFormat = task.format === ReportFormat.HTML; // HTML generation is more complex
    
    return dataSize > 1024 * 1024 || isComplexFormat; // 1MB threshold
  }

  /**
   * Estimate data size for processing decision
   */
  private estimateDataSize(data: AggregatedTestData): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      // Fallback estimation
      return data.suiteResults.length * 1000; // Rough estimate
    }
  }

  /**
   * Get format processing priority
   */
  private getFormatPriority(format: ReportFormat): number {
    switch (format) {
      case ReportFormat.JSON: return 3; // Fastest, highest priority
      case ReportFormat.MARKDOWN: return 2; // Medium priority
      case ReportFormat.HTML: return 1; // Slowest, lowest priority
      default: return 0;
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024; // Convert to MB
  }

  /**
   * Get worker script path for worker threads
   */
  private getWorkerScript(): string {
    // This would be the path to a separate worker script file
    // For now, we'll use inline worker code
    return `
      const { parentPort, workerData } = require('worker_threads');
      
      async function processReport() {
        try {
          const { ReportGeneratorFactory } = require('./ReportGeneratorFactory');
          const factory = new ReportGeneratorFactory();
          const generator = factory.getGenerator(workerData.task.format);
          
          if (!generator) {
            throw new Error(\`No generator for format: \${workerData.task.format}\`);
          }
          
          const result = await generator.generateReport(
            workerData.task.data,
            workerData.task.config
          );
          
          parentPort.postMessage(result);
        } catch (error) {
          parentPort.postMessage({ error: error.message });
        }
      }
      
      processReport();
    `;
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    this.resourceMonitor = setInterval(() => {
      const usage = this.getResourceUsage();
      this.emit('resourceUpdate', usage);
      
      // Check for resource constraints
      if (usage.memoryUsage > 80) { // 80% memory usage
        this.emit('resourceWarning', { type: 'memory', usage: usage.memoryUsage });
      }
      
      if (usage.cpuUsage > 90) { // 90% CPU usage
        this.emit('resourceWarning', { type: 'cpu', usage: usage.cpuUsage });
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): ResourceUsage {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to percentage (rough estimate)
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      activeWorkers: this.workers.size,
      queuedTasks: this.taskQueue.length
    };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Cancel all pending tasks
   */
  async cancelAllTasks(): Promise<void> {
    // Clear task queue
    this.taskQueue.length = 0;
    
    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(worker => 
      worker.terminate()
    );
    
    await Promise.allSettled(terminationPromises);
    this.workers.clear();
    this.activeTasks.clear();
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
    
    await this.cancelAllTasks();
    this.removeAllListeners();
  }

  /**
   * Create a processing pool for batch operations
   */
  createProcessingPool(poolSize: number = this.config.maxConcurrency): ProcessingPool {
    return new ProcessingPool(this, poolSize);
  }
}

/**
 * Processing pool for managing batch operations
 */
export class ProcessingPool {
  private activeJobs: Set<Promise<ProcessingResult>> = new Set();

  constructor(
    private processor: ParallelProcessor,
    private poolSize: number
  ) {}

  async submitTask(task: ProcessingTask): Promise<ProcessingResult> {
    // Wait if pool is full
    while (this.activeJobs.size >= this.poolSize) {
      await Promise.race(this.activeJobs);
    }

    const jobPromise = this.processor.processTasks([task]).then(results => {
      const result = results[0];
      if (!result) {
        throw new Error('No result returned from task processing');
      }
      return result;
    });
    
    this.activeJobs.add(jobPromise);

    jobPromise.finally(() => {
      this.activeJobs.delete(jobPromise);
    });

    return jobPromise;
  }

  async waitForAll(): Promise<ProcessingResult[]> {
    const results = await Promise.all(this.activeJobs);
    return results;
  }

  getActiveJobCount(): number {
    return this.activeJobs.size;
  }
}