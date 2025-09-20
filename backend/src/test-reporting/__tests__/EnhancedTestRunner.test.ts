/**
 * Unit tests for EnhancedTestRunner
 * Tests the enhanced test runner functionality and integration
 */

import { EnhancedTestRunner, TestRunnerConfig, createEnhancedTestRunner } from '../EnhancedTestRunner';
import { TestCategory } from '../types';
import * as fs from 'fs';

// Mock child_process
jest.mock('child_process');
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('EnhancedTestRunner', () => {
  let runner: EnhancedTestRunner;
  let mockConfig: Partial<TestRunnerConfig>;

  beforeEach(() => {
    mockConfig = {
      failFast: false,
      verbose: false,
      outputDirectory: 'test-output',
      generateReports: true
    };
    
    runner = new EnhancedTestRunner(mockConfig);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return false by default
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation();
    mockFs.writeFileSync.mockImplementation();
    mockFs.readFileSync.mockReturnValue('{}');
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultRunner = new EnhancedTestRunner();
      expect(defaultRunner['config'].failFast).toBe(false);
      expect(defaultRunner['config'].verbose).toBe(false);
      expect(defaultRunner['config'].outputDirectory).toBe('test-results');
      expect(defaultRunner['config'].generateReports).toBe(true);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<TestRunnerConfig> = {
        failFast: true,
        verbose: true,
        outputDirectory: 'custom-output'
      };
      
      const customRunner = new EnhancedTestRunner(customConfig);
      expect(customRunner['config'].failFast).toBe(true);
      expect(customRunner['config'].verbose).toBe(true);
      expect(customRunner['config'].outputDirectory).toBe('custom-output');
      expect(customRunner['config'].generateReports).toBe(true); // Default value
    });
  });

  describe('getTestSuites', () => {
    it('should return all configured test suites', () => {
      const testSuites = runner['getTestSuites']();
      
      expect(testSuites).toHaveLength(4);
      expect(testSuites[0]?.name).toBe(TestCategory.UNIT);
      expect(testSuites[1]?.name).toBe(TestCategory.INTEGRATION);
      expect(testSuites[2]?.name).toBe(TestCategory.E2E);
      expect(testSuites[3]?.name).toBe(TestCategory.PERFORMANCE);
    });

    it('should have correct command mappings', () => {
      const testSuites = runner['getTestSuites']();
      
      expect(testSuites[0]?.command).toBe('test:unit');
      expect(testSuites[1]?.command).toBe('test:integration');
      expect(testSuites[2]?.command).toBe('test:e2e');
      expect(testSuites[3]?.command).toBe('test:performance');
    });
  });

  describe('setupEnvironment', () => {
    it('should create output directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await runner['setupEnvironment']();
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('test-output'),
        { recursive: true }
      );
    });

    it('should not create output directory if it already exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      
      await runner['setupEnvironment']();
      
      // The implementation only creates directory if it doesn't exist
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('collectJestResults', () => {
    it('should return null when no result files exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await runner['collectJestResults']();
      
      expect(result).toBeNull();
    });

    it('should aggregate results from multiple test suite files', async () => {
      // Mock file existence and content
      mockFs.existsSync.mockImplementation((filePath: any) => {
        return typeof filePath === 'string' && filePath.includes('-results.json');
      });
      
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (typeof filePath === 'string' && filePath.includes('unit-results.json')) {
          return JSON.stringify({
            testResults: [{ testFilePath: '/unit/test.ts' }],
            numTotalTests: 5,
            numPassedTests: 4,
            numFailedTests: 1,
            numPendingTests: 0,
            numTodoTests: 0
          });
        }
        if (typeof filePath === 'string' && filePath.includes('integration-results.json')) {
          return JSON.stringify({
            testResults: [{ testFilePath: '/integration/test.ts' }],
            numTotalTests: 3,
            numPassedTests: 2,
            numFailedTests: 1,
            numPendingTests: 0,
            numTodoTests: 0
          });
        }
        return '{}';
      });
      
      const result = await runner['collectJestResults']();
      
      expect(result).not.toBeNull();
      expect(result!.numTotalTests).toBe(8); // 5 + 3
      expect(result!.numPassedTests).toBe(6); // 4 + 2
      expect(result!.numFailedTests).toBe(2); // 1 + 1
      expect(result!.testResults).toHaveLength(2);
    });

    it('should handle malformed JSON gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      // Mock console.log to capture warning
      const consoleSpy = jest.spyOn(runner as any, 'log').mockImplementation();
      
      const result = await runner['collectJestResults']();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse Jest results'),
        'warning'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveReport', () => {
    it('should save both comprehensive and summary reports', async () => {
      const mockData = {
        timestamp: new Date(),
        buildMetadata: {
          timestamp: new Date(),
          environment: 'test',
          gitInfo: { branch: 'main' },
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          architecture: 'x64',
          ciInfo: { isCI: false }
        },
        summary: {
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          skippedTests: 0,
          todoTests: 0,
          passRate: 80,
          executionTime: 5000,
          testSuites: 3,
          passedSuites: 2,
          failedSuites: 1
        },
        metrics: {
          categoryBreakdown: {}
        }
      } as any;
      
      await runner['saveReport'](mockData);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('comprehensive-test-report.json'),
        expect.any(String)
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-summary.json'),
        expect.any(String)
      );
    });
  });

  describe('logging', () => {
    it('should log messages with correct format', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      runner['log']('Test message', 'info');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📋 \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Test message/)
      );
      
      consoleSpy.mockRestore();
    });

    it('should use correct prefixes for different log levels', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      runner['log']('Success message', 'success');
      runner['log']('Error message', 'error');
      runner['log']('Warning message', 'warning');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      
      consoleSpy.mockRestore();
    });
  });
});

describe('createEnhancedTestRunner', () => {
  it('should create runner with default configuration for empty args', () => {
    const runner = createEnhancedTestRunner([]);
    
    expect(runner['config'].failFast).toBe(false);
    expect(runner['config'].verbose).toBe(false);
    expect(runner['config'].generateReports).toBe(true);
  });

  it('should parse fail-fast argument', () => {
    const runner = createEnhancedTestRunner(['--fail-fast']);
    
    expect(runner['config'].failFast).toBe(true);
  });

  it('should parse verbose argument', () => {
    const runner = createEnhancedTestRunner(['--verbose']);
    
    expect(runner['config'].verbose).toBe(true);
  });

  it('should parse suite argument', () => {
    const runner = createEnhancedTestRunner(['--suite=unit']);
    
    expect(runner['config'].suite).toBe(TestCategory.UNIT);
  });

  it('should parse output directory argument', () => {
    const runner = createEnhancedTestRunner(['--output=custom-dir']);
    
    expect(runner['config'].outputDirectory).toBe('custom-dir');
  });

  it('should parse no-reports argument', () => {
    const runner = createEnhancedTestRunner(['--no-reports']);
    
    expect(runner['config'].generateReports).toBe(false);
  });

  it('should handle multiple arguments', () => {
    const runner = createEnhancedTestRunner([
      '--fail-fast',
      '--verbose',
      '--suite=integration',
      '--output=test-output'
    ]);
    
    expect(runner['config'].failFast).toBe(true);
    expect(runner['config'].verbose).toBe(true);
    expect(runner['config'].suite).toBe(TestCategory.INTEGRATION);
    expect(runner['config'].outputDirectory).toBe('test-output');
  });

  it('should ignore invalid suite names', () => {
    const runner = createEnhancedTestRunner(['--suite=invalid']);
    
    expect(runner['config'].suite).toBeUndefined();
  });
});