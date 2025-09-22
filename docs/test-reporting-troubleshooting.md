# Test Reporting Troubleshooting Guide

## Common Issues and Solutions

### 1. Reports Not Generating

**Symptoms:**
- No files appear in `test-reports/` directory
- Tests run but no reports are created
- Silent failures during report generation

**Solutions:**

#### Check Dependencies
```bash
# Verify all required packages are installed
npm list handlebars markdown-it fs-extra

# Reinstall if missing
npm install handlebars markdown-it fs-extra
```

#### Verify Configuration
```bash
# Test configuration loading
node -e "console.log(require('./test-reporting.config.js'))"

# Check for syntax errors
npm run validate-config
```

#### Check Permissions
```bash
# Ensure write permissions
mkdir -p test-reports
chmod 755 test-reports/

# On Windows
icacls test-reports /grant Everyone:F
```

#### Enable Debug Mode
```bash
DEBUG_TEST_REPORTING=true npm run test:all
```

### 2. HTML Reports Display Issues

**Symptoms:**
- Blank or broken HTML reports
- Missing styles or JavaScript
- Charts not rendering

**Solutions:**

#### Template Issues
```bash
# Verify template exists
ls -la src/test/reporting/templates/

# Test template compilation
node -e "
const Handlebars = require('handlebars');
const fs = require('fs');
const template = fs.readFileSync('./src/test/reporting/templates/html-report.hbs', 'utf8');
console.log('Template loaded successfully');
"
```

#### CSS/JavaScript Problems
```html
<!-- Check browser console for errors -->
<!-- Common fixes: -->

<!-- 1. Missing Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- 2. CSP issues -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline';">

<!-- 3. Encoding issues -->
<meta charset="UTF-8">
```

#### Browser Compatibility
```javascript
// Add polyfills for older browsers
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement) {
    return this.indexOf(searchElement) !== -1;
  };
}
```

### 3. Performance Issues

**Symptoms:**
- Slow report generation
- High memory usage
- Timeouts during large test runs

**Solutions:**

#### Optimize Configuration
```javascript
// test-reporting.config.js
module.exports = {
  // Reduce memory usage
  performance: {
    streamProcessing: true,
    batchSize: 100,
    maxMemoryUsage: '512MB'
  },
  
  // Disable heavy features for large suites
  htmlTemplate: {
    includeCharts: false, // Disable for >1000 tests
    collapsibleSections: true
  },
  
  // Parallel processing
  parallelGeneration: true,
  maxWorkers: 4
};
```

#### Memory Management
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 ./node_modules/.bin/vitest

# Or in package.json
"scripts": {
  "test:large": "node --max-old-space-size=8192 ./node_modules/.bin/vitest"
}
```

#### Streaming for Large Datasets
```javascript
// Use streaming for large test results
const stream = require('stream');
const { pipeline } = require('stream/promises');

async function generateLargeReport(testResults) {
  const readableStream = new stream.Readable({
    objectMode: true,
    read() {
      // Stream test results in chunks
    }
  });
  
  const transformStream = new stream.Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      // Process chunk
      callback(null, processedChunk);
    }
  });
  
  const writeStream = fs.createWriteStream('test-report.html');
  
  await pipeline(readableStream, transformStream, writeStream);
}
```

### 4. CI/CD Integration Problems

**Symptoms:**
- Reports not uploaded as artifacts
- Different behavior in CI vs local
- Permission errors in CI environment

**Solutions:**

#### GitHub Actions
```yaml
# Fix artifact upload issues
- name: Upload test reports
  uses: actions/upload-artifact@v3
  if: always() # Upload even if tests fail
  with:
    name: test-reports-${{ github.run_id }}
    path: |
      test-reports/
      coverage/
    retention-days: 30

# Fix permissions
- name: Fix permissions
  run: |
    sudo chown -R $USER:$USER test-reports/
    chmod -R 755 test-reports/
```

#### Jenkins
```groovy
// Fix HTML publishing
publishHTML([
    allowMissing: false,
    alwaysLinkToLastBuild: true,
    keepAll: true,
    reportDir: 'test-reports',
    reportFiles: '*.html',
    reportName: 'Test Reports',
    reportTitles: ''
])

// Fix workspace cleanup
cleanWs(
    cleanWhenAborted: true,
    cleanWhenFailure: true,
    cleanWhenNotBuilt: true,
    cleanWhenSuccess: true,
    cleanWhenUnstable: true,
    deleteDirs: true,
    disableDeferredWipeout: true,
    notFailBuild: true,
    patterns: [
        [pattern: 'test-reports/**', type: 'EXCLUDE']
    ]
)
```

#### Docker Issues
```dockerfile
# Fix volume mounting
FROM node:18-alpine
WORKDIR /app

# Create reports directory with correct permissions
RUN mkdir -p test-reports && \
    chown -R node:node test-reports && \
    chmod -R 755 test-reports

USER node

# Mount volume correctly
VOLUME ["/app/test-reports"]
```

### 5. Coverage Reporting Issues

**Symptoms:**
- Missing coverage data
- Incorrect coverage percentages
- Coverage reports not included

**Solutions:**

#### Vitest Configuration
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'c8'
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts,tsx}'],
      exclude: [
        'src/**/*.test.{js,ts,tsx}',
        'src/**/*.spec.{js,ts,tsx}',
        'src/test/**/*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.test.{js,ts,tsx}',
    '!src/**/*.spec.{js,ts,tsx}',
    '!src/test/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 6. Template and Styling Issues

**Symptoms:**
- Malformed HTML output
- Missing or broken styles
- Template compilation errors

**Solutions:**

#### Handlebars Template Debugging
```javascript
// Debug template compilation
const Handlebars = require('handlebars');
const fs = require('fs');

try {
  const templateSource = fs.readFileSync('./templates/report.hbs', 'utf8');
  const template = Handlebars.compile(templateSource);
  
  // Test with sample data
  const sampleData = {
    title: 'Test Report',
    totalTests: 100,
    passedTests: 95,
    failedTests: 5
  };
  
  const result = template(sampleData);
  console.log('Template compiled successfully');
} catch (error) {
  console.error('Template compilation failed:', error);
}
```

#### CSS Issues
```css
/* Fix common CSS problems */

/* 1. Missing box-sizing */
*, *::before, *::after {
  box-sizing: border-box;
}

/* 2. Responsive issues */
@media (max-width: 768px) {
  .test-results-table {
    font-size: 0.875rem;
  }
  
  .chart-container {
    height: 300px !important;
  }
}

/* 3. Print styles */
@media print {
  .no-print {
    display: none !important;
  }
  
  .test-suite {
    page-break-inside: avoid;
  }
}
```

### 7. File System Issues

**Symptoms:**
- "ENOENT" file not found errors
- "EACCES" permission denied errors
- Path resolution problems

**Solutions:**

#### Cross-platform Path Handling
```javascript
const path = require('path');

// Wrong
const reportPath = './test-reports/report.html';

// Correct
const reportPath = path.join(process.cwd(), 'test-reports', 'report.html');

// Ensure directory exists
const fs = require('fs').promises;
await fs.mkdir(path.dirname(reportPath), { recursive: true });
```

#### Permission Fixes
```bash
# Linux/macOS
sudo chown -R $USER:$USER test-reports/
chmod -R 755 test-reports/

# Windows (PowerShell as Administrator)
icacls test-reports /grant Everyone:F /T
```

### 8. Environment-Specific Issues

**Symptoms:**
- Works locally but fails in CI
- Different results in different environments
- Missing environment variables

**Solutions:**

#### Environment Detection
```javascript
// test-reporting.config.js
const isCI = process.env.CI === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  // Environment-specific settings
  verbose: isDevelopment,
  includeDebugInfo: isDevelopment,
  exitOnFailure: isCI,
  
  // CI-specific optimizations
  htmlTemplate: {
    includeCharts: !isCI, // Disable charts in CI for speed
    minify: isCI
  },
  
  // Environment variables with defaults
  outputDir: process.env.TEST_REPORT_OUTPUT_DIR || './test-reports',
  formats: (process.env.TEST_REPORT_FORMATS || 'html,markdown').split(',')
};
```

## Diagnostic Commands

### Health Check Script
```bash
#!/bin/bash
# test-reporting-health-check.sh

echo "🔍 Test Reporting Health Check"
echo "================================"

# Check Node.js version
echo "Node.js version: $(node --version)"

# Check dependencies
echo "Checking dependencies..."
npm list handlebars markdown-it fs-extra --depth=0

# Check configuration
echo "Validating configuration..."
node -e "
try {
  const config = require('./test-reporting.config.js');
  console.log('✅ Configuration loaded successfully');
  console.log('Output directory:', config.outputDir);
  console.log('Formats:', config.formats);
} catch (error) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}
"

# Check permissions
echo "Checking permissions..."
if [ -d "test-reports" ]; then
  if [ -w "test-reports" ]; then
    echo "✅ test-reports directory is writable"
  else
    echo "❌ test-reports directory is not writable"
  fi
else
  echo "⚠️  test-reports directory does not exist"
  mkdir -p test-reports && echo "✅ Created test-reports directory"
fi

# Test template compilation
echo "Testing template compilation..."
node -e "
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'src/test/reporting/templates/html-report.hbs');
if (fs.existsSync(templatePath)) {
  try {
    const template = fs.readFileSync(templatePath, 'utf8');
    Handlebars.compile(template);
    console.log('✅ HTML template compiles successfully');
  } catch (error) {
    console.error('❌ Template compilation failed:', error.message);
  }
} else {
  console.log('⚠️  HTML template not found at', templatePath);
}
"

echo "Health check complete!"
```

### Debug Information Collection
```javascript
// debug-info.js
const fs = require('fs');
const path = require('path');
const os = require('os');

function collectDebugInfo() {
  const info = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      cwd: process.cwd()
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      DEBUG: process.env.DEBUG
    },
    files: {
      configExists: fs.existsSync('./test-reporting.config.js'),
      reportsDir: fs.existsSync('./test-reports'),
      packageJson: JSON.parse(fs.readFileSync('./package.json', 'utf8')).dependencies
    }
  };
  
  console.log('Debug Information:');
  console.log(JSON.stringify(info, null, 2));
  
  // Save to file
  fs.writeFileSync('./debug-info.json', JSON.stringify(info, null, 2));
}

collectDebugInfo();
```

## Getting Help

If you're still experiencing issues after trying these solutions:

1. **Enable Debug Mode**: Set `DEBUG_TEST_REPORTING=true`
2. **Collect Debug Info**: Run the debug information script
3. **Check Logs**: Look for error messages in console output
4. **Minimal Reproduction**: Create a minimal test case that reproduces the issue
5. **Community Support**: Check GitHub issues or create a new one with debug information

## Prevention Tips

1. **Regular Updates**: Keep dependencies up to date
2. **Configuration Validation**: Validate config files in CI
3. **Monitoring**: Set up alerts for report generation failures
4. **Documentation**: Keep troubleshooting steps documented for your team
5. **Testing**: Test report generation in different environments