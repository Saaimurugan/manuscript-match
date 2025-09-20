#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * 
 * This script runs all test categories for the automated test reporting system
 * and validates that comprehensive test coverage is achieved.
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestCategory {
  name: string;
  pattern: string;
  description: string;
  required: boolean;
}

interface TestResult {
  category: string;
  passed: boolean;
  testCount: number;
  duration: number;
  error?: string;
}

const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'Unit Tests - Report Generators',
    pattern: 'HtmlReportGenerator|MarkdownReportGenerator|ReportGeneratorFactory',
    description: 'Tests for all report generator components with mock data',
    required: true
  },
  {
    name: 'Unit Tests - Configuration System',
    pattern: 'config.*test',
    description: 'Tests for configuration validation and customization',
    required: true
  },
  {
    name: 'Unit Tests - Error Handling',
    pattern: 'errors.*test',
    description: 'Tests for all error conditions and recovery paths',
    required: true
  },
  {
    name: 'Performance Tests',
    pattern: 'performance.*test',
    description: 'Tests for large test suite scenarios and performance targets',
    required: true
  },
  {
    name: 'Integration Tests',
    pattern: 'integration.*test',
    description: 'Tests for Jest reporter integration and build process',
    required: true
  },
  {
    name: 'CI/CD Pipeline Tests',
    pattern: 'ci-cd-pipeline',
    description: 'Tests for automated environment compatibility',
    required: true
  },
  {
    name: 'Configuration Validation Tests',
    pattern: 'configuration-validation',
    description: 'Tests for configuration validation and environment variables',
    required: true
  },
  {
    name: 'Comprehensive Coverage Tests',
    pattern: 'comprehensive-test-suite',
    description: 'Meta-tests that verify all requirements are covered',
    required: true
  }
];

async function runTestCategory(category: TestCategory): Promise<TestResult> {
  console.log(`\n🧪 Running ${category.name}...`);
  console.log(`📝 ${category.description}`);
  
  const startTime = Date.now();
  
  try {
    const output = execSync(
      `npm test -- --testPathPattern="${category.pattern}" --verbose --passWithNoTests`,
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout per category
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Parse test results from Jest output
    const testCountMatch = output.match(/Tests:\s+(\d+)\s+passed/);
    const testCount = testCountMatch ? parseInt(testCountMatch[1], 10) : 0;
    
    const passed = output.includes('PASS') && !output.includes('FAIL');
    
    console.log(`✅ ${category.name} completed in ${duration}ms`);
    console.log(`📊 Tests passed: ${testCount}`);
    
    return {
      category: category.name,
      passed,
      testCount,
      duration
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.log(`❌ ${category.name} failed in ${duration}ms`);
    console.log(`🔍 Error: ${error.message}`);
    
    return {
      category: category.name,
      passed: false,
      testCount: 0,
      duration,
      error: error.message
    };
  }
}

async function generateTestReport(results: TestResult[]): Promise<void> {
  const reportDir = path.join(process.cwd(), 'test-reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
  const passedCategories = results.filter(r => r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCategories: results.length,
      passedCategories,
      failedCategories: results.length - passedCategories,
      totalTests,
      totalDuration,
      overallSuccess: passedCategories === results.length
    },
    categories: results,
    requirements: {
      'Unit Tests for Report Generators': results.some(r => 
        r.category.includes('Report Generators') && r.passed
      ),
      'Integration Tests for Jest Reporter': results.some(r => 
        r.category.includes('Integration') && r.passed
      ),
      'End-to-End Build Process Tests': results.some(r => 
        r.category.includes('Integration') && r.passed
      ),
      'Performance Tests for Large Suites': results.some(r => 
        r.category.includes('Performance') && r.passed
      ),
      'Error Condition and Recovery Tests': results.some(r => 
        r.category.includes('Error Handling') && r.passed
      ),
      'Configuration Validation Tests': results.some(r => 
        r.category.includes('Configuration') && r.passed
      ),
      'CI/CD Pipeline Compatibility Tests': results.some(r => 
        r.category.includes('CI/CD') && r.passed
      )
    }
  };
  
  // Write JSON report
  const jsonPath = path.join(reportDir, 'comprehensive-test-results.json');
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  
  // Write Markdown summary
  const markdownPath = path.join(reportDir, 'comprehensive-test-summary.md');
  const markdown = generateMarkdownSummary(report);
  await fs.writeFile(markdownPath, markdown);
  
  console.log(`\n📋 Comprehensive test report generated:`);
  console.log(`📄 JSON: ${jsonPath}`);
  console.log(`📝 Markdown: ${markdownPath}`);
}

function generateMarkdownSummary(report: any): string {
  const { summary, categories, requirements } = report;
  
  return `# Comprehensive Test Suite Results

**Generated:** ${report.timestamp}

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Categories | ${summary.totalCategories} | - |
| Passed Categories | ${summary.passedCategories} | ${summary.passedCategories === summary.totalCategories ? '✅' : '❌'} |
| Failed Categories | ${summary.failedCategories} | ${summary.failedCategories === 0 ? '✅' : '❌'} |
| Total Tests | ${summary.totalTests} | - |
| Total Duration | ${Math.round(summary.totalDuration / 1000)}s | - |
| Overall Success | ${summary.overallSuccess ? 'PASSED' : 'FAILED'} | ${summary.overallSuccess ? '✅' : '❌'} |

## Test Categories

${categories.map((cat: any) => `
### ${cat.category}

- **Status:** ${cat.passed ? '✅ PASSED' : '❌ FAILED'}
- **Tests:** ${cat.testCount}
- **Duration:** ${Math.round(cat.duration / 1000)}s
${cat.error ? `- **Error:** ${cat.error}` : ''}
`).join('\n')}

## Requirements Coverage

${Object.entries(requirements).map(([req, covered]) => 
  `- **${req}:** ${covered ? '✅ Covered' : '❌ Missing'}`
).join('\n')}

## Recommendations

${summary.overallSuccess ? 
  '🎉 All test categories passed! The comprehensive test suite is working correctly.' :
  `⚠️ ${summary.failedCategories} test categories failed. Review the errors above and fix the failing tests.`
}

${summary.totalTests === 0 ? 
  '⚠️ No tests were executed. This might indicate a configuration issue.' : 
  `✅ ${summary.totalTests} tests were executed across all categories.`
}
`;
}

async function main(): Promise<void> {
  console.log('🚀 Starting Comprehensive Test Suite Runner');
  console.log('📋 This will run all test categories for the automated test reporting system\n');
  
  const results: TestResult[] = [];
  
  // Run each test category
  for (const category of TEST_CATEGORIES) {
    const result = await runTestCategory(category);
    results.push(result);
    
    // Add a small delay between categories
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate comprehensive report
  await generateTestReport(results);
  
  // Print final summary
  const passedCategories = results.filter(r => r.passed).length;
  const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed Categories: ${passedCategories}/${results.length}`);
  console.log(`🧪 Total Tests Executed: ${totalTests}`);
  console.log(`⏱️  Total Duration: ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s`);
  
  if (passedCategories === results.length) {
    console.log('\n🎉 SUCCESS: All test categories passed!');
    console.log('✅ The comprehensive test suite is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE: Some test categories failed.');
    console.log('⚠️  Review the test results and fix failing tests.');
    process.exit(1);
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Comprehensive test runner failed:', error);
    process.exit(1);
  });
}

export { runTestCategory, generateTestReport, TEST_CATEGORIES };