# Test Reporting Troubleshooting Guide

## Table of Contents

1. [Common Issues](#common-issues)
2. [Configuration Problems](#configuration-problems)
3. [Performance Issues](#performance-issues)
4. [CI/CD Integration Issues](#cicd-integration-issues)
5. [File System Issues](#file-system-issues)
6. [Memory and Resource Issues](#memory-and-resource-issues)
7. [Template and Rendering Issues](#template-and-rendering-issues)
8. [Debugging Tools](#debugging-tools)
9. [Getting Help](#getting-help)

## Common Issues

### Reports Not Generating

**Symptoms:**
- Tests run successfully but no reports are created
- `test-reports/` directory is empty or missing
- No console output about report generation

**Possible Causes & Solutions:**

1. **Test reporting disabled**
   ```bash
   # Check if reporting is enabled
   echo $TEST_REPORTING_ENABLED
   
   # Enable reporting
   export TEST_REPORTING_ENABLED=true
   # OR in test-reporting.config.js
   module.exports = { enabled: true };
   ```

2. **Missing configuration file**
   ```bash
   # Create basic configuration
   cat > test-reporting.config.js << EOF
   module.exports = {
     enabled: true,
     outputDirectory: 'test-reports',
     formats: { html: true, markdown: true }
   };
   EOF
   ```

3. **Incorrect npm script**
   ```bash
   # Verify the script exists
   npm run test:report
   
   # If missing, add to package.json
   "scripts": {
     "test:report": "node scripts/generate-test-reports.js"
   }
   ```

4. **Jest reporter not configured**
   ```javascript
   // Check jest.config.js
   module.exports = {
     reporters: [
       'default',
       ['<rootDir>/scripts/jest-reporter.js', {}]
     ]
   };
   ```

### Reports Generated But Empty or Incomplete

**Symptoms:**
- Report files exist but contain no data
- Missing test results or coverage information
- Partial report generation

**Possible Causes & Solutions:**

1. **No test results available**
   ```bash
   # Run tests first, then generate reports
   npm test
   npm run test:report
   
   # Or run tests with automatic reporting
   npm run test:with-reports
   ```

2. **Jest results not found**
   ```bash
   # Check if Jest results exist
   ls -la test-results/
   
   # Verify Jest configuration
   npx jest --showConfig
   ```

3. **Incorrect result parsing**
   ```bash
   # Enable debug logging
   export DEBUG_TEST_REPORTING=true
   npm run test:report
   ```

4. **Coverage data missing**
   ```bash
   # Ensure coverage is enabled
   npm test -- --coverage
   
   # Check coverage configuration in jest.config.js
   collectCoverage: true,
   coverageDirectory: 'coverage'
   ```

### HTML Report Not Interactive

**Symptoms:**
- HTML report displays but interactive features don't work
- No collapsible sections or sorting
- JavaScript errors in browser console

**Possible Causes & Solutions:**

1. **Interactive features disabled**
   ```javascript
   // In test-reporting.config.js
   module.exports = {
     html: {
       includeInteractiveFeatures: true,
       includeCharts: true
     }
   };
   ```

2. **JavaScript errors**
   ```bash
   # Check browser console for errors
   # Common fix: ensure templates are up to date
   npm run test:report -- --force-template-refresh
   ```

3. **CSP restrictions**
   ```html
   <!-- If serving reports through a web server, ensure CSP allows inline scripts -->
   <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline';">
   ```

## Configuration Problems

### Configuration Not Loading

**Symptoms:**
- Default settings used despite custom configuration
- Environment variables ignored
- Configuration file changes not reflected

**Diagnostic Steps:**

1. **Check configuration precedence**
   ```bash
   # Debug configuration loading
   export DEBUG_CONFIG_LOADING=true
   npm run test:report
   ```

2. **Verify file location and syntax**
   ```bash
   # Configuration file must be in project root
   ls -la test-reporting.config.js
   
   # Check syntax
   node -c test-reporting.config.js
   ```

3. **Test environment variable loading**
   ```bash
   # Print all test reporting environment variables
   env | grep TEST_REPORT
   env | grep HTML_
   env | grep MARKDOWN_
   ```

### Invalid Configuration Values

**Symptoms:**
- Configuration validation errors
- Unexpected behavior with custom settings
- Reports not matching expected format

**Solutions:**

1. **Validate configuration schema**
   ```javascript
   // Use the built-in validator
   const { validateConfig } = require('./scripts/config-validator');
   const config = require('./test-reporting.config.js');
   const result = validateConfig(config);
   console.log(result);
   ```

2. **Check data types**
   ```javascript
   // Common type issues
   module.exports = {
     enabled: true,              // boolean, not string
     maxFailureDetails: 10,      // number, not string
     formats: {                  // object, not array
       html: true,               // boolean
       markdown: true            // boolean
     }
   };
   ```

3. **Verify enum values**
   ```javascript
   // Valid theme values
   html: {
     theme: 'light' | 'dark' | 'auto'  // not 'bright' or 'custom'
   }
   ```

## Performance Issues

### Slow Report Generation

**Symptoms:**
- Report generation takes longer than 60 seconds
- High CPU usage during generation
- Build process significantly slowed

**Optimization Strategies:**

1. **Enable parallel processing**
   ```javascript
   // In test-reporting.config.js
   module.exports = {
     performance: {
       enableParallelGeneration: true,
       maxGenerationTime: 30000
     }
   };
   ```

2. **Reduce report complexity**
   ```javascript
   module.exports = {
     html: {
       includeCharts: false,        // Disable charts
       maxFailureDetails: 5         // Limit failure details
     },
     markdown: {
       includeStackTraces: false    // Reduce markdown size
     }
   };
   ```

3. **Optimize for large test suites**
   ```javascript
   module.exports = {
     performance: {
       streamProcessing: true,      // Process results as they come
       templateCaching: true,       // Cache compiled templates
       memoryLimit: 200            // Increase memory limit (MB)
     }
   };
   ```

### Memory Issues

**Symptoms:**
- Out of memory errors during generation
- Node.js heap limit exceeded
- System becomes unresponsive

**Solutions:**

1. **Increase Node.js memory limit**
   ```bash
   # Increase heap size
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run test:report
   ```

2. **Enable streaming processing**
   ```javascript
   module.exports = {
     performance: {
       streamProcessing: true,
       chunkSize: 100,              // Process in smaller chunks
       memoryLimit: 150             // Set memory limit
     }
   };
   ```

3. **Reduce data retention**
   ```javascript
   module.exports = {
     json: {
       includeRawResults: false,    // Exclude raw Jest results
       includeStackTraces: false    // Reduce memory usage
     }
   };
   ```

## CI/CD Integration Issues

### Reports Not Generated in CI

**Symptoms:**
- Reports work locally but not in CI/CD
- CI builds fail during report generation
- Missing artifacts in CI/CD pipeline

**Solutions:**

1. **Enable CI mode**
   ```bash
   # Set CI environment variables
   export CI=true
   export CI_REPORTING_ENABLED=true
   export CI_OUTPUT_FORMAT=all
   ```

2. **Check CI-specific configuration**
   ```javascript
   module.exports = {
     ci: {
       enabled: true,
       outputFormat: 'all',
       artifactPath: 'test-reports',
       compressReports: true
     }
   };
   ```

3. **Verify file permissions**
   ```bash
   # Ensure CI can write to output directory
   mkdir -p test-reports
   chmod 755 test-reports
   ```

### Artifact Upload Failures

**Symptoms:**
- Reports generated but not uploaded as artifacts
- CI/CD pipeline artifacts are empty
- Artifact size limits exceeded

**Solutions:**

1. **Check artifact configuration**
   ```yaml
   # GitHub Actions
   - name: Upload test reports
     uses: actions/upload-artifact@v3
     if: always()  # Upload even if tests fail
     with:
       name: test-reports
       path: test-reports/
       retention-days: 30
   ```

2. **Compress large reports**
   ```bash
   # Enable compression
   export CI_COMPRESS_REPORTS=true
   
   # Or manually compress
   tar -czf test-reports.tar.gz test-reports/
   ```

3. **Split large artifacts**
   ```yaml
   # Upload different formats separately
   - name: Upload HTML reports
     uses: actions/upload-artifact@v3
     with:
       name: html-reports
       path: test-reports/*.html
   
   - name: Upload JSON reports
     uses: actions/upload-artifact@v3
     with:
       name: json-reports
       path: test-reports/*.json
   ```

## File System Issues

### Permission Denied Errors

**Symptoms:**
- EACCES errors when creating reports
- Cannot write to output directory
- File system permission errors

**Solutions:**

1. **Check directory permissions**
   ```bash
   # Check current permissions
   ls -la test-reports/
   
   # Fix permissions
   chmod 755 test-reports/
   chmod 644 test-reports/*
   ```

2. **Create output directory**
   ```bash
   # Ensure directory exists
   mkdir -p test-reports
   
   # Or let the system create it
   export CREATE_OUTPUT_DIR=true
   ```

3. **Use alternative output location**
   ```javascript
   // Use temp directory if needed
   const os = require('os');
   module.exports = {
     outputDirectory: os.tmpdir() + '/test-reports'
   };
   ```

### File Locking Issues

**Symptoms:**
- EBUSY errors when writing files
- Files in use by another process
- Intermittent file write failures

**Solutions:**

1. **Enable file locking retry**
   ```javascript
   module.exports = {
     fileSystem: {
       retryAttempts: 3,
       retryDelay: 1000,
       enableFileLocking: true
     }
   };
   ```

2. **Close file handles properly**
   ```bash
   # Check for open file handles
   lsof | grep test-reports
   
   # Kill processes holding files
   pkill -f "test-report"
   ```

## Memory and Resource Issues

### High Memory Usage

**Symptoms:**
- Memory usage exceeds available RAM
- System becomes slow during report generation
- Out of memory crashes

**Monitoring and Solutions:**

1. **Monitor memory usage**
   ```bash
   # Monitor during report generation
   npm run test:report &
   PID=$!
   while kill -0 $PID 2>/dev/null; do
     ps -p $PID -o pid,vsz,rss,comm
     sleep 2
   done
   ```

2. **Configure memory limits**
   ```javascript
   module.exports = {
     performance: {
       memoryLimit: 100,           // MB
       enableMemoryMonitoring: true,
       memoryCheckInterval: 5000   // ms
     }
   };
   ```

3. **Use streaming for large datasets**
   ```javascript
   module.exports = {
     processing: {
       streamLargeResults: true,
       chunkSize: 50,
       enableGarbageCollection: true
     }
   };
   ```

### CPU Usage Issues

**Symptoms:**
- High CPU usage during report generation
- System becomes unresponsive
- Long generation times

**Solutions:**

1. **Limit CPU usage**
   ```bash
   # Use nice to lower priority
   nice -n 10 npm run test:report
   
   # Or use cpulimit
   cpulimit -l 50 npm run test:report
   ```

2. **Configure processing limits**
   ```javascript
   module.exports = {
     performance: {
       maxConcurrentProcesses: 2,
       processingTimeout: 30000,
       enableCpuThrottling: true
     }
   };
   ```

## Template and Rendering Issues

### Template Compilation Errors

**Symptoms:**
- Template syntax errors
- Handlebars compilation failures
- Missing template variables

**Solutions:**

1. **Validate template syntax**
   ```bash
   # Check template files
   node -e "
   const Handlebars = require('handlebars');
   const fs = require('fs');
   const template = fs.readFileSync('templates/html-report.hbs', 'utf8');
   try {
     Handlebars.compile(template);
     console.log('Template is valid');
   } catch (error) {
     console.error('Template error:', error.message);
   }
   "
   ```

2. **Reset to default templates**
   ```bash
   # Backup custom templates
   mv templates/ templates-backup/
   
   # Regenerate default templates
   npm run test:report -- --reset-templates
   ```

3. **Debug template variables**
   ```javascript
   // Enable template debugging
   module.exports = {
     debug: {
       enableTemplateDebugging: true,
       logTemplateVariables: true
     }
   };
   ```

### Rendering Performance Issues

**Symptoms:**
- Slow template rendering
- Large HTML files
- Browser performance issues

**Solutions:**

1. **Optimize templates**
   ```javascript
   module.exports = {
     html: {
       enableTemplateOptimization: true,
       minifyOutput: true,
       removeComments: true
     }
   };
   ```

2. **Reduce data complexity**
   ```javascript
   module.exports = {
     html: {
       maxTableRows: 1000,
       summarizeLargeDatasets: true,
       enableDataPagination: true
     }
   };
   ```

## Debugging Tools

### Enable Debug Logging

```bash
# Enable comprehensive debugging
export DEBUG=test-reporting:*
export DEBUG_TEST_REPORTING=true
export VERBOSE_LOGGING=true

# Run with debugging
npm run test:report
```

### Configuration Validation

```bash
# Validate current configuration
npm run test:validate-config

# Show effective configuration
npm run test:show-config

# Test configuration loading
npm run test:debug-config
```

### Performance Profiling

```bash
# Profile report generation
npm run test:report -- --profile

# Memory profiling
npm run test:report -- --profile-memory

# CPU profiling
npm run test:report -- --profile-cpu
```

### Template Debugging

```bash
# Debug template compilation
npm run test:debug-templates

# Validate template syntax
npm run test:validate-templates

# Show template variables
npm run test:show-template-data
```

## Getting Help

### Log Analysis

When reporting issues, include the following information:

1. **System Information**
   ```bash
   node --version
   npm --version
   cat package.json | grep -A5 -B5 "test"
   ```

2. **Configuration**
   ```bash
   cat test-reporting.config.js
   env | grep TEST_REPORT
   ```

3. **Error Logs**
   ```bash
   # Run with full debugging
   DEBUG=* npm run test:report 2>&1 | tee debug.log
   ```

4. **File System State**
   ```bash
   ls -la test-reports/
   df -h .
   free -h
   ```

### Common Log Patterns

**Configuration Issues:**
```
[test-reporting] Configuration validation failed
[test-reporting] Using default configuration
[test-reporting] Environment variable override: HTML_THEME=dark
```

**Performance Issues:**
```
[test-reporting] Memory usage: 150MB (limit: 100MB)
[test-reporting] Generation timeout after 30000ms
[test-reporting] Template compilation took 5.2s
```

**File System Issues:**
```
[test-reporting] EACCES: permission denied, open 'test-reports/report.html'
[test-reporting] ENOENT: no such file or directory, open 'test-results/results.json'
[test-reporting] Output directory created: test-reports/
```

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Documentation**: Check [TEST_REPORTING.md](./TEST_REPORTING.md) for detailed guides
3. **Developer Guide**: See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for customization
4. **Migration Guide**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for upgrade help

### Creating Effective Bug Reports

Include the following in bug reports:

1. **Environment Details**
   - Operating system and version
   - Node.js and npm versions
   - Project dependencies

2. **Configuration**
   - Complete configuration file
   - Environment variables
   - Package.json scripts

3. **Steps to Reproduce**
   - Exact commands run
   - Expected vs actual behavior
   - Minimal reproduction case

4. **Logs and Output**
   - Complete error messages
   - Debug logs
   - Generated file contents (if relevant)

5. **Workarounds Tried**
   - What solutions were attempted
   - Partial successes or failures