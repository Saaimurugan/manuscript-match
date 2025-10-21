/**
 * Comprehensive test runner for ScholarFinder
 * Executes all test types: unit, integration, accessibility, and e2e
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  type: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestSuite {
  name: string;
  command: string;
  timeout: number;
  required: boolean;
}

class ComprehensiveTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      command: 'npx vitest run --reporter=json --coverage',
      timeout: 300000, // 5 minutes
      required: true
    },
    {
      name: 'Integration Tests',
      command: 'npx vitest run --config vitest.integration.config.ts --reporter=json',
      timeout: 600000, // 10 minutes
      required: true
    },
    {
      name: 'Accessibility Tests',
      command: 'npx vitest run src/features/scholarfinder/__tests__/accessibility --reporter=json',
      timeout: 300000, // 5 minutes
      required: true
    },
    {
      name: 'API Integration Tests',
      command: 'npx vitest run src/features/scholarfinder/__tests__/integration --reporter=json',
      timeout: 600000, // 10 minutes
      required: true
    },
    {
      name: 'End-to-End Tests',
      command: 'npx playwright test --reporter=json',
      timeout: 1800000, // 30 minutes
      required: false // Optional for CI
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite for ScholarFinder\n');
    this.startTime = Date.now();

    // Create test reports directory
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate comprehensive report
    await this.generateReport();
    
    // Exit with appropriate code
    const hasFailures = this.results.some(result => result.failed > 0);
    const hasRequiredFailures = this.testSuites.some((suite, index) => 
      suite.required && this.results[index]?.failed > 0
    );

    if (hasRequiredFailures) {
      console.log('\n❌ Required tests failed. Exiting with error code 1.');
      process.exit(1);
    } else if (hasFailures) {
      console.log('\n⚠️  Some optional tests failed, but all required tests passed.');
      process.exit(0);
    } else {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n📋 Running ${suite.name}...`);
    const suiteStartTime = Date.now();

    try {
      const output = execSync(suite.command, {
        encoding: 'utf8',
        timeout: suite.timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const result = this.parseTestOutput(suite.name, output, suiteStartTime);
      this.results.push(result);
      
      console.log(`✅ ${suite.name} completed:`);
      console.log(`   Passed: ${result.passed}`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
      
      if (result.coverage) {
        console.log(`   Coverage: ${result.coverage.statements}% statements, ${result.coverage.branches}% branches`);
      }

    } catch (error: any) {
      const duration = Date.now() - suiteStartTime;
      
      if (error.status === 1) {
        // Test failures
        const result = this.parseTestOutput(suite.name, error.stdout || '', suiteStartTime);
        this.results.push(result);
        
        console.log(`❌ ${suite.name} had failures:`);
        console.log(`   Passed: ${result.passed}`);
        console.log(`   Failed: ${result.failed}`);
        console.log(`   Skipped: ${result.skipped}`);
        
        if (suite.required) {
          console.log(`   ⚠️  This is a required test suite!`);
        }
      } else {
        // Other errors (timeout, crash, etc.)
        const result: TestResult = {
          type: suite.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration
        };
        this.results.push(result);
        
        console.log(`💥 ${suite.name} crashed or timed out:`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
      }
    }
  }

  private parseTestOutput(suiteName: string, output: string, startTime: number): TestResult {
    const duration = Date.now() - startTime;
    
    try {
      // Try to parse as JSON (Vitest/Playwright JSON reporter)
      const jsonOutput = JSON.parse(output);
      
      if (jsonOutput.testResults) {
        // Vitest format
        const stats = jsonOutput.testResults.reduce((acc: any, file: any) => {
          acc.passed += file.assertionResults?.filter((r: any) => r.status === 'passed').length || 0;
          acc.failed += file.assertionResults?.filter((r: any) => r.status === 'failed').length || 0;
          acc.skipped += file.assertionResults?.filter((r: any) => r.status === 'skipped').length || 0;
          return acc;
        }, { passed: 0, failed: 0, skipped: 0 });

        const result: TestResult = {
          type: suiteName,
          passed: stats.passed,
          failed: stats.failed,
          skipped: stats.skipped,
          duration
        };

        // Add coverage if available
        if (jsonOutput.coverageMap) {
          const coverage = this.calculateCoverage(jsonOutput.coverageMap);
          result.coverage = coverage;
        }

        return result;
      } else if (jsonOutput.suites) {
        // Playwright format
        const stats = this.parsePlaywrightResults(jsonOutput.suites);
        return {
          type: suiteName,
          passed: stats.passed,
          failed: stats.failed,
          skipped: stats.skipped,
          duration
        };
      }
    } catch (parseError) {
      // Fallback: parse text output
      console.log('Failed to parse JSON output, falling back to text parsing');
    }

    // Fallback text parsing
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      type: suiteName,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration
    };
  }

  private parsePlaywrightResults(suites: any[]): { passed: number; failed: number; skipped: number } {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const processSuite = (suite: any) => {
      if (suite.tests) {
        suite.tests.forEach((test: any) => {
          if (test.results) {
            test.results.forEach((result: any) => {
              switch (result.status) {
                case 'passed':
                  passed++;
                  break;
                case 'failed':
                  failed++;
                  break;
                case 'skipped':
                  skipped++;
                  break;
              }
            });
          }
        });
      }
      
      if (suite.suites) {
        suite.suites.forEach(processSuite);
      }
    };

    suites.forEach(processSuite);
    return { passed, failed, skipped };
  }

  private calculateCoverage(coverageMap: any): { statements: number; branches: number; functions: number; lines: number } {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    Object.values(coverageMap).forEach((file: any) => {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter((count: any) => count > 0).length;
      }
      
      if (file.b) {
        Object.values(file.b).forEach((branch: any) => {
          if (Array.isArray(branch)) {
            totalBranches += branch.length;
            coveredBranches += branch.filter((count: any) => count > 0).length;
          }
        });
      }
      
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter((count: any) => count > 0).length;
      }
      
      if (file.l) {
        totalLines += Object.keys(file.l).length;
        coveredLines += Object.values(file.l).filter((count: any) => count > 0).length;
      }
    });

    return {
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
    };
  }

  private async generateReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalSkipped = this.results.reduce((sum, result) => sum + result.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(totalTests, totalPassed, totalFailed, totalSkipped, totalDuration);
    fs.writeFileSync(path.join('test-reports', 'comprehensive-test-report.html'), htmlReport);

    // Generate JSON report
    const jsonReport = {
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        totalSkipped,
        totalDuration,
        timestamp: new Date().toISOString()
      },
      results: this.results
    };
    fs.writeFileSync(path.join('test-reports', 'comprehensive-test-report.json'), JSON.stringify(jsonReport, null, 2));

    // Console summary
    console.log('\n📊 Test Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Skipped: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`\n📄 Reports generated in test-reports/`);
  }

  private generateHtmlReport(totalTests: number, totalPassed: number, totalFailed: number, totalSkipped: number, totalDuration: number): string {
    const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ScholarFinder Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .total { color: #007bff; }
        .results { margin-top: 30px; }
        .test-suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .suite-details { padding: 15px; }
        .coverage { margin-top: 10px; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 80%); }
        .timestamp { text-align: center; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ScholarFinder Comprehensive Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value total">${totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${totalPassed}</div>
                <div>${passRate}%</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${totalFailed}</div>
                <div>${((totalFailed / totalTests) * 100).toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Skipped</h3>
                <div class="value skipped">${totalSkipped}</div>
                <div>${((totalSkipped / totalTests) * 100).toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${(totalDuration / 1000).toFixed(2)}s</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Suite Results</h2>
            ${this.results.map(result => `
                <div class="test-suite">
                    <div class="suite-header">${result.type}</div>
                    <div class="suite-details">
                        <p><strong>Passed:</strong> <span class="passed">${result.passed}</span> | 
                           <strong>Failed:</strong> <span class="failed">${result.failed}</span> | 
                           <strong>Skipped:</strong> <span class="skipped">${result.skipped}</span></p>
                        <p><strong>Duration:</strong> ${(result.duration / 1000).toFixed(2)}s</p>
                        ${result.coverage ? `
                            <div class="coverage">
                                <p><strong>Code Coverage:</strong></p>
                                <div>Statements: ${result.coverage.statements}%</div>
                                <div class="coverage-bar">
                                    <div class="coverage-fill" style="width: ${result.coverage.statements}%"></div>
                                </div>
                                <div>Branches: ${result.coverage.branches}%</div>
                                <div class="coverage-bar">
                                    <div class="coverage-fill" style="width: ${result.coverage.branches}%"></div>
                                </div>
                                <div>Functions: ${result.coverage.functions}%</div>
                                <div class="coverage-bar">
                                    <div class="coverage-fill" style="width: ${result.coverage.functions}%"></div>
                                </div>
                                <div>Lines: ${result.coverage.lines}%</div>
                                <div class="coverage-bar">
                                    <div class="coverage-fill" style="width: ${result.coverage.lines}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Report generated at ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { ComprehensiveTestRunner };