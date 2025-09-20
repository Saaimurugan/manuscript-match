#!/usr/bin/env node

/**
 * Post-Test Hook Script
 * 
 * This script is designed to be called after test execution to handle
 * report generation with proper error handling and CI/CD compatibility.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class PostTestHook {
  constructor(options = {}) {
    this.options = {
      ci: options.ci || process.env.CI === 'true',
      silent: options.silent || false,
      testType: options.testType || 'general',
      exitOnFailure: options.exitOnFailure || false,
      ...options
    };
    
    this.startTime = Date.now();
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

  async checkTestResults() {
    this.log('Checking for test results...', 'progress');
    
    try {
      // Check for various test result files
      const possiblePaths = [
        path.join(process.cwd(), 'test-results'),
        path.join(process.cwd(), 'coverage'),
        path.join(process.cwd(), 'jest-results.json')
      ];
      
      let hasResults = false;
      
      for (const testPath of possiblePaths) {
        try {
          await fs.access(testPath);
          hasResults = true;
          this.log(`Found test artifacts: ${testPath}`, 'info');
          break;
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasResults) {
        this.log('No test results found, report generation may be limited', 'warning');
      }
      
      return hasResults;
      
    } catch (error) {
      this.log(`Error checking test results: ${error.message}`, 'warning');
      return false;
    }
  }

  async generateReports() {
    this.log(`Generating ${this.options.testType} test reports...`, 'progress');
    
    try {
      const reportScript = path.join(process.cwd(), 'scripts', 'generate-test-reports.js');
      
      // Check if report generation script exists
      try {
        await fs.access(reportScript);
      } catch (error) {
        this.log('Report generation script not found, skipping...', 'warning');
        return { success: true, skipped: true };
      }
      
      // Prepare report generation arguments
      const args = ['node', reportScript];
      
      if (this.options.ci) {
        args.push('--ci');
      }
      
      if (this.options.silent) {
        args.push('--silent');
      } else {
        args.push('--verbose');
      }
      
      // Add test type context if available
      if (this.options.testType !== 'general') {
        // This could be used to customize report content based on test type
        process.env.TEST_TYPE_CONTEXT = this.options.testType;
      }
      
      return new Promise((resolve) => {
        const isWindows = process.platform === 'win32';
        
        const reportProcess = spawn(args[0], args.slice(1), {
          cwd: process.cwd(),
          env: {
            ...process.env,
            POST_TEST_HOOK: 'true',
            TEST_TYPE: this.options.testType
          },
          stdio: this.options.silent ? 'pipe' : 'inherit',
          shell: isWindows
        });

        let stdout = '';
        let stderr = '';

        if (this.options.silent) {
          reportProcess.stdout?.on('data', (data) => {
            stdout += data.toString();
          });

          reportProcess.stderr?.on('data', (data) => {
            stderr += data.toString();
          });
        }

        reportProcess.on('close', (code) => {
          const success = code === 0;
          
          if (success) {
            this.log('Report generation completed successfully', 'success');
            resolve({ success: true, output: stdout });
          } else {
            this.log(`Report generation failed with exit code ${code}`, 'warning');
            
            if (this.options.silent && stderr) {
              console.error('Report generation error:', stderr.slice(-500));
            }
            
            resolve({ success: false, error: stderr, exitCode: code });
          }
        });

        reportProcess.on('error', (error) => {
          this.log(`Report generation process error: ${error.message}`, 'warning');
          resolve({ success: false, error: error.message });
        });
      });
      
    } catch (error) {
      this.log(`Report generation setup failed: ${error.message}`, 'warning');
      return { success: false, error: error.message };
    }
  }

  async handleReportResult(result) {
    if (result.skipped) {
      this.log('Report generation was skipped', 'info');
      return true;
    }
    
    if (result.success) {
      this.log('Post-test report generation completed successfully', 'success');
      
      // Try to display report locations if not in silent mode
      if (!this.options.silent) {
        await this.displayReportInfo();
      }
      
      return true;
    } else {
      const errorMsg = `Report generation failed: ${result.error || 'Unknown error'}`;
      
      if (this.options.ci) {
        // In CI mode, log the error but don't fail the build
        this.log(`${errorMsg} (CI mode: continuing build)`, 'warning');
        return true;
      } else if (this.options.exitOnFailure) {
        // In development with explicit exit on failure
        this.log(errorMsg, 'error');
        return false;
      } else {
        // In development, warn but continue
        this.log(`${errorMsg} (continuing build)`, 'warning');
        return true;
      }
    }
  }

  async displayReportInfo() {
    try {
      const reportsDir = path.join(process.cwd(), 'test-reports');
      const files = await fs.readdir(reportsDir);
      
      const reportFiles = files.filter(file => 
        file.endsWith('.html') || file.endsWith('.md') || file.endsWith('.json')
      );
      
      if (reportFiles.length > 0) {
        console.log(`\n📊 Generated ${this.options.testType} test reports:`);
        for (const file of reportFiles) {
          console.log(`  📄 ${file}`);
        }
        console.log('');
      }
    } catch (error) {
      // Ignore errors in displaying report info
    }
  }

  async run() {
    try {
      this.log(`🔄 Running post-test hook for ${this.options.testType} tests`, 'info');
      
      // Check if we have test results to work with
      await this.checkTestResults();
      
      // Generate reports
      const result = await this.generateReports();
      
      // Handle the result appropriately
      const success = await this.handleReportResult(result);
      
      const duration = Date.now() - this.startTime;
      
      if (success) {
        this.log(`Post-test hook completed successfully (${duration}ms)`, 'success');
        process.exit(0);
      } else {
        this.log(`Post-test hook failed (${duration}ms)`, 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Post-test hook error: ${error.message}`, 'error');
      
      if (this.options.ci) {
        // In CI, don't fail the build for post-test hook errors
        console.log('⚠️  Post-test hook failed in CI mode, but continuing build...');
        process.exit(0);
      } else {
        process.exit(1);
      }
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ci: args.includes('--ci') || process.env.CI === 'true',
    silent: args.includes('--silent'),
    exitOnFailure: args.includes('--exit-on-failure'),
    testType: 'general'
  };
  
  // Parse test type
  const testTypeArg = args.find(arg => arg.startsWith('--test-type='));
  if (testTypeArg) {
    options.testType = testTypeArg.split('=')[1];
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const hook = new PostTestHook(options);
  
  hook.run().catch(error => {
    console.error('Post-test hook failed:', error);
    
    // In CI mode, don't fail the build
    if (process.env.CI === 'true') {
      console.log('⚠️  Continuing build despite post-test hook failure...');
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

module.exports = { PostTestHook };