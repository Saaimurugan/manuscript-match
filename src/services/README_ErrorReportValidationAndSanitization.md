# Error Report Validation and Sanitization

This document describes the implementation of comprehensive error report validation, sanitization, and user consent management for privacy-compliant error reporting.

## Overview

The error reporting system now includes:

1. **Data Validation** - Ensures error reports have valid structure and content
2. **Data Sanitization** - Removes sensitive information from error reports
3. **User Consent Management** - Handles user permissions for data collection
4. **Privacy Compliance** - Implements GDPR-compliant data handling

## Components

### 1. ErrorReportValidator (`errorReportValidation.ts`)

Provides comprehensive validation and sanitization for error reports.

**Key Features:**
- Validates error report data structure and content
- Sanitizes sensitive information (emails, passwords, tokens, etc.)
- Configurable sanitization options
- Handles nested objects and arrays
- Truncates long content to prevent bloat

**Usage:**
```typescript
import { errorReportValidator } from './services/errorReportValidation';

// Validate a report
const validationResult = errorReportValidator.validateErrorReport(reportData);
if (!validationResult.isValid) {
  console.error('Validation errors:', validationResult.errors);
}

// Sanitize a report
const sanitizedReport = errorReportValidator.sanitizeErrorReport(reportData);
```

### 2. ErrorReportConsentManager (`errorReportConsent.ts`)

Manages user consent for error reporting with different privacy levels.

**Consent Levels:**
- **None**: No error reporting allowed
- **Basic**: Essential error info only, local storage only (7 days)
- **Detailed**: Enhanced error info with user context, external reporting allowed (30 days)
- **Full**: Comprehensive error reporting with personal info (90 days)

**Usage:**
```typescript
import { errorReportConsentManager } from './services/errorReportConsent';

// Check consent status
const status = errorReportConsentManager.getConsentStatus();
if (status.hasConsent) {
  // Error reporting is allowed
}

// Set consent level
errorReportConsentManager.setConsentLevel('detailed');

// Check specific permissions
if (errorReportConsentManager.isDataTypeAllowed('includeUserActions')) {
  // User actions can be included in reports
}
```

### 3. ErrorReportConsentModal (`ErrorReportConsentModal.tsx`)

React component for managing user consent preferences.

**Features:**
- User-friendly consent level selection
- Detailed privacy information
- Consent expiration warnings
- Revoke consent functionality
- Privacy policy compliance

**Usage:**
```typescript
import ErrorReportConsentModal from './components/error/ErrorReportConsentModal';

<ErrorReportConsentModal
  isOpen={showConsentModal}
  onClose={() => setShowConsentModal(false)}
  onConsentChange={(level) => console.log('Consent changed to:', level)}
  showDetails={true}
/>
```

### 4. Enhanced ErrorReportService

The existing error report service has been enhanced with validation and consent integration.

**New Features:**
- Automatic consent validation before report generation
- Integrated data sanitization
- Consent-based data collection
- Automatic data cleanup based on retention policies

## Data Sanitization

The system automatically removes or redacts:

- **Personal Information**: Email addresses, phone numbers, SSNs
- **Credentials**: Passwords, tokens, API keys, secrets
- **File Paths**: Local file system paths
- **IP Addresses**: Network addresses
- **Credit Card Numbers**: Payment information

**Sanitization Patterns:**
```typescript
// Email addresses → [EMAIL_REDACTED]
// Credit cards → [CARD_REDACTED]
// Passwords → password=[REDACTED]
// File paths → [PATH_REDACTED]
// IP addresses → [IP_REDACTED]
```

## Privacy Compliance

### GDPR Compliance
- **Consent Management**: Explicit user consent for data collection
- **Data Minimization**: Only collect necessary data based on consent level
- **Right to Erasure**: Users can revoke consent and delete data
- **Data Retention**: Automatic cleanup based on retention policies
- **Transparency**: Clear information about data collection and usage

### Consent Expiration
- Consent expires after 1 year
- Users are prompted to renew expired consent
- Outdated consent versions trigger update prompts

### Data Retention Policies
- **None**: 0 days (no data stored)
- **Basic**: 7 days
- **Detailed**: 30 days  
- **Full**: 90 days

## Security Features

1. **Input Validation**: All error report data is validated before processing
2. **Output Sanitization**: Sensitive data is automatically removed or redacted
3. **Domain Whitelisting**: Only allowed domains can be included in URLs
4. **Content Length Limits**: Prevents excessive data collection
5. **Nested Object Handling**: Sanitizes deeply nested sensitive data

## Testing

Comprehensive test suites are provided:

- `errorReportValidation.test.ts` - Validation and sanitization tests
- `errorReportConsent.test.ts` - Consent management tests
- `ErrorReportConsentModal.test.tsx` - UI component tests
- `errorReportService.integration.test.ts` - Integration tests

## Configuration

### Custom Sanitization Options
```typescript
const customValidator = new ErrorReportValidator({
  removePersonalInfo: true,
  removeCredentials: true,
  removeFileSystemPaths: true,
  removeIPAddresses: true,
  removePhoneNumbers: true,
  maxStackTraceLength: 5000,
  maxMessageLength: 1000,
  allowedDomains: ['localhost', 'yourapp.com'],
});
```

### Environment-Specific Behavior
- **Development**: Detailed logging, local-only reporting
- **Production**: Sanitized logging, external reporting based on consent

## Integration with Existing Error Boundary

The enhanced error reporting integrates seamlessly with the existing ErrorBoundary component:

```typescript
// In ErrorBoundary component
const handleError = (error: Error, errorInfo: ErrorInfo) => {
  if (errorReportService.isErrorReportingEnabled()) {
    try {
      const report = errorReportService.generateReport(error, errorInfo);
      errorReportService.submitReport(report);
    } catch (consentError) {
      // Show consent modal if needed
      setShowConsentModal(true);
    }
  }
};
```

## Best Practices

1. **Always Check Consent**: Verify consent before collecting any error data
2. **Sanitize Early**: Apply sanitization as close to data collection as possible
3. **Validate Input**: Always validate error report structure before processing
4. **Respect Retention**: Automatically clean up expired data
5. **Be Transparent**: Clearly communicate data collection practices to users
6. **Regular Updates**: Keep consent versions current with privacy policy changes

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **2.3**: Comprehensive error data collection with privacy compliance
- **2.4**: User consent mechanisms for error reporting  
- **3.1**: Detailed error logging with sanitization and validation

The system provides a robust, privacy-compliant error reporting solution that respects user preferences while maintaining the ability to collect useful debugging information.