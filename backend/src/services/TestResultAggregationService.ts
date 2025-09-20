/**
 * Enhanced Test Result Aggregation Service
 * 
 * Provides sophisticated test result parsing, categorization, and metrics calculation
 * from Jest AggregatedResult format with comprehensive build metadata collection.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { AggregatedResult, TestResult, AssertionResult } from '@jest/test-result';
import {
  AggregatedTestData,
  TestSummary,
  TestSuiteData,
  TestCaseData,
  CoverageData,
  CoverageMetrics,
  CoverageDetail,
  FileCoverageData,
  PerformanceMetrics,
  SlowTestInfo,
  MemoryMetrics,
  CategoryPerformance,
  BuildMetadata,
  GitInfo,
  TestStatus,
  TestCategory,
  TestError,
  TestWarning,
  TestErrorType,
  TestWarningType,
  TestAggregationConfig,
  FailureDetail
} from '../types/test-reporting.js';

export class TestResultAggregationService {
  private config: TestAggregationConfig;
  private startTime: Date;

  constructor(config?: Partial<TestAggregationConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.startTime = new Date();
  }

  /**
   * Main aggregation method that processes Jest AggregatedResult
   */
  async aggregateResults(testResults: AggregatedResult): Promise<AggregatedTestData> {
    try {
      const endTime = new Date();
      const executionTime = endTime.getTime() - this.startTime.getTime();

      // Process test suites and extract data
      const suiteResults = await this.processTestSuites(testResults.testResults);
      
      // Calculate summary metrics
      const summary = this.calculateTestSummary(testResults, executionTime, endTime);
      
      // Process coverage data
      const coverageData = await this.processCoverageData(testResults.coverageMap);
      
      // Calculate performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(suiteResults);
      
      // Collect build metadata
      const buildMetadata = await this.collectBuildMetadata();
      
      // Collect errors and warnings
      const { errors, warnings } = this.collectErrorsAndWarnings(suiteResults);

      return {
        summary,
        suiteResults,
        coverageData,
        performanceMetrics,
        buildMetadata,
        errors,
        warnings
      };
    } catch (error) {
      throw new Error(`Failed to aggregate test results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process individual test suites with enhanced categorization
   */
  async processTestSuites(testResults: TestResult[]): Promise<TestSuiteData[]> {
    return Promise.all(
      testResults.map(async (testResult) => {
        const category = this.categorizeTestSuite(testResult.testFilePath);
        const tests = this.processTestCases(testResult.testResults, category);
        const coverage = this.extractFileCoverage(testResult);
        const failureDetails = this.extractFailureDetails(testResult);

        return {
          name: this.extractSuiteName(testResult.testFilePath),
          filePath: testResult.testFilePath,
          status: this.determineTestSuiteStatus(testResult),
          duration: testResult.perfStats.end - testResult.perfStats.start,
          tests,
          coverage,
          category,
          errorMessage: testResult.failureMessage ?? undefined,
          failureDetails: failureDetails.length > 0 ? failureDetails : undefined
        };
      })
    );
  }

  /**
   * Process individual test cases with detailed information
   */
  private processTestCases(testResults: AssertionResult[], category: TestCategory): TestCaseData[] {
    return testResults.map((testResult) => ({
      name: testResult.title,
      fullName: testResult.fullName,
      status: this.mapJestStatusToTestStatus(testResult.status),
      duration: testResult.duration || 0,
      errorMessage: testResult.failureMessages.length > 0 ? testResult.failureMessages[0] ?? undefined : undefined,
      stackTrace: this.extractStackTrace(testResult),
      category,
      ancestorTitles: testResult.ancestorTitles,
      location: testResult.location ? {
        line: testResult.location.line,
        column: testResult.location.column
      } : undefined
    }));
  }

  /**
   * Enhanced test suite categorization logic
   */
  private categorizeTestSuite(filePath: string): TestCategory {
    const normalizedPath = filePath.toLowerCase();
    
    // Check custom patterns first
    for (const [category, patterns] of Object.entries(this.config.categorization.patterns)) {
      if (patterns.some(pattern => normalizedPath.includes(pattern.toLowerCase()))) {
        return category as TestCategory;
      }
    }

    // Enhanced pattern matching
    if (normalizedPath.includes('/unit/') || normalizedPath.includes('\\unit\\') || 
        normalizedPath.includes('.unit.') || normalizedPath.endsWith('.test.ts') && 
        !normalizedPath.includes('integration') && !normalizedPath.includes('e2e')) {
      return TestCategory.UNIT;
    }

    if (normalizedPath.includes('/integration/') || normalizedPath.includes('\\integration\\') || 
        normalizedPath.includes('.integration.')) {
      return TestCategory.INTEGRATION;
    }

    if (normalizedPath.includes('/e2e/') || normalizedPath.includes('\\e2e\\') || 
        normalizedPath.includes('.e2e.') || normalizedPath.includes('end-to-end')) {
      return TestCategory.E2E;
    }

    if (normalizedPath.includes('/performance/') || normalizedPath.includes('\\performance\\') || 
        normalizedPath.includes('.performance.') || normalizedPath.includes('benchmark')) {
      return TestCategory.PERFORMANCE;
    }

    return this.config.categorization.defaultCategory;
  }

  /**
   * Calculate comprehensive test summary metrics
   */
  private calculateTestSummary(
    testResults: AggregatedResult, 
    executionTime: number, 
    endTime: Date
  ): TestSummary {
    const totalTests = testResults.numTotalTests;
    const passedTests = testResults.numPassedTests;
    const failedTests = testResults.numFailedTests;
    const skippedTests = testResults.numPendingTests;
    const todoTests = testResults.numTodoTests;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      todoTests,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      executionTime,
      startTime: this.startTime,
      endTime
    };
  }

  /**
   * Process coverage data with enhanced metrics
   */
  private async processCoverageData(coverageMap: any): Promise<CoverageData> {
    if (!coverageMap) {
      return this.createEmptyCoverageData();
    }

    const byFile: Record<string, FileCoverageData> = {};
    const byCategory: Record<TestCategory, CoverageMetrics> = {} as Record<TestCategory, CoverageMetrics>;
    
    let overallLines = { total: 0, covered: 0 };
    let overallFunctions = { total: 0, covered: 0 };
    let overallBranches = { total: 0, covered: 0 };
    let overallStatements = { total: 0, covered: 0 };

    // Process each file in coverage map
    for (const [filePath, fileCoverage] of Object.entries(coverageMap as Record<string, any>)) {
      const fileData = this.processFileCoverage(filePath, fileCoverage);
      byFile[filePath] = fileData;

      // Aggregate overall metrics
      overallLines.total += fileData.lines.total;
      overallLines.covered += fileData.lines.covered;
      overallFunctions.total += fileData.functions.total;
      overallFunctions.covered += fileData.functions.covered;
      overallBranches.total += fileData.branches.total;
      overallBranches.covered += fileData.branches.covered;
      overallStatements.total += fileData.statements.total;
      overallStatements.covered += fileData.statements.covered;

      // Categorize by test category
      const category = this.categorizeSourceFile(filePath);
      if (!byCategory[category]) {
        byCategory[category] = this.createEmptyCoverageMetrics();
      }
      this.aggregateCoverageMetrics(byCategory[category], fileData);
    }

    const overall: CoverageMetrics = {
      lines: this.createCoverageDetail(overallLines.total, overallLines.covered),
      functions: this.createCoverageDetail(overallFunctions.total, overallFunctions.covered),
      branches: this.createCoverageDetail(overallBranches.total, overallBranches.covered),
      statements: this.createCoverageDetail(overallStatements.total, overallStatements.covered)
    };

    return {
      overall,
      byFile,
      byCategory,
      thresholds: this.config.coverageThresholds
    };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private async calculatePerformanceMetrics(
    suiteResults: TestSuiteData[]
  ): Promise<PerformanceMetrics> {
    const allTests = suiteResults.flatMap(suite => 
      suite.tests.map(test => ({ ...test, suiteName: suite.name, filePath: suite.filePath }))
    );

    // Calculate average test duration
    const totalDuration = allTests.reduce((sum, test) => sum + test.duration, 0);
    const averageTestDuration = allTests.length > 0 ? totalDuration / allTests.length : 0;

    // Find slowest tests
    const slowestTests: SlowTestInfo[] = allTests
      .filter(test => test.duration > this.config.slowTestThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, this.config.performance.maxSlowTests)
      .map(test => ({
        name: test.name,
        filePath: test.filePath,
        duration: test.duration,
        category: test.category
      }));

    // Calculate memory usage
    const memoryUsage = this.captureMemoryMetrics();

    // Calculate category performance
    const categoryPerformance: Record<TestCategory, CategoryPerformance> = {} as Record<TestCategory, CategoryPerformance>;
    
    for (const category of Object.values(TestCategory)) {
      const categoryTests = allTests.filter(test => test.category === category);
      const categorySuites = suiteResults.filter(suite => suite.category === category);
      
      if (categoryTests.length > 0) {
        const categoryDuration = categoryTests.reduce((sum, test) => sum + test.duration, 0);
        const passedTests = categoryTests.filter(test => test.status === TestStatus.PASSED).length;
        
        categoryPerformance[category] = {
          averageDuration: categoryDuration / categoryTests.length,
          totalTests: categoryTests.length,
          passRate: (passedTests / categoryTests.length) * 100,
          coverage: this.calculateCategoryCoverage(categorySuites)
        };
      }
    }

    return {
      averageTestDuration,
      slowestTests,
      memoryUsage,
      testExecutionTrends: [], // Would be populated from historical data
      categoryPerformance
    };
  }

  /**
   * Collect comprehensive build metadata
   */
  private async collectBuildMetadata(): Promise<BuildMetadata> {
    const gitInfo = await this.collectGitInfo();
    const packageJson = this.readPackageJson();

    return {
      timestamp: new Date(),
      version: packageJson.version || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      gitInfo,
      nodeVersion: process.version,
      platform: process.platform,
      ci: this.isCI(),
      buildId: process.env['BUILD_ID'] || process.env['GITHUB_RUN_ID'] || undefined,
      branch: gitInfo.branch,
      commit: gitInfo.commit
    };
  }

  /**
   * Collect Git information
   */
  private async collectGitInfo(): Promise<GitInfo> {
    try {
      const branch = this.execGitCommand('rev-parse --abbrev-ref HEAD').trim();
      const commit = this.execGitCommand('rev-parse HEAD').trim();
      const commitMessage = this.execGitCommand('log -1 --pretty=%B').trim();
      const author = this.execGitCommand('log -1 --pretty=%an').trim();
      const commitTimestamp = this.execGitCommand('log -1 --pretty=%ct').trim();
      const isDirty = this.execGitCommand('status --porcelain').trim().length > 0;
      const tags = this.execGitCommand('tag --points-at HEAD').trim().split('\n').filter(Boolean);

      return {
        branch,
        commit,
        commitMessage,
        author,
        timestamp: new Date(parseInt(commitTimestamp) * 1000),
        isDirty,
        tags
      };
    } catch (error) {
      // Return default values if Git is not available
      return {
        branch: 'unknown',
        commit: 'unknown',
        commitMessage: 'unknown',
        author: 'unknown',
        timestamp: new Date(),
        isDirty: false,
        tags: []
      };
    }
  }

  /**
   * Collect errors and warnings from test results
   */
  private collectErrorsAndWarnings(
    suiteResults: TestSuiteData[]
  ): { errors: TestError[]; warnings: TestWarning[] } {
    const errors: TestError[] = [];
    const warnings: TestWarning[] = [];

    // Collect test execution errors
    suiteResults.forEach(suite => {
      if (suite.status === TestStatus.FAILED && suite.errorMessage) {
        errors.push({
          type: TestErrorType.EXECUTION_ERROR,
          message: suite.errorMessage,
          timestamp: new Date(),
          source: suite.filePath
        });
      }

      // Check for slow tests
      suite.tests.forEach(test => {
        if (test.duration > this.config.slowTestThreshold) {
          warnings.push({
            type: TestWarningType.SLOW_TEST,
            message: `Test "${test.name}" took ${test.duration}ms (threshold: ${this.config.slowTestThreshold}ms)`,
            details: { duration: test.duration, threshold: this.config.slowTestThreshold },
            timestamp: new Date(),
            source: suite.filePath
          });
        }
      });
    });

    return { errors, warnings };
  }

  // Helper methods

  private mergeWithDefaults(config?: Partial<TestAggregationConfig>): TestAggregationConfig {
    return {
      slowTestThreshold: 1000,
      coverageThresholds: {
        global: {
          lines: { total: 0, covered: 0, percentage: 80 },
          functions: { total: 0, covered: 0, percentage: 80 },
          branches: { total: 0, covered: 0, percentage: 80 },
          statements: { total: 0, covered: 0, percentage: 80 }
        }
      },
      categorization: {
        patterns: {
          [TestCategory.UNIT]: ['unit', '.test.ts', '.spec.ts'],
          [TestCategory.INTEGRATION]: ['integration'],
          [TestCategory.E2E]: ['e2e', 'end-to-end'],
          [TestCategory.PERFORMANCE]: ['performance', 'benchmark'],
          [TestCategory.UNKNOWN]: []
        },
        defaultCategory: TestCategory.UNKNOWN
      },
      performance: {
        trackMemory: true,
        trackTrends: true,
        maxSlowTests: 10,
        memoryThreshold: 100 * 1024 * 1024 // 100MB
      },
      metadata: {
        includeGitInfo: true,
        includeBuildInfo: true,
        includeEnvironmentInfo: true
      },
      ...config
    };
  }

  private extractSuiteName(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.(test|spec)\.(ts|js)$/, '') || 'Unknown';
  }

  private determineTestSuiteStatus(testResult: TestResult): TestStatus {
    if (testResult.numFailingTests > 0) return TestStatus.FAILED;
    if (testResult.numPassingTests > 0) return TestStatus.PASSED;
    if (testResult.numPendingTests > 0) return TestStatus.SKIPPED;
    return TestStatus.PENDING;
  }

  private mapJestStatusToTestStatus(jestStatus: string): TestStatus {
    switch (jestStatus) {
      case 'passed': return TestStatus.PASSED;
      case 'failed': return TestStatus.FAILED;
      case 'skipped': return TestStatus.SKIPPED;
      case 'pending': return TestStatus.PENDING;
      case 'todo': return TestStatus.TODO;
      default: return TestStatus.PENDING;
    }
  }

  private extractStackTrace(testResult: AssertionResult): string | undefined {
    return testResult.failureMessages.length > 0 ? testResult.failureMessages.join('\n') : undefined;
  }

  private extractFailureDetails(testResult: TestResult): FailureDetail[] {
    return testResult.testResults
      .filter(test => test.status === 'failed')
      .map(test => ({
        message: test.failureMessages.join('\n'),
        stack: test.failureMessages.join('\n')
      }));
  }

  private extractFileCoverage(testResult: TestResult): FileCoverageData {
    // This would extract coverage data for the specific file
    // For now, return empty coverage data
    return {
      path: testResult.testFilePath,
      lines: { total: 0, covered: 0, percentage: 0, uncoveredLines: [] },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 },
      uncoveredLines: []
    };
  }

  private processFileCoverage(filePath: string, fileCoverage: any): FileCoverageData {
    const lines = this.processCoverageMap(fileCoverage.getLineCoverage?.() || {});
    const functions = this.processCoverageMap(fileCoverage.getFunctionCoverage?.() || {});
    const branches = this.processCoverageMap(fileCoverage.getBranchCoverage?.() || {});
    const statements = this.processCoverageMap(fileCoverage.getStatementCoverage?.() || {});

    return {
      path: filePath,
      lines,
      functions,
      branches,
      statements,
      uncoveredLines: this.getUncoveredLines(fileCoverage.getLineCoverage?.() || {})
    };
  }

  private processCoverageMap(coverageMap: Record<string, number>): CoverageDetail {
    const entries = Object.entries(coverageMap);
    const total = entries.length;
    const covered = entries.filter(([, count]) => count > 0).length;
    
    return this.createCoverageDetail(total, covered);
  }

  private getUncoveredLines(lineCoverage: Record<string, number>): number[] {
    return Object.entries(lineCoverage)
      .filter(([, count]) => count === 0)
      .map(([line]) => parseInt(line));
  }

  private createCoverageDetail(total: number, covered: number): CoverageDetail {
    return {
      total,
      covered,
      percentage: total > 0 ? (covered / total) * 100 : 0,
      uncoveredLines: []
    };
  }

  private createEmptyCoverageData(): CoverageData {
    return {
      overall: this.createEmptyCoverageMetrics(),
      byFile: {},
      byCategory: {} as Record<TestCategory, CoverageMetrics>,
      thresholds: this.config.coverageThresholds
    };
  }

  private createEmptyCoverageMetrics(): CoverageMetrics {
    return {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 }
    };
  }

  private categorizeSourceFile(_filePath: string): TestCategory {
    // This would categorize source files based on their path
    // For now, return UNKNOWN
    return TestCategory.UNKNOWN;
  }

  private aggregateCoverageMetrics(target: CoverageMetrics, source: FileCoverageData): void {
    target.lines.total += source.lines.total;
    target.lines.covered += source.lines.covered;
    target.functions.total += source.functions.total;
    target.functions.covered += source.functions.covered;
    target.branches.total += source.branches.total;
    target.branches.covered += source.branches.covered;
    target.statements.total += source.statements.total;
    target.statements.covered += source.statements.covered;

    // Recalculate percentages
    target.lines.percentage = target.lines.total > 0 ? (target.lines.covered / target.lines.total) * 100 : 0;
    target.functions.percentage = target.functions.total > 0 ? (target.functions.covered / target.functions.total) * 100 : 0;
    target.branches.percentage = target.branches.total > 0 ? (target.branches.covered / target.branches.total) * 100 : 0;
    target.statements.percentage = target.statements.total > 0 ? (target.statements.covered / target.statements.total) * 100 : 0;
  }

  private calculateCategoryCoverage(_suites: TestSuiteData[]): CoverageMetrics {
    // This would calculate coverage for a specific category
    // For now, return empty metrics
    return this.createEmptyCoverageMetrics();
  }

  private captureMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
  }

  private readPackageJson(): any {
    try {
      const packagePath = join(process.cwd(), 'package.json');
      return JSON.parse(readFileSync(packagePath, 'utf8'));
    } catch {
      return { version: '1.0.0' };
    }
  }

  private isCI(): boolean {
    return !!(
      process.env['CI'] ||
      process.env['CONTINUOUS_INTEGRATION'] ||
      process.env['BUILD_NUMBER'] ||
      process.env['GITHUB_ACTIONS'] ||
      process.env['GITLAB_CI'] ||
      process.env['JENKINS_URL']
    );
  }

  private execGitCommand(command: string): string {
    try {
      return execSync(`git ${command}`, { encoding: 'utf8', stdio: 'pipe' });
    } catch {
      return '';
    }
  }
}