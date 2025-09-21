/**
 * Error Report Validation and Sanitization
 * Provides comprehensive validation and sanitization for error reports
 * Ensures privacy compliance and data integrity
 */

import type { ErrorReportData } from './errorReportService';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Sanitization options
export interface SanitizationOptions {
  removePersonalInfo: boolean;
  removeCredentials: boolean;
  removeFileSystemPaths: boolean;
  removeIPAddresses: boolean;
  removePhoneNumbers: boolean;
  maxStackTraceLength: number;
  maxMessageLength: number;
  allowedDomains: string[];
}

// Default sanitization options
const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  removePersonalInfo: true,
  removeCredentials: true,
  removeFileSystemPaths: true,
  removeIPAddresses: true,
  removePhoneNumbers: true,
  maxStackTraceLength: 5000,
  maxMessageLength: 1000,
  allowedDomains: ['localhost', 'scholarfinder.com'],
};

// Sensitive data patterns
const SENSITIVE_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  PHONE: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  PASSWORD: /password[=:]\s*[^\s&]+/gi,
  TOKEN: /(?:token|key|secret|auth)[=:]\s*[^\s&]+/gi,
  API_KEY: /[a-zA-Z0-9]{32,}/g,
  FILE_PATH: /[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g,
  UNIX_PATH: /\/(?:[^\/\s]+\/)*[^\/\s]+/g,
};

// Sensitive field names
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'authorization',
  'credential',
  'session',
  'cookie',
  'csrf',
  'jwt',
  'bearer',
  'api_key',
  'access_token',
  'refresh_token',
];

export class ErrorReportValidator {
  private options: SanitizationOptions;

  constructor(options: Partial<SanitizationOptions> = {}) {
    this.options = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };
  }

  /**
   * Validate error report data structure and content
   */
  validateErrorReport(reportData: ErrorReportData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!reportData.errorId || typeof reportData.errorId !== 'string') {
      errors.push('errorId is required and must be a string');
    }

    if (!reportData.message || typeof reportData.message !== 'string') {
      errors.push('message is required and must be a string');
    }

    if (!reportData.timestamp || !this.isValidTimestamp(reportData.timestamp)) {
      errors.push('timestamp is required and must be a valid ISO string');
    }

    if (!reportData.sessionId || typeof reportData.sessionId !== 'string') {
      errors.push('sessionId is required and must be a string');
    }

    // URL validation
    if (reportData.url && !this.isValidURL(reportData.url)) {
      warnings.push('url appears to be invalid');
    }

    // Severity validation
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (reportData.severity && !validSeverities.includes(reportData.severity)) {
      errors.push(`severity must be one of: ${validSeverities.join(', ')}`);
    }

    // Category validation
    const validCategories = ['syntax', 'runtime', 'network', 'user', 'system'];
    if (reportData.category && !validCategories.includes(reportData.category)) {
      errors.push(`category must be one of: ${validCategories.join(', ')}`);
    }

    // Content length validation
    if (reportData.message && reportData.message.length > this.options.maxMessageLength) {
      warnings.push(`message exceeds maximum length of ${this.options.maxMessageLength} characters`);
    }

    if (reportData.stack && reportData.stack.length > this.options.maxStackTraceLength) {
      warnings.push(`stack trace exceeds maximum length of ${this.options.maxStackTraceLength} characters`);
    }

    // Check for potentially sensitive data
    const sensitiveDataWarnings = this.checkForSensitiveData(reportData);
    warnings.push(...sensitiveDataWarnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize error report data to remove sensitive information
   */
  sanitizeErrorReport(reportData: ErrorReportData): ErrorReportData {
    const sanitized: ErrorReportData = {
      ...reportData,
    };

    // Sanitize message
    if (sanitized.message) {
      sanitized.message = this.sanitizeString(sanitized.message);
      sanitized.message = this.truncateString(sanitized.message, this.options.maxMessageLength);
    }

    // Sanitize stack trace
    if (sanitized.stack) {
      sanitized.stack = this.sanitizeString(sanitized.stack);
      sanitized.stack = this.truncateString(sanitized.stack, this.options.maxStackTraceLength);
    }

    // Sanitize component stack
    if (sanitized.componentStack) {
      sanitized.componentStack = this.sanitizeString(sanitized.componentStack);
    }

    // Sanitize URL
    if (sanitized.url) {
      sanitized.url = this.sanitizeURL(sanitized.url);
    }

    // Sanitize user agent
    if (sanitized.userAgent) {
      sanitized.userAgent = this.sanitizeUserAgent(sanitized.userAgent);
    }

    // Sanitize additional context
    if (sanitized.additionalContext) {
      sanitized.additionalContext = this.sanitizeObject(sanitized.additionalContext);
    }

    // Sanitize user description
    if (sanitized.userDescription) {
      sanitized.userDescription = this.sanitizeString(sanitized.userDescription);
    }

    // Remove user ID if not explicitly allowed
    if (sanitized.userId && !this.isUserIdAllowed(sanitized.userId)) {
      delete sanitized.userId;
    }

    return sanitized;
  }

  /**
   * Sanitize string content
   */
  private sanitizeString(str: string): string {
    let sanitized = str;

    if (this.options.removePersonalInfo) {
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.EMAIL, '[EMAIL_REDACTED]');
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.CREDIT_CARD, '[CARD_REDACTED]');
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.SSN, '[SSN_REDACTED]');
    }

    if (this.options.removePhoneNumbers) {
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.PHONE, '[PHONE_REDACTED]');
    }

    if (this.options.removeCredentials) {
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.PASSWORD, 'password=[REDACTED]');
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.TOKEN, 'token=[REDACTED]');
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.API_KEY, '[API_KEY_REDACTED]');
    }

    if (this.options.removeFileSystemPaths) {
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.FILE_PATH, '[PATH_REDACTED]');
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.UNIX_PATH, '[PATH_REDACTED]');
    }

    if (this.options.removeIPAddresses) {
      sanitized = sanitized.replace(SENSITIVE_PATTERNS.IP_ADDRESS, '[IP_REDACTED]');
    }

    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any, depth = 0): any {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        return this.sanitizeString(obj);
      }
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field name is sensitive
      if (this.isSensitiveField(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize URL to remove sensitive query parameters
   */
  private sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Check if domain is allowed
      if (!this.isDomainAllowed(urlObj.hostname)) {
        return '[EXTERNAL_URL_REDACTED]';
      }

      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'key', 'secret', 'auth', 'password', 'session'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, sanitize as string
      return this.sanitizeString(url);
    }
  }

  /**
   * Sanitize user agent to remove potentially identifying information
   */
  private sanitizeUserAgent(userAgent: string): string {
    // Keep basic browser and OS info, remove detailed version numbers
    return userAgent
      .replace(/\d+\.\d+\.\d+\.\d+/g, 'X.X.X.X') // Version numbers
      .replace(/\b\d{10,}\b/g, '[ID_REDACTED]'); // Long numeric IDs
  }

  /**
   * Check for sensitive data in the report
   */
  private checkForSensitiveData(reportData: ErrorReportData): string[] {
    const warnings: string[] = [];
    const content = JSON.stringify(reportData);

    if (SENSITIVE_PATTERNS.EMAIL.test(content)) {
      warnings.push('Report may contain email addresses');
    }

    if (SENSITIVE_PATTERNS.CREDIT_CARD.test(content)) {
      warnings.push('Report may contain credit card numbers');
    }

    if (SENSITIVE_PATTERNS.SSN.test(content)) {
      warnings.push('Report may contain social security numbers');
    }

    if (SENSITIVE_PATTERNS.PHONE.test(content)) {
      warnings.push('Report may contain phone numbers');
    }

    if (SENSITIVE_PATTERNS.PASSWORD.test(content)) {
      warnings.push('Report may contain passwords');
    }

    if (SENSITIVE_PATTERNS.TOKEN.test(content)) {
      warnings.push('Report may contain tokens or secrets');
    }

    return warnings;
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    return SENSITIVE_FIELDS.some(sensitive => 
      fieldName.includes(sensitive) || sensitive.includes(fieldName)
    );
  }

  /**
   * Check if domain is allowed
   */
  private isDomainAllowed(domain: string): boolean {
    return this.options.allowedDomains.some(allowed => 
      domain === allowed || domain.endsWith(`.${allowed}`)
    );
  }

  /**
   * Check if user ID is allowed to be included
   */
  private isUserIdAllowed(userId: string): boolean {
    // Only allow user IDs that don't look like sensitive data
    return !SENSITIVE_PATTERNS.EMAIL.test(userId) && 
           !SENSITIVE_PATTERNS.PHONE.test(userId) &&
           userId.length < 100; // Reasonable length limit
  }

  /**
   * Validate timestamp format
   */
  private isValidTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) && timestamp === date.toISOString();
    } catch {
      return false;
    }
  }

  /**
   * Validate URL format
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Truncate string to maximum length
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}

// Create default validator instance
export const errorReportValidator = new ErrorReportValidator();

export default errorReportValidator;