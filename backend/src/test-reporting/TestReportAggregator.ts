/**
 * Enhanced Test Report Aggregator Service
 * 
 * Provides sophisticated test result parsing, categorization, and metrics calculation
 * from Jest AggregatedResult format with comprehensive build metadata collection.
 */

import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  TestStatus,
  TestCategory,
  TestCaseData,
  TestSuiteData,
  TestSummary,
  TestMetrics,
  AggregatedTestData,
  CoverageData,
  CoverageMetrics,
  PerformanceMetrics,
  BuildMetadata,
  JestAggregatedResult,
  JestTestResult,
  TestReportAggregatorConfig
} from './types';

export class TestReportAggregator {
  private config: TestReportAggregatorConfig;

  constructor(config: Partial<TestReportAggregatorConfig> = {}) {
    this.config = {
      includeSlowTests: true,
      slowTestThreshold: 1000, // 1 second
      includeStackTraces: true,
      maxStackTraceLength: 2000,
      categorizeByPath: true,
      pathCategoryMappings: {
        'unit': TestCategory.UNIT,
        'integration': TestCategory.INTEGRATION,
        'e2e': TestCategory.E2E,
        'performance': TestCategory.PERFORMANCE,
        '__tests__/unit': TestCategory.UNIT,
        '__tests__/integration': TestCategory.INTEGRATION,
        '__tests__/e2e': TestCategory.E2E,
        '__tests__/performance': TestCategory.PERFORMANCE,
        'test/unit': TestCategory.UNIT,
        'test/integration': TestCategory.INTEGRATION,
        'test/e2e': TestCategory.E2E,
        'test/performance': TestCategory.PERFORMANCE
      },
      performanceThresholds: {
        responseTime: 500, // ms
        throughput: 100, // req/sec
        memoryUsage: 100 // MB
      },
      ...config
    };
  }

  /**
   * Main aggregation method that processes Jest results into structured data
   */
  async aggregateResults(testResults: JestAggregatedResult): Promise<AggregatedTestData> {
    const buildMetadata = await this.collectBuildMetadata();
    const suiteResults = await this.processTestSuites(testResults.testResults);
    const coverageData = this.processCoverageData(testResults);
    const performanceMetrics = this.extractPerformanceMetrics(testResults);
    const summary = this.calculateTestSummary(suiteResults);
    const metrics = await this.calculateMetrics(suiteResults, coverageData, performanceMetrics);

    return {
      summary,
      suiteResults,
      coverageData,
      performanceMetrics,
      timestamp: new Date(),
      buildMetadata,
      metrics,
      rawJestResults: testResults
    };
  }

  /**
   * Process individual test suites with enhanced categorization
   */
  async processTestSuites(testSuites: JestTestResult[]): Promise<TestSuiteData[]> {
    return testSuites.map(suite => this.processTestSuite(suite));
  }

  /**
   * Process a single test suite
   */
  private processTestSuite(suite: JestTestResult): TestSuiteData {
    const category = this.categorizeTestSuite(suite.testFilePath);
    const tests = suite.testResults.map(test => this.processTestCase(test, category));
    
    const numPassingTests = tests.filter(t => t.status === TestStatus.PASSED).length;
    const numFailingTests = tests.filter(t => t.status === TestStatus.FAILED).length;
    const numPendingTests = tests.filter(t => t.status === TestStatus.SKIPPED).length;
    const numTodoTests = tests.filter(t => t.status === TestStatus.TODO).length;

    const suiteStatus = this.determineSuiteStatus(numFailingTests, numPassingTests, numPendingTests);

    return {
      name: path.basename(suite.testFilePath, path.extname(suite.testFilePath)),
      filePath: suite.testFilePath,
      status: suiteStatus,
      duration: suite.perfStats.end - suite.perfStats.start,
      tests,
      category,
      numPassingTests,
      numFailingTests,
      numPendingTests,
      numTodoTests,
      startTime: new Date(suite.perfStats.start),
      endTime: new Date(suite.perfStats.end)
    };
  }

  /**
   * Process individual test case with enhanced error handling
   */
  private processTestCase(test: any, category: TestCategory): TestCaseData {
    const status = this.mapJestStatusToTestStatus(test.status);
    const errorMessage = test.failureMessages?.length > 0 ? test.failureMessages[0] : undefined;
    const stackTrace = this.extractStackTrace(test.failureMessages);

    return {
      name: test.title,
      status,
      duration: test.duration || 0,
      errorMessage: this.truncateErrorMessage(errorMessage),
      stackTrace: this.config.includeStackTraces ? this.truncateStackTrace(stackTrace) : undefined,
      category,
      fullName: test.fullName || test.title,
      ancestorTitles: test.ancestorTitles || []
    };
  }

  /**
   * Enhanced test suite categorization logic
   */
  private categorizeTestSuite(filePath: string): TestCategory {
    if (!this.config.categorizeByPath) {
      return TestCategory.UNIT; // Default category
    }

    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
    
    // Check explicit path mappings first
    for (const [pathPattern, category] of Object.entries(this.config.pathCategoryMappings)) {
      if (normalizedPath.includes(pathPattern.toLowerCase())) {
        return category;
      }
    }

    // Fallback to filename-based categorization
    if (normalizedPath.includes('performance') || normalizedPath.includes('perf')) {
      return TestCategory.PERFORMANCE;
    }
    if (normalizedPath.includes('e2e') || normalizedPath.includes('end-to-end')) {
      return TestCategory.E2E;
    }
    if (normalizedPath.includes('integration') || normalizedPath.includes('int')) {
      return TestCategory.INTEGRATION;
    }

    return TestCategory.UNIT; // Default fallback
  }

  /**
   * Calculate comprehensive test metrics
   */
  async calculateMetrics(
    suiteResults: TestSuiteData[],
    coverageData: CoverageData,
    performanceMetrics?: PerformanceMetrics
  ): Promise<TestMetrics> {
    const summary = this.calculateTestSummary(suiteResults);
    const categoryBreakdown = this.calculateCategoryBreakdown(suiteResults);
    const slowestTests = this.findSlowestTests(suiteResults);
    const failedTests = this.extractFailedTests(suiteResults);

    return {
      summary,
      categoryBreakdown,
      performanceMetrics,
      coverageMetrics: coverageData,
      slowestTests,
      failedTests
    };
  }

  /**
   * Calculate test summary statistics
   */
  private calculateTestSummary(suiteResults: TestSuiteData[]): TestSummary {
    const allTests = suiteResults.flatMap(suite => suite.tests);
    
    const totalTests = allTests.length;
    const passedTests = allTests.filter(t => t.status === TestStatus.PASSED).length;
    const failedTests = allTests.filter(t => t.status === TestStatus.FAILED).length;
    const skippedTests = allTests.filter(t => t.status === TestStatus.SKIPPED).length;
    const todoTests = allTests.filter(t => t.status === TestStatus.TODO).length;
    
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const executionTime = suiteResults.reduce((sum, suite) => sum + suite.duration, 0);
    
    const testSuites = suiteResults.length;
    const passedSuites = suiteResults.filter(s => s.status === TestStatus.PASSED).length;
    const failedSuites = suiteResults.filter(s => s.status === TestStatus.FAILED).length;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      todoTests,
      passRate,
      executionTime,
      testSuites,
      passedSuites,
      failedSuites
    };
  }

  /**
   * Calculate breakdown by test category
   */
  private calculateCategoryBreakdown(suiteResults: TestSuiteData[]): Record<TestCategory, TestSummary> {
    const breakdown: Record<TestCategory, TestSummary> = {} as any;

    for (const category of Object.values(TestCategory)) {
      const categoryTests = suiteResults
        .filter(suite => suite.category === category)
        .flatMap(suite => suite.tests);
      
      const categorySuites = suiteResults.filter(suite => suite.category === category);

      if (categoryTests.length > 0) {
        breakdown[category] = {
          totalTests: categoryTests.length,
          passedTests: categoryTests.filter(t => t.status === TestStatus.PASSED).length,
          failedTests: categoryTests.filter(t => t.status === TestStatus.FAILED).length,
          skippedTests: categoryTests.filter(t => t.status === TestStatus.SKIPPED).length,
          todoTests: categoryTests.filter(t => t.status === TestStatus.TODO).length,
          passRate: (categoryTests.filter(t => t.status === TestStatus.PASSED).length / categoryTests.length) * 100,
          executionTime: categorySuites.reduce((sum, suite) => sum + suite.duration, 0),
          testSuites: categorySuites.length,
          passedSuites: categorySuites.filter(s => s.status === TestStatus.PASSED).length,
          failedSuites: categorySuites.filter(s => s.status === TestStatus.FAILED).length
        };
      }
    }

    return breakdown;
  }

  /**
   * Enhanced build metadata collection
   */
  async collectBuildMetadata(): Promise<BuildMetadata> {
    const gitInfo = await this.collectGitInfo();
    const ciInfo = this.collectCIInfo();

    return {
      timestamp: new Date(),
      buildVersion: process.env['BUILD_VERSION'] || this.extractVersionFromPackageJson(),
      environment: process.env['NODE_ENV'] || 'development',
      gitInfo,
      nodeVersion: process.version,
      platform: os.platform(),
      architecture: os.arch(),
      ciInfo
    };
  }

  /**
   * Collect Git information
   */
  private async collectGitInfo(): Promise<BuildMetadata['gitInfo']> {
    try {
      const branch = this.execGitCommand('git rev-parse --abbrev-ref HEAD').trim();
      const commit = this.execGitCommand('git rev-parse HEAD').trim();
      const commitMessage = this.execGitCommand('git log -1 --pretty=%B').trim();
      const author = this.execGitCommand('git log -1 --pretty=%an').trim();
      
      // Check if working directory is dirty
      const status = this.execGitCommand('git status --porcelain').trim();
      const isDirty = status.length > 0;

      return {
        branch,
        commit: commit.substring(0, 8), // Short commit hash
        commitMessage: commitMessage.substring(0, 100), // Truncate long messages
        author,
        isDirty
      };
    } catch (error) {
      return {
        branch: 'unknown',
        commit: 'unknown',
        commitMessage: 'unknown',
        author: 'unknown',
        isDirty: false
      };
    }
  }

  /**
   * Collect CI/CD information
   */
  private collectCIInfo(): BuildMetadata['ciInfo'] {
    const isCI = !!(
      process.env['CI'] ||
      process.env['CONTINUOUS_INTEGRATION'] ||
      process.env['BUILD_NUMBER'] ||
      process.env['GITHUB_ACTIONS'] ||
      process.env['GITLAB_CI'] ||
      process.env['JENKINS_URL']
    );

    if (!isCI) {
      return { isCI: false };
    }

    let provider = 'unknown';
    let buildNumber: string | undefined;
    let jobId: string | undefined;

    if (process.env['GITHUB_ACTIONS']) {
      provider = 'GitHub Actions';
      buildNumber = process.env['GITHUB_RUN_NUMBER'];
      jobId = process.env['GITHUB_RUN_ID'];
    } else if (process.env['GITLAB_CI']) {
      provider = 'GitLab CI';
      buildNumber = process.env['CI_PIPELINE_ID'];
      jobId = process.env['CI_JOB_ID'];
    } else if (process.env['JENKINS_URL']) {
      provider = 'Jenkins';
      buildNumber = process.env['BUILD_NUMBER'];
      jobId = process.env['BUILD_ID'];
    }

    return {
      isCI,
      provider,
      buildNumber,
      jobId
    };
  }

  /**
   * Process coverage data from Jest results
   */
  private processCoverageData(testResults: JestAggregatedResult): CoverageData {
    // Initialize with default values
    const defaultCoverage: CoverageData = {
      overall: {
        lines: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        statements: { total: 0, covered: 0, percentage: 0 }
      },
      byFile: {},
      byCategory: {} as Record<TestCategory, CoverageMetrics>,
      threshold: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    };

    // If no coverage map available, return defaults
    if (!testResults.coverageMap) {
      return defaultCoverage;
    }

    try {
      // Process coverage map (this would need actual Jest coverage map processing)
      // For now, we'll extract from the summary if available
      
      // This is a simplified implementation - in a real scenario,
      // you'd process the actual Istanbul coverage map
      return defaultCoverage;
    } catch (error) {
      console.warn('Failed to process coverage data:', error);
      return defaultCoverage;
    }
  }

  /**
   * Extract performance metrics from test results
   */
  private extractPerformanceMetrics(testResults: JestAggregatedResult): PerformanceMetrics | undefined {
    // Look for performance test results in the output
    const performanceTests = testResults.testResults.filter(suite => 
      suite.testFilePath?.toLowerCase().includes('performance') ||
      suite.testFilePath?.toLowerCase().includes('perf')
    );

    if (performanceTests.length === 0) {
      return undefined;
    }

    // Extract metrics from console output or test results
    // This is a simplified implementation
    return {
      averageResponseTime: 0,
      throughput: 0,
      memoryUsage: 0
    };
  }

  /**
   * Find slowest tests for performance analysis
   */
  private findSlowestTests(suiteResults: TestSuiteData[]): TestCaseData[] {
    if (!this.config.includeSlowTests) {
      return [];
    }

    const allTests = suiteResults.flatMap(suite => suite.tests);
    
    return allTests
      .filter(test => test.duration >= this.config.slowTestThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest tests
  }

  /**
   * Extract failed tests with details
   */
  private extractFailedTests(suiteResults: TestSuiteData[]): TestCaseData[] {
    return suiteResults
      .flatMap(suite => suite.tests)
      .filter(test => test.status === TestStatus.FAILED);
  }

  // Helper methods

  private mapJestStatusToTestStatus(jestStatus: string): TestStatus {
    switch (jestStatus) {
      case 'passed': return TestStatus.PASSED;
      case 'failed': return TestStatus.FAILED;
      case 'skipped':
      case 'pending': return TestStatus.SKIPPED;
      case 'todo': return TestStatus.TODO;
      default: return TestStatus.FAILED;
    }
  }

  private determineSuiteStatus(failed: number, passed: number, pending: number): TestStatus {
    if (failed > 0) return TestStatus.FAILED;
    if (passed > 0) return TestStatus.PASSED;
    if (pending > 0) return TestStatus.SKIPPED;
    return TestStatus.PASSED;
  }

  private extractStackTrace(failureMessages?: string[]): string | undefined {
    if (!failureMessages || failureMessages.length === 0) {
      return undefined;
    }

    // Extract stack trace from the first failure message
    const message = failureMessages[0];
    if (!message) return undefined;
    
    const stackMatch = message.match(/at .*/gm);
    
    return stackMatch ? stackMatch.join('\n') : undefined;
  }

  private truncateErrorMessage(message?: string): string | undefined {
    if (!message) return undefined;
    
    // Remove ANSI color codes and truncate
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
    return cleanMessage.length > 500 ? cleanMessage.substring(0, 500) + '...' : cleanMessage;
  }

  private truncateStackTrace(stackTrace?: string): string | undefined {
    if (!stackTrace) return undefined;
    
    return stackTrace.length > this.config.maxStackTraceLength 
      ? stackTrace.substring(0, this.config.maxStackTraceLength) + '...'
      : stackTrace;
  }

  private execGitCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      return '';
    }
  }

  private extractVersionFromPackageJson(): string {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      // Ignore errors
    }
    return '1.0.0';
  }
}