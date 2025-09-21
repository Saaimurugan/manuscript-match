/**
 * Error Debugging Utilities for Test Environments
 * 
 * This module provides comprehensive debugging utilities for error boundaries
 * in test environments, including error analysis, debugging helpers, and
 * test-specific error investigation tools.
 */

import { ErrorInfo } from 'react';
import { TestErrorReport, testErrorContextCollector } from './errorContextPreservation';
import { errorBoundaryTestIntegration } from './testingFrameworkIntegration';

// Error analysis types
export interface ErrorAnalysis {
  errorId: string;
  category: 'critical' | 'recoverable' | 'expected' | 'flaky';
  rootCause: string;
  suggestions: string[];
  relatedErrors: string[];
  testImpact: 'blocking' | 'warning' | 'informational';
  debuggingSteps: string[];
}

// Debug session information
export interface DebugSession {
  sessionId: string;
  startTime: string;
  testName?: string;
  testFile?: string;
  errors: TestErrorReport[];
  analysis: ErrorAnalysis[];
  debugActions: DebugAction[];
  resolution?: string;
}

// Debug action tracking
export interface DebugAction {
  action: string;
  timestamp: string;
  details: Record<string, any>;
  result?: 'success' | 'failure' | 'partial';
}

/**
 * Error Debugging Utilities
 */
export class ErrorDebuggingUtils {
  private static instance: ErrorDebuggingUtils;
  private debugSessions: Map<string, DebugSession> = new Map();
  private currentSession: DebugSession | null = null;

  static getInstance(): ErrorDebuggingUtils {
    if (!ErrorDebuggingUtils.instance) {
      ErrorDebuggingUtils.instance = new ErrorDebuggingUtils();
    }
    return ErrorDebuggingUtils.instance;
  }

  /**
   * Start a new debugging session
   */
  startDebugSession(testName?: string, testFile?: string): string {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    this.currentSession = {
      sessionId,
      startTime: new Date().toISOString(),
      testName,
      testFile,
      errors: [],
      analysis: [],
      debugActions: [],
    };

    this.debugSessions.set(sessionId, this.currentSession);
    
    console.log(`🔍 Debug session started: ${sessionId}`);
    return sessionId;
  }

  /**
   * Add error to current debug session
   */
  addErrorToSession(report: TestErrorReport): void {
    if (!this.currentSession) {
      this.startDebugSession();
    }

    this.currentSession!.errors.push(report);
    
    // Perform automatic analysis
    const analysis = this.analyzeError(report);
    this.currentSession!.analysis.push(analysis);

    console.log(`🚨 Error added to debug session: ${report.id}`);
    this.logErrorSummary(report, analysis);
  }

  /**
   * Analyze an error and provide debugging insights
   */
  analyzeError(report: TestErrorReport): ErrorAnalysis {
    const error = report.error;
    const context = report.context;

    // Categorize the error
    const category = this.categorizeError(error, context);
    
    // Determine root cause
    const rootCause = this.determineRootCause(error, context);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(error, context, category);
    
    // Find related errors
    const relatedErrors = this.findRelatedErrors(report);
    
    // Assess test impact
    const testImpact = this.assessTestImpact(error, context, category);
    
    // Generate debugging steps
    const debuggingSteps = this.generateDebuggingSteps(error, context, category);

    return {
      errorId: report.id,
      category,
      rootCause,
      suggestions,
      relatedErrors,
      testImpact,
      debuggingSteps,
    };
  }

  /**
   * Categorize error for debugging purposes
   */
  private categorizeError(error: Error, context: any): ErrorAnalysis['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors that break tests
    if (message.includes('syntax') || 
        message.includes('module not found') ||
        message.includes('cannot resolve') ||
        stack.includes('syntaxerror')) {
      return 'critical';
    }

    // Expected errors in test scenarios
    if (context.component === 'ErrorThrowingComponent' ||
        context.testName?.includes('error') ||
        message.includes('test error')) {
      return 'expected';
    }

    // Flaky errors (network, timing, etc.)
    if (message.includes('timeout') ||
        message.includes('network') ||
        message.includes('fetch failed') ||
        message.includes('connection')) {
      return 'flaky';
    }

    // Recoverable errors
    return 'recoverable';
  }

  /**
   * Determine the root cause of an error
   */
  private determineRootCause(error: Error, context: any): string {
    const message = error.message.toLowerCase();
    const stack = error.stack || '';

    // Component-specific issues
    if (message.includes('cannot read properties of undefined')) {
      return 'Undefined property access - likely missing prop or state initialization';
    }

    if (message.includes('cannot read properties of null')) {
      return 'Null reference - component or DOM element not properly initialized';
    }

    // Network issues
    if (message.includes('fetch') || message.includes('network')) {
      return 'Network connectivity or API endpoint issue';
    }

    // Syntax issues
    if (message.includes('syntax') || message.includes('unexpected token')) {
      return 'Code syntax error - check for typos or malformed code';
    }

    // Module issues
    if (message.includes('module not found') || message.includes('cannot resolve')) {
      return 'Missing dependency or incorrect import path';
    }

    // Timeout issues
    if (message.includes('timeout')) {
      return 'Operation timeout - async operation took too long';
    }

    // Test-specific issues
    if (context.testName && message.includes('expect')) {
      return 'Test assertion failure - expected behavior not met';
    }

    // Generic analysis based on stack trace
    if (stack.includes('componentDidMount')) {
      return 'Error during component mounting - check initialization logic';
    }

    if (stack.includes('render')) {
      return 'Error during component rendering - check render logic and props';
    }

    return 'Unknown root cause - requires manual investigation';
  }

  /**
   * Generate debugging suggestions
   */
  private generateSuggestions(error: Error, context: any, category: ErrorAnalysis['category']): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();

    // Category-specific suggestions
    switch (category) {
      case 'critical':
        suggestions.push('Fix syntax errors before running tests');
        suggestions.push('Check import statements and module paths');
        suggestions.push('Verify all dependencies are installed');
        break;

      case 'flaky':
        suggestions.push('Add retry logic for network operations');
        suggestions.push('Increase timeout values for async operations');
        suggestions.push('Mock network requests in tests');
        suggestions.push('Add proper error handling for network failures');
        break;

      case 'expected':
        suggestions.push('Verify error boundary is catching the error correctly');
        suggestions.push('Check that error reporting is working as expected');
        suggestions.push('Ensure error recovery mechanisms are functioning');
        break;

      case 'recoverable':
        suggestions.push('Add proper error handling and recovery logic');
        suggestions.push('Implement graceful degradation for failed operations');
        suggestions.push('Add user-friendly error messages');
        break;
    }

    // Message-specific suggestions
    if (message.includes('undefined')) {
      suggestions.push('Add null/undefined checks before property access');
      suggestions.push('Initialize state and props with default values');
      suggestions.push('Use optional chaining (?.) for safe property access');
    }

    if (message.includes('fetch')) {
      suggestions.push('Mock fetch requests in test environment');
      suggestions.push('Add proper error handling for API calls');
      suggestions.push('Check network connectivity and API endpoints');
    }

    if (message.includes('timeout')) {
      suggestions.push('Increase timeout values for slow operations');
      suggestions.push('Optimize performance of slow operations');
      suggestions.push('Add loading states for long-running operations');
    }

    // Component-specific suggestions
    if (context.component && context.component !== 'Unknown') {
      suggestions.push(`Review ${context.component} component implementation`);
      suggestions.push(`Check props passed to ${context.component}`);
      suggestions.push(`Verify ${context.component} lifecycle methods`);
    }

    return suggestions;
  }

  /**
   * Find related errors in the current session
   */
  private findRelatedErrors(report: TestErrorReport): string[] {
    if (!this.currentSession) {
      return [];
    }

    const relatedErrors: string[] = [];
    const currentError = report.error;
    const currentContext = report.context;

    this.currentSession.errors.forEach(otherReport => {
      if (otherReport.id === report.id) return;

      // Same component
      if (otherReport.context.component === currentContext.component) {
        relatedErrors.push(otherReport.id);
        return;
      }

      // Similar error message
      if (this.calculateSimilarity(currentError.message, otherReport.error.message) > 0.7) {
        relatedErrors.push(otherReport.id);
        return;
      }

      // Same error type
      if (currentError.name === otherReport.error.name) {
        relatedErrors.push(otherReport.id);
        return;
      }
    });

    return relatedErrors;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Assess the impact of an error on tests
   */
  private assessTestImpact(error: Error, context: any, category: ErrorAnalysis['category']): ErrorAnalysis['testImpact'] {
    // Critical errors block tests
    if (category === 'critical') {
      return 'blocking';
    }

    // Expected errors are informational
    if (category === 'expected') {
      return 'informational';
    }

    // Flaky errors are warnings
    if (category === 'flaky') {
      return 'warning';
    }

    // Check error severity
    if (context.errorSeverity === 'critical' || context.errorSeverity === 'high') {
      return 'blocking';
    }

    if (context.errorSeverity === 'medium') {
      return 'warning';
    }

    return 'informational';
  }

  /**
   * Generate debugging steps
   */
  private generateDebuggingSteps(error: Error, context: any, category: ErrorAnalysis['category']): string[] {
    const steps: string[] = [];

    // Common first steps
    steps.push('1. Reproduce the error consistently');
    steps.push('2. Check the error message and stack trace');
    steps.push('3. Identify the component and line where error occurred');

    // Category-specific steps
    switch (category) {
      case 'critical':
        steps.push('4. Fix syntax errors and missing imports');
        steps.push('5. Verify all dependencies are installed');
        steps.push('6. Check TypeScript compilation errors');
        break;

      case 'flaky':
        steps.push('4. Check network connectivity and API availability');
        steps.push('5. Add proper mocking for external dependencies');
        steps.push('6. Increase timeout values if needed');
        steps.push('7. Add retry logic for unreliable operations');
        break;

      case 'expected':
        steps.push('4. Verify error boundary is working correctly');
        steps.push('5. Check error reporting and recovery mechanisms');
        steps.push('6. Ensure test assertions match expected behavior');
        break;

      case 'recoverable':
        steps.push('4. Add proper error handling and validation');
        steps.push('5. Implement graceful degradation');
        steps.push('6. Add user-friendly error messages');
        break;
    }

    // Component-specific steps
    if (context.component && context.component !== 'Unknown') {
      steps.push(`7. Review ${context.component} component implementation`);
      steps.push(`8. Check props and state management in ${context.component}`);
    }

    // Final steps
    steps.push('9. Add or update tests to prevent regression');
    steps.push('10. Document the fix and lessons learned');

    return steps;
  }

  /**
   * Log error summary for debugging
   */
  private logErrorSummary(report: TestErrorReport, analysis: ErrorAnalysis): void {
    console.group(`🔍 Error Analysis: ${report.id}`);
    console.log(`📍 Component: ${report.context.component}`);
    console.log(`🏷️  Category: ${analysis.category}`);
    console.log(`🎯 Root Cause: ${analysis.rootCause}`);
    console.log(`⚠️  Test Impact: ${analysis.testImpact}`);
    
    if (analysis.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      analysis.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });
    }

    if (analysis.relatedErrors.length > 0) {
      console.log(`🔗 Related Errors: ${analysis.relatedErrors.join(', ')}`);
    }

    console.groupEnd();
  }

  /**
   * Record a debug action
   */
  recordDebugAction(action: string, details: Record<string, any> = {}, result?: 'success' | 'failure' | 'partial'): void {
    if (!this.currentSession) {
      return;
    }

    const debugAction: DebugAction = {
      action,
      timestamp: new Date().toISOString(),
      details,
      result,
    };

    this.currentSession.debugActions.push(debugAction);
    console.log(`🔧 Debug Action: ${action} - ${result || 'in progress'}`);
  }

  /**
   * Generate debugging report
   */
  generateDebuggingReport(sessionId?: string): string {
    const session = sessionId ? this.debugSessions.get(sessionId) : this.currentSession;
    
    if (!session) {
      return 'No debugging session found';
    }

    const report = [
      '# Error Debugging Report',
      `**Session ID:** ${session.sessionId}`,
      `**Start Time:** ${session.startTime}`,
      `**Test:** ${session.testName || 'Unknown'} (${session.testFile || 'Unknown file'})`,
      '',
      '## Errors Encountered',
    ];

    session.errors.forEach((error, index) => {
      const analysis = session.analysis[index];
      report.push(`### Error ${index + 1}: ${error.id}`);
      report.push(`**Component:** ${error.context.component}`);
      report.push(`**Message:** ${error.error.message}`);
      report.push(`**Category:** ${analysis?.category || 'Unknown'}`);
      report.push(`**Root Cause:** ${analysis?.rootCause || 'Unknown'}`);
      report.push(`**Test Impact:** ${analysis?.testImpact || 'Unknown'}`);
      
      if (analysis?.suggestions.length) {
        report.push('**Suggestions:**');
        analysis.suggestions.forEach(suggestion => {
          report.push(`- ${suggestion}`);
        });
      }
      
      report.push('');
    });

    if (session.debugActions.length > 0) {
      report.push('## Debug Actions Taken');
      session.debugActions.forEach(action => {
        report.push(`- **${action.action}** (${action.timestamp}) - ${action.result || 'in progress'}`);
        if (Object.keys(action.details).length > 0) {
          report.push(`  Details: ${JSON.stringify(action.details)}`);
        }
      });
      report.push('');
    }

    if (session.resolution) {
      report.push('## Resolution');
      report.push(session.resolution);
    }

    return report.join('\n');
  }

  /**
   * End current debugging session
   */
  endDebugSession(resolution?: string): void {
    if (!this.currentSession) {
      return;
    }

    if (resolution) {
      this.currentSession.resolution = resolution;
    }

    console.log(`🏁 Debug session ended: ${this.currentSession.sessionId}`);
    
    // Generate final report
    const report = this.generateDebuggingReport();
    console.log('📋 Final Debug Report:');
    console.log(report);

    this.currentSession = null;
  }

  /**
   * Get all debugging sessions
   */
  getAllSessions(): DebugSession[] {
    return Array.from(this.debugSessions.values());
  }

  /**
   * Clear all debugging sessions
   */
  clearSessions(): void {
    this.debugSessions.clear();
    this.currentSession = null;
  }

  /**
   * Export debugging data for external analysis
   */
  exportDebuggingData(): string {
    const data = {
      sessions: Array.from(this.debugSessions.values()),
      exportTime: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
}

/**
 * Test-specific debugging helpers
 */
export class TestDebuggingHelpers {
  /**
   * Create a debug-enabled error boundary wrapper
   */
  static createDebugErrorBoundary(testName: string) {
    const debugUtils = ErrorDebuggingUtils.getInstance();
    const sessionId = debugUtils.startDebugSession(testName);

    return {
      sessionId,
      onError: (error: Error, errorInfo: ErrorInfo) => {
        // Process error through test integration
        const report = errorBoundaryTestIntegration.processErrorForTesting(error, errorInfo, {
          testName,
          debugSession: sessionId,
        });

        // Add to debug session
        debugUtils.addErrorToSession(report);
      },
      endSession: (resolution?: string) => {
        debugUtils.endDebugSession(resolution);
      },
      getReport: () => {
        return debugUtils.generateDebuggingReport(sessionId);
      },
    };
  }

  /**
   * Assert error with debugging context
   */
  static assertErrorWithDebugging(
    expectedError: { component?: string; message?: string; type?: string },
    testName: string
  ): TestErrorReport {
    try {
      return errorBoundaryTestIntegration.assertErrorOccurred(expectedError);
    } catch (error) {
      // Enhanced error message with debugging info
      const debugUtils = ErrorDebuggingUtils.getInstance();
      const reports = errorBoundaryTestIntegration.getErrorReportsForCurrentTest();
      
      console.error(`❌ Error assertion failed in test: ${testName}`);
      console.error(`Expected: ${JSON.stringify(expectedError)}`);
      console.error(`Found ${reports.length} errors:`);
      
      reports.forEach((report, index) => {
        console.error(`  ${index + 1}. ${report.context.component}: ${report.error.message} (${report.error.name})`);
      });

      throw error;
    }
  }

  /**
   * Debug error boundary state
   */
  static debugErrorBoundaryState(errorBoundary: any): void {
    if (!errorBoundary) {
      console.warn('⚠️  Error boundary reference is null');
      return;
    }

    console.group('🔍 Error Boundary Debug State');
    
    if (errorBoundary.state) {
      console.log('State:', errorBoundary.state);
    }

    if (errorBoundary.props) {
      console.log('Props:', errorBoundary.props);
    }

    // Check if it's our enhanced error boundary
    if (errorBoundary.resetErrorBoundary) {
      console.log('✅ Enhanced error boundary detected');
    } else {
      console.log('⚠️  Basic error boundary (missing enhanced features)');
    }

    console.groupEnd();
  }
}

// Global instance
export const errorDebuggingUtils = ErrorDebuggingUtils.getInstance();

// Auto-start debug session in test environment
if (typeof global !== 'undefined' && (global as any).__VITEST__) {
  // Hook into Vitest test lifecycle
  const vitest = (global as any).__VITEST__;
  if (vitest?.ctx?.beforeEach) {
    vitest.ctx.beforeEach(() => {
      const testInfo = vitest.ctx.current;
      if (testInfo) {
        errorDebuggingUtils.startDebugSession(testInfo.name, testInfo.file?.name);
      }
    });

    vitest.ctx.afterEach(() => {
      errorDebuggingUtils.endDebugSession();
    });
  }
}