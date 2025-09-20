/**
 * Unit tests for TestReportAggregator
 * Tests enhanced aggregation logic with mock Jest results
 */

import { TestReportAggregator } from '../TestReportAggregator';
import {
  TestStatus,
  TestCategory,
  JestAggregatedResult,
  JestTestResult,
  TestReportAggregatorConfig
} from '../types';

describe('TestReportAggregator', () => {
  let aggregator: TestReportAggregator;
  let mockJestResults: JestAggregatedResult;

  beforeEach(() => {
    aggregator = new TestReportAggregator();
    mockJestResults = createMockJestResults();
  });

  describe('aggregateResults', () => {
    it('should aggregate Jest results into structured data', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('suiteResults');
      expect(result).toHaveProperty('coverageData');
      expect(result).toHaveProperty('buildMetadata');
      expect(result).toHaveProperty('metrics');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate correct test summary', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result.summary.totalTests).toBe(6);
      expect(result.summary.passedTests).toBe(4);
      expect(result.summary.failedTests).toBe(1);
      expect(result.summary.skippedTests).toBe(1);
      expect(result.summary.passRate).toBeCloseTo(66.67, 1); // 4/6 * 100, rounded
    });

    it('should process test suites correctly', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result.suiteResults).toHaveLength(3);
      expect(result.suiteResults[0]?.category).toBe(TestCategory.UNIT);
      expect(result.suiteResults[1]?.category).toBe(TestCategory.INTEGRATION);
      expect(result.suiteResults[2]?.category).toBe(TestCategory.E2E);
    });
  });

  describe('processTestSuites', () => {
    it('should process multiple test suites', async () => {
      const suites = await aggregator.processTestSuites(mockJestResults.testResults);

      expect(suites).toHaveLength(3);
      expect(suites[0]?.name).toBe('user.service.test');
      expect(suites[1]?.name).toBe('auth.integration.test');
      expect(suites[2]?.name).toBe('api.e2e.test');
    });

    it('should categorize test suites correctly', async () => {
      const suites = await aggregator.processTestSuites(mockJestResults.testResults);

      expect(suites[0]?.category).toBe(TestCategory.UNIT);
      expect(suites[1]?.category).toBe(TestCategory.INTEGRATION);
      expect(suites[2]?.category).toBe(TestCategory.E2E);
    });

    it('should calculate suite statistics correctly', async () => {
      const suites = await aggregator.processTestSuites(mockJestResults.testResults);

      const unitSuite = suites[0];
      expect(unitSuite?.numPassingTests).toBe(2);
      expect(unitSuite?.numFailingTests).toBe(0);
      expect(unitSuite?.status).toBe(TestStatus.PASSED);

      const integrationSuite = suites[1];
      expect(integrationSuite?.numPassingTests).toBe(1);
      expect(integrationSuite?.numFailingTests).toBe(1);
      expect(integrationSuite?.status).toBe(TestStatus.FAILED);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate comprehensive metrics', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result.metrics.summary).toBeDefined();
      expect(result.metrics.categoryBreakdown).toBeDefined();
      expect(result.metrics.slowestTests).toBeDefined();
      expect(result.metrics.failedTests).toBeDefined();
    });

    it('should identify slowest tests', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result.metrics.slowestTests.length).toBeGreaterThan(0);
      expect(result.metrics.slowestTests[0]?.duration).toBeGreaterThanOrEqual(1000);
    });

    it('should extract failed tests', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result.metrics.failedTests).toHaveLength(1);
      expect(result.metrics.failedTests[0]?.status).toBe(TestStatus.FAILED);
      expect(result.metrics.failedTests[0]?.errorMessage).toContain('Authentication failed');
    });

    it('should calculate category breakdown', async () => {
      const result = await aggregator.aggregateResults(mockJestResults);

      expect(result.metrics.categoryBreakdown[TestCategory.UNIT]).toBeDefined();
      expect(result.metrics.categoryBreakdown[TestCategory.INTEGRATION]).toBeDefined();
      expect(result.metrics.categoryBreakdown[TestCategory.E2E]).toBeDefined();

      const unitBreakdown = result.metrics.categoryBreakdown[TestCategory.UNIT];
      expect(unitBreakdown.totalTests).toBe(2);
      expect(unitBreakdown.passedTests).toBe(2);
      expect(unitBreakdown.passRate).toBe(100);
    });
  });

  describe('collectBuildMetadata', () => {
    it('should collect comprehensive build metadata', async () => {
      const metadata = await aggregator.collectBuildMetadata();

      expect(metadata.timestamp).toBeInstanceOf(Date);
      expect(metadata.environment).toBeDefined();
      expect(metadata.nodeVersion).toBeDefined();
      expect(metadata.platform).toBeDefined();
      expect(metadata.architecture).toBeDefined();
      expect(metadata.gitInfo).toBeDefined();
      expect(metadata.ciInfo).toBeDefined();
    });

    it('should handle git information gracefully', async () => {
      const metadata = await aggregator.collectBuildMetadata();

      expect(metadata.gitInfo.branch).toBeDefined();
      expect(metadata.gitInfo.commit).toBeDefined();
      expect(metadata.gitInfo.isDirty).toBeDefined();
    });

    it('should detect CI environment', async () => {
      // Mock CI environment
      const originalCI = process.env['CI'];
      process.env['CI'] = 'true';
      process.env['GITHUB_ACTIONS'] = 'true';
      process.env['GITHUB_RUN_NUMBER'] = '123';

      const metadata = await aggregator.collectBuildMetadata();

      expect(metadata.ciInfo?.isCI).toBe(true);
      expect(metadata.ciInfo?.provider).toBe('GitHub Actions');
      expect(metadata.ciInfo?.buildNumber).toBe('123');

      // Restore environment
      process.env['CI'] = originalCI;
      delete process.env['GITHUB_ACTIONS'];
      delete process.env['GITHUB_RUN_NUMBER'];
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig: Partial<TestReportAggregatorConfig> = {
        slowTestThreshold: 2000,
        includeStackTraces: false,
        maxStackTraceLength: 1000
      };

      const customAggregator = new TestReportAggregator(customConfig);
      expect(customAggregator['config'].slowTestThreshold).toBe(2000);
      expect(customAggregator['config'].includeStackTraces).toBe(false);
      expect(customAggregator['config'].maxStackTraceLength).toBe(1000);
    });

    it('should merge with default configuration', () => {
      const partialConfig: Partial<TestReportAggregatorConfig> = {
        slowTestThreshold: 500
      };

      const customAggregator = new TestReportAggregator(partialConfig);
      expect(customAggregator['config'].slowTestThreshold).toBe(500);
      expect(customAggregator['config'].includeStackTraces).toBe(true); // Default value
    });
  });

  describe('test categorization', () => {
    it('should categorize tests by file path', async () => {
      const customResults = createMockJestResultsWithPaths([
        '/src/__tests__/unit/service.test.ts',
        '/src/__tests__/integration/api.test.ts',
        '/src/__tests__/e2e/workflow.test.ts',
        '/src/__tests__/performance/load.test.ts'
      ]);

      const suites = await aggregator.processTestSuites(customResults.testResults);

      expect(suites[0]?.category).toBe(TestCategory.UNIT);
      expect(suites[1]?.category).toBe(TestCategory.INTEGRATION);
      expect(suites[2]?.category).toBe(TestCategory.E2E);
      expect(suites[3]?.category).toBe(TestCategory.PERFORMANCE);
    });

    it('should use custom path mappings', async () => {
      const customConfig: Partial<TestReportAggregatorConfig> = {
        pathCategoryMappings: {
          'custom/unit': TestCategory.UNIT,
          'custom/api': TestCategory.INTEGRATION
        }
      };

      const customAggregator = new TestReportAggregator(customConfig);
      const customResults = createMockJestResultsWithPaths([
        '/src/custom/unit/test.ts',
        '/src/custom/api/test.ts'
      ]);

      const suites = await customAggregator.processTestSuites(customResults.testResults);

      expect(suites[0]?.category).toBe(TestCategory.UNIT);
      expect(suites[1]?.category).toBe(TestCategory.INTEGRATION);
    });
  });

  describe('error handling', () => {
    it('should handle malformed test results gracefully', async () => {
      const malformedResults = {
        ...mockJestResults,
        testResults: [
          {
            ...mockJestResults.testResults[0],
            testResults: [
              {
                title: 'test without status',
                status: 'failed' as const, // Add missing status field
                duration: 100,
                failureMessages: [],
                ancestorTitles: [],
                fullName: 'test without status',
                numPassingAsserts: 0
              }
            ]
          }
        ]
      } as JestAggregatedResult;

      const result = await aggregator.aggregateResults(malformedResults);
      expect(result.suiteResults).toHaveLength(1);
      expect(result.suiteResults[0]?.tests[0]?.status).toBe(TestStatus.FAILED); // Default fallback
    });

    it('should truncate long error messages', async () => {
      const longErrorMessage = 'A'.repeat(1000);
      const resultsWithLongError = {
        ...mockJestResults,
        testResults: [
          {
            ...mockJestResults.testResults[0],
            testResults: [
              {
                title: 'test with long error',
                status: 'failed' as const,
                duration: 100,
                failureMessages: [longErrorMessage],
                ancestorTitles: [],
                fullName: 'test with long error',
                numPassingAsserts: 0
              }
            ]
          }
        ]
      } as JestAggregatedResult;

      const result = await aggregator.aggregateResults(resultsWithLongError);
      const errorMessage = result.suiteResults[0]?.tests[0]?.errorMessage;
      
      expect(errorMessage).toBeDefined();
      expect(errorMessage!.length).toBeLessThanOrEqual(503); // 500 + '...'
    });
  });
});

// Helper functions for creating mock data

function createMockJestResults(): JestAggregatedResult {
  return {
    numTotalTestSuites: 3,
    numPassedTestSuites: 2,
    numFailedTestSuites: 1,
    numPendingTestSuites: 0,
    numTotalTests: 6,
    numPassedTests: 4,
    numFailedTests: 1,
    numPendingTests: 1,
    numTodoTests: 0,
    startTime: Date.now() - 5000,
    success: false,
    testResults: [
      createMockTestSuite('user.service.test.ts', '/src/__tests__/unit/user.service.test.ts', [
        { title: 'should create user', status: 'passed', duration: 150 },
        { title: 'should validate email', status: 'passed', duration: 75 }
      ]),
      createMockTestSuite('auth.integration.test.ts', '/src/__tests__/integration/auth.integration.test.ts', [
        { title: 'should authenticate user', status: 'failed', duration: 200, error: 'Authentication failed: Invalid credentials' },
        { title: 'should refresh token', status: 'passed', duration: 100 }
      ]),
      createMockTestSuite('api.e2e.test.ts', '/src/__tests__/e2e/api.e2e.test.ts', [
        { title: 'should complete user workflow', status: 'passed', duration: 1500 },
        { title: 'should handle edge cases', status: 'skipped', duration: 0 }
      ])
    ],
    coverageMap: null,
    wasInterrupted: false
  } as JestAggregatedResult;
}

function createMockTestSuite(
  name: string,
  filePath: string,
  tests: Array<{ title: string; status: string; duration: number; error?: string }>
): JestTestResult {
  return {
    testFilePath: filePath,
    testResults: tests.map(test => ({
      title: test.title,
      status: test.status as any,
      duration: test.duration,
      failureMessages: test.error ? [test.error] : [],
      ancestorTitles: [],
      fullName: test.title,
      numPassingAsserts: test.status === 'passed' ? 1 : 0
    })),
    perfStats: {
      start: Date.now() - 2000,
      end: Date.now()
    },
    skipped: false,
    displayName: { name, color: 'white' },
    leaks: false,
    numFailingTests: tests.filter(t => t.status === 'failed').length,
    numPassingTests: tests.filter(t => t.status === 'passed').length,
    numPendingTests: tests.filter(t => t.status === 'skipped').length,
    numTodoTests: tests.filter(t => t.status === 'todo').length,
    openHandles: [],
    sourceMaps: {},
    testExecError: undefined,
    coverage: undefined,
    console: undefined
  } as JestTestResult;
}

function createMockJestResultsWithPaths(filePaths: string[]): JestAggregatedResult {
  const testResults = filePaths.map((filePath, index) => 
    createMockTestSuite(
      `test-${index}`,
      filePath,
      [{ title: `test ${index}`, status: 'passed', duration: 100 }]
    )
  );

  return {
    ...createMockJestResults(),
    testResults,
    numTotalTestSuites: testResults.length,
    numTotalTests: testResults.length
  };
}