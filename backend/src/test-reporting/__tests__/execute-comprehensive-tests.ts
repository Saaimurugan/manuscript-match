#!/usr/bin/env node

/**
 * Comprehensive Test Suite Execution Script
 * 
 * This script executes the comprehensive test suite for the automated test reporting system
 * and validates that all requirements are met according to task 11.
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestExecution {
  category: string;
  command: string;
  description: string;
  timeout: number;
  required: boolean;
}

interface ExecutionResult {
  category: string;
  success: boolean;
  duration: number;
  testCount: number;
  passedTests: number;
  failedTests: number;
  output: string;
  error?: string;
}

const TEST_EXECUTIONS: TestExecution[] = [
  {
    category: 'Unit Tests - Report Generators',
    command: 'npm test -- --testPathPattern="(HtmlReportGenerator|MarkdownReportGenerator|ReportGeneratorFactory).test" --verbose',
    description: 'Unit tests for all report generators with mock data',
    timeout: 60000,
    required: true
  },
  {
    category: 'Unit Tests - Core Components',
    command: 'npm test -- --testPathPattern="(TestReportAggregator|JestReporter).test" --verbose',
    description: 'Unit tests for core test reporting components',
    timeout: 45000,
    required: true
  },
  {
    category: 'Unit Tests - Configuration System',
    command: 'npm test -- --testPathPattern="config.*test" --verbose',
    description: 'Unit tests for configuration validation and customization',
    timeout: 30000,
    required: true
  },
  {
    category: 'Unit Tests - Error Handling',
    command: 'npm test -- --testPathPattern="errors.*test" --verbose',
    description: 'Unit tests for all error conditions and recovery paths',
    timeout: 45000,
    required: true
  },
  {
    category: 'Unit Tests - Templates',
    command: 'npm test -- --testPathPattern="templates.*test" --verbose',
    description: 'Unit tests for template management system',
    timeout: 30000,
    required: true
  },
  {
    category: 'Performance Tests',
    command: 'npm test -- --testPathPattern="performance.*test" --verbose',
    description: 'Performance tests for large test suite scenarios',
    timeout: 120000,
    required: true
  },
  {
    category: 'Integration Tests - Jest Reporter',
    command: 'npm test -- --testPathPattern="integration.*reporter.*test" --verbose',
    description: 'Integration tests for Jest reporter integration',
    timeout: 60000,
    required: true
  },
  {
    category: 'Integration Tests - Build Process',
    command: 'npm test -- --testPathPattern="integration.*build.*test" --verbose',
    description: 'End-to-end tests for complete build process with reporting',
    timeout: 90000,
    required: true
  },
  {
    category: 'CI/CD Pipeline Tests',
    command: 'npm test -- --testPathPattern="ci-cd-pipeline.test" --verbose',
    description: 'Tests for automated environment compatibility',
    timeout: 60000,
    required: true
  },
  {
    category: 'Configuration Validation Tests',
    command: 'npm test -- --testPathPattern="configuration-validation.test" --verbose',
    description: 'Tests for configuration validation and customization',
    timeout: 30000,
    required: true
  },
  {
    category: 'Comprehensive Coverage Tests',
    command: 'npm test -- --testPathPattern="comprehensive-test-suite.test" --verbose',
    description: 'Meta-tests that verify all requirements are covered',
    timeout: 45000,
    required: true
  }
];

async function executeTestCategory(execution: TestExecution): Promise<ExecutionResult> {
  console.log(`\n🧪 Executing: ${execution.category}`);
  console.log(`📝 ${execution.description}`);
  console.log(`⏱️  Timeout: ${execution.timeout / 1000}s`);
  
  const startTime = Date.now();
  
  try {
    const output = execSync(execution.command, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: execution.timeout
    });
    
    const duration = Date.now() - startTime;
    
    // Parse Jest output for test statistics
    const testStats = parseJestOutput(output);
    
    console.log(`✅ ${execution.category} completed in ${Math.round(duration / 1000)}s`);
    console.log(`📊 Tests: ${testStats.total} (${testStats.passed} passed, ${testStats.failed} failed)`);
    
    return {
      category: execution.category,
      success: testStats.failed === 0 && testStats.total > 0,
      duration,
      testCount: testStats.total,
      passedTests: testStats.passed,
      failedTests: testStats.failed,
      output
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.log(`❌ ${execution.category} failed in ${Math.round(duration / 1000)}s`);
    console.log(`🔍 Error: ${error.message}`);
    
    // Try to parse output even from failed execution
    const testStats = error.stdout ? parseJestOutput(error.stdout) : { total: 0, passed: 0, failed: 0 };
    
    return {
      category: execution.category,
      success: false,
      duration,
      testCount: testStats.total,
      passedTests: testStats.passed,
      failedTests: testStats.failed,
      output: error.stdout || '',
      error: error.message
    };
  }
}

function parseJestOutput(output: string): { total: number; passed: number; failed: number } {
  // Parse Jest output for test statistics
  const testSuitesMatch = output.match(/Test Suites:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?/);
  const testsMatch = output.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?/);
  
  let total = 0;
  let passed = 0;
  let failed = 0;
  
  if (testsMatch) {
    passed = parseInt(testsMatch[1] || '0', 10) || 0;
    failed = parseInt(testsMatch[2] || '0', 10) || 0;
    total = passed + failed;
  } else if (testSuitesMatch) {
    // Fallback to test suites if individual tests not reported
    passed = parseInt(testSuitesMatch[1] || '0', 10) || 0;
    failed = parseInt(testSuitesMatch[2] || '0', 10) || 0;
    total = passed + failed;
  }
  
  return { total, passed, failed };
}

async function validateRequirements(results: ExecutionResult[]): Promise<{ [key: string]: boolean }> {
  const requirements = {
    'Unit tests for all report generators with mock data': 
      results.some(r => r.category.includes('Report Generators') && r.success && r.testCount > 0),
    
    'Integration tests for Jest reporter integration': 
      results.some(r => r.category.includes('Jest Reporter') && r.success && r.testCount > 0),
    
    'End-to-end tests for complete build process with reporting': 
      results.some(r => r.category.includes('Build Process') && r.success && r.testCount > 0),
    
    'Performance tests for large test suite scenarios': 
      results.some(r => r.category.includes('Performance') && r.success && r.testCount > 0),
    
    'Tests for all error conditions and recovery paths': 
      results.some(r => r.category.includes('Error Handling') && r.success && r.testCount > 0),
    
    'Tests for configuration validation and customization': 
      results.some(r => r.category.includes('Configuration') && r.success && r.testCount > 0),
    
    'CI/CD pipeline tests for automated environment compatibility': 
      results.some(r => r.category.includes('CI/CD') && r.success && r.testCount > 0),
    
    'Comprehensive testing coverage': 
      results.filter(r => r.success && r.testCount > 0).length >= 7 // At least 7 categories should pass
  };
  
  return requirements;
}

async function generateExecutionReport(results: ExecutionResult[]): Promise<void> {
  const reportDir = path.join(process.cwd(), 'test-reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passedTests, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failedTests, 0);
  const successfulCategories = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  const requirements = await validateRequirements(results);
  const requirementsMet = Object.values(requirements).filter(Boolean).length;
  const totalRequirements = Object.keys(requirements).length;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCategories: results.length,
      successfulCategories,
      failedCategories: results.length - successfulCategories,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration: Math.round(totalDuration / 1000),
      overallSuccess: successfulCategories === results.length && totalTests > 0,
      requirementsMet,
      totalRequirements,
      requirementsSuccess: requirementsMet === totalRequirements
    },
    categories: results,
    requirements,
    task11Compliance: {
      'Unit tests for all report generators with mock data': requirements['Unit tests for all report generators with mock data'],
      'Integration tests for Jest reporter integration': requirements['Integration tests for Jest reporter integration'],
      'End-to-end tests for complete build process with reporting': requirements['End-to-end tests for complete build process with reporting'],
      'Performance tests for large test suite scenarios': requirements['Performance tests for large test suite scenarios'],
      'Tests for all error conditions and recovery paths': requirements['Tests for all error conditions and recovery paths'],
      'Tests for configuration validation and customization': requirements['Tests for configuration validation and customization'],
      'CI/CD pipeline tests for automated environment compatibility': requirements['CI/CD pipeline tests for automated environment compatibility'],
      'Comprehensive testing coverage': requirements['Comprehensive testing coverage']
    }
  };
  
  // Write JSON report
  const jsonPath = path.join(reportDir, 'comprehensive-test-execution.json');
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  
  // Write Markdown report
  const markdownPath = path.join(reportDir, 'comprehensive-test-execution.md');
  const markdown = generateExecutionMarkdown(report);
  await fs.writeFile(markdownPath, markdown);
  
  console.log(`\n📋 Comprehensive test execution report generated:`);
  console.log(`📄 JSON: ${jsonPath}`);
  console.log(`📝 Markdown: ${markdownPath}`);
}

function generateExecutionMarkdown(report: any): string {
  const { summary, categories, requirements, task11Compliance } = report;
  
  return `# Comprehensive Test Suite Execution Report

**Generated:** ${report.timestamp}

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Test Categories | ${summary.totalCategories} | - |
| Successful Categories | ${summary.successfulCategories} | ${summary.successfulCategories === summary.totalCategories ? '✅' : '❌'} |
| Failed Categories | ${summary.failedCategories} | ${summary.failedCategories === 0 ? '✅' : '❌'} |
| Total Tests Executed | ${summary.totalTests} | ${summary.totalTests > 0 ? '✅' : '❌'} |
| Tests Passed | ${summary.totalPassed} | ${summary.totalPassed > 0 ? '✅' : '❌'} |
| Tests Failed | ${summary.totalFailed} | ${summary.totalFailed === 0 ? '✅' : '❌'} |
| Total Duration | ${summary.totalDuration}s | - |
| Requirements Met | ${summary.requirementsMet}/${summary.totalRequirements} | ${summary.requirementsSuccess ? '✅' : '❌'} |
| **Overall Success** | **${summary.overallSuccess ? 'PASSED' : 'FAILED'}** | **${summary.overallSuccess ? '✅' : '❌'}** |

## Task 11 Compliance Check

${Object.entries(task11Compliance).map(([requirement, met]) => 
  `- **${requirement}:** ${met ? '✅ Compliant' : '❌ Not Compliant'}`
).join('\n')}

## Test Category Results

${categories.map((cat: any) => `
### ${cat.category}

- **Status:** ${cat.success ? '✅ PASSED' : '❌ FAILED'}
- **Tests:** ${cat.testCount} (${cat.passedTests} passed, ${cat.failedTests} failed)
- **Duration:** ${Math.round(cat.duration / 1000)}s
${cat.error ? `- **Error:** ${cat.error}` : ''}
`).join('\n')}

## Requirements Analysis

${Object.entries(requirements).map(([req, met]) => 
  `- **${req}:** ${met ? '✅ Met' : '❌ Not Met'}`
).join('\n')}

## Recommendations

${summary.overallSuccess ? 
  '🎉 **SUCCESS**: All test categories passed and requirements are met! The comprehensive test suite for task 11 is complete and working correctly.' :
  '⚠️ **ACTION REQUIRED**: Some test categories failed or requirements are not met. Review the failed categories above and address the issues.'
}

### Next Steps

${summary.overallSuccess ? 
  `✅ The comprehensive test suite is ready for production use.
✅ All automated test reporting system components are thoroughly tested.
✅ Task 11 requirements have been successfully implemented.` :
  `❌ Fix failing test categories before considering task 11 complete.
❌ Ensure all requirements are met according to the task specification.
❌ Review error messages and implement missing test coverage.`
}

## Test Coverage Summary

- **Unit Tests:** ${categories.filter((c: any) => c.category.includes('Unit')).length} categories
- **Integration Tests:** ${categories.filter((c: any) => c.category.includes('Integration')).length} categories  
- **Performance Tests:** ${categories.filter((c: any) => c.category.includes('Performance')).length} categories
- **CI/CD Tests:** ${categories.filter((c: any) => c.category.includes('CI/CD')).length} categories
- **Configuration Tests:** ${categories.filter((c: any) => c.category.includes('Configuration')).length} categories

**Total Test Execution Time:** ${summary.totalDuration} seconds
**Average Category Duration:** ${Math.round(summary.totalDuration / summary.totalCategories)} seconds
`;
}

async function main(): Promise<void> {
  console.log('🚀 Starting Comprehensive Test Suite Execution for Task 11');
  console.log('📋 This will execute all test categories for the automated test reporting system');
  console.log(`⏱️  Estimated total time: ${Math.round(TEST_EXECUTIONS.reduce((sum, e) => sum + e.timeout, 0) / 60000)} minutes\n`);
  
  const results: ExecutionResult[] = [];
  
  // Execute each test category
  for (let i = 0; i < TEST_EXECUTIONS.length; i++) {
    const execution = TEST_EXECUTIONS[i];
    if (!execution) continue;
    
    console.log(`\n📊 Progress: ${i + 1}/${TEST_EXECUTIONS.length}`);
    
    const result = await executeTestCategory(execution);
    results.push(result);
    
    // Add a small delay between categories to avoid resource conflicts
    if (i < TEST_EXECUTIONS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Generate comprehensive execution report
  await generateExecutionReport(results);
  
  // Print final summary
  const successfulCategories = results.filter(r => r.success).length;
  const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passedTests, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failedTests, 0);
  const requirements = await validateRequirements(results);
  const requirementsMet = Object.values(requirements).filter(Boolean).length;
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST SUITE EXECUTION SUMMARY - TASK 11');
  console.log('='.repeat(80));
  console.log(`✅ Successful Categories: ${successfulCategories}/${results.length}`);
  console.log(`🧪 Total Tests Executed: ${totalTests}`);
  console.log(`✅ Tests Passed: ${totalPassed}`);
  console.log(`❌ Tests Failed: ${totalFailed}`);
  console.log(`📋 Requirements Met: ${requirementsMet}/${Object.keys(requirements).length}`);
  console.log(`⏱️  Total Execution Time: ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s`);
  
  const overallSuccess = successfulCategories === results.length && 
                        totalTests > 0 && 
                        totalFailed === 0 &&
                        requirementsMet === Object.keys(requirements).length;
  
  if (overallSuccess) {
    console.log('\n🎉 SUCCESS: Task 11 - Comprehensive Test Suite Implementation COMPLETE!');
    console.log('✅ All test categories passed');
    console.log('✅ All requirements met');
    console.log('✅ Comprehensive test coverage achieved');
    console.log('\n📋 The automated test reporting system has comprehensive test coverage including:');
    console.log('   • Unit tests for all report generators with mock data');
    console.log('   • Integration tests for Jest reporter integration');
    console.log('   • End-to-end tests for complete build process with reporting');
    console.log('   • Performance tests for large test suite scenarios');
    console.log('   • Tests for all error conditions and recovery paths');
    console.log('   • Tests for configuration validation and customization');
    console.log('   • CI/CD pipeline tests for automated environment compatibility');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE: Task 11 implementation is incomplete');
    console.log('⚠️  Some test categories failed or requirements are not met');
    console.log('🔍 Review the execution report for detailed information');
    
    if (totalTests === 0) {
      console.log('❌ No tests were executed - check test file paths and Jest configuration');
    }
    if (totalFailed > 0) {
      console.log(`❌ ${totalFailed} tests failed - fix failing tests before completion`);
    }
    if (requirementsMet < Object.keys(requirements).length) {
      console.log(`❌ ${Object.keys(requirements).length - requirementsMet} requirements not met`);
    }
    
    process.exit(1);
  }
}

// Execute the comprehensive test suite
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Comprehensive test execution failed:', error);
    process.exit(1);
  });
}

export { executeTestCategory, validateRequirements, TEST_EXECUTIONS };