# Test Reporting Configuration Guide

This guide explains how to configure the automated test reporting system for the ScholarFinder backend.

## Configuration Overview

The test reporting system uses a hierarchical configuration approach where settings are loaded and merged from multiple sources in the following order (later sources override earlier ones):

1. **Default configuration** (built-in)
2. **Project configuration file** (`test-reporting.config.js`)
3. **Package.json configuration** (`testReporting` section)
4. **Environment variables**

## Configuration File

Create a `test-reporting.config.js` file in your project root:

```javascript
module.exports = {
  // Enable/disable test reporting
  enabled: true,
  
  // Output directory for reports
  outputDirectory: 'test-reports',
  
  // Report formats to generate
  formats: {
    html: true,      // Interactive HTML reports
    markdown: true,  // Markdown reports for documentation
    json: false      // JSON reports for programmatic use
  },
  
  // HTML report configuration
  html: {
    title: 'My Project Test Report',
    includeCharts: true,
    includeInteractiveFeatures: true,
    theme: 'light', // 'light', 'dark', or 'auto'
    customCss: null, // Path to custom CSS file
    customJs: null,  // Path to custom JavaScript file
    templatePath: null // Path to custom Handlebars template
  },
  
  // Markdown report configuration
  markdown: {
    includeEmojis: true,
    includeStackTraces: true,
    maxFailureDetails: 10,
    includeEnvironmentInfo: true,
    templatePath: null // Path to custom Handlebars template
  },
  
  // JSON report configuration
  json: {
    pretty: true,
    includeRawData: false,
    includeMetadata: true
  },
  
  // Build integration settings
  buildIntegration: {
    autoGenerate: true,
    failOnReportError: false,
    ci: {
      enabled: false,
      generateReports: true,
      uploadArtifacts: false,
      exitCodes: {
        success: 0,
        testFailure: 1,
        reportFailure: 0
      }
    }
  },
  
  // Performance settings
  performance: {
    maxGenerationTime: 30000, // 30 seconds
    parallelGeneration: true,
    maxMemoryUsage: '100MB'
  },
  
  // Error handling
  errorHandling: {
    retryOnFailure: true,
    maxRetries: 2,
    generatePartialReports: true,
    verboseErrors: false
  },
  
  // Coverage settings
  coverage: {
    thresholds: {
      excellent: 90,
      good: 80,
      acceptable: 60
    },
    includeInReports: true,
    types: ['lines', 'functions', 'branches', 'statements']
  },
  
  // Test categorization
  testCategories: {
    unit: {
      pattern: 'unit',
      displayName: 'Unit Tests',
      color: '#10b981'
    },
    integration: {
      pattern: 'integration',
      displayName: 'Integration Tests',
      color: '#3b82f6'
    },
    e2e: {
      pattern: 'e2e',
      displayName: 'End-to-End Tests',
      color: '#8b5cf6'
    },
    performance: {
      pattern: 'performance',
      displayName: 'Performance Tests',
      color: '#f59e0b'
    }
  },
  
  // Notification settings (future feature)
  notifications: {
    enabled: false,
    channels: {
      slack: {
        enabled: false,
        webhook: null
      },
      email: {
        enabled: false,
        recipients: []
      }
    }
  }
};
```

## Package.json Configuration

You can also configure test reporting in your `package.json`:

```json
{
  "name": "my-project",
  "testReporting": {
    "enabled": true,
    "outputDirectory": "reports",
    "formats": {
      "html": true,
      "markdown": false
    }
  }
}
```

## Environment Variables

All configuration options can be overridden using environment variables:

### General Settings
- `TEST_REPORTING_ENABLED`: Enable/disable reporting (default: `true`)
- `TEST_REPORTS_DIR`: Output directory (default: `test-reports`)

### Report Formats
- `GENERATE_HTML_REPORTS`: Generate HTML reports (default: `true`)
- `GENERATE_MARKDOWN_REPORTS`: Generate Markdown reports (default: `true`)
- `GENERATE_JSON_REPORTS`: Generate JSON reports (default: `false`)

### HTML Report Settings
- `PROJECT_NAME`: Project name for reports
- `HTML_THEME`: HTML report theme - `light|dark|auto` (default: `light`)
- `HTML_CUSTOM_CSS`: Path to custom CSS file
- `HTML_CUSTOM_JS`: Path to custom JavaScript file
- `HTML_INCLUDE_CHARTS`: Include charts in HTML reports (default: `true`)
- `HTML_INCLUDE_INTERACTIVE`: Include interactive features (default: `true`)

### Markdown Report Settings
- `MARKDOWN_INCLUDE_EMOJIS`: Include emojis in markdown (default: `true`)
- `MARKDOWN_INCLUDE_STACK_TRACES`: Include stack traces (default: `true` in dev)
- `MARKDOWN_MAX_FAILURE_DETAILS`: Max failure details to show (default: `10`)

### Build Integration
- `AUTO_GENERATE_REPORTS`: Auto-generate after tests (default: `true`)
- `FAIL_ON_REPORT_ERROR`: Fail build on report error (default: `false`)

### CI/CD Settings
- `CI`: CI mode detection (default: `false`)
- `CI_GENERATE_REPORTS`: Generate reports in CI (default: `true`)
- `CI_UPLOAD_REPORTS`: Upload reports as artifacts (default: `false`)
- `CI_FAIL_ON_REPORT_ERROR`: Fail CI on report error (default: `false`)

### Performance Settings
- `MAX_REPORT_GENERATION_TIME`: Max generation time in ms (default: `30000`)
- `PARALLEL_REPORT_GENERATION`: Generate reports in parallel (default: `true`)
- `MAX_REPORT_MEMORY`: Memory limit (default: `100MB`)

### Error Handling
- `REPORT_RETRY_ON_FAILURE`: Retry on failure (default: `true`)
- `REPORT_MAX_RETRIES`: Max retry attempts (default: `2`)
- `REPORT_VERBOSE_ERRORS`: Verbose error logging (default: `false` in prod)

### Coverage Settings
- `COVERAGE_THRESHOLD_EXCELLENT`: Excellent coverage threshold (default: `90`)
- `COVERAGE_THRESHOLD_GOOD`: Good coverage threshold (default: `80`)
- `COVERAGE_THRESHOLD_ACCEPTABLE`: Acceptable coverage threshold (default: `60`)

## Custom Templates

You can customize the appearance of your reports by providing custom Handlebars templates.

### HTML Template

Create a custom HTML template file and reference it in your configuration:

```javascript
module.exports = {
  html: {
    templatePath: './templates/custom-report.hbs'
  }
};
```

Your template has access to the following context:

```javascript
{
  projectName: 'Project Name',
  timestamp: '2024-01-01T12:00:00Z',
  buildInfo: {
    version: '1.0.0',
    environment: 'production'
  },
  summary: {
    totalTests: 100,
    passedTests: 95,
    failedTests: 5,
    skippedTests: 0,
    passRate: 95,
    executionTime: 5000
  },
  testSuites: [...],
  coverage: {...},
  performance: {...},
  environment: {...}
}
```

### Markdown Template

Similarly, create a custom Markdown template:

```javascript
module.exports = {
  markdown: {
    templatePath: './templates/custom-report.md'
  }
};
```

### Available Handlebars Helpers

The following helpers are available in your templates:

- `{{formatNumber value decimals}}` - Format numbers with specified decimal places
- `{{formatDuration ms}}` - Format milliseconds as human-readable duration
- `{{capitalize string}}` - Capitalize first letter
- `{{truncate string length}}` - Truncate string to specified length
- `{{coverageStatus percentage}}` - Get emoji status for coverage percentage
- `{{#if (gt a b)}}` - Greater than comparison
- `{{#if (gte a b)}}` - Greater than or equal comparison
- `{{#if (eq a b)}}` - Equality comparison

## CI/CD Integration

### GitHub Actions

```yaml
name: Test and Report
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm test
        env:
          CI: true
          CI_GENERATE_REPORTS: true
          CI_UPLOAD_REPORTS: true
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: test-reports/
```

### GitLab CI

```yaml
test:
  stage: test
  script:
    - npm ci
    - npm test
  variables:
    CI: "true"
    CI_GENERATE_REPORTS: "true"
  artifacts:
    when: always
    paths:
      - test-reports/
    reports:
      junit: test-reports/test-report.xml
```

## Troubleshooting

### Common Issues

1. **Reports not generating**
   - Check that `TEST_REPORTING_ENABLED` is not set to `false`
   - Verify the output directory is writable
   - Check for configuration validation errors in the console

2. **Custom templates not loading**
   - Ensure the template file path is correct and accessible
   - Check file permissions
   - Verify the template syntax is valid Handlebars

3. **Memory issues with large test suites**
   - Increase `MAX_REPORT_MEMORY` environment variable
   - Enable `PARALLEL_REPORT_GENERATION=false` to reduce memory usage
   - Consider generating only essential report formats

4. **Slow report generation**
   - Enable parallel generation: `PARALLEL_REPORT_GENERATION=true`
   - Reduce `MARKDOWN_MAX_FAILURE_DETAILS` for faster processing
   - Disable charts in HTML reports: `HTML_INCLUDE_CHARTS=false`

### Debug Mode

Enable verbose error logging for troubleshooting:

```bash
REPORT_VERBOSE_ERRORS=true npm test
```

### Configuration Validation

You can validate your configuration without running tests:

```javascript
const { ConfigManager } = require('./src/test-reporting/config');

async function validateConfig() {
  try {
    const result = await ConfigManager.validateConfig();
    if (result.success) {
      console.log('Configuration is valid');
      if (result.warnings) {
        console.warn('Warnings:', result.warnings);
      }
    } else {
      console.error('Configuration errors:', result.errors);
    }
  } catch (error) {
    console.error('Validation failed:', error.message);
  }
}

validateConfig();
```

## Examples

### Minimal Configuration

```javascript
module.exports = {
  formats: {
    html: true,
    markdown: false,
    json: false
  }
};
```

### CI-Optimized Configuration

```javascript
module.exports = {
  formats: {
    html: process.env.CI !== 'true',
    markdown: true,
    json: true
  },
  html: {
    includeCharts: false, // Faster generation
    includeInteractiveFeatures: false
  },
  markdown: {
    maxFailureDetails: 5 // Shorter reports
  },
  performance: {
    maxGenerationTime: 15000, // Faster timeout
    parallelGeneration: true
  }
};
```

### Development Configuration

```javascript
module.exports = {
  formats: {
    html: true,
    markdown: true,
    json: false
  },
  html: {
    theme: 'dark',
    includeCharts: true,
    includeInteractiveFeatures: true
  },
  markdown: {
    includeStackTraces: true,
    maxFailureDetails: 20
  },
  errorHandling: {
    verboseErrors: true
  }
};
```