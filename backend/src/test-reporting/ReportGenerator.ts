/**
 * Report Generator Interface and Base Types
 * 
 * Defines the contract for generating test reports in various formats
 */

import { AggregatedTestData } from './types';

export enum ReportFormat {
  HTML = 'html',
  MARKDOWN = 'markdown',
  JSON = 'json'
}

export interface ReportConfig {
  outputDirectory: string;
  filename?: string;
  title?: string;
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
}

export interface HtmlReportConfig extends ReportConfig {
  includeInteractiveFeatures?: boolean;
  includeCharts?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  customCss?: string;
  customJs?: string;
  showStackTraces?: boolean;
  maxFailureDetails?: number;
}

export interface GeneratedReport {
  format: ReportFormat;
  filePath: string;
  size: number;
  generationTime: number;
  success: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReportGenerator {
  /**
   * Generate a report from aggregated test data
   */
  generateReport(data: AggregatedTestData, config: ReportConfig): Promise<GeneratedReport>;
  
  /**
   * Get the output path for the report
   */
  getOutputPath(config: ReportConfig): string;
  
  /**
   * Validate the configuration
   */
  validateConfig(config: ReportConfig): ValidationResult;
  
  /**
   * Get the supported format
   */
  getFormat(): ReportFormat;
}

export interface ReportGeneratorFactory {
  createHtmlGenerator(): HtmlReportGenerator;
  createMarkdownGenerator(): MarkdownReportGenerator;
  createJsonGenerator(): JsonReportGenerator;
}

// Forward declarations for specific generators
export interface HtmlReportGenerator extends ReportGenerator {
  generateInteractiveReport(data: AggregatedTestData, config: HtmlReportConfig): Promise<string>;
  createSummaryCards(data: AggregatedTestData): string;
  createTestResultsTables(data: AggregatedTestData): string;
  createPerformanceCharts(data: AggregatedTestData): string;
  createCoverageVisualizations(data: AggregatedTestData): string;
}

export interface MarkdownReportConfig extends ReportConfig {
  includeEmojis?: boolean;
  includeStackTraces?: boolean;
  maxFailureDetails?: number;
  includePerformanceMetrics?: boolean;
  includeCoverageDetails?: boolean;
  tableFormat?: 'github' | 'standard';
  sectionDepth?: number;
  showTimestamps?: boolean;
}

export interface MarkdownReportGenerator extends ReportGenerator {
  generateStructuredReport(data: AggregatedTestData, config: MarkdownReportConfig): Promise<string>;
  createSummarySection(data: AggregatedTestData, config: MarkdownReportConfig): string;
  createCoverageSection(data: AggregatedTestData, config: MarkdownReportConfig): string;
  createTestResultsSection(data: AggregatedTestData, config: MarkdownReportConfig): string;
  createFailureDetailsSection(data: AggregatedTestData, config: MarkdownReportConfig): string;
  formatStackTrace(stackTrace: string, maxLength?: number): string;
  getStatusEmoji(status: string): string;
}

export interface JsonReportGenerator extends ReportGenerator {
  // JSON-specific methods would go here
}