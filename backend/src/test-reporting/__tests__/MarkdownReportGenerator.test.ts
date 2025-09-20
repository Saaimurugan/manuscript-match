/**
 * Unit tests for MarkdownReportGenerator
 * 
 * Tests all aspects of markdown report generation including formatting,
 * emoji indicators, table generation, and configuration options.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownReportGenerator } from '../MarkdownReportGenerator';
import { ReportFormat } from '../ReportGenerator';
import { 
  AggregatedTestData, 
  TestStatus, 
  TestCategory, 
  TestCaseData,
  TestSuiteData,
  CoverageMetrics,
  BuildMetadata
} from '../types';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('MarkdownReportGenerator', () => {
  let generator: MarkdownReportGenerator;
  let mockTestData: AggregatedTestData;
  let outputDir: string;

  beforeEach(() => {
    generator = new MarkdownReportGenerator();
    outputDir = path.join(__dirname, 'test-output');
    
    // Reset mocks
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);

    // Create comprehensive mock test data
    mockTestData = createMockTestData();
  });

  describe('generateReport', () => {
    it('should generate a complete markdown report successfully', async () => {
      const config = {
        outputDirectory: outputDir,
        filename: 'test-report.md',
        title: 'Test Report',
        includeEmojis: true,
        includeStackTraces: true,
        maxFailureDetails: 5
      };

      const result = await generator.generateReport(mockTestData, config);

      expect(result.success).toBe(true);
      expect(result.format).toBe(ReportFormat.MARKDOWN);
      expect(result.filePath).toBe(path.join(outputDir, 'test-report.md'));
      expect(result.size).toBe(1024);
      expect(mockFs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle generation errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      const config = {
        outputDirectory: outputDir,
        filename: 'test-report.md'
      };

      const result = await generator.generateReport(mockTestData, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });

    it('should validate configuration before generation', async () => {
      const config = {
        outputDirectory: '', // Invalid empty directory
        maxFailureDetails: -1 // Invalid negative value
      };

      const result = await generator.generateReport(mockTestData, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid configuration');
    });
  });

  describe('generateStructuredReport', () => {
    it('should generate structured markdown with all sections', async () => {
      const config = {
        outputDirectory: outputDir,
        includeEmojis: true,
        includeStackTraces: true,
        includeCoverageDetails: true,
        includePerformanceMetrics: true,
        includeMetadata: true,
        maxFailureDetails: 3
      };

      const content = await generator.generateStructuredReport(mockTestData, config);

      // Check for main sections
      expect(content).toContain('# 📊 Test Report');
      expect(content).toContain('## 📈 Summary');
      expect(content).toContain('## 🎯 Coverage');
      expect(content).toContain('## ⚡ Performance Metrics');
      expect(content).toContain('## 🧪 Test Results by Category');
      expect(content).toContain('## ❌ Failure Details');
      expect(content).toContain('## 📋 Build Information');
    });

    it('should exclude optional sections when configured', async () => {
      const config = {
        outputDirectory: outputDir,
        includeEmojis: false,
        includeStackTraces: false,
        includeCoverageDetails: false,
        includePerformanceMetrics: false,
        includeMetadata: false
      };

      const content = await generator.generateStructuredReport(mockTestData, config);

      expect(content).not.toContain('🎯 Coverage');
      expect(content).not.toContain('⚡ Performance Metrics');
      expect(content).not.toContain('📋 Build Information');
      expect(content).not.toContain('📊');
    });
  });

  describe('createSummarySection', () => {
    it('should create summary with emoji indicators', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: true,
        sectionDepth: 2
      };

      const summary = generator.createSummarySection(mockTestData, config);

      expect(summary).toContain('## 📈 Summary');
      expect(summary).toContain('| Metric | Value | Status |');
      expect(summary).toContain('| Total Tests | 15 | - |');
      expect(summary).toContain('| Passed | 12 | ✅ |');
      expect(summary).toContain('| Failed | 3 | ❌ |');
      expect(summary).toContain('**Overall Status:** ❌ FAILED'); // 80% pass rate with failures
      expect(summary).toContain('**Pass Rate:** 🟡 80.0%');
    });

    it('should create summary without emojis when disabled', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: false,
        sectionDepth: 3
      };

      const summary = generator.createSummarySection(mockTestData, config);

      expect(summary).toContain('### Summary');
      expect(summary).not.toContain('📈');
      expect(summary).not.toContain('✅');
      expect(summary).not.toContain('❌');
    });
  });

  describe('createCoverageSection', () => {
    it('should create detailed coverage tables', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: true,
        sectionDepth: 2
      };

      const coverage = generator.createCoverageSection(mockTestData, config);

      expect(coverage).toContain('## 🎯 Coverage');
      expect(coverage).toContain('| Type | Coverage | Covered/Total | Status |');
      expect(coverage).toContain('| Lines | 85.0% | 85/100 | 🟡 |');
      expect(coverage).toContain('| Functions | 90.0% | 90/100 | 🟢 |');
      expect(coverage).toContain('### Coverage by Category');
      expect(coverage).toContain('#### UNIT Tests');
    });

    it('should show coverage threshold status', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: true
      };

      const coverage = generator.createCoverageSection(mockTestData, config);

      expect(coverage).toContain('### Coverage Thresholds');
      expect(coverage).toContain('**Lines:** 85.0% / 80% ✅');
      expect(coverage).toContain('**Functions:** 90.0% / 85% ✅');
    });
  });

  describe('createTestResultsSection', () => {
    it('should group tests by category', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: true,
        maxFailureDetails: 5
      };

      const results = generator.createTestResultsSection(mockTestData, config);

      expect(results).toContain('## 🧪 Test Results by Category');
      expect(results).toContain('### UNIT Tests');
      expect(results).toContain('### INTEGRATION Tests');
      expect(results).toContain('| Metric | Value |');
      expect(results).toContain('| Total Tests |');
      expect(results).toContain('| Passed |');
      expect(results).toContain('| Failed |');
    });

    it('should show failed tests for each category', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: true,
        maxFailureDetails: 5
      };

      const results = generator.createTestResultsSection(mockTestData, config);

      expect(results).toContain('#### Failed Tests');
      expect(results).toContain('❌ **Failed Unit Test**');
    });
  });

  describe('createFailureDetailsSection', () => {
    it('should create detailed failure information', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeEmojis: true,
        includeStackTraces: true,
        maxFailureDetails: 2
      };

      const failures = generator.createFailureDetailsSection(mockTestData, config);

      expect(failures).toContain('❌ Failure Details');
      expect(failures).toContain('### 1. Failed Unit Test');
      expect(failures).toContain('**File:** `Failed Unit Test`');
      expect(failures).toContain('**Category:** UNIT');
      expect(failures).toContain('**Error Message:**');
      expect(failures).toContain('**Stack Trace:**');
      expect(failures).toContain('Expected true but got false');
    });

    it('should limit number of failures shown', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeStackTraces: true,
        maxFailureDetails: 1
      };

      const failures = generator.createFailureDetailsSection(mockTestData, config);

      expect(failures).toContain('### 1. Failed Unit Test');
      expect(failures).not.toContain('### 2.');
      expect(failures).toContain('*... and 2 more failures*');
    });

    it('should exclude stack traces when disabled', () => {
      const config = { 
        outputDirectory: outputDir, 
        includeStackTraces: false,
        maxFailureDetails: 5
      };

      const failures = generator.createFailureDetailsSection(mockTestData, config);

      expect(failures).toContain('**Error Message:**');
      expect(failures).not.toContain('**Stack Trace:**');
    });
  });

  describe('formatStackTrace', () => {
    it('should format stack trace without truncation', () => {
      const stackTrace = 'Error: Test failed\n    at test.js:10:5\n    at run.js:20:10';
      const formatted = generator.formatStackTrace(stackTrace);

      expect(formatted).toBe(stackTrace);
    });

    it('should truncate long stack traces', () => {
      const longStackTrace = 'A'.repeat(2000);
      const formatted = generator.formatStackTrace(longStackTrace, 100);

      expect(formatted).toHaveLength(115); // 100 + '... (truncated)'
      expect(formatted).toContain('... (truncated)');
    });
  });

  describe('getStatusEmoji', () => {
    it('should return correct emojis for test statuses', () => {
      const config = { outputDirectory: outputDir, includeEmojis: true };

      expect(generator.getStatusEmoji('passed', config)).toBe('✅');
      expect(generator.getStatusEmoji('failed', config)).toBe('❌');
      expect(generator.getStatusEmoji('skipped', config)).toBe('⚠️');
      expect(generator.getStatusEmoji('todo', config)).toBe('📝');
      expect(generator.getStatusEmoji('unknown', config)).toBe('❓');
    });

    it('should return empty string when emojis disabled', () => {
      const config = { outputDirectory: outputDir, includeEmojis: false };

      expect(generator.getStatusEmoji('passed', config)).toBe('');
      expect(generator.getStatusEmoji('failed', config)).toBe('');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config = {
        outputDirectory: '/valid/path',
        maxFailureDetails: 5,
        sectionDepth: 2,
        tableFormat: 'github' as const
      };

      const result = generator.validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing output directory', () => {
      const config = {
        outputDirectory: ''
      };

      const result = generator.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Output directory is required');
    });

    it('should detect invalid maxFailureDetails', () => {
      const config = {
        outputDirectory: '/valid/path',
        maxFailureDetails: -1
      };

      const result = generator.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxFailureDetails must be non-negative');
    });

    it('should detect invalid sectionDepth', () => {
      const config = {
        outputDirectory: '/valid/path',
        sectionDepth: 7
      };

      const result = generator.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('sectionDepth must be between 1 and 6');
    });

    it('should warn about unknown table format', () => {
      const config = {
        outputDirectory: '/valid/path',
        tableFormat: 'unknown' as any
      };

      const result = generator.validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Unknown table format, using default');
    });
  });

  describe('getFormat', () => {
    it('should return MARKDOWN format', () => {
      expect(generator.getFormat()).toBe(ReportFormat.MARKDOWN);
    });
  });

  describe('getOutputPath', () => {
    it('should generate correct output path with custom filename', () => {
      const config = {
        outputDirectory: '/test/output',
        filename: 'custom-report.md'
      };

      const outputPath = generator.getOutputPath(config);

      expect(outputPath).toBe(path.join('/test/output', 'custom-report.md'));
    });

    it('should use default filename when not specified', () => {
      const config = {
        outputDirectory: '/test/output'
      };

      const outputPath = generator.getOutputPath(config);

      expect(outputPath).toBe(path.join('/test/output', 'test-report.md'));
    });
  });
});

// Helper function to create comprehensive mock test data
function createMockTestData(): AggregatedTestData {
  const failedTests: TestCaseData[] = [
    {
      name: 'Failed Unit Test',
      status: TestStatus.FAILED,
      duration: 150,
      errorMessage: 'Expected true but got false',
      stackTrace: 'Error: Test failed\n    at test.js:10:5\n    at run.js:20:10',
      category: TestCategory.UNIT,
      fullName: 'Failed Unit Test',
      ancestorTitles: ['Unit Tests']
    },
    {
      name: 'Failed Integration Test',
      status: TestStatus.FAILED,
      duration: 300,
      errorMessage: 'API call failed with 500',
      stackTrace: 'Error: API Error\n    at api.js:15:3',
      category: TestCategory.INTEGRATION,
      fullName: 'Failed Integration Test',
      ancestorTitles: ['Integration Tests']
    },
    {
      name: 'Another Failed Test',
      status: TestStatus.FAILED,
      duration: 100,
      errorMessage: 'Timeout exceeded',
      category: TestCategory.UNIT,
      fullName: 'Another Failed Test',
      ancestorTitles: ['Unit Tests']
    }
  ];

  const passedTests: TestCaseData[] = Array.from({ length: 12 }, (_, i) => ({
    name: `Passed Test ${i + 1}`,
    status: TestStatus.PASSED,
    duration: 50 + i * 10,
    category: i < 8 ? TestCategory.UNIT : TestCategory.INTEGRATION,
    fullName: `Passed Test ${i + 1}`,
    ancestorTitles: [i < 8 ? 'Unit Tests' : 'Integration Tests']
  }));

  const allTests = [...failedTests, ...passedTests];

  const unitSuite: TestSuiteData = {
    name: 'Unit Test Suite',
    filePath: '/src/unit.test.ts',
    status: TestStatus.FAILED,
    duration: 1000,
    tests: allTests.filter(t => t.category === TestCategory.UNIT),
    category: TestCategory.UNIT,
    numPassingTests: 8,
    numFailingTests: 2,
    numPendingTests: 0,
    numTodoTests: 0,
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T10:01:00Z')
  };

  const integrationSuite: TestSuiteData = {
    name: 'Integration Test Suite',
    filePath: '/src/integration.test.ts',
    status: TestStatus.FAILED,
    duration: 2000,
    tests: allTests.filter(t => t.category === TestCategory.INTEGRATION),
    category: TestCategory.INTEGRATION,
    numPassingTests: 4,
    numFailingTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    startTime: new Date('2023-01-01T10:01:00Z'),
    endTime: new Date('2023-01-01T10:03:00Z')
  };

  const coverageMetrics: CoverageMetrics = {
    lines: { total: 100, covered: 85, percentage: 85.0 },
    functions: { total: 100, covered: 90, percentage: 90.0 },
    branches: { total: 100, covered: 75, percentage: 75.0 },
    statements: { total: 100, covered: 88, percentage: 88.0 }
  };

  const buildMetadata: BuildMetadata = {
    timestamp: new Date('2023-01-01T10:00:00Z'),
    buildVersion: '1.0.0',
    environment: 'test',
    gitInfo: {
      branch: 'main',
      commit: 'abc123def456',
      commitMessage: 'Add test reporting',
      author: 'Test Author',
      isDirty: false
    },
    nodeVersion: '18.0.0',
    platform: 'linux',
    architecture: 'x64',
    ciInfo: {
      isCI: true,
      provider: 'GitHub Actions',
      buildNumber: '123',
      jobId: 'job-456'
    }
  };

  return {
    summary: {
      totalTests: 15,
      passedTests: 12,
      failedTests: 3,
      skippedTests: 0,
      todoTests: 0,
      passRate: 80.0,
      executionTime: 3000,
      testSuites: 2,
      passedSuites: 0,
      failedSuites: 2
    },
    suiteResults: [unitSuite, integrationSuite],
    coverageData: {
      overall: coverageMetrics,
      byFile: {},
      byCategory: {
        [TestCategory.UNIT]: coverageMetrics,
        [TestCategory.INTEGRATION]: {
          lines: { total: 50, covered: 40, percentage: 80.0 },
          functions: { total: 50, covered: 45, percentage: 90.0 },
          branches: { total: 50, covered: 35, percentage: 70.0 },
          statements: { total: 50, covered: 42, percentage: 84.0 }
        },
        [TestCategory.E2E]: {
          lines: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 },
          statements: { total: 0, covered: 0, percentage: 0 }
        },
        [TestCategory.PERFORMANCE]: {
          lines: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 },
          statements: { total: 0, covered: 0, percentage: 0 }
        }
      },
      threshold: {
        lines: 80,
        functions: 85,
        branches: 70,
        statements: 80
      }
    },
    performanceMetrics: {
      averageResponseTime: 150,
      throughput: 500,
      memoryUsage: 128,
      cpuUsage: 45,
      p95ResponseTime: 300,
      p99ResponseTime: 500,
      errorRate: 0.02,
      concurrentUsers: 10
    },
    timestamp: new Date('2023-01-01T10:00:00Z'),
    buildMetadata,
    metrics: {
      summary: {
        totalTests: 15,
        passedTests: 12,
        failedTests: 3,
        skippedTests: 0,
        todoTests: 0,
        passRate: 80.0,
        executionTime: 3000,
        testSuites: 2,
        passedSuites: 0,
        failedSuites: 2
      },
      categoryBreakdown: {
        [TestCategory.UNIT]: {
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          skippedTests: 0,
          todoTests: 0,
          passRate: 80.0,
          executionTime: 1000,
          testSuites: 1,
          passedSuites: 0,
          failedSuites: 1
        },
        [TestCategory.INTEGRATION]: {
          totalTests: 5,
          passedTests: 4,
          failedTests: 1,
          skippedTests: 0,
          todoTests: 0,
          passRate: 80.0,
          executionTime: 2000,
          testSuites: 1,
          passedSuites: 0,
          failedSuites: 1
        },
        [TestCategory.E2E]: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          todoTests: 0,
          passRate: 0,
          executionTime: 0,
          testSuites: 0,
          passedSuites: 0,
          failedSuites: 0
        },
        [TestCategory.PERFORMANCE]: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          todoTests: 0,
          passRate: 0,
          executionTime: 0,
          testSuites: 0,
          passedSuites: 0,
          failedSuites: 0
        }
      },
      coverageMetrics: {
        overall: coverageMetrics,
        byFile: {},
        byCategory: {
          [TestCategory.UNIT]: coverageMetrics,
          [TestCategory.INTEGRATION]: {
            lines: { total: 50, covered: 40, percentage: 80.0 },
            functions: { total: 50, covered: 45, percentage: 90.0 },
            branches: { total: 50, covered: 35, percentage: 70.0 },
            statements: { total: 50, covered: 42, percentage: 84.0 }
          },
          [TestCategory.E2E]: {
            lines: { total: 0, covered: 0, percentage: 0 },
            functions: { total: 0, covered: 0, percentage: 0 },
            branches: { total: 0, covered: 0, percentage: 0 },
            statements: { total: 0, covered: 0, percentage: 0 }
          },
          [TestCategory.PERFORMANCE]: {
            lines: { total: 0, covered: 0, percentage: 0 },
            functions: { total: 0, covered: 0, percentage: 0 },
            branches: { total: 0, covered: 0, percentage: 0 },
            statements: { total: 0, covered: 0, percentage: 0 }
          }
        },
        threshold: {
          lines: 80,
          functions: 85,
          branches: 70,
          statements: 80
        }
      },
      slowestTests: allTests.slice(0, 5),
      failedTests,
      flakyTests: []
    }
  };
}