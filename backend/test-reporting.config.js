/**
 * Test Reporting Configuration
 * 
 * This file contains configuration options for the automated test reporting system.
 * Settings can be overridden via environment variables for CI/CD environments.
 * 
 * Configuration Loading Order (later sources override earlier ones):
 * 1. Default configuration (built-in)
 * 2. This project configuration file
 * 3. package.json "testReporting" section
 * 4. Environment variables
 * 
 * Environment Variables:
 * - TEST_REPORTING_ENABLED: Enable/disable reporting (default: true)
 * - TEST_REPORTS_DIR: Output directory (default: test-reports)
 * - GENERATE_HTML_REPORTS: Generate HTML reports (default: true)
 * - GENERATE_MARKDOWN_REPORTS: Generate Markdown reports (default: true)
 * - GENERATE_JSON_REPORTS: Generate JSON reports (default: false)
 * - PROJECT_NAME: Project name for reports (default: ScholarFinder Backend)
 * - HTML_THEME: HTML report theme - light|dark|auto (default: light)
 * - HTML_CUSTOM_CSS: Path to custom CSS file
 * - HTML_CUSTOM_JS: Path to custom JavaScript file
 * - HTML_INCLUDE_CHARTS: Include charts in HTML reports (default: true)
 * - HTML_INCLUDE_INTERACTIVE: Include interactive features (default: true)
 * - MARKDOWN_INCLUDE_EMOJIS: Include emojis in markdown (default: true)
 * - MARKDOWN_INCLUDE_STACK_TRACES: Include stack traces (default: true in dev)
 * - MARKDOWN_MAX_FAILURE_DETAILS: Max failure details to show (default: 10)
 * - AUTO_GENERATE_REPORTS: Auto-generate after tests (default: true)
 * - FAIL_ON_REPORT_ERROR: Fail build on report error (default: false)
 * - CI: CI mode detection (default: false)
 * - CI_GENERATE_REPORTS: Generate reports in CI (default: true)
 * - CI_UPLOAD_REPORTS: Upload reports as artifacts (default: false)
 * - CI_FAIL_ON_REPORT_ERROR: Fail CI on report error (default: false)
 * - MAX_REPORT_GENERATION_TIME: Max generation time in ms (default: 30000)
 * - PARALLEL_REPORT_GENERATION: Generate reports in parallel (default: true)
 * - MAX_REPORT_MEMORY: Memory limit (default: 100MB)
 * - REPORT_RETRY_ON_FAILURE: Retry on failure (default: true)
 * - REPORT_MAX_RETRIES: Max retry attempts (default: 2)
 * - REPORT_VERBOSE_ERRORS: Verbose error logging (default: false in prod)
 */

module.exports = {
  // General reporting settings
  enabled: process.env.TEST_REPORTING_ENABLED !== 'false',
  
  // Output configuration
  outputDirectory: process.env.TEST_REPORTS_DIR || 'test-reports',
  
  // Report formats to generate
  formats: {
    html: process.env.GENERATE_HTML_REPORTS !== 'false',
    markdown: process.env.GENERATE_MARKDOWN_REPORTS !== 'false',
    json: process.env.GENERATE_JSON_REPORTS === 'true' // Default to false for JSON
  },
  
  // HTML report configuration
  html: {
    title: process.env.PROJECT_NAME || 'ScholarFinder Backend Test Report',
    includeCharts: process.env.HTML_INCLUDE_CHARTS !== 'false',
    includeInteractiveFeatures: process.env.HTML_INCLUDE_INTERACTIVE !== 'false',
    theme: process.env.HTML_THEME || 'light', // 'light', 'dark', or 'auto'
    customCss: process.env.HTML_CUSTOM_CSS || null, // Path to custom CSS file
    customJs: process.env.HTML_CUSTOM_JS || null,   // Path to custom JavaScript file
    templatePath: process.env.HTML_TEMPLATE_PATH || null // Path to custom HTML template
  },
  
  // Markdown report configuration
  markdown: {
    includeEmojis: process.env.MARKDOWN_INCLUDE_EMOJIS !== 'false',
    includeStackTraces: process.env.MARKDOWN_INCLUDE_STACK_TRACES !== 'false' && process.env.NODE_ENV !== 'production',
    maxFailureDetails: parseInt(process.env.MARKDOWN_MAX_FAILURE_DETAILS) || 10,
    includeEnvironmentInfo: process.env.MARKDOWN_INCLUDE_ENV_INFO !== 'false',
    templatePath: process.env.MARKDOWN_TEMPLATE_PATH || null // Path to custom Markdown template
  },
  
  // JSON report configuration
  json: {
    pretty: process.env.NODE_ENV !== 'production',
    includeRawData: process.env.INCLUDE_RAW_TEST_DATA === 'true',
    includeMetadata: process.env.INCLUDE_JSON_METADATA !== 'false'
  },
  
  // Build integration settings
  buildIntegration: {
    // Whether to run reports automatically after tests
    autoGenerate: process.env.AUTO_GENERATE_REPORTS !== 'false',
    
    // Whether to fail the build if report generation fails
    failOnReportError: process.env.FAIL_ON_REPORT_ERROR === 'true',
    
    // CI/CD specific settings
    ci: {
      // Whether we're running in CI mode
      enabled: process.env.CI === 'true',
      
      // Whether to generate reports in CI
      generateReports: process.env.CI_GENERATE_REPORTS !== 'false',
      
      // Whether to upload reports as artifacts
      uploadArtifacts: process.env.CI_UPLOAD_REPORTS === 'true',
      
      // Exit codes
      exitCodes: {
        success: 0,
        testFailure: 1,
        reportFailure: process.env.CI_FAIL_ON_REPORT_ERROR === 'true' ? 1 : 0
      }
    }
  },
  
  // Performance settings
  performance: {
    // Maximum time to spend generating reports (in milliseconds)
    maxGenerationTime: parseInt(process.env.MAX_REPORT_GENERATION_TIME) || 30000,
    
    // Whether to generate reports in parallel
    parallelGeneration: process.env.PARALLEL_REPORT_GENERATION !== 'false',
    
    // Memory limits
    maxMemoryUsage: process.env.MAX_REPORT_MEMORY || '100MB'
  },
  
  // Error handling configuration
  errorHandling: {
    // Whether to retry failed report generation
    retryOnFailure: process.env.REPORT_RETRY_ON_FAILURE !== 'false',
    
    // Number of retry attempts
    maxRetries: parseInt(process.env.REPORT_MAX_RETRIES) || 2,
    
    // Whether to generate partial reports on failure
    generatePartialReports: process.env.REPORT_GENERATE_PARTIAL !== 'false',
    
    // Whether to log detailed error information
    verboseErrors: process.env.REPORT_VERBOSE_ERRORS === 'true' || process.env.NODE_ENV !== 'production'
  },
  
  // Coverage settings
  coverage: {
    // Minimum coverage thresholds for status indicators
    thresholds: {
      excellent: parseInt(process.env.COVERAGE_THRESHOLD_EXCELLENT) || 90,
      good: parseInt(process.env.COVERAGE_THRESHOLD_GOOD) || 80,
      acceptable: parseInt(process.env.COVERAGE_THRESHOLD_ACCEPTABLE) || 60
    },
    
    // Whether to include coverage in reports
    includeInReports: process.env.COVERAGE_INCLUDE_IN_REPORTS !== 'false',
    
    // Coverage types to track
    types: process.env.COVERAGE_TYPES?.split(',') || ['lines', 'functions', 'branches', 'statements']
  },
  
  // Test categorization
  testCategories: {
    unit: {
      pattern: process.env.UNIT_TEST_PATTERN || 'unit',
      displayName: 'Unit Tests',
      color: '#10b981'
    },
    integration: {
      pattern: process.env.INTEGRATION_TEST_PATTERN || 'integration',
      displayName: 'Integration Tests',
      color: '#3b82f6'
    },
    e2e: {
      pattern: process.env.E2E_TEST_PATTERN || 'e2e',
      displayName: 'End-to-End Tests',
      color: '#8b5cf6'
    },
    performance: {
      pattern: process.env.PERFORMANCE_TEST_PATTERN || 'performance',
      displayName: 'Performance Tests',
      color: '#f59e0b'
    }
  },
  
  // Notification settings (for future extension)
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
    channels: {
      slack: {
        enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
        webhook: process.env.SLACK_WEBHOOK_URL || null
      },
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
        recipients: process.env.REPORT_EMAIL_RECIPIENTS?.split(',') || []
      }
    }
  }
};