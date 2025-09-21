/**
 * Error Report Service Integration Tests
 * Tests for the integrated validation, sanitization, and consent functionality
 */

import { ErrorReportService } from '../errorReportService';
import { ErrorReportConsentManager } from '../errorReportConsent';
import { ErrorReportValidator } from '../errorReportValidation';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

describe('ErrorReportService Integration', () => {
  let errorReportService: ErrorReportService;
  let consentManager: ErrorReportConsentManager;
  let validator: ErrorReportValidator;

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    
    consentManager = new ErrorReportConsentManager();
    validator = new ErrorReportValidator();
    errorReportService = new ErrorReportService();
  });

  describe('generateReport with consent validation', () => {
    it('should throw error when consent is not given', () => {
      const error = new Error('Test error');
      
      expect(() => {
        errorReportService.generateReport(error);
      }).toThrow('Error reporting not allowed - user consent required');
    });

    it('should generate basic report with basic consent', () => {
      consentManager.setConsentLevel('basic');
      
      const error = new Error('Test error with sensitive data user@example.com');
      const report = errorReportService.generateReport(error);

      expect(report.errorId).toBeDefined();
      expect(report.message).toContain('[EMAIL_REDACTED]');
      expect(report.stack).toBeDefined(); // Stack traces allowed in basic
      expect(report.additionalContext).toBeDefined(); // System info allowed
      expect(report.userId).toBeUndefined(); // Personal info not allowed
    });

    it('should generate detailed report with detailed consent', () => {
      consentManager.setConsentLevel('detailed');
      
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'Component stack trace' };
      const additionalContext = { testData: 'test' };
      
      const report = errorReportService.generateReport(error, errorInfo, additionalContext);

      expect(report.errorId).toBeDefined();
      expect(report.stack).toBeDefined();
      expect(report.componentStack).toBeDefined();
      expect(report.additionalContext).toBeDefined();
      expect(report.additionalContext?.userActions).toBeDefined(); // User actions allowed
      expect(report.userId).toBeUndefined(); // Personal info still not allowed
    });

    it('should generate full report with full consent', () => {
      consentManager.setConsentLevel('full');
      
      // Mock getUserId to return a value
      mockLocalStorage.setItem('auth', JSON.stringify({ user: { id: 'user123' } }));
      
      const error = new Error('Test error');
      const report = errorReportService.generateReport(error);

      expect(report.errorId).toBeDefined();
      expect(report.stack).toBeDefined();
      expect(report.additionalContext).toBeDefined();
      expect(report.additionalContext?.userActions).toBeDefined();
      expect(report.userId).toBe('user123'); // Personal info allowed
    });

    it('should sanitize sensitive data even with full consent', () => {
      consentManager.setConsentLevel('full');
      
      const error = new Error('Error with password=secret123 and email user@example.com');
      const report = errorReportService.generateReport(error);

      expect(report.message).toContain('password=[REDACTED]');
      expect(report.message).toContain('[EMAIL_REDACTED]');
    });
  });

  describe('submitReport with consent validation', () => {
    beforeEach(() => {
      consentManager.setConsentLevel('detailed');
    });

    it('should fail submission without consent', async () => {
      consentManager.setConsentLevel('none');
      
      const error = new Error('Test error');
      const report = { 
        errorId: 'test', 
        message: error.message, 
        timestamp: new Date().toISOString(),
        sessionId: 'session',
        severity: 'medium' as const,
        category: 'runtime' as const,
        url: 'test',
        userAgent: 'test',
      };

      const result = await errorReportService.submitReport(report);

      expect(result.success).toBe(false);
      expect(result.error).toContain('user consent required');
    });

    it('should fail submission with invalid report data', async () => {
      const invalidReport = { 
        errorId: '', // Invalid - empty string
        message: 'Test error',
        timestamp: 'invalid-timestamp', // Invalid timestamp
        sessionId: 'session',
        severity: 'invalid' as any, // Invalid severity
        category: 'runtime' as const,
        url: 'test',
        userAgent: 'test',
      };

      const result = await errorReportService.submitReport(invalidReport);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Report validation failed');
    });

    it('should save locally when external reporting not allowed', async () => {
      consentManager.setConsentLevel('basic'); // Basic doesn't allow external reporting
      
      const error = new Error('Test error');
      const report = errorReportService.generateReport(error);

      // Mock successful local save
      const saveLocalSpy = jest.spyOn(errorReportService, 'saveReportLocally');

      const result = await errorReportService.submitReport(report);

      expect(result.success).toBe(true);
      expect(result.error).toContain('external reporting not permitted');
    });

    it('should submit externally when allowed', async () => {
      consentManager.setConsentLevel('detailed'); // Detailed allows external reporting
      
      // Mock successful fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reportId: 'server-report-123' }),
      });

      const error = new Error('Test error');
      const report = errorReportService.generateReport(error);

      const result = await errorReportService.submitReport(report);

      expect(result.success).toBe(true);
      expect(result.reportId).toBe('server-report-123');
      expect(global.fetch).toHaveBeenCalledWith('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining(report.errorId),
      });
    });

    it('should handle network errors gracefully', async () => {
      consentManager.setConsentLevel('detailed');
      
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const error = new Error('Test error');
      const report = errorReportService.generateReport(error);

      const result = await errorReportService.submitReport(report);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('consent integration methods', () => {
    it('should check if error reporting is enabled', () => {
      expect(errorReportService.isErrorReportingEnabled()).toBe(false);
      
      consentManager.setConsentLevel('basic');
      expect(errorReportService.isErrorReportingEnabled()).toBe(true);
      
      consentManager.setConsentLevel('none');
      expect(errorReportService.isErrorReportingEnabled()).toBe(false);
    });

    it('should get consent status', () => {
      const status = errorReportService.getConsentStatus();
      expect(status.hasConsent).toBe(false);
      
      consentManager.setConsentLevel('detailed');
      const newStatus = errorReportService.getConsentStatus();
      expect(newStatus.hasConsent).toBe(true);
      expect(newStatus.level).toBe('detailed');
    });

    it('should set consent level', () => {
      const config = errorReportService.setConsentLevel('full');
      expect(config.level).toBe('full');
      
      const status = errorReportService.getConsentStatus();
      expect(status.level).toBe('full');
    });

    it('should validate reports', () => {
      const validReport = {
        errorId: 'test-123',
        message: 'Test error',
        timestamp: new Date().toISOString(),
        sessionId: 'session',
        severity: 'medium' as const,
        category: 'runtime' as const,
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0',
      };

      const result = errorReportService.validateReport(validReport);
      expect(result.isValid).toBe(true);
    });

    it('should sanitize reports', () => {
      const reportWithSensitiveData = {
        errorId: 'test-123',
        message: 'Error with email user@example.com',
        timestamp: new Date().toISOString(),
        sessionId: 'session',
        severity: 'medium' as const,
        category: 'runtime' as const,
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0',
      };

      const sanitized = errorReportService.sanitizeReport(reportWithSensitiveData);
      expect(sanitized.message).toContain('[EMAIL_REDACTED]');
    });
  });

  describe('data cleanup with consent', () => {
    beforeEach(() => {
      consentManager.setConsentLevel('basic'); // 7 days retention
    });

    it('should clean up expired data based on retention policy', () => {
      // Add some old reports
      const oldReport = {
        errorId: 'old-report',
        message: 'Old error',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        sessionId: 'session',
        severity: 'medium' as const,
        category: 'runtime' as const,
        url: 'test',
        userAgent: 'test',
      };

      const recentReport = {
        errorId: 'recent-report',
        message: 'Recent error',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        sessionId: 'session',
        severity: 'medium' as const,
        category: 'runtime' as const,
        url: 'test',
        userAgent: 'test',
      };

      // Save reports
      errorReportService.saveReportLocally(oldReport);
      errorReportService.saveReportLocally(recentReport);

      // Verify both are saved
      const beforeCleanup = errorReportService.getPendingReports();
      expect(beforeCleanup).toHaveLength(2);

      // Clean up expired data
      errorReportService.cleanupExpiredData();

      // Verify only recent report remains
      const afterCleanup = errorReportService.getPendingReports();
      expect(afterCleanup).toHaveLength(1);
      expect(afterCleanup[0].errorId).toBe('recent-report');
    });

    it('should clear all data when retention is 0', () => {
      consentManager.setConsentLevel('none'); // 0 days retention
      
      const report = {
        errorId: 'test-report',
        message: 'Test error',
        timestamp: new Date().toISOString(),
        sessionId: 'session',
        severity: 'medium' as const,
        category: 'runtime' as const,
        url: 'test',
        userAgent: 'test',
      };

      errorReportService.saveReportLocally(report);
      expect(errorReportService.getPendingReports()).toHaveLength(1);

      errorReportService.cleanupExpiredData();
      expect(errorReportService.getPendingReports()).toHaveLength(0);
    });
  });
});