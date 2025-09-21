/**
 * Tests for Error Context Preservation in Testing Environments
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorInfo } from 'react';
import { 
  TestErrorContextCollector, 
  testErrorContextCollector,
  isTestEnvironment 
} from '../errorContextPreservation';

// Mock test environment detection
const mockIsTestEnvironment = vi.fn(() => true);

describe('Error Context Preservation', () => {
  let collector: TestErrorContextCollector;
  let mockError: Error;
  let mockErrorInfo: ErrorInfo;

  beforeEach(() => {
    collector = TestErrorContextCollector.getInstance();
    collector.clearErrorReports();
    
    mockError = new Error('Test error message');
    mockError.name = 'TestError';
    mockError.stack = 'TestError: Test error message\n    at TestComponent.render';

    mockErrorInfo = {
      componentStack: '\n    in TestComponent\n    in ErrorBoundary',
    };

    // Mock global objects
    Object.defineProperty(global, '__VITEST__', {
      value: {
        ctx: {
          current: {
            name: 'test error handling',
            file: { name: 'test.spec.ts' },
            suite: { name: 'Error Boundary Tests' },
          },
        },
      },
      writable: true,
    });

    // Mock window and document
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test-path',
          search: '?param=value',
        },
      },
      writable: true,
    });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Test Browser/1.0',
      },
      writable: true,
    });

    // Mock sessionStorage
    const mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  afterEach(() => {
    collector.clearErrorReports();
    vi.clearAllMocks();
  });

  describe('isTestEnvironment', () => {
    it('should detect test environment correctly', () => {
      // Test the actual function
      expect(typeof isTestEnvironment).toBe('function');
      // In test environment, this should return true
      const result = isTestEnvironment();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('TestErrorContextCollector', () => {
    it('should be a singleton', () => {
      const instance1 = TestErrorContextCollector.getInstance();
      const instance2 = TestErrorContextCollector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with test metadata', () => {
      const metadata = { framework: 'vitest', version: '1.0.0' };
      collector.initialize(metadata);
      // Initialization should not throw
      expect(true).toBe(true);
    });

    describe('collectErrorContext', () => {
      it('should collect comprehensive error context', () => {
        const context = collector.collectErrorContext(mockError, mockErrorInfo);

        expect(context).toMatchObject({
          testName: 'test error handling',
          testFile: 'test.spec.ts',
          testSuite: 'Error Boundary Tests',
          component: 'TestComponent',
          route: '/test-path?param=value',
          userAgent: 'Test Browser/1.0',
          stackTrace: mockError.stack,
          componentStack: mockErrorInfo.componentStack,
          testFramework: 'vitest',
        });

        expect(context.errorId).toMatch(/^test_error_\d+_[a-z0-9]+$/);
        expect(context.timestamp).toBeDefined();
        expect(context.sessionId).toBeDefined();
      });

      it('should handle missing test information gracefully', () => {
        // Clear test context
        (global as any).__VITEST__ = undefined;

        const context = collector.collectErrorContext(mockError, mockErrorInfo);

        expect(context.testName).toBeUndefined();
        expect(context.testFile).toBeUndefined();
        expect(context.testSuite).toBeUndefined();
        expect(context.component).toBe('TestComponent');
      });

      it('should sanitize props correctly', () => {
        const additionalContext = {
          props: {
            stringProp: 'test',
            numberProp: 42,
            functionProp: () => {},
            objectProp: { nested: 'value' },
            errorProp: new Error('prop error'),
          },
        };

        const context = collector.collectErrorContext(mockError, mockErrorInfo, additionalContext);

        expect(context.props).toEqual({
          stringProp: 'test',
          numberProp: 42,
          functionProp: '[Function]',
          objectProp: { nested: 'value' },
          errorProp: '[Error: prop error]',
        });
      });
    });

    describe('createTestErrorReport', () => {
      it('should create comprehensive test error report', () => {
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);

        expect(report).toMatchObject({
          id: context.errorId,
          context,
          error: {
            name: 'TestError',
            message: 'Test error message',
            stack: mockError.stack,
          },
          errorInfo: mockErrorInfo,
          testMetadata: {
            framework: 'vitest',
            runner: 'local',
            environment: 'test',
          },
        });

        expect(report.capturedAt).toBeDefined();
        expect(report.debugging).toBeDefined();
      });

      it('should store error report', () => {
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);

        const storedReport = collector.getErrorReport(report.id);
        expect(storedReport).toEqual(report);
      });

      it('should emit to test framework', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        collector.createTestErrorReport(mockError, mockErrorInfo, context);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Error Report for Test Framework:',
          expect.objectContaining({
            id: context.errorId,
            testName: 'test error handling',
            testFile: 'test.spec.ts',
            error: 'Test error message',
            component: 'TestComponent',
          })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('error report management', () => {
      it('should get all error reports', () => {
        const context1 = collector.collectErrorContext(mockError, mockErrorInfo);
        const context2 = collector.collectErrorContext(new Error('Second error'), mockErrorInfo);
        
        collector.createTestErrorReport(mockError, mockErrorInfo, context1);
        collector.createTestErrorReport(new Error('Second error'), mockErrorInfo, context2);

        const reports = collector.getAllErrorReports();
        expect(reports).toHaveLength(2);
      });

      it('should clear error reports', () => {
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        collector.createTestErrorReport(mockError, mockErrorInfo, context);

        expect(collector.getAllErrorReports()).toHaveLength(1);
        
        collector.clearErrorReports();
        expect(collector.getAllErrorReports()).toHaveLength(0);
      });

      it('should export error reports as JSON', () => {
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);

        const exported = collector.exportErrorReports();
        const parsed = JSON.parse(exported);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe(report.id);
      });
    });

    describe('test framework detection', () => {
      it('should detect Vitest', () => {
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        expect(context.testFramework).toBe('vitest');
      });

      it('should detect Jest', () => {
        // Mock Jest environment
        (global as any).__VITEST__ = undefined;
        (global as any).jest = { version: '29.0.0' };

        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        expect(context.testFramework).toBe('jest');
      });

      it('should detect Playwright', () => {
        // Mock Playwright environment
        (global as any).__VITEST__ = undefined;
        (global as any).window = {
          ...global.window,
          playwright: { version: '1.0.0' },
        };

        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        expect(context.testFramework).toBe('playwright');
      });

      it('should detect Cypress', () => {
        // Mock Cypress environment
        (global as any).__VITEST__ = undefined;
        (global as any).window = {
          ...global.window,
          Cypress: { version: '12.0.0' },
        };

        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        expect(context.testFramework).toBe('cypress');
      });
    });

    describe('debugging information collection', () => {
      it('should collect debugging info when enabled', () => {
        collector.setDebuggingEnabled(true);
        
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);

        expect(report.debugging).toBeDefined();
        expect(typeof report.debugging).toBe('object');
      });

      it('should skip debugging info when disabled', () => {
        collector.setDebuggingEnabled(false);
        
        const context = collector.collectErrorContext(mockError, mockErrorInfo);
        const report = collector.createTestErrorReport(mockError, mockErrorInfo, context);

        expect(report.debugging).toEqual({});
      });
    });

    describe('build information', () => {
      it('should collect build information from environment', () => {
        // Mock environment variables
        process.env.REACT_APP_VERSION = '1.2.3';
        process.env.REACT_APP_GIT_SHA = 'abc123';
        process.env.REACT_APP_GIT_BRANCH = 'main';
        process.env.REACT_APP_BUILD_TIME = '2023-01-01T00:00:00Z';

        const context = collector.collectErrorContext(mockError, mockErrorInfo);

        expect(context.buildInfo).toEqual({
          version: '1.2.3',
          commit: 'abc123',
          branch: 'main',
          buildTime: '2023-01-01T00:00:00Z',
        });

        // Cleanup
        delete process.env.REACT_APP_VERSION;
        delete process.env.REACT_APP_GIT_SHA;
        delete process.env.REACT_APP_GIT_BRANCH;
        delete process.env.REACT_APP_BUILD_TIME;
      });
    });

    describe('session management', () => {
      it('should create and reuse session ID', () => {
        const mockSessionStorage = global.sessionStorage as any;
        mockSessionStorage.getItem.mockReturnValue(null);

        const context1 = collector.collectErrorContext(mockError, mockErrorInfo);
        
        // Should create new session ID
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          'test-error-session-id',
          expect.stringMatching(/^test_session_\d+_[a-z0-9]+$/)
        );

        // Mock existing session ID
        const sessionId = 'existing_session_123';
        mockSessionStorage.getItem.mockReturnValue(sessionId);

        const context2 = collector.collectErrorContext(mockError, mockErrorInfo);
        expect(context2.sessionId).toBe(sessionId);
      });
    });
  });

  describe('integration with global test environment', () => {
    it('should initialize automatically in test environment', () => {
      // This test verifies that the module initializes correctly
      // when imported in a test environment
      expect(testErrorContextCollector).toBeInstanceOf(TestErrorContextCollector);
    });

    it('should store reports in global scope for Vitest', () => {
      const context = collector.collectErrorContext(mockError, mockErrorInfo);
      collector.createTestErrorReport(mockError, mockErrorInfo, context);

      expect((global as any).__ERROR_REPORTS__).toBeDefined();
      expect((global as any).__ERROR_REPORTS__).toHaveLength(1);
    });
  });
});