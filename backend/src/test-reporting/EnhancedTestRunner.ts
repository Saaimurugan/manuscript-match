/**
 * Enhanced Test Runner with TypeScript Integration
 * 
 * Refactored version of the original test runner that uses proper TypeScript interfaces
 * and the enhanced TestReportAggregator for sophisticated test result processing.
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TestReportAggregator } from './TestReportAggregator';
import {
  TestCategory,
  AggregatedTestData,
  JestAggregatedResult,
  TestReportAggregatorConfig
} from './types';

export interface TestRunnerConfig {
  failFast: boolean;
  verbose: boolean;
  suite?: TestCategory;
  outputDirectory: string;
  generateReports: boolean;
  aggregatorConfig?: Partial<TestReportAggregatorConfig>;
}

export interface TestSuiteConfig {
  name: TestCategory;
  command: string;
  description: string;
  required: boolean;
}

export class EnhancedTestRunner {
  private config: TestRunnerConfig;
  private aggregator: TestReportAggregator;
  private startTime: number;
  private results: Map<TestCategory, any> = new Map();

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = {
      failFast: false,
      verbose: false,
      outputDirectory: 'test-results',
      generateReports: true,
      ...config
    };

    this.aggregator = new TestReportAggregator(this.config.aggregatorConfig);
    this.startTime = Date.now();
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    try {
      this.log('🚀 Starting Enhanced Comprehensive Test Suite', 'info');
      
      await this.setupEnvironment();
      
      const testSuites = this.getTestSuites();
      const suitesToRun = this.config.suite 
        ? testSuites.filter(suite => suite.name === this.config.suite)
        : testSuites;

      let overallSuccess = true;

      for (const suite of suitesToRun) {
        const success = await this.runTestSuite(suite);
        if (!success) {
          overallSuccess = false;
          if (this.config.failFast) {
            this.log('Stopping due to test failure (fail-fast mode)', 'error');
            break;
          }
        }
      }

      if (this.config.generateReports) {
        await this.generateComprehensiveReport();
      }

      this.printFinalSummary(overallSuccess);

      if (!overallSuccess) {
        process.exit(1);
      }

    } catch (error) {
      this.log(`Test suite execution failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Setup test environment with enhanced error handling
   */
  private async setupEnvironment(): Promise<void> {
    this.log('Setting up test environment...', 'info');
    
    try {
      // Ensure output directory exists
      const outputDir = path.join(process.cwd(), this.config.outputDirectory);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Clean test database
      const testDbPath = path.join(process.cwd(), 'prisma/test.db');
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        this.log('Cleaned existing test database', 'info');
      }

      // Run database migrations
      const isWindows = process.platform === 'win32';
      const npxCommand = isWindows ? 'npx.cmd' : 'npx';
      
      execSync(`${npxCommand} prisma migrate deploy`, {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: 'file:./test.db' },
        stdio: 'pipe'
      });
      
      this.log('Database migrations completed', 'success');

      // Generate Prisma client
      execSync(`${npxCommand} prisma generate`, {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      this.log('Prisma client generated', 'success');

    } catch (error) {
      this.log(`Environment setup failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      throw error;
    }
  }

  /**
   * Get configured test suites
   */
  private getTestSuites(): TestSuiteConfig[] {
    return [
      {
        name: TestCategory.UNIT,
        command: 'test:unit',
        description: 'Unit Tests',
        required: true
      },
      {
        name: TestCategory.INTEGRATION,
        command: 'test:integration',
        description: 'Integration Tests',
        required: true
      },
      {
        name: TestCategory.E2E,
        command: 'test:e2e',
        description: 'End-to-End Tests',
        required: true
      },
      {
        name: TestCategory.PERFORMANCE,
        command: 'test:performance',
        description: 'Performance Tests',
        required: false
      }
    ];
  }

  /**
   * Run a single test suite with enhanced result capture
   */
  private async runTestSuite(suite: TestSuiteConfig): Promise<boolean> {
    this.log(`Starting ${suite.description}...`, 'info');
    const startTime = Date.now();

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const npmCommand = isWindows ? 'npm.cmd' : 'npm';
      
      // Add Jest JSON reporter to capture structured results
      const jestArgs = [
        'run', 
        suite.command,
        '--',
        '--json',
        '--outputFile',
        path.join(this.config.outputDirectory, `${suite.name}-results.json`)
      ];

      const testProcess = spawn(npmCommand, jestArgs, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DATABASE_URL: 'file:./test.db',
          JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long'
        },
        stdio: 'pipe',
        shell: isWindows
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        if (this.config.verbose) {
          process.stdout.write(output);
        }
      });

      testProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (this.config.verbose) {
          process.stderr.write(output);
        }
      });

      testProcess.on('close', async (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;

        // Store raw results
        this.results.set(suite.name, {
          passed,
          duration,
          stdout,
          stderr,
          exitCode: code
        });

        if (passed) {
          this.log(`${suite.description} completed successfully (${Math.round(duration / 1000)}s)`, 'success');
        } else {
          this.log(`${suite.description} failed (${Math.round(duration / 1000)}s)`, 'error');
          if (stderr && this.config.verbose) {
            console.log('Error output:', stderr);
          }
        }

        resolve(passed);
      });

      testProcess.on('error', (error) => {
        this.log(`${suite.description} process error: ${error.message}`, 'error');
        resolve(false);
      });
    });
  }

  /**
   * Generate comprehensive report using the enhanced aggregator
   */
  private async generateComprehensiveReport(): Promise<void> {
    this.log('Generating comprehensive test report...', 'info');

    try {
      // Collect Jest results from JSON output files
      const jestResults = await this.collectJestResults();
      
      if (jestResults) {
        // Use the enhanced aggregator to process results
        const aggregatedData = await this.aggregator.aggregateResults(jestResults);
        
        // Save the comprehensive report
        await this.saveReport(aggregatedData);
        
        this.log('Comprehensive report generated successfully', 'success');
      } else {
        this.log('No Jest results found, generating basic report', 'warning');
        await this.generateBasicReport();
      }

    } catch (error) {
      this.log(`Report generation failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      // Don't fail the entire process if report generation fails
    }
  }

  /**
   * Collect Jest results from JSON output files
   */
  private async collectJestResults(): Promise<JestAggregatedResult | null> {
    const testSuites = this.getTestSuites();
    const allTestResults: any[] = [];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let pendingTests = 0;
    let todoTests = 0;

    for (const suite of testSuites) {
      const resultFile = path.join(this.config.outputDirectory, `${suite.name}-results.json`);
      
      if (fs.existsSync(resultFile)) {
        try {
          const resultData = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
          
          if (resultData.testResults) {
            allTestResults.push(...resultData.testResults);
            
            totalTests += resultData.numTotalTests || 0;
            passedTests += resultData.numPassedTests || 0;
            failedTests += resultData.numFailedTests || 0;
            pendingTests += resultData.numPendingTests || 0;
            todoTests += resultData.numTodoTests || 0;
          }
        } catch (error) {
          this.log(`Failed to parse Jest results for ${suite.name}: ${error}`, 'warning');
        }
      }
    }

    if (allTestResults.length === 0) {
      return null;
    }

    // Construct aggregated Jest result
    return {
      numTotalTestSuites: testSuites.length,
      numPassedTestSuites: Array.from(this.results.values()).filter(r => r.passed).length,
      numFailedTestSuites: Array.from(this.results.values()).filter(r => !r.passed).length,
      numPendingTestSuites: 0,
      numTotalTests: totalTests,
      numPassedTests: passedTests,
      numFailedTests: failedTests,
      numPendingTests: pendingTests,
      numTodoTests: todoTests,
      startTime: this.startTime,
      success: failedTests === 0,
      testResults: allTestResults,
      coverageMap: null, // Would need to be collected separately
      wasInterrupted: false
    };
  }

  /**
   * Save the aggregated report to files
   */
  private async saveReport(data: AggregatedTestData): Promise<void> {
    const reportPath = path.join(this.config.outputDirectory, 'comprehensive-test-report.json');
    const summaryPath = path.join(this.config.outputDirectory, 'test-summary.json');

    // Save full report
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));

    // Save summary report
    const summary = {
      timestamp: data.timestamp,
      buildMetadata: data.buildMetadata,
      summary: data.summary,
      categoryBreakdown: data.metrics.categoryBreakdown,
      overallResult: data.summary.failedTests === 0 ? 'PASSED' : 'FAILED'
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    this.log(`Reports saved to ${this.config.outputDirectory}`, 'info');
  }

  /**
   * Generate basic report when Jest JSON results are not available
   */
  private async generateBasicReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const results = Array.from(this.results.entries());
    const allPassed = results.every(([_, result]) => result.passed);

    const basicReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      overallResult: allPassed ? 'PASSED' : 'FAILED',
      testSuites: Object.fromEntries(this.results),
      summary: {
        totalSuites: results.length,
        passedSuites: results.filter(([_, r]) => r.passed).length,
        failedSuites: results.filter(([_, r]) => !r.passed).length,
        totalDuration
      }
    };

    const reportPath = path.join(this.config.outputDirectory, 'basic-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(basicReport, null, 2));
  }

  /**
   * Print final summary with enhanced formatting
   */
  private printFinalSummary(overallSuccess: boolean): void {
    const totalDuration = Date.now() - this.startTime;
    const results = Array.from(this.results.entries());

    console.log('\n' + '='.repeat(70));
    console.log('📊 ENHANCED COMPREHENSIVE TEST SUITE SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`🕐 Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`📈 Overall Result: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`🧪 Test Suites: ${results.filter(([_, r]) => r.passed).length}/${results.length} passed`);
    
    console.log('\n📋 Test Suite Details:');
    results.forEach(([suite, result]) => {
      const status = result.passed ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      console.log(`  ${status} ${suite}: ${duration}s`);
    });

    if (this.config.generateReports) {
      console.log(`\n📄 Reports generated in: ${this.config.outputDirectory}/`);
    }

    console.log('\n' + '='.repeat(70));
    
    if (overallSuccess) {
      console.log('✅ All tests passed successfully!');
    } else {
      console.log('❌ Some tests failed. Check the detailed output and reports.');
    }
  }

  /**
   * Enhanced logging with timestamps and categories
   */
  private log(message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

/**
 * CLI interface for the enhanced test runner
 */
export function createEnhancedTestRunner(args: string[] = []): EnhancedTestRunner {
  const config: Partial<TestRunnerConfig> = {};

  // Parse command line arguments
  args.forEach(arg => {
    if (arg === '--fail-fast') {
      config.failFast = true;
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg.startsWith('--suite=')) {
      const suite = arg.split('=')[1] as TestCategory;
      if (Object.values(TestCategory).includes(suite)) {
        config.suite = suite;
      }
    } else if (arg.startsWith('--output=')) {
      const outputDir = arg.split('=')[1];
      if (outputDir) {
        config.outputDirectory = outputDir;
      }
    } else if (arg === '--no-reports') {
      config.generateReports = false;
    }
  });

  return new EnhancedTestRunner(config);
}