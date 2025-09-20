/**
 * Custom Jest Reporter for Real-time Test Reporting Integration
 * 
 * JavaScript version for Jest compatibility
 */

const path = require('path');
const { promises: fs } = require('fs');

class JestReporter {
  constructor(globalConfig, reporterOptions = {}) {
    // Load default configuration
    let defaultConfig = {};
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

    this.startTime = 0;
    this.testResults = [];

    if (this.config.verbose) {
      console.log('Jest Reporter initialized with config:', this.config);
    }
  }

  /**
   * Called when Jest starts running tests
   */
  onRunStart(aggregatedResults, options) {
    this.startTime = Date.now();
    this.testResults = [];

    if (this.config.verbose) {
      console.log('🚀 Jest Reporter: Test run started');
      console.log(`📁 Output directory: ${this.config.outputDirectory}`);
    }
  }

  /**
   * Called when a test suite starts
   */
  onTestStart(test) {
    if (this.config.verbose) {
      console.log(`🧪 Starting test suite: ${path.basename(test.path)}`);
    }
  }

  /**
   * Called when a test suite completes
   */
  onTestResult(test, testResult, aggregatedResults) {
    this.testResults.push(testResult);

    if (this.config.verbose) {
      const status = testResult.numFailingTests > 0 ? '❌' : '✅';
      const duration = testResult.perfStats.end - testResult.perfStats.start;
      console.log(
        `${status} ${path.basename(testResult.testFilePath)} ` +
        `(${testResult.numPassingTests}/${testResult.numPassingTests + testResult.numFailingTests}) ` +
        `${duration}ms`
      );
    }
  }

  /**
   * Called when all tests complete
   */
  async onRunComplete(contexts, results) {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    if (this.config.verbose) {
      console.log(`🏁 Jest Reporter: Test run completed in ${totalDuration}ms`);
      console.log(`📊 Results: ${results.numPassedTests}/${results.numTotalTests} passed`);
    }

    // Check if we should only generate reports on failure
    if (this.config.onlyOnFailure && results.success) {
      if (this.config.verbose) {
        console.log('⏭️  Skipping report generation (tests passed, onlyOnFailure=true)');
      }
      return;
    }

    try {
      await this.generateReports(results);
    } catch (error) {
      console.error('❌ Failed to generate test reports:', error);
      // Don't throw - we don't want to fail the test run because of reporting issues
    }
  }

  /**
   * Generate all configured report formats
   */
  async generateReports(jestResults) {
    if (this.config.verbose) {
      console.log('📝 Generating test reports...');
    }

    try {
      // Ensure output directory exists before generating reports
      await this.ensureOutputDirectory();

      // Create a simplified aggregated data structure
      const aggregatedData = this.createSimplifiedReport(jestResults);

      const reportPromises = [];

      // Generate JSON report (simplest to implement)
      if (this.config.generateJson) {
        reportPromises.push(this.generateJsonReport(aggregatedData));
      }

      // Generate basic HTML report
      if (this.config.generateHtml) {
        reportPromises.push(this.generateBasicHtmlReport(aggregatedData));
      }

      // Generate basic Markdown report
      if (this.config.generateMarkdown) {
        reportPromises.push(this.generateBasicMarkdownReport(aggregatedData));
      }

      // Wait for all reports to complete
      await Promise.all(reportPromises);

      if (this.config.verbose) {
        console.log('✅ All test reports generated successfully');
        console.log(`📁 Reports saved to: ${this.config.outputDirectory}`);
      }

    } catch (error) {
      console.error('❌ Error during report generation:', error);
      throw error;
    }
  }

  /**
   * Create simplified report data structure
   */
  createSimplifiedReport(jestResults) {
    const summary = {
      totalTests: jestResults.numTotalTests,
      passedTests: jestResults.numPassedTests,
      failedTests: jestResults.numFailedTests,
      skippedTests: jestResults.numPendingTests,
      passRate: jestResults.numTotalTests > 0 ? 
        (jestResults.numPassedTests / jestResults.numTotalTests) * 100 : 0,
      executionTime: Date.now() - this.startTime
    };

    const testSuites = jestResults.testResults.map(testResult => ({
      name: path.basename(testResult.testFilePath, path.extname(testResult.testFilePath)),
      filePath: testResult.testFilePath,
      status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
      duration: testResult.perfStats.end - testResult.perfStats.start,
      numPassingTests: testResult.numPassingTests,
      numFailingTests: testResult.numFailingTests,
      numPendingTests: testResult.numPendingTests,
      category: this.categorizeTestSuite(testResult.testFilePath)
    }));

    return {
      summary,
      testSuites,
      timestamp: new Date(),
      buildMetadata: {
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Categorize test suite based on file path
   */
  categorizeTestSuite(filePath) {
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
    
    if (normalizedPath.includes('performance') || normalizedPath.includes('perf')) {
      return 'performance';
    }
    if (normalizedPath.includes('e2e') || normalizedPath.includes('end-to-end')) {
      return 'e2e';
    }
    if (normalizedPath.includes('integration') || normalizedPath.includes('int')) {
      return 'integration';
    }
    
    return 'unit';
  }

  /**
   * Generate JSON report
   */
  async generateJsonReport(data) {
    try {
      const outputPath = path.join(this.config.outputDirectory, 'test-results.json');
      
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
   * Generate basic HTML report
   */
  async generateBasicHtmlReport(data) {
    try {
      const outputPath = path.join(this.config.outputDirectory, 'test-report.html');
      
      const html = this.createBasicHtmlTemplate(data);
      await fs.writeFile(outputPath, html, 'utf8');

      if (this.config.verbose) {
        console.log(`📄 HTML report generated: ${outputPath}`);
      }
    } catch (error) {
      console.error('Failed to generate HTML report:', error);
      throw error;
    }
  }

  /**
   * Generate basic Markdown report
   */
  async generateBasicMarkdownReport(data) {
    try {
      const outputPath = path.join(this.config.outputDirectory, 'test-report.md');
      
      const markdown = this.createBasicMarkdownTemplate(data);
      await fs.writeFile(outputPath, markdown, 'utf8');

      if (this.config.verbose) {
        console.log(`📝 Markdown report generated: ${outputPath}`);
      }
    } catch (error) {
      console.error('Failed to generate Markdown report:', error);
      throw error;
    }
  }

  /**
   * Create basic HTML template
   */
  createBasicHtmlTemplate(data) {
    const { summary, testSuites, timestamp } = data;
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Test Report</h1>
    <p><strong>Generated:</strong> ${timestamp.toISOString()}</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${summary.totalTests}</p>
        <p><strong>Passed:</strong> <span class="passed">${summary.passedTests}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${summary.failedTests}</span></p>
        <p><strong>Skipped:</strong> ${summary.skippedTests}</p>
        <p><strong>Pass Rate:</strong> ${summary.passRate.toFixed(1)}%</p>
        <p><strong>Execution Time:</strong> ${Math.round(summary.executionTime / 1000)}s</p>
    </div>
    
    <h2>Test Suites</h2>
    <table>
        <thead>
            <tr>
                <th>Suite</th>
                <th>Status</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Duration</th>
                <th>Category</th>
            </tr>
        </thead>
        <tbody>
            ${testSuites.map(suite => `
                <tr>
                    <td>${suite.name}</td>
                    <td class="${suite.status}">${suite.status}</td>
                    <td>${suite.numPassingTests}</td>
                    <td>${suite.numFailingTests}</td>
                    <td>${Math.round(suite.duration)}ms</td>
                    <td>${suite.category}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  /**
   * Create basic Markdown template
   */
  createBasicMarkdownTemplate(data) {
    const { summary, testSuites, timestamp } = data;
    
    return `# Test Report

**Generated:** ${timestamp.toISOString()}

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | ${summary.totalTests} | - |
| Passed | ${summary.passedTests} | ${summary.passedTests > 0 ? '✅' : '⚠️'} |
| Failed | ${summary.failedTests} | ${summary.failedTests === 0 ? '✅' : '❌'} |
| Skipped | ${summary.skippedTests} | - |
| Pass Rate | ${summary.passRate.toFixed(1)}% | ${summary.passRate >= 90 ? '✅' : summary.passRate >= 70 ? '⚠️' : '❌'} |
| Execution Time | ${Math.round(summary.executionTime / 1000)}s | - |

## Test Suites

| Suite | Status | Passed | Failed | Duration | Category |
|-------|--------|--------|--------|----------|----------|
${testSuites.map(suite => 
  `| ${suite.name} | ${suite.status === 'passed' ? '✅' : '❌'} | ${suite.numPassingTests} | ${suite.numFailingTests} | ${Math.round(suite.duration)}ms | ${suite.category} |`
).join('\n')}

## Test Results by Category

${this.generateCategoryBreakdown(testSuites)}
`;
  }

  /**
   * Generate category breakdown for markdown
   */
  generateCategoryBreakdown(testSuites) {
    const categories = {};
    
    testSuites.forEach(suite => {
      if (!categories[suite.category]) {
        categories[suite.category] = {
          total: 0,
          passed: 0,
          failed: 0,
          duration: 0
        };
      }
      
      categories[suite.category].total += suite.numPassingTests + suite.numFailingTests;
      categories[suite.category].passed += suite.numPassingTests;
      categories[suite.category].failed += suite.numFailingTests;
      categories[suite.category].duration += suite.duration;
    });
    
    return Object.entries(categories).map(([category, stats]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests

- **Total:** ${stats.total}
- **Passed:** ${stats.passed}
- **Failed:** ${stats.failed}
- **Duration:** ${Math.round(stats.duration)}ms
`).join('\n');
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.config.outputDirectory, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create output directory ${this.config.outputDirectory}:`, error);
    }
  }

  /**
   * Get summary information for console output
   */
  getLastError() {
    // Jest reporter interface method - return undefined if no errors
    return undefined;
  }
}

module.exports = JestReporter;