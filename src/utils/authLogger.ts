/**
 * Authentication Logging Utility
 * Provides structured logging for authentication events, errors, and monitoring
 */

export interface AuthLogContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
  requestId?: string;
}

export interface TokenValidationLogEntry {
  event: 'TOKEN_VALIDATION';
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context: AuthLogContext;
  details: {
    tokenPresent: boolean;
    validationResult?: 'VALID' | 'INVALID_FORMAT' | 'DECODE_ERROR' | 'EXPIRED' | 'MALFORMED';
    errorType?: string;
    errorMessage?: string;
    tokenLength?: number;
    expiresAt?: string;
    issuedAt?: string;
    validationDuration?: number;
  };
}

export interface TokenRefreshLogEntry {
  event: 'TOKEN_REFRESH';
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context: AuthLogContext;
  details: {
    refreshTrigger: 'SCHEDULED' | 'MANUAL' | 'EXPIRED' | 'ERROR_RECOVERY';
    refreshResult: 'SUCCESS' | 'FAILED' | 'DEBOUNCED' | 'IN_PROGRESS';
    retryCount?: number;
    maxRetries?: number;
    backoffDelay?: number;
    refreshDuration?: number;
    errorMessage?: string;
    newTokenExpiresAt?: string;
  };
}

export interface AuthErrorLogEntry {
  event: 'AUTH_ERROR';
  level: 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  context: AuthLogContext;
  details: {
    errorType: string;
    errorMessage: string;
    recoveryAction?: string;
    retryCount: number;
    maxRetries: number;
    shouldRetry: boolean;
    consecutiveFailures?: number;
    lastRecoveryAttempt?: string;
    stackTrace?: string;
  };
}

export interface AuthEventLogEntry {
  event: 'AUTH_EVENT';
  level: 'INFO' | 'WARN';
  message: string;
  context: AuthLogContext;
  details: {
    eventType: 'LOGIN' | 'LOGOUT' | 'PROFILE_UPDATE' | 'PASSWORD_CHANGE' | 'SESSION_INIT' | 'ERROR_RECOVERY';
    success: boolean;
    duration?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  };
}

export type AuthLogEntry = TokenValidationLogEntry | TokenRefreshLogEntry | AuthErrorLogEntry | AuthEventLogEntry;

export interface AuthErrorPattern {
  errorType: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  frequency: number; // errors per minute
  isEscalating: boolean;
}

export interface AuthLoggerConfig {
  enableConsoleLogging: boolean;
  enableStructuredLogging: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  maxLogEntries: number;
  errorPatternWindow: number; // minutes
  escalationThreshold: number; // errors per minute
}

/**
 * Authentication Logger Class
 */
export class AuthLogger {
  private logEntries: AuthLogEntry[] = [];
  private errorPatterns: Map<string, AuthErrorPattern> = new Map();
  private config: AuthLoggerConfig;

  constructor(config: Partial<AuthLoggerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableStructuredLogging: true,
      logLevel: 'INFO',
      maxLogEntries: 1000,
      errorPatternWindow: 10, // 10 minutes
      escalationThreshold: 5, // 5 errors per minute
      ...config,
    };
  }

  /**
   * Create base auth context
   */
  private createBaseContext(): AuthLogContext {
    return {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      sessionId: this.generateSessionId(),
    };
  }

  /**
   * Generate session ID for tracking
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if log level should be processed
   */
  private shouldLog(level: string): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= configLevelIndex;
  }

  /**
   * Add log entry to internal storage
   */
  private addLogEntry(entry: AuthLogEntry): void {
    if (!this.config.enableStructuredLogging) {
      return;
    }

    this.logEntries.push(entry);

    // Maintain max log entries limit
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    // Update error patterns for monitoring
    if (entry.event === 'AUTH_ERROR') {
      this.updateErrorPattern(entry as AuthErrorLogEntry);
    }
  }

  /**
   * Output log to console if enabled
   */
  private outputToConsole(entry: AuthLogEntry): void {
    if (!this.config.enableConsoleLogging || !this.shouldLog(entry.level)) {
      return;
    }

    const logMessage = `[${entry.context.timestamp}] ${entry.event} - ${entry.message}`;
    const logDetails = { context: entry.context, details: entry.details };

    switch (entry.level) {
      case 'ERROR':
      case 'CRITICAL':
        console.error(logMessage, logDetails);
        break;
      case 'WARN':
        console.warn(logMessage, logDetails);
        break;
      case 'INFO':
      default:
        console.log(logMessage, logDetails);
        break;
    }
  }

  /**
   * Update error pattern tracking for monitoring
   */
  private updateErrorPattern(errorEntry: AuthErrorLogEntry): void {
    const errorType = errorEntry.details.errorType;
    const now = new Date();
    
    let pattern = this.errorPatterns.get(errorType);
    
    if (!pattern) {
      pattern = {
        errorType,
        count: 0,
        firstOccurrence: now,
        lastOccurrence: now,
        frequency: 0,
        isEscalating: false,
      };
      this.errorPatterns.set(errorType, pattern);
    }

    pattern.count++;
    pattern.lastOccurrence = now;

    // Calculate frequency (errors per minute)
    const windowMs = this.config.errorPatternWindow * 60 * 1000;
    const timeDiff = now.getTime() - pattern.firstOccurrence.getTime();
    
    if (timeDiff > 0) {
      pattern.frequency = (pattern.count / timeDiff) * 60 * 1000; // errors per minute
      pattern.isEscalating = pattern.frequency > this.config.escalationThreshold;
    }

    // Clean up old patterns outside the window
    this.cleanupOldPatterns();
  }

  /**
   * Clean up error patterns outside the monitoring window
   */
  private cleanupOldPatterns(): void {
    const now = new Date();
    const windowMs = this.config.errorPatternWindow * 60 * 1000;

    for (const [errorType, pattern] of this.errorPatterns.entries()) {
      const timeSinceLastOccurrence = now.getTime() - pattern.lastOccurrence.getTime();
      
      if (timeSinceLastOccurrence > windowMs) {
        this.errorPatterns.delete(errorType);
      }
    }
  }

  /**
   * Log token validation events
   */
  logTokenValidation(
    result: 'VALID' | 'INVALID_FORMAT' | 'DECODE_ERROR' | 'EXPIRED' | 'MALFORMED',
    details: {
      tokenPresent: boolean;
      errorMessage?: string;
      tokenLength?: number;
      expiresAt?: Date;
      issuedAt?: Date;
      validationStartTime?: number;
    },
    context: Partial<AuthLogContext> = {}
  ): void {
    const validationDuration = details.validationStartTime 
      ? Date.now() - details.validationStartTime 
      : undefined;

    const level = result === 'VALID' ? 'INFO' : 'WARN';
    const message = result === 'VALID' 
      ? 'Token validation successful'
      : `Token validation failed: ${result}`;

    const logEntry: TokenValidationLogEntry = {
      event: 'TOKEN_VALIDATION',
      level,
      message,
      context: { ...this.createBaseContext(), ...context },
      details: {
        tokenPresent: details.tokenPresent,
        validationResult: result,
        errorMessage: details.errorMessage,
        tokenLength: details.tokenLength,
        expiresAt: details.expiresAt?.toISOString(),
        issuedAt: details.issuedAt?.toISOString(),
        validationDuration,
      },
    };

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  /**
   * Log token refresh events
   */
  logTokenRefresh(
    trigger: 'SCHEDULED' | 'MANUAL' | 'EXPIRED' | 'ERROR_RECOVERY',
    result: 'SUCCESS' | 'FAILED' | 'DEBOUNCED' | 'IN_PROGRESS',
    details: {
      retryCount?: number;
      maxRetries?: number;
      backoffDelay?: number;
      refreshStartTime?: number;
      errorMessage?: string;
      newTokenExpiresAt?: Date;
    },
    context: Partial<AuthLogContext> = {}
  ): void {
    const refreshDuration = details.refreshStartTime 
      ? Date.now() - details.refreshStartTime 
      : undefined;

    const level = result === 'SUCCESS' ? 'INFO' : 
                 result === 'DEBOUNCED' || result === 'IN_PROGRESS' ? 'WARN' : 'ERROR';
    
    const message = `Token refresh ${result.toLowerCase()}: ${trigger.toLowerCase()} trigger`;

    const logEntry: TokenRefreshLogEntry = {
      event: 'TOKEN_REFRESH',
      level,
      message,
      context: { ...this.createBaseContext(), ...context },
      details: {
        refreshTrigger: trigger,
        refreshResult: result,
        retryCount: details.retryCount,
        maxRetries: details.maxRetries,
        backoffDelay: details.backoffDelay,
        refreshDuration,
        errorMessage: details.errorMessage,
        newTokenExpiresAt: details.newTokenExpiresAt?.toISOString(),
      },
    };

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  /**
   * Log authentication errors
   */
  logAuthError(
    errorType: string,
    errorMessage: string,
    details: {
      recoveryAction?: string;
      retryCount: number;
      maxRetries: number;
      shouldRetry: boolean;
      consecutiveFailures?: number;
      lastRecoveryAttempt?: Date;
      stackTrace?: string;
    },
    context: Partial<AuthLogContext> = {}
  ): void {
    const level = details.consecutiveFailures && details.consecutiveFailures > 3 ? 'CRITICAL' : 'ERROR';
    const message = `Authentication error: ${errorType} - ${errorMessage}`;

    const logEntry: AuthErrorLogEntry = {
      event: 'AUTH_ERROR',
      level,
      message,
      context: { ...this.createBaseContext(), ...context },
      details: {
        errorType,
        errorMessage,
        recoveryAction: details.recoveryAction,
        retryCount: details.retryCount,
        maxRetries: details.maxRetries,
        shouldRetry: details.shouldRetry,
        consecutiveFailures: details.consecutiveFailures,
        lastRecoveryAttempt: details.lastRecoveryAttempt?.toISOString(),
        stackTrace: details.stackTrace,
      },
    };

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  /**
   * Log general authentication events
   */
  logAuthEvent(
    eventType: 'LOGIN' | 'LOGOUT' | 'PROFILE_UPDATE' | 'PASSWORD_CHANGE' | 'SESSION_INIT' | 'ERROR_RECOVERY',
    success: boolean,
    details: {
      duration?: number;
      errorMessage?: string;
      metadata?: Record<string, any>;
    } = {},
    context: Partial<AuthLogContext> = {}
  ): void {
    const level = success ? 'INFO' : 'WARN';
    const message = `${eventType.toLowerCase().replace('_', ' ')} ${success ? 'successful' : 'failed'}`;

    const logEntry: AuthEventLogEntry = {
      event: 'AUTH_EVENT',
      level,
      message,
      context: { ...this.createBaseContext(), ...context },
      details: {
        eventType,
        success,
        duration: details.duration,
        errorMessage: details.errorMessage,
        metadata: details.metadata,
      },
    };

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  /**
   * Get current error patterns for monitoring
   */
  getErrorPatterns(): AuthErrorPattern[] {
    this.cleanupOldPatterns();
    return Array.from(this.errorPatterns.values());
  }

  /**
   * Get escalating error patterns
   */
  getEscalatingPatterns(): AuthErrorPattern[] {
    return this.getErrorPatterns().filter(pattern => pattern.isEscalating);
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 50): AuthLogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get logs by event type
   */
  getLogsByEvent(eventType: AuthLogEntry['event'], count: number = 50): AuthLogEntry[] {
    return this.logEntries
      .filter(entry => entry.event === eventType)
      .slice(-count);
  }

  /**
   * Get error logs only
   */
  getErrorLogs(count: number = 50): AuthLogEntry[] {
    return this.logEntries
      .filter(entry => entry.level === 'ERROR' || entry.level === 'CRITICAL')
      .slice(-count);
  }

  /**
   * Clear all logs and patterns
   */
  clearLogs(): void {
    this.logEntries = [];
    this.errorPatterns.clear();
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logEntries,
      errorPatterns: Array.from(this.errorPatterns.entries()),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// Create default logger instance
export const authLogger = new AuthLogger();

// Export utility functions for direct use
export const logTokenValidation = authLogger.logTokenValidation.bind(authLogger);
export const logTokenRefresh = authLogger.logTokenRefresh.bind(authLogger);
export const logAuthError = authLogger.logAuthError.bind(authLogger);
export const logAuthEvent = authLogger.logAuthEvent.bind(authLogger);