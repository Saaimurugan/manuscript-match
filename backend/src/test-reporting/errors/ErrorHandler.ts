/**
 * Comprehensive error handler for test reporting system
 * Implements recovery strategies, fallback mechanisms, and detailed logging
 */

import { 
  ReportingError, 
  ReportingErrorType, 
  ErrorSeverity, 
  RecoveryStrategy, 
  ErrorRecoveryResult, 
  ErrorHandlingConfig,
  ErrorClassifier,
  ErrorContext
} from './ErrorTypes';
import { Logger } from './Logger';

export class ErrorHandler {
  private config: ErrorHandlingConfig;
  private logger: Logger;
  private errorHistory: ReportingError[] = [];
  private recoveryAttempts = new Map<string, number>();

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      enableFallbacks: true,
      enablePartialReports: true,
      logLevel: 'error',
      enableDetailedLogging: true,
      enableStackTraces: true,
      enableActionableGuidance: true,
      failOnCriticalErrors: true,
      timeoutMs: 30000,
      ...config
    };

    this.logger = new Logger(this.config.logLevel);
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  public async handleError(
    error: Error | ReportingError,
    context?: ErrorContext
  ): Promise<ErrorRecoveryResult> {
    // Classify error if it's a raw Error
    const reportingError = error instanceof Error 
      ? ErrorClassifier.classifyError(error, context)
      : error;

    // Add to error history
    this.errorHistory.push(reportingError);

    // Log the error
    await this.logError(reportingError);

    // Check if we should fail immediately
    if (this.shouldFailImmediately(reportingError)) {
      return {
        success: false,
        message: `Critical error: ${reportingError.message}`,
        newError: reportingError
      };
    }

    // Attempt recovery based on strategy
    return await this.attemptRecovery(reportingError);
  }

  /**
   * Attempt error recovery based on the error's recovery strategy
   */
  private async attemptRecovery(error: ReportingError): Promise<ErrorRecoveryResult> {
    const errorKey = this.getErrorKey(error);
    const attemptCount = this.recoveryAttempts.get(errorKey) || 0;

    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        return await this.retryOperation(error, attemptCount);

      case RecoveryStrategy.FALLBACK:
        return await this.useFallback(error);

      case RecoveryStrategy.PARTIAL:
        return await this.generatePartialResult(error);

      case RecoveryStrategy.SKIP:
        return await this.skipOperation(error);

      case RecoveryStrategy.FAIL:
      default:
        return {
          success: false,
          message: `Operation failed: ${error.message}`,
          newError: error
        };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation(
    error: ReportingError, 
    attemptCount: number
  ): Promise<ErrorRecoveryResult> {
    const errorKey = this.getErrorKey(error);
    
    if (attemptCount >= this.config.maxRetries) {
      this.logger.error(`Max retries exceeded for ${error.type}`, { error, attemptCount });
      return {
        success: false,
        message: `Max retries (${this.config.maxRetries}) exceeded for ${error.type}`,
        newError: error
      };
    }

    // Increment retry count
    this.recoveryAttempts.set(errorKey, attemptCount + 1);
    error.retryCount = attemptCount + 1;

    // Calculate delay
    const delay = ErrorClassifier.getRetryDelay(error);
    
    this.logger.info(`Retrying operation after ${delay}ms (attempt ${attemptCount + 1}/${this.config.maxRetries})`, {
      errorType: error.type,
      delay,
      attempt: attemptCount + 1
    });

    // Wait before retry
    await this.sleep(delay);

    return {
      success: true,
      message: `Retry scheduled (attempt ${attemptCount + 1})`
    };
  }

  /**
   * Use fallback mechanism
   */
  private async useFallback(error: ReportingError): Promise<ErrorRecoveryResult> {
    if (!this.config.enableFallbacks) {
      return {
        success: false,
        message: 'Fallbacks disabled in configuration',
        newError: error
      };
    }

    let fallbackResult: any = null;
    let fallbackUsed = false;

    try {
      switch (error.type) {
        case ReportingErrorType.TEMPLATE_RENDERING_ERROR:
        case ReportingErrorType.TEMPLATE_NOT_FOUND:
          fallbackResult = await this.getDefaultTemplate(error);
          fallbackUsed = true;
          break;

        case ReportingErrorType.CONFIGURATION_ERROR:
        case ReportingErrorType.CONFIGURATION_NOT_FOUND:
          fallbackResult = await this.getDefaultConfiguration(error);
          fallbackUsed = true;
          break;

        case ReportingErrorType.OUTPUT_DIRECTORY_ERROR:
          fallbackResult = await this.createFallbackOutputDirectory(error);
          fallbackUsed = true;
          break;

        case ReportingErrorType.DEPENDENCY_ERROR:
        case ReportingErrorType.MISSING_DEPENDENCY:
          fallbackResult = await this.useBasicFunctionality(error);
          fallbackUsed = true;
          break;

        default:
          this.logger.warn(`No fallback available for error type: ${error.type}`);
          return {
            success: false,
            message: `No fallback mechanism available for ${error.type}`,
            newError: error
          };
      }

      this.logger.info(`Fallback mechanism used successfully for ${error.type}`, {
        errorType: error.type,
        fallbackUsed
      });

      return {
        success: true,
        recoveredData: fallbackResult,
        fallbackUsed,
        message: `Fallback mechanism used for ${error.type}`
      };

    } catch (fallbackError) {
      this.logger.error(`Fallback mechanism failed for ${error.type}`, {
        originalError: error,
        fallbackError
      });

      return {
        success: false,
        message: `Fallback mechanism failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
        newError: error
      };
    }
  }

  /**
   * Generate partial result when full operation fails
   */
  private async generatePartialResult(error: ReportingError): Promise<ErrorRecoveryResult> {
    if (!this.config.enablePartialReports) {
      return {
        success: false,
        message: 'Partial reports disabled in configuration',
        newError: error
      };
    }

    try {
      let partialData: any = null;

      switch (error.type) {
        case ReportingErrorType.TEST_RESULT_PARSING_ERROR:
        case ReportingErrorType.MALFORMED_TEST_DATA:
          partialData = await this.extractPartialTestResults(error);
          break;

        case ReportingErrorType.MEMORY_ERROR:
        case ReportingErrorType.RESOURCE_EXHAUSTION:
          partialData = await this.generateLightweightReport(error);
          break;

        case ReportingErrorType.REPORT_GENERATION_ERROR:
          partialData = await this.generateBasicReport(error);
          break;

        default:
          this.logger.warn(`No partial result generation available for error type: ${error.type}`);
          return {
            success: false,
            message: `No partial result generation available for ${error.type}`,
            newError: error
          };
      }

      this.logger.info(`Partial result generated for ${error.type}`, {
        errorType: error.type,
        hasPartialData: !!partialData
      });

      return {
        success: true,
        partialSuccess: true,
        recoveredData: partialData,
        message: `Partial result generated for ${error.type}`
      };

    } catch (partialError) {
      this.logger.error(`Partial result generation failed for ${error.type}`, {
        originalError: error,
        partialError
      });

      return {
        success: false,
        message: `Partial result generation failed: ${partialError instanceof Error ? partialError.message : 'Unknown error'}`,
        newError: error
      };
    }
  }

  /**
   * Skip operation and continue
   */
  private async skipOperation(error: ReportingError): Promise<ErrorRecoveryResult> {
    this.logger.warn(`Skipping operation due to ${error.type}`, {
      errorType: error.type,
      context: error.context
    });

    return {
      success: true,
      message: `Operation skipped due to ${error.type}`
    };
  }

  /**
   * Check if error should cause immediate failure
   */
  private shouldFailImmediately(error: ReportingError): boolean {
    if (!this.config.failOnCriticalErrors) {
      return false;
    }

    return error.severity === ErrorSeverity.CRITICAL || 
           !error.recoverable ||
           error.type === ReportingErrorType.PERMISSION_ERROR ||
           error.type === ReportingErrorType.DISK_SPACE_ERROR;
  }

  /**
   * Log error with appropriate level and detail
   */
  private async logError(error: ReportingError): Promise<void> {
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
      recoverable: error.recoverable,
      recoveryStrategy: error.recoveryStrategy,
      retryCount: error.retryCount
    };

    if (this.config.enableDetailedLogging) {
      logData['details'] = error.details;
    }

    if (this.config.enableStackTraces && error.stackTrace) {
      logData['stackTrace'] = error.stackTrace;
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`CRITICAL: ${error.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`HIGH: ${error.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`MEDIUM: ${error.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info(`LOW: ${error.message}`, logData);
        break;
    }

    // Log actionable guidance
    if (this.config.enableActionableGuidance && error.actionableGuidance?.length) {
      this.logger.info('Actionable guidance:', {
        errorType: error.type,
        guidance: error.actionableGuidance
      });
    }
  }

  /**
   * Fallback implementations
   */
  private async getDefaultTemplate(error: ReportingError): Promise<string> {
    // Return minimal template based on format
    const format = error.context?.reportFormat || 'html';
    
    if (format === 'html') {
      return `<!DOCTYPE html>
<html><head><title>Test Report</title></head>
<body><h1>Test Report</h1><p>Error generating full report: ${error.message}</p></body>
</html>`;
    } else if (format === 'markdown') {
      return `# Test Report\n\nError generating full report: ${error.message}\n`;
    } else {
      return JSON.stringify({ error: error.message, timestamp: new Date().toISOString() });
    }
  }

  private async getDefaultConfiguration(error: ReportingError): Promise<any> {
    return {
      enabled: true,
      outputDirectory: 'test-reports',
      formats: { html: true, markdown: true, json: false },
      errorHandling: {
        maxRetries: 3,
        enableFallbacks: true,
        enablePartialReports: true
      }
    };
  }

  private async createFallbackOutputDirectory(error: ReportingError): Promise<string> {
    const fallbackDir = `test-reports-${Date.now()}`;
    // This would be implemented by the calling code
    return fallbackDir;
  }

  private async useBasicFunctionality(error: ReportingError): Promise<any> {
    return {
      basicMode: true,
      message: 'Using basic functionality due to missing dependencies'
    };
  }

  private async extractPartialTestResults(error: ReportingError): Promise<any> {
    // Extract whatever test data is available
    return {
      partial: true,
      availableData: error.details || {},
      message: 'Partial test results extracted'
    };
  }

  private async generateLightweightReport(error: ReportingError): Promise<any> {
    return {
      lightweight: true,
      summary: 'Basic test summary due to resource constraints',
      timestamp: new Date().toISOString()
    };
  }

  private async generateBasicReport(error: ReportingError): Promise<any> {
    return {
      basic: true,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Utility methods
   */
  private getErrorKey(error: ReportingError): string {
    return `${error.type}-${error.context?.operation || 'unknown'}-${error.context?.component || 'unknown'}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoveryAttempts: number;
  } {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errorHistory.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recoveryAttempts: Array.from(this.recoveryAttempts.values()).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Clear error history (useful for testing)
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 10): ReportingError[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Check if system is in degraded state
   */
  public isSystemDegraded(): boolean {
    const recentErrors = this.getRecentErrors(5);
    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL);
    const highSeverityErrors = recentErrors.filter(e => e.severity === ErrorSeverity.HIGH);

    return criticalErrors.length > 0 || highSeverityErrors.length >= 3;
  }
}