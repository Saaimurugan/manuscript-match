/**
 * Report Generator Factory and Orchestration System
 * 
 * Implements the factory pattern for creating report generators and provides
 * orchestration for parallel report generation with progress tracking,
 * error handling, and resource management.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  StreamingProcessor,
  TemplateCache,
  ParallelProcessor,
  ProgressIndicator,
  OptimizedFileIO,
  type ProcessingTask
} from './performance';
import {
  ReportGenerator,
  ReportGeneratorFactory as IReportGeneratorFactory,
  ReportFormat,
  ReportConfig,
  HtmlReportConfig,
  MarkdownReportConfig,
  GeneratedReport,
  ValidationResult
} from './ReportGenerator';
import { HtmlReportGenerator } from './HtmlReportGenerator';
import { MarkdownReportGenerator } from './MarkdownReportGenerator';
import { AggregatedTestData } from './types';

export interface ReportGenerationOptions {
  formats: ReportFormat[];
  outputDirectory: string;
  baseFilename?: string;
  title?: string;
  parallel?: boolean;
  cleanup?: boolean;
  progressCallback?: (progress: ReportGenerationProgress) => void;
}

export interface ReportGenerationProgress {
  format: ReportFormat;
  stage: 'starting' | 'generating' | 'writing' | 'validating' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface ReportGenerationResult {
  success: boolean;
  reports: GeneratedReport[];
  errors: Array<{ format: ReportFormat; error: string }>;
  totalTime: number;
  tempFiles: string[];
}

export interface JsonReportGenerator extends ReportGenerator {
  // JSON-specific methods would go here
}

class SimpleJsonReportGenerator implements JsonReportGenerator {
  async generateReport(data: AggregatedTestData, config: ReportConfig): Promise<GeneratedReport> {
    const startTime = Date.now();

    try {
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Generate JSON content
      const jsonContent = JSON.stringify(data, null, 2);

      // Ensure output directory exists
      await fs.mkdir(config.outputDirectory, { recursive: true });

      // Write report to file
      const outputPath = this.getOutputPath(config);
      await fs.writeFile(outputPath, jsonContent, 'utf8');

      // Get file size
      const stats = await fs.stat(outputPath);
      const generationTime = Date.now() - startTime;

      return {
        format: ReportFormat.JSON,
        filePath: outputPath,
        size: stats.size,
        generationTime,
        success: true
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      return {
        format: ReportFormat.JSON,
        filePath: this.getOutputPath(config),
        size: 0,
        generationTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getOutputPath(config: ReportConfig): string {
    const filename = config.filename || 'test-report.json';
    return path.join(config.outputDirectory, filename);
  }

  validateConfig(config: ReportConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.outputDirectory) {
      errors.push('Output directory is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  getFormat(): ReportFormat {
    return ReportFormat.JSON;
  }
}

export class ReportGeneratorFactory extends EventEmitter implements IReportGeneratorFactory {
  private generators: Map<ReportFormat, ReportGenerator> = new Map();
  private tempFiles: Set<string> = new Set();
  private templateCache!: TemplateCache;
  private parallelProcessor!: ParallelProcessor;
  private optimizedFileIO!: OptimizedFileIO;
  private streamingProcessor!: StreamingProcessor;

  constructor() {
    super();
    this.initializeGenerators();
    this.initializePerformanceComponents();
  }

  private initializePerformanceComponents(): void {
    this.templateCache = new TemplateCache({
      maxSize: 20, // 20MB cache
      maxEntries: 100,
      ttl: 30 * 60 * 1000, // 30 minutes
      enableCompression: true,
      enableMetrics: true
    });

    this.parallelProcessor = new ParallelProcessor({
      maxConcurrency: Math.min(require('os').cpus().length, 4),
      enableWorkerThreads: false, // Disable for now due to complexity
      workerTimeout: 60000,
      memoryLimit: 256,
      retryAttempts: 2,
      enableResourceMonitoring: true
    });

    this.optimizedFileIO = new OptimizedFileIO({
      bufferSize: 64 * 1024,
      enableCompression: false, // Let individual generators handle compression
      enableCaching: true,
      maxCacheSize: 50,
      enableBatching: true,
      batchSize: 10,
      retryAttempts: 3,
      retryDelay: 100
    });

    this.streamingProcessor = new StreamingProcessor({
      batchSize: 50,
      maxMemoryUsage: 100,
      enableBackpressure: true,
      processingTimeout: 30000
    });
  }

  private initializeGenerators(): void {
    this.generators.set(ReportFormat.HTML, new HtmlReportGenerator());
    this.generators.set(ReportFormat.MARKDOWN, new MarkdownReportGenerator());
    this.generators.set(ReportFormat.JSON, new SimpleJsonReportGenerator());
  }

  createHtmlGenerator(): HtmlReportGenerator {
    return new HtmlReportGenerator();
  }

  createMarkdownGenerator(): MarkdownReportGenerator {
    return new MarkdownReportGenerator();
  }

  createJsonGenerator(): JsonReportGenerator {
    return new SimpleJsonReportGenerator();
  }

  /**
   * Generate reports in multiple formats with orchestration and performance optimizations
   */
  async generateReports(
    data: AggregatedTestData,
    options: ReportGenerationOptions
  ): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    const result: ReportGenerationResult = {
      success: true,
      reports: [],
      errors: [],
      totalTime: 0,
      tempFiles: []
    };

    // Initialize progress tracking
    const progress = new ProgressIndicator({
      enableConsoleOutput: true,
      showPercentage: true,
      showETA: true,
      showThroughput: true,
      showMemoryUsage: true
    });

    try {
      // Validate options
      this.validateOptions(options);

      progress.start(100, 'Initializing report generation...');

      // Prepare output directory
      await this.prepareOutputDirectory(options.outputDirectory);
      progress.update({ current: 10, message: 'Output directory prepared' });

      // Use optimized parallel processing for multiple formats
      if (options.parallel && options.formats.length > 1) {
        await this.generateReportsWithOptimizedParallel(data, options, result, progress);
      } else {
        await this.generateReportsSequential(data, options, result, progress);
      }

      // Validate generated reports
      progress.update({ current: 90, message: 'Validating generated reports...' });
      await this.validateGeneratedReports(result.reports);

      // Cleanup if requested
      if (options.cleanup) {
        progress.update({ current: 95, message: 'Cleaning up temporary files...' });
        await this.cleanup();
      }

      progress.complete('Report generation completed successfully!');

    } catch (error) {
      result.success = false;
      result.errors.push({
        format: ReportFormat.HTML, // Generic error
        error: error instanceof Error ? error.message : String(error)
      });
      progress.fail(error instanceof Error ? error.message : String(error));
    } finally {
      result.totalTime = Date.now() - startTime;
      result.tempFiles = Array.from(this.tempFiles);

      // Log performance statistics
      this.logPerformanceStats(result);
    }

    return result;
  }

  /**
   * Generate reports using optimized parallel processing
   */
  private async generateReportsWithOptimizedParallel(
    data: AggregatedTestData,
    options: ReportGenerationOptions,
    result: ReportGenerationResult,
    progress: ProgressIndicator
  ): Promise<void> {
    progress.update({ current: 20, message: 'Setting up parallel processing...' });

    // Create processing tasks
    const tasks: ProcessingTask[] = options.formats.map((format, index) => ({
      id: `report-${format}-${Date.now()}-${index}`,
      format,
      data,
      config: this.createFormatConfig(format, options),
      priority: this.getFormatPriority(format)
    }));



    // Process with parallel processor
    const processingResults = await this.parallelProcessor.processTasks(tasks);

    // Convert processing results to report results
    for (const processingResult of processingResults) {
      if (processingResult.result) {
        result.reports.push(processingResult.result);
      } else if (processingResult.error) {
        result.errors.push({
          format: processingResult.format || ReportFormat.HTML, // Provide default format
          error: processingResult.error
        });
      }
    }

    progress.update({ current: 80, message: 'Parallel processing completed' });
  }

  /**
   * Get priority for format processing (higher number = higher priority)
   */
  private getFormatPriority(format: ReportFormat): number {
    switch (format) {
      case ReportFormat.JSON:
        return 3; // Highest priority - fastest to generate
      case ReportFormat.MARKDOWN:
        return 2; // Medium priority
      case ReportFormat.HTML:
        return 1; // Lowest priority - most complex to generate
      default:
        return 0;
    }
  }

  private async generateReportsSequential(
    data: AggregatedTestData,
    options: ReportGenerationOptions,
    result: ReportGenerationResult,
    progress?: ProgressIndicator
  ): Promise<void> {
    const totalFormats = options.formats.length;

    for (let i = 0; i < totalFormats; i++) {
      const format = options.formats[i];
      if (!format) continue; // Skip undefined formats

      const progressPercent = 20 + ((i / totalFormats) * 60); // 20-80% range

      if (progress) {
        progress.update({
          current: progressPercent,
          message: `Generating ${format} report...`
        });
      }

      await this.generateSingleReport(data, format, options, result);
    }
  }

  private async generateSingleReport(
    data: AggregatedTestData,
    format: ReportFormat,
    options: ReportGenerationOptions,
    result: ReportGenerationResult
  ): Promise<void> {
    try {
      // Emit progress: starting
      this.emitProgress(format, 'starting', 0, 'Initializing report generation', options.progressCallback);

      const generator = this.generators.get(format);
      if (!generator) {
        throw new Error(`No generator available for format: ${format}`);
      }

      // Create format-specific configuration
      const config = this.createFormatConfig(format, options);

      // Emit progress: generating
      this.emitProgress(format, 'generating', 25, 'Generating report content', options.progressCallback);

      // Generate the report
      const report = await generator.generateReport(data, config);

      if (!report.success) {
        throw new Error(report.error || 'Report generation failed');
      }

      // Emit progress: writing
      this.emitProgress(format, 'writing', 75, 'Writing report to file', options.progressCallback);

      // Validate the generated file
      await this.validateReportFile(report);

      // Emit progress: completed
      this.emitProgress(format, 'completed', 100, 'Report generation completed', options.progressCallback);

      result.reports.push(report);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Emit progress: failed
      this.emitProgress(format, 'failed', 0, 'Report generation failed', options.progressCallback, errorMessage);

      result.errors.push({
        format,
        error: errorMessage
      });

      // Don't fail the entire process for individual report failures
      console.error(`Failed to generate ${format} report:`, errorMessage);
    }
  }

  private createFormatConfig(format: ReportFormat, options: ReportGenerationOptions): ReportConfig {
    const baseConfig: ReportConfig = {
      outputDirectory: options.outputDirectory,
      title: options.title || 'Test Report',
      includeTimestamp: true,
      includeMetadata: true
    };

    switch (format) {
      case ReportFormat.HTML:
        const htmlConfig: HtmlReportConfig = {
          ...baseConfig,
          filename: options.baseFilename ? `${options.baseFilename}.html` : 'test-report.html',
          includeInteractiveFeatures: true,
          includeCharts: true,
          theme: 'auto',
          showStackTraces: true,
          maxFailureDetails: 50
        };
        return htmlConfig;

      case ReportFormat.MARKDOWN:
        const markdownConfig: MarkdownReportConfig = {
          ...baseConfig,
          filename: options.baseFilename ? `${options.baseFilename}.md` : 'test-report.md',
          includeEmojis: true,
          includeStackTraces: true,
          maxFailureDetails: 10,
          includePerformanceMetrics: true,
          includeCoverageDetails: true,
          tableFormat: 'github',
          sectionDepth: 2,
          showTimestamps: true
        };
        return markdownConfig;

      case ReportFormat.JSON:
        return {
          ...baseConfig,
          filename: options.baseFilename ? `${options.baseFilename}.json` : 'test-report.json'
        };

      default:
        return baseConfig;
    }
  }

  private emitProgress(
    format: ReportFormat,
    stage: ReportGenerationProgress['stage'],
    progress: number,
    message: string,
    callback?: (progress: ReportGenerationProgress) => void,
    error?: string
  ): void {
    const progressData: ReportGenerationProgress = {
      format,
      stage,
      progress,
      message,
      ...(error && { error })
    };

    // Emit event
    this.emit('progress', progressData);

    // Call callback if provided
    if (callback) {
      callback(progressData);
    }

    // Console output
    const emoji = this.getStageEmoji(stage);
    const formatName = format.toUpperCase();

    if (error) {
      console.error(`${emoji} [${formatName}] ${message}: ${error}`);
    } else {
      console.log(`${emoji} [${formatName}] ${message} (${progress}%)`);
    }
  }

  private getStageEmoji(stage: ReportGenerationProgress['stage']): string {
    switch (stage) {
      case 'starting': return '🚀';
      case 'generating': return '⚙️';
      case 'writing': return '💾';
      case 'validating': return '✅';
      case 'completed': return '🎉';
      case 'failed': return '❌';
      default: return '📊';
    }
  }

  private validateOptions(options: ReportGenerationOptions): void {
    if (!options.formats || options.formats.length === 0) {
      throw new Error('At least one report format must be specified');
    }

    if (!options.outputDirectory) {
      throw new Error('Output directory is required');
    }

    // Validate that all requested formats are supported
    for (const format of options.formats) {
      if (!this.generators.has(format)) {
        throw new Error(`Unsupported report format: ${format}`);
      }
    }
  }

  private async prepareOutputDirectory(outputDir: string): Promise<void> {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      // Verify directory is writable
      const testFile = path.join(outputDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

    } catch (error) {
      throw new Error(`Failed to prepare output directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateReportFile(report: GeneratedReport): Promise<void> {
    try {
      const stats = await fs.stat(report.filePath);

      if (stats.size === 0) {
        throw new Error('Generated report file is empty');
      }

      if (stats.size !== report.size) {
        console.warn(`Report size mismatch: expected ${report.size}, actual ${stats.size}`);
      }

      // Basic content validation based on format
      const content = await fs.readFile(report.filePath, 'utf8');

      switch (report.format) {
        case ReportFormat.HTML:
          if (!content.includes('<!DOCTYPE html>') || !content.includes('</html>')) {
            throw new Error('Invalid HTML report structure');
          }
          break;

        case ReportFormat.MARKDOWN:
          if (!content.includes('#') || content.trim().length === 0) {
            throw new Error('Invalid Markdown report structure');
          }
          break;

        case ReportFormat.JSON:
          try {
            JSON.parse(content);
          } catch {
            throw new Error('Invalid JSON report structure');
          }
          break;
      }

    } catch (error) {
      throw new Error(`Report validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateGeneratedReports(reports: GeneratedReport[]): Promise<void> {
    const validationPromises = reports.map(report => this.validateReportFile(report));

    try {
      await Promise.all(validationPromises);
    } catch (error) {
      console.warn(`Report validation warning: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fail the entire process for validation warnings
    }
  }

  /**
   * Add a temporary file to be cleaned up later
   */
  addTempFile(filePath: string): void {
    this.tempFiles.add(filePath);
  }

  /**
   * Clean up temporary files and resources
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    for (const tempFile of this.tempFiles) {
      cleanupPromises.push(
        fs.unlink(tempFile).catch(error => {
          console.warn(`Failed to cleanup temp file ${tempFile}:`, error);
        })
      );
    }

    await Promise.allSettled(cleanupPromises);
    this.tempFiles.clear();

    // Cleanup performance components
    await this.optimizedFileIO.destroy();
    await this.parallelProcessor.destroy();
    this.templateCache.destroy();

    console.log('🧹 Cleanup completed');
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(result: ReportGenerationResult): void {
    const fileIOStats = this.optimizedFileIO.getStats();
    const parallelStats = this.parallelProcessor.getStats();
    const cacheStats = this.templateCache.getStats();
    const streamingStats = this.streamingProcessor.getStats();

    console.log('\n📊 Performance Statistics:');
    console.log(`  Total Time: ${result.totalTime}ms`);
    console.log(`  Reports Generated: ${result.reports.length}`);
    console.log(`  Errors: ${result.errors.length}`);

    console.log('\n💾 File I/O Stats:');
    console.log(`  Files Written: ${fileIOStats.filesWritten}`);
    console.log(`  Files Read: ${fileIOStats.filesRead}`);
    console.log(`  Bytes Written: ${(fileIOStats.bytesWritten / 1024).toFixed(1)}KB`);
    console.log(`  Cache Hits: ${fileIOStats.cacheHits}`);
    console.log(`  Cache Hit Rate: ${fileIOStats.cacheHits > 0 ? ((fileIOStats.cacheHits / (fileIOStats.cacheHits + fileIOStats.cacheMisses)) * 100).toFixed(1) : 0}%`);

    console.log('\n⚡ Parallel Processing Stats:');
    console.log(`  Tasks Completed: ${parallelStats.tasksCompleted}`);
    console.log(`  Tasks Errored: ${parallelStats.tasksErrored}`);
    console.log(`  Average Processing Time: ${parallelStats.averageProcessingTime.toFixed(1)}ms`);

    console.log('\n🎯 Template Cache Stats:');
    console.log(`  Cache Hits: ${cacheStats.hits}`);
    console.log(`  Cache Misses: ${cacheStats.misses}`);
    console.log(`  Hit Rate: ${cacheStats.hitRate.toFixed(1)}%`);
    console.log(`  Cache Size: ${(cacheStats.totalSize / 1024 / 1024).toFixed(1)}MB`);

    console.log('\n🌊 Streaming Stats:');
    console.log(`  Items Processed: ${streamingStats.totalProcessed}`);
    console.log(`  Batches Processed: ${streamingStats.batchesProcessed}`);
    console.log(`  Throughput: ${streamingStats.throughput.toFixed(1)} items/sec`);
    console.log(`  Memory Usage: ${streamingStats.memoryUsage.toFixed(1)}MB`);
  }

  /**
   * Get performance components for advanced usage
   */
  getPerformanceComponents() {
    return {
      templateCache: this.templateCache,
      parallelProcessor: this.parallelProcessor,
      optimizedFileIO: this.optimizedFileIO,
      streamingProcessor: this.streamingProcessor
    };
  }

  /**
   * Get available report formats
   */
  getAvailableFormats(): ReportFormat[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Check if a format is supported
   */
  isFormatSupported(format: ReportFormat): boolean {
    return this.generators.has(format);
  }

  /**
   * Get generator for a specific format
   */
  getGenerator(format: ReportFormat): ReportGenerator | undefined {
    return this.generators.get(format);
  }

  /**
   * Register a custom generator for a format
   */
  registerGenerator(format: ReportFormat, generator: ReportGenerator): void {
    this.generators.set(format, generator);
  }
}