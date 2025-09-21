/**
 * Tests for Testing Framework Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorInfo } from 'react';
import { 
  ErrorBoundaryTestIntegration,
  errorBoundaryTestIntegration 
} from '../testingFrameworkIntegration';

// Mock dependencies
const mockTestErrorContextCollector = {
  collectErrorContext: vi.fn(),
  createTestErrorReport: vi.fn(),
  getAllErrorReports: vi.fn(() => []),
  clearErrorReports: vi.fn(),
};

describe('Testing Framework Integration', () => {
  let integration: ErrorBoundaryTestIntegration;
  let mockError: Error;
  let mockErrorInfo: ErrorInfo;

  beforeEach(() => {
    integration = ErrorBoundaryTestIntegration.getInstance();
    
    mockError = new Error('Test integration error');
    mockError.name = 'IntegrationTestError';
    mockError.stack = 'IntegrationTestError: Test integration error\n    at TestComponent.render';

    mockErrorInfo = {
      componentStack: '\n    in TestComponent\n    in ErrorBoundary',
    };

    // Mock global objects
    Object.defineProperty(global, '__VITEST__', {
      value: {
        ctx: {
          current: {
            name: 'integration test',
            file: { name: 'integration.test.ts' },
          },
          afterEach: vi.fn(),
        },
      },
      writable: true,
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('ErrorBoundaryTestIntegration', () => {
    it('should be a singleton', () => {
      const instance1 = ErrorBoundaryTestIntegration.getInstance();
      const instance2 = ErrorBoundaryTestIntegration.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default configuration', () => {
      integration.initialize();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Error Boundary Test Integration initialized for vitest')
      );
    });

    it('should not initialize outside test environment', () => {
      const mockIsTestEnv = vi.fn(() => false);
      vi.doMock('../errorContextPreservation', () => ({
        isTestEnvironment: mockIsTestEnv,
      }));

      const newIntegration = new ErrorBoundaryTestIntegration();
      newIntegration.initialize();

      // Should not log initialization message
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Error Boundary Test Integration initialized')
      );
    });

    describe('processErrorForTesting', () => {
      it('should process error and create test report', () => {
        const { testErrorContextCollector } = require('../errorContextPreservation');
        
        const mockContext = {
          errorId: 'test_error_123',
          component: 'TestComponent',
          testName: 'integration test',
        };
        
        const mockReport = {
          id: 'test_error_123',
          context: mockContext,
          error: mockError,
        };

        testErrorContextCollector.collectErrorContext.mockReturnValue(mockContext);
        testErrorContextCollector.createTestErrorReport.mockReturnValue(mockReport);

        const result = integration.processErrorForTesting(mockError, mockErrorInfo);

        expect(testErrorContextCollector.collectErrorContext).toHaveBeenCalledWith(
          mockError,
          mockErrorInfo,
          {}
        );
        expect(testErrorContextCollector.createTestErrorReport).toHaveBeenCalledWith(
          mockError,
          mockErrorInfo,
          mockContext
        );
        expect(result).toBe(mockReport);
      });

      it('should throw error when called outside test environment', () => {
        const mockIsTestEnv = vi.fn(() => false);
        vi.doMock('../errorContextPreservation', () => ({
          isTestEnvironment: mockIsTestEnv,
        }));

        expect(() => {
          integration.processErrorForTesting(mockError, mockErrorInfo);
        }).toThrow('processErrorForTesting should only be called in test environment');
      });

      it('should include additional context in error processing', () => {
        const { testErrorContextCollector } = require('../errorContextPreservation');
        
        const additionalContext = {
          testName: 'custom test',
          component: 'CustomComponent',
        };

        testErrorContextCollector.collectErrorContext.mockReturnValue({});
        testErrorContextCollector.createTestErrorReport.mockReturnValue({});

        integration.processErrorForTesting(mockError, mockErrorInfo, additionalContext);

        expect(testErrorContextCollector.collectErrorContext).toHaveBeenCalledWith(
          mockError,
          mockErrorInfo,
          additionalContext
        );
      });
    });

    describe('framework-specific integration', () => {
      describe('Vitest integration', () => {
        it('should setup Vitest integration', () => {
          integration.initialize();

          // Should initialize global error reports
          expect((global as any).__ERROR_BOUNDARY_REPORTS__).toBeDefined();
          expect(Array.isArray((global as any).__ERROR_BOUNDARY_REPORTS__)).toBe(true);
        });

        it('should emit to Vitest reporter', () => {
          const mockReport = {
            id: 'test_report_123',
            context: {
              testName: 'vitest test',
              component: 'TestComponent',
              errorSeverity: 'medium',
            },
            error: {
              message: 'Test error',
            },
          };

          integration.initialize();
          integration['emitToVitestReporter'](mockReport);

          expect((global as any).__ERROR_BOUNDARY_REPORTS__).toContain(mockReport);
          expect(console.error).toHaveBeenCalledWith(
            '[ERROR BOUNDARY] vitest test:',
            expect.objectContaining({
              errorId: 'test_report_123',
              component: 'TestComponent',
              message: 'Test error',
              severity: 'medium',
            })
          );
        });
      });

      describe('Jest integration', () => {
        beforeEach(() => {
          // Mock Jest environment
          (global as any).__VITEST__ = undefined;
          (global as any).jest = { version: '29.0.0' };
          (global as any).afterEach = vi.fn();
        });

        it('should setup Jest integration', () => {
          const newIntegration = new ErrorBoundaryTestIntegration({ framework: 'jest' });
          newIntegration.initialize();

          expect((global as any).__ERROR_BOUNDARY_REPORTS__).toBeDefined();
          expect((global as any).afterEach).toHaveBeenCalled();
        });

        it('should emit to Jest reporter', () => {
          const mockReport = {
            id: 'jest_report_123',
            context: { testName: 'jest test' },
            error: { message: 'Jest error' },
          };

          const newIntegration = new ErrorBoundaryTestIntegration({ framework: 'jest' });
          newIntegration.initialize();
          newIntegration['emitToJestReporter'](mockReport);

          expect((global as any).__ERROR_BOUNDARY_REPORTS__).toContain(mockReport);
        });
      });

      describe('Playwright integration', () => {
        beforeEach(() => {
          // Mock Playwright environment
          (global as any).__VITEST__ = undefined;
          Object.defineProperty(global, 'window', {
            value: {
              dispatchEvent: vi.fn(),
            },
            writable: true,
          });
        });

        it('should setup Playwright integration', () => {
          const newIntegration = new ErrorBoundaryTestIntegration({ framework: 'playwright' });
          newIntegration.initialize();

          expect((global as any).window.getErrorBoundaryReports).toBeDefined();
          expect(typeof (global as any).window.getErrorBoundaryReports).toBe('function');
        });

        it('should emit to Playwright reporter', () => {
          const mockReport = {
            id: 'playwright_report_123',
            context: { testName: 'playwright test' },
            error: { message: 'Playwright error' },
          };

          const newIntegration = new ErrorBoundaryTestIntegration({ framework: 'playwright' });
          newIntegration.initialize();
          newIntegration['emitToPlaywrightReporter'](mockReport);

          expect((global as any).window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error-boundary-report',
              detail: mockReport,
            })
          );
        });
      });

      describe('Cypress integration', () => {
        beforeEach(() => {
          // Mock Cypress environment
          (global as any).__VITEST__ = undefined;
          Object.defineProperty(global, 'window', {
            value: {
              Cypress: {
                Commands: {
                  add: vi.fn(),
                },
                log: vi.fn(),
              },
            },
            writable: true,
          });
        });

        it('should setup Cypress integration', () => {
          const newIntegration = new ErrorBoundaryTestIntegration({ framework: 'cypress' });
          newIntegration.initialize();

          expect((global as any).window.Cypress.Commands.add).toHaveBeenCalledWith(
            'getErrorBoundaryReports',
            expect.any(Function)
          );
          expect((global as any).window.Cypress.Commands.add).toHaveBeenCalledWith(
            'clearErrorBoundaryReports',
            expect.any(Function)
          );
        });

        it('should emit to Cypress reporter', () => {
          const mockReport = {
            id: 'cypress_report_123',
            context: { component: 'CypressComponent' },
            error: { message: 'Cypress error' },
          };

          const newIntegration = new ErrorBoundaryTestIntegration({ framework: 'cypress' });
          newIntegration.initialize();
          newIntegration['emitToCypressReporter'](mockReport);

          expect((global as any).window.Cypress.log).toHaveBeenCalledWith({
            name: 'error-boundary',
            message: 'Error in CypressComponent',
            consoleProps: expect.any(Function),
          });
        });
      });
    });

    describe('error assertions', () => {
      it('should assert no error boundary errors', () => {
        const { testErrorContextCollector } = require('../errorContextPreservation');
        testErrorContextCollector.getAllErrorReports.mockReturnValue([]);

        expect(() => {
          integration.assertNoErrorBoundaryErrors();
        }).not.toThrow();
      });

      it('should throw when errors exist', () => {
        const { testErrorContextCollector } = require('../errorContextPreservation');
        testErrorContextCollector.getAllErrorReports.mockReturnValue([
          {
            context: { component: 'TestComponent' },
            error: { message: 'Test error' },
          },
        ]);

        expect(() => {
          integration.assertNoErrorBoundaryErrors();
        }).toThrow('Expected no error boundary errors, but found 1');
      });

      it('should assert specific error occurred', () => {
        const { testErrorContextCollector } = require('../errorContextPreservation');
        const mockReport = {
          context: { component: 'TestComponent' },
          error: { message: 'Expected error', name: 'TestError' },
        };
        testErrorContextCollector.getAllErrorReports.mockReturnValue([mockReport]);

        const result = integration.assertErrorOccurred({
          component: 'TestComponent',
          message: 'Expected error',
          type: 'TestError',
        });

        expect(result).toBe(mockReport);
      });

      it('should throw when expected error not found', () => {
        const { testErrorContextCollector } = require('../errorContextPreservation');
        testErrorContextCollector.getAllErrorReports.mockReturnValue([
          {
            context: { component: 'OtherComponent' },
            error: { message: 'Different error', name: 'OtherError' },
          },
        ]);

        expect(() => {
          integration.assertErrorOccurred({
            component: 'TestComponent',
            message: 'Expected error',
          });
        }).toThrow('Expected error not found');
      });
    });

    describe('interceptors', () => {
      it('should start console interceptor when configured', () => {
        const newIntegration = new ErrorBoundaryTestIntegration({
          captureConsole: true,
        });
        
        newIntegration.initialize();
        
        // Console interceptor should be active
        expect(newIntegration['consoleInterceptor']).toBeDefined();
      });

      it('should start network interceptor when configured', () => {
        const newIntegration = new ErrorBoundaryTestIntegration({
          captureNetwork: true,
        });
        
        newIntegration.initialize();
        
        // Network interceptor should be active
        expect(newIntegration['networkInterceptor']).toBeDefined();
      });

      it('should not start interceptors when disabled', () => {
        const newIntegration = new ErrorBoundaryTestIntegration({
          captureConsole: false,
          captureNetwork: false,
        });
        
        newIntegration.initialize();
        
        expect(newIntegration['consoleInterceptor']).toBeNull();
        expect(newIntegration['networkInterceptor']).toBeNull();
      });
    });

    describe('global error handlers', () => {
      it('should setup unhandled rejection handler', () => {
        const mockAddEventListener = vi.fn();
        Object.defineProperty(global, 'window', {
          value: {
            addEventListener: mockAddEventListener,
          },
          writable: true,
        });

        integration.initialize();

        expect(mockAddEventListener).toHaveBeenCalledWith(
          'unhandledrejection',
          expect.any(Function)
        );
        expect(mockAddEventListener).toHaveBeenCalledWith(
          'error',
          expect.any(Function)
        );
      });

      it('should handle unhandled errors', () => {
        const mockProcessError = vi.spyOn(integration, 'processErrorForTesting');
        mockProcessError.mockImplementation(() => ({} as any));

        const unhandledError = new Error('Unhandled error');
        integration['handleUnhandledError'](unhandledError, 'test-source');

        expect(console.error).toHaveBeenCalledWith(
          'Unhandled error from test-source:',
          unhandledError
        );
      });
    });

    describe('cleanup', () => {
      it('should cleanup after test', () => {
        const newIntegration = new ErrorBoundaryTestIntegration({
          captureConsole: true,
          captureNetwork: true,
        });
        
        newIntegration.initialize();
        
        const consoleClearSpy = vi.spyOn(newIntegration['consoleInterceptor']!, 'clear');
        const networkClearSpy = vi.spyOn(newIntegration['networkInterceptor']!, 'clear');
        
        newIntegration['cleanupAfterTest']();
        
        expect(consoleClearSpy).toHaveBeenCalled();
        expect(networkClearSpy).toHaveBeenCalled();
      });

      it('should destroy integration properly', () => {
        const newIntegration = new ErrorBoundaryTestIntegration({
          captureConsole: true,
          captureNetwork: true,
        });
        
        newIntegration.initialize();
        
        const consoleStopSpy = vi.spyOn(newIntegration['consoleInterceptor']!, 'stop');
        const networkStopSpy = vi.spyOn(newIntegration['networkInterceptor']!, 'stop');
        
        newIntegration.destroy();
        
        expect(consoleStopSpy).toHaveBeenCalled();
        expect(networkStopSpy).toHaveBeenCalled();
        expect(newIntegration['isInitialized']).toBe(false);
      });
    });
  });

  describe('global integration instance', () => {
    it('should auto-initialize in test environment', () => {
      expect(errorBoundaryTestIntegration).toBeInstanceOf(ErrorBoundaryTestIntegration);
    });
  });
});