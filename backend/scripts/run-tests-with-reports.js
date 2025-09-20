#!/usr/bin/env node

/**
 * Enhanced Test Runner with Integrated Reporting
 * 
 * This script runs tests and automatically generates comprehensive reports,
 * providing a seamless testing and reporting experience.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { TestReportGenerator } = require('./generate-test-reports');

class TestRunnerWithReports {
  constructor(options = {}) {
    this.options = {
      ci: options.ci || process.env.CI === 'true',
      failFast: options.failFast || false,
      verbose: options.verbose || false,
      suite: options.suite || 'all',
      coverage: options.coverage !== false,
      generateReports: options.generateReports !== false,
      ...options
    };
    
    this.startTime = Date.now();
    this.testResults = {};
    this.overallSuccess = true;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '⏳',
      test: '🧪'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async setupTestEnvironment() {
    this.log('Setting up test environment...', 'progress');
    
    try {
      // Ensure test results directory exists
      const testResultsDir = path.join(process.cwd(), 'test-results');
      await fs.mkdir(testResultsDir, { recursive: true });
      
      // Clean up old test results
      try {
        const files = await fs.readdir(testResultsDir);
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.xml')) {
            await fs.unlink(path.join(testResultsDir, file));
          }
        }
        this.log('Cleaned up old test results', 'info');
      } catch (error) {
        // Directory might be empty, that's fine
      }
      
      // Setup test database if needed
      const testDbPath = path.join(process.cwd(), 'prisma', 'test.db');
      try {
        await fs.unlink(testDbPath);
      } catch (error) {
        // File might not exist, that's fine
      }
      
      // Run database migrations for tests
      const isWindows = process.platform === 'win32';
      const npxCommand = isWindows ? 'npx.cmd' : 'npx';
      
      execSync(`${npxCommand} prisma migrate deploy`, {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: 'file:./test.db' },
        stdio: 'pipe',
        shell: isWindows
      });
      
      this.log('Test environment setup completed', 'success');
      
    } catch (error) {
      this.log(`Test environment setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runTestSuite(suiteName, jestArgs = []) {
    this.log(`Running ${suiteName} tests...`, 'test');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const npmCommand = isWindows ? 'npm.cmd' : 'npm';
      
      // Build Jest command with appropriate arguments
      const baseArgs = [
        '--runInBand', // Run tests serially for consistency
        '--forceExit', // Ensure Jest exits after tests
        '--detectOpenHandles', // Help identify hanging processes
      ];
      
      if (this.options.coverage) {
        baseArgs.push('--coverage');
      }
      
      if (this.options.ci) {
        baseArgs.push('--ci', '--watchAll=false');
      }
      
      // Add suite-specific arguments
      const allArgs = [...baseArgs, ...jestArgs];
      
      const testProcess = spawn('npx', ['jest', ...allArgs], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DATABASE_URL: 'file:./test.db',
          JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long'
        },
        stdio: 'pipe',
        shell: isWindows
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        if (this.options.verbose) {
          process.stdout.write(output);
        }
      });

      testProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (this.options.verbose) {
          process.stderr.write(output);
        }
      });

      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;
        
        this.testResults[suiteName] = {
          passed,
          duration,
          stdout,
          stderr,
          exitCode: code,
          coverage: this.extractCoverage(stdout)
        };
        
        if (passed) {
          this.log(`${suiteName} tests completed successfully (${Math.round(duration / 1000)}s)`, 'success');
        } else {
          this.log(`${suiteName} tests failed (${Math.round(duration / 1000)}s)`, 'error');
          this.overallSuccess = false;
          
          if (this.options.verbose && stderr) {
            console.error('Error output:', stderr);
          }
        }
        
        resolve(passed);
      });

      testProcess.on('error', (error) => {
        this.log(`${suiteName} test process error: ${error.message}`, 'error');
        this.overallSuccess = false;
        resolve(false);
      });
    });
  }

  extractCoverage(output) {
    // Extract coverage percentage from Jest output
    const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  async runAllTests() {
    const testSuites = [
      { name: 'unit', args: ['--testPathPattern=unit'] },
      { name: 'integration', args: ['--testPathPattern=integration'] },
      { name: 'e2e', args: ['--testPathPattern=e2e'] },
      { name: 'performance', args: ['--testPathPattern=performance'] }
    ];
    
    // Filter test suites based on options
    const suitesToRun = this.options.suite === 'all' 
      ? testSuites 
      : testSuites.filter(suite => suite.name === this.options.suite);
    
    this.log(`Running ${suitesToRun.length} test suite(s)...`, 'info');
    
    for (const suite of suitesToRun) {
      const success = await this.runTestSuite(suite.name, suite.args);
      
      if (!success && this.options.failFast) {
        this.log('Stopping test execution due to failure (fail-fast mode)', 'warning');
        break;
      }
    }
  }

  async saveTestResults() {
    this.log('Saving test results...', 'progress');
    
    try {
      const summary = this.generateTestSummary();
      const resultsPath = path.join(process.cwd(), 'test-results', 'jest-results.json');
      
      await fs.writeFile(resultsPath, JSON.stringify(summary, null, 2), 'utf8');
      this.log(`Test results saved: ${resultsPath}`, 'success');
      
      return resultsPath;
    } catch (error) {
      this.log(`Failed to save test results: ${error.message}`, 'error');
      throw error;
    }
  }

  generateTestSummary() {
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Object.values(this.testResults).reduce((sum, r) => sum + r.duration, 0);
    const averageCoverage = this.calculateAverageCoverage();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passedTests,
        failedTests,
        skippedTests: 0,
        passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        executionTime: totalDuration
      },
      testSuites: Object.entries(this.testResults).map(([name, result]) => ({
        name,
        passed: result.passed,
        duration: result.duration,
        coverage: result.coverage,
        tests: [] // Individual test details would be parsed from Jest output
      })),
      overallResult: this.overallSuccess ? 'PASSED' : 'FAILED',
      environment: {
        ci: this.options.ci,
        nodeVersion: process.version,
        platform: process.platform
      },
      coverage: {
        average: averageCoverage
      }
    };
  }

  calculateAverageCoverage() {
    const coverageValues = Object.values(this.testResults)
      .map(r => r.coverage)
      .filter(c => c > 0);
    
    return coverageValues.length > 0 
      ? coverageValues.reduce((sum, c) => sum + c, 0) / coverageValues.length 
      : 0;
  }

  async generateReports() {
    if (!this.options.generateReports) {
      this.log('Report generation disabled, skipping...', 'info');
      return;
    }
    
    this.log('Generating test reports...', 'progress');
    
    try {
      const reportGenerator = new TestReportGenerator({
        ci: this.options.ci,
        verbose: this.options.verbose,
        silent: false
      });
      
      const result = await reportGenerator.run();
      
      if (result.success) {
        this.log('Test reports generated successfully', 'success');
        
        // Display report locations
        if (result.reports && result.reports.length > 0) {
          console.log('\n📊 Generated Reports:');
          result.reports.forEach(report => {
            console.log(`  📄 ${report.format.toUpperCase()}: ${report.path}`);
          });
        }
      } else {
        this.log('Report generation completed with warnings', 'warning');
      }
      
    } catch (error) {
      this.log(`Report generation failed: ${error.message}`, 'error');
      
      if (!this.options.ci) {
        // In non-CI environments, we might want to fail
        throw error;
      }
      
      // In CI, continue even if report generation fails
      this.log('Continuing despite report generation failure (CI mode)', 'warning');
    }
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const summary = this.generateTestSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`🕐 Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`📈 Overall Result: ${summary.overallResult}`);
    console.log(`🧪 Test Suites: ${summary.summary.passedTests}/${summary.summary.totalTests} passed`);
    console.log(`📋 Average Coverage: ${summary.coverage.average.toFixed(1)}%`);
    
    console.log('\n📋 Test Suite Details:');
    Object.entries(this.testResults).forEach(([suite, result]) => {
      const status = result.passed ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : '';
      console.log(`  ${status} ${suite}: ${duration}s${coverage}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (!this.overallSuccess) {
      console.log('❌ Some tests failed. Check the detailed output above.');
    } else {
      console.log('✅ All tests passed successfully!');
    }
  }

  async run() {
    try {
      this.log('🚀 Starting enhanced test execution with reporting', 'info');
      
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run all test suites
      await this.runAllTests();
      
      // Save test results for report generation
      await this.saveTestResults();
      
      // Generate comprehensive reports
      await this.generateReports();
      
      // Print execution summary
      this.printSummary();
      
      // Exit with appropriate code
      if (this.overallSuccess) {
        this.log('Test execution completed successfully', 'success');
        process.exit(0);
      } else {
        this.log('Test execution completed with failures', 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
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
    failFast: args.includes('--fail-fast'),
    verbose: args.includes('--verbose'),
    coverage: !args.includes('--no-coverage'),
    generateReports: !args.includes('--no-reports'),
    suite: 'all'
  };
  
  // Parse suite option
  const suiteArg = args.find(arg => arg.startsWith('--suite='));
  if (suiteArg) {
    options.suite = suiteArg.split('=')[1];
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new TestRunnerWithReports(options);
  
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { TestRunnerWithReports };