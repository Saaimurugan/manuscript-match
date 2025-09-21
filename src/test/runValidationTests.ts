/**
 * Simple test runner for validation and sanitization functionality
 */

import { verifyErrorReportValidationAndSanitization } from './errorReportValidation.verification';

// Run the verification
try {
  verifyErrorReportValidationAndSanitization();
} catch (error) {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}