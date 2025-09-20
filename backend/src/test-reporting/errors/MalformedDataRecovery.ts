/**
 * Recovery mechanisms for malformed test data
 * Handles corrupted or incomplete Jest test results
 */

import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';
import { ReportingErrorType, ErrorContext } from './ErrorTypes';

export interface TestResultRecovery {
  success: boolean;
  recoveredData?: any;
  partialData?: any;
  warnings: string[];
  errors: string[];
}

export interface RecoveryConfig {
  enablePartialRecovery: boolean;
  enableDataSanitization: boolean;
  enableSchemaValidation: boolean;
  maxRecoveryAttempts: number;
  fallbackToMinimalData: boolean;
}

export class MalformedDataRecovery {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: RecoveryConfig;

  constructor(
    logger: Logger,
    errorHandler: ErrorHandler,
    config: Partial<RecoveryConfig> = {}
  ) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.config = {
      enablePartialRecovery: true,
      enableDataSanitization: true,
      enableSchemaValidation: true,
      maxRecoveryAttempts: 3,
      fallbackToMinimalData: true,
      ...config
    };
  }

  /**
   * Attempt to recover Jest test results from malformed data
   */
  public async recoverJestResults(rawData: any): Promise<TestResultRecovery> {
    const context: ErrorContext = {
      operation: 'recoverJestResults',
      component: 'MalformedDataRecovery'
    };

    const recovery: TestResultRecovery = {
      success: false,
      warnings: [],
      errors: []
    };

    try {
      // Step 1: Basic data validation
      if (!rawData) {
        recovery.errors.push('No data provided for recovery');
        return this.fallbackToMinimalData(recovery);
      }

      // Step 2: Attempt to parse if it's a string
      let parsedData = rawData;
      if (typeof rawData === 'string') {
        parsedData = await this.parseStringData(rawData, recovery);
        if (!parsedData) {
          return this.fallbackToMinimalData(recovery);
        }
      }

      // Step 3: Validate and sanitize the structure
      const sanitizedData = await this.sanitizeTestResults(parsedData, recovery);
      
      // Step 4: Validate against expected schema
      const validatedData = await this.validateTestResultSchema(sanitizedData, recovery);
      
      // Step 5: Fill in missing required fields
      const completeData = await this.fillMissingFields(validatedData, recovery);

      recovery.recoveredData = completeData;
      recovery.success = true;

      this.logger.info('Successfully recovered malformed test data', {
        warningsCount: recovery.warnings.length,
        errorsCount: recovery.errors.length,
        hasRecoveredData: !!recovery.recoveredData
      });

      return recovery;

    } catch (error) {
      recovery.errors.push(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      await this.errorHandler.handleError(error as Error, context);
      
      return this.fallbackToMinimalData(recovery);
    }
  }

  /**
   * Parse string data that might be malformed JSON
   */
  private async parseStringData(data: string, recovery: TestResultRecovery): Promise<any> {
    try {
      // Try direct JSON parse first
      return JSON.parse(data);
    } catch (error) {
      recovery.warnings.push('Direct JSON parsing failed, attempting recovery');
      
      // Attempt various recovery strategies
      const strategies = [
        () => this.fixCommonJsonErrors(data),
        () => this.extractJsonFromText(data),
        () => this.parsePartialJson(data),
        () => this.parseLineByLineJson(data)
      ];

      for (const strategy of strategies) {
        try {
          const result = strategy();
          if (result) {
            recovery.warnings.push(`Recovered using strategy: ${strategy.name}`);
            return result;
          }
        } catch (strategyError) {
          recovery.warnings.push(`Strategy ${strategy.name} failed: ${strategyError instanceof Error ? strategyError.message : 'Unknown error'}`);
        }
      }

      recovery.errors.push('All parsing strategies failed');
      return null;
    }
  }

  /**
   * Fix common JSON syntax errors
   */
  private fixCommonJsonErrors(data: string): any {
    let fixed = data;

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix unquoted keys
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    // Fix single quotes to double quotes
    fixed = fixed.replace(/'/g, '"');
    
    // Remove comments
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
    fixed = fixed.replace(/\/\/.*$/gm, '');
    
    // Fix undefined values
    fixed = fixed.replace(/:\s*undefined/g, ': null');
    
    // Try to parse the fixed version
    return JSON.parse(fixed);
  }

  /**
   * Extract JSON from mixed text content
   */
  private extractJsonFromText(data: string): any {
    // Look for JSON-like structures in the text
    const jsonMatches = data.match(/\{[\s\S]*\}/g);
    
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          return JSON.parse(match);
        } catch (error) {
          // Try fixing common errors in this match
          try {
            return this.fixCommonJsonErrors(match);
          } catch (fixError) {
            continue;
          }
        }
      }
    }

    // Look for array structures
    const arrayMatches = data.match(/\[[\s\S]*\]/g);
    
    if (arrayMatches) {
      for (const match of arrayMatches) {
        try {
          return JSON.parse(match);
        } catch (error) {
          try {
            return this.fixCommonJsonErrors(match);
          } catch (fixError) {
            continue;
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse partial JSON by reconstructing from fragments
   */
  private parsePartialJson(data: string): any {
    const lines = data.split('\n');
    const reconstructed: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for key-value pairs
      const kvMatch = trimmed.match(/^"?([^"]+)"?\s*:\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let value = kvMatch[2];
        
        // Remove trailing comma
        value = value.replace(/,$/, '');
        
        try {
          reconstructed[key] = JSON.parse(value);
        } catch (error) {
          // Store as string if can't parse
          reconstructed[key] = value.replace(/^"|"$/g, '');
        }
      }
    }

    return Object.keys(reconstructed).length > 0 ? reconstructed : null;
  }

  /**
   * Parse line-by-line JSON objects
   */
  private parseLineByLineJson(data: string): any {
    const lines = data.split('\n');
    const results: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
        try {
          results.push(JSON.parse(trimmed));
        } catch (error) {
          try {
            results.push(this.fixCommonJsonErrors(trimmed));
          } catch (fixError) {
            // Skip this line
          }
        }
      }
    }

    return results.length > 0 ? (results.length === 1 ? results[0] : results) : null;
  }

  /**
   * Sanitize test results structure
   */
  private async sanitizeTestResults(data: any, recovery: TestResultRecovery): Promise<any> {
    if (!this.config.enableDataSanitization) {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone

    try {
      // Ensure basic structure exists
      if (!sanitized.testResults) {
        if (Array.isArray(sanitized)) {
          sanitized.testResults = sanitized;
        } else {
          sanitized.testResults = [];
          recovery.warnings.push('Created missing testResults array');
        }
      }

      // Sanitize test results array
      if (Array.isArray(sanitized.testResults)) {
        sanitized.testResults = sanitized.testResults.map((result: any, index: number) => {
          return this.sanitizeTestResult(result, index, recovery);
        }).filter(Boolean); // Remove null results
      }

      // Ensure summary exists
      if (!sanitized.numTotalTests && sanitized.testResults) {
        sanitized.numTotalTests = sanitized.testResults.reduce((sum: number, result: any) => {
          return sum + (result.numTotalTests || result.assertionResults?.length || 0);
        }, 0);
        recovery.warnings.push('Calculated missing numTotalTests');
      }

      // Sanitize other summary fields
      this.sanitizeSummaryFields(sanitized, recovery);

      return sanitized;

    } catch (error) {
      recovery.errors.push(`Data sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return data; // Return original data if sanitization fails
    }
  }

  /**
   * Sanitize individual test result
   */
  private sanitizeTestResult(result: any, index: number, recovery: TestResultRecovery): any {
    if (!result || typeof result !== 'object') {
      recovery.warnings.push(`Skipped invalid test result at index ${index}`);
      return null;
    }

    const sanitized = { ...result };

    // Ensure required fields exist
    if (!sanitized.testFilePath) {
      sanitized.testFilePath = `unknown-test-${index}.test.js`;
      recovery.warnings.push(`Added missing testFilePath for result ${index}`);
    }

    if (!sanitized.assertionResults) {
      sanitized.assertionResults = [];
      recovery.warnings.push(`Added missing assertionResults for ${sanitized.testFilePath}`);
    }

    // Sanitize assertion results
    if (Array.isArray(sanitized.assertionResults)) {
      sanitized.assertionResults = sanitized.assertionResults.map((assertion: any, assertionIndex: number) => {
        return this.sanitizeAssertion(assertion, assertionIndex, sanitized.testFilePath, recovery);
      }).filter(Boolean);
    }

    // Calculate missing numeric fields
    if (sanitized.numTotalTests === undefined) {
      sanitized.numTotalTests = sanitized.assertionResults.length;
    }

    if (sanitized.numPassingTests === undefined) {
      sanitized.numPassingTests = sanitized.assertionResults.filter((a: any) => a.status === 'passed').length;
    }

    if (sanitized.numFailingTests === undefined) {
      sanitized.numFailingTests = sanitized.assertionResults.filter((a: any) => a.status === 'failed').length;
    }

    // Ensure performance stats exist
    if (!sanitized.perfStats) {
      sanitized.perfStats = {
        start: Date.now() - 1000,
        end: Date.now()
      };
      recovery.warnings.push(`Added missing perfStats for ${sanitized.testFilePath}`);
    }

    return sanitized;
  }

  /**
   * Sanitize individual assertion
   */
  private sanitizeAssertion(assertion: any, index: number, testFile: string, recovery: TestResultRecovery): any {
    if (!assertion || typeof assertion !== 'object') {
      recovery.warnings.push(`Skipped invalid assertion at index ${index} in ${testFile}`);
      return null;
    }

    const sanitized = { ...assertion };

    // Ensure required fields
    if (!sanitized.title) {
      sanitized.title = `Test ${index + 1}`;
      recovery.warnings.push(`Added missing title for assertion ${index} in ${testFile}`);
    }

    if (!sanitized.status) {
      sanitized.status = 'unknown';
      recovery.warnings.push(`Added missing status for assertion "${sanitized.title}" in ${testFile}`);
    }

    // Normalize status values
    const validStatuses = ['passed', 'failed', 'skipped', 'pending', 'todo'];
    if (!validStatuses.includes(sanitized.status)) {
      const originalStatus = sanitized.status;
      sanitized.status = 'unknown';
      recovery.warnings.push(`Normalized invalid status "${originalStatus}" to "unknown" for "${sanitized.title}"`);
    }

    // Ensure duration exists
    if (sanitized.duration === undefined) {
      sanitized.duration = 0;
    }

    return sanitized;
  }

  /**
   * Sanitize summary fields
   */
  private sanitizeSummaryFields(data: any, recovery: TestResultRecovery): void {
    const requiredFields = [
      'numTotalTests',
      'numPassedTests',
      'numFailedTests',
      'numPendingTests',
      'numTodoTests'
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined) {
        data[field] = 0;
        recovery.warnings.push(`Added missing summary field: ${field}`);
      }
    }

    // Calculate derived fields
    if (data.numPassedTests === 0 && data.numFailedTests === 0 && data.testResults) {
      data.numPassedTests = data.testResults.reduce((sum: number, result: any) => {
        return sum + (result.numPassingTests || 0);
      }, 0);
      
      data.numFailedTests = data.testResults.reduce((sum: number, result: any) => {
        return sum + (result.numFailingTests || 0);
      }, 0);
      
      recovery.warnings.push('Calculated summary test counts from test results');
    }
  }

  /**
   * Validate test result schema
   */
  private async validateTestResultSchema(data: any, recovery: TestResultRecovery): Promise<any> {
    if (!this.config.enableSchemaValidation) {
      return data;
    }

    // Basic schema validation
    const requiredTopLevelFields = ['testResults'];
    const missingFields = requiredTopLevelFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      recovery.warnings.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return data;
  }

  /**
   * Fill in missing required fields with defaults
   */
  private async fillMissingFields(data: any, recovery: TestResultRecovery): Promise<any> {
    const filled = { ...data };

    // Ensure timestamp
    if (!filled.startTime) {
      filled.startTime = Date.now() - 60000; // 1 minute ago
      recovery.warnings.push('Added missing startTime');
    }

    if (!filled.endTime) {
      filled.endTime = Date.now();
      recovery.warnings.push('Added missing endTime');
    }

    // Ensure success flag
    if (filled.success === undefined) {
      filled.success = (filled.numFailedTests || 0) === 0;
      recovery.warnings.push('Calculated missing success flag');
    }

    return filled;
  }

  /**
   * Fallback to minimal data structure
   */
  private fallbackToMinimalData(recovery: TestResultRecovery): TestResultRecovery {
    if (!this.config.fallbackToMinimalData) {
      return recovery;
    }

    recovery.partialData = {
      testResults: [],
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      success: false,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
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
      wasInterrupted: false
    };

    recovery.warnings.push('Used minimal fallback data structure');
    recovery.success = true; // Partial success

    this.logger.warn('Falling back to minimal test data structure', {
      originalErrors: recovery.errors,
      warnings: recovery.warnings
    });

    return recovery;
  }

  /**
   * Attempt to recover coverage data
   */
  public async recoverCoverageData(rawData: any): Promise<TestResultRecovery> {
    const recovery: TestResultRecovery = {
      success: false,
      warnings: [],
      errors: []
    };

    try {
      if (!rawData) {
        return this.createMinimalCoverageData(recovery);
      }

      let coverageData = rawData;
      
      // If it's a string, try to parse it
      if (typeof rawData === 'string') {
        try {
          coverageData = JSON.parse(rawData);
        } catch (error) {
          recovery.warnings.push('Failed to parse coverage data as JSON');
          return this.createMinimalCoverageData(recovery);
        }
      }

      // Validate and sanitize coverage structure
      const sanitized = this.sanitizeCoverageData(coverageData, recovery);
      
      recovery.recoveredData = sanitized;
      recovery.success = true;

      return recovery;

    } catch (error) {
      recovery.errors.push(`Coverage recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createMinimalCoverageData(recovery);
    }
  }

  /**
   * Sanitize coverage data structure
   */
  private sanitizeCoverageData(data: any, recovery: TestResultRecovery): any {
    const sanitized = { ...data };

    // Ensure basic structure
    if (!sanitized.total) {
      sanitized.total = {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
      };
      recovery.warnings.push('Added missing coverage totals');
    }

    return sanitized;
  }

  /**
   * Create minimal coverage data
   */
  private createMinimalCoverageData(recovery: TestResultRecovery): TestResultRecovery {
    recovery.partialData = {
      total: {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
      }
    };

    recovery.warnings.push('Used minimal coverage data structure');
    recovery.success = true;

    return recovery;
  }
}