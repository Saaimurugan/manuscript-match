/**
 * Unit tests for MalformedDataRecovery
 */

import { MalformedDataRecovery } from '../../errors/MalformedDataRecovery';
import { Logger } from '../../errors/Logger';
import { ErrorHandler } from '../../errors/ErrorHandler';

// Mock dependencies
jest.mock('../../errors/Logger');
jest.mock('../../errors/ErrorHandler');

describe('MalformedDataRecovery', () => {
  let recovery: MalformedDataRecovery;
  let mockLogger: jest.Mocked<Logger>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    mockLogger = new Logger() as jest.Mocked<Logger>;
    mockErrorHandler = new ErrorHandler() as jest.Mocked<ErrorHandler>;
    
    recovery = new MalformedDataRecovery(mockLogger, mockErrorHandler, {
      enablePartialRecovery: true,
      enableDataSanitization: true,
      enableSchemaValidation: true,
      maxRecoveryAttempts: 3,
      fallbackToMinimalData: true
    });

    // Setup default mock behaviors
    mockLogger.info.mockResolvedValue(undefined);
    mockLogger.warn.mockResolvedValue(undefined);
    mockLogger.error.mockResolvedValue(undefined);
    mockErrorHandler.handleError.mockResolvedValue({ success: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recoverJestResults', () => {
    it('should handle null/undefined data by falling back to minimal data', async () => {
      const result = await recovery.recoverJestResults(null);
      
      expect(result.success).toBe(true);
      expect(result.partialData).toBeDefined();
      expect(result.partialData.testResults).toEqual([]);
      expect(result.warnings).toContain('Used minimal fallback data structure');
    });

    it('should parse valid JSON string data', async () => {
      const validData = {
        testResults: [
          {
            testFilePath: '/test/example.test.js',
            assertionResults: [
              { title: 'test 1', status: 'passed', duration: 100 }
            ],
            numTotalTests: 1,
            numPassingTests: 1,
            numFailingTests: 0
          }
        ],
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0
      };
      
      const result = await recovery.recoverJestResults(JSON.stringify(validData));
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.testResults).toHaveLength(1);
    });

    it('should recover from malformed JSON with common errors', async () => {
      const malformedJson = `{
        "testResults": [
          {
            testFilePath: '/test/example.test.js', // Unquoted key
            'assertionResults': [                  // Single quotes
              { title: "test 1", status: "passed", duration: 100, }  // Trailing comma
            ],
            numTotalTests: 1,
            numPassingTests: 1,
            numFailingTests: 0,
          }
        ],
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0
      }`;
      
      const result = await recovery.recoverJestResults(malformedJson);
      
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.recoveredData.testResults).toHaveLength(1);
    });

    it('should extract JSON from mixed text content', async () => {
      const mixedContent = `
        Some log output here
        Error: Something went wrong
        {"testResults": [{"testFilePath": "/test/file.js", "assertionResults": []}], "numTotalTests": 0}
        More log output
      `;
      
      const result = await recovery.recoverJestResults(mixedContent);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.testResults).toBeDefined();
    });

    it('should sanitize test results with missing fields', async () => {
      const incompleteData = {
        testResults: [
          {
            // Missing testFilePath
            assertionResults: [
              { title: 'test 1' } // Missing status, duration
            ]
            // Missing numeric fields
          }
        ]
        // Missing summary fields
      };
      
      const result = await recovery.recoverJestResults(incompleteData);
      
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.recoveredData.testResults[0].testFilePath).toMatch(/unknown-test-\d+\.test\.js/);
      expect(result.recoveredData.testResults[0].assertionResults[0].status).toBe('unknown');
      expect(result.recoveredData.numTotalTests).toBeDefined();
    });

    it('should handle array of test results', async () => {
      const arrayData = [
        {
          testFilePath: '/test/file1.js',
          assertionResults: [],
          numTotalTests: 0,
          numPassingTests: 0,
          numFailingTests: 0
        },
        {
          testFilePath: '/test/file2.js',
          assertionResults: [],
          numTotalTests: 0,
          numPassingTests: 0,
          numFailingTests: 0
        }
      ];
      
      const result = await recovery.recoverJestResults(arrayData);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.testResults).toHaveLength(2);
    });

    it('should normalize invalid test statuses', async () => {
      const dataWithInvalidStatus = {
        testResults: [
          {
            testFilePath: '/test/file.js',
            assertionResults: [
              { title: 'test 1', status: 'invalid_status', duration: 100 },
              { title: 'test 2', status: 'passed', duration: 50 }
            ],
            numTotalTests: 2,
            numPassingTests: 1,
            numFailingTests: 0
          }
        ]
      };
      
      const result = await recovery.recoverJestResults(dataWithInvalidStatus);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.testResults[0].assertionResults[0].status).toBe('unknown');
      expect(result.recoveredData.testResults[0].assertionResults[1].status).toBe('passed');
      expect(result.warnings).toContain(expect.stringMatching(/Normalized invalid status/));
    });

    it('should calculate missing summary fields from test results', async () => {
      const dataWithoutSummary = {
        testResults: [
          {
            testFilePath: '/test/file1.js',
            assertionResults: [
              { title: 'test 1', status: 'passed', duration: 100 },
              { title: 'test 2', status: 'failed', duration: 50 }
            ],
            numTotalTests: 2,
            numPassingTests: 1,
            numFailingTests: 1
          },
          {
            testFilePath: '/test/file2.js',
            assertionResults: [
              { title: 'test 3', status: 'passed', duration: 75 }
            ],
            numTotalTests: 1,
            numPassingTests: 1,
            numFailingTests: 0
          }
        ]
        // Missing summary fields
      };
      
      const result = await recovery.recoverJestResults(dataWithoutSummary);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.numTotalTests).toBe(3);
      expect(result.recoveredData.numPassedTests).toBe(2);
      expect(result.recoveredData.numFailedTests).toBe(1);
    });

    it('should add missing performance stats', async () => {
      const dataWithoutPerfStats = {
        testResults: [
          {
            testFilePath: '/test/file.js',
            assertionResults: [],
            numTotalTests: 0,
            numPassingTests: 0,
            numFailingTests: 0
            // Missing perfStats
          }
        ]
      };
      
      const result = await recovery.recoverJestResults(dataWithoutPerfStats);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.testResults[0].perfStats).toBeDefined();
      expect(result.recoveredData.testResults[0].perfStats.start).toBeDefined();
      expect(result.recoveredData.testResults[0].perfStats.end).toBeDefined();
    });

    it('should handle line-by-line JSON parsing', async () => {
      const lineByLineData = `
        {"testFilePath": "/test/file1.js", "numTotalTests": 1}
        {"testFilePath": "/test/file2.js", "numTotalTests": 2}
        {"testFilePath": "/test/file3.js", "numTotalTests": 0}
      `;
      
      const result = await recovery.recoverJestResults(lineByLineData);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.recoveredData)).toBe(true);
    });

    it('should fallback to minimal data when all parsing fails', async () => {
      const unparsableData = 'completely invalid data that cannot be parsed in any way';
      
      const result = await recovery.recoverJestResults(unparsableData);
      
      expect(result.success).toBe(true);
      expect(result.partialData).toBeDefined();
      expect(result.partialData.testResults).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should respect configuration flags', async () => {
      const restrictedRecovery = new MalformedDataRecovery(mockLogger, mockErrorHandler, {
        enablePartialRecovery: false,
        enableDataSanitization: false,
        enableSchemaValidation: false,
        fallbackToMinimalData: false
      });
      
      const result = await restrictedRecovery.recoverJestResults(null);
      
      expect(result.success).toBe(false);
      expect(result.partialData).toBeUndefined();
    });
  });

  describe('recoverCoverageData', () => {
    it('should handle valid coverage data', async () => {
      const validCoverage = {
        total: {
          lines: { total: 100, covered: 80, skipped: 0, pct: 80 },
          functions: { total: 20, covered: 18, skipped: 0, pct: 90 },
          statements: { total: 150, covered: 120, skipped: 0, pct: 80 },
          branches: { total: 50, covered: 40, skipped: 0, pct: 80 }
        }
      };
      
      const result = await recovery.recoverCoverageData(validCoverage);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.total).toEqual(validCoverage.total);
    });

    it('should parse coverage data from JSON string', async () => {
      const coverageJson = JSON.stringify({
        total: {
          lines: { total: 100, covered: 80, skipped: 0, pct: 80 }
        }
      });
      
      const result = await recovery.recoverCoverageData(coverageJson);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.total.lines.pct).toBe(80);
    });

    it('should create minimal coverage data when input is invalid', async () => {
      const result = await recovery.recoverCoverageData('invalid json');
      
      expect(result.success).toBe(true);
      expect(result.partialData).toBeDefined();
      expect(result.partialData.total.lines.total).toBe(0);
      expect(result.partialData.total.functions.total).toBe(0);
    });

    it('should sanitize incomplete coverage data', async () => {
      const incompleteCoverage = {
        // Missing total field
        someOtherField: 'value'
      };
      
      const result = await recovery.recoverCoverageData(incompleteCoverage);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData.total).toBeDefined();
      expect(result.recoveredData.total.lines).toBeDefined();
      expect(result.warnings).toContain('Added missing coverage totals');
    });

    it('should handle null coverage data', async () => {
      const result = await recovery.recoverCoverageData(null);
      
      expect(result.success).toBe(true);
      expect(result.partialData.total).toBeDefined();
      expect(result.warnings).toContain('Used minimal coverage data structure');
    });
  });

  describe('error handling', () => {
    it('should handle exceptions during recovery gracefully', async () => {
      // Mock JSON.parse to throw an error
      const originalParse = JSON.parse;
      JSON.parse = jest.fn().mockImplementation(() => {
        throw new Error('Parsing error');
      });
      
      const result = await recovery.recoverJestResults('{"test": "data"}');
      
      expect(result.success).toBe(true); // Should fallback to minimal data
      expect(result.partialData).toBeDefined();
      
      // Restore original JSON.parse
      JSON.parse = originalParse;
    });

    it('should log recovery attempts and results', async () => {
      const validData = { testResults: [] };
      
      await recovery.recoverJestResults(validData);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully recovered malformed test data'),
        expect.any(Object)
      );
    });

    it('should handle circular references in data', async () => {
      const circularData: any = { testResults: [] };
      circularData.self = circularData;
      
      const result = await recovery.recoverJestResults(circularData);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
    });
  });

  describe('partial JSON reconstruction', () => {
    it('should reconstruct object from key-value pairs', async () => {
      const partialData = `
        "testFilePath": "/test/file.js",
        "numTotalTests": 5,
        "numPassingTests": 4,
        "numFailingTests": 1
      `;
      
      const result = await recovery.recoverJestResults(partialData);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
    });

    it('should handle malformed key-value pairs gracefully', async () => {
      const malformedData = `
        testFilePath: /test/file.js (no quotes)
        "numTotalTests" = 5 (wrong separator)
        numPassingTests: "four" (string instead of number)
      `;
      
      const result = await recovery.recoverJestResults(malformedData);
      
      // Should still succeed with fallback data
      expect(result.success).toBe(true);
      expect(result.partialData).toBeDefined();
    });
  });
});