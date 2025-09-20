/**
 * Error handling system exports
 * Comprehensive error handling and resilience for test reporting
 */

// Core error types and classification
export {
  ReportingErrorType,
  ErrorSeverity,
  RecoveryStrategy,
  ReportingError,
  ErrorContext,
  ErrorRecoveryResult,
  ErrorHandlingConfig,
  ErrorClassifier
} from './ErrorTypes';

// Main error handler
export { ErrorHandler } from './ErrorHandler';

// Structured logging
export { Logger, LogLevel, LogEntry, LoggerConfig } from './Logger';

// Resilient file system operations
export { ResilientFileSystem, FileSystemConfig } from './ResilientFileSystem';

// Malformed data recovery
export { 
  MalformedDataRecovery, 
  TestResultRecovery, 
  RecoveryConfig 
} from './MalformedDataRecovery';

/**
 * Factory function to create a complete error handling system
 */
export function createErrorHandlingSystem(config: {
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  enableFileLogging?: boolean;
  logFilePath?: string;
  maxRetries?: number;
  enableFallbacks?: boolean;
  enablePartialReports?: boolean;
  failOnCriticalErrors?: boolean;
} = {}) {
  const logger = new Logger(config.logLevel || 'info', {
    enableConsole: true,
    enableFile: config.enableFileLogging || false,
    logFilePath: config.logFilePath,
    enableStructuredLogging: true,
    enableColors: true
  });

  const errorHandler = new ErrorHandler({
    maxRetries: config.maxRetries || 3,
    retryDelayMs: 1000,
    enableFallbacks: config.enableFallbacks !== false,
    enablePartialReports: config.enablePartialReports !== false,
    logLevel: config.logLevel || 'info',
    enableDetailedLogging: true,
    enableStackTraces: true,
    enableActionableGuidance: true,
    failOnCriticalErrors: config.failOnCriticalErrors !== false,
    timeoutMs: 30000
  });

  const resilientFs = new ResilientFileSystem(errorHandler, logger, {
    maxRetries: config.maxRetries || 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    enableBackup: true,
    enableTempFiles: true
  });

  const dataRecovery = new MalformedDataRecovery(logger, errorHandler, {
    enablePartialRecovery: true,
    enableDataSanitization: true,
    enableSchemaValidation: true,
    maxRecoveryAttempts: 3,
    fallbackToMinimalData: true
  });

  return {
    logger,
    errorHandler,
    resilientFs,
    dataRecovery
  };
}

// Import statements for the factory function
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';
import { ResilientFileSystem } from './ResilientFileSystem';
import { MalformedDataRecovery } from './MalformedDataRecovery';