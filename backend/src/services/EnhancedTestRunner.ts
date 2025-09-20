/**
 * Enhanced Test Runner Service
 * 
 * Refactored version of the existing test runner using proper TypeScript interfaces
 * and the new TestResultAggregationService for sophisticated result processing.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { AggregatedResult } from '@jest/test-result';
import { TestResultAggregationService } from './TestResultAggregationService';
import {
  AggregatedTestData,
  TestCategory,
  TestStatus,
  BuildMetadata,
  TestSummary,
  PerformanceMetrics
} from '../types/test-reporting';

export interface TestRunnerConfig {
  failFast: boolean;
  verbose: boolean;
  suite?: TestCategory;
  outputDirectory: string;
  timeout: number;
  parallel: boolean;
  coverage: boolean;
}

export interface TestSuiteConfig {
  name: TestCategory;
  command: string;
  timeout?: number;
  env?: Record<string, string>;
  enabled: boolean;
}

export interface TestRunResult {
  success: boolean;
  aggregatedData: AggregatedTestData;
  duration: number;
  timestamp: Date;
}

export interface TestExecutionContext {
  startTime: Date;
  environment: Record<string, string>;
  workingDirectory: string;
  nodeVersion: string;
  platform: string;
}

export class EnhancedTestRunner {
  private config: TestRunnerConfig;
  private aggregationService: TestResultAggregationService;
  private context: TestExecutionContext;
  private suiteConfigs: TestSuiteConfig[];

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.aggregationService = new TestResultAggregationService();
    this.context = this.initializeContext();
    this.suiteConfigs = this.initializeSuiteConfigs();
  }

  /**
   * Run all test suites or a specific suite
   */
  async runTests(suite?: TestCategory): Promise<TestRunResult> {
    const startTime = new Date();
    
    try {
      let suitesToRun = this.suiteConfigs.filter(s => s.enabled);
      
      if (suite) {
        suitesToRun = suitesToRun.filter(s => s.name === suite);
        if (suitesToRun.length === 0) {
          throw new Error(`Test suite '${suite}' not found or disabled`);
        }
      }

      const jestResults = await this.executeJestTests(suitesToRun);
      const aggregatedData = await this.aggregationService.aggregateResults(jestResults);
      
      const duration = new Date().getTime() - startTime.getTime();
      
      return {
        success: aggregatedData.summary.failedTests === 0,
        aggregatedData,
        duration,
        timestamp: startTime
      };
    } catch (error) {
      throw new Error(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute Jest tests and return aggregated results
   */
  private async executeJestTests(suites: TestSuiteConfig[]): Promise<AggregatedResult> {
    const jestCommand = this.buildJestCommand(suites);
    
    try {
      const output = execSync(jestCommand, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, ...this.getTestEnvironment() },
        cwd: this.context.workingDirectory,
        timeout: this.config.timeout
      });

      // Parse Jest JSON output
      return this.parseJestOutput(output);
    } catch (error: any) {
      // Jest returns non-zero exit code for test failures, but we still want the results
      if (error.stdout) {
        return this.parseJestOutput(error.stdout);
      }
      throw error;
    }
  }

  /**
   * Build Jest command with appropriate flags
   */
  private buildJestCommand(suites: TestSuiteConfig[]): string {
    const baseCommand = 'npx jest';
    const flags: string[] = [];

    // Add JSON output for parsing
    flags.push('--json');
    
    if (this.config.coverage) {
      flags.push('--coverage');
    }
    
    if (this.config.verbose) {
      flags.push('--verbose');
    }
    
    if (this.config.failFast) {
      flags.push('--bail');
    }
    
    if (this.config.parallel) {
      flags.push('--runInBand=false');
    } else {
      flags.push('--runInBand');
    }

    // Add test patterns for specific suites
    const patterns = suites.map(suite => this.getSuitePattern(suite.name)).join('|');
    if (patterns) {
      flags.push(`--testPathPattern="${patterns}"`);
    }

    return `${baseCommand} ${flags.join(' ')}`;
  }

  /**
   * Get test pattern for a specific suite category
   */
  private getSuitePattern(category: TestCategory): string {
    switch (category) {
      case TestCategory.UNIT:
        return '(unit|spec|test)\\.(ts|js)$';
      case TestCategory.INTEGRATION:
        return 'integration.*\\.(ts|js)$';
      case TestCategory.E2E:
        return '(e2e|end-to-end).*\\.(ts|js)$';
      case TestCategory.PERFORMANCE:
        return '(performance|benchmark).*\\.(ts|js)$';
      default:
        return '\\.(test|spec)\\.(ts|js)$';
    }
  }

  /**
   * Parse Jest JSON output into AggregatedResult
   */
  private parseJestOutput(output: string): AggregatedResult {
    try {
      // Jest outputs multiple JSON objects, we want the last one (summary)
      const lines = output.trim().split('\n');
      const lastJsonLine = lines.reverse().find(line => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
      });

      if (!lastJsonLine) {
        throw new Error('No valid JSON output found from Jest');
      }

      return JSON.parse(lastJsonLine) as AggregatedResult;
    } catch (error) {
      throw new Error(`Failed to parse Jest output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get test environment variables
   */
  private getTestEnvironment(): Record<string, string> {
    return {
      NODE_ENV: 'test',
      CI: this.isCI() ? 'true' : 'false',
      JEST_WORKER_ID: '1',
      ...this.context.environment
    };
  }

  /**
   * Initialize execution context
   */
  private initializeContext(): TestExecutionContext {
    return {
      startTime: new Date(),
      environment: process.env as Record<string, string>,
      workingDirectory: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * Initialize suite configurations
   */
  private initializeSuiteConfigs(): TestSuiteConfig[] {
    return [
      {
        name: TestCategory.UNIT,
        command: 'jest --testPathPattern="(unit|spec|test)\\.(ts|js)$"',
        enabled: true,
        timeout: 30000
      },
      {
        name: TestCategory.INTEGRATION,
        command: 'jest --testPathPattern="integration.*\\.(ts|js)$"',
        enabled: true,
        timeout: 60000
      },
      {
        name: TestCategory.E2E,
        command: 'jest --testPathPattern="(e2e|end-to-end).*\\.(ts|js)$"',
        enabled: true,
        timeout: 120000
      },
      {
        name: TestCategory.PERFORMANCE,
        command: 'jest --testPathPattern="(performance|benchmark).*\\.(ts|js)$"',
        enabled: true,
        timeout: 180000
      }
    ];
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<TestRunnerConfig>): TestRunnerConfig {
    return {
      failFast: false,
      verbose: false,
      outputDirectory: './test-reports',
      timeout: 300000, // 5 minutes
      parallel: true,
      coverage: true,
      ...config
    };
  }

  /**
   * Check if running in CI environment
   */
  private isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.JENKINS_URL
    );
  }

  /**
   * Get configuration
   */
  getConfig(): TestRunnerConfig {
    return { ...this.config };
  }

  /**
   * Get suite configurations
   */
  getSuiteConfigs(): TestSuiteConfig[] {
    return [...this.suiteConfigs];
  }

  /**
   * Update suite configuration
   */
  updateSuiteConfig(category: TestCategory, updates: Partial<TestSuiteConfig>): void {
    const suiteIndex = this.suiteConfigs.findIndex(s => s.name === category);
    if (suiteIndex >= 0) {
      this.suiteConfigs[suiteIndex] = { ...this.suiteConfigs[suiteIndex], ...updates };
    }
  }

  /**
   * Enable or disable a test suite
   */
  setSuiteEnabled(category: TestCategory, enabled: boolean): void {
    this.updateSuiteConfig(category, { enabled });
  }
}