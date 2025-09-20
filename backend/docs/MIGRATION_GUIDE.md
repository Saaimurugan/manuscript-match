# Test Reporting Migration Guide

## Table of Contents

1. [Overview](#overview)
2. [Migration from Manual Reporting](#migration-from-manual-reporting)
3. [Migration from Other Test Reporting Tools](#migration-from-other-test-reporting-tools)
4. [Upgrading Between Versions](#upgrading-between-versions)
5. [Configuration Migration](#configuration-migration)
6. [CI/CD Pipeline Migration](#cicd-pipeline-migration)
7. [Troubleshooting Migration Issues](#troubleshooting-migration-issues)
8. [Rollback Procedures](#rollback-procedures)

## Overview

This guide helps you migrate to the ScholarFinder automated test reporting system from various starting points:

- **Manual test reporting** - Moving from manual report generation
- **Other reporting tools** - Migrating from Jest HTML Reporter, Allure, etc.
- **Version upgrades** - Upgrading between versions of the reporting system
- **CI/CD integration** - Updating build pipelines

### Migration Checklist

Before starting migration:

- [ ] Backup existing test reports and configurations
- [ ] Document current reporting workflow
- [ ] Identify dependencies and integrations
- [ ] Plan rollback strategy
- [ ] Test migration in development environment
- [ ] Update team documentation

## Migration from Manual Reporting

### Current State Assessment

If you're currently generating test reports manually, assess your current setup:

```bash
# Check existing test scripts
cat package.json | grep -A 10 -B 10 "scripts"

# Look for existing report files
find . -name "*report*" -type f
find . -name "*coverage*" -type f

# Check Jest configuration
cat jest.config.js
```

### Step 1: Install Dependencies

```bash
# Install required dependencies
npm install --save-dev handlebars markdown-it fs-extra

# Verify Jest is properly configured
npm list jest
```

### Step 2: Create Configuration File

Create `test-reporting.config.js` in your project root:

```javascript
module.exports = {
  // Enable automated reporting
  enabled: true,
  
  // Output directory (adjust if you have existing reports)
  outputDirectory: 'test-reports',
  
  // Start with basic formats
  formats: {
    html: true,      // Interactive HTML reports
    markdown: true,  // Markdown summaries
    json: false      // JSON data (enable later if needed)
  },
  
  // Basic HTML configuration
  html: {
    title: 'Your Project Test Report',
    theme: 'light',
    includeCharts: true,
    includeInteractiveFeatures: true
  },
  
  // Basic Markdown configuration
  markdown: {
    includeEmojis: true,
    includeStackTraces: false,  // Start simple
    maxFailureDetails: 5
  },
  
  // Performance settings
  performance: {
    maxGenerationTime: 30000,
    enableParallelGeneration: true
  }
};
```

### Step 3: Update Package.json Scripts

Add or update your npm scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    // New automated reporting scripts
    "test:with-reports": "npm test && npm run test:report",
    "test:report": "node scripts/generate-test-reports.js",
    "test:report:html": "node scripts/generate-test-reports.js --format=html",
    "test:report:markdown": "node scripts/generate-test-reports.js --format=markdown",
    
    // CI/CD friendly scripts
    "test:ci": "jest --ci --coverage --watchAll=false && npm run test:report",
    "build:with-tests": "npm run build && npm run test:with-reports"
  }
}
```

### Step 4: Create Report Generation Script

Create `scripts/generate-test-reports.js`:

```javascript
#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;

// Import the test reporting system
const ReportOrchestrator = require('./test-reporting/core/report-orchestrator');
const config = require('../test-reporting.config.js');

async function generateReports() {
  try {
    console.log('🚀 Generating test reports...');
    
    const orchestrator = new ReportOrchestrator(config);
    const results = await orchestrator.generateAllReports();
    
    console.log('✅ Reports generated successfully:');
    results.reports.forEach(report => {
      console.log(`   📄 ${report.format.toUpperCase()}: ${report.filePath} (${formatBytes(report.size)})`);
    });
    
    console.log(`⏱️  Total generation time: ${results.performance.totalTime}ms`);
    
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run if called directly
if (require.main === module) {
  generateReports();
}

module.exports = generateReports;
```

### Step 5: Update Jest Configuration

Update your `jest.config.js` to include the custom reporter:

```javascript
module.exports = {
  // Your existing Jest configuration
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  
  // Add custom reporter for automated reporting
  reporters: [
    'default',
    ['<rootDir>/scripts/test-reporting/reporters/jest-reporter.js', {
      outputFile: 'test-results/jest-results.json'
    }]
  ],
  
  // Ensure coverage data is available
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}'
  ],
  
  // Output test results for report generation
  outputFile: 'test-results/jest-results.json'
};
```

### Step 6: Test the Migration

```bash
# Test basic functionality
npm run test:with-reports

# Verify reports are generated
ls -la test-reports/

# Open HTML report to verify
open test-reports/test-report.html  # macOS
xdg-open test-reports/test-report.html  # Linux
start test-reports/test-report.html  # Windows
```

### Step 7: Clean Up Old Reports

```bash
# Move old reports to backup
mkdir -p backup/old-reports
mv old-report-files/* backup/old-reports/

# Update .gitignore
echo "test-reports/" >> .gitignore
echo "test-results/" >> .gitignore
```

## Migration from Other Test Reporting Tools

### From Jest HTML Reporter

If you're using `jest-html-reporter`:

1. **Remove old dependency**:
   ```bash
   npm uninstall jest-html-reporter
   ```

2. **Update Jest configuration**:
   ```javascript
   // Remove this from jest.config.js
   reporters: [
     'default',
     ['jest-html-reporter', {
       pageTitle: 'Test Report',
       outputPath: 'test-report.html'
     }]
   ]
   
   // Replace with our reporter
   reporters: [
     'default',
     ['<rootDir>/scripts/test-reporting/reporters/jest-reporter.js', {}]
   ]
   ```

3. **Migrate configuration**:
   ```javascript
   // Old jest-html-reporter config
   const oldConfig = {
     pageTitle: 'My Test Report',
     outputPath: 'reports/test-report.html',
     includeFailureMsg: true,
     includeSuiteFailure: true
   };
   
   // New test-reporting config
   module.exports = {
     enabled: true,
     outputDirectory: 'reports',
     html: {
       title: 'My Test Report',
       includeStackTraces: true,
       includeInteractiveFeatures: true
     }
   };
   ```

### From Allure Reporter

If you're using Allure:

1. **Keep Allure for now** (parallel migration):
   ```bash
   # Keep generating both reports during transition
   npm run test
   npm run allure:generate  # Keep existing
   npm run test:report      # Add new reporting
   ```

2. **Compare report content**:
   - Verify all test results are captured
   - Check coverage data accuracy
   - Ensure performance metrics match

3. **Migrate custom annotations**:
   ```javascript
   // Allure annotations
   allure.epic('User Management');
   allure.feature('Authentication');
   allure.story('Login');
   
   // Equivalent in our system (via test categorization)
   describe('User Management - Authentication - Login', () => {
     // Tests automatically categorized
   });
   ```

### From Custom Reporting Solutions

If you have custom reporting scripts:

1. **Analyze current functionality**:
   ```bash
   # Document what your current reports include
   # - Test results format
   # - Coverage integration
   # - Performance metrics
   # - Custom visualizations
   ```

2. **Map to new system**:
   ```javascript
   // Custom report features mapping
   const featureMapping = {
     'custom-charts': 'html.includeCharts',
     'failure-analysis': 'html.includeStackTraces',
     'trend-analysis': 'plugins.trendAnalysis',
     'slack-notifications': 'plugins.slackNotifier'
   };
   ```

3. **Implement missing features**:
   - Create custom generators for unique formats
   - Develop plugins for integrations
   - Extend data processors for custom metrics

## Upgrading Between Versions

### Version 1.0 to 2.0

**Breaking Changes:**
- Configuration file format updated
- New required dependencies
- Changed output file names

**Migration Steps:**

1. **Update configuration format**:
   ```javascript
   // Old format (v1.0)
   module.exports = {
     generateHtml: true,
     generateMarkdown: true,
     outputDir: 'reports'
   };
   
   // New format (v2.0)
   module.exports = {
     enabled: true,
     formats: {
       html: true,
       markdown: true
     },
     outputDirectory: 'reports'
   };
   ```

2. **Install new dependencies**:
   ```bash
   npm install --save-dev handlebars@^4.7.0 markdown-it@^13.0.0
   ```

3. **Update file references**:
   ```bash
   # Old file names
   reports/test-report.html
   reports/summary.md
   
   # New file names
   reports/test-report.html
   reports/test-report.md
   ```

### Version 2.0 to 3.0

**New Features:**
- Plugin system
- Custom templates
- Performance optimizations

**Migration Steps:**

1. **Optional: Enable new features**:
   ```javascript
   module.exports = {
     // Existing configuration
     enabled: true,
     formats: { html: true, markdown: true },
     
     // New plugin system
     plugins: [
       {
         module: './plugins/slack-notifier',
         config: { webhookUrl: process.env.SLACK_WEBHOOK }
       }
     ],
     
     // Performance optimizations
     performance: {
       enableParallelGeneration: true,
       enableTemplateOptimization: true
     }
   };
   ```

2. **Update templates (if customized)**:
   ```bash
   # Backup custom templates
   cp -r templates/ templates-backup/
   
   # Update template syntax for new version
   # (See template migration guide)
   ```

## Configuration Migration

### Environment Variables

Migrate environment-based configuration:

```bash
# Old environment variables
export GENERATE_HTML_REPORT=true
export REPORT_OUTPUT_DIR=reports

# New environment variables
export TEST_REPORTING_ENABLED=true
export TEST_REPORTS_DIR=reports
export HTML_THEME=light
export MARKDOWN_INCLUDE_EMOJIS=true
```

### CI/CD Environment Variables

Update CI/CD configurations:

```yaml
# GitHub Actions - Old
env:
  GENERATE_REPORTS: true
  REPORT_DIR: artifacts

# GitHub Actions - New
env:
  TEST_REPORTING_ENABLED: true
  TEST_REPORTS_DIR: artifacts
  CI_REPORTING_ENABLED: true
  CI_OUTPUT_FORMAT: all
```

### Configuration Validation

Validate your migrated configuration:

```bash
# Validate configuration syntax
node -c test-reporting.config.js

# Test configuration loading
npm run test:validate-config

# Generate sample report to test
npm run test:report -- --dry-run
```

## CI/CD Pipeline Migration

### GitHub Actions

**Before (manual reporting):**
```yaml
- name: Run tests
  run: npm test

- name: Generate reports
  run: |
    npm run generate-html-report
    npm run generate-coverage-report

- name: Upload reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: reports/
```

**After (automated reporting):**
```yaml
- name: Run tests with reports
  run: npm run test:ci
  env:
    CI_REPORTING_ENABLED: true
    CI_OUTPUT_FORMAT: all

- name: Upload test reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-reports
    path: test-reports/
    retention-days: 30
```

### Jenkins

**Before:**
```groovy
stage('Test') {
    steps {
        sh 'npm test'
        sh 'npm run generate-reports'
    }
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'index.html',
                reportName: 'Test Report'
            ])
        }
    }
}
```

**After:**
```groovy
stage('Test') {
    steps {
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
```

### GitLab CI

**Before:**
```yaml
test:
  script:
    - npm test
    - npm run generate-reports
  artifacts:
    paths:
      - reports/
    expire_in: 1 week
```

**After:**
```yaml
test:
  script:
    - npm run test:ci
  variables:
    CI_REPORTING_ENABLED: "true"
    CI_OUTPUT_FORMAT: "all"
  artifacts:
    when: always
    paths:
      - test-reports/
    expire_in: 30 days
    reports:
      junit: test-reports/junit.xml
```

## Troubleshooting Migration Issues

### Common Migration Problems

#### 1. Reports Not Generated After Migration

**Symptoms:**
- Tests run successfully but no reports appear
- Empty test-reports directory

**Solutions:**
```bash
# Check if reporting is enabled
echo $TEST_REPORTING_ENABLED

# Verify configuration file exists and is valid
ls -la test-reporting.config.js
node -c test-reporting.config.js

# Run with debug logging
DEBUG=test-reporting:* npm run test:report
```

#### 2. Missing Test Results

**Symptoms:**
- Reports generated but show no test data
- Coverage information missing

**Solutions:**
```bash
# Verify Jest results are being generated
ls -la test-results/
cat test-results/jest-results.json

# Check Jest reporter configuration
grep -A 5 -B 5 "reporters" jest.config.js

# Run tests with verbose output
npm test -- --verbose
```

#### 3. Configuration Conflicts

**Symptoms:**
- Unexpected report format or content
- Configuration not taking effect

**Solutions:**
```bash
# Check configuration precedence
DEBUG_CONFIG_LOADING=true npm run test:report

# Validate configuration schema
npm run test:validate-config

# Show effective configuration
npm run test:show-config
```

#### 4. Performance Issues After Migration

**Symptoms:**
- Significantly slower build times
- High memory usage during report generation

**Solutions:**
```javascript
// Optimize configuration for performance
module.exports = {
  performance: {
    enableParallelGeneration: true,
    maxGenerationTime: 30000,
    memoryLimit: 100
  },
  html: {
    includeCharts: false,  // Disable if not needed
    maxFailureDetails: 5   // Limit failure details
  }
};
```

### Migration Validation

Create a validation script to verify migration success:

```javascript
// scripts/validate-migration.js
const fs = require('fs').promises;
const path = require('path');

async function validateMigration() {
  const checks = [];
  
  // Check configuration file exists
  try {
    await fs.access('test-reporting.config.js');
    checks.push({ name: 'Configuration file', status: 'PASS' });
  } catch (error) {
    checks.push({ name: 'Configuration file', status: 'FAIL', error: error.message });
  }
  
  // Check npm scripts
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const hasReportScript = packageJson.scripts && packageJson.scripts['test:report'];
  checks.push({ 
    name: 'NPM scripts', 
    status: hasReportScript ? 'PASS' : 'FAIL',
    error: hasReportScript ? null : 'Missing test:report script'
  });
  
  // Check Jest configuration
  try {
    const jestConfig = require('../jest.config.js');
    const hasCustomReporter = jestConfig.reporters && 
      jestConfig.reporters.some(r => Array.isArray(r) && r[0].includes('jest-reporter'));
    checks.push({
      name: 'Jest reporter',
      status: hasCustomReporter ? 'PASS' : 'FAIL',
      error: hasCustomReporter ? null : 'Custom Jest reporter not configured'
    });
  } catch (error) {
    checks.push({ name: 'Jest configuration', status: 'FAIL', error: error.message });
  }
  
  // Report results
  console.log('\n🔍 Migration Validation Results:\n');
  checks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.status}`);
    if (check.error) {
      console.log(`   Error: ${check.error}`);
    }
  });
  
  const allPassed = checks.every(check => check.status === 'PASS');
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Migration ${allPassed ? 'successful' : 'needs attention'}\n`);
  
  return allPassed;
}

if (require.main === module) {
  validateMigration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = validateMigration;
```

## Rollback Procedures

### Emergency Rollback

If you need to quickly rollback the migration:

1. **Restore backup configuration**:
   ```bash
   # Restore old package.json
   cp backup/package.json.backup package.json
   
   # Restore old Jest configuration
   cp backup/jest.config.js.backup jest.config.js
   
   # Remove new configuration
   rm test-reporting.config.js
   ```

2. **Reinstall old dependencies**:
   ```bash
   # Remove new dependencies
   npm uninstall handlebars markdown-it fs-extra
   
   # Reinstall old reporting tool (if applicable)
   npm install --save-dev jest-html-reporter
   ```

3. **Restore old scripts**:
   ```bash
   # Restore old report generation scripts
   cp -r backup/scripts/ scripts/
   ```

### Gradual Rollback

For a more controlled rollback:

1. **Disable automated reporting**:
   ```javascript
   // In test-reporting.config.js
   module.exports = {
     enabled: false,  // Disable new system
     // ... rest of config
   };
   ```

2. **Re-enable old system**:
   ```bash
   # Run old and new systems in parallel
   npm test
   npm run old-generate-reports  # Your old script
   npm run test:report           # New system (disabled)
   ```

3. **Compare outputs**:
   ```bash
   # Compare report contents
   diff old-reports/ test-reports/
   ```

### Rollback Validation

```bash
# Validate rollback success
npm test
npm run generate-reports  # Old script should work

# Verify old reports are generated
ls -la reports/  # Or your old report directory

# Test CI/CD pipeline
git push origin rollback-branch  # Test in CI/CD
```

### Post-Rollback Cleanup

```bash
# Remove new system files
rm -rf scripts/test-reporting/
rm test-reporting.config.js
rm -rf test-reports/

# Clean up package.json
# (Remove test:report scripts manually)

# Update .gitignore
# (Remove test-reports/ entry)

# Clean up CI/CD configurations
# (Restore old artifact paths and scripts)
```

### Documentation Updates

After rollback:

1. **Update team documentation**
2. **Notify stakeholders of rollback**
3. **Document rollback reasons**
4. **Plan future migration strategy**

Remember to test thoroughly after any rollback to ensure your testing pipeline is working correctly.