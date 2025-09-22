# Test Reporting Configuration Guide

## Overview

The ScholarFinder automated test reporting system provides extensive configuration options to customize report generation, formatting, and integration with your development workflow.

## Configuration File

The main configuration is handled through `test-reporting.config.js` in the project root:

```javascript
module.exports = {
  // Basic Configuration
  outputDir: './test-reports',
  formats: ['html', 'markdown'],
  includeCoverage: true,
  includePerformanceMetrics: true,
  
  // Environment-specific settings
  environment: {
    development: {
      verbose: true,
      includeDebugInfo: true
    },
    production: {
      verbose: false,
      includeDebugInfo: false
    },
    ci: {
      exitOnFailure: true,
      generateArtifacts: true
    }
  },
  
  // HTML Report Configuration
  htmlTemplate: {
    title: 'ScholarFinder Test Report',
    theme: 'modern', // 'modern', 'classic', 'minimal'
    includeCharts: true,
    collapsibleSections: true,
    showProgressBars: true,
    customCSS: './custom-styles.css', // Optional
    favicon: './assets/favicon.ico' // Optional
  },
  
  // Markdown Report Configuration
  markdownOptions: {
    includeEmojis: true,
    detailedFailures: true,
    performanceMetrics: true,
    tableOfContents: true,
    codeBlocks: true,
    linkToFiles: true
  },
  
  // Coverage Configuration
  coverage: {
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    includeUncoveredFiles: true,
    reportFormats: ['html', 'text', 'lcov']
  },
  
  // Performance Metrics
  performance: {
    trackMemoryUsage: true,
    trackExecutionTime: true,
    slowTestThreshold: 5000, // ms
    includeSystemInfo: true
  },
  
  // Notification Settings
  notifications: {
    onFailure: {
      enabled: true,
      webhook: process.env.SLACK_WEBHOOK_URL,
      email: process.env.NOTIFICATION_EMAIL
    },
    onSuccess: {
      enabled: false
    }
  },
  
  // File Management
  fileManagement: {
    maxReportHistory: 10,
    cleanupOldReports: true,
    archiveReports: true,
    compressionLevel: 6
  }
};
```

## Environment Variables

Override configuration using environment variables:

```bash
# Report generation
TEST_REPORT_OUTPUT_DIR=./custom-reports
TEST_REPORT_FORMATS=html,markdown,json
TEST_REPORT_INCLUDE_COVERAGE=true

# HTML customization
TEST_REPORT_HTML_THEME=modern
TEST_REPORT_HTML_TITLE="Custom Test Report"
TEST_REPORT_HTML_INCLUDE_CHARTS=true

# Performance settings
TEST_REPORT_TRACK_PERFORMANCE=true
TEST_REPORT_SLOW_TEST_THRESHOLD=3000

# CI/CD settings
TEST_REPORT_CI_MODE=true
TEST_REPORT_EXIT_ON_FAILURE=true
TEST_REPORT_GENERATE_ARTIFACTS=true

# Debug settings
DEBUG_TEST_REPORTING=true
TEST_REPORT_VERBOSE=true
```

## Theme Customization

### Built-in Themes

1. **Modern Theme** (default)
   - Clean, responsive design
   - Interactive charts and graphs
   - Collapsible sections
   - Progress indicators

2. **Classic Theme**
   - Traditional table-based layout
   - Minimal JavaScript
   - High contrast colors
   - Print-friendly

3. **Minimal Theme**
   - Lightweight design
   - Fast loading
   - Essential information only
   - Mobile-optimized

### Custom CSS

Create a custom stylesheet and reference it in your configuration:

```css
/* custom-styles.css */
:root {
  --primary-color: #your-brand-color;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}

.test-report-header {
  background: linear-gradient(135deg, var(--primary-color), #667eea);
  color: white;
  padding: 2rem;
  border-radius: 8px;
}

.test-suite-card {
  border-left: 4px solid var(--primary-color);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

## Integration Examples

### GitHub Actions

```yaml
name: Test and Report
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with reporting
        run: npm run test:ci
        env:
          TEST_REPORT_CI_MODE: true
          TEST_REPORT_GENERATE_ARTIFACTS: true
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: test-reports/
          retention-days: 30
      
      - name: Comment PR with results
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const reportPath = 'test-reports/comprehensive-test-report.md';
            if (fs.existsSync(reportPath)) {
              const report = fs.readFileSync(reportPath, 'utf8');
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## Test Results\n\n${report}`
              });
            }
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm run test:ci'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'test-reports',
                        reportFiles: 'test-report.html',
                        reportName: 'Test Report'
                    ])
                    
                    archiveArtifacts artifacts: 'test-reports/**/*', fingerprint: true
                }
            }
        }
    }
}
```

### Docker Integration

```dockerfile
# Dockerfile.test
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Run tests and generate reports
RUN npm run test:ci

# Copy reports to output volume
VOLUME ["/app/test-reports"]
CMD ["npm", "run", "test:watch"]
```

## Advanced Configuration

### Custom Report Templates

Create custom Handlebars templates for HTML reports:

```handlebars
<!-- custom-template.hbs -->
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <style>
        /* Your custom styles */
    </style>
</head>
<body>
    <header class="report-header">
        <h1>{{title}}</h1>
        <div class="summary">
            <span class="total">{{totalTests}} tests</span>
            <span class="passed">{{passedTests}} passed</span>
            <span class="failed">{{failedTests}} failed</span>
        </div>
    </header>
    
    <main>
        {{#each testSuites}}
        <section class="test-suite">
            <h2>{{name}}</h2>
            <div class="tests">
                {{#each tests}}
                <div class="test {{status}}">
                    <h3>{{title}}</h3>
                    {{#if error}}
                    <pre class="error">{{error}}</pre>
                    {{/if}}
                </div>
                {{/each}}
            </div>
        </section>
        {{/each}}
    </main>
</body>
</html>
```

### Plugin System

Extend functionality with custom plugins:

```javascript
// plugins/slack-notifier.js
class SlackNotifierPlugin {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }
  
  async onTestComplete(results) {
    if (results.failed > 0) {
      await this.sendSlackMessage({
        text: `❌ Tests failed: ${results.failed}/${results.total}`,
        color: 'danger'
      });
    }
  }
  
  async sendSlackMessage(message) {
    // Slack API implementation
  }
}

// test-reporting.config.js
module.exports = {
  plugins: [
    new SlackNotifierPlugin(process.env.SLACK_WEBHOOK_URL)
  ]
};
```

## Troubleshooting

### Common Configuration Issues

1. **Invalid JSON in config file**
   ```bash
   # Validate configuration
   node -e "console.log(require('./test-reporting.config.js'))"
   ```

2. **Missing template files**
   ```bash
   # Check template paths
   ls -la templates/
   ```

3. **Permission issues**
   ```bash
   # Fix permissions
   chmod -R 755 test-reports/
   ```

4. **Memory issues with large test suites**
   ```javascript
   // Increase Node.js memory limit
   "scripts": {
     "test:ci": "node --max-old-space-size=4096 ./node_modules/.bin/vitest"
   }
   ```

### Debug Mode

Enable comprehensive debugging:

```bash
DEBUG=test-reporting:* npm run test:all
```

This will output detailed information about:
- Configuration loading
- Template processing
- Report generation steps
- File operations
- Performance metrics

## Best Practices

1. **Version Control**: Don't commit generated reports to version control
2. **CI/CD**: Use environment-specific configurations
3. **Performance**: Enable report caching for large test suites
4. **Security**: Don't include sensitive data in reports
5. **Maintenance**: Regularly clean up old report files

## Migration Guide

### From v1.x to v2.x

1. Update configuration file format:
   ```javascript
   // Old format
   module.exports = {
     outputPath: './reports'
   };
   
   // New format
   module.exports = {
     outputDir: './test-reports'
   };
   ```

2. Update npm scripts:
   ```json
   {
     "scripts": {
       "test:report": "npm run test && npm run generate-report"
     }
   }
   ```

3. Update template references:
   ```javascript
   // Old
   htmlTemplate: './templates/report.html'
   
   // New
   htmlTemplate: {
     templatePath: './templates/report.hbs'
   }
   ```