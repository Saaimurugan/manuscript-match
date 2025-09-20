/**
 * Jest Reporter Configuration
 * 
 * Configuration options for the custom Jest reporter that generates
 * automated test reports in multiple formats.
 */

module.exports = {
  // Output directory for generated reports
  outputDirectory: process.env.TEST_REPORTS_DIR || 'test-reports',
  
  // Report format options
  generateHtml: process.env.GENERATE_HTML_REPORT !== 'false',
  generateMarkdown: process.env.GENERATE_MARKDOWN_REPORT !== 'false', 
  generateJson: process.env.GENERATE_JSON_REPORT !== 'false',
  
  // Behavior options
  verbose: process.env.NODE_ENV !== 'production' && process.env.JEST_REPORTER_VERBOSE !== 'false',
  onlyOnFailure: process.env.JEST_REPORTER_ONLY_ON_FAILURE === 'true',
  includeConsoleOutput: process.env.JEST_REPORTER_INCLUDE_CONSOLE !== 'false',
  
  // Report customization
  reportTitle: process.env.JEST_REPORT_TITLE || 'ScholarFinder Backend Test Report',
  includeCharts: process.env.JEST_REPORT_INCLUDE_CHARTS !== 'false',
  theme: process.env.JEST_REPORT_THEME || 'light',
  
  // Performance options
  slowTestThreshold: parseInt(process.env.JEST_SLOW_TEST_THRESHOLD || '1000', 10),
  maxFailureDetails: parseInt(process.env.JEST_MAX_FAILURE_DETAILS || '10', 10),
  
  // CI/CD specific options
  ciMode: !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL
  ),
  
  // File naming patterns
  htmlReportName: process.env.JEST_HTML_REPORT_NAME || 'test-report.html',
  markdownReportName: process.env.JEST_MARKDOWN_REPORT_NAME || 'test-report.md',
  jsonReportName: process.env.JEST_JSON_REPORT_NAME || 'test-results.json'
};