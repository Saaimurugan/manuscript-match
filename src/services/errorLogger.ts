/**
 * Error Logger Utility
 * Provides comprehensive error logging for development and production environments
 * with structured data formatting and external service integration points
 */

import type { ErrorInfo } from 'react';

// Log Level Enumeration
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

// Log Entry Interface
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: Error;
  errorInfo?: ErrorInfo;
  context?: Record<string, any>;
  environment: 'development' | 'production' | 'test';
  source: string;
  userId?: string;
  sessionId: string;
  url?: string;
  userAgent?: string;
  stackTrace?: string;
  componentStack?: string;
}

// Logger Configuration Interface
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  enableLocalStorage: boolean;
  maxLocalStorageEntries: number;
  remoteEndpoint?: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number;
  enableStackTrace: boolean;
  enableUserTracking: boolean;
}

// External Service Integration Interface
export interface ExternalLogService {
  name: string;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  formatPayload: (entries: LogEntry[]) => any;
  enabled: boolean;
}

// Safe environment variable access for browser
const getEnvVar = (key: string, defaultValue?: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || defaultValue;
  }
  return defaultValue;
};

const getNodeEnv = (): string => {
  return getEnvVar('NODE_ENV') || 'development';
};

// Default Configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: getNodeEnv() === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
  enableConsoleLogging: true,
  enableRemoteLogging: getNodeEnv() === 'production',
  enableLocalStorage: true,
  maxLocalStorageEntries: 100,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  enableStackTrace: true,
  enableUserTracking: true,
};

// Local Storage Keys
const STORAGE_KEYS = {
  LOG_ENTRIES: 'errorLogger_entries',
  SESSION_ID: 'errorLogger_sessionId',
  CONFIG: 'errorLogger_config',
} as const;

export class ErrorLogger {
  private config: LoggerConfig;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private externalServices: ExternalLogService[] = [];
  private isInitialized = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Initialize the logger
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Load persisted configuration
    this.loadPersistedConfig();

    // Setup automatic flushing
    if (this.config.enableRemoteLogging && this.config.flushInterval > 0) {
      this.setupAutoFlush();
    }

    // Setup error handlers
    this.setupGlobalErrorHandlers();

    this.isInitialized = true;
    this.debug('ErrorLogger initialized', { config: this.config });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>, source = 'ErrorLogger'): void {
    this.log(LogLevel.DEBUG, message, undefined, undefined, context, source);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>, source = 'ErrorLogger'): void {
    this.log(LogLevel.INFO, message, undefined, undefined, context, source);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>, source = 'ErrorLogger'): void {
    this.log(LogLevel.WARN, message, undefined, undefined, context, source);
  }

  /**
   * Log error
   */
  error(message: string, error?: Error, errorInfo?: ErrorInfo, context?: Record<string, any>, source = 'ErrorLogger'): void {
    this.log(LogLevel.ERROR, message, error, errorInfo, context, source);
  }

  /**
   * Log critical error
   */
  critical(message: string, error?: Error, errorInfo?: ErrorInfo, context?: Record<string, any>, source = 'ErrorLogger'): void {
    this.log(LogLevel.CRITICAL, message, error, errorInfo, context, source);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    errorInfo?: ErrorInfo,
    context?: Record<string, any>,
    source = 'ErrorLogger'
  ): void {
    // Check if we should log this level
    if (level < this.config.minLevel) {
      return;
    }

    // Create log entry
    const logEntry = this.createLogEntry(level, message, error, errorInfo, context, source);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // Add to buffer for remote logging
    if (this.config.enableRemoteLogging) {
      this.logBuffer.push(logEntry);

      // Flush immediately for critical errors
      if (level === LogLevel.CRITICAL) {
        this.flush();
      } else if (this.logBuffer.length >= this.config.batchSize) {
        this.flush();
      }
    }

    // Local storage logging
    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(logEntry);
    }
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    errorInfo?: ErrorInfo,
    context?: Record<string, any>,
    source = 'ErrorLogger'
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const id = this.generateLogId();

    const logEntry: LogEntry = {
      id,
      timestamp,
      level,
      message,
      error,
      errorInfo,
      context: this.sanitizeContext(context),
      environment: this.getEnvironment(),
      source,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Add stack trace if enabled and error is present
    if (this.config.enableStackTrace && error) {
      logEntry.stackTrace = error.stack;
    }

    // Add component stack if available
    if (errorInfo?.componentStack) {
      logEntry.componentStack = errorInfo.componentStack;
    }

    // Add user ID if tracking is enabled
    if (this.config.enableUserTracking) {
      logEntry.userId = this.getUserId();
    }

    return logEntry;
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(logEntry: LogEntry): void {
    const { level, message, error, context, source, timestamp } = logEntry;
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}] [${source}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context || '', error || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, context || '', error || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, context || '', error || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, context || '', error || '');
        if (error?.stack) {
          console.error('Stack trace:', error.stack);
        }
        break;
      case LogLevel.CRITICAL:
        console.error('🚨', prefix, message, context || '', error || '');
        if (error?.stack) {
          console.error('Stack trace:', error.stack);
        }
        if (logEntry.componentStack) {
          console.error('Component stack:', logEntry.componentStack);
        }
        break;
    }
  }

  /**
   * Log to local storage
   */
  private logToLocalStorage(logEntry: LogEntry): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const existingEntries = this.getLocalStorageEntries();
      existingEntries.push(this.serializeLogEntry(logEntry));

      // Keep only the most recent entries
      const recentEntries = existingEntries.slice(-this.config.maxLocalStorageEntries);

      localStorage.setItem(STORAGE_KEYS.LOG_ENTRIES, JSON.stringify(recentEntries));
    } catch (error) {
      console.error('Failed to save log entry to localStorage:', error);
    }
  }

  /**
   * Flush log buffer to external services
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entriesToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // Send to external services
    for (const service of this.externalServices) {
      if (service.enabled) {
        try {
          await this.sendToExternalService(service, entriesToFlush);
        } catch (error) {
          console.error(`Failed to send logs to ${service.name}:`, error);
          // Re-add failed entries to buffer for retry
          this.logBuffer.unshift(...entriesToFlush);
        }
      }
    }

    // Fallback: send to default endpoint if no external services configured
    if (this.externalServices.length === 0 && this.config.remoteEndpoint) {
      try {
        await this.sendToDefaultEndpoint(entriesToFlush);
      } catch (error) {
        console.error('Failed to send logs to default endpoint:', error);
        // Re-add failed entries to buffer for retry
        this.logBuffer.unshift(...entriesToFlush);
      }
    }
  }

  /**
   * Send logs to external service
   */
  private async sendToExternalService(service: ExternalLogService, entries: LogEntry[]): Promise<void> {
    const payload = service.formatPayload(entries);
    const headers = {
      'Content-Type': 'application/json',
      ...service.headers,
    };

    if (service.apiKey) {
      headers['Authorization'] = `Bearer ${service.apiKey}`;
    }

    const response = await fetch(service.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Send logs to default endpoint
   */
  private async sendToDefaultEndpoint(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entries: entries.map(entry => this.serializeLogEntry(entry)),
        metadata: {
          sessionId: this.sessionId,
          environment: this.getEnvironment(),
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Add external logging service
   */
  addExternalService(service: ExternalLogService): void {
    this.externalServices.push(service);
    this.debug('External logging service added', { serviceName: service.name });
  }

  /**
   * Remove external logging service
   */
  removeExternalService(serviceName: string): void {
    const index = this.externalServices.findIndex(service => service.name === serviceName);
    if (index !== -1) {
      this.externalServices.splice(index, 1);
      this.debug('External logging service removed', { serviceName });
    }
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.persistConfig();
    this.debug('Logger configuration updated', { config: this.config });

    // Restart auto-flush if interval changed
    if (newConfig.flushInterval !== undefined) {
      this.setupAutoFlush();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Get log entries from local storage
   */
  getLocalLogEntries(): LogEntry[] {
    const serializedEntries = this.getLocalStorageEntries();
    return serializedEntries.map(entry => this.deserializeLogEntry(entry));
  }

  /**
   * Clear local log entries
   */
  clearLocalLogEntries(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.LOG_ENTRIES);
    }
    this.debug('Local log entries cleared');
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): Record<string, number> {
    const entries = this.getLocalLogEntries();
    const stats: Record<string, number> = {
      total: entries.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };

    entries.forEach(entry => {
      const levelName = LogLevel[entry.level].toLowerCase();
      stats[levelName] = (stats[levelName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Setup automatic flushing
   */
  private setupAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(error => {
          console.error('Auto-flush failed:', error);
        });
      }, this.config.flushInterval);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.error(
        'Unhandled JavaScript error',
        new Error(event.message),
        undefined,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript',
        },
        'GlobalErrorHandler'
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        'Unhandled promise rejection',
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        undefined,
        {
          type: 'promise',
          reason: event.reason,
        },
        'GlobalErrorHandler'
      );
    });
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `log_${timestamp}_${random}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    if (typeof localStorage !== 'undefined') {
      let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
      }
      return sessionId;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get current environment
   */
  private getEnvironment(): 'development' | 'production' | 'test' {
    const nodeEnv = getNodeEnv();
    if (nodeEnv === 'test') return 'test';
    if (nodeEnv === 'production') return 'production';
    return 'development';
  }

  /**
   * Get user ID from authentication context
   */
  private getUserId(): string | undefined {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }

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
   * Sanitize context data to remove sensitive information
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();

      // Skip sensitive keys
      if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
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
   * Serialize log entry for storage
   */
  private serializeLogEntry(entry: LogEntry): any {
    return {
      ...entry,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
    };
  }

  /**
   * Deserialize log entry from storage
   */
  private deserializeLogEntry(serialized: any): LogEntry {
    return {
      ...serialized,
      error: serialized.error ? new Error(serialized.error.message) : undefined,
    };
  }

  /**
   * Get entries from local storage
   */
  private getLocalStorageEntries(): any[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOG_ENTRIES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get log entries from localStorage:', error);
      return [];
    }
  }

  /**
   * Load persisted configuration
   */
  private loadPersistedConfig(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        const persistedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...persistedConfig };
      }
    } catch (error) {
      console.error('Failed to load persisted config:', error);
    }
  }

  /**
   * Persist configuration to local storage
   */
  private persistConfig(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to persist config:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush any remaining logs
    this.flush().catch(error => {
      console.error('Final flush failed:', error);
    });

    this.isInitialized = false;
    this.debug('ErrorLogger destroyed');
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export commonly used external service configurations
export const ExternalServices = {
  // Sentry configuration example
  Sentry: (dsn: string): ExternalLogService => ({
    name: 'Sentry',
    endpoint: dsn,
    enabled: true,
    formatPayload: (entries: LogEntry[]) => ({
      entries: entries.map(entry => ({
        message: entry.message,
        level: LogLevel[entry.level].toLowerCase(),
        timestamp: entry.timestamp,
        extra: {
          context: entry.context,
          sessionId: entry.sessionId,
          userId: entry.userId,
          url: entry.url,
          userAgent: entry.userAgent,
        },
        exception: entry.error ? {
          values: [{
            type: entry.error.name,
            value: entry.error.message,
            stacktrace: {
              frames: entry.stackTrace ? entry.stackTrace.split('\n').map(line => ({ filename: line })) : [],
            },
          }],
        } : undefined,
      })),
    }),
  }),

  // LogRocket configuration example
  LogRocket: (apiKey: string): ExternalLogService => ({
    name: 'LogRocket',
    endpoint: 'https://api.logrocket.com/logs',
    apiKey,
    enabled: true,
    formatPayload: (entries: LogEntry[]) => ({
      logs: entries.map(entry => ({
        level: LogLevel[entry.level].toLowerCase(),
        message: entry.message,
        timestamp: entry.timestamp,
        metadata: {
          sessionId: entry.sessionId,
          userId: entry.userId,
          context: entry.context,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.stackTrace,
          } : undefined,
        },
      })),
    }),
  }),

  // Custom API endpoint
  CustomAPI: (endpoint: string, apiKey?: string): ExternalLogService => ({
    name: 'CustomAPI',
    endpoint,
    apiKey,
    enabled: true,
    formatPayload: (entries: LogEntry[]) => ({
      logs: entries,
      metadata: {
        environment: getNodeEnv(),
        timestamp: new Date().toISOString(),
      },
    }),
  }),
};

export default errorLogger;