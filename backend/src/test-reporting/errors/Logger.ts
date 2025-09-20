/**
 * Structured logger for test reporting system
 * Provides detailed logging with actionable guidance and context
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: any;
  stackTrace?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFilePath?: string;
  maxLogFileSize: number;
  maxLogFiles: number;
  enableStructuredLogging: boolean;
  enableColors: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  private colors = {
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    info: '\x1b[36m',    // Cyan
    debug: '\x1b[37m',   // White
    reset: '\x1b[0m'     // Reset
  };

  constructor(level: LogLevel = 'info', config: Partial<LoggerConfig> = {}) {
    this.config = {
      level,
      enableConsole: true,
      enableFile: false,
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5,
      enableStructuredLogging: true,
      enableColors: true,
      ...config
    };

    // Set default log file path if file logging is enabled
    if (this.config.enableFile && !this.config.logFilePath) {
      this.config.logFilePath = path.join(process.cwd(), 'logs', 'test-reporting.log');
    }
  }

  /**
   * Log error message
   */
  public async error(message: string, data?: any): Promise<void> {
    await this.log('error', message, data);
  }

  /**
   * Log warning message
   */
  public async warn(message: string, data?: any): Promise<void> {
    await this.log('warn', message, data);
  }

  /**
   * Log info message
   */
  public async info(message: string, data?: any): Promise<void> {
    await this.log('info', message, data);
  }

  /**
   * Log debug message
   */
  public async debug(message: string, data?: any): Promise<void> {
    await this.log('debug', message, data);
  }

  /**
   * Core logging method
   */
  private async log(level: LogLevel, message: string, data?: any): Promise<void> {
    // Check if this log level should be output
    if (this.logLevels[level] > this.logLevels[this.config.level]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeData(data)
    };

    // Add stack trace for errors
    if (level === 'error' && data?.stackTrace) {
      logEntry.stackTrace = data.stackTrace;
    }

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // File logging
    if (this.config.enableFile && this.config.logFilePath) {
      await this.logToFile(logEntry);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const color = this.config.enableColors ? this.colors[entry.level] : '';
    const reset = this.config.enableColors ? this.colors.reset : '';
    const timestamp = entry.timestamp.substring(11, 19); // HH:MM:SS

    let output = `${color}[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${reset}`;

    if (this.config.enableStructuredLogging && entry.data) {
      output += `\n${this.formatDataForConsole(entry.data)}`;
    }

    if (entry.stackTrace && entry.level === 'error') {
      output += `\n${color}Stack Trace:${reset}\n${entry.stackTrace}`;
    }

    console.log(output);
  }

  /**
   * Log to file
   */
  private async logToFile(entry: LogEntry): Promise<void> {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(this.config.logFilePath!);
      await fs.mkdir(logDir, { recursive: true });

      // Check file size and rotate if necessary
      await this.rotateLogFileIfNeeded();

      // Format log entry for file
      const logLine = this.config.enableStructuredLogging
        ? JSON.stringify(entry) + '\n'
        : `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}\n`;

      // Append to log file
      await fs.appendFile(this.config.logFilePath!, logLine, 'utf8');

    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
      this.logToConsole(entry);
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  private async rotateLogFileIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.config.logFilePath!);
      
      if (stats.size >= this.config.maxLogFileSize) {
        await this.rotateLogFiles();
      }
    } catch (error) {
      // File doesn't exist yet, no need to rotate
      if ((error as any).code !== 'ENOENT') {
        console.warn('Error checking log file size:', error);
      }
    }
  }

  /**
   * Rotate log files
   */
  private async rotateLogFiles(): Promise<void> {
    const logPath = this.config.logFilePath!;
    const logDir = path.dirname(logPath);
    const logName = path.basename(logPath, path.extname(logPath));
    const logExt = path.extname(logPath);

    try {
      // Remove oldest log file if we're at the limit
      const oldestLog = path.join(logDir, `${logName}.${this.config.maxLogFiles}${logExt}`);
      try {
        await fs.unlink(oldestLog);
      } catch (error) {
        // File might not exist, ignore
      }

      // Rotate existing log files
      for (let i = this.config.maxLogFiles - 1; i >= 1; i--) {
        const currentLog = path.join(logDir, `${logName}.${i}${logExt}`);
        const nextLog = path.join(logDir, `${logName}.${i + 1}${logExt}`);
        
        try {
          await fs.rename(currentLog, nextLog);
        } catch (error) {
          // File might not exist, ignore
        }
      }

      // Move current log to .1
      const firstRotatedLog = path.join(logDir, `${logName}.1${logExt}`);
      await fs.rename(logPath, firstRotatedLog);

    } catch (error) {
      console.warn('Error rotating log files:', error);
    }
  }

  /**
   * Format data for console output
   */
  private formatDataForConsole(data: any): string {
    if (!data) return '';

    try {
      // Handle special cases
      if (data.errorType || data.type) {
        let output = `  Type: ${data.errorType || data.type}`;
        
        if (data.severity) {
          output += ` | Severity: ${data.severity}`;
        }
        
        if (data.context) {
          output += `\n  Context: ${JSON.stringify(data.context, null, 2).replace(/\n/g, '\n  ')}`;
        }
        
        if (data.guidance && Array.isArray(data.guidance)) {
          output += `\n  Guidance:\n${data.guidance.map((g: string) => `    • ${g}`).join('\n')}`;
        }
        
        if (data.details && typeof data.details === 'object') {
          output += `\n  Details: ${JSON.stringify(data.details, null, 2).replace(/\n/g, '\n  ')}`;
        }
        
        return output;
      }

      // Default JSON formatting
      return `  ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')}`;
    } catch (error) {
      return `  [Error formatting data: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      
      // Remove or mask sensitive fields
      this.sanitizeObject(sanitized);
      
      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize data', original: String(data) };
    }
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    
    for (const key in obj) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.sanitizeObject(obj[key]);
      }
    }
  }

  /**
   * Create child logger with additional context
   */
  public createChildLogger(context: any): Logger {
    const childLogger = new Logger(this.config.level, this.config);
    
    // Override log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async (level: LogLevel, message: string, data?: any) => {
      const contextualData = {
        ...context,
        ...data
      };
      return originalLog(level, message, contextualData);
    };

    return childLogger;
  }

  /**
   * Log performance metrics
   */
  public async logPerformance(operation: string, duration: number, data?: any): Promise<void> {
    await this.info(`Performance: ${operation}`, {
      operation,
      duration,
      durationFormatted: this.formatDuration(duration),
      ...data
    });
  }

  /**
   * Log system health check
   */
  public async logHealthCheck(component: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: any): Promise<void> {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    
    await this.log(level, `Health Check: ${component} is ${status}`, {
      component,
      status,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Get log file path
   */
  public getLogFilePath(): string | undefined {
    return this.config.logFilePath;
  }

  /**
   * Enable/disable file logging
   */
  public setFileLogging(enabled: boolean, logFilePath?: string): void {
    this.config.enableFile = enabled;
    if (logFilePath) {
      this.config.logFilePath = logFilePath;
    }
  }

  /**
   * Set log level
   */
  public setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }
}