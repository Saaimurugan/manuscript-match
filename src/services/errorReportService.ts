/**
 * Error Report Service
 * Handles comprehensive error reporting, data collection, and submission
 */

import type { ErrorInfo } from 'react';
import { errorReportValidator, type ValidationResult } from './errorReportValidation';
import { errorReportConsentManager, type ConsentLevel } from './errorReportConsent';

// Error Report Data Interface
export interface ErrorReportData {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  additionalContext?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'syntax' | 'runtime' | 'network' | 'user' | 'system';
  userDescription?: string;
}

// Error Context Interface
export interface ErrorContext {
  component?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  route: string;
  timestamp: string;
  userActions: Array<{
    action: string;
    timestamp: string;
    target?: string;
  }>;
}

// Report Submission Result
export interface ReportSubmissionResult {
  success: boolean;
  reportId?: string;
  error?: string;
  retryAfter?: number;
}

// Local Storage Keys
const STORAGE_KEYS = {
  PENDING_REPORTS: 'errorReports_pending',
  FAILED_REPORTS: 'errorReports_failed',
  SESSION_ID: 'errorReports_sessionId',
  USER_ACTIONS: 'errorReports_userActions',
} as const;

export class ErrorReportService {
  private sessionId: string;
  private userActions: Array<{ action: string; timestamp: string; target?: string }> = [];
  private maxUserActions = 50;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.loadUserActions();
    this.setupUserActionTracking();
    this.processFailedReports();
  }

  /**
   * Generate comprehensive error report data with validation and consent checks
   */
  generateReport(error: Error, errorInfo?: ErrorInfo, additionalContext?: Record<string, any>): ErrorReportData {
    // Check if error reporting is allowed
    if (!errorReportConsentManager.isErrorReportingAllowed()) {
      throw new Error('Error reporting not allowed - user consent required');
    }
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // Determine error severity and category
    const severity = this.determineSeverity(error);
    const category = this.categorizeError(error);

    // Build report data based on consent level
    const consentStatus = errorReportConsentManager.getConsentStatus();
    const config = consentStatus.config;

    const reportData: ErrorReportData = {
      errorId,
      message: error.message,
      timestamp,
      sessionId: this.sessionId,
      severity,
      category,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Add stack trace if allowed
    if (config?.includeStackTraces) {
      reportData.stack = error.stack;
      reportData.componentStack = errorInfo?.componentStack;
    }

    // Add system information if allowed
    if (config?.includeSystemInfo) {
      reportData.additionalContext = {
        ...additionalContext,
        route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight,
        } : { width: 0, height: 0 },
        timestamp: timestamp,
      };
    }

    // Add user actions if allowed
    if (config?.includeUserActions) {
      if (!reportData.additionalContext) {
        reportData.additionalContext = {};
      }
      reportData.additionalContext.userActions = this.userActions.slice(-10);
    }

    // Add user ID if personal info is allowed
    if (config?.includePersonalInfo) {
      const userId = this.getUserId();
      if (userId) {
        reportData.userId = userId;
      }
    }

    // Validate and sanitize the report
    const validationResult = errorReportValidator.validateErrorReport(reportData);
    
    if (!validationResult.isValid) {
      console.warn('Error report validation failed:', validationResult.errors);
      // Continue with sanitized version even if validation fails
    }

    if (validationResult.warnings.length > 0) {
      console.warn('Error report validation warnings:', validationResult.warnings);
    }

    // Always sanitize the report data
    const sanitizedReport = errorReportValidator.sanitizeErrorReport(reportData);

    return sanitizedReport;
  }

  /**
   * Submit error report with retry mechanism and consent validation
   */
  async submitReport(reportData: ErrorReportData, userDescription?: string): Promise<ReportSubmissionResult> {
    // Check if error reporting is allowed
    if (!errorReportConsentManager.isErrorReportingAllowed()) {
      return {
        success: false,
        error: 'Error reporting not allowed - user consent required',
      };
    }

    // Add user description if provided
    if (userDescription) {
      reportData.userDescription = userDescription;
    }

    // Validate the report data
    const validationResult = errorReportValidator.validateErrorReport(reportData);
    
    if (!validationResult.isValid) {
      return {
        success: false,
        error: `Report validation failed: ${validationResult.errors.join(', ')}`,
      };
    }

    // Sanitize the report data
    const sanitizedReport = errorReportValidator.sanitizeErrorReport(reportData);

    try {
      // Try to submit immediately
      const result = await this.sendReportToService(sanitizedReport);
      
      if (result.success) {
        // Remove from failed reports if it was there
        this.removeFromFailedReports(reportData.errorId);
        return result;
      } else {
        // Save to failed reports for retry
        this.saveToFailedReports(sanitizedReport);
        return result;
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      
      // Save to failed reports for retry
      this.saveToFailedReports(sanitizedReport);
      
      return {
        success: false,
        error: 'Failed to submit report. It will be retried automatically.',
      };
    }
  }

  /**
   * Save report to local storage as backup
   */
  saveReportLocally(reportData: ErrorReportData): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const pendingReports = this.getPendingReports();
      pendingReports.push(reportData);
      
      // Keep only the last 10 reports to avoid storage bloat
      const recentReports = pendingReports.slice(-10);
      
      localStorage.setItem(STORAGE_KEYS.PENDING_REPORTS, JSON.stringify(recentReports));
    } catch (error) {
      console.error('Failed to save report locally:', error);
    }
  }

  /**
   * Get pending reports from local storage
   */
  getPendingReports(): ErrorReportData[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get pending reports:', error);
      return [];
    }
  }

  /**
   * Process failed reports with retry mechanism
   */
  private async processFailedReports(): Promise<void> {
    const failedReports = this.getFailedReports();
    
    for (const report of failedReports) {
      try {
        const result = await this.sendReportToService(report);
        if (result.success) {
          this.removeFromFailedReports(report.errorId);
        }
      } catch (error) {
        console.error('Failed to retry report submission:', error);
      }
    }
  }

  /**
   * Send report to external service (email, API, etc.) with consent validation
   */
  private async sendReportToService(reportData: ErrorReportData): Promise<ReportSubmissionResult> {
    // Check if external reporting is allowed
    const canSendExternal = errorReportConsentManager.isExternalReportingAllowed();
    
    // In development, just log the report
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      console.group('🐛 Error Report Generated');
      console.log('Report ID:', reportData.errorId);
      console.log('Severity:', reportData.severity);
      console.log('Category:', reportData.category);
      console.log('Message:', reportData.message);
      console.log('External Reporting Allowed:', canSendExternal);
      console.log('Full Report:', reportData);
      console.groupEnd();
      
      return {
        success: true,
        reportId: reportData.errorId,
      };
    }

    // In production, check consent before sending externally
    if (!canSendExternal) {
      // Store locally only
      this.saveReportLocally(reportData);
      return {
        success: true,
        reportId: reportData.errorId,
        error: 'Report saved locally - external reporting not permitted',
      };
    }

    // Send to actual error tracking service
    try {
      // Example: Send to your backend API
      const response = await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          reportId: result.reportId || reportData.errorId,
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      // Fallback: Create mailto link for manual reporting
      this.createEmailReport(reportData);
      
      return {
        success: false,
        error: 'Network error. Email report created as fallback.',
      };
    }
  }

  /**
   * Create email report as fallback
   */
  private createEmailReport(reportData: ErrorReportData): void {
    const subject = encodeURIComponent(`Bug Report - ${reportData.errorId}`);
    const body = encodeURIComponent(`
Error Report Details:
${JSON.stringify(reportData, null, 2)}

User Description:
${reportData.userDescription || '[No description provided]'}
    `);
    
    // Store the mailto link for later use
    const mailtoLink = `mailto:support@scholarfinder.com?subject=${subject}&body=${body}`;
    
    // You could also automatically open this or store it for the user
    console.log('Email report link created:', mailtoLink);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `error_${timestamp}_${random}`;
  }

  /**
   * Determine error severity based on error characteristics
   */
  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (message.includes('syntax') || message.includes('reference') || message.includes('type')) {
      return 'critical';
    }

    // High severity errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'high';
    }

    // Medium severity errors
    if (message.includes('validation') || message.includes('permission')) {
      return 'medium';
    }

    // Default to medium for unknown errors
    return 'medium';
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): 'syntax' | 'runtime' | 'network' | 'user' | 'system' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('syntax') || message.includes('unexpected token')) {
      return 'syntax';
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return 'user';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'system';
    }

    return 'runtime';
  }

  /**
   * Sanitize report data to remove sensitive information
   */
  private sanitizeReportData(reportData: ErrorReportData): ErrorReportData {
    const sanitized = { ...reportData };

    // Remove sensitive patterns from stack traces
    if (sanitized.stack) {
      sanitized.stack = this.sanitizeString(sanitized.stack);
    }

    if (sanitized.componentStack) {
      sanitized.componentStack = this.sanitizeString(sanitized.componentStack);
    }

    // Sanitize additional context
    if (sanitized.additionalContext) {
      sanitized.additionalContext = this.sanitizeObject(sanitized.additionalContext);
    }

    return sanitized;
  }

  /**
   * Sanitize string to remove sensitive information
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]')
      .replace(/password[=:]\s*[^\s&]+/gi, 'password=[REDACTED]')
      .replace(/token[=:]\s*[^\s&]+/gi, 'token=[REDACTED]');
  }

  /**
   * Sanitize object to remove sensitive information
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Skip sensitive keys
      if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    if (typeof localStorage === 'undefined') {
      return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    
    return sessionId;
  }

  /**
   * Get user ID from authentication context or localStorage
   */
  private getUserId(): string | undefined {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }

    // Try to get from localStorage or other auth storage
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return undefined;
  }

  /**
   * Setup user action tracking
   */
  private setupUserActionTracking(): void {
    // Only setup tracking in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Track clicks
    document.addEventListener('click', (event) => {
      this.trackUserAction('click', event.target as Element);
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      this.trackUserAction('navigation', null, { url: window.location.href });
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackUserAction('error', null, { 
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      });
    });
  }

  /**
   * Track user action
   */
  private trackUserAction(action: string, target?: Element | null, details?: any): void {
    const actionData = {
      action,
      timestamp: new Date().toISOString(),
      target: target ? this.getElementSelector(target) : undefined,
      ...details,
    };

    this.userActions.push(actionData);

    // Keep only recent actions
    if (this.userActions.length > this.maxUserActions) {
      this.userActions = this.userActions.slice(-this.maxUserActions);
    }

    // Save to localStorage
    this.saveUserActions();
  }

  /**
   * Get CSS selector for element
   */
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Load user actions from localStorage
   */
  private loadUserActions(): void {
    if (typeof localStorage === 'undefined') {
      this.userActions = [];
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_ACTIONS);
      if (stored) {
        this.userActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user actions:', error);
      this.userActions = [];
    }
  }

  /**
   * Save user actions to localStorage
   */
  private saveUserActions(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.USER_ACTIONS, JSON.stringify(this.userActions));
    } catch (error) {
      console.error('Failed to save user actions:', error);
    }
  }

  /**
   * Get failed reports from localStorage
   */
  private getFailedReports(): ErrorReportData[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAILED_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get failed reports:', error);
      return [];
    }
  }

  /**
   * Save report to failed reports
   */
  private saveToFailedReports(reportData: ErrorReportData): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const failedReports = this.getFailedReports();
      failedReports.push(reportData);
      
      // Keep only the last 5 failed reports
      const recentFailed = failedReports.slice(-5);
      
      localStorage.setItem(STORAGE_KEYS.FAILED_REPORTS, JSON.stringify(recentFailed));
    } catch (error) {
      console.error('Failed to save to failed reports:', error);
    }
  }

  /**
   * Remove report from failed reports
   */
  private removeFromFailedReports(errorId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const failedReports = this.getFailedReports();
      const filtered = failedReports.filter(report => report.errorId !== errorId);
      localStorage.setItem(STORAGE_KEYS.FAILED_REPORTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from failed reports:', error);
    }
  }

  /**
   * Check if error reporting is enabled based on user consent
   */
  isErrorReportingEnabled(): boolean {
    return errorReportConsentManager.isErrorReportingAllowed();
  }

  /**
   * Get current consent status
   */
  getConsentStatus() {
    return errorReportConsentManager.getConsentStatus();
  }

  /**
   * Set user consent level
   */
  setConsentLevel(level: ConsentLevel) {
    return errorReportConsentManager.setConsentLevel(level);
  }

  /**
   * Get validation result for a report
   */
  validateReport(reportData: ErrorReportData): ValidationResult {
    return errorReportValidator.validateErrorReport(reportData);
  }

  /**
   * Sanitize report data manually
   */
  sanitizeReport(reportData: ErrorReportData): ErrorReportData {
    return errorReportValidator.sanitizeErrorReport(reportData);
  }

  /**
   * Clean up expired data based on consent retention settings
   */
  cleanupExpiredData(): void {
    const retentionDays = errorReportConsentManager.getDataRetentionDays();
    
    if (retentionDays === 0) {
      // Clear all data if retention is 0
      this.clearAllStoredData();
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up pending reports
    const pendingReports = this.getPendingReports();
    const validReports = pendingReports.filter(report => {
      const reportDate = new Date(report.timestamp);
      return reportDate > cutoffDate;
    });

    if (validReports.length !== pendingReports.length) {
      try {
        localStorage.setItem(STORAGE_KEYS.PENDING_REPORTS, JSON.stringify(validReports));
      } catch (error) {
        console.error('Failed to cleanup pending reports:', error);
      }
    }

    // Clean up failed reports
    const failedReports = this.getFailedReports();
    const validFailedReports = failedReports.filter(report => {
      const reportDate = new Date(report.timestamp);
      return reportDate > cutoffDate;
    });

    if (validFailedReports.length !== failedReports.length) {
      try {
        localStorage.setItem(STORAGE_KEYS.FAILED_REPORTS, JSON.stringify(validFailedReports));
      } catch (error) {
        console.error('Failed to cleanup failed reports:', error);
      }
    }
  }

  /**
   * Clear all stored error report data
   */
  private clearAllStoredData(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_REPORTS);
      localStorage.removeItem(STORAGE_KEYS.FAILED_REPORTS);
      localStorage.removeItem(STORAGE_KEYS.USER_ACTIONS);
      this.userActions = [];
    } catch (error) {
      console.error('Failed to clear all stored data:', error);
    }
  }
}

// Create singleton instance
export const errorReportService = new ErrorReportService();

export default errorReportService;