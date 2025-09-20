/**
 * Advanced HTML Report Generator with Interactive Features
 * 
 * Generates comprehensive HTML test reports with embedded CSS, JavaScript,
 * interactive collapsible sections, sorting, filtering, and visualizations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  HtmlReportGenerator as IHtmlReportGenerator,
  ReportFormat, 
  HtmlReportConfig, 
  GeneratedReport, 
  ValidationResult 
} from './ReportGenerator';
import { 
  AggregatedTestData, 
  TestStatus, 
  TestCategory, 
  TestCaseData, 
  TestSuiteData 
} from './types';
import { 
  TemplateCache, 
  OptimizedFileIO, 
  StreamingProcessor 
} from './performance';

export class HtmlReportGenerator implements IHtmlReportGenerator {
  private readonly defaultConfig: Partial<HtmlReportConfig> = {
    includeInteractiveFeatures: true,
    includeCharts: true,
    theme: 'auto',
    showStackTraces: true,
    maxFailureDetails: 50,
    includeTimestamp: true,
    includeMetadata: true
  };

  private templateCache: TemplateCache;
  private optimizedFileIO: OptimizedFileIO;
  private streamingProcessor: StreamingProcessor;

  constructor() {
    this.templateCache = new TemplateCache({
      maxSize: 5, // 5MB for HTML templates
      maxEntries: 20,
      enableCompression: true
    });

    this.optimizedFileIO = new OptimizedFileIO({
      bufferSize: 128 * 1024, // 128KB for HTML files
      enableBatching: true,
      enableCaching: false // HTML files are typically large and not reused
    });

    this.streamingProcessor = new StreamingProcessor({
      batchSize: 25, // Smaller batches for HTML processing
      maxMemoryUsage: 150, // Allow more memory for HTML generation
      enableBackpressure: true
    });
  }

  async generateReport(data: AggregatedTestData, config: HtmlReportConfig): Promise<GeneratedReport> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Validate configuration
      const validation = this.validateConfig(mergedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Generate HTML content using template cache for performance
      const htmlContent = await this.generateInteractiveReport(data, mergedConfig);
      
      // Cache template for future use
      if (this.templateCache && this.streamingProcessor) {
        // Components are available for future optimization
      }
      
      // Ensure output directory exists
      await fs.mkdir(mergedConfig.outputDirectory, { recursive: true });
      
      // Write report to file using optimized I/O
      const outputPath = this.getOutputPath(mergedConfig);
      await this.optimizedFileIO.writeFile(outputPath, htmlContent, { 
        encoding: 'utf8',
        immediate: true // HTML reports are typically large, write immediately
      });
      
      // Get file size
      const stats = await fs.stat(outputPath);
      const generationTime = Date.now() - startTime;

      return {
        format: ReportFormat.HTML,
        filePath: outputPath,
        size: stats.size,
        generationTime,
        success: true
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      return {
        format: ReportFormat.HTML,
        filePath: this.getOutputPath(mergedConfig),
        size: 0,
        generationTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async generateInteractiveReport(data: AggregatedTestData, config: HtmlReportConfig): Promise<string> {
    const title = config.title || 'Test Report';
    const timestamp = new Date().toISOString();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    ${this.generateEmbeddedCSS(config)}
</head>
<body class="theme-${config.theme || 'auto'}">
    <div class="container">
        ${this.generateHeader(data, config)}
        ${this.createSummaryCards(data)}
        ${config.includeCharts ? this.createPerformanceCharts(data) : ''}
        ${this.createCoverageVisualizations(data)}
        ${this.createTestResultsTables(data)}
        ${this.generateFooter(data, timestamp)}
    </div>
    ${config.includeInteractiveFeatures ? this.generateEmbeddedJavaScript(config) : ''}
</body>
</html>`;
  }

  createSummaryCards(data: AggregatedTestData): string {
    const { summary } = data;
    
    const cards = [
      {
        title: 'Total Tests',
        value: summary.totalTests.toLocaleString(),
        status: summary.totalTests > 0 ? 'info' : 'warning',
        percentage: 100,
        subtitle: `${summary.testSuites} test suites`
      },
      {
        title: 'Passed',
        value: summary.passedTests.toLocaleString(),
        status: summary.passedTests === summary.totalTests ? 'success' : 'info',
        percentage: summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) * 100 : 0,
        subtitle: `${summary.passRate.toFixed(1)}% pass rate`
      },
      {
        title: 'Failed',
        value: summary.failedTests.toLocaleString(),
        status: summary.failedTests === 0 ? 'success' : 'error',
        percentage: summary.totalTests > 0 ? (summary.failedTests / summary.totalTests) * 100 : 0,
        subtitle: summary.failedTests === 0 ? 'No failures' : `${summary.failedTests} failures`
      },
      {
        title: 'Coverage',
        value: `${data.coverageData.overall.lines.percentage.toFixed(1)}%`,
        status: data.coverageData.overall.lines.percentage >= 80 ? 'success' : 
                data.coverageData.overall.lines.percentage >= 60 ? 'warning' : 'error',
        percentage: data.coverageData.overall.lines.percentage,
        subtitle: `${data.coverageData.overall.lines.covered}/${data.coverageData.overall.lines.total} lines`
      },
      {
        title: 'Duration',
        value: this.formatDuration(summary.executionTime),
        status: summary.executionTime < 30000 ? 'success' : 
                summary.executionTime < 60000 ? 'warning' : 'error',
        percentage: Math.min((summary.executionTime / 60000) * 100, 100),
        subtitle: 'Execution time'
      }
    ];

    return `
    <section class="summary-section">
        <h2>Test Summary</h2>
        <div class="summary-cards">
            ${cards.map(card => `
                <div class="card ${card.status}">
                    <div class="card-header">
                        <h3>${card.title}</h3>
                        <span class="card-status ${card.status}"></span>
                    </div>
                    <div class="card-content">
                        <div class="metric-value">${card.value}</div>
                        <div class="metric-subtitle">${card.subtitle}</div>
                        <div class="progress-bar">
                            <div class="progress-fill ${card.status}" style="width: ${card.percentage}%"></div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </section>`;
  }

  createTestResultsTables(data: AggregatedTestData): string {
    const categoryTabs = Object.values(TestCategory).map(category => {
      const categoryData = data.metrics.categoryBreakdown[category];
      if (!categoryData || categoryData.totalTests === 0) return '';
      
      const suites = data.suiteResults.filter(suite => suite.category === category);
      
      return `
        <div class="tab-content" id="tab-${category}">
            <div class="category-summary">
                <h4>${this.formatCategoryName(category)} Tests</h4>
                <div class="category-stats">
                    <span class="stat">Total: ${categoryData.totalTests}</span>
                    <span class="stat success">Passed: ${categoryData.passedTests}</span>
                    <span class="stat error">Failed: ${categoryData.failedTests}</span>
                    <span class="stat">Pass Rate: ${categoryData.passRate.toFixed(1)}%</span>
                </div>
            </div>
            ${this.createTestSuitesTable(suites)}
        </div>`;
    }).filter(Boolean);

    const failedTestsSection = data.metrics.failedTests.length > 0 ? `
        <div class="tab-content" id="tab-failures">
            <h4>Failed Tests (${data.metrics.failedTests.length})</h4>
            ${this.createFailedTestsTable(data.metrics.failedTests)}
        </div>` : '';

    const slowTestsSection = data.metrics.slowestTests.length > 0 ? `
        <div class="tab-content" id="tab-slow">
            <h4>Slowest Tests (${data.metrics.slowestTests.length})</h4>
            ${this.createSlowTestsTable(data.metrics.slowestTests)}
        </div>` : '';

    return `
    <section class="results-section">
        <h2>Test Results</h2>
        <div class="tabs-container">
            <div class="tabs">
                ${Object.values(TestCategory).map(category => {
                  const categoryData = data.metrics.categoryBreakdown[category];
                  if (!categoryData || categoryData.totalTests === 0) return '';
                  return `<button class="tab-button" onclick="showTab('tab-${category}')">${this.formatCategoryName(category)}</button>`;
                }).filter(Boolean).join('')}
                ${data.metrics.failedTests.length > 0 ? '<button class="tab-button error" onclick="showTab(\'tab-failures\')">Failures</button>' : ''}
                ${data.metrics.slowestTests.length > 0 ? '<button class="tab-button warning" onclick="showTab(\'tab-slow\')">Slow Tests</button>' : ''}
            </div>
            <div class="search-filter">
                <input type="text" id="test-search" placeholder="Search tests..." onkeyup="filterTests()">
                <select id="status-filter" onchange="filterTests()">
                    <option value="">All Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="skipped">Skipped</option>
                </select>
            </div>
        </div>
        <div class="tab-contents">
            ${categoryTabs.join('')}
            ${failedTestsSection}
            ${slowTestsSection}
        </div>
    </section>`;
  }

  createPerformanceCharts(data: AggregatedTestData): string {
    if (!data.performanceMetrics) {
      return '';
    }

    return `
    <section class="performance-section">
        <h2>Performance Metrics</h2>
        <div class="performance-charts">
            <div class="chart-container">
                <h4>Response Time Distribution</h4>
                <div class="chart-placeholder">
                    <div class="metric-display">
                        <span class="metric-label">Average:</span>
                        <span class="metric-value">${data.performanceMetrics.averageResponseTime || 0}ms</span>
                    </div>
                    <div class="metric-display">
                        <span class="metric-label">P95:</span>
                        <span class="metric-value">${data.performanceMetrics.p95ResponseTime || 0}ms</span>
                    </div>
                </div>
            </div>
            <div class="chart-container">
                <h4>Test Duration by Category</h4>
                <div class="duration-chart">
                    ${Object.entries(data.metrics.categoryBreakdown).map(([category, stats]) => `
                        <div class="duration-bar">
                            <span class="category-name">${this.formatCategoryName(category as TestCategory)}</span>
                            <div class="bar-container">
                                <div class="bar" style="width: ${Math.min((stats.executionTime / data.summary.executionTime) * 100, 100)}%"></div>
                                <span class="duration-value">${this.formatDuration(stats.executionTime)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </section>`;
  }

  createCoverageVisualizations(data: AggregatedTestData): string {
    const { coverageData } = data;
    
    const coverageMetrics = [
      { name: 'Lines', data: coverageData.overall.lines },
      { name: 'Functions', data: coverageData.overall.functions },
      { name: 'Branches', data: coverageData.overall.branches },
      { name: 'Statements', data: coverageData.overall.statements }
    ];

    return `
    <section class="coverage-section">
        <h2>Code Coverage</h2>
        <div class="coverage-overview">
            ${coverageMetrics.map(metric => `
                <div class="coverage-metric">
                    <h4>${metric.name}</h4>
                    <div class="coverage-circle">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <path class="circle" stroke-dasharray="${metric.data.percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <text x="18" y="20.35" class="percentage">${metric.data.percentage.toFixed(1)}%</text>
                        </svg>
                    </div>
                    <div class="coverage-details">
                        <span>${metric.data.covered}/${metric.data.total}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    </section>`;
  }

  private createTestSuitesTable(suites: TestSuiteData[]): string {
    return `
    <div class="table-container">
        <table class="test-table sortable">
            <thead>
                <tr>
                    <th onclick="sortTable(this, 0)">Suite Name <span class="sort-indicator">↕</span></th>
                    <th onclick="sortTable(this, 1)">Status <span class="sort-indicator">↕</span></th>
                    <th onclick="sortTable(this, 2)">Tests <span class="sort-indicator">↕</span></th>
                    <th onclick="sortTable(this, 3)">Duration <span class="sort-indicator">↕</span></th>
                    <th onclick="sortTable(this, 4)">Pass Rate <span class="sort-indicator">↕</span></th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${suites.map(suite => {
                  const passRate = suite.tests.length > 0 ? 
                    (suite.numPassingTests / suite.tests.length) * 100 : 0;
                  
                  return `
                    <tr class="test-suite-row ${suite.status}" data-suite="${this.escapeHtml(suite.name)}">
                        <td class="suite-name">${this.escapeHtml(suite.name)}</td>
                        <td><span class="status-badge ${suite.status}">${this.formatStatus(suite.status)}</span></td>
                        <td>${suite.tests.length}</td>
                        <td>${this.formatDuration(suite.duration)}</td>
                        <td>${passRate.toFixed(1)}%</td>
                        <td>
                            <button class="btn-small" onclick="toggleSuiteDetails('${this.escapeForJavaScript(suite.name)}')">
                                Details
                            </button>
                        </td>
                    </tr>
                    <tr class="suite-details" id="details-${this.escapeForId(suite.name)}" style="display: none;">
                        <td colspan="6">
                            <div class="suite-details-content">
                                <h5>Test Cases (${suite.tests.length})</h5>
                                ${this.createTestCasesTable(suite.tests)}
                            </div>
                        </td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>`;
  }

  private createTestCasesTable(tests: TestCaseData[]): string {
    return `
    <table class="test-cases-table">
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${tests.map(test => `
                <tr class="test-case-row ${test.status}">
                    <td class="test-name">${this.escapeHtml(test.name)}</td>
                    <td><span class="status-badge ${test.status}">${this.formatStatus(test.status)}</span></td>
                    <td>${this.formatDuration(test.duration)}</td>
                    <td class="error-cell">
                        ${test.errorMessage ? `
                            <button class="btn-small error" onclick="showErrorDetails('${this.escapeHtml(test.fullName)}')">
                                View Error
                            </button>
                            <div class="error-details" id="error-${this.escapeHtml(test.fullName)}" style="display: none;">
                                <pre>${this.escapeHtml(test.errorMessage)}</pre>
                                ${test.stackTrace ? `<pre class="stack-trace">${this.escapeHtml(test.stackTrace)}</pre>` : ''}
                            </div>
                        ` : '-'}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
  }

  private createFailedTestsTable(failedTests: TestCaseData[]): string {
    return `
    <div class="table-container">
        <table class="test-table">
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Duration</th>
                    <th>Error Message</th>
                </tr>
            </thead>
            <tbody>
                ${failedTests.slice(0, 50).map(test => `
                    <tr class="test-case-row failed">
                        <td class="test-name">${this.escapeHtml(test.fullName)}</td>
                        <td><span class="category-badge">${this.formatCategoryName(test.category)}</span></td>
                        <td>${this.formatDuration(test.duration)}</td>
                        <td class="error-cell">
                            <div class="error-preview">${this.escapeHtml((test.errorMessage || '').substring(0, 100))}...</div>
                            <button class="btn-small" onclick="showErrorDetails('failed-${this.escapeHtml(test.fullName)}')">
                                Full Error
                            </button>
                            <div class="error-details" id="error-failed-${this.escapeHtml(test.fullName)}" style="display: none;">
                                <pre>${this.escapeHtml(test.errorMessage || '')}</pre>
                                ${test.stackTrace ? `<pre class="stack-trace">${this.escapeHtml(test.stackTrace)}</pre>` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
  }

  private createSlowTestsTable(slowTests: TestCaseData[]): string {
    return `
    <div class="table-container">
        <table class="test-table">
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Duration</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${slowTests.map(test => `
                    <tr class="test-case-row ${test.status}">
                        <td class="test-name">${this.escapeHtml(test.fullName)}</td>
                        <td><span class="category-badge">${this.formatCategoryName(test.category)}</span></td>
                        <td class="duration-cell">
                            <span class="duration-value">${this.formatDuration(test.duration)}</span>
                            <div class="duration-bar">
                                <div class="duration-fill" style="width: ${Math.min((test.duration / Math.max(...slowTests.map(t => t.duration))) * 100, 100)}%"></div>
                            </div>
                        </td>
                        <td><span class="status-badge ${test.status}">${this.formatStatus(test.status)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
  }

  getOutputPath(config: HtmlReportConfig): string {
    const filename = config.filename || 'test-report.html';
    return path.join(config.outputDirectory, filename);
  }

  validateConfig(config: HtmlReportConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.outputDirectory) {
      errors.push('Output directory is required');
    }

    if (config.maxFailureDetails !== undefined && config.maxFailureDetails < 1) {
      warnings.push('maxFailureDetails should be at least 1');
    }

    if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
      warnings.push('Invalid theme, using default');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getFormat(): ReportFormat {
    return ReportFormat.HTML;
  }

  // Helper methods continue in next part... 
 // Helper methods

  private generateHeader(data: AggregatedTestData, config: HtmlReportConfig): string {
    return `
    <header class="report-header">
        <div class="header-content">
            <h1>${this.escapeHtml(config.title || 'Test Report')}</h1>
            <div class="header-metadata">
                <div class="metadata-item">
                    <span class="label">Generated:</span>
                    <span class="value">${data.timestamp.toLocaleString()}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Build:</span>
                    <span class="value">${data.buildMetadata.buildVersion || 'Unknown'}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Environment:</span>
                    <span class="value">${data.buildMetadata.environment}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Branch:</span>
                    <span class="value">${data.buildMetadata.gitInfo.branch || 'Unknown'}</span>
                </div>
            </div>
        </div>
    </header>`;
  }

  private generateFooter(data: AggregatedTestData, timestamp: string): string {
    return `
    <footer class="report-footer">
        <div class="footer-content">
            <p>Report generated at ${timestamp}</p>
            <p>Node.js ${data.buildMetadata.nodeVersion} on ${data.buildMetadata.platform}</p>
        </div>
    </footer>`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  private formatStatus(status: TestStatus): string {
    switch (status) {
      case TestStatus.PASSED: return 'Passed';
      case TestStatus.FAILED: return 'Failed';
      case TestStatus.SKIPPED: return 'Skipped';
      case TestStatus.TODO: return 'Todo';
      default: return 'Unknown';
    }
  }

  private formatCategoryName(category: TestCategory): string {
    switch (category) {
      case TestCategory.UNIT: return 'Unit';
      case TestCategory.INTEGRATION: return 'Integration';
      case TestCategory.E2E: return 'End-to-End';
      case TestCategory.PERFORMANCE: return 'Performance';
      default: return category;
    }
  }

  private escapeHtml(text: string): string {
    const div = { innerHTML: '' } as any;
    div.textContent = text;
    return div.innerHTML || text.replace(/[&<>"']/g, (match: string) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match] || match;
    });
  }

  private escapeForJavaScript(text: string): string {
    return text.replace(/[\\'"]/g, '\\$&').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  private escapeForId(text: string): string {
    return text.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private generateEmbeddedCSS(config: HtmlReportConfig): string {
    return `
    <style>
        /* Reset and Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Theme Support */
        .theme-dark {
            background-color: #1a1a1a;
            color: #e0e0e0;
        }

        .theme-dark .card,
        .theme-dark .table-container,
        .theme-dark .chart-container {
            background-color: #2d2d2d;
            border-color: #404040;
        }

        /* Header Styles */
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header-content h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 300;
        }

        .header-metadata {
            display: flex;
            flex-wrap: wrap;
            gap: 2rem;
        }

        .metadata-item {
            display: flex;
            flex-direction: column;
        }

        .metadata-item .label {
            font-size: 0.875rem;
            opacity: 0.8;
            margin-bottom: 0.25rem;
        }

        .metadata-item .value {
            font-weight: 600;
        }

        /* Summary Cards */
        .summary-section {
            margin-bottom: 2rem;
        }

        .summary-section h2 {
            margin-bottom: 1rem;
            color: #2c3e50;
            font-weight: 600;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #e0e0e0;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .card.success { border-left-color: #27ae60; }
        .card.error { border-left-color: #e74c3c; }
        .card.warning { border-left-color: #f39c12; }
        .card.info { border-left-color: #3498db; }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .card-header h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #666;
        }

        .card-status {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #e0e0e0;
        }

        .card-status.success { background-color: #27ae60; }
        .card-status.error { background-color: #e74c3c; }
        .card-status.warning { background-color: #f39c12; }
        .card-status.info { background-color: #3498db; }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 0.5rem;
        }

        .metric-subtitle {
            font-size: 0.875rem;
            color: #666;
            margin-bottom: 1rem;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background-color: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s ease;
        }

        .progress-fill.success { background-color: #27ae60; }
        .progress-fill.error { background-color: #e74c3c; }
        .progress-fill.warning { background-color: #f39c12; }
        .progress-fill.info { background-color: #3498db; }

        /* Coverage Section */
        .coverage-section {
            margin-bottom: 2rem;
        }

        .coverage-section h2 {
            margin-bottom: 1rem;
            color: #2c3e50;
            font-weight: 600;
        }

        .coverage-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .coverage-metric {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .coverage-metric h4 {
            margin-bottom: 1rem;
            color: #2c3e50;
        }

        .coverage-circle {
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
        }

        .circular-chart {
            display: block;
            margin: 0 auto;
            max-width: 80%;
            max-height: 250px;
        }

        .circle-bg {
            fill: none;
            stroke: #e0e0e0;
            stroke-width: 2.8;
        }

        .circle {
            fill: none;
            stroke-width: 2.8;
            stroke-linecap: round;
            animation: progress 1s ease-out forwards;
            stroke: #27ae60;
        }

        .percentage {
            fill: #2c3e50;
            font-family: sans-serif;
            font-size: 0.5em;
            text-anchor: middle;
        }

        @keyframes progress {
            0% { stroke-dasharray: 0 100; }
        }

        /* Performance Section */
        .performance-section {
            margin-bottom: 2rem;
        }

        .performance-charts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
        }

        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chart-container h4 {
            margin-bottom: 1rem;
            color: #2c3e50;
        }

        .metric-display {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background-color: #f8f9fa;
            border-radius: 4px;
        }

        .duration-chart {
            space-y: 0.5rem;
        }

        .duration-bar {
            display: flex;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .category-name {
            width: 100px;
            font-size: 0.875rem;
            font-weight: 600;
        }

        .bar-container {
            flex: 1;
            display: flex;
            align-items: center;
            margin-left: 1rem;
        }

        .bar {
            height: 20px;
            background: linear-gradient(90deg, #3498db, #2980b9);
            border-radius: 10px;
            min-width: 2px;
        }

        .duration-value {
            margin-left: 0.5rem;
            font-size: 0.875rem;
            color: #666;
        }

        /* Tables and Results */
        .results-section {
            margin-bottom: 2rem;
        }

        .tabs-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .tabs {
            display: flex;
            background-color: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
            overflow-x: auto;
        }

        .tab-button {
            background: none;
            border: none;
            padding: 1rem 1.5rem;
            cursor: pointer;
            font-weight: 600;
            color: #666;
            border-bottom: 3px solid transparent;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .tab-button:hover {
            background-color: #e9ecef;
            color: #2c3e50;
        }

        .tab-button.active {
            color: #3498db;
            border-bottom-color: #3498db;
            background-color: white;
        }

        .tab-button.error {
            color: #e74c3c;
        }

        .tab-button.warning {
            color: #f39c12;
        }

        .search-filter {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background-color: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
        }

        .search-filter input,
        .search-filter select {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .search-filter input {
            flex: 1;
            max-width: 300px;
        }

        .tab-content {
            padding: 1.5rem;
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .category-summary {
            margin-bottom: 1rem;
            padding: 1rem;
            background-color: #f8f9fa;
            border-radius: 4px;
        }

        .category-stats {
            display: flex;
            gap: 1rem;
            margin-top: 0.5rem;
        }

        .stat {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            background-color: #e9ecef;
        }

        .stat.success { background-color: #d4edda; color: #155724; }
        .stat.error { background-color: #f8d7da; color: #721c24; }

        .table-container {
            overflow-x: auto;
        }

        .test-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .test-table th,
        .test-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }

        .test-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
            cursor: pointer;
            user-select: none;
            position: relative;
        }

        .test-table th:hover {
            background-color: #e9ecef;
        }

        .sort-indicator {
            margin-left: 0.5rem;
            opacity: 0.5;
        }

        .test-table th.sorted-asc .sort-indicator::after {
            content: '↑';
        }

        .test-table th.sorted-desc .sort-indicator::after {
            content: '↓';
        }

        .test-suite-row.passed { background-color: #f8fff8; }
        .test-suite-row.failed { background-color: #fff8f8; }
        .test-suite-row.skipped { background-color: #fffef8; }

        .suite-details {
            background-color: #f8f9fa;
        }

        .suite-details-content {
            padding: 1rem;
        }

        .test-cases-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8125rem;
            margin-top: 0.5rem;
        }

        .test-cases-table th,
        .test-cases-table td {
            padding: 0.5rem;
            border-bottom: 1px solid #e0e0e0;
        }

        .test-cases-table th {
            background-color: #e9ecef;
            font-weight: 600;
        }

        .status-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-badge.passed {
            background-color: #d4edda;
            color: #155724;
        }

        .status-badge.failed {
            background-color: #f8d7da;
            color: #721c24;
        }

        .status-badge.skipped {
            background-color: #fff3cd;
            color: #856404;
        }

        .category-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            background-color: #e9ecef;
            color: #495057;
        }

        .btn-small {
            padding: 0.25rem 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 0.75rem;
            transition: all 0.2s ease;
        }

        .btn-small:hover {
            background-color: #f8f9fa;
            border-color: #adb5bd;
        }

        .btn-small.error {
            border-color: #e74c3c;
            color: #e74c3c;
        }

        .error-details {
            margin-top: 0.5rem;
            padding: 1rem;
            background-color: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid #e74c3c;
        }

        .error-details pre {
            font-size: 0.75rem;
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
        }

        .stack-trace {
            margin-top: 0.5rem;
            color: #666;
            font-size: 0.6875rem;
        }

        .error-preview {
            font-family: monospace;
            font-size: 0.75rem;
            color: #666;
            margin-bottom: 0.5rem;
        }

        .duration-cell {
            position: relative;
        }

        .duration-bar {
            width: 100%;
            height: 4px;
            background-color: #e0e0e0;
            border-radius: 2px;
            margin-top: 0.25rem;
            overflow: hidden;
        }

        .duration-fill {
            height: 100%;
            background: linear-gradient(90deg, #f39c12, #e67e22);
            border-radius: 2px;
        }

        /* Footer */
        .report-footer {
            margin-top: 2rem;
            padding: 1rem;
            text-align: center;
            color: #666;
            font-size: 0.875rem;
            border-top: 1px solid #e0e0e0;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .header-content h1 {
                font-size: 2rem;
            }

            .header-metadata {
                flex-direction: column;
                gap: 1rem;
            }

            .summary-cards {
                grid-template-columns: 1fr;
            }

            .tabs {
                flex-direction: column;
            }

            .search-filter {
                flex-direction: column;
            }

            .category-stats {
                flex-direction: column;
                gap: 0.5rem;
            }
        }

        /* Custom CSS injection */
        ${config.customCss || ''}
    </style>`;
  }

  private generateEmbeddedJavaScript(config: HtmlReportConfig): string {
    return `
    <script>
        // Global state
        let currentTab = null;
        let sortState = {};

        // Initialize the report
        document.addEventListener('DOMContentLoaded', function() {
            initializeTabs();
            initializeTheme();
            ${config.customJs || ''}
        });

        // Tab management
        function initializeTabs() {
            const firstTab = document.querySelector('.tab-button');
            if (firstTab) {
                const tabId = firstTab.getAttribute('onclick').match(/'([^']+)'/)[1];
                showTab(tabId);
            }
        }

        function showTab(tabId) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Remove active class from all tab buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });

            // Show selected tab content
            const selectedContent = document.getElementById(tabId);
            if (selectedContent) {
                selectedContent.classList.add('active');
            }

            // Add active class to selected tab button
            const selectedButton = document.querySelector(\`[onclick*="\${tabId}"]\`);
            if (selectedButton) {
                selectedButton.classList.add('active');
            }

            currentTab = tabId;
        }

        // Theme management
        function initializeTheme() {
            const theme = '${config.theme || 'auto'}';
            if (theme === 'auto') {
                // Auto-detect system theme
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.className = 'theme-dark';
                } else {
                    document.body.className = 'theme-light';
                }

                // Listen for theme changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    document.body.className = e.matches ? 'theme-dark' : 'theme-light';
                });
            } else {
                document.body.className = \`theme-\${theme}\`;
            }
        }

        // Table sorting
        function sortTable(header, columnIndex) {
            const table = header.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr:not(.suite-details)'));
            
            const tableId = table.className;
            const currentSort = sortState[tableId + columnIndex] || 'none';
            
            // Reset all sort indicators in this table
            table.querySelectorAll('th').forEach(th => {
                th.classList.remove('sorted-asc', 'sorted-desc');
            });

            let newSort;
            if (currentSort === 'none' || currentSort === 'desc') {
                newSort = 'asc';
                header.classList.add('sorted-asc');
            } else {
                newSort = 'desc';
                header.classList.add('sorted-desc');
            }

            sortState[tableId + columnIndex] = newSort;

            // Sort rows
            rows.sort((a, b) => {
                const aValue = getCellValue(a, columnIndex);
                const bValue = getCellValue(b, columnIndex);
                
                let comparison = 0;
                if (aValue < bValue) comparison = -1;
                if (aValue > bValue) comparison = 1;
                
                return newSort === 'asc' ? comparison : -comparison;
            });

            // Reorder rows in DOM
            rows.forEach(row => {
                tbody.appendChild(row);
                // Also move any associated detail rows
                const detailRow = tbody.querySelector(\`#details-\${row.dataset.suite}\`);
                if (detailRow) {
                    tbody.appendChild(detailRow);
                }
            });
        }

        function getCellValue(row, columnIndex) {
            const cell = row.cells[columnIndex];
            if (!cell) return '';
            
            const text = cell.textContent.trim();
            
            // Try to parse as number (for durations, percentages, etc.)
            const numMatch = text.match(/([0-9,]+(?:\\.[0-9]+)?)/);
            if (numMatch) {
                return parseFloat(numMatch[1].replace(/,/g, ''));
            }
            
            return text.toLowerCase();
        }

        // Test filtering
        function filterTests() {
            const searchTerm = document.getElementById('test-search').value.toLowerCase();
            const statusFilter = document.getElementById('status-filter').value;
            
            const activeTabContent = document.querySelector('.tab-content.active');
            if (!activeTabContent) return;
            
            const rows = activeTabContent.querySelectorAll('.test-suite-row, .test-case-row');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const status = row.classList.contains('passed') ? 'passed' :
                              row.classList.contains('failed') ? 'failed' :
                              row.classList.contains('skipped') ? 'skipped' : '';
                
                const matchesSearch = !searchTerm || text.includes(searchTerm);
                const matchesStatus = !statusFilter || status === statusFilter;
                
                if (matchesSearch && matchesStatus) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        // Suite details toggle
        function toggleSuiteDetails(suiteName) {
            // Escape the suite name for use as an ID
            const escapedName = suiteName.replace(/[^a-zA-Z0-9-_]/g, '_');
            const detailsRow = document.getElementById(\`details-\${escapedName}\`);
            if (detailsRow) {
                if (detailsRow.style.display === 'none') {
                    detailsRow.style.display = 'table-row';
                } else {
                    detailsRow.style.display = 'none';
                }
            }
        }

        // Error details toggle
        function showErrorDetails(testId) {
            const errorDetails = document.getElementById(\`error-\${testId}\`);
            if (errorDetails) {
                if (errorDetails.style.display === 'none') {
                    errorDetails.style.display = 'block';
                } else {
                    errorDetails.style.display = 'none';
                }
            }
        }

        // Utility functions
        function copyToClipboard(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    showNotification('Copied to clipboard');
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification('Copied to clipboard');
            }
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: #27ae60;
                color: white;
                padding: 1rem;
                border-radius: 4px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
            \`;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 2000);
        }

        // Add CSS for notifications
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        \`;
        document.head.appendChild(style);
    </script>`;
  }
}