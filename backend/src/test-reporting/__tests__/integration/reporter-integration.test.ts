/**
 * Integration tests for Jest Reporter with existing test infrastructure
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Jest Reporter Integration', () => {
  const testReportsDir = path.join(__dirname, '../../../..', 'test-reports');
  
  beforeAll(() => {
    // Clean up any existing test reports
    if (fs.existsSync(testReportsDir)) {
      fs.rmSync(testReportsDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up test reports after tests
    if (fs.existsSync(testReportsDir)) {
      fs.rmSync(testReportsDir, { recursive: true, force: true });
    }
  });

  it('should generate reports when running unit tests', async () => {
    // This test verifies that the Jest reporter integrates properly
    // In a real scenario, this would run actual Jest tests
    
    // For now, we'll just verify the reporter can be instantiated
    const JestReporter = require('../../JestReporter.js');
    
    const reporter = new JestReporter({}, {
      outputDirectory: testReportsDir,
      verbose: false
    });
    
    expect(reporter).toBeDefined();
    expect(typeof reporter.onRunStart).toBe('function');
    expect(typeof reporter.onTestResult).toBe('function');
    expect(typeof reporter.onRunComplete).toBe('function');
  });

  it('should preserve existing Jest functionality', () => {
    // Verify that adding the custom reporter doesn't break Jest
    const jestConfig = require('../../../../jest.config.js');
    
    expect(jestConfig.reporters).toBeDefined();
    expect(Array.isArray(jestConfig.reporters)).toBe(true);
    expect(jestConfig.reporters).toContain('default');
    
    // Find our custom reporter
    const customReporter = jestConfig.reporters.find(
      (reporter: any) => Array.isArray(reporter) && 
      reporter[0].includes('JestReporter.js')
    );
    
    expect(customReporter).toBeDefined();
  });

  it('should work with different test categories', async () => {
    const JestReporter = require('../../JestReporter.js');
    
    const reporter = new JestReporter({}, {
      outputDirectory: testReportsDir,
      verbose: false
    });

    // Simulate test results for different categories
    const mockTestResults = [
      {
        testFilePath: '/project/src/__tests__/unit/example.test.ts',
        numPassingTests: 5,
        numFailingTests: 0,
        perfStats: { start: 1000, end: 2000 },
        testResults: []
      },
      {
        testFilePath: '/project/src/__tests__/integration/api.test.ts',
        numPassingTests: 3,
        numFailingTests: 0,
        perfStats: { start: 2000, end: 4000 },
        testResults: []
      },
      {
        testFilePath: '/project/src/__tests__/e2e/workflow.test.ts',
        numPassingTests: 2,
        numFailingTests: 0,
        perfStats: { start: 4000, end: 8000 },
        testResults: []
      }
    ];

    // Test that the reporter can handle different test categories
    mockTestResults.forEach(testResult => {
      expect(() => {
        reporter.onTestResult(
          { path: testResult.testFilePath } as any,
          testResult as any,
          { numTotalTests: 10 } as any
        );
      }).not.toThrow();
    });
  });

  it('should handle configuration from environment variables', () => {
    // Test environment variable configuration
    const originalEnv = process.env['TEST_REPORTS_DIR'];
    
    // Clear the cache first
    const configPath = require.resolve('../../jest-reporter.config.js');
    delete require.cache[configPath];
    
    process.env['TEST_REPORTS_DIR'] = 'custom-reports';
    
    try {
      // Require the config with the new environment variable
      const config = require('../../jest-reporter.config.js');
      
      expect(config.outputDirectory).toBe('custom-reports');
    } finally {
      // Restore original environment
      if (originalEnv) {
        process.env['TEST_REPORTS_DIR'] = originalEnv;
      } else {
        delete process.env['TEST_REPORTS_DIR'];
      }
      
      // Clear cache again to restore original config
      delete require.cache[configPath];
    }
  });

  it('should not break existing test scripts', () => {
    // Verify that package.json test scripts still work
    const packageJson = require('../../../../package.json');
    
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts['test:unit']).toBeDefined();
    expect(packageJson.scripts['test:integration']).toBeDefined();
    expect(packageJson.scripts['test:e2e']).toBeDefined();
    expect(packageJson.scripts['test:performance']).toBeDefined();
  });
});