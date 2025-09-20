/**
 * Unit tests for EnhancedTestRunner
 * Tests the refactored test runner with proper TypeScript interfaces
 */

import { EnhancedTestRunner, TestRunnerConfig, TestSuiteConfig } from '../../services/EnhancedTestRunner';
import { TestCategory } from '../../types/test-reporting';
import { execSync } from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// Mock TestResultAggregationService
jest.mock('../../services/TestResultAggregationService');

describe('EnhancedTestRunner', () => {
  let runner: EnhancedTestRunner;
  let mockJestOutput: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Jest JSON output
    mockJestOutput = JSON.stringify({
      numFailedTestSuites: 0,
      numFailedTests: 0,
      numPassedTestSuites: 2,
      numPassedTests: 5,
      numPendingTestSuites: 0,
      numPendingTests: 0,
      numRuntimeErrorTestSuites: 0,
      numTodoTests: 0,
      numTotalTestSuites: 2,
      numTotalTests: 5,
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
      testResults: [],
      wasInterrupted: false,
      coverageMap: null
    });

    mockExecSync.mockReturnValue(mockJestOutput);
    
    runner = new EnhancedTestRunner();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = runner.getConfig();
      
      expect(config.failFast).toBe(false);
      expect(config.verbose).toBe(false);
      expect(config.parallel).toBe(true);
      expect(config.coverage).toBe(true);
      expect(config.timeout).toBe(300000);
      expect(config.outputDirectory).toBe('./test-reports');
    });

    it('should merge custom configuration with defaults', () => {
      const customRunner = new EnhancedTestRunner({
        failFast: true,
        verbose: true,
        timeout: 60000
      });
      
      const config = customRunner.getConfig();
      
      expect(config.failFast).toBe(true);
      expect(config.verbose).toBe(true);
      expect(config.timeout).toBe(60000);
      expect(config.parallel).toBe(true); // Should keep default
      expect(config.coverage).toBe(true); // Should keep default
    });

    it('should initialize suite configurations', () => {
      const suiteConfigs = runner.getSuiteConfigs();
      
      expect(suiteConfigs).toHaveLength(4);
      expect(suiteConfigs.find(s => s.name === TestCategory.UNIT)).toBeDefined();
      expect(suiteConfigs.find(s => s.name === TestCategory.INTEGRATION)).toBeDefined();
      expect(suiteConfigs.find(s => s.name === TestCategory.E2E)).toBeDefined();
      expect(suiteConfigs.find(s => s.name === TestCategory.PERFORMANCE)).toBeDefined();
    });
  });

  describe('runTests', () => {
    it('should run all enabled test suites by default', async () => {
      const result = await runner.runTests();
      
      expect(result.success).toBe(true);
      expect(result.aggregatedData).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockExecSync).toHaveBeenCalledTimes(1);
    });

    it('should run specific test suite when requested', async () => {
      await runner.runTests(TestCategory.UNIT);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--testPathPattern="(unit|spec|test)\\.(ts|js)$"'),
        expect.any(Object)
      );
    });

    it('should throw error for non-existent test suite', async () => {
      // Disable all suites
      const suiteConfigs = runner.getSuiteConfigs();
      suiteConfigs.forEach(suite => {
        runner.setSuiteEnabled(suite.name, false);
      });

      await expect(runner.runTests(TestCategory.UNIT)).rejects.toThrow(
        "Test suite 'unit' not found or disabled"
      );
    });

    it('should handle Jest execution failures gracefully', async () => {
      const failedJestOutput = JSON.stringify({
        ...JSON.parse(mockJestOutput),
        success: false,
        numFailedTests: 2,
        numPassedTests: 3
      });

      const error = new Error('Jest failed') as any;
      error.stdout = failedJestOutput;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = await runner.runTests();
      
      expect(result.success).toBe(false);
      expect(result.aggregatedData).toBeDefined();
    });

    it('should throw error when Jest fails without output', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Jest execution failed');
      });

      await expect(runner.runTests()).rejects.toThrow('Test execution failed');
    });
  });

  describe('Jest command building', () => {
    it('should build correct Jest command with default options', async () => {
      await runner.runTests();
      
      const expectedCommand = expect.stringContaining('npx jest --json --coverage --runInBand=false');
      expect(mockExecSync).toHaveBeenCalledWith(expectedCommand, expect.any(Object));
    });

    it('should include verbose flag when enabled', async () => {
      const verboseRunner = new EnhancedTestRunner({ verbose: true });
      await verboseRunner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--verbose'),
        expect.any(Object)
      );
    });

    it('should include fail-fast flag when enabled', async () => {
      const failFastRunner = new EnhancedTestRunner({ failFast: true });
      await failFastRunner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--bail'),
        expect.any(Object)
      );
    });

    it('should use runInBand when parallel is disabled', async () => {
      const sequentialRunner = new EnhancedTestRunner({ parallel: false });
      await sequentialRunner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--runInBand'),
        expect.any(Object)
      );
    });

    it('should exclude coverage when disabled', async () => {
      const noCoverageRunner = new EnhancedTestRunner({ coverage: false });
      await noCoverageRunner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.not.stringContaining('--coverage'),
        expect.any(Object)
      );
    });
  });

  describe('test suite patterns', () => {
    it('should use correct pattern for unit tests', async () => {
      await runner.runTests(TestCategory.UNIT);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--testPathPattern="(unit|spec|test)\\.(ts|js)$"'),
        expect.any(Object)
      );
    });

    it('should use correct pattern for integration tests', async () => {
      await runner.runTests(TestCategory.INTEGRATION);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--testPathPattern="integration.*\\.(ts|js)$"'),
        expect.any(Object)
      );
    });

    it('should use correct pattern for e2e tests', async () => {
      await runner.runTests(TestCategory.E2E);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--testPathPattern="(e2e|end-to-end).*\\.(ts|js)$"'),
        expect.any(Object)
      );
    });

    it('should use correct pattern for performance tests', async () => {
      await runner.runTests(TestCategory.PERFORMANCE);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--testPathPattern="(performance|benchmark).*\\.(ts|js)$"'),
        expect.any(Object)
      );
    });
  });

  describe('environment handling', () => {
    it('should set correct test environment variables', async () => {
      await runner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_ENV: 'test',
            CI: expect.any(String),
            JEST_WORKER_ID: '1'
          })
        })
      );
    });

    it('should detect CI environment', async () => {
      const originalCI = process.env['CI'];
      process.env['CI'] = 'true';
      
      await runner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            CI: 'true'
          })
        })
      );
      
      // Restore original environment
      if (originalCI === undefined) {
        delete process.env['CI'];
      } else {
        process.env['CI'] = originalCI;
      }
    });

    it('should use correct working directory and timeout', async () => {
      await runner.runTests();
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cwd: process.cwd(),
          timeout: 300000
        })
      );
    });
  });

  describe('Jest output parsing', () => {
    it('should parse valid Jest JSON output', async () => {
      const result = await runner.runTests();
      
      expect(result.aggregatedData).toBeDefined();
      expect(mockExecSync).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple JSON objects in output', async () => {
      const multiLineOutput = [
        '{"type": "start"}',
        '{"type": "testResult"}',
        mockJestOutput
      ].join('\n');
      
      mockExecSync.mockReturnValue(multiLineOutput);
      
      const result = await runner.runTests();
      
      expect(result.aggregatedData).toBeDefined();
    });

    it('should throw error for invalid JSON output', async () => {
      mockExecSync.mockReturnValue('Invalid JSON output');
      
      await expect(runner.runTests()).rejects.toThrow('Failed to parse Jest output');
    });

    it('should throw error for empty output', async () => {
      mockExecSync.mockReturnValue('');
      
      await expect(runner.runTests()).rejects.toThrow('No valid JSON output found from Jest');
    });
  });

  describe('suite configuration management', () => {
    it('should update suite configuration', () => {
      runner.updateSuiteConfig(TestCategory.UNIT, {
        timeout: 60000,
        enabled: false
      });
      
      const suiteConfigs = runner.getSuiteConfigs();
      const unitConfig = suiteConfigs.find(s => s.name === TestCategory.UNIT);
      
      expect(unitConfig?.timeout).toBe(60000);
      expect(unitConfig?.enabled).toBe(false);
    });

    it('should enable/disable test suites', () => {
      runner.setSuiteEnabled(TestCategory.INTEGRATION, false);
      
      const suiteConfigs = runner.getSuiteConfigs();
      const integrationConfig = suiteConfigs.find(s => s.name === TestCategory.INTEGRATION);
      
      expect(integrationConfig?.enabled).toBe(false);
    });

    it('should not modify non-existent suite configuration', () => {
      const originalConfigs = runner.getSuiteConfigs();
      
      runner.updateSuiteConfig('non-existent' as TestCategory, { enabled: false });
      
      const newConfigs = runner.getSuiteConfigs();
      expect(newConfigs).toEqual(originalConfigs);
    });
  });

  describe('configuration validation', () => {
    it('should handle partial configuration correctly', () => {
      const partialRunner = new EnhancedTestRunner({
        verbose: true
        // Other options should use defaults
      });
      
      const config = partialRunner.getConfig();
      
      expect(config.verbose).toBe(true);
      expect(config.failFast).toBe(false); // Default
      expect(config.parallel).toBe(true); // Default
      expect(config.coverage).toBe(true); // Default
    });

    it('should return immutable configuration copies', () => {
      const config1 = runner.getConfig();
      const config2 = runner.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
      
      // Modifying returned config should not affect internal state
      config1.verbose = true;
      const config3 = runner.getConfig();
      expect(config3.verbose).toBe(false);
    });

    it('should return immutable suite configuration copies', () => {
      const suites1 = runner.getSuiteConfigs();
      const suites2 = runner.getSuiteConfigs();
      
      expect(suites1).toEqual(suites2);
      expect(suites1).not.toBe(suites2); // Different arrays
      
      // Modifying returned array should not affect internal state
      suites1.pop();
      const suites3 = runner.getSuiteConfigs();
      expect(suites3).toHaveLength(4);
    });
  });
});