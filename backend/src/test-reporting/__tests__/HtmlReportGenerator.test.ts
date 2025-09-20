/**
 * Unit Tests for HTML Report Generator
 * 
 * Tests the HTML report generation with various test data scenarios,
 * configuration options, and edge cases.
 */

import { HtmlReportGenerator } from '../HtmlReportGenerator';
import { ReportFormat, HtmlReportConfig } from '../ReportGenerator';
import { 
  AggregatedTestData, 
  TestStatus, 
  TestCategory, 
  TestCaseData, 
  TestSuiteData,
  TestSummary,
  TestMetrics,
  CoverageData,
  BuildMetadata
} from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('HtmlReportGenerator', () => {
  let generator: HtmlReportGenerator;
  let mockTestData: AggregatedTestData;
  let mockConfig: HtmlReportConfig;
  let tempDir: string;

  beforeEach(() => {
    generator = new HtmlReportGenerator();
    tempDir = path.join(os.tmpdir(), 'test-reports');
    
    // Setup mock test data
    mockTestData = createMockTestData();
    
    // Setup mock configuration
    mockConfig = {
      outputDirectory: tempDir,
      filename: 'test-report.html',
      title: 'Test Report',
      includeInteractiveFeatures: true,
      includeCharts: true,
      theme: 'light',
      showStackTraces: true,
      maxFailureDetails: 10
    };

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
  });

  describe('generateReport', () => {
    it('should generate a complete HTML report successfully', async () => {
      const result = await generator.generateReport(mockTestData, mockConfig);

      expect(result.success).toBe(true);
      expect(result.format).toBe(ReportFormat.HTML);
      expect(result.filePath).toBe(path.join(tempDir, 'test-report.html'));
      expect(result.size).toBe(1024);
      expect(result.generationTime).toBeGreaterThan(0);
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(tempDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(tempDir, 'test-report.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf8'
      );
    });

    it('should handle generation errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      const result = await generator.generateReport(mockTestData, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
      expect(result.generationTime).toBeGreaterThan(0);
    });

    it('should validate configuration before generation', async () => {
      const invalidConfig = { ...mockConfig, outputDirectory: '' };

      const result = await generator.generateReport(mockTestData, invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid configuration');
    });
  });

  describe('generateInteractiveReport', () => {
    it('should generate valid HTML structure', async () => {
      const html = await generator.generateInteractiveReport(mockTestData, mockConfig);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body class="theme-light">');
      expect(html).toContain('</html>');
      expect(html).toContain('<title>Test Report</title>');
    });

    it('should include embedded CSS', async () => {
      const html = await generator.generateInteractiveReport(mockTestData, mockConfig);

      expect(html).toContain('<style>');
      expect(html).toContain('/* Reset and Base Styles */');
      expect(html).toContain('.summary-cards');
      expect(html).toContain('.test-table');
    });

    it('should include embedded JavaScript when interactive features enabled', async () => {
      const html = await generator.generateInteractiveReport(mockTestData, mockConfig);

      expect(html).toContain('<script>');
      expect(html).toContain('function showTab');
      expect(html).toContain('function sortTable');
      expect(html).toContain('function filterTests');
    });

    it('should exclude JavaScript when interactive features disabled', async () => {
      const configWithoutJS = { ...mockConfig, includeInteractiveFeatures: false };
      const html = await generator.generateInteractiveReport(mockTestData, configWithoutJS);

      expect(html).not.toContain('<script>');
    });

    it('should include custom CSS when provided', async () => {
      const customConfig = { 
        ...mockConfig, 
        customCss: '.custom-style { color: red; }' 
      };
      const html = await generator.generateInteractiveReport(mockTestData, customConfig);

      expect(html).toContain('.custom-style { color: red; }');
    });
  });

  describe('createSummaryCards', () => {
    it('should generate summary cards with correct metrics', () => {
      const cards = generator.createSummaryCards(mockTestData);

      expect(cards).toContain('Total Tests');
      expect(cards).toContain('Passed');
      expect(cards).toContain('Failed');
      expect(cards).toContain('Coverage');
      expect(cards).toContain('Duration');
      
      // Check for specific values from mock data
      expect(cards).toContain('15'); // Total tests
      expect(cards).toContain('12'); // Passed tests
      expect(cards).toContain('2');  // Failed tests
      expect(cards).toContain('85.0%'); // Coverage
    });

    it('should apply correct status classes', () => {
      const cards = generator.createSummaryCards(mockTestData);

      expect(cards).toContain('class="card success"');
      expect(cards).toContain('class="card error"');
      expect(cards).toContain('class="progress-fill success"');
      expect(cards).toContain('class="progress-fill error"');
    });

    it('should handle zero test scenarios', () => {
      const emptyData = { 
        ...mockTestData, 
        summary: { 
          ...mockTestData.summary, 
          totalTests: 0, 
          passedTests: 0, 
          failedTests: 0 
        } 
      };
      
      const cards = generator.createSummaryCards(emptyData);

      expect(cards).toContain('0'); // Total tests
      expect(cards).not.toContain('NaN');
    });
  });

  describe('createTestResultsTables', () => {
    it('should generate tabs for each test category', () => {
      const tables = generator.createTestResultsTables(mockTestData);

      expect(tables).toContain('tab-unit');
      expect(tables).toContain('tab-integration');
      expect(tables).toContain('Unit');
      expect(tables).toContain('Integration');
    });

    it('should include failed tests tab when failures exist', () => {
      const tables = generator.createTestResultsTables(mockTestData);

      expect(tables).toContain('tab-failures');
      expect(tables).toContain('Failed Tests');
    });

    it('should include slow tests tab when slow tests exist', () => {
      const tables = generator.createTestResultsTables(mockTestData);

      expect(tables).toContain('tab-slow');
      expect(tables).toContain('Slowest Tests');
    });

    it('should include search and filter controls', () => {
      const tables = generator.createTestResultsTables(mockTestData);

      expect(tables).toContain('id="test-search"');
      expect(tables).toContain('id="status-filter"');
      expect(tables).toContain('onkeyup="filterTests()"');
      expect(tables).toContain('onchange="filterTests()"');
    });

    it('should generate sortable table headers', () => {
      const tables = generator.createTestResultsTables(mockTestData);

      expect(tables).toContain('onclick="sortTable(this, 0)"');
      expect(tables).toContain('class="sort-indicator"');
    });
  });

  describe('createPerformanceCharts', () => {
    it('should generate performance section when metrics available', () => {
      const charts = generator.createPerformanceCharts(mockTestData);

      expect(charts).toContain('Performance Metrics');
      expect(charts).toContain('Response Time Distribution');
      expect(charts).toContain('Test Duration by Category');
    });

    it('should return empty string when no performance metrics', () => {
      const dataWithoutPerf = { ...mockTestData, performanceMetrics: undefined };
      const charts = generator.createPerformanceCharts(dataWithoutPerf);

      expect(charts).toBe('');
    });

    it('should display performance values correctly', () => {
      const charts = generator.createPerformanceCharts(mockTestData);

      expect(charts).toContain('250ms'); // Average response time
      expect(charts).toContain('400ms'); // P95 response time
    });
  });

  describe('createCoverageVisualizations', () => {
    it('should generate coverage circles for all metrics', () => {
      const coverage = generator.createCoverageVisualizations(mockTestData);

      expect(coverage).toContain('Lines');
      expect(coverage).toContain('Functions');
      expect(coverage).toContain('Branches');
      expect(coverage).toContain('Statements');
    });

    it('should include SVG circular charts', () => {
      const coverage = generator.createCoverageVisualizations(mockTestData);

      expect(coverage).toContain('<svg');
      expect(coverage).toContain('circular-chart');
      expect(coverage).toContain('stroke-dasharray');
    });

    it('should display coverage percentages', () => {
      const coverage = generator.createCoverageVisualizations(mockTestData);

      expect(coverage).toContain('85.0%'); // Lines coverage
      expect(coverage).toContain('90.0%'); // Functions coverage
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const result = generator.validateConfig(mockConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing output directory', () => {
      const invalidConfig = { ...mockConfig, outputDirectory: '' };
      const result = generator.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Output directory is required');
    });

    it('should warn about invalid theme', () => {
      const configWithInvalidTheme = { ...mockConfig, theme: 'invalid' as any };
      const result = generator.validateConfig(configWithInvalidTheme);

      expect(result.warnings).toContain('Invalid theme, using default');
    });

    it('should warn about invalid maxFailureDetails', () => {
      const configWithInvalidMax = { ...mockConfig, maxFailureDetails: 0 };
      const result = generator.validateConfig(configWithInvalidMax);

      expect(result.warnings).toContain('maxFailureDetails should be at least 1');
    });
  });

  describe('getOutputPath', () => {
    it('should return correct output path', () => {
      const outputPath = generator.getOutputPath(mockConfig);

      expect(outputPath).toBe(path.join(tempDir, 'test-report.html'));
    });

    it('should use default filename when not provided', () => {
      const configWithoutFilename = { ...mockConfig };
      delete configWithoutFilename.filename;
      
      const outputPath = generator.getOutputPath(configWithoutFilename);

      expect(outputPath).toBe(path.join(tempDir, 'test-report.html'));
    });
  });

  describe('getFormat', () => {
    it('should return HTML format', () => {
      expect(generator.getFormat()).toBe(ReportFormat.HTML);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty test suites', async () => {
      const emptyData: AggregatedTestData = {
        ...mockTestData,
        suiteResults: [],
        summary: {
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
        metrics: {
          ...mockTestData.metrics,
          categoryBreakdown: {
            [TestCategory.UNIT]: {
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
            [TestCategory.INTEGRATION]: {
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
          failedTests: [],
          slowestTests: []
        }
      };

      await expect(async () => {
        await generator.generateInteractiveReport(emptyData, mockConfig);
      }).not.toThrow();
    });

    it('should escape HTML in test names and error messages', async () => {
      const firstSuite = mockTestData.suiteResults[0];
      const firstTest = firstSuite?.tests[0];
      
      if (!firstSuite || !firstTest) {
        throw new Error('Mock data is missing required test suite or test');
      }

      const dataWithHtml: AggregatedTestData = {
        ...mockTestData,
        suiteResults: [{
          ...firstSuite,
          name: '<script>alert("xss")</script>',
          filePath: firstSuite.filePath,
          status: firstSuite.status,
          duration: firstSuite.duration,
          category: firstSuite.category,
          numPassingTests: firstSuite.numPassingTests,
          numFailingTests: firstSuite.numFailingTests,
          numPendingTests: firstSuite.numPendingTests,
          numTodoTests: firstSuite.numTodoTests,
          startTime: firstSuite.startTime,
          endTime: firstSuite.endTime,
          tests: [{
            ...firstTest,
            name: '<img src=x onerror=alert(1)>',
            errorMessage: '<script>malicious()</script>',
            status: firstTest.status,
            duration: firstTest.duration,
            category: firstTest.category,
            fullName: firstTest.fullName,
            ancestorTitles: firstTest.ancestorTitles
          }]
        }]
      };

      const html = await generator.generateInteractiveReport(dataWithHtml, mockConfig);

      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).not.toContain('<script>malicious()</script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should handle very long test names and error messages', async () => {
      const longString = 'a'.repeat(10000);
      const firstSuite = mockTestData.suiteResults[0];
      const firstTest = firstSuite?.tests[0];
      
      if (!firstSuite || !firstTest) {
        throw new Error('Mock data is missing required test suite or test');
      }

      const dataWithLongStrings: AggregatedTestData = {
        ...mockTestData,
        suiteResults: [{
          ...firstSuite,
          name: firstSuite.name,
          filePath: firstSuite.filePath,
          status: firstSuite.status,
          duration: firstSuite.duration,
          category: firstSuite.category,
          numPassingTests: firstSuite.numPassingTests,
          numFailingTests: firstSuite.numFailingTests,
          numPendingTests: firstSuite.numPendingTests,
          numTodoTests: firstSuite.numTodoTests,
          startTime: firstSuite.startTime,
          endTime: firstSuite.endTime,
          tests: [{
            ...firstTest,
            name: longString,
            errorMessage: longString,
            status: firstTest.status,
            duration: firstTest.duration,
            category: firstTest.category,
            fullName: firstTest.fullName,
            ancestorTitles: firstTest.ancestorTitles
          }]
        }]
      };

      await expect(async () => {
        await generator.generateInteractiveReport(dataWithLongStrings, mockConfig);
      }).not.toThrow();
    });
  });
});

// Helper function to create mock test data
function createMockTestData(): AggregatedTestData {
  const mockTests: TestCaseData[] = [
    {
      name: 'should pass test 1',
      status: TestStatus.PASSED,
      duration: 50,
      category: TestCategory.UNIT,
      fullName: 'Unit Test Suite should pass test 1',
      ancestorTitles: ['Unit Test Suite']
    },
    {
      name: 'should fail test 1',
      status: TestStatus.FAILED,
      duration: 100,
      errorMessage: 'Expected true but got false',
      stackTrace: 'at test.js:10:5\nat Object.test (test.js:5:3)',
      category: TestCategory.UNIT,
      fullName: 'Unit Test Suite should fail test 1',
      ancestorTitles: ['Unit Test Suite']
    }
  ];

  const mockSuites: TestSuiteData[] = [
    {
      name: 'Unit Test Suite',
      filePath: '/src/__tests__/unit/example.test.ts',
      status: TestStatus.FAILED,
      duration: 150,
      tests: mockTests,
      category: TestCategory.UNIT,
      numPassingTests: 1,
      numFailingTests: 1,
      numPendingTests: 0,
      numTodoTests: 0,
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T10:00:01Z')
    },
    {
      name: 'Integration Test Suite',
      filePath: '/src/__tests__/integration/api.test.ts',
      status: TestStatus.PASSED,
      duration: 500,
      tests: Array(13).fill(null).map((_, i) => ({
        name: `integration test ${i + 1}`,
        status: TestStatus.PASSED,
        duration: 30,
        category: TestCategory.INTEGRATION,
        fullName: `Integration Test Suite integration test ${i + 1}`,
        ancestorTitles: ['Integration Test Suite']
      })),
      category: TestCategory.INTEGRATION,
      numPassingTests: 13,
      numFailingTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      startTime: new Date('2023-01-01T10:00:02Z'),
      endTime: new Date('2023-01-01T10:00:03Z')
    }
  ];

  const mockSummary: TestSummary = {
    totalTests: 15,
    passedTests: 12,
    failedTests: 2,
    skippedTests: 1,
    todoTests: 0,
    passRate: 80,
    executionTime: 650,
    testSuites: 2,
    passedSuites: 1,
    failedSuites: 1
  };

  const mockCoverage: CoverageData = {
    overall: {
      lines: { total: 100, covered: 85, percentage: 85.0 },
      functions: { total: 20, covered: 18, percentage: 90.0 },
      branches: { total: 50, covered: 40, percentage: 80.0 },
      statements: { total: 120, covered: 100, percentage: 83.3 }
    },
    byFile: {},
    byCategory: {
      [TestCategory.UNIT]: {
        lines: { total: 50, covered: 40, percentage: 80.0 },
        functions: { total: 10, covered: 9, percentage: 90.0 },
        branches: { total: 25, covered: 20, percentage: 80.0 },
        statements: { total: 60, covered: 50, percentage: 83.3 }
      },
      [TestCategory.INTEGRATION]: {
        lines: { total: 50, covered: 45, percentage: 90.0 },
        functions: { total: 10, covered: 9, percentage: 90.0 },
        branches: { total: 25, covered: 20, percentage: 80.0 },
        statements: { total: 60, covered: 50, percentage: 83.3 }
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
      functions: 80,
      branches: 80,
      statements: 80
    }
  };

  const mockBuildMetadata: BuildMetadata = {
    timestamp: new Date('2023-01-01T10:00:00Z'),
    buildVersion: '1.0.0',
    environment: 'test',
    gitInfo: {
      branch: 'main',
      commit: 'abc12345',
      commitMessage: 'Add test reporting',
      author: 'Test Author',
      isDirty: false
    },
    nodeVersion: 'v18.0.0',
    platform: 'linux',
    architecture: 'x64',
    ciInfo: {
      isCI: false
    }
  };

  const mockMetrics: TestMetrics = {
    summary: mockSummary,
    categoryBreakdown: {
      [TestCategory.UNIT]: {
        totalTests: 2,
        passedTests: 1,
        failedTests: 1,
        skippedTests: 0,
        todoTests: 0,
        passRate: 50,
        executionTime: 150,
        testSuites: 1,
        passedSuites: 0,
        failedSuites: 1
      },
      [TestCategory.INTEGRATION]: {
        totalTests: 13,
        passedTests: 13,
        failedTests: 0,
        skippedTests: 0,
        todoTests: 0,
        passRate: 100,
        executionTime: 500,
        testSuites: 1,
        passedSuites: 1,
        failedSuites: 0
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
    performanceMetrics: {
      averageResponseTime: 250,
      p95ResponseTime: 400,
      throughput: 100,
      memoryUsage: 50
    },
    coverageMetrics: mockCoverage,
    slowestTests: [
      {
        name: 'slow integration test',
        status: TestStatus.PASSED,
        duration: 2000,
        category: TestCategory.INTEGRATION,
        fullName: 'Integration Test Suite slow integration test',
        ancestorTitles: ['Integration Test Suite']
      }
    ],
    failedTests: [
      {
        name: 'should fail test 1',
        status: TestStatus.FAILED,
        duration: 100,
        errorMessage: 'Expected true but got false',
        stackTrace: 'at test.js:10:5\nat Object.test (test.js:5:3)',
        category: TestCategory.UNIT,
        fullName: 'Unit Test Suite should fail test 1',
        ancestorTitles: ['Unit Test Suite']
      }
    ]
  };

  return {
    summary: mockSummary,
    suiteResults: mockSuites,
    coverageData: mockCoverage,
    performanceMetrics: mockMetrics.performanceMetrics,
    timestamp: new Date('2023-01-01T10:00:00Z'),
    buildMetadata: mockBuildMetadata,
    metrics: mockMetrics
  };
}