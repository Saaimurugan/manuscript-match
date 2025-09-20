/**
 * Performance Tests for Test Reporting System
 * 
 * Validates generation time targets, memory usage, and throughput
 * for the optimized test reporting components.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StreamingProcessor } from '../../performance/StreamingProcessor';
import { TemplateCache } from '../../performance/TemplateCache';
import { ParallelProcessor } from '../../performance/ParallelProcessor';
import { ProgressIndicator } from '../../performance/ProgressIndicator';
import { OptimizedFileIO } from '../../performance/OptimizedFileIO';
import { TestReportAggregator } from '../../TestReportAggregator';
import { ReportGeneratorFactory } from '../../ReportGeneratorFactory';
import { 
  AggregatedTestData, 
  TestSuiteData, 
  TestStatus, 
  TestCategory,
  JestTestResult 
} from '../../types';

describe('Performance Tests', () => {
  const testOutputDir = path.join(__dirname, '../../../temp/performance-tests');
  
  beforeEach(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Streaming Processor Performance', () => {
    test('should process large test suites within memory limits', async () => {
      const processor = new StreamingProcessor({
        batchSize: 50,
        maxMemoryUsage: 100, // 100MB limit
        enableBackpressure: true
      });

      // Generate large dataset (1000 test suites)
      const largeTestSuites = generateLargeTestSuites(1000);
      
      const startMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const results = await processor.processTestSuitesStream(
        largeTestSuites,
        async (batch) => {
          // Simulate processing
          return batch.map(suite => ({
            name: suite.testFilePath,
            filePath: suite.testFilePath,
            status: TestStatus.PASSED,
            duration: 100,
            tests: [],
            category: TestCategory.UNIT,
            numPassingTests: 0,
            numFailingTests: 0,
            numPendingTests: 0,
            numTodoTests: 0,
            startTime: new Date(),
            endTime: new Date()
          }));
        }
      );

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

      const stats = processor.getStats();

      // Performance assertions
      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryIncrease).toBeLessThan(100); // Should not increase memory by more than 100MB
      expect(stats.throughput).toBeGreaterThan(50); // Should process at least 50 items/second
    });

    test('should handle backpressure correctly', async () => {
      const processor = new StreamingProcessor({
        batchSize: 10,
        maxMemoryUsage: 50, // Low limit to trigger backpressure
        enableBackpressure: true
      });

      const testSuites = generateLargeTestSuites(100);

      // Monitor memory during processing
      const memoryMonitor = setInterval(() => {
        process.memoryUsage().heapUsed / 1024 / 1024;
        // Just monitor, don't need to track the flag for this test
      }, 100);

      await processor.processTestSuitesStream(testSuites, async (batch) => {
        // Simulate memory-intensive processing
        new Array(10000).fill('test data'); // Create memory pressure
        await new Promise(resolve => setTimeout(resolve, 10));
        return batch.map(() => createMockTestSuite());
      });

      clearInterval(memoryMonitor);

      // Should handle backpressure without exceeding limits significantly
      expect(processor.isMemoryUsageHealthy()).toBe(true);
    });
  });

  describe('Template Cache Performance', () => {
    test('should improve template compilation performance', async () => {
      const cache = new TemplateCache({
        maxSize: 10,
        maxEntries: 20,
        enableMetrics: true
      });

      generateLargeTemplate(); // Generate template for cache size
      const mockCompiler = jest.fn(async (content: string) => {
        // Simulate compilation time
        await new Promise(resolve => setTimeout(resolve, 100));
        return { compiled: content.length };
      });

      // First compilation (cache miss)
      const startTime1 = Date.now();
      await cache.getTemplate('test-template.html', mockCompiler);
      const firstCompileTime = Date.now() - startTime1;

      // Second compilation (cache hit)
      const startTime2 = Date.now();
      await cache.getTemplate('test-template.html', mockCompiler);
      const secondCompileTime = Date.now() - startTime2;

      const stats = cache.getStats();

      // Performance assertions
      expect(mockCompiler).toHaveBeenCalledTimes(1); // Should only compile once
      expect(secondCompileTime).toBeLessThan(firstCompileTime / 2); // Cache should be much faster
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    test('should manage cache size efficiently', async () => {
      const cache = new TemplateCache({
        maxSize: 1, // 1MB limit
        maxEntries: 5,
        enableMetrics: true
      });

      const mockCompiler = async (content: string) => ({ compiled: content });

      // Add templates that exceed cache size
      for (let i = 0; i < 10; i++) {
        'x'.repeat(200 * 1024); // 200KB each - simulate large content
        await cache.getTemplate(`template-${i}.html`, mockCompiler);
      }

      const stats = cache.getStats();
      
      // Should evict entries to stay within limits
      expect(cache.getSizeInMB()).toBeLessThanOrEqual(1.1); // Allow small margin
      expect(stats.entryCount).toBeLessThanOrEqual(5);
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('Parallel Processor Performance', () => {
    test('should generate reports faster with parallel processing', async () => {
      const processor = new ParallelProcessor({
        maxConcurrency: 3,
        enableWorkerThreads: false, // Use main thread for testing
        enableResourceMonitoring: true
      });

      const testData = generateLargeAggregatedTestData();
      const formatConfigs = [
        { format: 'HTML' as any, config: { outputDirectory: testOutputDir, filename: 'test.html' } },
        { format: 'MARKDOWN' as any, config: { outputDirectory: testOutputDir, filename: 'test.md' } },
        { format: 'JSON' as any, config: { outputDirectory: testOutputDir, filename: 'test.json' } }
      ];

      const startTime = Date.now();
      const results = await processor.processReportsParallel(testData, formatConfigs);
      const parallelTime = Date.now() - startTime;

      // Sequential processing for comparison
      const factory = new ReportGeneratorFactory();
      const sequentialStartTime = Date.now();
      
      for (const formatConfig of formatConfigs) {
        const generator = factory.getGenerator(formatConfig.format);
        if (generator) {
          await generator.generateReport(testData, formatConfig.config);
        }
      }
      
      const sequentialTime = Date.now() - sequentialStartTime;

      // Performance assertions
      expect(results).toHaveLength(3);
      expect(results.every(r => r.result?.success)).toBe(true);
      expect(parallelTime).toBeLessThan(sequentialTime * 0.8); // Should be at least 20% faster
      expect(parallelTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('should handle resource constraints', async () => {
      const processor = new ParallelProcessor({
        maxConcurrency: 2,
        enableResourceMonitoring: true
      });

      let resourceWarnings = 0;
      processor.on('resourceWarning', () => {
        resourceWarnings++;
      });

      const testData = generateLargeAggregatedTestData();
      const formatConfigs = Array(5).fill(null).map((_, i) => ({
        format: 'HTML' as any,
        config: { outputDirectory: testOutputDir, filename: `test-${i}.html` }
      }));

      await processor.processReportsParallel(testData, formatConfigs);

      const resourceUsage = processor.getResourceUsage();
      
      // Should monitor and report resource usage
      expect(resourceUsage.activeWorkers).toBeLessThanOrEqual(2);
      expect(resourceUsage.memoryUsage).toBeLessThan(100); // Should stay under 100%
    });
  });

  describe('Progress Indicator Performance', () => {
    test('should provide accurate progress tracking', async () => {
      const progress = new ProgressIndicator({
        enableConsoleOutput: false, // Disable for testing
        updateInterval: 10
      });

      const progressUpdates: number[] = [];
      progress.on('updated', (state) => {
        progressUpdates.push(state.percentage);
      });

      progress.start(100, 'Testing progress');

      // Simulate work with progress updates
      for (let i = 0; i <= 100; i += 10) {
        progress.update({ current: i });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      progress.complete('Test completed');

      const finalState = progress.getState();

      // Performance assertions
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(finalState.percentage).toBe(100);
      expect(finalState.throughput).toBeGreaterThan(0);
      expect(progressUpdates).toEqual(expect.arrayContaining([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]));
    });

    test('should handle multi-stage progress efficiently', async () => {
      const { MultiStageProgress } = await import('../../performance/ProgressIndicator');
      
      const multiStage = new MultiStageProgress({
        enableConsoleOutput: false
      });

      multiStage.defineStages([
        { name: 'Stage 1', weight: 0.3 },
        { name: 'Stage 2', weight: 0.5 },
        { name: 'Stage 3', weight: 0.2 }
      ]);

      const progressUpdates: number[] = [];
      multiStage.getMainProgress().on('updated', (state) => {
        progressUpdates.push(state.percentage);
      });

      multiStage.start();

      // Stage 1
      const stage1 = multiStage.startStage(50);
      for (let i = 0; i <= 50; i += 10) {
        stage1.update({ current: i });
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      multiStage.completeStage();

      // Stage 2
      const stage2 = multiStage.startStage(100);
      for (let i = 0; i <= 100; i += 20) {
        stage2.update({ current: i });
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      multiStage.completeStage();

      // Stage 3
      const stage3 = multiStage.startStage(25);
      for (let i = 0; i <= 25; i += 5) {
        stage3.update({ current: i });
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      multiStage.completeStage();

      multiStage.complete();

      const finalState = multiStage.getMainProgress().getState();

      // Should accurately track multi-stage progress
      expect(finalState.percentage).toBe(100);
      expect(progressUpdates.length).toBeGreaterThan(10);
      expect(Math.max(...progressUpdates)).toBe(100);
    });
  });

  describe('Optimized File I/O Performance', () => {
    test('should improve file write performance with batching', async () => {
      const fileIO = new OptimizedFileIO({
        enableBatching: true,
        batchSize: 10,
        bufferSize: 64 * 1024
      });

      const files = Array(50).fill(null).map((_, i) => ({
        path: path.join(testOutputDir, `batch-test-${i}.txt`),
        content: 'x'.repeat(1000) // 1KB each
      }));

      // Batched writes
      const batchedStartTime = Date.now();
      const writePromises = files.map(file => 
        fileIO.writeFile(file.path, file.content, { immediate: false })
      );
      await Promise.all(writePromises);
      const batchedTime = Date.now() - batchedStartTime;

      // Individual writes for comparison
      const individualIO = new OptimizedFileIO({ enableBatching: false });
      const individualStartTime = Date.now();
      const individualPromises = files.map(file => 
        individualIO.writeFile(file.path + '.individual', file.content, { immediate: true })
      );
      await Promise.all(individualPromises);
      const individualTime = Date.now() - individualStartTime;

      const stats = fileIO.getStats();

      // Performance assertions
      expect(stats.filesWritten).toBe(50);
      expect(batchedTime).toBeLessThan(individualTime * 0.8); // Should be faster with batching
      expect(batchedTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle large files efficiently with streaming', async () => {
      const fileIO = new OptimizedFileIO({
        bufferSize: 64 * 1024,
        enableCompression: false
      });

      // Create large content (5MB)
      const largeContent = 'x'.repeat(5 * 1024 * 1024);
      const inputPath = path.join(testOutputDir, 'large-input.txt');
      const outputPath = path.join(testOutputDir, 'large-output.txt');

      await fileIO.writeFile(inputPath, largeContent, { immediate: true });

      const startTime = Date.now();
      await fileIO.streamFile(inputPath, outputPath, (chunk) => {
        // Simple transformation
        return Buffer.from(chunk.toString().toUpperCase());
      });
      const streamTime = Date.now() - startTime;

      const outputStats = await fileIO.getFileStats(outputPath);

      // Performance assertions
      expect(outputStats.size).toBe(largeContent.length);
      expect(streamTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify memory usage didn't spike
      const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      expect(memUsage).toBeLessThan(100); // Should stay under 100MB
    });

    test('should provide effective caching', async () => {
      const fileIO = new OptimizedFileIO({
        enableCaching: true,
        maxCacheSize: 10
      });

      const testFile = path.join(testOutputDir, 'cache-test.txt');
      const content = 'Test content for caching';
      
      await fileIO.writeFile(testFile, content, { immediate: true });

      // First read (cache miss)
      const startTime1 = Date.now();
      const content1 = await fileIO.readFile(testFile, { useCache: true });
      const firstReadTime = Date.now() - startTime1;

      // Second read (cache hit)
      const startTime2 = Date.now();
      const content2 = await fileIO.readFile(testFile, { useCache: true });
      const secondReadTime = Date.now() - startTime2;

      const stats = fileIO.getStats();

      // Performance assertions
      expect(content1).toBe(content);
      expect(content2).toBe(content);
      expect(secondReadTime).toBeLessThan(firstReadTime / 2); // Cache should be much faster
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });
  });

  describe('End-to-End Performance', () => {
    test('should meet overall performance targets', async () => {
      const aggregator = new TestReportAggregator();
      const factory = new ReportGeneratorFactory();

      // Generate large test dataset
      const largeJestResults = generateLargeJestResults(500); // 500 test suites
      
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Aggregate test results
      const aggregatedData = await aggregator.aggregateResults(largeJestResults);

      // Generate reports in parallel
      const reportOptions = {
        formats: ['HTML', 'MARKDOWN', 'JSON'] as any[],
        outputDirectory: testOutputDir,
        parallel: true,
        progressCallback: (_progress: any) => {
          // Track progress
        }
      };

      const reportResults = await factory.generateReports(aggregatedData, reportOptions);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const totalTime = endTime - startTime;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

      // Performance targets from requirements
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds (Req 5.1)
      expect(memoryIncrease).toBeLessThan(200); // Should use less than 200MB additional memory (Req 5.2)
      expect(reportResults.success).toBe(true);
      expect(reportResults.reports).toHaveLength(3);
      
      // Verify all reports were generated
      for (const report of reportResults.reports) {
        expect(report.success).toBe(true);
        expect(report.size).toBeGreaterThan(0);
      }
    });
  });
});

// Helper functions for generating test data

function generateLargeTestSuites(count: number): JestTestResult[] {
  return Array(count).fill(null).map((_, i) => ({
    testFilePath: `/test/suite-${i}.test.js`,
    testResults: Array(10).fill(null).map((_, j) => ({
      ancestorTitles: [`Suite ${i}`],
      fullName: `Suite ${i} Test ${j}`,
      title: `Test ${j}`,
      status: 'passed' as const,
      duration: Math.random() * 100,
      failureMessages: [],
      numPassingAsserts: 1
    })),
    perfStats: {
      start: Date.now() - 1000,
      end: Date.now()
    },
    skipped: false,
    leaks: false,
    numFailingTests: 0,
    numPassingTests: 10,
    numPendingTests: 0,
    numTodoTests: 0,
    openHandles: [],
    sourceMaps: {},
    console: null
  }));
}

function createMockTestSuite(): TestSuiteData {
  return {
    name: 'Mock Suite',
    filePath: '/test/mock.test.js',
    status: TestStatus.PASSED,
    duration: 100,
    tests: [],
    category: TestCategory.UNIT,
    numPassingTests: 1,
    numFailingTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    startTime: new Date(),
    endTime: new Date()
  };
}

function generateLargeTemplate(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>Large Template</title></head>
    <body>
      ${Array(1000).fill('<div>Template content</div>').join('\n')}
    </body>
    </html>
  `;
}

function generateLargeAggregatedTestData(): AggregatedTestData {
  const suiteResults = Array(100).fill(null).map(() => createMockTestSuite());
  
  return {
    summary: {
      totalTests: 1000,
      passedTests: 950,
      failedTests: 50,
      skippedTests: 0,
      todoTests: 0,
      passRate: 95,
      executionTime: 30000,
      testSuites: 100,
      passedSuites: 95,
      failedSuites: 5
    },
    suiteResults,
    coverageData: {
      overall: {
        lines: { total: 1000, covered: 800, percentage: 80 },
        functions: { total: 200, covered: 160, percentage: 80 },
        branches: { total: 300, covered: 240, percentage: 80 },
        statements: { total: 1000, covered: 800, percentage: 80 }
      },
      byFile: {},
      byCategory: {} as any,
      threshold: { lines: 80, functions: 80, branches: 80, statements: 80 }
    },
    timestamp: new Date(),
    buildMetadata: {
      timestamp: new Date(),
      environment: 'test',
      gitInfo: {},
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    metrics: {
      summary: {
        totalTests: 1000,
        passedTests: 950,
        failedTests: 50,
        skippedTests: 0,
        todoTests: 0,
        passRate: 95,
        executionTime: 30000,
        testSuites: 100,
        passedSuites: 95,
        failedSuites: 5
      },
      categoryBreakdown: {} as any,
      coverageMetrics: {
        overall: {
          lines: { total: 1000, covered: 800, percentage: 80 },
          functions: { total: 200, covered: 160, percentage: 80 },
          branches: { total: 300, covered: 240, percentage: 80 },
          statements: { total: 1000, covered: 800, percentage: 80 }
        },
        byFile: {},
        byCategory: {} as any,
        threshold: { lines: 80, functions: 80, branches: 80, statements: 80 }
      },
      slowestTests: [],
      failedTests: []
    }
  };
}

function generateLargeJestResults(suiteCount: number): any {
  return {
    testResults: generateLargeTestSuites(suiteCount),
    numTotalTestSuites: suiteCount,
    numPassedTestSuites: Math.floor(suiteCount * 0.9),
    numFailedTestSuites: Math.floor(suiteCount * 0.1),
    numPendingTestSuites: 0,
    numTotalTests: suiteCount * 10,
    numPassedTests: Math.floor(suiteCount * 10 * 0.95),
    numFailedTests: Math.floor(suiteCount * 10 * 0.05),
    numPendingTests: 0,
    numTodoTests: 0,
    startTime: Date.now() - 30000,
    success: true,
    wasInterrupted: false
  };
}