/**
 * Testing Framework Integration for Error Boundaries
 * 
 * This module provides integration utilities for error boundaries with various
 * testing frameworks (Vitest, Jest, Playwright, Cypress) to ensure proper
 * error context preservation and reporting.
 */

import { ErrorInfo } from 'react';
import { testErrorContextCollector, TestErrorReport, isTestEnvironment } from './errorContextPreservation';

// Test framework types
export type TestFramework = 'vitest' | 'jest' | 'playwright' | 'cypress';

// Test integration configuration
export interface TestIntegrationConfig {
  framework: TestFramework;
  captureDOM: boolean;
  captureConsole: boolean;
  captureNetwork: boolean;
  captureStorage: boolean;
  emitToReporter: boolean;
  preserveContext: boolean;
}

// Default configuration
const DEFAULT_CONFIG: TestIntegrationConfig = {
  framework: 'vitest',
  captureDOM: true,
  captureConsole: true,
  captureNetwork: false,
  captureStorage: true,
  emitToReporter: true,
  preserveContext: true,
};

/**
 * Error Boundary Testing Framework Integration
 */
export class ErrorBoundaryTestIntegration {
  private static instance: ErrorBoundaryTestIntegration;
  private config: TestIntegrationConfig;
  private isInitialized = false;
  private consoleInterceptor: ConsoleInterceptor | null = null;
  private networkInterceptor: NetworkInterceptor | null = null;

  constructor(config: Partial<TestIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<TestIntegrationConfig>): ErrorBoundaryTestIntegration {
    if (!ErrorBoundaryTestIntegration.instance) {
      ErrorBoundaryTestIntegration.instance = new ErrorBoundaryTestIntegration(config);
    }
    return ErrorBoundaryTestIntegration.instance;
  }

  /**
   * Initialize the testing integration
   */
  initialize(): void {
    if (this.isInitialized || !isTestEnvironment()) {
      return;
    }

    this.setupFrameworkIntegration();
    this.setupInterceptors();
    this.setupGlobalErrorHandlers();
    this.isInitialized = true;

    console.log(`Error Boundary Test Integration initialized for ${this.config.framework}`);
  }

  /**
   * Process error for test framework integration
   */
  processErrorForTesting(
    error: Error,
    errorInfo: ErrorInfo,
    errorBoundaryContext: Record<string, any> = {}
  ): TestErrorReport {
    if (!isTestEnvironment()) {
      throw new Error('processErrorForTesting should only be called in test environment');
    }

    // Collect comprehensive error context
    const context = testErrorContextCollector.collectErrorContext(
      error,
      errorInfo,
      errorBoundaryContext
    );

    // Create test error report
    const report = testErrorContextCollector.createTestErrorReport(error, errorInfo, context);

    // Emit to test framework
    this.emitErrorToTestFramework(report);

    // Store for test assertions
    this.storeErrorForTestAssertions(report);

    return report;
  }

  /**
   * Setup framework-specific integration
   */
  private setupFrameworkIntegration(): void {
    switch (this.config.framework) {
      case 'vitest':
        this.setupVitestIntegration();
        break;
      case 'jest':
        this.setupJestIntegration();
        break;
      case 'playwright':
        this.setupPlaywrightIntegration();
        break;
      case 'cypress':
        this.setupCypressIntegration();
        break;
    }
  }

  /**
   * Setup Vitest integration
   */
  private setupVitestIntegration(): void {
    if (typeof global === 'undefined' || !(global as any).__VITEST__) {
      return;
    }

    // Initialize global error reports array
    if (!(global as any).__ERROR_BOUNDARY_REPORTS__) {
      (global as any).__ERROR_BOUNDARY_REPORTS__ = [];
    }

    // Hook into Vitest's test lifecycle
    const vitest = (global as any).__VITEST__;
    if (vitest?.ctx) {
      // Store original afterEach
      const originalAfterEach = vitest.ctx.afterEach;
      
      // Add our cleanup
      if (originalAfterEach) {
        vitest.ctx.afterEach(() => {
          this.cleanupAfterTest();
        });
      }
    }

    console.log('Vitest integration setup complete');
  }

  /**
   * Setup Jest integration
   */
  private setupJestIntegration(): void {
    if (typeof global === 'undefined' || !(global as any).jest) {
      return;
    }

    // Initialize global error reports
    if (!(global as any).__ERROR_BOUNDARY_REPORTS__) {
      (global as any).__ERROR_BOUNDARY_REPORTS__ = [];
    }

    // Hook into Jest's lifecycle
    if ((global as any).afterEach) {
      (global as any).afterEach(() => {
        this.cleanupAfterTest();
      });
    }

    console.log('Jest integration setup complete');
  }

  /**
   * Setup Playwright integration
   */
  private setupPlaywrightIntegration(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize window-level error reports
    if (!(window as any).__ERROR_BOUNDARY_REPORTS__) {
      (window as any).__ERROR_BOUNDARY_REPORTS__ = [];
    }

    // Expose error reports to Playwright
    (window as any).getErrorBoundaryReports = () => {
      return testErrorContextCollector.getAllErrorReports();
    };

    console.log('Playwright integration setup complete');
  }

  /**
   * Setup Cypress integration
   */
  private setupCypressIntegration(): void {
    if (typeof window === 'undefined' || !(window as any).Cypress) {
      return;
    }

    // Initialize Cypress error reports
    if (!(window as any).__ERROR_BOUNDARY_REPORTS__) {
      (window as any).__ERROR_BOUNDARY_REPORTS__ = [];
    }

    // Add Cypress commands
    if ((window as any).Cypress.Commands) {
      (window as any).Cypress.Commands.add('getErrorBoundaryReports', () => {
        return testErrorContextCollector.getAllErrorReports();
      });

      (window as any).Cypress.Commands.add('clearErrorBoundaryReports', () => {
        testErrorContextCollector.clearErrorReports();
      });
    }

    console.log('Cypress integration setup complete');
  }

  /**
   * Setup interceptors for debugging information
   */
  private setupInterceptors(): void {
    if (this.config.captureConsole) {
      this.consoleInterceptor = new ConsoleInterceptor();
      this.consoleInterceptor.start();
    }

    if (this.config.captureNetwork) {
      this.networkInterceptor = new NetworkInterceptor();
      this.networkInterceptor.start();
    }
  }

  /**
   * Setup global error handlers for test environment
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleUnhandledError(event.reason, 'unhandledrejection');
      });

      // Global errors
      window.addEventListener('error', (event) => {
        this.handleUnhandledError(event.error, 'global-error');
      });
    }

    // Node.js unhandled rejections
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason) => {
        this.handleUnhandledError(reason, 'unhandled-node-rejection');
      });

      process.on('uncaughtException', (error) => {
        this.handleUnhandledError(error, 'uncaught-node-exception');
      });
    }
  }

  /**
   * Handle unhandled errors in test environment
   */
  private handleUnhandledError(error: any, source: string): void {
    console.error(`Unhandled error from ${source}:`, error);
    
    // Create a synthetic error info for unhandled errors
    const errorInfo: ErrorInfo = {
      componentStack: `\n    in UnhandledError (${source})`,
    };

    // Process as test error
    if (error instanceof Error) {
      this.processErrorForTesting(error, errorInfo, {
        source,
        unhandled: true,
      });
    }
  }

  /**
   * Emit error to test framework
   */
  private emitErrorToTestFramework(report: TestErrorReport): void {
    if (!this.config.emitToReporter) {
      return;
    }

    // Emit to framework-specific reporters
    switch (this.config.framework) {
      case 'vitest':
        this.emitToVitestReporter(report);
        break;
      case 'jest':
        this.emitToJestReporter(report);
        break;
      case 'playwright':
        this.emitToPlaywrightReporter(report);
        break;
      case 'cypress':
        this.emitToCypressReporter(report);
        break;
    }
  }

  /**
   * Emit to Vitest reporter
   */
  private emitToVitestReporter(report: TestErrorReport): void {
    if (typeof global !== 'undefined' && (global as any).__VITEST__) {
      // Add to global reports
      if (!(global as any).__ERROR_BOUNDARY_REPORTS__) {
        (global as any).__ERROR_BOUNDARY_REPORTS__ = [];
      }
      (global as any).__ERROR_BOUNDARY_REPORTS__.push(report);

      // Log for Vitest output
      console.error(`[ERROR BOUNDARY] ${report.context.testName || 'Unknown Test'}:`, {
        errorId: report.id,
        component: report.context.component,
        message: report.error.message,
        severity: report.context.errorSeverity,
      });
    }
  }

  /**
   * Emit to Jest reporter
   */
  private emitToJestReporter(report: TestErrorReport): void {
    if (typeof global !== 'undefined' && (global as any).jest) {
      // Add to global reports
      if (!(global as any).__ERROR_BOUNDARY_REPORTS__) {
        (global as any).__ERROR_BOUNDARY_REPORTS__ = [];
      }
      (global as any).__ERROR_BOUNDARY_REPORTS__.push(report);

      // Attach to current spec if available
      if ((global as any).jasmine?.currentSpec) {
        if (!(global as any).jasmine.currentSpec.errorBoundaryReports) {
          (global as any).jasmine.currentSpec.errorBoundaryReports = [];
        }
        (global as any).jasmine.currentSpec.errorBoundaryReports.push(report);
      }
    }
  }

  /**
   * Emit to Playwright reporter
   */
  private emitToPlaywrightReporter(report: TestErrorReport): void {
    if (typeof window !== 'undefined') {
      // Add to window reports
      if (!(window as any).__ERROR_BOUNDARY_REPORTS__) {
        (window as any).__ERROR_BOUNDARY_REPORTS__ = [];
      }
      (window as any).__ERROR_BOUNDARY_REPORTS__.push(report);

      // Emit custom event for Playwright to catch
      window.dispatchEvent(new CustomEvent('error-boundary-report', {
        detail: report,
      }));
    }
  }

  /**
   * Emit to Cypress reporter
   */
  private emitToCypressReporter(report: TestErrorReport): void {
    if (typeof window !== 'undefined' && (window as any).Cypress) {
      // Add to window reports
      if (!(window as any).__ERROR_BOUNDARY_REPORTS__) {
        (window as any).__ERROR_BOUNDARY_REPORTS__ = [];
      }
      (window as any).__ERROR_BOUNDARY_REPORTS__.push(report);

      // Log to Cypress
      (window as any).Cypress.log({
        name: 'error-boundary',
        message: `Error in ${report.context.component}`,
        consoleProps: () => report,
      });
    }
  }

  /**
   * Store error for test assertions
   */
  private storeErrorForTestAssertions(report: TestErrorReport): void {
    // Store in a way that test assertions can access
    if (typeof global !== 'undefined') {
      if (!(global as any).__TEST_ERROR_ASSERTIONS__) {
        (global as any).__TEST_ERROR_ASSERTIONS__ = new Map();
      }
      (global as any).__TEST_ERROR_ASSERTIONS__.set(report.id, report);
    }
  }

  /**
   * Cleanup after each test
   */
  private cleanupAfterTest(): void {
    // Clear console interceptor logs
    if (this.consoleInterceptor) {
      this.consoleInterceptor.clear();
    }

    // Clear network interceptor logs
    if (this.networkInterceptor) {
      this.networkInterceptor.clear();
    }

    // Optionally clear error reports (depending on configuration)
    if (this.config.preserveContext === false) {
      testErrorContextCollector.clearErrorReports();
    }
  }

  /**
   * Get all error reports for current test
   */
  getErrorReportsForCurrentTest(): TestErrorReport[] {
    return testErrorContextCollector.getAllErrorReports();
  }

  /**
   * Assert that no error boundary errors occurred
   */
  assertNoErrorBoundaryErrors(): void {
    const reports = this.getErrorReportsForCurrentTest();
    if (reports.length > 0) {
      const errorMessages = reports.map(r => `${r.context.component}: ${r.error.message}`);
      throw new Error(`Expected no error boundary errors, but found ${reports.length}:\n${errorMessages.join('\n')}`);
    }
  }

  /**
   * Assert that specific error occurred
   */
  assertErrorOccurred(expectedError: { component?: string; message?: string; type?: string }): TestErrorReport {
    const reports = this.getErrorReportsForCurrentTest();
    
    const matchingReport = reports.find(report => {
      if (expectedError.component && report.context.component !== expectedError.component) {
        return false;
      }
      if (expectedError.message && !report.error.message.includes(expectedError.message)) {
        return false;
      }
      if (expectedError.type && report.error.name !== expectedError.type) {
        return false;
      }
      return true;
    });

    if (!matchingReport) {
      throw new Error(`Expected error not found. Looking for: ${JSON.stringify(expectedError)}. Found: ${reports.map(r => ({ component: r.context.component, message: r.error.message, type: r.error.name })).map(e => JSON.stringify(e)).join(', ')}`);
    }

    return matchingReport;
  }

  /**
   * Cleanup and destroy the integration
   */
  destroy(): void {
    if (this.consoleInterceptor) {
      this.consoleInterceptor.stop();
      this.consoleInterceptor = null;
    }

    if (this.networkInterceptor) {
      this.networkInterceptor.stop();
      this.networkInterceptor = null;
    }

    this.isInitialized = false;
  }
}

/**
 * Console Interceptor for capturing console output
 */
class ConsoleInterceptor {
  private originalMethods: Record<string, Function> = {};
  private logs: Array<{ level: string; args: any[]; timestamp: string }> = [];
  private isActive = false;

  start(): void {
    if (this.isActive) return;

    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    
    methods.forEach(method => {
      this.originalMethods[method] = console[method as keyof Console];
      (console as any)[method] = (...args: any[]) => {
        this.logs.push({
          level: method,
          args,
          timestamp: new Date().toISOString(),
        });
        this.originalMethods[method].apply(console, args);
      };
    });

    this.isActive = true;
  }

  stop(): void {
    if (!this.isActive) return;

    Object.keys(this.originalMethods).forEach(method => {
      (console as any)[method] = this.originalMethods[method];
    });

    this.isActive = false;
  }

  getLogs(): Array<{ level: string; args: any[]; timestamp: string }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Network Interceptor for capturing network requests
 */
class NetworkInterceptor {
  private originalFetch: typeof fetch | null = null;
  private requests: Array<{ url: string; method: string; timestamp: string; response?: any }> = [];
  private isActive = false;

  start(): void {
    if (this.isActive || typeof global === 'undefined') return;

    this.originalFetch = global.fetch;
    
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      const requestLog = {
        url,
        method,
        timestamp: new Date().toISOString(),
      };

      try {
        const response = await this.originalFetch!(input, init);
        requestLog.response = {
          status: response.status,
          statusText: response.statusText,
        };
        this.requests.push(requestLog);
        return response;
      } catch (error) {
        requestLog.response = { error: error.toString() };
        this.requests.push(requestLog);
        throw error;
      }
    };

    this.isActive = true;
  }

  stop(): void {
    if (!this.isActive || !this.originalFetch) return;

    global.fetch = this.originalFetch;
    this.isActive = false;
  }

  getRequests(): Array<{ url: string; method: string; timestamp: string; response?: any }> {
    return [...this.requests];
  }

  clear(): void {
    this.requests = [];
  }
}

// Global instance
export const errorBoundaryTestIntegration = ErrorBoundaryTestIntegration.getInstance();

// Auto-initialize in test environment
if (isTestEnvironment()) {
  errorBoundaryTestIntegration.initialize();
}