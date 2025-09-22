# Test Reporting Migration Guide

## Overview

This guide helps you migrate from older versions of the test reporting system to the latest version, ensuring a smooth transition with minimal disruption to your workflow.

## Version Compatibility Matrix

| From Version | To Version | Migration Required | Breaking Changes | Estimated Time |
|--------------|------------|-------------------|------------------|----------------|
| 1.x | 2.0 | Yes | Major | 2-4 hours |
| 2.0 | 2.1 | No | None | 15 minutes |
| 2.1 | 2.2 | Minimal | Minor | 30 minutes |

## Migration from v1.x to v2.0

### Breaking Changes

1. **Configuration File Format**
2. **Template System Overhaul**
3. **API Interface Changes**
4. **Output Directory Structure**
5. **Dependency Updates**

### Step-by-Step Migration

#### 1. Update Configuration File

**Old Format (v1.x):**
```javascript
// test-reporting.config.js (v1.x)
module.exports = {
  outputPath: './reports',
  reportTypes: ['html', 'json'],
  includeStackTraces: true,
  htmlOptions: {
    title: 'Test Results',
    css: './custom.css'
  }
};
```

**New Format (v2.0):**
```javascript
// test-reporting.config.js (v2.0)
module.exports = {
  outputDir: './test-reports', // Changed from outputPath
  formats: ['html', 'markdown'], // Changed from reportTypes
  includeCoverage: true,
  
  htmlTemplate: { // Changed from htmlOptions
    title: 'Test Results',
    theme: 'modern',
    customCSS: './custom.css' // Changed from css
  },
  
  // New options
  markdownOptions: {
    includeEmojis: true,
    detailedFailures: true
  }
};
```

#### 2. Update Package.json Scripts

**Old Scripts (v1.x):**
```json
{
  "scripts": {
    "test:report": "npm test && generate-report",
    "test:html": "npm test && generate-html-report"
  }
}
```

**New Scripts (v2.0):**
```json
{
  "scripts": {
    "test:report": "npm run test:all",
    "test:all": "tsx src/test/run-all-tests.ts",
    "test:ci": "npm run test && npm run test:integration && npm run test:e2e"
  }
}
```

#### 3. Update Template Files

**Old Template Structure (v1.x):**
```
templates/
├── report.html
└── styles.css
```

**New Template Structure (v2.0):**
```
src/test/reporting/templates/
├── html-report.hbs
├── markdown-report.hbs
└── partials/
    ├── header.hbs
    ├── summary.hbs
    └── test-suite.hbs
```

**Template Migration:**

Old HTML template:
```html
<!-- report.html (v1.x) -->
<html>
<head><title>{{title}}</title></head>
<body>
  <h1>{{title}}</h1>
  <div class="summary">
    Tests: {{totalTests}}, Passed: {{passed}}, Failed: {{failed}}
  </div>
  {{#each suites}}
  <div class="suite">
    <h2>{{name}}</h2>
    {{#each tests}}
    <div class="test {{status}}">{{name}}</div>
    {{/each}}
  </div>
  {{/each}}
</body>
</html>
```

New Handlebars template:
```handlebars
<!-- html-report.hbs (v2.0) -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{title}}</title>
    {{> header}}
</head>
<body>
    <div class="container">
        {{> summary}}
        
        {{#each testSuites}}
        {{> test-suite}}
        {{/each}}
        
        {{#if coverage}}
        {{> coverage}}
        {{/if}}
    </div>
</body>
</html>
```

#### 4. Update Custom Generators

**Old Generator (v1.x):**
```javascript
class CustomReportGenerator {
  generate(results, options) {
    // Old implementation
    const html = this.formatResults(results);
    fs.writeFileSync(options.outputPath + '/custom.html', html);
  }
}
```

**New Generator (v2.0):**
```typescript
import { ReportGenerator, TestResults, ReportConfig } from '../types';

export class CustomReportGenerator implements ReportGenerator {
  async generate(testResults: TestResults, config: ReportConfig): Promise<void> {
    const html = this.formatResults(testResults);
    const outputPath = join(config.outputDir, `custom.${this.getFileExtension()}`);
    await writeFile(outputPath, html, 'utf8');
  }
  
  validate(config: ReportConfig): boolean | string {
    return config.outputDir ? true : 'Output directory is required';
  }
  
  getFileExtension(): string {
    return 'html';
  }
  
  getDisplayName(): string {
    return 'Custom HTML Report';
  }
}
```

#### 5. Update Dependencies

```bash
# Remove old dependencies
npm uninstall old-test-reporter html-generator

# Install new dependencies
npm install handlebars markdown-it fs-extra
```

#### 6. Migration Script

Create an automated migration script:

```javascript
// migrate-v1-to-v2.js
const fs = require('fs');
const path = require('path');

function migrateConfig() {
  const oldConfigPath = './test-reporting.config.js';
  const backupPath = './test-reporting.config.v1.backup.js';
  
  if (!fs.existsSync(oldConfigPath)) {
    console.log('No configuration file found to migrate');
    return;
  }
  
  // Backup old config
  fs.copyFileSync(oldConfigPath, backupPath);
  console.log(`Backed up old config to ${backupPath}`);
  
  // Load old config
  const oldConfig = require(oldConfigPath);
  
  // Transform to new format
  const newConfig = {
    outputDir: oldConfig.outputPath || './test-reports',
    formats: oldConfig.reportTypes || ['html', 'markdown'],
    includeCoverage: true,
    
    htmlTemplate: {
      title: oldConfig.htmlOptions?.title || 'Test Report',
      theme: 'modern',
      customCSS: oldConfig.htmlOptions?.css
    },
    
    markdownOptions: {
      includeEmojis: true,
      detailedFailures: true
    }
  };
  
  // Write new config
  const newConfigContent = `module.exports = ${JSON.stringify(newConfig, null, 2)};`;
  fs.writeFileSync(oldConfigPath, newConfigContent);
  
  console.log('Configuration migrated successfully');
}

function migrateTemplates() {
  const oldTemplateDir = './templates';
  const newTemplateDir = './src/test/reporting/templates';
  
  if (!fs.existsSync(oldTemplateDir)) {
    console.log('No templates directory found to migrate');
    return;
  }
  
  // Create new template directory
  fs.mkdirSync(newTemplateDir, { recursive: true });
  
  // Migrate HTML template
  const oldHtmlPath = path.join(oldTemplateDir, 'report.html');
  if (fs.existsSync(oldHtmlPath)) {
    const oldHtml = fs.readFileSync(oldHtmlPath, 'utf8');
    const newHtml = convertToHandlebars(oldHtml);
    fs.writeFileSync(path.join(newTemplateDir, 'html-report.hbs'), newHtml);
    console.log('HTML template migrated');
  }
  
  // Create backup
  fs.renameSync(oldTemplateDir, './templates.v1.backup');
  console.log('Old templates backed up to templates.v1.backup');
}

function convertToHandlebars(html) {
  // Basic conversion from old template format to Handlebars
  return html
    .replace(/\{\{totalTests\}\}/g, '{{summary.totalTests}}')
    .replace(/\{\{passed\}\}/g, '{{summary.passedTests}}')
    .replace(/\{\{failed\}\}/g, '{{summary.failedTests}}')
    .replace(/\{\{#each suites\}\}/g, '{{#each testSuites}}')
    .replace(/\{\{#each tests\}\}/g, '{{#each tests}}');
}

function updatePackageJson() {
  const packagePath = './package.json';
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Update scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'test:all': 'tsx src/test/run-all-tests.ts',
    'test:report': 'npm run test:all',
    'test:ci': 'npm run test && npm run test:integration && npm run test:e2e'
  };
  
  // Remove old scripts
  delete packageJson.scripts['test:html'];
  delete packageJson.scripts['generate-report'];
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('Package.json updated');
}

// Run migration
console.log('Starting migration from v1.x to v2.0...');
migrateConfig();
migrateTemplates();
updatePackageJson();
console.log('Migration completed successfully!');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Test: npm run test:all');
console.log('3. Review generated reports');
console.log('4. Update any custom generators');
```

Run the migration:
```bash
node migrate-v1-to-v2.js
npm install
npm run test:all
```

## Migration from v2.0 to v2.1

### Changes in v2.1

- Enhanced performance metrics
- New plugin system
- Improved error handling
- Additional template helpers

### Migration Steps

#### 1. Update Dependencies

```bash
npm update
```

#### 2. Optional: Add Plugin Support

```javascript
// test-reporting.config.js
module.exports = {
  // ... existing config
  
  // New plugin system (optional)
  plugins: [
    // Add plugins as needed
  ]
};
```

#### 3. Update Custom Generators (if any)

Add the new optional methods:

```typescript
export class CustomReportGenerator implements ReportGenerator {
  // ... existing methods
  
  // New optional method in v2.1
  getMetadata?(): ReportMetadata {
    return {
      name: 'Custom Report',
      version: '1.0.0',
      description: 'Custom report generator',
      author: 'Your Name'
    };
  }
}
```

## Migration from v2.1 to v2.2

### Changes in v2.2

- Streaming support for large datasets
- Parallel processing
- Enhanced configuration validation
- New template partials

### Migration Steps

#### 1. Update Configuration (Optional)

```javascript
// test-reporting.config.js
module.exports = {
  // ... existing config
  
  // New performance options
  performance: {
    streamProcessing: true, // For large test suites
    parallelGeneration: true,
    maxWorkers: 4
  },
  
  // Enhanced validation
  validation: {
    strict: true,
    warnOnUnknownOptions: true
  }
};
```

#### 2. Update Large Dataset Handling

If you have custom generators that handle large datasets:

```typescript
// Before (v2.1)
async generate(testResults: TestResults, config: ReportConfig): Promise<void> {
  const html = this.generateFullReport(testResults);
  await writeFile(outputPath, html);
}

// After (v2.2) - with streaming support
async generate(testResults: TestResults, config: ReportConfig): Promise<void> {
  if (testResults.summary.totalTests > 1000 && config.performance?.streamProcessing) {
    await this.generateStreamingReport(testResults, config);
  } else {
    await this.generateStandardReport(testResults, config);
  }
}
```

## Common Migration Issues

### Issue 1: Configuration Not Loading

**Symptoms:**
- "Configuration file not found" errors
- Default configuration being used

**Solution:**
```bash
# Check if config file exists and has correct name
ls -la test-reporting.config.js

# Validate configuration syntax
node -e "console.log(require('./test-reporting.config.js'))"
```

### Issue 2: Template Compilation Errors

**Symptoms:**
- "Template compilation failed" errors
- Missing partials errors

**Solution:**
```bash
# Check template directory structure
ls -la src/test/reporting/templates/

# Verify Handlebars syntax
npm install -g handlebars
handlebars src/test/reporting/templates/html-report.hbs
```

### Issue 3: Output Directory Issues

**Symptoms:**
- "ENOENT" or "EACCES" errors
- Reports not being generated

**Solution:**
```bash
# Create output directory
mkdir -p test-reports

# Fix permissions
chmod 755 test-reports/

# Check configuration
node -e "
const config = require('./test-reporting.config.js');
console.log('Output directory:', config.outputDir);
"
```

### Issue 4: Dependency Conflicts

**Symptoms:**
- Module not found errors
- Version compatibility issues

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for peer dependency issues
npm ls
```

## Rollback Procedures

### Rollback from v2.0 to v1.x

```bash
# Restore backed up files
cp test-reporting.config.v1.backup.js test-reporting.config.js
rm -rf src/test/reporting/templates
mv templates.v1.backup templates

# Reinstall old dependencies
npm install old-test-reporter@1.x html-generator@1.x

# Restore old scripts in package.json
# (manually edit package.json)
```

### Rollback from v2.1 to v2.0

```bash
# Downgrade package
npm install test-reporting-system@2.0.x

# Remove v2.1 specific configuration
# (edit test-reporting.config.js to remove plugins section)
```

## Validation Checklist

After migration, verify:

- [ ] Configuration file loads without errors
- [ ] All test scripts run successfully
- [ ] Reports are generated in correct location
- [ ] HTML reports display correctly in browser
- [ ] Markdown reports have proper formatting
- [ ] Coverage data is included (if enabled)
- [ ] Custom generators work (if any)
- [ ] CI/CD pipeline still works
- [ ] Performance is acceptable

## Getting Help

If you encounter issues during migration:

1. **Check the troubleshooting guide**: [test-reporting-troubleshooting.md](./test-reporting-troubleshooting.md)
2. **Enable debug mode**: `DEBUG_TEST_REPORTING=true npm run test:all`
3. **Review the changelog**: Check what changed between versions
4. **Create a minimal reproduction**: Isolate the issue
5. **Seek community help**: Create an issue with debug information

## Post-Migration Optimization

After successful migration:

1. **Review configuration**: Optimize settings for your use case
2. **Update CI/CD**: Take advantage of new features
3. **Customize templates**: Update styling and branding
4. **Add plugins**: Enhance functionality with plugins
5. **Monitor performance**: Ensure reports generate efficiently

## Future Migration Planning

To prepare for future migrations:

1. **Keep configuration simple**: Avoid complex customizations
2. **Document customizations**: Note any custom generators or templates
3. **Test regularly**: Run tests frequently to catch issues early
4. **Stay updated**: Follow release notes and changelogs
5. **Backup before upgrading**: Always backup configuration and custom code