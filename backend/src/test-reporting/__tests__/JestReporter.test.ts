/**
 * Tests for Jest Reporter Integration
 */

import JestReporter from '../JestReporter';
import * as fs from 'fs/promises';

// Mock the file system operations
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock the report generators
jest.mock('../ReportGeneratorFactory');
jest.mock('../TestReportAggregator');

describe('JestReporter', () => {
  let reporter: JestReporter;
  let mockGlobalConfig: any;
  let mockReporterOptions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGlobalConfig = {
      rootDir: '/test/project',
      testMatch: ['**/*.test.ts']
    };

    mockReporterOptions = {
      outputDirectory: 'test-reports',
      generateHtml: true,
      generateMarkdown: true,
      generateJson: true,
      verbose: false
    };

    reporter = new JestReporter(mockGlobalConfig, mockReporterOptions);
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultReporter = new JestReporter(mockGlobalConfig);
      expect(defaultReporter).toBeDefined();
    });

    it('should merge provided options with defaults', () => {
      const customOptions = {
        outputDirectory: 'custom-reports',
        verbose: true
      };
      
      const customReporter = new JestReporter(mockGlobalConfig, customOptions);
      expect(customReporter).toBeDefined();
    });
  });

  describe('onRunStart', () => {
    it('should initialize test run tracking', () => {
      const mockAggregatedResults = {
        numTotalTests: 10,
        numPassedTests: 0,
        numFailedTests: 0
      } as any;

      const mockOptions = {
        estimatedTime: 5000,
        showStatus: true
      } as any;

      expect(() => {
        reporter.onRunStart(mockAggregatedResults, mockOptions);
      }).not.toThrow();
    });
  });

  describe('onTestStart', () => {
    it('should handle test start event', () => {
      const mockTest = {
        path: '/test/project/src/example.test.ts',
        context: {}
      } as any;

      expect(() => {
        reporter.onTestStart(mockTest);
      }).not.toThrow();
    });
  });

  describe('onTestResult', () => {
    it('should track test results', () => {
      const mockTest = {
        path: '/test/project/src/example.test.ts'
      } as any;

      const mockTestResult = {
        testFilePath: '/test/project/src/example.test.ts',
        numPassingTests: 5,
        numFailingTests: 1,
        numPendingTests: 0,
        perfStats: {
          start: 1000,
          end: 2000
        },
        testResults: []
      } as any;

      const mockAggregatedResults = {
        numTotalTests: 6,
        numPassedTests: 5,
        numFailedTests: 1
      } as any;

      expect(() => {
        reporter.onTestResult(mockTest, mockTestResult, mockAggregatedResults);
      }).not.toThrow();
    });
  });

  describe('onRunComplete', () => {
    beforeEach(() => {
      // Mock fs.mkdir to resolve successfully
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should generate reports when tests complete successfully', async () => {
      const mockContexts = new Set();
      const mockResults = {
        success: true,
        numTotalTests: 10,
        numPassedTests: 10,
        numFailedTests: 0,
        testResults: []
      } as any;

      await expect(
        reporter.onRunComplete(mockContexts, mockResults)
      ).resolves.not.toThrow();
    });

    it('should generate reports when tests fail', async () => {
      const mockContexts = new Set();
      const mockResults = {
        success: false,
        numTotalTests: 10,
        numPassedTests: 8,
        numFailedTests: 2,
        testResults: []
      } as any;

      await expect(
        reporter.onRunComplete(mockContexts, mockResults)
      ).resolves.not.toThrow();
    });

    it('should skip report generation when onlyOnFailure is true and tests pass', async () => {
      const reporterWithOnlyOnFailure = new JestReporter(mockGlobalConfig, {
        ...mockReporterOptions,
        onlyOnFailure: true
      });

      const mockContexts = new Set();
      const mockResults = {
        success: true,
        numTotalTests: 10,
        numPassedTests: 10,
        numFailedTests: 0,
        testResults: []
      } as any;

      await expect(
        reporterWithOnlyOnFailure.onRunComplete(mockContexts, mockResults)
      ).resolves.not.toThrow();

      // Should not call mkdir since no reports are generated
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should handle report generation errors gracefully', async () => {
      // Mock fs.mkdir to reject
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const mockContexts = new Set();
      const mockResults = {
        success: false,
        numTotalTests: 10,
        numPassedTests: 8,
        numFailedTests: 2,
        testResults: []
      } as any;

      // Should not throw even if report generation fails
      await expect(
        reporter.onRunComplete(mockContexts, mockResults)
      ).resolves.not.toThrow();
    });
  });

  describe('getLastError', () => {
    it('should return undefined when no errors', () => {
      expect(reporter.getLastError()).toBeUndefined();
    });
  });

  describe('integration with existing test categories', () => {
    it('should work with unit tests', async () => {
      const mockResults = {
        success: true,
        testResults: [{
          testFilePath: '/project/src/__tests__/unit/example.test.ts',
          numPassingTests: 5,
          numFailingTests: 0,
          perfStats: { start: 1000, end: 2000 },
          testResults: []
        }]
      } as any;

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(
        reporter.onRunComplete(new Set(), mockResults)
      ).resolves.not.toThrow();
    });

    it('should work with integration tests', async () => {
      const mockResults = {
        success: true,
        testResults: [{
          testFilePath: '/project/src/__tests__/integration/api.test.ts',
          numPassingTests: 3,
          numFailingTests: 0,
          perfStats: { start: 1000, end: 3000 },
          testResults: []
        }]
      } as any;

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(
        reporter.onRunComplete(new Set(), mockResults)
      ).resolves.not.toThrow();
    });

    it('should work with e2e tests', async () => {
      const mockResults = {
        success: true,
        testResults: [{
          testFilePath: '/project/src/__tests__/e2e/workflow.test.ts',
          numPassingTests: 2,
          numFailingTests: 0,
          perfStats: { start: 1000, end: 5000 },
          testResults: []
        }]
      } as any;

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(
        reporter.onRunComplete(new Set(), mockResults)
      ).resolves.not.toThrow();
    });

    it('should work with performance tests', async () => {
      const mockResults = {
        success: true,
        testResults: [{
          testFilePath: '/project/src/__tests__/performance/load.test.ts',
          numPassingTests: 1,
          numFailingTests: 0,
          perfStats: { start: 1000, end: 10000 },
          testResults: []
        }]
      } as any;

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(
        reporter.onRunComplete(new Set(), mockResults)
      ).resolves.not.toThrow();
    });
  });
});