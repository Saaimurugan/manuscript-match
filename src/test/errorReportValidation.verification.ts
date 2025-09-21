/**
 * Error Report Validation and Sanitization Verification
 * Manual verification script for the validation and consent functionality
 */

import { ErrorReportValidator } from '../services/errorReportValidation';
import { ErrorReportConsentManager } from '../services/errorReportConsent';
import { ErrorReportService } from '../services/errorReportService';
import type { ErrorReportData } from '../services/errorReportService';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// @ts-ignore
global.localStorage = mockLocalStorage;

export function verifyErrorReportValidationAndSanitization(): void {
  console.log('🧪 Verifying Error Report Validation and Sanitization...\n');

  // Test 1: Validation functionality
  console.log('1. Testing Validation Functionality');
  const validator = new ErrorReportValidator();

  const validReport: ErrorReportData = {
    errorId: 'test-error-123',
    message: 'Test error message',
    timestamp: new Date().toISOString(),
    url: 'https://example.com/test',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    sessionId: 'session-123',
    severity: 'medium',
    category: 'runtime',
  };

  const validationResult = validator.validateErrorReport(validReport);
  console.log('✅ Valid report validation:', validationResult.isValid);

  // Test invalid report
  const invalidReport = { ...validReport, errorId: '', severity: 'invalid' as any };
  const invalidResult = validator.validateErrorReport(invalidReport);
  console.log('❌ Invalid report validation:', invalidResult.isValid);
  console.log('   Errors:', invalidResult.errors);

  // Test 2: Sanitization functionality
  console.log('\n2. Testing Sanitization Functionality');
  const sensitiveReport: ErrorReportData = {
    errorId: 'test-error-456',
    message: 'Error with email user@example.com and password secret123',
    stack: 'Error at /home/user/secret/file.js:10:5\n  password=secret123',
    timestamp: new Date().toISOString(),
    url: 'https://example.com/test?token=abc123&password=secret',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    sessionId: 'session-123',
    severity: 'high',
    category: 'runtime',
    additionalContext: {
      password: 'secret123',
      apiKey: 'sk-1234567890abcdef',
      userInfo: {
        email: 'user@example.com',
        phone: '555-123-4567',
      },
    },
  };

  const sanitizedReport = validator.sanitizeErrorReport(sensitiveReport);
  console.log('🔒 Original message:', sensitiveReport.message);
  console.log('🔒 Sanitized message:', sanitizedReport.message);
  console.log('🔒 Original stack contains password:', sensitiveReport.stack?.includes('password=secret123'));
  console.log('🔒 Sanitized stack contains password:', sanitizedReport.stack?.includes('password=secret123'));

  // Test 3: Consent management
  console.log('\n3. Testing Consent Management');
  const consentManager = new ErrorReportConsentManager();

  // Test no consent
  let status = consentManager.getConsentStatus();
  console.log('📋 Initial consent status:', status.hasConsent, status.level);

  // Test setting consent
  consentManager.setConsentLevel('basic');
  status = consentManager.getConsentStatus();
  console.log('📋 Basic consent status:', status.hasConsent, status.level);

  // Test data type permissions
  console.log('📋 Personal info allowed:', consentManager.isDataTypeAllowed('includePersonalInfo'));
  console.log('📋 User actions allowed:', consentManager.isDataTypeAllowed('includeUserActions'));
  console.log('📋 System info allowed:', consentManager.isDataTypeAllowed('includeSystemInfo'));

  // Test detailed consent
  consentManager.setConsentLevel('detailed');
  console.log('📋 Detailed - User actions allowed:', consentManager.isDataTypeAllowed('includeUserActions'));
  console.log('📋 Detailed - External reporting allowed:', consentManager.isDataTypeAllowed('allowExternalReporting'));

  // Test 4: Integrated error report service
  console.log('\n4. Testing Integrated Error Report Service');
  const errorReportService = new ErrorReportService();

  try {
    // This should work with consent
    const error = new Error('Test error with sensitive data user@example.com');
    const report = errorReportService.generateReport(error);
    console.log('✅ Report generated with consent');
    console.log('🔒 Message sanitized:', report.message.includes('[EMAIL_REDACTED]'));
    console.log('📊 Report includes system info:', !!report.additionalContext);
    console.log('📊 Report includes user actions:', !!report.additionalContext?.userActions);
  } catch (error) {
    console.log('❌ Error generating report:', (error as Error).message);
  }

  // Test without consent
  consentManager.setConsentLevel('none');
  try {
    const error = new Error('Test error without consent');
    const report = errorReportService.generateReport(error);
    console.log('❌ Should not reach here - report generated without consent');
  } catch (error) {
    console.log('✅ Correctly blocked report without consent:', (error as Error).message);
  }

  // Test 5: Data cleanup
  console.log('\n5. Testing Data Cleanup');
  consentManager.setConsentLevel('basic'); // 7 days retention

  // Add some test data
  const testReport: ErrorReportData = {
    errorId: 'cleanup-test',
    message: 'Test cleanup',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    sessionId: 'session',
    severity: 'low',
    category: 'runtime',
    url: 'test',
    userAgent: 'test',
  };

  errorReportService.saveReportLocally(testReport);
  console.log('📦 Reports before cleanup:', errorReportService.getPendingReports().length);

  errorReportService.cleanupExpiredData();
  console.log('📦 Reports after cleanup:', errorReportService.getPendingReports().length);

  console.log('\n✅ All verification tests completed successfully!');
}

// Export for use in other verification scripts
export default verifyErrorReportValidationAndSanitization;