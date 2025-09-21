/**
 * Verification Tests for Error Context Preservation
 * 
 * Simple tests to verify the basic functionality works correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorInfo } from 'react';

describe('Error Context Preservation - Verification', () => {
  let mockError: Error;
  let mockErrorInfo: ErrorInfo;

  beforeEach(() => {
    mockError = new Error('Verification test error');
    mockError.name = 'VerificationError';
    mockError.stack = 'VerificationError: Verification test error\n    at TestComponent.render';

    mockErrorInfo = {
      componentStack: '\n    in TestComponent\n    in ErrorBoundary',
    };

    // Mock console to reduce noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should import modules without errors', async () => {
      const { isTestEnvironment } = await import('../errorContextPreservation');
      const { ErrorBoundaryTestIntegration } = await import('../testingFrameworkIntegration');
      const { ErrorDebuggingUtils } = await import('../errorDebuggingUtils');

      expect(typeof isTestEnvironment).toBe('function');
      expect(typeof ErrorBoundaryTestIntegration).toBe('function');
      expect(typeof ErrorDebuggingUtils).toBe('function');
    });

    it('should detect test environment', async () => {
      const { isTestEnvironment } = await import('../errorContextPreservation');
      
      // Should return a boolean
      const result = isTestEnvironment();
      expect(typeof result).toBe('boolean');
    });

    it('should create error context collector instance', async () => {
      const { TestErrorContextCollector } = await import('../errorContextPreservation');
      
      const collector = TestErrorContextCollector.getInstance();
      expect(collector).toBeDefined();
      expect(typeof collector.collectErrorContext).toBe('function');
      expect(typeof collector.createTestErrorReport).toBe('function');
    });

    it('should create test integration instance', async () => {
      const { ErrorBoundaryTestIntegration } = await import('../testingFrameworkIntegration');
      
      const integration = ErrorBoundaryTestIntegration.getInstance();
      expect(integration).toBeDefined();
      expect(typeof integration.initialize).toBe('function');
    });

    it('should create debugging utils instance', async () => {
      const { ErrorDebuggingUtils } = await import('../errorDebuggingUtils');
      
      const debugUtils = ErrorDebuggingUtils.getInstance();
      expect(debugUtils).toBeDefined();
      expect(typeof debugUtils.startDebugSession).toBe('function');
      expect(typeof debugUtils.analyzeError).toBe('function');
    });

    it('should collect basic error context', async () => {
      const { TestErrorContextCollector } = await import('../errorContextPreservation');
      
      const collector = TestErrorContextCollector.getInstance();
      collector.clearErrorReports();
      
      const context = collector.collectErrorContext(mockError, mockErrorInfo);
      
      expect(context).toBeDefined();
      expect(context.errorId).toMatch(/^test_error_\d+_[a-z0-9]+$/);
      expect(context.timestamp).toBeDefined();
      expect(context.component).toBe('TestComponent');
      expect(context.stackTrace).toBe(mockError.stack);
      expect(context.componentStack).toBe(mockErrorInfo.componentStack);
    });

    it('should create test error report', async () => {
      const { TestErrorContextCollector } = await import('../errorContextPreservation');
      
      const collector = TestErrorContextCollector.getInstance();
      collector.clearErrorReports();
      
      const context = collector.collectErrorContext(mockError, mockErrorInfo);
      const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);
      
      expect(report).toBeDefined();
      expect(report.id).toBe(context.errorId);
      expect(report.error.name).toBe('VerificationError');
      expect(report.error.message).toBe('Verification test error');
      expect(report.context).toBe(context);
      expect(report.capturedAt).toBeDefined();
    });

    it('should analyze errors for debugging', async () => {
      const { ErrorDebuggingUtils } = await import('../errorDebuggingUtils');
      const { TestErrorContextCollector } = await import('../errorContextPreservation');
      
      const collector = TestErrorContextCollector.getInstance();
      const debugUtils = ErrorDebuggingUtils.getInstance();
      
      collector.clearErrorReports();
      debugUtils.clearSessions();
      
      const context = collector.collectErrorContext(mockError, mockErrorInfo);
      const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);
      
      const analysis = debugUtils.analyzeError(report);
      
      expect(analysis).toBeDefined();
      expect(analysis.errorId).toBe(report.id);
      expect(analysis.category).toBeDefined();
      expect(analysis.rootCause).toBeDefined();
      expect(Array.isArray(analysis.suggestions)).toBe(true);
      expect(Array.isArray(analysis.debuggingSteps)).toBe(true);
    });

    it('should manage debug sessions', async () => {
      const { ErrorDebuggingUtils } = await import('../errorDebuggingUtils');
      
      const debugUtils = ErrorDebuggingUtils.getInstance();
      debugUtils.clearSessions();
      
      const sessionId = debugUtils.startDebugSession('verification test');
      expect(sessionId).toMatch(/^debug_\d+_[a-z0-9]+$/);
      
      const sessions = debugUtils.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe(sessionId);
      
      debugUtils.endDebugSession('Test completed');
      expect(sessions[0].resolution).toBe('Test completed');
    });

    it('should generate debugging reports', async () => {
      const { ErrorDebuggingUtils, TestDebuggingHelpers } = await import('../errorDebuggingUtils');
      
      const debugUtils = ErrorDebuggingUtils.getInstance();
      debugUtils.clearSessions();
      
      const wrapper = TestDebuggingHelpers.createDebugErrorBoundary('verification test');
      expect(wrapper.sessionId).toBeDefined();
      expect(typeof wrapper.onError).toBe('function');
      expect(typeof wrapper.getReport).toBe('function');
      
      const report = wrapper.getReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('# Error Debugging Report');
    });
  });

  describe('error categorization', () => {
    it('should categorize syntax errors as critical', async () => {
      const { ErrorDebuggingUtils } = await import('../errorDebuggingUtils');
      const { TestErrorContextCollector } = await import('../errorContextPreservation');
      
      const syntaxError = new Error('Unexpected token in JSON');
      syntaxError.name = 'SyntaxError';
      
      const collector = TestErrorContextCollector.getInstance();
      const debugUtils = ErrorDebuggingUtils.getInstance();
      
      const context = collector.collectErrorContext(syntaxError, mockErrorInfo);
      const report = collector.createTestErrorReport(syntaxError, mockErrorInfo, context);
      const analysis = debugUtils.analyzeError(report);
      
      expect(analysis.category).toBe('critical');
      expect(analysis.testImpact).toBe('blocking');
    });

    it('should categorize network errors as flaky', async () => {
      const { ErrorDebuggingUtils } = await import('../errorDebuggingUtils');
      const { TestErrorContextCollector } = await import('../errorContextPreservation');
      
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      const collector = TestErrorContextCollector.getInstance();
      const debugUtils = ErrorDebuggingUtils.getInstance();
      
      const context = collector.collectErrorContext(networkError, mockErrorInfo);
      const report = collector.createTestErrorReport(networkError, mockErrorInfo, context);
      const analysis = debugUtils.analyzeError(report);
      
      expect(analysis.category).toBe('flaky');
      expect(analysis.testImpact).toBe('warning');
    });
  });

  describe('integration points', () => {
    it('should work with enhanced error boundary', async () => {
      // Import the enhanced error boundary
      const { ErrorBoundary } = await import('../../components/error/ErrorBoundary');
      
      expect(ErrorBoundary).toBeDefined();
      expect(typeof ErrorBoundary).toBe('function');
      
      // Verify it has the enhanced methods for testing
      const instance = new ErrorBoundary({});
      expect(typeof instance.getTestErrorInfo).toBe('function');
      expect(typeof instance.resetErrorBoundaryForTest).toBe('function');
    });

    it('should export debugging utilities', async () => {
      const { TestDebuggingHelpers } = await import('../errorDebuggingUtils');
      
      expect(typeof TestDebuggingHelpers.createDebugErrorBoundary).toBe('function');
      expect(typeof TestDebuggingHelpers.assertErrorWithDebugging).toBe('function');
      expect(typeof TestDebuggingHelpers.debugErrorBoundaryState).toBe('function');
    });
  });
});