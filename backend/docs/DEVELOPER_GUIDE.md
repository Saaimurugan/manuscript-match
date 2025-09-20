# Test Reporting Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Extending Report Formats](#extending-report-formats)
3. [Custom Templates](#custom-templates)
4. [Plugin Development](#plugin-development)
5. [Data Processing](#data-processing)
6. [Testing Extensions](#testing-extensions)
7. [Performance Optimization](#performance-optimization)
8. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

### System Components

The test reporting system is built with a modular, extensible architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                Configuration Layer                          │
│         (Config loading, validation, merging)              │
├─────────────────────────────────────────────────────────────┤
│                Data Collection Layer                        │
│    (Jest reporters, result aggregation, metrics)           │
├─────────────────────────────────────────────────────────────┤
│              Processing Layer                               │
│     (Data transformation, filtering, enrichment)           │
├─────────────────────────────────────────────────────────────┤
│              Generation Layer                               │
│    (Template engines, format generators, output)           │
├─────────────────────────────────────────────────────────────┤
│                Integration Layer                            │
│        (Build scripts, CI/CD, file system)                 │
└─────────────────────────────────────────────────────────────┘
```

### Core Interfaces

#### Report Generator Interface

```typescript
interface ReportGenerator {
  /**
   * Generate a report from aggregated test data
   */
  generateReport(data: AggregatedTestData, config: ReportConfig): Promise<GeneratedReport>;
  
  /**
   * Get the output file path for this generator
   */
  getOutputPath(config: ReportConfig): string;
  
  /**
   * Validate configuration specific to this generator
   */
  validateConfig(config: ReportConfig): ValidationResult;
  
  /**
   * Get metadata about this generator
   */
  getMetadata(): GeneratorMetadata;
}

interface GeneratedReport {
  format: ReportFormat;
  filePath: string;
  size: number;
  generationTime: number;
  metadata: Record<string, any>;
}

interface GeneratorMetadata {
  name: string;
  version: string;
  description: string;
  supportedFeatures: string[];
  requiredDependencies: string[];
}
```

#### Data Processor Interface

```typescript
interface DataProcessor {
  /**
   * Process raw Jest results into structured data
   */
  processResults(jestResults: Jest.AggregatedResult): Promise<ProcessedTestData>;
  
  /**
   * Calculate metrics from processed data
   */
  calculateMetrics(data: ProcessedTestData): Promise<TestMetrics>;
  
  /**
   * Enrich data with additional information
   */
  enrichData(data: ProcessedTestData, config: ProcessingConfig): Promise<EnrichedTestData>;
}
```

### File Structure

```
scripts/
├── test-reporting/
│   ├── core/
│   │   ├── config-loader.js          # Configuration management
│   │   ├── data-processor.js         # Test data processing
│   │   ├── report-orchestrator.js    # Report generation coordination
│   │   └── plugin-manager.js         # Plugin loading and management
│   ├── generators/
│   │   ├── base-generator.js         # Base generator class
│   │   ├── html-generator.js         # HTML report generator
│   │   ├── markdown-generator.js     # Markdown report generator
│   │   ├── json-generator.js         # JSON report generator
│   │   └── custom/                   # Custom generator directory
│   ├── templates/
│   │   ├── html/
│   │   │   ├── main.hbs             # Main HTML template
│   │   │   ├── partials/            # Reusable template parts
│   │   │   └── assets/              # CSS, JS, images
│   │   ├── markdown/
│   │   │   └── report.md.hbs        # Markdown template
│   │   └── custom/                  # Custom template directory
│   ├── processors/
│   │   ├── jest-processor.js        # Jest result processing
│   │   ├── coverage-processor.js    # Coverage data processing
│   │   ├── performance-processor.js # Performance metrics
│   │   └── custom/                  # Custom processor directory
│   └── utils/
│       ├── file-utils.js            # File system utilities
│       ├── template-utils.js        # Template helpers
│       ├── validation-utils.js      # Configuration validation
│       └── performance-utils.js     # Performance monitoring
```

## Extending Report Formats

### Creating a Custom Report Generator

1. **Create the Generator Class**

```javascript
// scripts/test-reporting/generators/custom/xml-generator.js
const BaseGenerator = require('../base-generator');
const fs = require('fs').promises;
const path = require('path');

class XmlReportGenerator extends BaseGenerator {
  constructor() {
    super();
    this.format = 'xml';
    this.fileExtension = '.xml';
  }

  async generateReport(data, config) {
    const startTime = Date.now();
    
    try {
      // Generate XML content
      const xmlContent = this.generateXmlContent(data, config);
      
      // Write to file
      const outputPath = this.getOutputPath(config);
      await fs.writeFile(outputPath, xmlContent, 'utf8');
      
      const generationTime = Date.now() - startTime;
      const stats = await fs.stat(outputPath);
      
      return {
        format: this.format,
        filePath: outputPath,
        size: stats.size,
        generationTime,
        metadata: {
          xmlVersion: '1.0',
          encoding: 'UTF-8',
          schema: 'test-report-v1.0'
        }
      };
    } catch (error) {
      throw new Error(`XML report generation failed: ${error.message}`);
    }
  }

  generateXmlContent(data, config) {
    const { summary, suiteResults, coverage, metadata } = data;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<testReport xmlns="http://example.com/test-report" version="1.0">
  <metadata>
    <projectName>${metadata.projectName}</projectName>
    <timestamp>${metadata.timestamp}</timestamp>
    <buildId>${metadata.buildId}</buildId>
  </metadata>
  
  <summary>
    <totalTests>${summary.totalTests}</totalTests>
    <passedTests>${summary.passedTests}</passedTests>
    <failedTests>${summary.failedTests}</failedTests>
    <passRate>${summary.passRate}</passRate>
  </summary>
  
  <coverage>
    <lines total="${coverage.overall.lines.total}" covered="${coverage.overall.lines.covered}" percentage="${coverage.overall.lines.percentage}" />
    <functions total="${coverage.overall.functions.total}" covered="${coverage.overall.functions.covered}" percentage="${coverage.overall.functions.percentage}" />
    <branches total="${coverage.overall.branches.total}" covered="${coverage.overall.branches.covered}" percentage="${coverage.overall.branches.percentage}" />
  </coverage>
  
  <testSuites>
    ${suiteResults.map(suite => this.generateSuiteXml(suite)).join('\n    ')}
  </testSuites>
</testReport>`;
  }

  generateSuiteXml(suite) {
    return `<testSuite name="${this.escapeXml(suite.name)}" tests="${suite.tests.length}" failures="${suite.failures}" duration="${suite.duration}">
      ${suite.tests.map(test => this.generateTestXml(test)).join('\n      ')}
    </testSuite>`;
  }

  generateTestXml(test) {
    const status = test.status === 'passed' ? 'success' : 'failure';
    return `<testCase name="${this.escapeXml(test.name)}" status="${status}" duration="${test.duration}">
      ${test.errorMessage ? `<failure message="${this.escapeXml(test.errorMessage)}" />` : ''}
    </testCase>`;
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getOutputPath(config) {
    return path.join(config.outputDirectory, `test-report${this.fileExtension}`);
  }

  validateConfig(config) {
    const errors = [];
    
    if (!config.outputDirectory) {
      errors.push('outputDirectory is required');
    }
    
    if (config.xml && config.xml.schema && !this.isValidSchema(config.xml.schema)) {
      errors.push('Invalid XML schema specified');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata() {
    return {
      name: 'XML Report Generator',
      version: '1.0.0',
      description: 'Generates XML test reports compatible with CI/CD systems',
      supportedFeatures: ['test-results', 'coverage', 'metadata'],
      requiredDependencies: []
    };
  }
}

module.exports = XmlReportGenerator;
```

2. **Register the Generator**

```javascript
// scripts/test-reporting/generators/generator-registry.js
const HtmlGenerator = require('./html-generator');
const MarkdownGenerator = require('./markdown-generator');
const JsonGenerator = require('./json-generator');
const XmlGenerator = require('./custom/xml-generator');

class GeneratorRegistry {
  constructor() {
    this.generators = new Map();
    this.registerDefaultGenerators();
  }

  registerDefaultGenerators() {
    this.register('html', HtmlGenerator);
    this.register('markdown', MarkdownGenerator);
    this.register('json', JsonGenerator);
    this.register('xml', XmlGenerator);  // Register custom generator
  }

  register(format, GeneratorClass) {
    this.generators.set(format, GeneratorClass);
  }

  create(format) {
    const GeneratorClass = this.generators.get(format);
    if (!GeneratorClass) {
      throw new Error(`Unknown report format: ${format}`);
    }
    return new GeneratorClass();
  }

  getAvailableFormats() {
    return Array.from(this.generators.keys());
  }
}

module.exports = new GeneratorRegistry();
```

3. **Update Configuration Schema**

```javascript
// test-reporting.config.js
module.exports = {
  formats: {
    html: true,
    markdown: true,
    json: false,
    xml: true  // Enable XML reports
  },
  
  // XML-specific configuration
  xml: {
    schema: 'test-report-v1.0',
    includeStackTraces: false,
    prettyPrint: true
  }
};
```

### Creating a Custom Data Processor

```javascript
// scripts/test-reporting/processors/custom/performance-processor.js
class PerformanceProcessor {
  constructor() {
    this.name = 'performance-processor';
    this.version = '1.0.0';
  }

  async processResults(jestResults, config) {
    const performanceData = {
      totalDuration: jestResults.runTime,
      averageTestDuration: this.calculateAverageTestDuration(jestResults),
      slowestTests: this.findSlowestTests(jestResults, 10),
      fastestTests: this.findFastestTests(jestResults, 10),
      performanceByCategory: this.analyzePerformanceByCategory(jestResults),
      memoryUsage: this.extractMemoryUsage(jestResults),
      resourceUtilization: this.calculateResourceUtilization(jestResults)
    };

    return performanceData;
  }

  calculateAverageTestDuration(jestResults) {
    const allTests = jestResults.testResults.flatMap(suite => 
      suite.assertionResults.map(test => test.duration || 0)
    );
    
    return allTests.length > 0 
      ? allTests.reduce((sum, duration) => sum + duration, 0) / allTests.length 
      : 0;
  }

  findSlowestTests(jestResults, limit = 10) {
    const allTests = [];
    
    jestResults.testResults.forEach(suite => {
      suite.assertionResults.forEach(test => {
        if (test.duration) {
          allTests.push({
            name: test.fullName || test.title,
            suiteName: suite.testFilePath,
            duration: test.duration,
            category: this.categorizeTest(suite.testFilePath)
          });
        }
      });
    });

    return allTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  findFastestTests(jestResults, limit = 10) {
    const allTests = [];
    
    jestResults.testResults.forEach(suite => {
      suite.assertionResults.forEach(test => {
        if (test.duration) {
          allTests.push({
            name: test.fullName || test.title,
            suiteName: suite.testFilePath,
            duration: test.duration,
            category: this.categorizeTest(suite.testFilePath)
          });
        }
      });
    });

    return allTests
      .sort((a, b) => a.duration - b.duration)
      .slice(0, limit);
  }

  analyzePerformanceByCategory(jestResults) {
    const categories = {};
    
    jestResults.testResults.forEach(suite => {
      const category = this.categorizeTest(suite.testFilePath);
      
      if (!categories[category]) {
        categories[category] = {
          totalTests: 0,
          totalDuration: 0,
          averageDuration: 0,
          slowestTest: 0,
          fastestTest: Infinity
        };
      }

      suite.assertionResults.forEach(test => {
        if (test.duration) {
          categories[category].totalTests++;
          categories[category].totalDuration += test.duration;
          categories[category].slowestTest = Math.max(categories[category].slowestTest, test.duration);
          categories[category].fastestTest = Math.min(categories[category].fastestTest, test.duration);
        }
      });
    });

    // Calculate averages
    Object.keys(categories).forEach(category => {
      const cat = categories[category];
      cat.averageDuration = cat.totalTests > 0 ? cat.totalDuration / cat.totalTests : 0;
      if (cat.fastestTest === Infinity) cat.fastestTest = 0;
    });

    return categories;
  }

  categorizeTest(filePath) {
    if (filePath.includes('.unit.')) return 'unit';
    if (filePath.includes('.integration.')) return 'integration';
    if (filePath.includes('.e2e.')) return 'e2e';
    if (filePath.includes('.performance.')) return 'performance';
    return 'other';
  }

  extractMemoryUsage(jestResults) {
    // Extract memory usage if available in Jest results
    return {
      peak: process.memoryUsage().heapUsed,
      average: process.memoryUsage().heapUsed * 0.8, // Estimate
      external: process.memoryUsage().external
    };
  }

  calculateResourceUtilization(jestResults) {
    return {
      cpuTime: process.cpuUsage().user + process.cpuUsage().system,
      wallTime: jestResults.runTime,
      efficiency: (process.cpuUsage().user + process.cpuUsage().system) / (jestResults.runTime * 1000)
    };
  }
}

module.exports = PerformanceProcessor;
```

## Custom Templates

### HTML Template Customization

1. **Create Custom Template Structure**

```
templates/custom/html/
├── main.hbs                 # Main template
├── partials/
│   ├── header.hbs          # Header section
│   ├── summary.hbs         # Summary cards
│   ├── coverage.hbs        # Coverage section
│   ├── test-results.hbs    # Test results table
│   └── footer.hbs          # Footer section
├── assets/
│   ├── styles.css          # Custom CSS
│   ├── scripts.js          # Custom JavaScript
│   └── images/             # Custom images
└── config.json             # Template configuration
```

2. **Main Template Example**

```handlebars
<!-- templates/custom/html/main.hbs -->
<!DOCTYPE html>
<html lang="en" data-theme="{{theme}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - Test Report</title>
    <style>
        {{{inlineCSS}}}
    </style>
</head>
<body>
    {{> header}}
    
    <main class="report-content">
        {{> summary}}
        
        {{#if showCoverage}}
            {{> coverage}}
        {{/if}}
        
        {{#if showPerformance}}
            {{> performance}}
        {{/if}}
        
        {{> test-results}}
    </main>
    
    {{> footer}}
    
    <script>
        {{{inlineJS}}}
    </script>
</body>
</html>
```

3. **Custom Template Helpers**

```javascript
// scripts/test-reporting/utils/template-helpers.js
const Handlebars = require('handlebars');

// Register custom helpers
Handlebars.registerHelper('formatDuration', function(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
});

Handlebars.registerHelper('statusIcon', function(status) {
  const icons = {
    passed: '✅',
    failed: '❌',
    skipped: '⏭️',
    todo: '📝'
  };
  return icons[status] || '❓';
});

Handlebars.registerHelper('progressBar', function(percentage, options) {
  const width = Math.min(100, Math.max(0, percentage));
  const colorClass = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'danger';
  
  return new Handlebars.SafeString(`
    <div class="progress-bar ${colorClass}">
      <div class="progress-fill" style="width: ${width}%"></div>
      <span class="progress-text">${percentage.toFixed(1)}%</span>
    </div>
  `);
});

Handlebars.registerHelper('coverageStatus', function(percentage) {
  if (percentage >= 90) return '🟢';
  if (percentage >= 80) return '🟡';
  if (percentage >= 70) return '🟠';
  return '🔴';
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('formatBytes', function(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

Handlebars.registerHelper('truncate', function(str, length) {
  if (str && str.length > length) {
    return str.substring(0, length) + '...';
  }
  return str;
});

module.exports = Handlebars;
```

### Markdown Template Customization

```handlebars
<!-- templates/custom/markdown/report.md.hbs -->
# {{projectName}} Test Report

**Generated:** {{formatDate timestamp}}  
**Build:** {{buildVersion}}  
**Environment:** {{environment}}  
**Duration:** {{formatDuration totalDuration}}

## 📊 Executive Summary

{{#with summary}}
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Tests** | {{totalTests}} | - | - |
| **Pass Rate** | {{formatPercentage passRate}}% | ≥95% | {{#if (gte passRate 95)}}✅{{else}}❌{{/if}} |
| **Coverage** | {{formatPercentage ../coverage.overall.lines.percentage}}% | ≥80% | {{#if (gte ../coverage.overall.lines.percentage 80)}}✅{{else}}❌{{/if}} |
| **Performance** | {{formatDuration averageDuration}} avg | <500ms | {{#if (lt averageDuration 500)}}✅{{else}}❌{{/if}} |
{{/with}}

## 🎯 Quality Gates

{{#each qualityGates}}
### {{name}}
- **Status:** {{statusIcon status}} {{status}}
- **Threshold:** {{threshold}}
- **Actual:** {{actual}}
- **Impact:** {{impact}}

{{/each}}

## 📈 Coverage Analysis

{{#with coverage.overall}}
| Type | Coverage | Files | Status |
|------|----------|-------|--------|
| **Lines** | {{formatPercentage lines.percentage}}% | {{lines.covered}}/{{lines.total}} | {{coverageStatus lines.percentage}} |
| **Functions** | {{formatPercentage functions.percentage}}% | {{functions.covered}}/{{functions.total}} | {{coverageStatus functions.percentage}} |
| **Branches** | {{formatPercentage branches.percentage}}% | {{branches.covered}}/{{branches.total}} | {{coverageStatus branches.percentage}} |
| **Statements** | {{formatPercentage statements.percentage}}% | {{statements.covered}}/{{statements.total}} | {{coverageStatus statements.percentage}} |
{{/with}}

### Coverage by Category

{{#each coverage.byCategory}}
#### {{@key}} Tests
- **Lines:** {{formatPercentage lines}}% {{coverageStatus lines}}
- **Functions:** {{formatPercentage functions}}% {{coverageStatus functions}}
- **Branches:** {{formatPercentage branches}}% {{coverageStatus branches}}

{{/each}}

## 🧪 Test Results

{{#each categories}}
### {{capitalize @key}} Tests

{{#with this}}
- **Total:** {{total}} tests
- **Passed:** {{passed}} tests {{statusIcon "passed"}}
- **Failed:** {{failed}} tests {{#if failed}}{{statusIcon "failed"}}{{/if}}
- **Skipped:** {{skipped}} tests {{#if skipped}}{{statusIcon "skipped"}}{{/if}}
- **Duration:** {{formatDuration duration}}
- **Pass Rate:** {{formatPercentage passRate}}%

{{#if failures}}
#### ❌ Failures
{{#each failures}}
{{@index}}. **{{name}}**
   - **Error:** {{errorMessage}}
   - **File:** `{{filePath}}`
   {{#if stackTrace}}
   - **Stack:** 
     ```
     {{truncate stackTrace 200}}
     ```
   {{/if}}

{{/each}}
{{/if}}
{{/with}}

{{/each}}

## ⚡ Performance Analysis

### Execution Times
- **Total Duration:** {{formatDuration performance.totalDuration}}
- **Average Test:** {{formatDuration performance.averageTestDuration}}
- **Slowest Test:** {{formatDuration performance.slowestTest.duration}} ({{performance.slowestTest.name}})
- **Fastest Test:** {{formatDuration performance.fastestTest.duration}} ({{performance.fastestTest.name}})

### Resource Usage
- **Peak Memory:** {{formatBytes performance.memoryUsage.peak}}
- **CPU Time:** {{formatDuration performance.resourceUsage.cpuTime}}
- **Efficiency:** {{formatPercentage performance.resourceUsage.efficiency}}%

### Top 5 Slowest Tests
{{#each performance.slowestTests}}
{{@index}}. **{{name}}** ({{category}})
   - Duration: {{formatDuration duration}}
   - File: `{{suiteName}}`

{{/each}}

## 🔍 Detailed Analysis

### Test Distribution
```
{{#each testDistribution}}
{{@key}}: {{count}} tests ({{formatPercentage percentage}}%)
{{/each}}
```

### Failure Patterns
{{#if failurePatterns}}
{{#each failurePatterns}}
- **{{pattern}}**: {{count}} occurrences
{{/each}}
{{else}}
No failure patterns detected ✅
{{/if}}

---

*Report generated by ScholarFinder Test Reporting System v{{version}}*  
*For more details, see the [interactive HTML report](./test-report.html)*
```

## Plugin Development

### Creating a Plugin

```javascript
// scripts/test-reporting/plugins/slack-notifier.js
class SlackNotifierPlugin {
  constructor(config = {}) {
    this.name = 'slack-notifier';
    this.version = '1.0.0';
    this.config = {
      webhookUrl: config.webhookUrl,
      channel: config.channel || '#test-results',
      username: config.username || 'Test Reporter',
      enabled: config.enabled !== false
    };
  }

  async onReportGenerated(reports, testData) {
    if (!this.config.enabled || !this.config.webhookUrl) {
      return;
    }

    try {
      const message = this.createSlackMessage(testData, reports);
      await this.sendToSlack(message);
    } catch (error) {
      console.warn(`Slack notification failed: ${error.message}`);
    }
  }

  createSlackMessage(testData, reports) {
    const { summary, coverage } = testData;
    const status = summary.failedTests === 0 ? 'success' : 'failure';
    const color = status === 'success' ? 'good' : 'danger';

    return {
      channel: this.config.channel,
      username: this.config.username,
      attachments: [{
        color: color,
        title: `Test Report - ${testData.metadata.projectName}`,
        fields: [
          {
            title: 'Tests',
            value: `${summary.passedTests}/${summary.totalTests} passed (${summary.passRate.toFixed(1)}%)`,
            short: true
          },
          {
            title: 'Coverage',
            value: `${coverage.overall.lines.percentage.toFixed(1)}% lines`,
            short: true
          },
          {
            title: 'Duration',
            value: `${(summary.totalDuration / 1000).toFixed(1)}s`,
            short: true
          },
          {
            title: 'Build',
            value: testData.metadata.buildId || 'local',
            short: true
          }
        ],
        footer: 'Test Reporting System',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }

  async sendToSlack(message) {
    const fetch = require('node-fetch');
    
    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }
  }

  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: 'Sends test report notifications to Slack',
      hooks: ['onReportGenerated'],
      configSchema: {
        webhookUrl: { type: 'string', required: true },
        channel: { type: 'string', default: '#test-results' },
        username: { type: 'string', default: 'Test Reporter' },
        enabled: { type: 'boolean', default: true }
      }
    };
  }
}

module.exports = SlackNotifierPlugin;
```

### Plugin Registration

```javascript
// scripts/test-reporting/core/plugin-manager.js
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }

  register(plugin) {
    const metadata = plugin.getMetadata();
    this.plugins.set(metadata.name, plugin);
    
    // Register hooks
    if (metadata.hooks) {
      metadata.hooks.forEach(hook => {
        if (!this.hooks.has(hook)) {
          this.hooks.set(hook, []);
        }
        this.hooks.get(hook).push(plugin);
      });
    }
  }

  async executeHook(hookName, ...args) {
    const plugins = this.hooks.get(hookName) || [];
    
    for (const plugin of plugins) {
      try {
        if (typeof plugin[hookName] === 'function') {
          await plugin[hookName](...args);
        }
      } catch (error) {
        console.warn(`Plugin ${plugin.name} hook ${hookName} failed:`, error.message);
      }
    }
  }

  loadPlugins(config) {
    if (!config.plugins) return;

    config.plugins.forEach(pluginConfig => {
      try {
        const PluginClass = require(pluginConfig.module);
        const plugin = new PluginClass(pluginConfig.config);
        this.register(plugin);
      } catch (error) {
        console.warn(`Failed to load plugin ${pluginConfig.module}:`, error.message);
      }
    });
  }
}

module.exports = PluginManager;
```

## Data Processing

### Custom Data Enrichment

```javascript
// scripts/test-reporting/processors/custom/enrichment-processor.js
class EnrichmentProcessor {
  constructor() {
    this.name = 'enrichment-processor';
  }

  async enrichTestData(data, config) {
    const enrichedData = { ...data };

    // Add git information
    enrichedData.git = await this.getGitInformation();
    
    // Add environment information
    enrichedData.environment = this.getEnvironmentInfo();
    
    // Add quality metrics
    enrichedData.qualityMetrics = this.calculateQualityMetrics(data);
    
    // Add trend analysis
    enrichedData.trends = await this.analyzeTrends(data);
    
    // Add risk assessment
    enrichedData.riskAssessment = this.assessRisk(data);

    return enrichedData;
  }

  async getGitInformation() {
    const { execSync } = require('child_process');
    
    try {
      return {
        commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
        author: execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim(),
        message: execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim(),
        timestamp: execSync('git log -1 --pretty=format:"%ci"', { encoding: 'utf8' }).trim()
      };
    } catch (error) {
      return {
        commit: 'unknown',
        branch: 'unknown',
        author: 'unknown',
        message: 'unknown',
        timestamp: 'unknown'
      };
    }
  }

  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development'
    };
  }

  calculateQualityMetrics(data) {
    const { summary, coverage } = data;
    
    // Calculate quality score (0-100)
    const testScore = (summary.passRate / 100) * 40; // 40% weight
    const coverageScore = (coverage.overall.lines.percentage / 100) * 30; // 30% weight
    const performanceScore = this.calculatePerformanceScore(data) * 30; // 30% weight
    
    const overallScore = testScore + coverageScore + performanceScore;
    
    return {
      overallScore: Math.round(overallScore),
      testQuality: Math.round(testScore * 2.5), // Scale to 0-100
      coverageQuality: Math.round(coverageScore * 3.33), // Scale to 0-100
      performanceQuality: Math.round(performanceScore * 3.33), // Scale to 0-100
      grade: this.calculateGrade(overallScore)
    };
  }

  calculatePerformanceScore(data) {
    // Simple performance scoring based on average test duration
    const avgDuration = data.summary.averageDuration || 0;
    if (avgDuration < 100) return 1.0; // Excellent
    if (avgDuration < 300) return 0.8; // Good
    if (avgDuration < 500) return 0.6; // Fair
    if (avgDuration < 1000) return 0.4; // Poor
    return 0.2; // Very poor
  }

  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  async analyzeTrends(data) {
    // Load historical data and analyze trends
    const historicalData = await this.loadHistoricalData();
    
    if (!historicalData || historicalData.length < 2) {
      return { available: false, message: 'Insufficient historical data' };
    }

    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];

    return {
      available: true,
      passRateTrend: this.calculateTrend(latest.passRate, previous.passRate),
      coverageTrend: this.calculateTrend(latest.coverage, previous.coverage),
      performanceTrend: this.calculateTrend(previous.avgDuration, latest.avgDuration), // Inverted for performance
      testCountTrend: this.calculateTrend(latest.totalTests, previous.totalTests)
    };
  }

  calculateTrend(current, previous) {
    if (previous === 0) return { direction: 'stable', change: 0 };
    
    const change = ((current - previous) / previous) * 100;
    let direction = 'stable';
    
    if (Math.abs(change) > 5) {
      direction = change > 0 ? 'improving' : 'declining';
    }

    return { direction, change: Math.round(change * 100) / 100 };
  }

  assessRisk(data) {
    const risks = [];
    
    // Test coverage risk
    if (data.coverage.overall.lines.percentage < 80) {
      risks.push({
        type: 'coverage',
        level: 'high',
        message: 'Test coverage below 80% threshold',
        impact: 'Increased risk of undetected bugs'
      });
    }

    // Failing tests risk
    if (data.summary.failedTests > 0) {
      risks.push({
        type: 'failures',
        level: data.summary.failedTests > 5 ? 'high' : 'medium',
        message: `${data.summary.failedTests} failing tests`,
        impact: 'Potential functionality issues'
      });
    }

    // Performance risk
    if (data.summary.averageDuration > 1000) {
      risks.push({
        type: 'performance',
        level: 'medium',
        message: 'Average test duration exceeds 1 second',
        impact: 'Slow feedback loop for developers'
      });
    }

    return {
      level: this.calculateOverallRiskLevel(risks),
      risks,
      recommendations: this.generateRecommendations(risks)
    };
  }

  calculateOverallRiskLevel(risks) {
    if (risks.some(r => r.level === 'high')) return 'high';
    if (risks.some(r => r.level === 'medium')) return 'medium';
    return 'low';
  }

  generateRecommendations(risks) {
    const recommendations = [];
    
    risks.forEach(risk => {
      switch (risk.type) {
        case 'coverage':
          recommendations.push('Add more unit tests to increase coverage');
          break;
        case 'failures':
          recommendations.push('Fix failing tests before merging');
          break;
        case 'performance':
          recommendations.push('Optimize slow tests or consider parallel execution');
          break;
      }
    });

    return recommendations;
  }

  async loadHistoricalData() {
    // Implementation would load from file system, database, or API
    // For now, return empty array
    return [];
  }
}

module.exports = EnrichmentProcessor;
```

## Testing Extensions

### Unit Testing Custom Generators

```javascript
// tests/generators/xml-generator.test.js
const XmlGenerator = require('../../scripts/test-reporting/generators/custom/xml-generator');
const fs = require('fs').promises;
const path = require('path');

describe('XmlGenerator', () => {
  let generator;
  let mockData;
  let mockConfig;

  beforeEach(() => {
    generator = new XmlGenerator();
    
    mockData = {
      summary: {
        totalTests: 100,
        passedTests: 95,
        failedTests: 5,
        passRate: 95.0
      },
      coverage: {
        overall: {
          lines: { total: 1000, covered: 850, percentage: 85.0 },
          functions: { total: 200, covered: 180, percentage: 90.0 },
          branches: { total: 150, covered: 120, percentage: 80.0 }
        }
      },
      suiteResults: [
        {
          name: 'AuthService',
          tests: [
            { name: 'should validate token', status: 'passed', duration: 50 },
            { name: 'should reject invalid token', status: 'failed', duration: 75, errorMessage: 'Token validation failed' }
          ],
          failures: 1,
          duration: 125
        }
      ],
      metadata: {
        projectName: 'Test Project',
        timestamp: '2024-01-15T10:30:00Z',
        buildId: 'build-123'
      }
    };

    mockConfig = {
      outputDirectory: '/tmp/test-reports',
      xml: {
        schema: 'test-report-v1.0',
        prettyPrint: true
      }
    };
  });

  afterEach(async () => {
    // Cleanup generated files
    try {
      await fs.unlink(path.join(mockConfig.outputDirectory, 'test-report.xml'));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generateReport', () => {
    it('should generate valid XML report', async () => {
      // Ensure output directory exists
      await fs.mkdir(mockConfig.outputDirectory, { recursive: true });

      const result = await generator.generateReport(mockData, mockConfig);

      expect(result.format).toBe('xml');
      expect(result.filePath).toBe(path.join(mockConfig.outputDirectory, 'test-report.xml'));
      expect(result.size).toBeGreaterThan(0);
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.metadata.xmlVersion).toBe('1.0');
    });

    it('should create valid XML content', async () => {
      await fs.mkdir(mockConfig.outputDirectory, { recursive: true });
      await generator.generateReport(mockData, mockConfig);

      const xmlContent = await fs.readFile(
        path.join(mockConfig.outputDirectory, 'test-report.xml'),
        'utf8'
      );

      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<testReport');
      expect(xmlContent).toContain('<summary>');
      expect(xmlContent).toContain('<totalTests>100</totalTests>');
      expect(xmlContent).toContain('<passedTests>95</passedTests>');
      expect(xmlContent).toContain('<coverage>');
      expect(xmlContent).toContain('<testSuites>');
    });

    it('should handle XML escaping correctly', () => {
      const testText = 'Test with <special> & "quoted" characters';
      const escaped = generator.escapeXml(testText);
      
      expect(escaped).toBe('Test with &lt;special&gt; &amp; &quot;quoted&quot; characters');
    });

    it('should throw error on file system failure', async () => {
      const invalidConfig = {
        outputDirectory: '/invalid/path/that/does/not/exist'
      };

      await expect(generator.generateReport(mockData, invalidConfig))
        .rejects.toThrow('XML report generation failed');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const result = generator.validateConfig(mockConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing output directory', () => {
      const invalidConfig = { xml: { schema: 'test-report-v1.0' } };
      const result = generator.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('outputDirectory is required');
    });
  });

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = generator.getMetadata();
      
      expect(metadata.name).toBe('XML Report Generator');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.supportedFeatures).toContain('test-results');
      expect(metadata.supportedFeatures).toContain('coverage');
      expect(metadata.requiredDependencies).toEqual([]);
    });
  });
});
```

### Integration Testing

```javascript
// tests/integration/report-generation.test.js
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

describe('Report Generation Integration', () => {
  const testReportsDir = path.join(__dirname, '../../test-reports');

  beforeEach(async () => {
    // Clean up any existing reports
    try {
      await fs.rmdir(testReportsDir, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    // Clean up generated reports
    try {
      await fs.rmdir(testReportsDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should generate all report formats', async () => {
    // Run tests with report generation
    execSync('npm run test:unit && npm run test:report', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe'
    });

    // Verify HTML report exists
    const htmlReport = path.join(testReportsDir, 'test-report.html');
    const htmlStats = await fs.stat(htmlReport);
    expect(htmlStats.isFile()).toBe(true);
    expect(htmlStats.size).toBeGreaterThan(1000);

    // Verify Markdown report exists
    const markdownReport = path.join(testReportsDir, 'test-report.md');
    const markdownStats = await fs.stat(markdownReport);
    expect(markdownStats.isFile()).toBe(true);
    expect(markdownStats.size).toBeGreaterThan(500);

    // Verify JSON report exists (if enabled)
    try {
      const jsonReport = path.join(testReportsDir, 'test-results.json');
      const jsonStats = await fs.stat(jsonReport);
      expect(jsonStats.isFile()).toBe(true);
    } catch (error) {
      // JSON reports might be disabled
    }
  }, 60000); // 60 second timeout

  it('should generate reports even when tests fail', async () => {
    // Create a failing test temporarily
    const failingTest = `
      describe('Temporary failing test', () => {
        it('should fail', () => {
          expect(true).toBe(false);
        });
      });
    `;
    
    const tempTestFile = path.join(__dirname, '../temp-failing.test.js');
    await fs.writeFile(tempTestFile, failingTest);

    try {
      // Run tests (will fail) but should still generate reports
      execSync('npm run test:with-reports', {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe'
      });
    } catch (error) {
      // Tests are expected to fail
    }

    // Clean up temp test
    await fs.unlink(tempTestFile);

    // Verify reports were still generated
    const htmlReport = path.join(testReportsDir, 'test-report.html');
    const htmlStats = await fs.stat(htmlReport);
    expect(htmlStats.isFile()).toBe(true);

    // Verify report contains failure information
    const htmlContent = await fs.readFile(htmlReport, 'utf8');
    expect(htmlContent).toContain('failed');
  }, 60000);
});
```

## Performance Optimization

### Optimizing Report Generation

```javascript
// scripts/test-reporting/utils/performance-optimizer.js
class PerformanceOptimizer {
  constructor(config = {}) {
    this.config = {
      enableCaching: config.enableCaching !== false,
      enableParallelProcessing: config.enableParallelProcessing !== false,
      maxConcurrency: config.maxConcurrency || 4,
      memoryLimit: config.memoryLimit || 100, // MB
      enableStreaming: config.enableStreaming !== false
    };
    
    this.templateCache = new Map();
    this.dataCache = new Map();
  }

  async optimizeReportGeneration(generators, data, config) {
    const startTime = Date.now();
    
    // Pre-process data for efficiency
    const optimizedData = await this.optimizeData(data);
    
    // Generate reports in parallel if enabled
    const reports = this.config.enableParallelProcessing
      ? await this.generateReportsParallel(generators, optimizedData, config)
      : await this.generateReportsSequential(generators, optimizedData, config);
    
    const totalTime = Date.now() - startTime;
    
    return {
      reports,
      performance: {
        totalTime,
        memoryUsage: process.memoryUsage(),
        cacheHits: this.getCacheStats()
      }
    };
  }

  async optimizeData(data) {
    // Remove unnecessary data for performance
    const optimized = { ...data };
    
    // Limit failure details to prevent memory issues
    if (optimized.failures && optimized.failures.length > 100) {
      optimized.failures = optimized.failures.slice(0, 100);
      optimized.failuresTruncated = true;
    }

    // Compress stack traces
    if (optimized.failures) {
      optimized.failures.forEach(failure => {
        if (failure.stackTrace && failure.stackTrace.length > 1000) {
          failure.stackTrace = failure.stackTrace.substring(0, 1000) + '...';
        }
      });
    }

    return optimized;
  }

  async generateReportsParallel(generators, data, config) {
    const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
    
    if (!isMainThread) {
      // Worker thread code
      const { generatorName, data, config } = workerData;
      const generator = this.createGenerator(generatorName);
      const result = await generator.generateReport(data, config);
      parentPort.postMessage(result);
      return;
    }

    // Main thread code
    const promises = generators.map(generator => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: {
            generatorName: generator.constructor.name,
            data,
            config
          }
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });

    return Promise.all(promises);
  }

  async generateReportsSequential(generators, data, config) {
    const reports = [];
    
    for (const generator of generators) {
      const report = await generator.generateReport(data, config);
      reports.push(report);
      
      // Check memory usage
      if (this.isMemoryLimitExceeded()) {
        console.warn('Memory limit exceeded, forcing garbage collection');
        if (global.gc) {
          global.gc();
        }
      }
    }

    return reports;
  }

  getCachedTemplate(templatePath) {
    if (!this.config.enableCaching) {
      return null;
    }

    return this.templateCache.get(templatePath);
  }

  setCachedTemplate(templatePath, compiledTemplate) {
    if (!this.config.enableCaching) {
      return;
    }

    this.templateCache.set(templatePath, compiledTemplate);
  }

  isMemoryLimitExceeded() {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    return memoryUsageMB > this.config.memoryLimit;
  }

  getCacheStats() {
    return {
      templateCacheSize: this.templateCache.size,
      dataCacheSize: this.dataCache.size
    };
  }

  clearCaches() {
    this.templateCache.clear();
    this.dataCache.clear();
  }
}

module.exports = PerformanceOptimizer;
```

## Contributing Guidelines

### Code Style and Standards

1. **TypeScript/JavaScript Standards**
   - Use ES6+ features
   - Follow ESLint configuration
   - Use async/await over Promises
   - Implement proper error handling

2. **Testing Requirements**
   - Unit tests for all new generators
   - Integration tests for end-to-end functionality
   - Performance tests for optimization features
   - Minimum 80% code coverage

3. **Documentation Standards**
   - JSDoc comments for all public methods
   - README updates for new features
   - Example configurations and usage
   - Migration guides for breaking changes

### Submission Process

1. **Fork and Branch**
   ```bash
   git fork https://github.com/your-org/scholar-finder
   git checkout -b feature/new-report-format
   ```

2. **Development**
   ```bash
   # Install dependencies
   npm install
   
   # Run tests
   npm test
   
   # Generate reports to test changes
   npm run test:with-reports
   ```

3. **Testing**
   ```bash
   # Run full test suite
   npm run test:all
   
   # Run performance tests
   npm run test:performance
   
   # Validate configuration
   npm run test:validate-config
   ```

4. **Submit Pull Request**
   - Include comprehensive description
   - Add tests for new functionality
   - Update documentation
   - Ensure CI/CD passes

### Extension Guidelines

1. **Backward Compatibility**
   - Maintain existing API contracts
   - Provide migration paths for breaking changes
   - Support legacy configuration formats

2. **Performance Considerations**
   - Profile new features for performance impact
   - Implement caching where appropriate
   - Consider memory usage for large test suites

3. **Error Handling**
   - Graceful degradation for missing dependencies
   - Comprehensive error messages
   - Fallback mechanisms for failures

4. **Configuration**
   - Sensible defaults for new options
   - Validation for configuration values
   - Environment variable support