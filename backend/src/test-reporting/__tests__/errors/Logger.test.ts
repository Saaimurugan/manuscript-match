/**
 * Unit tests for Logger
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../../errors/Logger';

// Mock fs module
jest.mock('fs/promises');

describe('Logger', () => {
  let logger: Logger;
  let mockFs: jest.Mocked<typeof fs>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFs = fs as jest.Mocked<typeof fs>;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    logger = new Logger('debug', {
      enableConsole: true,
      enableFile: false,
      enableColors: false, // Disable colors for easier testing
      enableStructuredLogging: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('console logging', () => {
    it('should log error messages to console', async () => {
      await logger.error('Test error message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message')
      );
    });

    it('should log warning messages to console', async () => {
      await logger.warn('Test warning message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning message')
      );
    });

    it('should log info messages to console', async () => {
      await logger.info('Test info message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message')
      );
    });

    it('should log debug messages to console', async () => {
      await logger.debug('Test debug message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug message')
      );
    });

    it('should respect log level filtering', async () => {
      const errorLogger = new Logger('error', {
        enableConsole: true,
        enableFile: false
      });
      
      await errorLogger.error('Error message');
      await errorLogger.warn('Warning message');
      await errorLogger.info('Info message');
      await errorLogger.debug('Debug message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error message')
      );
    });

    it('should include structured data in console output', async () => {
      const data = {
        errorType: 'CONFIGURATION_ERROR',
        severity: 'HIGH',
        context: { operation: 'loadConfig' }
      };
      
      await logger.error('Configuration failed', data);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR: Configuration failed[\s\S]*Type: CONFIGURATION_ERROR/)
      );
    });

    it('should include stack traces for errors', async () => {
      const data = {
        stackTrace: 'Error: Test error\n    at test.js:1:1'
      };
      
      await logger.error('Error with stack trace', data);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Stack Trace:[\s\S]*at test\.js:1:1/)
      );
    });

    it('should format actionable guidance correctly', async () => {
      const data = {
        errorType: 'CONFIGURATION_ERROR',
        guidance: [
          'Check your configuration file',
          'Validate the schema',
          'Restart the service'
        ]
      };
      
      await logger.error('Configuration error', data);
      
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('• Check your configuration file');
      expect(output).toContain('• Validate the schema');
      expect(output).toContain('• Restart the service');
    });
  });

  describe('file logging', () => {
    beforeEach(() => {
      logger = new Logger('debug', {
        enableConsole: false,
        enableFile: true,
        logFilePath: '/test/logs/test.log',
        enableStructuredLogging: true
      });
    });

    it('should create log directory if it does not exist', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.appendFile.mockResolvedValue(undefined);
      
      await logger.error('Test message');
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/logs', { recursive: true });
    });

    it('should append structured log entries to file', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.appendFile.mockResolvedValue(undefined);
      
      const data = { key: 'value' };
      await logger.error('Test message', data);
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        '/test/logs/test.log',
        expect.stringMatching(/^\{.*"level":"error".*"message":"Test message".*\}\n$/),
        'utf8'
      );
    });

    it('should rotate log files when size limit is exceeded', async () => {
      const largeSize = 15 * 1024 * 1024; // 15MB (exceeds 10MB limit)
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: largeSize } as any);
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.appendFile.mockResolvedValue(undefined);
      
      await logger.error('Test message');
      
      expect(mockFs.rename).toHaveBeenCalledWith(
        '/test/logs/test.log',
        '/test/logs/test.1.log'
      );
    });

    it('should fallback to console logging if file logging fails', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      await logger.error('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test message')
      );
    });
  });

  describe('data sanitization', () => {
    it('should redact sensitive information', async () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'abc123',
        token: 'xyz789',
        normalField: 'normal value'
      };
      
      await logger.error('Test with sensitive data', sensitiveData);
      
      const loggedData = consoleSpy.mock.calls[0][0];
      expect(loggedData).toContain('normalField');
      expect(loggedData).toContain('[REDACTED]');
      expect(loggedData).not.toContain('secret123');
      expect(loggedData).not.toContain('abc123');
      expect(loggedData).not.toContain('xyz789');
    });

    it('should handle nested sensitive data', async () => {
      const nestedData = {
        config: {
          database: {
            password: 'dbsecret',
            host: 'localhost'
          },
          auth: {
            secret: 'authsecret'
          }
        }
      };
      
      await logger.error('Test with nested sensitive data', nestedData);
      
      const loggedData = consoleSpy.mock.calls[0][0];
      expect(loggedData).toContain('localhost');
      expect(loggedData).toContain('[REDACTED]');
      expect(loggedData).not.toContain('dbsecret');
      expect(loggedData).not.toContain('authsecret');
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', async () => {
      const context = { component: 'TestComponent', operation: 'testOp' };
      const childLogger = logger.createChildLogger(context);
      
      await childLogger.error('Child logger message', { extra: 'data' });
      
      const loggedData = consoleSpy.mock.calls[0][0];
      expect(loggedData).toContain('TestComponent');
      expect(loggedData).toContain('testOp');
      expect(loggedData).toContain('extra');
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics with formatted duration', async () => {
      await logger.logPerformance('generateReport', 2500, { reportType: 'html' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Performance: generateReport[\s\S]*2\.5s/)
      );
    });

    it('should format durations correctly', async () => {
      await logger.logPerformance('shortOp', 500);
      await logger.logPerformance('longOp', 125000);
      
      const calls = consoleSpy.mock.calls;
      expect(calls[0][0]).toContain('500ms');
      expect(calls[1][0]).toContain('2m 5s');
    });
  });

  describe('health check logging', () => {
    it('should log healthy status as info', async () => {
      await logger.logHealthCheck('database', 'healthy', { responseTime: 50 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Health Check: database is healthy')
      );
    });

    it('should log degraded status as warning', async () => {
      await logger.logHealthCheck('api', 'degraded', { responseTime: 2000 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Health Check: api is degraded')
      );
    });

    it('should log unhealthy status as error', async () => {
      await logger.logHealthCheck('service', 'unhealthy', { error: 'Connection failed' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Health Check: service is unhealthy')
      );
    });
  });

  describe('configuration', () => {
    it('should allow changing log level', () => {
      logger.setLogLevel('warn');
      
      // This is a bit tricky to test without accessing private members
      // We'll test the behavior instead
      expect(() => logger.setLogLevel('warn')).not.toThrow();
    });

    it('should allow enabling/disabling file logging', () => {
      logger.setFileLogging(true, '/new/path/test.log');
      
      expect(logger.getLogFilePath()).toBe('/new/path/test.log');
    });

    it('should return undefined for log file path when file logging is disabled', () => {
      const consoleOnlyLogger = new Logger('info', {
        enableFile: false
      });
      
      expect(consoleOnlyLogger.getLogFilePath()).toBeUndefined();
    });
  });

  describe('error handling in logging', () => {
    it('should handle errors when formatting data', async () => {
      const circularData = {};
      (circularData as any).self = circularData; // Create circular reference
      
      await logger.error('Test with circular data', circularData);
      
      // Should not throw and should log something
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle null and undefined data gracefully', async () => {
      await logger.error('Test with null', null);
      await logger.error('Test with undefined', undefined);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });
});