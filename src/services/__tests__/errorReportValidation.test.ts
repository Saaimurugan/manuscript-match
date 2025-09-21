/**
 * Error Report Validation Tests
 * Tests for error report validation and sanitization functionality
 */

import { ErrorReportValidator } from '../errorReportValidation';
import type { ErrorReportData } from '../errorReportService';

describe('ErrorReportValidator', () => {
  let validator: ErrorReportValidator;

  beforeEach(() => {
    validator = new ErrorReportValidator();
  });

  describe('validateErrorReport', () => {
    const createValidReport = (): ErrorReportData => ({
      errorId: 'test-error-123',
      message: 'Test error message',
      timestamp: new Date().toISOString(),
      url: 'https://example.com/test',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      sessionId: 'session-123',
      severity: 'medium',
      category: 'runtime',
    });

    it('should validate a correct error report', () => {
      const report = createValidReport();
      const result = validator.validateErrorReport(report);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const report = createValidReport();
      delete (report as any).errorId;
      delete (report as any).message;

      const result = validator.validateErrorReport(report);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('errorId is required and must be a string');
      expect(result.errors).toContain('message is required and must be a string');
    });

    it('should fail validation for invalid timestamp', () => {
      const report = createValidReport();
      report.timestamp = 'invalid-timestamp';

      const result = validator.validateErrorReport(report);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('timestamp is required and must be a valid ISO string');
    });

    it('should fail validation for invalid severity', () => {
      const report = createValidReport();
      (report as any).severity = 'invalid-severity';

      const result = validator.validateErrorReport(report);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('severity must be one of: low, medium, high, critical');
    });

    it('should fail validation for invalid category', () => {
      const report = createValidReport();
      (report as any).category = 'invalid-category';

      const result = validator.validateErrorReport(report);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('category must be one of: syntax, runtime, network, user, system');
    });

    it('should warn about long messages', () => {
      const report = createValidReport();
      report.message = 'x'.repeat(1001); // Exceeds default max length

      const result = validator.validateErrorReport(report);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('message exceeds maximum length of 1000 characters');
    });

    it('should warn about sensitive data in report', () => {
      const report = createValidReport();
      report.message = 'Error with email user@example.com and password secret123';

      const result = validator.validateErrorReport(report);

      expect(result.warnings).toContain('Report may contain email addresses');
      expect(result.warnings).toContain('Report may contain passwords');
    });
  });

  describe('sanitizeErrorReport', () => {
    const createReportWithSensitiveData = (): ErrorReportData => ({
      errorId: 'test-error-123',
      message: 'Error with email user@example.com and credit card 4111-1111-1111-1111',
      stack: 'Error at /home/user/secret/file.js:10:5\n  password=secret123',
      timestamp: new Date().toISOString(),
      url: 'https://example.com/test?token=abc123&password=secret',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      sessionId: 'session-123',
      severity: 'medium',
      category: 'runtime',
      userId: 'user@example.com',
      additionalContext: {
        password: 'secret123',
        apiKey: 'sk-1234567890abcdef',
        userInfo: {
          email: 'user@example.com',
          phone: '555-123-4567',
        },
      },
    });

    it('should sanitize email addresses', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.message).toContain('[EMAIL_REDACTED]');
      expect(sanitized.message).not.toContain('user@example.com');
    });

    it('should sanitize credit card numbers', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.message).toContain('[CARD_REDACTED]');
      expect(sanitized.message).not.toContain('4111-1111-1111-1111');
    });

    it('should sanitize passwords and tokens', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.stack).toContain('password=[REDACTED]');
      expect(sanitized.stack).not.toContain('password=secret123');
    });

    it('should sanitize file paths', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.stack).toContain('[PATH_REDACTED]');
      expect(sanitized.stack).not.toContain('/home/user/secret/file.js');
    });

    it('should sanitize URLs with sensitive parameters', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.url).toContain('token=[REDACTED]');
      expect(sanitized.url).toContain('password=[REDACTED]');
      expect(sanitized.url).not.toContain('abc123');
      expect(sanitized.url).not.toContain('secret');
    });

    it('should sanitize sensitive fields in additional context', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.additionalContext?.password).toBe('[REDACTED]');
      expect(sanitized.additionalContext?.apiKey).toBe('[REDACTED]');
      expect(sanitized.additionalContext?.userInfo?.email).toBe('[EMAIL_REDACTED]');
      expect(sanitized.additionalContext?.userInfo?.phone).toBe('[PHONE_REDACTED]');
    });

    it('should remove user ID if it contains sensitive data', () => {
      const report = createReportWithSensitiveData();
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.userId).toBeUndefined();
    });

    it('should truncate long messages', () => {
      const report = createReportWithSensitiveData();
      report.message = 'x'.repeat(1001);
      
      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.message).toHaveLength(1000); // 1000 - 3 + 3 for '...'
      expect(sanitized.message).toEndWith('...');
    });

    it('should handle nested objects with sensitive data', () => {
      const report = createReportWithSensitiveData();
      report.additionalContext = {
        level1: {
          level2: {
            level3: {
              password: 'secret',
              email: 'test@example.com',
            },
          },
        },
      };

      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.additionalContext?.level1?.level2?.level3?.password).toBe('[REDACTED]');
      expect(sanitized.additionalContext?.level1?.level2?.level3?.email).toBe('[EMAIL_REDACTED]');
    });

    it('should handle external URLs', () => {
      const report = createReportWithSensitiveData();
      report.url = 'https://external-site.com/path?data=sensitive';

      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.url).toBe('[EXTERNAL_URL_REDACTED]');
    });

    it('should preserve allowed domains', () => {
      const validator = new ErrorReportValidator({
        allowedDomains: ['example.com', 'localhost'],
        removePersonalInfo: true,
        removeCredentials: true,
        removeFileSystemPaths: true,
        removeIPAddresses: true,
        removePhoneNumbers: true,
        maxStackTraceLength: 5000,
        maxMessageLength: 1000,
      });

      const report = createReportWithSensitiveData();
      report.url = 'https://example.com/path?token=secret';

      const sanitized = validator.sanitizeErrorReport(report);

      expect(sanitized.url).toContain('example.com');
      expect(sanitized.url).toContain('token=[REDACTED]');
    });
  });

  describe('custom sanitization options', () => {
    it('should respect custom options', () => {
      const customValidator = new ErrorReportValidator({
        removePersonalInfo: false,
        removeCredentials: true,
        removeFileSystemPaths: false,
        removeIPAddresses: false,
        removePhoneNumbers: false,
        maxStackTraceLength: 100,
        maxMessageLength: 50,
        allowedDomains: ['test.com'],
      });

      const report: ErrorReportData = {
        errorId: 'test',
        message: 'Error with email user@example.com and password secret123',
        stack: 'x'.repeat(200),
        timestamp: new Date().toISOString(),
        url: 'https://example.com/test',
        userAgent: 'Test',
        sessionId: 'session',
        severity: 'medium',
        category: 'runtime',
      };

      const sanitized = customValidator.sanitizeErrorReport(report);

      // Email should NOT be sanitized (removePersonalInfo: false)
      expect(sanitized.message).toContain('user@example.com');
      
      // Password should be sanitized (removeCredentials: true)
      expect(sanitized.message).toContain('password=[REDACTED]');
      
      // Stack should be truncated to 100 chars
      expect(sanitized.stack).toHaveLength(100);
      expect(sanitized.stack).toEndWith('...');
      
      // Message should be truncated to 50 chars
      expect(sanitized.message).toHaveLength(50);
      
      // URL should be redacted (not in allowed domains)
      expect(sanitized.url).toBe('[EXTERNAL_URL_REDACTED]');
    });
  });
});