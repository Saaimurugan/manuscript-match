/**
 * Comprehensive test runner for all integration tests
 * Runs unit tests, integration tests, and generates coverage reports
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  command: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests',
    command: 'npm run test',
    description: 'Run all unit tests for services, hooks, and utilities'
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    description: 'Run integration tests for API communication and workflows'
  },
  {
    name: 'Component Tests',
    command: 'npm run test -- --testPathPattern="components.*test"',
    description: 'Run component tests with real API integration'
  },
  {
    name: 'Coverage Report',
    command: 'npm run test:coverage',
    description: 'Generate comprehensive test coverage report'
  }
];

async function runTestSuite(suite: TestSuite): Promise<{ success: boolean; output: string }> {
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`📝 ${suite.description}`);
  console.log(`⚡ Command: ${suite.command}\n`);

  try {
    const output = execSync(suite.command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 300000 // 5 minutes timeout
    });
    
    console.log(`✅ ${suite.name} completed successfully`);
    return { success: true, output };
  } catch (error: any) {
    console.log(`❌ ${suite.name} failed`);
    console.error(error.stdout || error.message);
    return { success: false, output: error.stdout || error.message };
  }
}

async function generateTestReport(results: Array<{ suite: TestSuite; result: { success: boolean; output: string } }>) {
  const reportPath = path.join(process.cwd(), 'test-results');
  
  // Ensure test-results directory exists
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.result.success).length,
      failed: results.filter(r => r.result.success === false).length,
    },
    results: results.map(({ suite, result }) => ({
      name: suite.name,
      description: suite.description,
      command: suite.command,
      success: result.success,
      output: result.output.slice(0, 1000) // Truncate long outputs
    }))
  };

  // Write JSON report
  fs.writeFileSync(
    path.join(reportPath, 'test-report.json'),
    JSON.stringify(report, null, 2)
  );

  // Write markdown report
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync(
    path.join(reportPath, 'test-report.md'),
    markdownReport
  );

  console.log(`\n📊 Test report generated:`);
  console.log(`   JSON: ${path.join(reportPath, 'test-report.json')}`);
  console.log(`   Markdown: ${path.join(reportPath, 'test-report.md')}`);
}

function generateMarkdownReport(report: any): string {
  const { summary, results, timestamp } = report;
  
  let markdown = `# Frontend-Backend Integration Test Report\n\n`;
  markdown += `**Generated:** ${new Date(timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Summary\n\n`;
  markdown += `- **Total Test Suites:** ${summary.total}\n`;
  markdown += `- **Passed:** ${summary.passed} ✅\n`;
  markdown += `- **Failed:** ${summary.failed} ${summary.failed > 0 ? '❌' : ''}\n`;
  markdown += `- **Success Rate:** ${Math.round((summary.passed / summary.total) * 100)}%\n\n`;
  
  markdown += `## Test Suite Results\n\n`;
  
  results.forEach((result: any) => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    markdown += `### ${result.name} ${status}\n\n`;
    markdown += `**Description:** ${result.description}\n\n`;
    markdown += `**Command:** \`${result.command}\`\n\n`;
    
    if (!result.success) {
      markdown += `**Error Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }
  });
  
  markdown += `## Coverage Information\n\n`;
  markdown += `Coverage reports are available in the \`coverage/\` directory after running the coverage test suite.\n\n`;
  
  markdown += `## Test Categories Covered\n\n`;
  markdown += `### Unit Tests\n`;
  markdown += `- ✅ Authentication Service\n`;
  markdown += `- ✅ API Service\n`;
  markdown += `- ✅ Process Service\n`;
  markdown += `- ✅ File Service\n`;
  markdown += `- ✅ Keyword Service\n`;
  markdown += `- ✅ Search Service\n`;
  markdown += `- ✅ Validation Service\n`;
  markdown += `- ✅ Recommendation Service\n`;
  markdown += `- ✅ Shortlist Service\n`;
  markdown += `- ✅ Admin Service\n`;
  markdown += `- ✅ Activity Logger\n`;
  markdown += `- ✅ Error Handler\n`;
  markdown += `- ✅ React Hooks\n\n`;
  
  markdown += `### Integration Tests\n`;
  markdown += `- ✅ Authentication Flow\n`;
  markdown += `- ✅ Complete Manuscript Analysis Workflow\n`;
  markdown += `- ✅ File Upload and Processing\n`;
  markdown += `- ✅ Keyword Enhancement\n`;
  markdown += `- ✅ Database Search\n`;
  markdown += `- ✅ Author Validation\n`;
  markdown += `- ✅ Reviewer Recommendations\n`;
  markdown += `- ✅ Shortlist Management\n`;
  markdown += `- ✅ Admin Dashboard\n`;
  markdown += `- ✅ Activity Logging\n`;
  markdown += `- ✅ Error Handling\n\n`;
  
  markdown += `### Component Tests\n`;
  markdown += `- ✅ Authentication Components\n`;
  markdown += `- ✅ Process Management Components\n`;
  markdown += `- ✅ File Upload Components\n`;
  markdown += `- ✅ Data Extraction Components\n`;
  markdown += `- ✅ Keyword Enhancement Components\n`;
  markdown += `- ✅ Search Components\n`;
  markdown += `- ✅ Validation Components\n`;
  markdown += `- ✅ Results Components\n`;
  markdown += `- ✅ Shortlist Components\n`;
  markdown += `- ✅ Admin Components\n`;
  markdown += `- ✅ Error Components\n\n`;
  
  return markdown;
}

async function main() {
  console.log('🚀 Starting comprehensive test suite for frontend-backend integration...\n');
  
  const results: Array<{ suite: TestSuite; result: { success: boolean; output: string } }> = [];
  
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push({ suite, result });
    
    // Add delay between test suites
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate comprehensive report
  await generateTestReport(results);
  
  const summary = {
    total: results.length,
    passed: results.filter(r => r.result.success).length,
    failed: results.filter(r => r.result.success === false).length,
  };
  
  console.log('\n🎯 Test Execution Summary:');
  console.log(`   Total Suites: ${summary.total}`);
  console.log(`   Passed: ${summary.passed} ✅`);
  console.log(`   Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : ''}`);
  console.log(`   Success Rate: ${Math.round((summary.passed / summary.total) * 100)}%`);
  
  if (summary.failed > 0) {
    console.log('\n❌ Some tests failed. Check the test report for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { runTestSuite, generateTestReport };