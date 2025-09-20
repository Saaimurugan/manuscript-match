/**
 * Unit tests for TestResultAggregationService
 * Tests enhanced aggregation logic with mock Jest results
 */

import { TestResultAggregationService } from '../../services/TestResultAggregationService';
import {
  TestStatus,
  TestCategory,
  TestErrorType,
  TestWarningType
} from '../../types/test-reporting';
import type { AggregatedResult, TestResult, AssertionResult } from '@jest/test-result';

// Mock Jest result data
const createMockAssertionResult = (overrides: Partial<AssertionResult> = {}): AssertionResult => ({
  ancestorTitles: ['Test Suite'],
  duration: 100,
  failureMessages: [],
  fullName: 'Test Suite should pass',
  location: { line: 10, column: 5 } as any,
  status: 'passed' as any,
  title: 'should pass',
  failureDetails: [],
  invocations: 1,
  numPassingAsserts: 1,
  retryReasons: [],
  ...overrides
});

const createMockTestResult = (overrides: Partial<TestResult> = {}): TestResult => ({
  console: [] as any,
  coverage: {} as any,
  displayName: { name: 'test', color: 'white' } as any,
  failureMessage: null,
  leaks: false,
  numFailingTests: 0,
  numPassingTests: 1,
  numPendingTests: 0,
  numTodoTests: 0,
  openHandles: [],
  perfStats: {
    end: Date.now(),
    runtime: 100,
    slow: false,
    start: Date.now() - 100
  },
  skipped: false,
  snapshot: {
    added: 0,
    fileDeleted: false,
    matched: 0,
    unchecked: 0,
    uncheckedKeys: [],
    unmatched: 0,
    updated: 0
  },
  testExecError: null as any,
  testFilePath: '/src/__tests__/unit/example.test.ts',
  testResults: [createMockAssertionResult()],
  ...overrides
});

const createMockAggregatedResult = (overrides: Partial<AggregatedResult> = {}): AggregatedResult => ({
  numFailedTestSuites: 0,
  numFailedTests: 0,
  numPassedTestSuites: 1,
  numPassedTests: 1,
  numPendingTestSuites: 0,
  numPendingTests: 0,
  numRuntimeErrorTestSuites: 0,
  numTodoTests: 0,
  numTotalTestSuites: 1,
  numTotalTests: 1,
  openHandles: [],
  snapshot: {
    added: 0,
    didUpdate: false,
    failure: false,
    filesAdded: 0,
    filesRemoved: 0,
    filesRemovedList: [],
    filesUnmatched: 0,
    filesUpdated: 0,
    matched: 0,
    total: 0,
    unchecked: 0,
    uncheckedKeysByFile: [],
    unmatched: 0,
    updated: 0
  },
  startTime: Date.now() - 1000,
  success: true,
  testResults: [createMockTestResult()],
  wasInterrupted: false,
  coverageMap: null,
  ...overrides
});

describe('TestResultAggregationService', () => {
  let service: TestResultAggregationService;

  beforeEach(() => {
    service = new TestResultAggregationService({
      slowTestThreshold: 500,
      performance: {
        trackMemory: true,
        trackTrends: true,
        maxSlowTests: 5,
        memoryThreshold: 50 * 1024 * 1024
      }
    });
  });

  describe('aggregateResults', () => {
    it('should aggregate basic test results correctly', async () => {
      const mockResult = createMockAggregatedResult();
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated).toBeDefined();
      expect(aggregated.summary.totalTests).toBe(1);
      expect(aggregated.summary.passedTests).toBe(1);
      expect(aggregated.summary.failedTests).toBe(0);
      expect(aggregated.summary.passRate).toBe(100);
      expect(aggregated.suiteResults).toHaveLength(1);
    });

    it('should handle failed tests correctly', async () => {
      const failedTestResult = createMockTestResult({
        numFailingTests: 1,
        numPassingTests: 0,
        failureMessage: 'Test failed',
        testResults: [createMockAssertionResult({
          status: 'failed',
          failureMessages: ['Expected true but got false']
        })]
      });

      const mockResult = createMockAggregatedResult({
        numFailedTests: 1,
        numPassedTests: 0,
        numFailedTestSuites: 1,
        numPassedTestSuites: 0,
        success: false,
        testResults: [failedTestResult]
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.summary.failedTests).toBe(1);
      expect(aggregated.summary.passedTests).toBe(0);
      expect(aggregated.summary.passRate).toBe(0);
      expect(aggregated.suiteResults[0]?.status).toBe(TestStatus.FAILED);
      expect(aggregated.errors).toHaveLength(1);
      expect(aggregated.errors[0]?.type).toBe(TestErrorType.EXECUTION_ERROR);
    });

    it('should calculate performance metrics correctly', async () => {
      const slowTestResult = createMockTestResult({
        testResults: [createMockAssertionResult({
          duration: 1000, // Exceeds threshold of 500ms
          title: 'slow test'
        })]
      });

      const mockResult = createMockAggregatedResult({
        testResults: [slowTestResult]
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.performanceMetrics.averageTestDuration).toBe(1000);
      expect(aggregated.performanceMetrics.slowestTests).toHaveLength(1);
      expect(aggregated.performanceMetrics.slowestTests[0]?.duration).toBe(1000);
      expect(aggregated.warnings).toHaveLength(1);
      expect(aggregated.warnings[0]?.type).toBe(TestWarningType.SLOW_TEST);
    });

    it('should include build metadata', async () => {
      const mockResult = createMockAggregatedResult();
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.buildMetadata).toBeDefined();
      expect(aggregated.buildMetadata.timestamp).toBeInstanceOf(Date);
      expect(aggregated.buildMetadata.nodeVersion).toBe(process.version);
      expect(aggregated.buildMetadata.platform).toBe(process.platform);
      expect(aggregated.buildMetadata.gitInfo).toBeDefined();
    });
  });

  describe('processTestSuites', () => {
    it('should categorize unit tests correctly', async () => {
      const unitTestResult = createMockTestResult({
        testFilePath: '/src/__tests__/unit/UserService.test.ts'
      });
      
      const suites = await service.processTestSuites([unitTestResult]);
      
      expect(suites).toHaveLength(1);
      expect(suites[0]?.category).toBe(TestCategory.UNIT);
      expect(suites[0]?.name).toBe('UserService');
    });

    it('should categorize integration tests correctly', async () => {
      const integrationTestResult = createMockTestResult({
        testFilePath: '/src/__tests__/integration/auth.integration.test.ts'
      });
      
      const suites = await service.processTestSuites([integrationTestResult]);
      
      expect(suites).toHaveLength(1);
      expect(suites[0]?.category).toBe(TestCategory.INTEGRATION);
    });

    it('should categorize e2e tests correctly', async () => {
      const e2eTestResult = createMockTestResult({
        testFilePath: '/src/__tests__/e2e/complete-workflow.test.ts'
      });
      
      const suites = await service.processTestSuites([e2eTestResult]);
      
      expect(suites).toHaveLength(1);
      expect(suites[0]?.category).toBe(TestCategory.E2E);
    });

    it('should categorize performance tests correctly', async () => {
      const performanceTestResult = createMockTestResult({
        testFilePath: '/src/__tests__/performance/load-testing.test.ts'
      });
      
      const suites = await service.processTestSuites([performanceTestResult]);
      
      expect(suites).toHaveLength(1);
      expect(suites[0]?.category).toBe(TestCategory.PERFORMANCE);
    });

    it('should handle unknown test categories', async () => {
      const unknownTestResult = createMockTestResult({
        testFilePath: '/src/__tests__/random/unknown.test.ts'
      });
      
      const suites = await service.processTestSuites([unknownTestResult]);
      
      expect(suites).toHaveLength(1);
      expect(suites[0]?.category).toBe(TestCategory.UNKNOWN);
    });

    it('should extract test case details correctly', async () => {
      const testResult = createMockTestResult({
        testResults: [
          createMockAssertionResult({
            title: 'should create user',
            fullName: 'UserService should create user',
            status: 'passed',
            duration: 50,
            ancestorTitles: ['UserService'],
            location: { line: 15, column: 8 }
          }),
          createMockAssertionResult({
            title: 'should validate email',
            fullName: 'UserService should validate email',
            status: 'failed',
            duration: 25,
            failureMessages: ['Invalid email format'],
            ancestorTitles: ['UserService']
          })
        ]
      });
      
      const suites = await service.processTestSuites([testResult]);
      
      expect(suites[0]?.tests).toHaveLength(2);
      
      const passedTest = suites[0]?.tests[0];
      expect(passedTest?.name).toBe('should create user');
      expect(passedTest?.status).toBe(TestStatus.PASSED);
      expect(passedTest?.duration).toBe(50);
      expect(passedTest?.location).toEqual({ line: 15, column: 8 });
      
      const failedTest = suites[0]?.tests[1];
      expect(failedTest?.name).toBe('should validate email');
      expect(failedTest?.status).toBe(TestStatus.FAILED);
      expect(failedTest?.errorMessage).toBe('Invalid email format');
    });
  });

  describe('coverage processing', () => {
    it('should handle empty coverage data', async () => {
      const mockResult = createMockAggregatedResult({
        coverageMap: null
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.coverageData.overall.lines.percentage).toBe(0);
      expect(aggregated.coverageData.byFile).toEqual({});
    });

    it('should process coverage data when available', async () => {
      const mockCoverageMap = {
        '/src/services/UserService.ts': {
          getLineCoverage: () => ({ 1: 1, 2: 1, 3: 0, 4: 1 }),
          getFunctionCoverage: () => ({ 1: 1, 2: 0 }),
          getBranchCoverage: () => ({ 1: 1, 2: 1 }),
          getStatementCoverage: () => ({ 1: 1, 2: 1, 3: 0 })
        }
      } as any;

      const mockResult = createMockAggregatedResult({
        coverageMap: mockCoverageMap
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.coverageData.byFile['/src/services/UserService.ts']).toBeDefined();
      expect(aggregated.coverageData.overall.lines.total).toBeGreaterThan(0);
    });
  });

  describe('error and warning collection', () => {
    it('should collect execution errors', async () => {
      const failedTestResult = createMockTestResult({
        failureMessage: 'Syntax error in test file',
        numFailingTests: 1
      });

      const mockResult = createMockAggregatedResult({
        testResults: [failedTestResult],
        success: false
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.errors).toHaveLength(1);
      expect(aggregated.errors[0]?.type).toBe(TestErrorType.EXECUTION_ERROR);
      expect(aggregated.errors[0]?.message).toBe('Syntax error in test file');
    });

    it('should collect slow test warnings', async () => {
      const slowTestResult = createMockTestResult({
        testResults: [createMockAssertionResult({
          duration: 1500, // Exceeds threshold
          title: 'very slow test'
        })]
      });

      const mockResult = createMockAggregatedResult({
        testResults: [slowTestResult]
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.warnings).toHaveLength(1);
      expect(aggregated.warnings[0]?.type).toBe(TestWarningType.SLOW_TEST);
      expect(aggregated.warnings[0]?.message).toContain('very slow test');
      expect(aggregated.warnings[0]?.message).toContain('1500ms');
    });
  });

  describe('build metadata collection', () => {
    it('should collect git information when available', async () => {
      const mockResult = createMockAggregatedResult();
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.buildMetadata.gitInfo).toBeDefined();
      expect(aggregated.buildMetadata.gitInfo.branch).toBeDefined();
      expect(aggregated.buildMetadata.gitInfo.commit).toBeDefined();
      expect(aggregated.buildMetadata.gitInfo.timestamp).toBeInstanceOf(Date);
    });

    it('should detect CI environment correctly', async () => {
      const originalCI = process.env['CI'];
      process.env['CI'] = 'true';
      
      const mockResult = createMockAggregatedResult();
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.buildMetadata.ci).toBe(true);
      
      // Restore original environment
      if (originalCI === undefined) {
        delete process.env['CI'];
      } else {
        process.env['CI'] = originalCI;
      }
    });

    it('should include environment information', async () => {
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'test';
      
      const mockResult = createMockAggregatedResult();
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.buildMetadata.environment).toBe('test');
      expect(aggregated.buildMetadata.nodeVersion).toBe(process.version);
      expect(aggregated.buildMetadata.platform).toBe(process.platform);
      
      // Restore original environment
      if (originalNodeEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = originalNodeEnv;
      }
    });
  });

  describe('metrics calculation', () => {
    it('should calculate pass rates correctly', async () => {
      const mixedResults = [
        createMockTestResult({
          testFilePath: '/test1.ts',
          numPassingTests: 3,
          numFailingTests: 1,
          testResults: [
            createMockAssertionResult({ status: 'passed' }),
            createMockAssertionResult({ status: 'passed' }),
            createMockAssertionResult({ status: 'passed' }),
            createMockAssertionResult({ status: 'failed' })
          ]
        }),
        createMockTestResult({
          testFilePath: '/test2.ts',
          numPassingTests: 2,
          numFailingTests: 0,
          testResults: [
            createMockAssertionResult({ status: 'passed' }),
            createMockAssertionResult({ status: 'passed' })
          ]
        })
      ];

      const mockResult = createMockAggregatedResult({
        testResults: mixedResults,
        numTotalTests: 6,
        numPassedTests: 5,
        numFailedTests: 1
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.summary.totalTests).toBe(6);
      expect(aggregated.summary.passedTests).toBe(5);
      expect(aggregated.summary.failedTests).toBe(1);
      expect(aggregated.summary.passRate).toBeCloseTo(83.33, 1);
    });

    it('should calculate category performance metrics', async () => {
      const unitTest = createMockTestResult({
        testFilePath: '/src/__tests__/unit/service.test.ts',
        testResults: [
          createMockAssertionResult({ duration: 100, status: 'passed' }),
          createMockAssertionResult({ duration: 200, status: 'passed' })
        ]
      });

      const integrationTest = createMockTestResult({
        testFilePath: '/src/__tests__/integration/api.test.ts',
        testResults: [
          createMockAssertionResult({ duration: 500, status: 'passed' }),
          createMockAssertionResult({ duration: 300, status: 'failed' })
        ]
      });

      const mockResult = createMockAggregatedResult({
        testResults: [unitTest, integrationTest]
      });
      
      const aggregated = await service.aggregateResults(mockResult);
      
      expect(aggregated.performanceMetrics.categoryPerformance[TestCategory.UNIT]).toBeDefined();
      expect(aggregated.performanceMetrics.categoryPerformance[TestCategory.INTEGRATION]).toBeDefined();
      
      const unitPerf = aggregated.performanceMetrics.categoryPerformance[TestCategory.UNIT];
      expect(unitPerf.totalTests).toBe(2);
      expect(unitPerf.passRate).toBe(100);
      expect(unitPerf.averageDuration).toBe(150);
      
      const integrationPerf = aggregated.performanceMetrics.categoryPerformance[TestCategory.INTEGRATION];
      expect(integrationPerf.totalTests).toBe(2);
      expect(integrationPerf.passRate).toBe(50);
      expect(integrationPerf.averageDuration).toBe(400);
    });
  });

  describe('configuration handling', () => {
    it('should use custom configuration', () => {
      const customService = new TestResultAggregationService({
        slowTestThreshold: 2000,
        categorization: {
          patterns: {
            [TestCategory.UNIT]: ['custom-unit'],
            [TestCategory.INTEGRATION]: ['custom-integration'],
            [TestCategory.E2E]: ['custom-e2e'],
            [TestCategory.PERFORMANCE]: ['custom-performance'],
            [TestCategory.UNKNOWN]: []
          },
          defaultCategory: TestCategory.UNIT
        }
      });

      expect(customService).toBeDefined();
    });

    it('should merge with default configuration', () => {
      const partialConfigService = new TestResultAggregationService({
        slowTestThreshold: 1500
      });

      expect(partialConfigService).toBeDefined();
    });
  });
});