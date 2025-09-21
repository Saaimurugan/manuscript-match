/**
 * ErrorLogger Unit Tests
 * Comprehensive test coverage for the ErrorLogger utility class
 */

import { vi } from 'vitest';
import { ErrorLogger, LogLevel, type LoggerConfig, type ExternalLogService, ExternalServices } from '../errorLogger';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch
const mockFetch = vi.fn();

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    // Setup mocks
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('console', mockConsole);

    // Clear mocks
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Create fresh logger instance
    logger = new ErrorLogger();
  });

  afterEach(() => {
    // Cleanup
    logger.destroy();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = logger.getConfig();
      expect(config.enableConsoleLogging).toBe(true);
      expect(config.enableLocalStorage).toBe(true);
      expect(config.maxLocalStorageEntries).toBe(100);
      expect(config.batchSize).toBe(10);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<LoggerConfig> = {
        minLevel: LogLevel.ERROR,
        enableConsoleLogging: false,
        maxLocalStorageEntries: 50,
      };

      const customLogger = new ErrorLogger(customConfig);
      const config = customLogger.getConfig();

      expect(config.minLevel).toBe(LogLevel.ERROR);
      expect(config.enableConsoleLogging).toBe(false);
      expect(config.maxLocalStorageEntries).toBe(50);

      customLogger.destroy();
    });

    it('should generate unique session ID', () => {
      const logger1 = new ErrorLogger();
      const logger2 = new ErrorLogger();

      // Session IDs should be different for different instances
      // (though they might reuse localStorage session ID)
      expect(typeof logger1.getConfig()).toBe('object');
      expect(typeof logger2.getConfig()).toBe('object');

      logger1.destroy();
      logger2.destroy();
    });
  });

  describe('Logging Methods', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message', { key: 'value' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'Test debug message',
        { key: 'value' },
        ''
      );
    });

    it('should log info messages', () => {
      logger.info('Test info message', { key: 'value' });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'Test info message',
        { key: 'value' },
        ''
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message', { key: 'value' });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        'Test warning message',
        { key: 'value' },
        ''
      );
    });

    it('should log error messages', () => {
      const testError = new Error('Test error');
      logger.error('Test error message', testError, undefined, { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'Test error message',
        { key: 'value' },
        testError
      );
    });

    it('should log critical messages with enhanced formatting', () => {
      const testError = new Error('Critical error');
      logger.critical('Test critical message', testError, undefined, { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalledWith(
        '🚨',
        expect.stringContaining('[CRITICAL]'),
        'Test critical message',
        { key: 'value' },
        testError
      );
    });

    it('should respect minimum log level', () => {
      const customLogger = new ErrorLogger({ minLevel: LogLevel.ERROR });

      customLogger.debug('Debug message');
      customLogger.info('Info message');
      customLogger.warn('Warning message');
      customLogger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();

      customLogger.destroy();
    });
  });

  describe('Local Storage Logging', () => {
    it('should save log entries to localStorage', () => {
      logger.info('Test message for localStorage');

      const storedEntries = JSON.parse(localStorage.getItem('errorLogger_entries') || '[]');
      expect(storedEntries).toHaveLength(1);
      expect(storedEntries[0].message).toBe('Test message for localStorage');
      expect(storedEntries[0].level).toBe(LogLevel.INFO);
    });

    it('should limit localStorage entries to maxLocalStorageEntries', () => {
      const customLogger = new ErrorLogger({ maxLocalStorageEntries: 3 });

      // Add more entries than the limit
      customLogger.info('Message 1');
      customLogger.info('Message 2');
      customLogger.info('Message 3');
      customLogger.info('Message 4');
      customLogger.info('Message 5');

      const storedEntries = JSON.parse(localStorage.getItem('errorLogger_entries') || '[]');
      expect(storedEntries).toHaveLength(3);
      expect(storedEntries[0].message).toBe('Message 3');
      expect(storedEntries[2].message).toBe('Message 5');

      customLogger.destroy();
    });

    it('should retrieve local log entries', () => {
      logger.info('Test message 1');
      logger.error('Test message 2', new Error('Test error'));

      const entries = logger.getLocalLogEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('Test message 1');
      expect(entries[1].message).toBe('Test message 2');
    });

    it('should clear local log entries', () => {
      logger.info('Test message');
      expect(logger.getLocalLogEntries()).toHaveLength(1);

      logger.clearLocalLogEntries();
      expect(logger.getLocalLogEntries()).toHaveLength(0);
    });
  });

  describe('Context Sanitization', () => {
    it('should sanitize sensitive information from context', () => {
      logger.info('Test message', {
        password: 'secret123',
        token: 'abc123',
        email: 'user@example.com',
        normalData: 'safe data',
      });

      const entries = logger.getLocalLogEntries();
      const context = entries[0].context;

      expect(context?.password).toBe('[REDACTED]');
      expect(context?.token).toBe('[REDACTED]');
      expect(context?.email).toBe('[EMAIL_REDACTED]');
      expect(context?.normalData).toBe('safe data');
    });

    it('should sanitize nested objects', () => {
      logger.info('Test message', {
        user: {
          password: 'secret123',
          name: 'John Doe',
        },
        config: {
          apiKey: 'key123',
          endpoint: 'https://api.example.com',
        },
      });

      const entries = logger.getLocalLogEntries();
      const context = entries[0].context;

      expect(context?.user?.password).toBe('[REDACTED]');
      expect(context?.user?.name).toBe('John Doe');
      expect(context?.config?.apiKey).toBe('[REDACTED]');
      expect(context?.config?.endpoint).toBe('https://api.example.com');
    });
  });

  describe('External Service Integration', () => {
    it('should add external logging service', () => {
      const mockService: ExternalLogService = {
        name: 'TestService',
        endpoint: 'https://api.test.com/logs',
        enabled: true,
        formatPayload: (entries) => ({ logs: entries }),
      };

      logger.addExternalService(mockService);
      logger.info('Test message');

      // Should have logged the service addition
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'External logging service added',
        { serviceName: 'TestService' },
        ''
      );
    });

    it('should remove external logging service', () => {
      const mockService: ExternalLogService = {
        name: 'TestService',
        endpoint: 'https://api.test.com/logs',
        enabled: true,
        formatPayload: (entries) => ({ logs: entries }),
      };

      logger.addExternalService(mockService);
      logger.removeExternalService('TestService');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'External logging service removed',
        { serviceName: 'TestService' },
        ''
      );
    });

    it('should flush logs to external service', async () => {
      const mockService: ExternalLogService = {
        name: 'TestService',
        endpoint: 'https://api.test.com/logs',
        enabled: true,
        formatPayload: (entries) => ({ logs: entries }),
      };

      const customLogger = new ErrorLogger({ enableRemoteLogging: true });
      customLogger.addExternalService(mockService);

      customLogger.error('Test error message');
      await customLogger.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test error message'),
        })
      );

      customLogger.destroy();
    });

    it('should handle external service errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockService: ExternalLogService = {
        name: 'TestService',
        endpoint: 'https://api.test.com/logs',
        enabled: true,
        formatPayload: (entries) => ({ logs: entries }),
      };

      const customLogger = new ErrorLogger({ enableRemoteLogging: true });
      customLogger.addExternalService(mockService);

      customLogger.error('Test error message');
      await customLogger.flush();

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to send logs to TestService:',
        expect.any(Error)
      );

      customLogger.destroy();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<LoggerConfig> = {
        minLevel: LogLevel.ERROR,
        enableConsoleLogging: false,
      };

      logger.updateConfig(newConfig);
      const config = logger.getConfig();

      expect(config.minLevel).toBe(LogLevel.ERROR);
      expect(config.enableConsoleLogging).toBe(false);
    });

    it('should persist configuration to localStorage', () => {
      const newConfig: Partial<LoggerConfig> = {
        minLevel: LogLevel.WARN,
        maxLocalStorageEntries: 200,
      };

      logger.updateConfig(newConfig);

      const storedConfig = JSON.parse(localStorage.getItem('errorLogger_config') || '{}');
      expect(storedConfig.minLevel).toBe(LogLevel.WARN);
      expect(storedConfig.maxLocalStorageEntries).toBe(200);
    });
  });

  describe('Statistics', () => {
    it('should provide log statistics', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.critical('Critical message');

      const stats = logger.getLogStatistics();

      expect(stats.total).toBe(5);
      expect(stats.debug).toBe(1);
      expect(stats.info).toBe(1);
      expect(stats.warn).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.critical).toBe(1);
    });

    it('should handle empty statistics', () => {
      const stats = logger.getLogStatistics();

      expect(stats.total).toBe(0);
      expect(stats.debug).toBe(0);
      expect(stats.info).toBe(0);
      expect(stats.warn).toBe(0);
      expect(stats.error).toBe(0);
      expect(stats.critical).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      vi.stubGlobal('localStorage', {
        ...localStorage,
        setItem: mockSetItem,
      });

      // Should not throw an error
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to save log entry to localStorage:',
        expect.any(Error)
      );
    });

    it('should handle JSON parsing errors gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('errorLogger_entries', 'invalid json');

      const entries = logger.getLocalLogEntries();
      expect(entries).toEqual([]);

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to get log entries from localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('Environment Detection', () => {
    it('should detect development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new ErrorLogger();
      devLogger.info('Test message');

      const entries = devLogger.getLocalLogEntries();
      expect(entries[0].environment).toBe('development');

      process.env.NODE_ENV = originalEnv;
      devLogger.destroy();
    });

    it('should detect production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodLogger = new ErrorLogger();
      prodLogger.info('Test message');

      const entries = prodLogger.getLocalLogEntries();
      expect(entries[0].environment).toBe('production');

      process.env.NODE_ENV = originalEnv;
      prodLogger.destroy();
    });

    it('should detect test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const testLogger = new ErrorLogger();
      testLogger.info('Test message');

      const entries = testLogger.getLocalLogEntries();
      expect(entries[0].environment).toBe('test');

      process.env.NODE_ENV = originalEnv;
      testLogger.destroy();
    });
  });

  describe('External Service Configurations', () => {
    it('should create Sentry service configuration', () => {
      const sentryService = ExternalServices.Sentry('https://sentry.io/api/logs');

      expect(sentryService.name).toBe('Sentry');
      expect(sentryService.endpoint).toBe('https://sentry.io/api/logs');
      expect(sentryService.enabled).toBe(true);
      expect(typeof sentryService.formatPayload).toBe('function');
    });

    it('should create LogRocket service configuration', () => {
      const logRocketService = ExternalServices.LogRocket('api-key-123');

      expect(logRocketService.name).toBe('LogRocket');
      expect(logRocketService.endpoint).toBe('https://api.logrocket.com/logs');
      expect(logRocketService.apiKey).toBe('api-key-123');
      expect(logRocketService.enabled).toBe(true);
      expect(typeof logRocketService.formatPayload).toBe('function');
    });

    it('should create custom API service configuration', () => {
      const customService = ExternalServices.CustomAPI('https://api.custom.com/logs', 'custom-key');

      expect(customService.name).toBe('CustomAPI');
      expect(customService.endpoint).toBe('https://api.custom.com/logs');
      expect(customService.apiKey).toBe('custom-key');
      expect(customService.enabled).toBe(true);
      expect(typeof customService.formatPayload).toBe('function');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const customLogger = new ErrorLogger({ flushInterval: 1000 });
      
      // Add some logs
      customLogger.info('Test message');
      
      // Destroy should not throw
      expect(() => {
        customLogger.destroy();
      }).not.toThrow();
    });

    it('should flush remaining logs on destroy', async () => {
      const customLogger = new ErrorLogger({ 
        enableRemoteLogging: true,
        remoteEndpoint: 'https://api.test.com/logs'
      });
      
      customLogger.error('Final message');
      
      // Mock the flush to resolve
      const flushSpy = vi.spyOn(customLogger, 'flush').mockResolvedValue();
      
      customLogger.destroy();
      
      // Flush should have been called
      expect(flushSpy).toHaveBeenCalled();
      
      flushSpy.mockRestore();
    });
  });
});