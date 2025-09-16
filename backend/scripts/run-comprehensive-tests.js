#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * This script orchestrates the complete testing suite for the ScholarFinder backend,
 * providing detailed reporting and test management capabilities.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: false, duration: 0, coverage: 0 },
      integration: { passed: false, duration: 0, coverage: 0 },
      e2e: { passed: false, duration: 0, coverage: 0 },
      performance: { passed: false, duration: 0, metrics: {} }
    };
    this.startTime = Date.now();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      performance: '⚡'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async setupEnvironment() {
    this.log('Setting up test environment...', 'info');
    
    try {
      // Ensure test database is clean
      const testDbPath = path.join(__dirname, '../prisma/test.db');
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        this.log('Cleaned existing test database', 'info');
      }

      // Run database migrations
      const isWindows = process.platform === 'win32';
      const npxCommand = isWindows ? 'npx.cmd' : 'npx';
      
      execSync(`${npxCommand} prisma migrate deploy`, {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: 'file:./test.db' },
        stdio: 'pipe',
        shell: isWindows
      });
      
      this.log('Database migrations completed', 'success');

      // Generate Prisma client
      execSync(`${npxCommand} prisma generate`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        shell: isWindows
      });
      
      this.log('Prisma client generated', 'success');

    } catch (error) {
      this.log(`Environment setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runTestSuite(suiteName, command) {
    this.log(`Starting ${suiteName} tests...`, 'info');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const npmCommand = isWindows ? 'npm.cmd' : 'npm';
      
      const testProcess = spawn(npmCommand, ['run', command], {
        cwd: path.join(__dirname, '..'),
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
        stdout += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;

        this.results[suiteName] = {
          passed,
          duration,
          stdout,
          stderr,
          coverage: this.extractCoverage(stdout)
        };

        if (passed) {
          this.log(`${suiteName} tests completed successfully (${duration}ms)`, 'success');
        } else {
          this.log(`${suiteName} tests failed (${duration}ms)`, 'error');
          if (stderr) {
            console.log('Error output:', stderr);
          }
        }

        resolve(passed);
      });

      testProcess.on('error', (error) => {
        this.log(`${suiteName} test process error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  extractCoverage(output) {
    const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  async runPerformanceTests() {
    this.log('Running performance benchmarks...', 'performance');
    const startTime = Date.now();

    try {
      const result = await this.runTestSuite('performance', 'test:performance');
      
      // Extract performance metrics from output
      const metrics = this.extractPerformanceMetrics(this.results.performance.stdout);
      this.results.performance.metrics = metrics;

      if (result) {
        this.log('Performance tests completed successfully', 'success');
        this.logPerformanceMetrics(metrics);
      }

      return result;
    } catch (error) {
      this.log(`Performance tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  extractPerformanceMetrics(output) {
    const metrics = {};
    
    // Extract response time metrics
    const responseTimeMatch = output.match(/Average response time: (\d+\.?\d*)ms/);
    if (responseTimeMatch) {
      metrics.averageResponseTime = parseFloat(responseTimeMatch[1]);
    }

    // Extract throughput metrics
    const throughputMatch = output.match(/Throughput: (\d+\.?\d*) requests\/second/);
    if (throughputMatch) {
      metrics.throughput = parseFloat(throughputMatch[1]);
    }

    // Extract memory usage
    const memoryMatch = output.match(/Memory usage: (\d+\.?\d*)MB/);
    if (memoryMatch) {
      metrics.memoryUsage = parseFloat(memoryMatch[1]);
    }

    return metrics;
  }

  logPerformanceMetrics(metrics) {
    if (metrics.averageResponseTime) {
      this.log(`Average Response Time: ${metrics.averageResponseTime}ms`, 'performance');
    }
    if (metrics.throughput) {
      this.log(`Throughput: ${metrics.throughput} req/sec`, 'performance');
    }
    if (metrics.memoryUsage) {
      this.log(`Memory Usage: ${metrics.memoryUsage}MB`, 'performance');
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const allPassed = Object.values(this.results).every(result => result.passed);

    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      overallResult: allPassed ? 'PASSED' : 'FAILED',
      testSuites: this.results,
      summary: {
        totalTests: Object.keys(this.results).length,
        passedTests: Object.values(this.results).filter(r => r.passed).length,
        averageCoverage: this.calculateAverageCoverage(),
        totalDuration
      }
    };

    // Write detailed report to file
    const reportPath = path.join(__dirname, '../test-results/comprehensive-test-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  calculateAverageCoverage() {
    const coverageValues = Object.values(this.results)
      .map(r => r.coverage)
      .filter(c => c > 0);
    
    return coverageValues.length > 0 
      ? coverageValues.reduce((sum, c) => sum + c, 0) / coverageValues.length 
      : 0;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST SUITE SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`🕐 Total Duration: ${Math.round(report.totalDuration / 1000)}s`);
    console.log(`📈 Overall Result: ${report.overallResult}`);
    console.log(`🧪 Test Suites: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
    console.log(`📋 Average Coverage: ${report.summary.averageCoverage.toFixed(1)}%`);
    
    console.log('\n📋 Test Suite Details:');
    Object.entries(this.results).forEach(([suite, result]) => {
      const status = result.passed ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : '';
      console.log(`  ${status} ${suite}: ${duration}s${coverage}`);
    });

    if (report.testSuites.performance?.metrics) {
      console.log('\n⚡ Performance Metrics:');
      const metrics = report.testSuites.performance.metrics;
      if (metrics.averageResponseTime) {
        console.log(`  📊 Avg Response Time: ${metrics.averageResponseTime}ms`);
      }
      if (metrics.throughput) {
        console.log(`  🚀 Throughput: ${metrics.throughput} req/sec`);
      }
      if (metrics.memoryUsage) {
        console.log(`  💾 Memory Usage: ${metrics.memoryUsage}MB`);
      }
    }

    console.log('\n' + '='.repeat(60));
    
    if (!report.overallResult === 'PASSED') {
      console.log('❌ Some tests failed. Check the detailed output above.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!');
    }
  }

  async run() {
    try {
      this.log('🚀 Starting Comprehensive Test Suite', 'info');
      
      // Setup test environment
      await this.setupEnvironment();

      // Run test suites in sequence
      const testSuites = [
        { name: 'unit', command: 'test:unit' },
        { name: 'integration', command: 'test:integration' },
        { name: 'e2e', command: 'test:e2e' }
      ];

      for (const suite of testSuites) {
        const success = await this.runTestSuite(suite.name, suite.command);
        if (!success && process.env.FAIL_FAST === 'true') {
          this.log('Stopping due to test failure (FAIL_FAST=true)', 'error');
          break;
        }
      }

      // Run performance tests separately
      await this.runPerformanceTests();

      // Generate and display report
      const report = this.generateReport();
      this.printSummary(report);

    } catch (error) {
      this.log(`Test suite execution failed: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  failFast: args.includes('--fail-fast'),
  verbose: args.includes('--verbose'),
  suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1]
};

// Set environment variables based on options
if (options.failFast) {
  process.env.FAIL_FAST = 'true';
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});