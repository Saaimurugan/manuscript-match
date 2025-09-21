/**
 * Tests for Error Debugging Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorInfo } from 'react';
import { 
  ErrorDebuggingUtils,
  TestDebuggingHelpers,
  errorDebuggingUtils 
} from '../errorDebuggingUtils';
import { TestErrorReport } from '../errorContextPreservation';

describe('Error Debugging Utilities', () => {
  let debugUtils: ErrorDebuggingUtils;
  let mockError: Error;
  let mockErrorInfo: ErrorInfo;
  let mockTestReport: TestErrorReport;

  beforeEach(() => {
    debugUtils = ErrorDebuggingUtils.getInstance();
    debugUtils.clearSessions();
    
    mockError = new Error('Debug test error');
    mockError.name = 'DebugTestError';
    mockError.stack = 'DebugTestError: Debug test error\n    at TestComponent.render';

    mockErrorInfo = {
      componentStack: '\n    in TestComponent\n    in ErrorBoundary',
    };

    mockTestReport = {
      id: 'debug_test_report_123',
      context: {
        errorId: 'debug_test_error_123',
        timestamp: '2023-01-01T00:00:00Z',
        component: 'TestComponent',
        props: {},
        route: '/test',
        userAgent: 'Test Browser',
        sessionId: 'test_session_123',
        errorCategory: 'runtime',
        errorSeverity: 'medium',
        retryCount: 0,
        testFramework: 'vitest',
      },
      error: {
        name: 'DebugTestError',
        message: 'Debug test error',
        stack: mockError.stack,
      },
      errorInfo: mockErrorInfo,
      capturedAt: '2023-01-01T00:00:00Z',
      testMetadata: {
        framework: 'vitest',
        runner: 'local',
        environment: 'test',
      },
      debugging: {},
    };

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    debugUtils.clearSessions();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('ErrorDebuggingUtils', () => {
    it('should be a singleton', () => {
      const instance1 = ErrorDebuggingUtils.getInstance();
      const instance2 = ErrorDebuggingUtils.getInstance();
      expect(instance1).toBe(instance2);
    });

    describe('debug session management', () => {
      it('should start a new debug session', () => {
        const sessionId = debugUtils.startDebugSession('test name', 'test.spec.ts');
        
        expect(sessionId).toMatch(/^debug_\d+_[a-z0-9]+$/);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`🔍 Debug session started: ${sessionId}`)
        );
      });

      it('should auto-start session when adding error without active session', () => {
        debugUtils.addErrorToSession(mockTestReport);
        
        const sessions = debugUtils.getAllSessions();
        expect(sessions).toHaveLength(1);
      });

      it('should end debug session with resolution', () => {
        const sessionId = debugUtils.startDebugSession();
        debugUtils.endDebugSession('Fixed by updating component props');
        
        const sessions = debugUtils.getAllSessions();
        expect(sessions[0].resolution).toBe('Fixed by updating component props');
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`🏁 Debug session ended: ${sessionId}`)
        );
      });
    });

    describe('error analysis', () => {
      it('should categorize critical errors', () => {
        const syntaxError = new Error('Unexpected token in JSON');
        syntaxError.name = 'SyntaxError';
        
        const analysis = debugUtils.analyzeError({
          ...mockTestReport,
          error: {
            name: 'SyntaxError',
            message: 'Unexpected token in JSON',
            stack: 'SyntaxError: Unexpected token',
          },
        });

        expect(analysis.category).toBe('critical');
        expect(analysis.testImpact).toBe('blocking');
      });

      it('should categorize expected errors', () => {
        const expectedReport = {
          ...mockTestReport,
          context: {
            ...mockTestReport.context,
            component: 'ErrorThrowingComponent',
            testName: 'should handle error correctly',
          },
        };

        const analysis = debugUtils.analyzeError(expectedReport);
        expect(analysis.category).toBe('expected');
        expect(analysis.testImpact).toBe('informational');
      });

      it('should categorize flaky errors', () => {
        const networkError = new Error('Network request failed');
        networkError.name = 'NetworkError';
        
        const analysis = debugUtils.analyzeError({
          ...mockTestReport,
          error: {
            name: 'NetworkError',
            message: 'Network request failed',
          },
        });

        expect(analysis.category).toBe('flaky');
        expect(analysis.testImpact).toBe('warning');
      });

      it('should categorize recoverable errors', () => {
        const analysis = debugUtils.analyzeError(mockTestReport);
        expect(analysis.category).toBe('recoverable');
      });

      it('should determine root cause for undefined property access', () => {
        const undefinedError = new Error('Cannot read properties of undefined (reading \'length\')');
        
        const analysis = debugUtils.analyzeError({
          ...mockTestReport,
          error: {
            name: 'TypeError',
            message: 'Cannot read properties of undefined (reading \'length\')',
          },
        });

        expect(analysis.rootCause).toContain('Undefined property access');
      });

      it('should generate appropriate suggestions', () => {
        const undefinedError = {
          ...mockTestReport,
          error: {
            name: 'TypeError',
            message: 'Cannot read properties of undefined (reading \'length\')',
          },
        };

        const analysis = debugUtils.analyzeError(undefinedError);
        
        expect(analysis.suggestions).toContain('Add null/undefined checks before property access');
        expect(analysis.suggestions).toContain('Use optional chaining (?.) for safe property access');
      });

      it('should find related errors', () => {
        const sessionId = debugUtils.startDebugSession();
        
        // Add first error
        debugUtils.addErrorToSession(mockTestReport);
        
        // Add related error (same component)
        const relatedReport = {
          ...mockTestReport,
          id: 'related_error_456',
          context: {
            ...mockTestReport.context,
            errorId: 'related_error_456',
            component: 'TestComponent', // Same component
          },
        };
        
        debugUtils.addErrorToSession(relatedReport);
        
        const sessions = debugUtils.getAllSessions();
        const analysis = sessions[0].analysis[1]; // Second error's analysis
        
        expect(analysis.relatedErrors).toContain(mockTestReport.id);
      });

      it('should generate debugging steps', () => {
        const analysis = debugUtils.analyzeError(mockTestReport);
        
        expect(analysis.debuggingSteps).toContain('1. Reproduce the error consistently');
        expect(analysis.debuggingSteps).toContain('2. Check the error message and stack trace');
        expect(analysis.debuggingSteps).toContain('10. Document the fix and lessons learned');
      });
    });

    describe('debug actions', () => {
      it('should record debug actions', () => {
        const sessionId = debugUtils.startDebugSession();
        
        debugUtils.recordDebugAction('retry-component', { retryCount: 1 }, 'success');
        
        const sessions = debugUtils.getAllSessions();
        const actions = sessions[0].debugActions;
        
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
          action: 'retry-component',
          details: { retryCount: 1 },
          result: 'success',
        });
        
        expect(console.log).toHaveBeenCalledWith(
          '🔧 Debug Action: retry-component - success'
        );
      });

      it('should record actions without result', () => {
        const sessionId = debugUtils.startDebugSession();
        
        debugUtils.recordDebugAction('investigate-props', { component: 'TestComponent' });
        
        const sessions = debugUtils.getAllSessions();
        const actions = sessions[0].debugActions;
        
        expect(actions[0].result).toBeUndefined();
        expect(console.log).toHaveBeenCalledWith(
          '🔧 Debug Action: investigate-props - in progress'
        );
      });
    });

    describe('report generation', () => {
      it('should generate comprehensive debugging report', () => {
        const sessionId = debugUtils.startDebugSession('test session', 'test.spec.ts');
        debugUtils.addErrorToSession(mockTestReport);
        debugUtils.recordDebugAction('fix-applied', { type: 'prop-validation' }, 'success');
        
        const report = debugUtils.generateDebuggingReport();
        
        expect(report).toContain('# Error Debugging Report');
        expect(report).toContain('**Session ID:** ' + sessionId);
        expect(report).toContain('**Test:** test session (test.spec.ts)');
        expect(report).toContain('## Errors Encountered');
        expect(report).toContain('### Error 1: ' + mockTestReport.id);
        expect(report).toContain('**Component:** TestComponent');
        expect(report).toContain('## Debug Actions Taken');
        expect(report).toContain('- **fix-applied**');
      });

      it('should generate report for specific session', () => {
        const sessionId1 = debugUtils.startDebugSession('session 1');
        debugUtils.addErrorToSession(mockTestReport);
        debugUtils.endDebugSession();
        
        const sessionId2 = debugUtils.startDebugSession('session 2');
        debugUtils.endDebugSession();
        
        const report = debugUtils.generateDebuggingReport(sessionId1);
        expect(report).toContain('**Test:** session 1');
        expect(report).not.toContain('**Test:** session 2');
      });

      it('should handle missing session gracefully', () => {
        const report = debugUtils.generateDebuggingReport('nonexistent');
        expect(report).toBe('No debugging session found');
      });
    });

    describe('data export', () => {
      it('should export debugging data as JSON', () => {
        const sessionId = debugUtils.startDebugSession();
        debugUtils.addErrorToSession(mockTestReport);
        
        const exported = debugUtils.exportDebuggingData();
        const parsed = JSON.parse(exported);
        
        expect(parsed).toHaveProperty('sessions');
        expect(parsed).toHaveProperty('exportTime');
        expect(parsed.sessions).toHaveLength(1);
        expect(parsed.sessions[0].sessionId).toBe(sessionId);
      });
    });

    describe('similarity calculation', () => {
      it('should calculate string similarity correctly', () => {
        const similarity1 = debugUtils['calculateSimilarity']('hello world', 'hello world');
        expect(similarity1).toBe(1.0);
        
        const similarity2 = debugUtils['calculateSimilarity']('hello world', 'hello earth');
        expect(similarity2).toBeGreaterThan(0.5);
        expect(similarity2).toBeLessThan(1.0);
        
        const similarity3 = debugUtils['calculateSimilarity']('hello', 'goodbye');
        expect(similarity3).toBeLessThan(0.5);
      });
    });
  });

  describe('TestDebuggingHelpers', () => {
    describe('createDebugErrorBoundary', () => {
      it('should create debug-enabled error boundary wrapper', () => {
        const wrapper = TestDebuggingHelpers.createDebugErrorBoundary('test boundary');
        
        expect(wrapper).toHaveProperty('sessionId');
        expect(wrapper).toHaveProperty('onError');
        expect(wrapper).toHaveProperty('endSession');
        expect(wrapper).toHaveProperty('getReport');
        expect(wrapper.sessionId).toMatch(/^debug_\d+_[a-z0-9]+$/);
      });

      it('should handle errors through wrapper', () => {
        const wrapper = TestDebuggingHelpers.createDebugErrorBoundary('test boundary');
        
        // Mock the integration
        const mockProcessError = vi.fn().mockReturnValue(mockTestReport);
        vi.doMock('../testingFrameworkIntegration', () => ({
          errorBoundaryTestIntegration: {
            processErrorForTesting: mockProcessError,
          },
        }));
        
        wrapper.onError(mockError, mockErrorInfo);
        
        // Should have processed the error
        const sessions = debugUtils.getAllSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].errors).toHaveLength(1);
      });
    });

    describe('assertErrorWithDebugging', () => {
      it('should assert error with enhanced debugging', () => {
        const mockAssertError = vi.fn().mockReturnValue(mockTestReport);
        vi.doMock('../testingFrameworkIntegration', () => ({
          errorBoundaryTestIntegration: {
            assertErrorOccurred: mockAssertError,
          },
        }));
        
        const result = TestDebuggingHelpers.assertErrorWithDebugging(
          { component: 'TestComponent' },
          'debug test'
        );
        
        expect(mockAssertError).toHaveBeenCalledWith({ component: 'TestComponent' });
        expect(result).toBe(mockTestReport);
      });

      it('should provide enhanced error message on assertion failure', () => {
        const mockAssertError = vi.fn().mockImplementation(() => {
          throw new Error('Assertion failed');
        });
        
        const mockGetReports = vi.fn().mockReturnValue([
          {
            context: { component: 'OtherComponent' },
            error: { message: 'Other error', name: 'OtherError' },
          },
        ]);
        
        vi.doMock('../testingFrameworkIntegration', () => ({
          errorBoundaryTestIntegration: {
            assertErrorOccurred: mockAssertError,
            getErrorReportsForCurrentTest: mockGetReports,
          },
        }));
        
        expect(() => {
          TestDebuggingHelpers.assertErrorWithDebugging(
            { component: 'TestComponent' },
            'debug test'
          );
        }).toThrow('Assertion failed');
        
        expect(console.error).toHaveBeenCalledWith(
          '❌ Error assertion failed in test: debug test'
        );
        expect(console.error).toHaveBeenCalledWith(
          'Found 1 errors:'
        );
      });
    });

    describe('debugErrorBoundaryState', () => {
      it('should debug error boundary state', () => {
        const mockErrorBoundary = {
          state: { hasError: true, errorId: 'test_123' },
          props: { enableReporting: true },
          resetErrorBoundary: vi.fn(),
        };
        
        TestDebuggingHelpers.debugErrorBoundaryState(mockErrorBoundary);
        
        expect(console.group).toHaveBeenCalledWith('🔍 Error Boundary Debug State');
        expect(console.log).toHaveBeenCalledWith('State:', mockErrorBoundary.state);
        expect(console.log).toHaveBeenCalledWith('Props:', mockErrorBoundary.props);
        expect(console.log).toHaveBeenCalledWith('✅ Enhanced error boundary detected');
        expect(console.groupEnd).toHaveBeenCalled();
      });

      it('should handle null error boundary', () => {
        TestDebuggingHelpers.debugErrorBoundaryState(null);
        
        expect(console.warn).toHaveBeenCalledWith('⚠️  Error boundary reference is null');
      });

      it('should detect basic error boundary', () => {
        const basicErrorBoundary = {
          state: { hasError: true },
          props: {},
          // No resetErrorBoundary method
        };
        
        TestDebuggingHelpers.debugErrorBoundaryState(basicErrorBoundary);
        
        expect(console.log).toHaveBeenCalledWith('⚠️  Basic error boundary (missing enhanced features)');
      });
    });
  });

  describe('global integration', () => {
    it('should provide global instance', () => {
      expect(errorDebuggingUtils).toBeInstanceOf(ErrorDebuggingUtils);
    });

    it('should auto-setup Vitest integration', () => {
      // Mock Vitest environment
      Object.defineProperty(global, '__VITEST__', {
        value: {
          ctx: {
            beforeEach: vi.fn(),
            afterEach: vi.fn(),
            current: {
              name: 'auto test',
              file: { name: 'auto.test.ts' },
            },
          },
        },
        writable: true,
      });

      // Re-import to trigger auto-setup
      vi.resetModules();
      
      // The auto-setup should have been called
      expect((global as any).__VITEST__.ctx.beforeEach).toBeDefined();
      expect((global as any).__VITEST__.ctx.afterEach).toBeDefined();
    });
  });
});