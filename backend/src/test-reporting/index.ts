/**
 * Test Reporting Module Exports
 * 
 * Enhanced test result aggregation service with advanced features
 */

export * from './types';
export * from './TestReportAggregator';
export * from './EnhancedTestRunner';
export * from './ReportGenerator';
export * from './HtmlReportGenerator';
export * from './MarkdownReportGenerator';

// Re-export commonly used types for convenience
export type {
  TestStatus,
  TestCategory,
  TestCaseData,
  TestSuiteData,
  TestSummary,
  TestMetrics,
  AggregatedTestData,
  CoverageData,
  PerformanceMetrics,
  BuildMetadata,
  JestAggregatedResult,
  TestReportAggregatorConfig
} from './types';

export type {
  ReportFormat,
  ReportConfig,
  HtmlReportConfig,
  MarkdownReportConfig,
  GeneratedReport,
  ValidationResult,
  ReportGenerator,
  HtmlReportGenerator as IHtmlReportGenerator,
  MarkdownReportGenerator as IMarkdownReportGenerator,
  ReportGeneratorFactory
} from './ReportGenerator';

// Re-export main classes
export { TestReportAggregator } from './TestReportAggregator';
export { EnhancedTestRunner, createEnhancedTestRunner } from './EnhancedTestRunner';
export type { TestRunnerConfig } from './EnhancedTestRunner';
export { HtmlReportGenerator } from './HtmlReportGenerator';
export { MarkdownReportGenerator } from './MarkdownReportGenerator';