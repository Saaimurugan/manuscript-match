/**
 * TypeScript interfaces for enhanced test result aggregation
 */

export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  TODO = 'todo'
}

export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance'
}

export interface TestCaseData {
  name: string;
  status: TestStatus;
  duration: number;
  errorMessage?: string | undefined;
  stackTrace?: string | undefined;
  category: TestCategory;
  fullName: string;
  ancestorTitles: string[];
}

export interface CoverageDetail {
  total: number;
  covered: number;
  percentage: number;
  uncoveredLines?: number[];
}

export interface CoverageMetrics {
  lines: CoverageDetail;
  functions: CoverageDetail;
  branches: CoverageDetail;
  statements: CoverageDetail;
}

export interface FileCoverageData {
  path: string;
  lines: CoverageDetail;
  functions: CoverageDetail;
  branches: CoverageDetail;
  statements: CoverageDetail;
  uncoveredLines: number[];
}

export interface CoverageData {
  overall: CoverageMetrics;
  byFile: Record<string, FileCoverageData>;
  byCategory: Record<TestCategory, CoverageMetrics>;
  threshold: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

export interface PerformanceMetrics {
  averageResponseTime?: number;
  throughput?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
  errorRate?: number;
  concurrentUsers?: number;
}

export interface BuildMetadata {
  timestamp: Date;
  buildVersion?: string | undefined;
  environment: string;
  gitInfo: {
    branch?: string | undefined;
    commit?: string | undefined;
    commitMessage?: string | undefined;
    author?: string | undefined;
    isDirty?: boolean | undefined;
  };
  nodeVersion: string;
  platform: string;
  architecture: string;
  ciInfo?: {
    isCI: boolean;
    provider?: string | undefined;
    buildNumber?: string | undefined;
    jobId?: string | undefined;
  } | undefined;
}

export interface TestSuiteData {
  name: string;
  filePath: string;
  status: TestStatus;
  duration: number;
  tests: TestCaseData[];
  coverage?: FileCoverageData;
  category: TestCategory;
  numPassingTests: number;
  numFailingTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: Date;
  endTime: Date;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  todoTests: number;
  passRate: number;
  executionTime: number;
  testSuites: number;
  passedSuites: number;
  failedSuites: number;
}

export interface TestMetrics {
  summary: TestSummary;
  categoryBreakdown: Record<TestCategory, TestSummary>;
  performanceMetrics?: PerformanceMetrics | undefined;
  coverageMetrics: CoverageData;
  slowestTests: TestCaseData[];
  failedTests: TestCaseData[];
  flakyTests?: TestCaseData[] | undefined;
}

export interface AggregatedTestData {
  summary: TestSummary;
  suiteResults: TestSuiteData[];
  coverageData: CoverageData;
  performanceMetrics?: PerformanceMetrics | undefined;
  timestamp: Date;
  buildMetadata: BuildMetadata;
  metrics: TestMetrics;
  rawJestResults?: JestAggregatedResult | undefined;
}

// Jest-specific types for better integration
export interface JestTestResult {
  testFilePath: string;
  testResults: Array<{
    ancestorTitles: string[];
    fullName: string;
    title: string;
    status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo' | 'disabled';
    duration?: number;
    failureMessages: string[];
    numPassingAsserts: number;
  }>;
  perfStats: {
    start: number;
    end: number;
  };
  skipped: boolean;
  displayName?: { name: string; color: string };
  leaks: boolean;
  numFailingTests: number;
  numPassingTests: number;
  numPendingTests: number;
  numTodoTests: number;
  openHandles: any[];
  sourceMaps: any;
  testExecError?: any;
  coverage?: any;
  console?: any;
}

export interface JestAggregatedResult {
  testResults: JestTestResult[];
  coverageMap?: any;
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: number;
  success: boolean;
  wasInterrupted: boolean;
}

export interface TestReportAggregatorConfig {
  includeSlowTests: boolean;
  slowTestThreshold: number;
  includeStackTraces: boolean;
  maxStackTraceLength: number;
  categorizeByPath: boolean;
  pathCategoryMappings: Record<string, TestCategory>;
  performanceThresholds: {
    responseTime: number;
    throughput: number;
    memoryUsage: number;
  };
}