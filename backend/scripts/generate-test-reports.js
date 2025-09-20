#!/usr/bin/env node

/**
 * Test Report Generation Script
 * 
 * This script generates comprehensive test reports in multiple formats
 * based on Jest test results and coverage data.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class TestReportGenerator {
  constructor(options = {}) {
    this.options = {
      ci: options.ci || process.env.CI === 'true',
      format: options.format || 'all',
      outputDir: options.outputDir || 'test-reports',
      verbose: options.verbose || false,
      silent: options.silent || false,
      ...options
    };
    
    this.startTime = Date.now();
    this.reportData = null;
  }

  log(message, level = 'info') {
    if (this.options.silent && level !== 'error') return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '⏳'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async ensureOutputDirectory() {
    const outputPath = path.join(process.cwd(), this.options.outputDir);
    try {
      await fs.mkdir(outputPath, { recursive: true });
      this.log(`Output directory ensured: ${outputPath}`, 'info');
    } catch (error) {
      this.log(`Failed to create output directory: ${error.message}`, 'error');
      throw error;
    }
  }

  async collectTestResults() {
    this.log('Collecting test results and coverage data...', 'progress');
    
    try {
      // Look for Jest test results
      const testResultsPath = path.join(process.cwd(), 'test-results');
      const coveragePath = path.join(process.cwd(), 'coverage');
      
      let jestResults = null;
      let coverageData = null;
      
      // Try to find Jest results from various sources
      const possibleResultFiles = [
        path.join(testResultsPath, 'jest-results.json'),
        path.join(testResultsPath, 'comprehensive-test-report.json'),
        path.join(process.cwd(), 'jest-results.json')
      ];
      
      for (const resultFile of possibleResultFiles) {
        try {
          const data = await fs.readFile(resultFile, 'utf8');
          jestResults = JSON.parse(data);
          this.log(`Found test results: ${resultFile}`, 'success');
          break;
        } catch (error) {
          // Continue to next file
        }
      }
      
      // Try to find coverage data
      const possibleCoverageFiles = [
        path.join(coveragePath, 'coverage-summary.json'),
        path.join(coveragePath, 'lcov-report', 'index.html')
      ];
      
      for (const coverageFile of possibleCoverageFiles) {
        try {
          if (coverageFile.endsWith('.json')) {
            const data = await fs.readFile(coverageFile, 'utf8');
            coverageData = JSON.parse(data);
            this.log(`Found coverage data: ${coverageFile}`, 'success');
            break;
          }
        } catch (error) {
          // Continue to next file
        }
      }
      
      // If no results found, generate basic structure
      if (!jestResults) {
        this.log('No existing test results found, creating basic structure', 'warning');
        jestResults = this.createBasicTestResults();
      }
      
      this.reportData = {
        timestamp: new Date().toISOString(),
        buildInfo: this.getBuildInfo(),
        testResults: jestResults,
        coverage: coverageData,
        environment: {
          ci: this.options.ci,
          nodeVersion: process.version,
          platform: process.platform
        }
      };
      
      this.log('Test results collection completed', 'success');
      
    } catch (error) {
      this.log(`Failed to collect test results: ${error.message}`, 'error');
      throw error;
    }
  }

  createBasicTestResults() {
    return {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        passRate: 0,
        executionTime: 0
      },
      testSuites: [],
      overallResult: 'NO_TESTS'
    };
  }

  getBuildInfo() {
    try {
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      
      let gitInfo = {};
      try {
        gitInfo = {
          commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
          branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
          author: execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim()
        };
      } catch (error) {
        // Git info not available
      }
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        git: gitInfo
      };
    } catch (error) {
      return {
        name: 'unknown',
        version: '0.0.0',
        timestamp: new Date().toISOString(),
        git: {}
      };
    }
  }

  async generateHtmlReport() {
    this.log('Generating HTML report...', 'progress');
    
    const htmlContent = this.createHtmlContent();
    const outputPath = path.join(process.cwd(), this.options.outputDir, 'test-report.html');
    
    try {
      await fs.writeFile(outputPath, htmlContent, 'utf8');
      this.log(`HTML report generated: ${outputPath}`, 'success');
      return outputPath;
    } catch (error) {
      this.log(`Failed to generate HTML report: ${error.message}`, 'error');
      throw error;
    }
  }

  createHtmlContent() {
    const { testResults, coverage, buildInfo, timestamp } = this.reportData;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${buildInfo.name} - Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .metadata { opacity: 0.9; margin-top: 10px; }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 30px; }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #ddd; }
        .card.passed { border-left-color: #10b981; }
        .card.failed { border-left-color: #ef4444; }
        .card.warning { border-left-color: #f59e0b; }
        .card h3 { margin: 0 0 10px 0; color: #374151; }
        .metric { font-size: 2em; font-weight: bold; color: #1f2937; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; margin-top: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #10b981; transition: width 0.3s ease; }
        .details { padding: 0 30px 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .test-suite { background: #f9fafb; border-radius: 6px; margin-bottom: 15px; overflow: hidden; }
        .suite-header { background: #f3f4f6; padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .suite-header:hover { background: #e5e7eb; }
        .suite-content { padding: 15px; display: none; }
        .suite-content.active { display: block; }
        .test-table { width: 100%; border-collapse: collapse; }
        .test-table th, .test-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .test-table th { background: #f9fafb; font-weight: 600; }
        .status-passed { color: #10b981; }
        .status-failed { color: #ef4444; }
        .status-skipped { color: #6b7280; }
        .toggle { font-size: 0.8em; }
        .footer { text-align: center; padding: 20px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${buildInfo.name} Test Report</h1>
            <div class="metadata">
                Generated: ${new Date(timestamp).toLocaleString()} | 
                Version: ${buildInfo.version} | 
                ${buildInfo.git.branch ? `Branch: ${buildInfo.git.branch}` : 'No Git Info'}
            </div>
        </header>
        
        <div class="summary-cards">
            <div class="card ${testResults.summary?.passRate === 100 ? 'passed' : testResults.summary?.failedTests > 0 ? 'failed' : 'warning'}">
                <h3>Test Results</h3>
                <div class="metric">${testResults.summary?.passedTests || 0}/${testResults.summary?.totalTests || 0}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${testResults.summary?.passRate || 0}%"></div>
                </div>
            </div>
            
            <div class="card ${(coverage?.total?.lines?.pct || 0) >= 80 ? 'passed' : 'warning'}">
                <h3>Code Coverage</h3>
                <div class="metric">${(coverage?.total?.lines?.pct || 0).toFixed(1)}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${coverage?.total?.lines?.pct || 0}%"></div>
                </div>
            </div>
            
            <div class="card">
                <h3>Execution Time</h3>
                <div class="metric">${((testResults.summary?.executionTime || 0) / 1000).toFixed(1)}s</div>
            </div>
            
            <div class="card ${testResults.summary?.failedTests === 0 ? 'passed' : 'failed'}">
                <h3>Status</h3>
                <div class="metric">${testResults.overallResult || 'UNKNOWN'}</div>
            </div>
        </div>
        
        <div class="details">
            <div class="section">
                <h2>Test Suites</h2>
                ${this.generateTestSuitesHtml(testResults.testSuites || [])}
            </div>
            
            ${coverage ? this.generateCoverageHtml(coverage) : ''}
        </div>
        
        <footer class="footer">
            Report generated by ScholarFinder Test Reporting System
        </footer>
    </div>
    
    <script>
        function toggleSuite(element) {
            const content = element.nextElementSibling;
            const toggle = element.querySelector('.toggle');
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                toggle.textContent = '▼';
            } else {
                content.classList.add('active');
                toggle.textContent = '▲';
            }
        }
        
        // Auto-expand failed test suites
        document.addEventListener('DOMContentLoaded', function() {
            const failedSuites = document.querySelectorAll('.suite-header.failed');
            failedSuites.forEach(suite => toggleSuite(suite));
        });
    </script>
</body>
</html>`;
  }

  generateTestSuitesHtml(testSuites) {
    if (!testSuites || testSuites.length === 0) {
      return '<p>No test suites found.</p>';
    }
    
    return testSuites.map(suite => `
      <div class="test-suite">
        <div class="suite-header ${suite.passed === false ? 'failed' : ''}" onclick="toggleSuite(this)">
          <span>${suite.name || 'Unknown Suite'}</span>
          <span class="toggle">▼</span>
        </div>
        <div class="suite-content">
          <p><strong>Duration:</strong> ${suite.duration || 0}ms</p>
          <p><strong>Status:</strong> <span class="status-${suite.passed ? 'passed' : 'failed'}">${suite.passed ? 'PASSED' : 'FAILED'}</span></p>
          ${suite.tests ? this.generateTestTableHtml(suite.tests) : '<p>No test details available.</p>'}
        </div>
      </div>
    `).join('');
  }

  generateTestTableHtml(tests) {
    return `
      <table class="test-table">
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${tests.map(test => `
            <tr>
              <td>${test.name || 'Unknown Test'}</td>
              <td><span class="status-${test.status || 'unknown'}">${(test.status || 'unknown').toUpperCase()}</span></td>
              <td>${test.duration || 0}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  generateCoverageHtml(coverage) {
    return `
      <div class="section">
        <h2>Coverage Summary</h2>
        <table class="test-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Covered</th>
              <th>Total</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Lines</td>
              <td>${coverage.total?.lines?.covered || 0}</td>
              <td>${coverage.total?.lines?.total || 0}</td>
              <td>${(coverage.total?.lines?.pct || 0).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Functions</td>
              <td>${coverage.total?.functions?.covered || 0}</td>
              <td>${coverage.total?.functions?.total || 0}</td>
              <td>${(coverage.total?.functions?.pct || 0).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Branches</td>
              <td>${coverage.total?.branches?.covered || 0}</td>
              <td>${coverage.total?.branches?.total || 0}</td>
              <td>${(coverage.total?.branches?.pct || 0).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Statements</td>
              <td>${coverage.total?.statements?.covered || 0}</td>
              <td>${coverage.total?.statements?.total || 0}</td>
              <td>${(coverage.total?.statements?.pct || 0).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  async generateMarkdownReport() {
    this.log('Generating Markdown report...', 'progress');
    
    const markdownContent = this.createMarkdownContent();
    const outputPath = path.join(process.cwd(), this.options.outputDir, 'test-report.md');
    
    try {
      await fs.writeFile(outputPath, markdownContent, 'utf8');
      this.log(`Markdown report generated: ${outputPath}`, 'success');
      return outputPath;
    } catch (error) {
      this.log(`Failed to generate Markdown report: ${error.message}`, 'error');
      throw error;
    }
  }

  createMarkdownContent() {
    const { testResults, coverage, buildInfo, timestamp } = this.reportData;
    
    return `# ${buildInfo.name} Test Report

**Generated:** ${new Date(timestamp).toLocaleString()}  
**Version:** ${buildInfo.version}  
**Branch:** ${buildInfo.git.branch || 'Unknown'}  
**Commit:** ${buildInfo.git.commit ? buildInfo.git.commit.substring(0, 8) : 'Unknown'}

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | ${testResults.summary?.totalTests || 0} | - |
| Passed | ${testResults.summary?.passedTests || 0} | ${testResults.summary?.passedTests > 0 ? '✅' : '⚪'} |
| Failed | ${testResults.summary?.failedTests || 0} | ${testResults.summary?.failedTests === 0 ? '✅' : '❌'} |
| Skipped | ${testResults.summary?.skippedTests || 0} | ${testResults.summary?.skippedTests === 0 ? '✅' : '⚠️'} |
| Pass Rate | ${(testResults.summary?.passRate || 0).toFixed(1)}% | ${testResults.summary?.passRate >= 90 ? '✅' : testResults.summary?.passRate >= 70 ? '⚠️' : '❌'} |
| Execution Time | ${((testResults.summary?.executionTime || 0) / 1000).toFixed(1)}s | - |

## Coverage

${coverage ? `| Type | Coverage | Status |
|------|----------|--------|
| Lines | ${(coverage.total?.lines?.pct || 0).toFixed(1)}% | ${coverage.total?.lines?.pct >= 80 ? '✅' : coverage.total?.lines?.pct >= 60 ? '⚠️' : '❌'} |
| Functions | ${(coverage.total?.functions?.pct || 0).toFixed(1)}% | ${coverage.total?.functions?.pct >= 80 ? '✅' : coverage.total?.functions?.pct >= 60 ? '⚠️' : '❌'} |
| Branches | ${(coverage.total?.branches?.pct || 0).toFixed(1)}% | ${coverage.total?.branches?.pct >= 80 ? '✅' : coverage.total?.branches?.pct >= 60 ? '⚠️' : '❌'} |
| Statements | ${(coverage.total?.statements?.pct || 0).toFixed(1)}% | ${coverage.total?.statements?.pct >= 80 ? '✅' : coverage.total?.statements?.pct >= 60 ? '⚠️' : '❌'} |` : 'No coverage data available.'}

## Test Results

${this.generateTestSuitesMarkdown(testResults.testSuites || [])}

## Environment

- **CI Mode:** ${this.options.ci ? 'Yes' : 'No'}
- **Node Version:** ${process.version}
- **Platform:** ${process.platform}
- **Overall Result:** ${testResults.overallResult || 'UNKNOWN'}

---
*Report generated by ScholarFinder Test Reporting System*
`;
  }

  generateTestSuitesMarkdown(testSuites) {
    if (!testSuites || testSuites.length === 0) {
      return 'No test suites found.';
    }
    
    return testSuites.map(suite => `
### ${suite.name || 'Unknown Suite'}

- **Status:** ${suite.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${suite.duration || 0}ms
- **Tests:** ${suite.tests ? suite.tests.length : 0}

${suite.tests && suite.tests.length > 0 ? `
| Test Name | Status | Duration |
|-----------|--------|----------|
${suite.tests.map(test => `| ${test.name || 'Unknown'} | ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚪'} ${(test.status || 'unknown').toUpperCase()} | ${test.duration || 0}ms |`).join('\n')}
` : 'No test details available.'}
    `).join('');
  }

  async generateJsonReport() {
    this.log('Generating JSON report...', 'progress');
    
    const outputPath = path.join(process.cwd(), this.options.outputDir, 'test-report.json');
    
    try {
      await fs.writeFile(outputPath, JSON.stringify(this.reportData, null, 2), 'utf8');
      this.log(`JSON report generated: ${outputPath}`, 'success');
      return outputPath;
    } catch (error) {
      this.log(`Failed to generate JSON report: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateReports() {
    const generatedReports = [];
    
    try {
      if (this.options.format === 'all' || this.options.format === 'html') {
        const htmlPath = await this.generateHtmlReport();
        generatedReports.push({ format: 'html', path: htmlPath });
      }
      
      if (this.options.format === 'all' || this.options.format === 'markdown') {
        const markdownPath = await this.generateMarkdownReport();
        generatedReports.push({ format: 'markdown', path: markdownPath });
      }
      
      if (this.options.format === 'all' || this.options.format === 'json') {
        const jsonPath = await this.generateJsonReport();
        generatedReports.push({ format: 'json', path: jsonPath });
      }
      
      return generatedReports;
    } catch (error) {
      this.log(`Report generation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async run() {
    try {
      this.log('🚀 Starting test report generation', 'info');
      
      // Ensure output directory exists
      await this.ensureOutputDirectory();
      
      // Collect test results and coverage data
      await this.collectTestResults();
      
      // Generate reports
      const reports = await this.generateReports();
      
      // Calculate total time
      const totalTime = Date.now() - this.startTime;
      
      // Print summary
      this.log(`✅ Report generation completed in ${totalTime}ms`, 'success');
      
      if (!this.options.silent) {
        console.log('\n📊 Generated Reports:');
        reports.forEach(report => {
          console.log(`  📄 ${report.format.toUpperCase()}: ${report.path}`);
        });
        console.log('');
      }
      
      // Return success for CI/CD
      return {
        success: true,
        reports,
        duration: totalTime
      };
      
    } catch (error) {
      this.log(`❌ Report generation failed: ${error.message}`, 'error');
      
      if (this.options.ci) {
        // In CI mode, we want to fail gracefully but not break the build
        console.error('Report generation failed in CI mode, but continuing...');
        return {
          success: false,
          error: error.message,
          duration: Date.now() - this.startTime
        };
      }
      
      throw error;
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ci: args.includes('--ci') || process.env.CI === 'true',
    format: 'all',
    verbose: args.includes('--verbose'),
    silent: args.includes('--silent'),
    outputDir: 'test-reports'
  };
  
  // Parse format option
  const formatArg = args.find(arg => arg.startsWith('--format='));
  if (formatArg) {
    options.format = formatArg.split('=')[1];
  }
  
  // Parse output directory
  const outputArg = args.find(arg => arg.startsWith('--output='));
  if (outputArg) {
    options.outputDir = outputArg.split('=')[1];
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const generator = new TestReportGenerator(options);
  
  generator.run()
    .then(result => {
      if (options.ci && !result.success) {
        // Exit with 0 in CI to not break the build, but log the failure
        console.log('Report generation failed but not breaking CI build');
        process.exit(0);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Test report generation failed:', error.message);
      if (options.ci) {
        // In CI, don't break the build for report generation failures
        process.exit(0);
      } else {
        process.exit(1);
      }
    });
}

module.exports = { TestReportGenerator };