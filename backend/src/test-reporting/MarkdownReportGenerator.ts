/**
 * Enhanced Markdown Report Generator
 * 
 * Generates comprehensive test reports in markdown format with advanced formatting,
 * emoji indicators, structured tables, and configurable content inclusion.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ReportGenerator, 
  ReportFormat, 
  ReportConfig, 
  MarkdownReportConfig, 
  GeneratedReport, 
  ValidationResult 
} from './ReportGenerator';
import { 
  AggregatedTestData, 
  TestStatus, 
  TestCategory, 
  TestCaseData, 
  CoverageMetrics,
  TestSuiteData 
} from './types';
import { 
  TemplateCache, 
  StreamingProcessor 
} from './performance';

export class MarkdownReportGenerator implements ReportGenerator {
  private defaultConfig: Partial<MarkdownReportConfig> = {
    includeEmojis: true,
    includeStackTraces: true,
    maxFailureDetails: 10,
    includePerformanceMetrics: true,
    includeCoverageDetails: true,
    tableFormat: 'github',
    sectionDepth: 2,
    showTimestamps: true,
    includeTimestamp: true,
    includeMetadata: true
  };

  private templateCache!: TemplateCache;
  private streamingProcessor!: StreamingProcessor;

  constructor() {
    this.templateCache = new TemplateCache({
      maxSize: 2, // 2MB for Markdown templates
      maxEntries: 10,
      enableCompression: true
    });



    this.streamingProcessor = new StreamingProcessor({
      batchSize: 50, // Larger batches for Markdown processing
      maxMemoryUsage: 75, // Less memory needed for Markdown
      enableBackpressure: true
    });

    // Initialize performance components
    this.initializePerformanceComponents();
  }

  private initializePerformanceComponents(): void {
    // Ensure all performance components are properly initialized
    if (this.templateCache && this.streamingProcessor) {
      // Components are ready for use in future enhancements
    }
  }

  async generateReport(data: AggregatedTestData, config: ReportConfig): Promise<GeneratedReport> {
    const startTime = Date.now();
    const markdownConfig = { ...this.defaultConfig, ...config } as MarkdownReportConfig;
    
    try {
      // Validate configuration
      const validation = this.validateConfig(markdownConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Generate the markdown content
      const content = await this.generateStructuredReport(data, markdownConfig);
      
      // Ensure output directory exists
      const outputPath = this.getOutputPath(markdownConfig);
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Write the report to file
      await fs.writeFile(outputPath, content, 'utf8');
      
      const stats = await fs.stat(outputPath);
      const generationTime = Date.now() - startTime;

      return {
        format: ReportFormat.MARKDOWN,
        filePath: outputPath,
        size: stats.size,
        generationTime,
        success: true
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      return {
        format: ReportFormat.MARKDOWN,
        filePath: this.getOutputPath(markdownConfig),
        size: 0,
        generationTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateStructuredReport(data: AggregatedTestData, config: MarkdownReportConfig): Promise<string> {
    const sections: string[] = [];
    
    // Header
    sections.push(this.createHeader(data, config));
    
    // Summary section
    sections.push(this.createSummarySection(data, config));
    
    // Coverage section
    if (config.includeCoverageDetails) {
      sections.push(this.createCoverageSection(data, config));
    }
    
    // Performance metrics section
    if (config.includePerformanceMetrics && data.performanceMetrics) {
      sections.push(this.createPerformanceSection(data, config));
    }
    
    // Test results by category
    sections.push(this.createTestResultsSection(data, config));
    
    // Failure details
    if (config.includeStackTraces && data.metrics.failedTests.length > 0) {
      sections.push(this.createFailureDetailsSection(data, config));
    }
    
    // Build metadata
    if (config.includeMetadata) {
      sections.push(this.createMetadataSection(data, config));
    }

    return sections.join('\n\n');
  }

  createHeader(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const emoji = config.includeEmojis ? '📊 ' : '';
    const title = config.title || 'Test Report';
    const timestamp = config.showTimestamps ? 
      `\n\n**Generated:** ${data.timestamp.toISOString()}` : '';
    
    return `# ${emoji}${title}${timestamp}`;
  }

  createSummarySection(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const { summary } = data;
    const headerLevel = '#'.repeat(config.sectionDepth || 2);
    const emoji = config.includeEmojis ? '📈 ' : '';
    
    let section = `${headerLevel} ${emoji}Summary\n\n`;
    
    // Overall statistics table
    section += this.createSummaryTable(summary, config);
    
    // Status indicators
    if (config.includeEmojis) {
      section += '\n\n### Status Overview\n\n';
      section += `- **Overall Status:** ${this.getOverallStatusEmoji(summary)}\n`;
      section += `- **Pass Rate:** ${this.getPassRateEmoji(summary.passRate)} ${summary.passRate.toFixed(1)}%\n`;
      section += `- **Execution Time:** ⏱️ ${(summary.executionTime / 1000).toFixed(2)}s\n`;
    }
    
    return section;
  }

  createSummaryTable(summary: any, config: MarkdownReportConfig): string {
    const rows = [
      ['Metric', 'Value', 'Status'],
      ['---', '---', '---'],
      ['Total Tests', summary.totalTests.toString(), '-'],
      ['Passed', summary.passedTests.toString(), this.getStatusEmoji('passed', config)],
      ['Failed', summary.failedTests.toString(), summary.failedTests > 0 ? this.getStatusEmoji('failed', config) : this.getStatusEmoji('passed', config)],
      ['Skipped', summary.skippedTests.toString(), summary.skippedTests > 0 ? '⚠️' : '-'],
      ['Pass Rate', `${summary.passRate.toFixed(1)}%`, this.getPassRateEmoji(summary.passRate)],
      ['Test Suites', summary.testSuites.toString(), '-'],
      ['Execution Time', `${(summary.executionTime / 1000).toFixed(2)}s`, '-']
    ];
    
    return rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  }

  createCoverageSection(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const { coverageData } = data;
    const headerLevel = '#'.repeat(config.sectionDepth || 2);
    const emoji = config.includeEmojis ? '🎯 ' : '';
    
    let section = `${headerLevel} ${emoji}Coverage\n\n`;
    
    // Overall coverage table
    section += this.createCoverageTable(coverageData.overall, 'Overall Coverage', config);
    
    // Coverage by category
    if (Object.keys(coverageData.byCategory).length > 0) {
      section += '\n\n### Coverage by Category\n\n';
      
      for (const [category, metrics] of Object.entries(coverageData.byCategory)) {
        section += `#### ${category.toUpperCase()} Tests\n\n`;
        section += this.createCoverageTable(metrics, `${category} Coverage`, config);
        section += '\n\n';
      }
    }
    
    // Coverage threshold status
    section += this.createCoverageThresholdStatus(coverageData, config);
    
    return section;
  }

  createCoverageTable(metrics: CoverageMetrics, _title: string, config: MarkdownReportConfig): string {
    const rows = [
      ['Type', 'Coverage', 'Covered/Total', 'Status'],
      ['---', '---', '---', '---'],
      ['Lines', `${metrics.lines.percentage.toFixed(1)}%`, `${metrics.lines.covered}/${metrics.lines.total}`, this.getCoverageStatusEmoji(metrics.lines.percentage, config)],
      ['Functions', `${metrics.functions.percentage.toFixed(1)}%`, `${metrics.functions.covered}/${metrics.functions.total}`, this.getCoverageStatusEmoji(metrics.functions.percentage, config)],
      ['Branches', `${metrics.branches.percentage.toFixed(1)}%`, `${metrics.branches.covered}/${metrics.branches.total}`, this.getCoverageStatusEmoji(metrics.branches.percentage, config)],
      ['Statements', `${metrics.statements.percentage.toFixed(1)}%`, `${metrics.statements.covered}/${metrics.statements.total}`, this.getCoverageStatusEmoji(metrics.statements.percentage, config)]
    ];
    
    return rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  }

  createCoverageThresholdStatus(coverageData: any, config: MarkdownReportConfig): string {
    if (!coverageData.threshold) return '';
    
    let section = '\n### Coverage Thresholds\n\n';
    const { threshold, overall } = coverageData;
    
    const thresholds = [
      { name: 'Lines', actual: overall.lines.percentage, required: threshold.lines },
      { name: 'Functions', actual: overall.functions.percentage, required: threshold.functions },
      { name: 'Branches', actual: overall.branches.percentage, required: threshold.branches },
      { name: 'Statements', actual: overall.statements.percentage, required: threshold.statements }
    ];
    
    for (const item of thresholds) {
      const status = item.actual >= item.required ? 
        this.getStatusEmoji('passed', config) : 
        this.getStatusEmoji('failed', config);
      section += `- **${item.name}:** ${item.actual.toFixed(1)}% / ${item.required}% ${status}\n`;
    }
    
    return section;
  }

  createPerformanceSection(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const { performanceMetrics } = data;
    if (!performanceMetrics) return '';
    
    const headerLevel = '#'.repeat(config.sectionDepth || 2);
    const emoji = config.includeEmojis ? '⚡ ' : '';
    
    let section = `${headerLevel} ${emoji}Performance Metrics\n\n`;
    
    const metrics = [
      ['Metric', 'Value', 'Status'],
      ['---', '---', '---']
    ];
    
    if (performanceMetrics.averageResponseTime !== undefined) {
      metrics.push(['Average Response Time', `${performanceMetrics.averageResponseTime}ms`, this.getPerformanceStatusEmoji(performanceMetrics.averageResponseTime, 'responseTime', config)]);
    }
    
    if (performanceMetrics.p95ResponseTime !== undefined) {
      metrics.push(['95th Percentile', `${performanceMetrics.p95ResponseTime}ms`, this.getPerformanceStatusEmoji(performanceMetrics.p95ResponseTime, 'responseTime', config)]);
    }
    
    if (performanceMetrics.throughput !== undefined) {
      metrics.push(['Throughput', `${performanceMetrics.throughput} req/s`, this.getPerformanceStatusEmoji(performanceMetrics.throughput, 'throughput', config)]);
    }
    
    if (performanceMetrics.errorRate !== undefined) {
      metrics.push(['Error Rate', `${(performanceMetrics.errorRate * 100).toFixed(2)}%`, this.getPerformanceStatusEmoji(performanceMetrics.errorRate, 'errorRate', config)]);
    }
    
    section += metrics.map(row => `| ${row.join(' | ')} |`).join('\n');
    
    return section;
  }

  createTestResultsSection(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const headerLevel = '#'.repeat(config.sectionDepth || 2);
    const emoji = config.includeEmojis ? '🧪 ' : '';
    
    let section = `${headerLevel} ${emoji}Test Results by Category\n\n`;
    
    // Group tests by category
    const testsByCategory = this.groupTestsByCategory(data.suiteResults);
    
    for (const [category, suites] of Object.entries(testsByCategory)) {
      section += `### ${category.toUpperCase()} Tests\n\n`;
      
      const categoryStats = this.calculateCategoryStats(suites);
      section += this.createCategoryStatsTable(categoryStats, config);
      
      // Show failed tests for this category
      const failedTests = this.getFailedTestsForCategory(suites);
      if (failedTests.length > 0) {
        section += `\n\n#### Failed Tests\n\n`;
        for (const test of failedTests.slice(0, config.maxFailureDetails || 10)) {
          section += `- ${this.getStatusEmoji('failed', config)} **${test.name}**`;
          if (test.errorMessage) {
            section += `: ${test.errorMessage.split('\n')[0]}`;
          }
          section += '\n';
        }
      }
      
      section += '\n\n';
    }
    
    return section;
  }

  createCategoryStatsTable(stats: any, config: MarkdownReportConfig): string {
    const rows = [
      ['Metric', 'Value'],
      ['---', '---'],
      ['Total Tests', stats.total.toString()],
      ['Passed', `${stats.passed} ${this.getStatusEmoji('passed', config)}`],
      ['Failed', `${stats.failed} ${stats.failed > 0 ? this.getStatusEmoji('failed', config) : this.getStatusEmoji('passed', config)}`],
      ['Duration', `${(stats.duration / 1000).toFixed(2)}s`]
    ];
    
    return rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  }

  createFailureDetailsSection(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const { failedTests } = data.metrics;
    if (failedTests.length === 0) return '';
    
    const headerLevel = '#'.repeat(config.sectionDepth || 2);
    const emoji = config.includeEmojis ? '❌ ' : '';
    
    let section = `${headerLevel} ${emoji}Failure Details\n\n`;
    
    const maxFailures = config.maxFailureDetails || 10;
    const testsToShow = failedTests.slice(0, maxFailures);
    
    for (let i = 0; i < testsToShow.length; i++) {
      const test = testsToShow[i];
      if (!test) continue;
      
      section += `### ${i + 1}. ${test.name}\n\n`;
      section += `**File:** \`${test.fullName}\`\n`;
      section += `**Category:** ${test.category.toUpperCase()}\n`;
      section += `**Duration:** ${test.duration}ms\n\n`;
      
      if (test.errorMessage) {
        section += `**Error Message:**\n\`\`\`\n${test.errorMessage}\n\`\`\`\n\n`;
      }
      
      if (config.includeStackTraces && test.stackTrace) {
        section += `**Stack Trace:**\n\`\`\`\n${this.formatStackTrace(test.stackTrace, 1000)}\n\`\`\`\n\n`;
      }
    }
    
    if (failedTests.length > maxFailures) {
      section += `*... and ${failedTests.length - maxFailures} more failures*\n\n`;
    }
    
    return section;
  }

  createMetadataSection(data: AggregatedTestData, config: MarkdownReportConfig): string {
    const { buildMetadata } = data;
    const headerLevel = '#'.repeat(config.sectionDepth || 2);
    const emoji = config.includeEmojis ? '📋 ' : '';
    
    let section = `${headerLevel} ${emoji}Build Information\n\n`;
    
    const metadata = [
      ['Property', 'Value'],
      ['---', '---'],
      ['Timestamp', buildMetadata.timestamp.toISOString()],
      ['Environment', buildMetadata.environment],
      ['Node Version', buildMetadata.nodeVersion],
      ['Platform', `${buildMetadata.platform} (${buildMetadata.architecture})`]
    ];
    
    if (buildMetadata.buildVersion) {
      metadata.push(['Build Version', buildMetadata.buildVersion]);
    }
    
    if (buildMetadata.gitInfo.branch) {
      metadata.push(['Git Branch', buildMetadata.gitInfo.branch]);
    }
    
    if (buildMetadata.gitInfo.commit) {
      metadata.push(['Git Commit', buildMetadata.gitInfo.commit.substring(0, 8)]);
    }
    
    if (buildMetadata.ciInfo?.isCI) {
      metadata.push(['CI Environment', buildMetadata.ciInfo.provider || 'Unknown']);
      if (buildMetadata.ciInfo.buildNumber) {
        metadata.push(['Build Number', buildMetadata.ciInfo.buildNumber]);
      }
    }
    
    section += metadata.map(row => `| ${row.join(' | ')} |`).join('\n');
    
    return section;
  }

  formatStackTrace(stackTrace: string, maxLength?: number): string {
    let formatted = stackTrace;
    
    if (maxLength && formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength) + '... (truncated)';
    }
    
    return formatted;
  }

  getStatusEmoji(status: string, config?: MarkdownReportConfig): string {
    if (!config?.includeEmojis) return '';
    
    switch (status.toLowerCase()) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⚠️';
      case 'todo': return '📝';
      default: return '❓';
    }
  }

  private getOverallStatusEmoji(summary: any): string {
    if (summary.failedTests === 0) return '✅ PASSED';
    if (summary.passRate >= 90) return '⚠️ MOSTLY PASSED';
    return '❌ FAILED';
  }

  private getPassRateEmoji(passRate: number): string {
    if (passRate >= 95) return '🟢';
    if (passRate >= 80) return '🟡';
    return '🔴';
  }

  private getCoverageStatusEmoji(percentage: number, config: MarkdownReportConfig): string {
    if (!config.includeEmojis) return '';
    
    if (percentage >= 90) return '🟢';
    if (percentage >= 70) return '🟡';
    return '🔴';
  }

  private getPerformanceStatusEmoji(value: number, metric: string, config: MarkdownReportConfig): string {
    if (!config.includeEmojis) return '';
    
    switch (metric) {
      case 'responseTime':
        if (value <= 100) return '🟢';
        if (value <= 500) return '🟡';
        return '🔴';
      case 'throughput':
        if (value >= 1000) return '🟢';
        if (value >= 100) return '🟡';
        return '🔴';
      case 'errorRate':
        if (value <= 0.01) return '🟢';
        if (value <= 0.05) return '🟡';
        return '🔴';
      default:
        return '📊';
    }
  }

  private groupTestsByCategory(suites: TestSuiteData[]): Record<string, TestSuiteData[]> {
    const grouped: Record<string, TestSuiteData[]> = {};
    
    for (const suite of suites) {
      const category = suite.category || TestCategory.UNIT;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(suite);
    }
    
    return grouped;
  }

  private calculateCategoryStats(suites: TestSuiteData[]): any {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let duration = 0;
    
    for (const suite of suites) {
      total += suite.tests.length;
      passed += suite.numPassingTests;
      failed += suite.numFailingTests;
      duration += suite.duration;
    }
    
    return { total, passed, failed, duration };
  }

  private getFailedTestsForCategory(suites: TestSuiteData[]): TestCaseData[] {
    const failedTests: TestCaseData[] = [];
    
    for (const suite of suites) {
      for (const test of suite.tests) {
        if (test.status === TestStatus.FAILED) {
          failedTests.push(test);
        }
      }
    }
    
    return failedTests;
  }

  getOutputPath(config: ReportConfig): string {
    const filename = config.filename || 'test-report.md';
    return path.join(config.outputDirectory, filename);
  }

  validateConfig(config: ReportConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.outputDirectory) {
      errors.push('Output directory is required');
    }
    
    const markdownConfig = config as MarkdownReportConfig;
    
    if (markdownConfig.maxFailureDetails !== undefined && markdownConfig.maxFailureDetails < 0) {
      errors.push('maxFailureDetails must be non-negative');
    }
    
    if (markdownConfig.sectionDepth !== undefined && (markdownConfig.sectionDepth < 1 || markdownConfig.sectionDepth > 6)) {
      errors.push('sectionDepth must be between 1 and 6');
    }
    
    if (markdownConfig.tableFormat && !['github', 'standard'].includes(markdownConfig.tableFormat)) {
      warnings.push('Unknown table format, using default');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getFormat(): ReportFormat {
    return ReportFormat.MARKDOWN;
  }
}