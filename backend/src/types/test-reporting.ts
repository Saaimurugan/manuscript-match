/**
 * TypeScript interfaces for enhanced test result aggregation
 * Provides comprehensive type definitions for Jest test results and reporting
 */

import type { AggregatedResult, TestResult, AssertionResult } from '@jest/test-result';

// Core test result interfaces
export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  todoTests: number;
  passRate: number;
  executionTime: number;
  startTime: Date;
  endTime: Date;
}

export interface TestSuiteData {
  name: string;
  filePath: string;
  status: TestStatus;
  duration: number;
  tests: TestCaseData[];
  coverage: FileCoverageData;
  category: TestCategory;
  errorMessage?: string | undefined;
  failureDetails?: FailureDetail[] | undefined;
}

export interface TestCaseData {
  name: string;
  fullName: string;
  status: TestStatus;
  duration: number;
  errorMessage?: string | undefined;
  stackTrace?: string | undefined;
  category: TestCategory;
  ancestorTitles: string[];
  location?: TestLocation | undefined;
}

export interface FailureDetail {
  message: string;
  stack?: string;
  matcherResult?: any;
  expected?: any;
  actual?: any;
}

export interface TestLocation {
  line: number;
  column: number;
}

// Coverage interfaces
export interface CoverageData {
  overall: CoverageMetrics;
  byFile: Record<string, FileCoverageData>;
  byCategory: Record<TestCategory, CoverageMetrics>;
  thresholds: CoverageThresholds;
}

export interface CoverageMetrics {
  lines: CoverageDetail;
  functions: CoverageDetail;
  branches: CoverageDetail;
  statements: CoverageDetail;
}

export interface CoverageDetail {
  total: number;
  covered: number;
  percentage: number;
  uncoveredLines?: number[];
}

export interface FileCoverageData {
  path: string;
  lines: CoverageDetail;
  functions: CoverageDetail;
  branches: CoverageDetail;
  statements: CoverageDetail;
  uncoveredLines: number[];
}

export interface CoverageThresholds {
  global: CoverageMetrics;
  perFile?: CoverageMetrics;
}

// Performance and metrics interfaces
export interface PerformanceMetrics {
  averageTestDuration: number;
  slowestTests: SlowTestInfo[];
  memoryUsage: MemoryMetrics;
  testExecutionTrends: TestTrend[];
  categoryPerformance: Record<TestCategory, CategoryPerformance>;
}

export interface SlowTestInfo {
  name: string;
  filePath: string;
  duration: number;
  category: TestCategory;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface TestTrend {
  timestamp: Date;
  duration: number;
  testCount: number;
  passRate: number;
}

export interface CategoryPerformance {
  averageDuration: number;
  totalTests: number;
  passRate: number;
  coverage: CoverageMetrics;
}

// Build and environment metadata
export interface BuildMetadata {
  timestamp: Date;
  version: string;
  environment: string;
  gitInfo: GitInfo;
  nodeVersion: string;
  platform: string;
  ci: boolean;
  buildId?: string;
  branch?: string;
  commit?: string;
}

export interface GitInfo {
  branch: string;
  commit: string;
  commitMessage: string;
  author: string;
  timestamp: Date;
  isDirty: boolean;
  tags: string[];
}

// Aggregated test data
export interface AggregatedTestData {
  summary: TestSummary;
  suiteResults: TestSuiteData[];
  coverageData: CoverageData;
  performanceMetrics: PerformanceMetrics;
  buildMetadata: BuildMetadata;
  errors: TestError[];
  warnings: TestWarning[];
}

export interface TestError {
  type: TestErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  source?: string;
}

export interface TestWarning {
  type: TestWarningType;
  message: string;
  details?: any;
  timestamp: Date;
  source?: string;
}

// Enums
export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  TODO = 'todo',
  PENDING = 'pending'
}

export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance',
  UNKNOWN = 'unknown'
}

export enum TestErrorType {
  PARSING_ERROR = 'PARSING_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  COVERAGE_ERROR = 'COVERAGE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SETUP_ERROR = 'SETUP_ERROR'
}

export enum TestWarningType {
  SLOW_TEST = 'SLOW_TEST',
  LOW_COVERAGE = 'LOW_COVERAGE',
  DEPRECATED_API = 'DEPRECATED_API',
  FLAKY_TEST = 'FLAKY_TEST'
}

// Configuration interfaces
export interface TestAggregationConfig {
  slowTestThreshold: number;
  coverageThresholds: CoverageThresholds;
  categorization: CategoryConfig;
  performance: PerformanceConfig;
  metadata: MetadataConfig;
}

export interface CategoryConfig {
  patterns: Record<TestCategory, string[]>;
  defaultCategory: TestCategory;
  customCategories?: Record<string, string[]>;
}

export interface PerformanceConfig {
  trackMemory: boolean;
  trackTrends: boolean;
  maxSlowTests: number;
  memoryThreshold: number;
}

export interface MetadataConfig {
  includeGitInfo: boolean;
  includeBuildInfo: boolean;
  includeEnvironmentInfo: boolean;
  customFields?: Record<string, any>;
}

// Jest integration types
export interface JestAggregatedResult extends AggregatedResult {
  // Additional properties we might need
}

export interface JestTestResult extends TestResult {
  // Additional properties we might need
}

export interface JestAssertionResult extends AssertionResult {
  // Additional properties we might need
}

// Utility types
export type TestResultProcessor = (result: JestAggregatedResult) => Promise<AggregatedTestData>;
export type CoverageProcessor = (coverageMap: any) => Promise<CoverageData>;
export type MetricsCalculator = (data: AggregatedTestData) => Promise<PerformanceMetrics>;