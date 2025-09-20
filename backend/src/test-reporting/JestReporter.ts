/**
 * Custom Jest Reporter for Real-time Test Reporting Integration
 * 
 * Integrates with Jest's test execution lifecycle to capture test results
 * in real-time and automatically generate comprehensive test reports.
 */

import type { 
  AggregatedResult, 
  TestResult, 
  Test, 
  Context,
  Reporter,
  ReporterOnStartOptions
} from '@jest/reporters';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TestReportAggregator } from './TestReportAggregator';
import { ReportGeneratorFactory } from './ReportGeneratorFactory';
import { JestAggregatedResult } from './types';
import { createErrorHandlingSystem, ErrorHandler, Logger, ResilientFileSystem } from './errors';

export interface JestReporterConfig {
  outputDirectory?: string;
  generateHtml?: boolean;
  generateMarkdown?: boolean;
  generateJson?: boolean;
  verbose?: boolean;
  onlyOnFailure?: boolean;
  includeConsoleOutput?: boolean;
}

export class JestReporter implements Reporter {
  private config: JestReporterConfig;
  private aggregator: TestReportAggregator;
  private reportFactory: ReportGeneratorFactory;
  private startTime: number = 0;
  private testResults: TestResult[] = [];
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private resilientFs: ResilientFileSystem;

  constructor(
    globalConfig: any,
    reporterOptions: JestReporterConfig = {}
  ) {
    // Load default configuration
    let defaultConfig: JestReporterConfig = {};
    try {
      defaultConfig = require('./jest-reporter.config.js');
    } catch (error) {
      // Use fallback defaults if config file not found
      defaultConfig = {
        outputDirectory: 'test-reports',
        generateHtml: true,
        generateMarkdown: true,
        generateJson: true,
        verbose: false,
        onlyOnFailure: false,
        includeConsoleOutput: false
      };
    }

    this.config = {
      ...defaultConfig,
      ...reporterOptions
    };

    this.aggregator = new TestReportAggregator({
      includeSlowTests: true,
      slowTestThreshold: 1000,
      includeStackTraces: true,
      maxStackTraceLength: 2000,
      categorizeByPath: true
    });

    this.reportFactory = new ReportGeneratorFactory();

    // Initialize error handling system
    const errorSystem = createErrorHandlingSystem({
      logLevel: this.config.verbose ? 'debug' : 'info',
      enableFileLogging: true,
      logFilePath: path.join(this.config.outputDirectory || 'test-reports', 'jest-reporter.log'),
      maxRetries: 3,
      enableFallbacks: true,
      enablePartialReports: true,
      failOnCriticalErrors: false
    });

    this.errorHandler = errorSystem.errorHandler;
    this.logger = errorSystem.logger;
    this.resilientFs = errorSystem.resilientFs;

    if (this.config.verbose) {
      this.logger.info('Jest Reporter initialized with config', { config: this.config });
    }
  }

  /**
   * Called when Jest starts running tests
   */
  onRunStart(
    aggregatedResults: AggregatedResult,
    options: ReporterOnStartOptions
  ): void {
    this.startTime = Date.now();
    this.testResults = [];

    this.logger.info('Jest Reporter: Test run started', {
      outputDirectory: this.config.outputDirectory,
      testPathPattern: options.estimatedTime ? 'estimated' : 'unknown'
    });

    // Ensure output directory exists with error handling
    this.ensureOutputDirectory().catch(async error => {
      await this.errorHandler.handleError(error, {
        operation: 'ensureOutputDirectory',
        component: 'JestReporter',
        filePath: this.config.outputDirectory
      });
    });
  }

  /**
   * Called when a test suite starts
   */
  onTestStart(test: Test): void {
    this.logger.debug('Starting test suite', {
      testPath: test.path,
      testName: path.basename(test.path)
    });
  }

  /**
   * Called when a test suite completes
   */
  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResults: AggregatedResult
  ): void {
    this.testResults.push(testResult);

    const duration = testResult.perfStats.end - testResult.perfStats.start;
    const status = testResult.numFailingTests > 0 ? 'failed' : 'passed';
    
    this.logger.info('Test suite completed', {
      testPath: testResult.testFilePath,
      testName: path.basename(testResult.testFilePath),
      status,
      duration,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      total: testResult.numPassingTests + testResult.numFailingTests
    });
  }

  /**
   * Called when all tests complete
   */
  async onRunComplete(
    contexts: Set<Context>,
    results: AggregatedResult
  ): Promise<void> {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    this.logger.info('Jest Reporter: Test run completed', {
      duration: totalDuration,
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      success: results.success
    });

    // Check if we should only generate reports on failure
    if (this.config.onlyOnFailure && results.success) {
      this.logger.info('Skipping report generation (tests passed, onlyOnFailure=true)');
      return;
    }

    try {
      await this.generateReports(results);
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        operation: 'generateReports',
        component: 'JestReporter'
      });
      // Don't throw - we don't want to fail the test run because of reporting issues
    }
  }

  /**
   * Generate all configured report formats
   */
  private async generateReports(jestResults: AggregatedResult): Promise<void> {
    this.logger.info('Generating test reports', {
      formats: {
        html: this.config.generateHtml,
        markdown: this.config.generateMarkdown,
        json: this.config.generateJson
      }
    });

    try {
      // Convert Jest results to our internal format with error recovery
      let aggregatedData;
      try {
        aggregatedData = await this.aggregator.aggregateResults(jestResults as JestAggregatedResult);
      } catch (error) {
        const recovery = await this.errorHandler.handleError(error as Error, {
          operation: 'aggregateResults',
          component: 'TestReportAggregator'
        });
        
        if (recovery.success && recovery.recoveredData) {
          aggregatedData = recovery.recoveredData;
          this.logger.warn('Using recovered test data due to aggregation error');
        } else {
          throw error;
        }
      }

      const reportPromises: Promise<void>[] = [];

      // Generate HTML report
      if (this.config.generateHtml) {
        reportPromises.push(this.generateHtmlReport(aggregatedData));
      }

      // Generate Markdown report
      if (this.config.generateMarkdown) {
        reportPromises.push(this.generateMarkdownReport(aggregatedData));
      }

      // Generate JSON report
      if (this.config.generateJson) {
        reportPromises.push(this.generateJsonReport(aggregatedData));
      }

      // Wait for all reports to complete with individual error handling
      const results = await Promise.allSettled(reportPromises);
      
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          const formatNames = ['HTML', 'Markdown', 'JSON'];
          const formats = [this.config.generateHtml, this.config.generateMarkdown, this.config.generateJson];
          const activeFormats = formatNames.filter((_, i) => formats[i]);
          
          this.logger.error(`Failed to generate ${activeFormats[index]} report`, {
            error: result.reason
          });
        }
      });

      this.logger.info('Test report generation completed', {
        successCount,
        failureCount,
        outputDirectory: this.config.outputDirectory
      });

    } catch (error) {
      this.logger.error('Error during report generation', { error });
      throw error;
    }
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(data: any): Promise<void> {
    const outputPath = path.join(this.config.outputDirectory!, 'test-report.html');
    
    try {
      const htmlGenerator = this.reportFactory.createHtmlGenerator();
      
      await htmlGenerator.generateReport(data, {
        outputPath,
        title: 'Test Report',
        includeCharts: true,
        theme: 'light'
      });

      this.logger.info('HTML report generated successfully', { outputPath });
    } catch (error) {
      const recovery = await this.errorHandler.handleError(error as Error, {
        operation: 'generateHtmlReport',
        component: 'JestReporter',
        reportFormat: 'html',
        filePath: outputPath
      });
      
      if (recovery.success && recovery.recoveredData) {
        // Write fallback HTML report
        await this.resilientFs.writeFile(outputPath, recovery.recoveredData);
        this.logger.warn('Generated fallback HTML report due to error');
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdownReport(data: any): Promise<void> {
    const outputPath = path.join(this.config.outputDirectory!, 'test-report.md');
    
    try {
      const markdownGenerator = this.reportFactory.createMarkdownGenerator();
      
      await markdownGenerator.generateReport(data, {
        outputPath,
        includeEmojis: true,
        includeStackTraces: true,
        maxFailureDetails: 10
      });

      this.logger.info('Markdown report generated successfully', { outputPath });
    } catch (error) {
      const recovery = await this.errorHandler.handleError(error as Error, {
        operation: 'generateMarkdownReport',
        component: 'JestReporter',
        reportFormat: 'markdown',
        filePath: outputPath
      });
      
      if (recovery.success && recovery.recoveredData) {
        // Write fallback Markdown report
        await this.resilientFs.writeFile(outputPath, recovery.recoveredData);
        this.logger.warn('Generated fallback Markdown report due to error');
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate JSON report for programmatic access
   */
  private async generateJsonReport(data: any): Promise<void> {
    try {
      const outputPath = path.join(this.config.outputDirectory!, 'test-results.json');
      
      const jsonData = {
        ...data,
        generatedAt: new Date().toISOString(),
        generator: 'jest-reporter',
        version: '1.0.0'
      };

      await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

      if (this.config.verbose) {
        console.log(`📋 JSON report generated: ${outputPath}`);
      }
    } catch (error) {
      console.error('Failed to generate JSON report:', error);
      throw error;
    }
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputDirectory!, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create output directory ${this.config.outputDirectory}:`, error);
    }
  }

  /**
   * Get summary information for console output
   */
  getLastError(): Error | undefined {
    // Jest reporter interface method - return undefined if no errors
    return undefined;
  }
}

export default JestReporter;