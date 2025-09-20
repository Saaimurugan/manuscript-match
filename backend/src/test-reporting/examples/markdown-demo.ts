/**
 * Demo script showing MarkdownReportGenerator usage
 * 
 * This script demonstrates how to use the MarkdownReportGenerator
 * to create comprehensive test reports in markdown format.
 */

import * as path from 'path';
import { MarkdownReportGenerator } from '../MarkdownReportGenerator';
import { TestReportAggregator } from '../TestReportAggregator';
import { 
  JestAggregatedResult,
  MarkdownReportConfig 
} from '../types';

async function demonstrateMarkdownReporting() {
  console.log('🚀 Markdown Report Generator Demo\n');

  // Create instances
  const generator = new MarkdownReportGenerator();
  const aggregator = new TestReportAggregator();

  // Create sample Jest test results
  const sampleJestResults: JestAggregatedResult = {
    testResults: [
      {
        testFilePath: '/src/services/user.test.ts',
        testResults: [
          {
            ancestorTitles: ['UserService'],
            fullName: 'UserService should create user successfully',
            title: 'should create user successfully',
            status: 'passed',
            duration: 45,
            failureMessages: [],
            numPassingAsserts: 3
          },
          {
            ancestorTitles: ['UserService'],
            fullName: 'UserService should validate email format',
            title: 'should validate email format',
            status: 'failed',
            duration: 25,
            failureMessages: ['Expected valid email but got invalid format'],
            numPassingAsserts: 0
          },
          {
            ancestorTitles: ['UserService'],
            fullName: 'UserService should handle duplicate emails',
            title: 'should handle duplicate emails',
            status: 'passed',
            duration: 30,
            failureMessages: [],
            numPassingAsserts: 2
          }
        ],
        perfStats: { start: 1000, end: 1100 },
        skipped: false,
        leaks: false,
        numFailingTests: 1,
        numPassingTests: 2,
        numPendingTests: 0,
        numTodoTests: 0,
        openHandles: [],
        sourceMaps: {},
        console: null
      },
      {
        testFilePath: '/src/controllers/auth.test.ts',
        testResults: [
          {
            ancestorTitles: ['AuthController'],
            fullName: 'AuthController should authenticate valid user',
            title: 'should authenticate valid user',
            status: 'passed',
            duration: 120,
            failureMessages: [],
            numPassingAsserts: 5
          },
          {
            ancestorTitles: ['AuthController'],
            fullName: 'AuthController should reject invalid credentials',
            title: 'should reject invalid credentials',
            status: 'passed',
            duration: 80,
            failureMessages: [],
            numPassingAsserts: 2
          }
        ],
        perfStats: { start: 1100, end: 1300 },
        skipped: false,
        leaks: false,
        numFailingTests: 0,
        numPassingTests: 2,
        numPendingTests: 0,
        numTodoTests: 0,
        openHandles: [],
        sourceMaps: {},
        console: null
      }
    ],
    numTotalTestSuites: 2,
    numPassedTestSuites: 1,
    numFailedTestSuites: 1,
    numPendingTestSuites: 0,
    numTotalTests: 5,
    numPassedTests: 4,
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    startTime: Date.now() - 5000,
    success: false,
    wasInterrupted: false
  };

  console.log('📊 Aggregating test results...');
  const aggregatedData = await aggregator.aggregateResults(sampleJestResults);

  // Configuration for comprehensive report
  const comprehensiveConfig: MarkdownReportConfig = {
    outputDirectory: path.join(__dirname, 'output'),
    filename: 'comprehensive-test-report.md',
    title: 'ScholarFinder Test Report',
    includeEmojis: true,
    includeStackTraces: true,
    maxFailureDetails: 10,
    includePerformanceMetrics: true,
    includeCoverageDetails: true,
    includeMetadata: true,
    sectionDepth: 2,
    showTimestamps: true
  };

  console.log('📝 Generating comprehensive markdown report...');
  const comprehensiveResult = await generator.generateReport(aggregatedData, comprehensiveConfig);

  if (comprehensiveResult.success) {
    console.log(`✅ Comprehensive report generated successfully!`);
    console.log(`   📁 File: ${comprehensiveResult.filePath}`);
    console.log(`   📏 Size: ${comprehensiveResult.size} bytes`);
    console.log(`   ⏱️  Generation time: ${comprehensiveResult.generationTime}ms\n`);
  } else {
    console.log(`❌ Failed to generate comprehensive report: ${comprehensiveResult.error}\n`);
  }

  // Configuration for minimal report (no emojis, basic content)
  const minimalConfig: MarkdownReportConfig = {
    outputDirectory: path.join(__dirname, 'output'),
    filename: 'minimal-test-report.md',
    title: 'Basic Test Report',
    includeEmojis: false,
    includeStackTraces: false,
    maxFailureDetails: 3,
    includePerformanceMetrics: false,
    includeCoverageDetails: false,
    includeMetadata: false,
    sectionDepth: 3
  };

  console.log('📄 Generating minimal markdown report...');
  const minimalResult = await generator.generateReport(aggregatedData, minimalConfig);

  if (minimalResult.success) {
    console.log(`✅ Minimal report generated successfully!`);
    console.log(`   📁 File: ${minimalResult.filePath}`);
    console.log(`   📏 Size: ${minimalResult.size} bytes`);
    console.log(`   ⏱️  Generation time: ${minimalResult.generationTime}ms\n`);
  } else {
    console.log(`❌ Failed to generate minimal report: ${minimalResult.error}\n`);
  }

  // Demonstrate configuration validation
  console.log('🔍 Testing configuration validation...');
  const invalidConfig: MarkdownReportConfig = {
    outputDirectory: '', // Invalid
    maxFailureDetails: -1, // Invalid
    sectionDepth: 10 // Invalid
  };

  const validation = generator.validateConfig(invalidConfig);
  console.log(`   Validation result: ${validation.isValid ? 'Valid' : 'Invalid'}`);
  if (!validation.isValid) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`   Warnings: ${validation.warnings.join(', ')}`);
  }

  console.log('\n🎉 Demo completed! Check the output directory for generated reports.');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateMarkdownReporting().catch(console.error);
}

export { demonstrateMarkdownReporting };