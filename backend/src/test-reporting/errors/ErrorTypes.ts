/**
 * Error classification system for test reporting
 * Provides structured error types and handling strategies
 */

export enum ReportingErrorType {
  // Test result processing errors
  TEST_RESULT_PARSING_ERROR = 'TEST_RESULT_PARSING_ERROR',
  MALFORMED_TEST_DATA = 'MALFORMED_TEST_DATA',
  JEST_INTEGRATION_ERROR = 'JEST_INTEGRATION_ERROR',
  
  // Template and report generation errors
  TEMPLATE_RENDERING_ERROR = 'TEMPLATE_RENDERING_ERROR',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_COMPILATION_ERROR = 'TEMPLATE_COMPILATION_ERROR',
  REPORT_GENERATION_ERROR = 'REPORT_GENERATION_ERROR',
  
  // File system and I/O errors
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  OUTPUT_DIRECTORY_ERROR = 'OUTPUT_DIRECTORY_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  DISK_SPACE_ERROR = 'DISK_SPACE_ERROR',
  
  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CONFIGURATION_VALIDATION_ERROR = 'CONFIGURATION_VALIDATION_ERROR',
  CONFIGURATION_NOT_FOUND = 'CONFIGURATION_NOT_FOUND',
  INVALID_CONFIGURATION_FORMAT = 'INVALID_CONFIGURATION_FORMAT',
  
  // Dependency and environment errors
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  DEPENDENCY_VERSION_ERROR = 'DEPENDENCY_VERSION_ERROR',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
  
  // Network and external service errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Performance and resource errors
  MEMORY_ERROR = 'MEMORY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  
  // Unknown or unexpected errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  SKIP = 'skip',
  FAIL = 'fail',
  PARTIAL = 'partial'
}

export interface ReportingError {
  type: ReportingErrorType;
  severity: ErrorSeverity;
  message: string;
  details: any;
  timestamp: Date;
  recoverable: boolean;
  recoveryStrategy: RecoveryStrategy;
  context?: ErrorContext;
  originalError?: Error;
  stackTrace?: string;
  actionableGuidance?: string[];
  retryCount?: number;
  maxRetries?: number;
}

export interface ErrorContext {
  operation: string;
  component: string;
  filePath?: string;
  testSuite?: string;
  reportFormat?: string;
  configSection?: string;
  environment?: string;
  buildId?: string;
  userId?: string;
}

export interface ErrorRecoveryResult {
  success: boolean;
  partialSuccess?: boolean;
  recoveredData?: any;
  fallbackUsed?: boolean;
  message?: string;
  newError?: ReportingError;
}

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelayMs: number;
  enableFallbacks: boolean;
  enablePartialReports: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableDetailedLogging: boolean;
  enableStackTraces: boolean;
  enableActionableGuidance: boolean;
  failOnCriticalErrors: boolean;
  timeoutMs: number;
}

/**
 * Error classification utility
 */
export class ErrorClassifier {
  /**
   * Classify an error based on its characteristics
   */
  public static classifyError(error: Error, context?: ErrorContext): ReportingError {
    const timestamp = new Date();
    let type = ReportingErrorType.UNKNOWN_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let recoverable = true;
    let recoveryStrategy = RecoveryStrategy.RETRY;
    let actionableGuidance: string[] = [];

    // Classify based on error message and type
    if (error.name === 'ConfigurationError' || error.message.includes('configuration')) {
      type = ReportingErrorType.CONFIGURATION_ERROR;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.FALLBACK;
      actionableGuidance = [
        'Check your test-reporting.config.js file for syntax errors',
        'Ensure all required configuration fields are present',
        'Validate configuration against the schema'
      ];
    } else if (error.code === 'ENOENT') {
      type = ReportingErrorType.FILE_SYSTEM_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
      actionableGuidance = [
        'Ensure the file or directory exists',
        'Check file permissions',
        'Verify the path is correct'
      ];
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      type = ReportingErrorType.PERMISSION_ERROR;
      severity = ErrorSeverity.HIGH;
      recoverable = false;
      recoveryStrategy = RecoveryStrategy.FAIL;
      actionableGuidance = [
        'Check file and directory permissions',
        'Run with appropriate user privileges',
        'Ensure the output directory is writable'
      ];
    } else if (error.code === 'ENOSPC') {
      type = ReportingErrorType.DISK_SPACE_ERROR;
      severity = ErrorSeverity.CRITICAL;
      recoverable = false;
      recoveryStrategy = RecoveryStrategy.FAIL;
      actionableGuidance = [
        'Free up disk space',
        'Choose a different output directory',
        'Clean up old report files'
      ];
    } else if (error.message.includes('timeout') || error.name === 'TimeoutError') {
      type = ReportingErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
      actionableGuidance = [
        'Increase timeout configuration',
        'Check system performance',
        'Reduce test suite size if possible'
      ];
    } else if (error.message.includes('memory') || error.name === 'RangeError') {
      type = ReportingErrorType.MEMORY_ERROR;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.PARTIAL;
      actionableGuidance = [
        'Increase Node.js memory limit (--max-old-space-size)',
        'Process test results in smaller batches',
        'Enable streaming processing'
      ];
    } else if (error.message.includes('template') || error.message.includes('handlebars')) {
      type = ReportingErrorType.TEMPLATE_RENDERING_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.FALLBACK;
      actionableGuidance = [
        'Check template syntax',
        'Verify template data structure',
        'Use default template as fallback'
      ];
    } else if (error.message.includes('jest') || error.message.includes('test result')) {
      type = ReportingErrorType.TEST_RESULT_PARSING_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.PARTIAL;
      actionableGuidance = [
        'Check Jest configuration',
        'Verify test result format',
        'Enable partial report generation'
      ];
    } else if (error.message.includes('network') || error.code === 'ENOTFOUND') {
      type = ReportingErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.LOW;
      recoveryStrategy = RecoveryStrategy.RETRY;
      actionableGuidance = [
        'Check network connectivity',
        'Verify external service availability',
        'Use offline mode if available'
      ];
    }

    return {
      type,
      severity,
      message: error.message,
      details: {
        name: error.name,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        path: (error as any).path
      },
      timestamp,
      recoverable,
      recoveryStrategy,
      context,
      originalError: error,
      stackTrace: error.stack,
      actionableGuidance,
      retryCount: 0,
      maxRetries: 3
    };
  }

  /**
   * Determine if an error is transient and worth retrying
   */
  public static isTransientError(error: ReportingError): boolean {
    const transientTypes = [
      ReportingErrorType.NETWORK_ERROR,
      ReportingErrorType.TIMEOUT_ERROR,
      ReportingErrorType.FILE_SYSTEM_ERROR,
      ReportingErrorType.EXTERNAL_SERVICE_ERROR
    ];

    return transientTypes.includes(error.type) && 
           error.recoverable && 
           (error.retryCount || 0) < (error.maxRetries || 3);
  }

  /**
   * Get retry delay based on error type and retry count
   */
  public static getRetryDelay(error: ReportingError): number {
    const baseDelay = 1000; // 1 second
    const retryCount = error.retryCount || 0;
    
    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.min(delay + jitter, 30000); // Max 30 seconds
  }
}