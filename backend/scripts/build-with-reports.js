#!/usr/bin/env node

/**
 * Enhanced Build Script with Integrated Test Reporting
 * 
 * This script provides a comprehensive build process that includes:
 * - TypeScript compilation
 * - Test execution with proper exit codes
 * - Automatic report generation
 * - CI/CD compatibility
 * - Progress tracking and console output
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class BuildWithReports {
  constructor(options = {}) {
    this.options = {
      ci: options.ci || process.env.CI === 'true',
      skipTests: options.skipTests || false,
      skipReports: options.skipReports || false,
      verbose: options.verbose || false,
      failFast: options.failFast || false,
      coverage: options.coverage !== false,
      ...options
    };
    
    this.startTime = Date.now();
    this.buildSteps = [];
    this.overallSuccess = true;
    this.exitCode = 0;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '⏳',
      build: '🔨',
      test: '🧪',
      report: '📊'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async executeStep(stepName, command, args = [], options = {}) {
    this.log(`Starting ${stepName}...`, 'progress');
    const stepStartTime = Date.now();
    
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const actualCommand = isWindows && command === 'npm' ? 'npm.cmd' : command;
      
      const childProcess = spawn(actualCommand, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: this.options.ci ? 'production' : 'development',
          CI: this.options.ci ? 'true' : 'false',
          ...options.env
        },
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: isWindows
      });

      let stdout = '';
      let stderr = '';

      if (!this.options.verbose) {
        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      childProcess.on('close', (code) => {
        const duration = Date.now() - stepStartTime;
        const success = code === 0;
        
        this.buildSteps.push({
          name: stepName,
          success,
          duration,
          exitCode: code,
          stdout: stdout.slice(-1000), // Keep last 1000 chars
          stderr: stderr.slice(-1000)
        });
        
        if (success) {
          this.log(`${stepName} completed successfully (${Math.round(duration / 1000)}s)`, 'success');
        } else {
          this.log(`${stepName} failed with exit code ${code} (${Math.round(duration / 1000)}s)`, 'error');
          this.overallSuccess = false;
          this.exitCode = code;
          
          if (!this.options.verbose && stderr) {
            console.error(`Error output from ${stepName}:`, stderr.slice(-500));
          }
        }
        
        resolve(success);
      });

      childProcess.on('error', (error) => {
        this.log(`${stepName} process error: ${error.message}`, 'error');
        this.overallSuccess = false;
        this.exitCode = 1;
        resolve(false);
      });
    });
  }

  async buildTypeScript() {
    this.log('Building TypeScript...', 'build');
    
    const success = await this.executeStep(
      'TypeScript Build',
      'npm',
      ['run', 'build']
    );
    
    if (!success && this.options.failFast) {
      throw new Error('TypeScript build failed');
    }
    
    return success;
  }

  async runTests() {
    if (this.options.skipTests) {
      this.log('Skipping tests as requested', 'info');
      return true;
    }
    
    this.log('Running tests...', 'test');
    
    const testCommand = this.options.coverage ? 'test:coverage' : 'test';
    const testArgs = this.options.ci ? ['run', 'test:ci'] : ['run', testCommand];
    
    const success = await this.executeStep(
      'Test Execution',
      'npm',
      testArgs,
      {
        env: {
          NODE_ENV: 'test',
          DATABASE_URL: 'file:./test.db',
          JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long'
        }
      }
    );
    
    if (!success && this.options.failFast) {
      throw new Error('Tests failed');
    }
    
    return success;
  }

  async generateReports() {
    if (this.options.skipReports) {
      this.log('Skipping report generation as requested', 'info');
      return true;
    }
    
    this.log('Generating test reports...', 'report');
    
    const reportArgs = ['run', this.options.ci ? 'test:report:generate:ci' : 'test:report:generate'];
    
    try {
      const success = await this.executeStep(
        'Report Generation',
        'npm',
        reportArgs
      );
      
      if (success) {
        this.log('Test reports generated successfully', 'success');
        await this.displayReportLocations();
      } else {
        this.log('Report generation failed but continuing build...', 'warning');
      }
      
      // Report generation failure should not fail the build
      return true;
      
    } catch (error) {
      this.log(`Report generation error: ${error.message}`, 'warning');
      this.log('Continuing build despite report generation failure...', 'info');
      return true;
    }
  }

  async displayReportLocations() {
    try {
      const reportsDir = path.join(process.cwd(), 'test-reports');
      const files = await fs.readdir(reportsDir);
      
      const reportFiles = files.filter(file => 
        file.endsWith('.html') || file.endsWith('.md') || file.endsWith('.json')
      );
      
      if (reportFiles.length > 0) {
        console.log('\n📊 Generated Test Reports:');
        for (const file of reportFiles) {
          const fullPath = path.join(reportsDir, file);
          const stats = await fs.stat(fullPath);
          const size = (stats.size / 1024).toFixed(1);
          console.log(`  📄 ${file} (${size} KB)`);
        }
        console.log('');
      }
    } catch (error) {
      // Ignore errors in displaying report locations
    }
  }

  async validateBuildArtifacts() {
    this.log('Validating build artifacts...', 'progress');
    
    try {
      const distDir = path.join(process.cwd(), 'dist');
      const indexFile = path.join(distDir, 'index.js');
      
      await fs.access(distDir);
      await fs.access(indexFile);
      
      this.log('Build artifacts validated successfully', 'success');
      return true;
      
    } catch (error) {
      this.log(`Build artifact validation failed: ${error.message}`, 'error');
      this.overallSuccess = false;
      return false;
    }
  }

  printBuildSummary() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('🔨 BUILD SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`🕐 Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`📈 Overall Result: ${this.overallSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🏗️  CI Mode: ${this.options.ci ? 'Yes' : 'No'}`);
    
    console.log('\n📋 Build Steps:');
    this.buildSteps.forEach(step => {
      const status = step.success ? '✅' : '❌';
      const duration = Math.round(step.duration / 1000);
      console.log(`  ${status} ${step.name}: ${duration}s`);
    });
    
    if (!this.overallSuccess) {
      console.log('\n❌ Build failed. Check the detailed output above.');
      
      const failedSteps = this.buildSteps.filter(step => !step.success);
      if (failedSteps.length > 0) {
        console.log('\n🔍 Failed Steps:');
        failedSteps.forEach(step => {
          console.log(`  • ${step.name} (exit code: ${step.exitCode})`);
        });
      }
    } else {
      console.log('\n✅ Build completed successfully!');
    }
    
    console.log('\n' + '='.repeat(70));
  }

  async run() {
    try {
      this.log('🚀 Starting enhanced build with test reporting', 'info');
      
      // Step 1: Build TypeScript
      await this.buildTypeScript();
      
      // Step 2: Validate build artifacts
      await this.validateBuildArtifacts();
      
      // Step 3: Run tests
      await this.runTests();
      
      // Step 4: Generate reports (always try, even if tests failed)
      await this.generateReports();
      
      // Print build summary
      this.printBuildSummary();
      
      // Exit with appropriate code
      if (this.overallSuccess) {
        this.log('Build process completed successfully', 'success');
        process.exit(0);
      } else {
        this.log('Build process completed with failures', 'error');
        process.exit(this.exitCode || 1);
      }
      
    } catch (error) {
      this.log(`Build process failed: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ci: args.includes('--ci') || process.env.CI === 'true',
    skipTests: args.includes('--skip-tests'),
    skipReports: args.includes('--skip-reports'),
    verbose: args.includes('--verbose'),
    failFast: args.includes('--fail-fast'),
    coverage: !args.includes('--no-coverage')
  };
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const builder = new BuildWithReports(options);
  
  // Handle process signals gracefully
  process.on('SIGINT', () => {
    console.log('\n⚠️  Build interrupted by user');
    process.exit(130);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n⚠️  Build terminated');
    process.exit(143);
  });
  
  builder.run().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

module.exports = { BuildWithReports };