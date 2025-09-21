/**
 * Error Context Preservation for Testing
 * 
 * This module provides utilities to preserve error context during automated testing,
 * ensuring that error information is captured and made available to test reports
 * and debugging tools.
 */

import { ErrorInfo } from 'react';

// Safe environment variable access for browser compatibility
const getEnvVar = (key: string, defaultValue?: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue || '';
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || defaultValue || '';
  }
  return defaultValue || '';
};

// Test environment detection
export const isTestEnvironment = (): boolean => {
  // Safe browser check for process
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'test' || 
           process.env.VITEST === 'true' || 
           process.env.JEST_WORKER_ID !== undefined;
  }
  
  // Browser environment checks
  return (typeof global !== 'undefined' && global.__VITEST__) ||
         (typeof window !== 'undefined' && (window as any).__VITEST__) ||
         (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__.NODE_ENV === 'test');
};

// Enhanced error context for testing
export interface TestErrorContext {
  errorId: string;
  timestamp: string;
  testName?: string;
  testFile?: string;
  testSuite?: string;
  component: string;
  props: Record<string, any>;
  state?: Record<string, any>;
  route: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
  stackTrace?: string;
  componentStack?: string;
  errorCategory: string;
  errorSeverity: string;
  retryCount: number;
  testFramework?: 'vitest' | 'jest' | 'playwright' | 'cypress';
  testRunId?: string;
  buildInfo?: {
    version: string;
    commit?: string;
    branch?: string;
    buildTime?: string;
  };
}

// Test error report structure
export interface TestErrorReport {
  id: string;
  context: TestErrorContext;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo?: ErrorInfo;
  capturedAt: string;
  testMetadata: {
    framework: string;
    runner: string;
    environment: string;
    config?: Record<string, any>;
  };
  debugging: {
    domSnapshot?: string;
    consoleOutput?: string[];
    networkRequests?: any[];
    localStorage?: Record<string, string>;
    sessionStorage?: Record<string, string>;
  };
}

/**
 * Error Context Collector for Test Environments
 */
export class TestErrorContextCollector {
  private static instance: TestErrorContextCollector;
  private errorReports: Map<string, TestErrorReport> = new Map();
  private testMetadata: Record<string, any> = {};
  private debuggingEnabled = true;

  static getInstance(): TestErrorContextCollector {
    if (!TestErrorContextCollector.instance) {
      TestErrorContextCollector.instance = new TestErrorContextCollector();
    }
    return TestErrorContextCollector.instance;
  }

  /**
   * Initialize the collector with test metadata
   */
  initialize(metadata: Record<string, any>): void {
    this.testMetadata = metadata;
    this.setupTestFrameworkIntegration();
  }

  /**
   * Collect comprehensive error context for testing
   */
  collectErrorContext(
    error: Error,
    errorInfo: ErrorInfo,
    additionalContext: Partial<TestErrorContext> = {}
  ): TestErrorContext {
    const testInfo = this.getCurrentTestInfo();
    const buildInfo = this.getBuildInfo();

    return {
      errorId: `test_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      testName: testInfo.testName,
      testFile: testInfo.testFile,
      testSuite: testInfo.testSuite,
      component: this.extractComponentName(errorInfo.componentStack),
      props: this.sanitizeProps(additionalContext.props || {}),
      state: additionalContext.state,
      route: this.getCurrentRoute(),
      userAgent: this.getUserAgent(),
      sessionId: this.getOrCreateSessionId(),
      userId: additionalContext.userId,
      stackTrace: error.stack,
      componentStack: errorInfo.componentStack,
      errorCategory: additionalContext.errorCategory || 'runtime',
      errorSeverity: additionalContext.errorSeverity || 'medium',
      retryCount: additionalContext.retryCount || 0,
      testFramework: this.detectTestFramework(),
      testRunId: this.getTestRunId(),
      buildInfo,
      ...additionalContext,
    };
  }

  /**
   * Create a comprehensive test error report
   */
  createTestErrorReport(
    error: Error,
    errorInfo: ErrorInfo,
    context: TestErrorContext
  ): TestErrorReport {
    const report: TestErrorReport = {
      id: context.errorId,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      capturedAt: new Date().toISOString(),
      testMetadata: {
        framework: context.testFramework || 'unknown',
        runner: this.getTestRunner(),
        environment: getEnvVar('NODE_ENV', 'test'),
        config: this.testMetadata,
      },
      debugging: this.collectDebuggingInfo(),
    };

    // Store the report
    this.errorReports.set(report.id, report);

    // Emit to test framework
    this.emitToTestFramework(report);

    return report;
  }

  /**
   * Get current test information
   */
  private getCurrentTestInfo(): { testName?: string; testFile?: string; testSuite?: string } {
    // Try to extract test info from different frameworks
    if (typeof global !== 'undefined') {
      // Vitest/Jest
      const vitestState = (global as any).__VITEST__;
      if (vitestState?.ctx?.current) {
        return {
          testName: vitestState.ctx.current.name,
          testFile: vitestState.ctx.current.file?.name,
          testSuite: vitestState.ctx.current.suite?.name,
        };
      }

      // Jest
      const jestState = (global as any).jasmine?.currentSpec;
      if (jestState) {
        return {
          testName: jestState.description,
          testFile: jestState.filename,
          testSuite: jestState.suite?.description,
        };
      }
    }

    // Try to extract from error stack
    const stack = new Error().stack;
    if (stack) {
      const testFileMatch = stack.match(/at.*\/(.*\.test\.[jt]sx?):/);
      if (testFileMatch) {
        return {
          testFile: testFileMatch[1],
        };
      }
    }

    return {};
  }

  /**
   * Extract component name from component stack
   */
  private extractComponentName(componentStack: string): string {
    const match = componentStack.match(/^\s*in (\w+)/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Sanitize props for safe serialization
   */
  private sanitizeProps(props: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.keys(props).forEach(key => {
      const value = props[key];
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (value instanceof Error) {
        sanitized[key] = `[Error: ${value.message}]`;
      } else if (value && typeof value === 'object') {
        try {
          sanitized[key] = JSON.parse(JSON.stringify(value));
        } catch {
          sanitized[key] = '[Complex Object]';
        }
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Get current route for testing
   */
  private getCurrentRoute(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return '/test-route';
  }

  /**
   * Get user agent for testing
   */
  private getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Test Environment';
  }

  /**
   * Get or create session ID for test run
   */
  private getOrCreateSessionId(): string {
    const key = 'test-error-session-id';
    
    if (typeof sessionStorage !== 'undefined') {
      let sessionId = sessionStorage.getItem(key);
      if (!sessionId) {
        sessionId = `test_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem(key, sessionId);
      }
      return sessionId;
    }
    
    return `test_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Detect the current test framework
   */
  private detectTestFramework(): 'vitest' | 'jest' | 'playwright' | 'cypress' {
    if (typeof global !== 'undefined') {
      if ((global as any).__VITEST__) return 'vitest';
      if ((global as any).jest) return 'jest';
    }
    
    if (typeof window !== 'undefined') {
      if ((window as any).Cypress) return 'cypress';
      if ((window as any).playwright) return 'playwright';
    }
    
    return 'vitest'; // Default assumption
  }

  /**
   * Get test run ID
   */
  private getTestRunId(): string {
    return getEnvVar('TEST_RUN_ID') || 
           getEnvVar('CI_BUILD_ID') || 
           getEnvVar('GITHUB_RUN_ID') || 
           `local_${Date.now()}`;
  }

  /**
   * Get build information
   */
  private getBuildInfo(): TestErrorContext['buildInfo'] {
    return {
      version: getEnvVar('REACT_APP_VERSION') || getEnvVar('npm_package_version', 'unknown'),
      commit: getEnvVar('REACT_APP_GIT_SHA') || getEnvVar('GITHUB_SHA'),
      branch: getEnvVar('REACT_APP_GIT_BRANCH') || getEnvVar('GITHUB_REF_NAME'),
      buildTime: getEnvVar('REACT_APP_BUILD_TIME'),
    };
  }

  /**
   * Get test runner information
   */
  private getTestRunner(): string {
    if (getEnvVar('CI')) {
      return getEnvVar('GITHUB_ACTIONS') ? 'github-actions' : 
             getEnvVar('GITLAB_CI') ? 'gitlab-ci' : 
             getEnvVar('JENKINS_URL') ? 'jenkins' : 'ci';
    }
    return 'local';
  }

  /**
   * Collect debugging information
   */
  private collectDebuggingInfo(): TestErrorReport['debugging'] {
    if (!this.debuggingEnabled) {
      return {};
    }

    const debugging: TestErrorReport['debugging'] = {};

    // DOM snapshot
    if (typeof document !== 'undefined') {
      try {
        debugging.domSnapshot = document.documentElement.outerHTML;
      } catch (error) {
        debugging.domSnapshot = `[Error capturing DOM: ${error}]`;
      }
    }

    // Console output (if available)
    debugging.consoleOutput = this.getConsoleOutput();

    // Storage states
    if (typeof localStorage !== 'undefined') {
      try {
        debugging.localStorage = { ...localStorage };
      } catch (error) {
        debugging.localStorage = { error: `Failed to capture localStorage: ${error}` };
      }
    }

    if (typeof sessionStorage !== 'undefined') {
      try {
        debugging.sessionStorage = { ...sessionStorage };
      } catch (error) {
        debugging.sessionStorage = { error: `Failed to capture sessionStorage: ${error}` };
      }
    }

    return debugging;
  }

  /**
   * Get console output if available
   */
  private getConsoleOutput(): string[] {
    // This would need to be implemented with console interception
    // For now, return empty array
    return [];
  }

  /**
   * Setup test framework integration
   */
  private setupTestFrameworkIntegration(): void {
    // Vitest integration
    if (typeof global !== 'undefined' && (global as any).__VITEST__) {
      this.setupVitestIntegration();
    }

    // Jest integration
    if (typeof global !== 'undefined' && (global as any).jest) {
      this.setupJestIntegration();
    }

    // Playwright integration
    if (typeof window !== 'undefined' && (window as any).playwright) {
      this.setupPlaywrightIntegration();
    }
  }

  /**
   * Setup Vitest integration
   */
  private setupVitestIntegration(): void {
    // Hook into Vitest's test lifecycle if available
    const vitest = (global as any).__VITEST__;
    if (vitest?.ctx) {
      // Store original test methods
      const originalTest = vitest.ctx.test;
      
      // Wrap test execution to capture errors
      if (originalTest) {
        vitest.ctx.test = (...args: any[]) => {
          try {
            return originalTest.apply(vitest.ctx, args);
          } catch (error) {
            this.handleTestFrameworkError(error);
            throw error;
          }
        };
      }
    }
  }

  /**
   * Setup Jest integration
   */
  private setupJestIntegration(): void {
    // Jest integration would go here
    // This is a placeholder for Jest-specific setup
  }

  /**
   * Setup Playwright integration
   */
  private setupPlaywrightIntegration(): void {
    // Playwright integration would go here
    // This is a placeholder for Playwright-specific setup
  }

  /**
   * Handle errors from test frameworks
   */
  private handleTestFrameworkError(error: any): void {
    console.error('Test framework error captured:', error);
    // Additional handling could be added here
  }

  /**
   * Emit error report to test framework
   */
  private emitToTestFramework(report: TestErrorReport): void {
    // Emit to console for test output
    console.error('Error Report for Test Framework:', {
      id: report.id,
      testName: report.context.testName,
      testFile: report.context.testFile,
      error: report.error.message,
      component: report.context.component,
      timestamp: report.capturedAt,
    });

    // Try to emit to specific test frameworks
    this.emitToVitest(report);
    this.emitToJest(report);
    this.emitToPlaywright(report);
  }

  /**
   * Emit to Vitest
   */
  private emitToVitest(report: TestErrorReport): void {
    if (typeof global !== 'undefined' && (global as any).__VITEST__) {
      // Store in global for Vitest to pick up
      if (!(global as any).__ERROR_REPORTS__) {
        (global as any).__ERROR_REPORTS__ = [];
      }
      (global as any).__ERROR_REPORTS__.push(report);
    }
  }

  /**
   * Emit to Jest
   */
  private emitToJest(report: TestErrorReport): void {
    if (typeof global !== 'undefined' && (global as any).jest) {
      // Jest-specific emission
      if ((global as any).jasmine?.currentSpec) {
        (global as any).jasmine.currentSpec.errorReport = report;
      }
    }
  }

  /**
   * Emit to Playwright
   */
  private emitToPlaywright(report: TestErrorReport): void {
    if (typeof window !== 'undefined' && (window as any).playwright) {
      // Playwright-specific emission
      (window as any).playwright.errorReport = report;
    }
  }

  /**
   * Get all error reports for current test run
   */
  getAllErrorReports(): TestErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  /**
   * Get error report by ID
   */
  getErrorReport(id: string): TestErrorReport | undefined {
    return this.errorReports.get(id);
  }

  /**
   * Clear all error reports
   */
  clearErrorReports(): void {
    this.errorReports.clear();
  }

  /**
   * Export error reports for test output
   */
  exportErrorReports(): string {
    const reports = this.getAllErrorReports();
    return JSON.stringify(reports, null, 2);
  }

  /**
   * Enable or disable debugging information collection
   */
  setDebuggingEnabled(enabled: boolean): void {
    this.debuggingEnabled = enabled;
  }
}

// Global instance for easy access
export const testErrorContextCollector = TestErrorContextCollector.getInstance();

// Initialize if in test environment
if (isTestEnvironment()) {
  testErrorContextCollector.initialize({
    framework: 'vitest',
    startTime: new Date().toISOString(),
  });
}