/**
 * Integration tests for MarkdownReportGenerator
 * 
 * Tests the markdown generator with real test data and file system operations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownReportGenerator } from '../MarkdownReportGenerator';
import { TestReportAggregator } from '../TestReportAggregator';
import { 
  JestAggregatedResult
} from '../types';
import { MarkdownReportConfig } from '../ReportGenerator';

describe('MarkdownReportGenerator Integration', () => {
  let generator: MarkdownReportGenerator;
  let aggregator: TestReportAggregator;
  let outputDir: string;

  beforeEach(async () => {
    generator = new MarkdownReportGenerator();
    aggregator = new TestReportAggregator();
    outputDir = path.join(__dirname, 'test-output', 'markdown');
    
    // Clean up output directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, ignore error
    }
  });

  afterEach(async () => {
    // Clean up output directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should generate a complete markdown report from aggregated test data', async () => {
    // Create mock Jest results
    const mockJestResults: JestAggregatedResult = {
      testResults: [
        {
          testFilePath: '/src/unit.test.ts',
          testResults: [
            {
              ancestorTitles: ['Unit Tests'],
              fullName: 'Unit Tests should pass basic test',
              title: 'should pass basic test',
              status: 'passed',
              duration: 50,
              failureMessages: [],
              numPassingAsserts: 1
            },
            {
              ancestorTitles: ['Unit Tests'],
              fullName: 'Unit Tests should fail validation test',
              title: 'should fail validation test',
              status: 'failed',
              duration: 100,
              failureMessages: ['Expected true but got false'],
              numPassingAsserts: 0
            }
          ],
          perfStats: { start: 1000, end: 1200 },
          skipped: false,
          leaks: false,
          numFailingTests: 1,
          numPassingTests: 1,
          numPendingTests: 0,
          numTodoTests: 0,
          openHandles: [],
          sourceMaps: {},
          console: null
        }
      ],
      numTotalTestSuites: 1,
      numPassedTestSuites: 0,
      numFailedTestSuites: 1,
      numPendingTestSuites: 0,
      numTotalTests: 2,
      numPassedTests: 1,
      numFailedTests: 1,
      numPendingTests: 0,
      numTodoTests: 0,
      startTime: Date.now() - 5000,
      success: false,
      wasInterrupted: false
    };

    // Aggregate the test data
    const aggregatedData = await aggregator.aggregateResults(mockJestResults);

    // Configure markdown report
    const config: MarkdownReportConfig = {
      outputDirectory: outputDir,
      filename: 'integration-test-report.md',
      title: 'Integration Test Report',
      includeEmojis: true,
      includeStackTraces: true,
      maxFailureDetails: 5,
      includePerformanceMetrics: false,
      includeCoverageDetails: true,
      includeMetadata: true
    };

    // Generate the report
    const result = await generator.generateReport(aggregatedData, config);

    // Verify the report was generated successfully
    expect(result.success).toBe(true);
    expect(result.filePath).toBe(path.join(outputDir, 'integration-test-report.md'));
    expect(result.size).toBeGreaterThan(0);

    // Verify the file exists and has content
    const reportContent = await fs.readFile(result.filePath, 'utf-8');
    expect(reportContent).toBeTruthy();

    // Verify key sections are present
    expect(reportContent).toContain('# 📊 Integration Test Report');
    expect(reportContent).toContain('## 📈 Summary');
    expect(reportContent).toContain('## 🎯 Coverage');
    expect(reportContent).toContain('## 🧪 Test Results by Category');
    expect(reportContent).toContain('## ❌ Failure Details');
    expect(reportContent).toContain('## 📋 Build Information');

    // Verify test statistics
    expect(reportContent).toContain('| Total Tests | 2 | - |');
    expect(reportContent).toContain('| Passed | 1 | ✅ |');
    expect(reportContent).toContain('| Failed | 1 | ❌ |');

    // Verify failure details
    expect(reportContent).toContain('### 1. should fail validation test');
    expect(reportContent).toContain('Expected true but got false');
  });

  it('should generate report without emojis when disabled', async () => {
    const mockJestResults: JestAggregatedResult = {
      testResults: [{
        testFilePath: '/src/simple.test.ts',
        testResults: [{
          ancestorTitles: ['Simple Tests'],
          fullName: 'Simple Tests should work',
          title: 'should work',
          status: 'passed',
          duration: 25,
          failureMessages: [],
          numPassingAsserts: 1
        }],
        perfStats: { start: 1000, end: 1025 },
        skipped: false,
        leaks: false,
        numFailingTests: 0,
        numPassingTests: 1,
        numPendingTests: 0,
        numTodoTests: 0,
        openHandles: [],
        sourceMaps: {},
        console: null
      }],
      numTotalTestSuites: 1,
      numPassedTestSuites: 1,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      startTime: Date.now() - 1000,
      success: true,
      wasInterrupted: false
    };

    const aggregatedData = await aggregator.aggregateResults(mockJestResults);

    const config: MarkdownReportConfig = {
      outputDirectory: outputDir,
      filename: 'no-emoji-report.md',
      title: 'Plain Test Report',
      includeEmojis: false,
      includeStackTraces: false,
      includeCoverageDetails: false,
      includePerformanceMetrics: false,
      includeMetadata: false
    };

    const result = await generator.generateReport(aggregatedData, config);

    expect(result.success).toBe(true);

    const reportContent = await fs.readFile(result.filePath, 'utf-8');

    // Should not contain emojis
    expect(reportContent).not.toContain('📊');
    expect(reportContent).not.toContain('📈');
    expect(reportContent).not.toContain('✅');
    expect(reportContent).not.toContain('❌');

    // Should contain plain headers
    expect(reportContent).toContain('# Plain Test Report');
    expect(reportContent).toContain('## Summary');
  });



  it('should validate configuration and reject invalid settings', async () => {
    const mockJestResults: JestAggregatedResult = {
      testResults: [],
      numTotalTestSuites: 0,
      numPassedTestSuites: 0,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      startTime: Date.now(),
      success: true,
      wasInterrupted: false
    };

    const aggregatedData = await aggregator.aggregateResults(mockJestResults);

    // Invalid configuration
    const config: MarkdownReportConfig = {
      outputDirectory: '', // Invalid empty directory
      maxFailureDetails: -5, // Invalid negative value
      sectionDepth: 10 // Invalid depth
    };

    const result = await generator.generateReport(aggregatedData, config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid configuration');
  });
});