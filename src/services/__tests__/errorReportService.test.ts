/**
 * Unit tests for ErrorReportService
 * Tests error report generation, submission, local storage, and retry mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorReportService, errorReportService, type ErrorReportData } from '../errorReportService';

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};
Object.assign(console, mockConsole);

describe('ErrorReportService', () => {
  let service: ErrorReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a fresh instance for each test
    service = new ErrorReportService();
    
    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Report Generation', () => {
    it('should generate comprehensive error report data', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:1:1';
      
      const errorInfo = {
        componentStack: '\n    in TestComponent\n    in App',
      };

      const additionalContext = {
        customData: 'test value',
      };

      const report = service.generateReport(error, errorInfo, additionalContext);

      expect(report).toMatchObject({
        errorId: expect.stringMatching(/^error_\d+_[a-z0-9]+$/),
        message: 'Test error message',
        stack: 'Error: Test error message\n    at test.js:1:1',
        componentStack: '\n    in TestComponent\n    in App',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
        severity: expect.stringMatching(/^(low|medium|high|critical)$/),
        category: expect.stringMatching(/^(syntax|runtime|network|user|system)$/),
      });

      expect(report.additionalContext).toMatchObject({
        customData: 'test value',
      });
    });

    it('should categorize syntax errors correctly', () => {
      const syntaxError = new Error('Unexpected token');
      const report = service.generateReport(syntaxError);

      expect(report.category).toBe('syntax');
      expect(report.severity).toBe('critical');
    });

    it('should categorize network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const report = service.generateReport(networkError);

      expect(report.category).toBe('network');
      expect(report.severity).toBe('high');
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid input provided');
      const report = service.generateReport(validationError);

      expect(report.category).toBe('user');
      expect(report.severity).toBe('medium');
    });
  });

  describe('Error Report Submission', () => {
    it('should log report in development environment', async () => {
      // Ensure development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const reportData: ErrorReportData = {
        errorId: 'test-error-id',
        message: 'Test error',
        timestamp: new Date().toISOString(),
        url: 'https://example.com',
        userAgent: 'test-agent',
        sessionId: 'session123',
        severity: 'medium',
        category: 'runtime',
      };

      const result = await service.submitReport(reportData);

      expect(result.success).toBe(true);
      expect(result.reportId).toBe('test-error-id');
      expect(mockConsole.group).toHaveBeenCalledWith('🐛 Error Report Generated');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should include user description when provided', async () => {
      const reportData: ErrorReportData = {
        errorId: 'test-error-id',
        message: 'Test error',
        timestamp: new Date().toISOString(),
        url: 'https://example.com',
        userAgent: 'test-agent',
        sessionId: 'session123',
        severity: 'medium',
        category: 'runtime',
      };

      const userDescription = 'I was clicking the submit button when this happened';

      await service.submitReport(reportData, userDescription);

      expect(reportData.userDescription).toBe(userDescription);
    });
  });

  describe('Local Storage Operations', () => {
    it('should save report to local storage', () => {
      const reportData: ErrorReportData = {
        errorId: 'test-error-id',
        message: 'Test error',
        timestamp: new Date().toISOString(),
        url: 'https://example.com',
        userAgent: 'test-agent',
        sessionId: 'session123',
        severity: 'medium',
        category: 'runtime',
      };

      // This should not throw an error
      expect(() => service.saveReportLocally(reportData)).not.toThrow();
    });

    it('should retrieve pending reports from local storage', () => {
      const pendingReports = service.getPendingReports();
      expect(Array.isArray(pendingReports)).toBe(true);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize email addresses from error messages', () => {
      const error = new Error('User test@example.com not found');
      const report = service.generateReport(error);

      expect(report.message).toBe('User [EMAIL_REDACTED] not found');
    });

    it('should sanitize credit card numbers from stack traces', () => {
      const error = new Error('Payment failed');
      error.stack = 'Error: Payment failed for card 1234-5678-9012-3456\n    at payment.js:1:1';
      
      const report = service.generateReport(error);

      expect(report.stack).toContain('[CARD_REDACTED]');
      expect(report.stack).not.toContain('1234-5678-9012-3456');
    });

    it('should sanitize passwords from additional context', () => {
      const error = new Error('Login failed');
      const additionalContext = {
        formData: {
          username: 'testuser',
          password: 'secretpassword123',
        },
      };

      const report = service.generateReport(error, undefined, additionalContext);

      expect(report.additionalContext?.formData?.password).toBe('[REDACTED]');
      expect(report.additionalContext?.formData?.username).toBe('testuser');
    });
  });

  describe('Error ID Generation', () => {
    it('should generate unique error IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const report1 = service.generateReport(error1);
      const report2 = service.generateReport(error2);

      expect(report1.errorId).not.toBe(report2.errorId);
      expect(report1.errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(report2.errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    });
  });
});

describe('ErrorReportService Singleton', () => {
  it('should export a singleton instance', () => {
    expect(errorReportService).toBeInstanceOf(ErrorReportService);
  });

  it('should maintain state across imports', () => {
    const error = new Error('Test error');
    const report1 = errorReportService.generateReport(error);
    const report2 = errorReportService.generateReport(error);

    // Should have the same session ID
    expect(report1.sessionId).toBe(report2.sessionId);
  });
});