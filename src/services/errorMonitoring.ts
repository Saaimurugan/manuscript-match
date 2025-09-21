/**
 * Error Monitoring and Analytics Service
 * Provides error tracking, rate monitoring, and analytics for production environments
 */

export interface ErrorMetrics {
  errorId: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'syntax' | 'runtime' | 'network' | 'user' | 'system';
  component?: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  resolved: boolean;
  responseTime?: number;
}

export interface ErrorRateMetrics {
  timeWindow: string;
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  componentErrors: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  averageResponseTime: number;
}

export interface AlertConfig {
  errorRateThreshold: number;
  criticalErrorThreshold: number;
  timeWindowMinutes: number;
  alertChannels: ('console' | 'email' | 'webhook')[];
  webhookUrl?: string;
  emailRecipients?: string[];
}

class ErrorMonitoringService {
  private errors: ErrorMetrics[] = [];
  private alertConfig: AlertConfig;
  private isProduction: boolean;
  private performanceObserver?: PerformanceObserver;
  private errorRateCheckInterval?: NodeJS.Timeout;

  constructor(alertConfig: AlertConfig) {
    this.alertConfig = alertConfig;
    this.isProduction = this.getNodeEnv() === 'production';
    this.initializeMonitoring();
  }

  /**
   * Safe environment variable access for browser
   */
  private getNodeEnv(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV || 'development';
    }
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      return (window as any).__ENV__.NODE_ENV || 'development';
    }
    return 'development';
  }

  /**
   * Initialize error monitoring and performance tracking
   */
  private initializeMonitoring(): void {
    // Set up performance monitoring for error handling components
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }

    // Start error rate monitoring
    this.startErrorRateMonitoring();

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  /**
   * Track an error occurrence
   */
  trackError(error: ErrorMetrics): void {
    // Add timestamp if not provided
    if (!error.timestamp) {
      error.timestamp = Date.now();
    }

    // Store error
    this.errors.push(error);

    // Log to console in development
    if (!this.isProduction) {
      console.group(`🚨 Error Tracked: ${error.severity.toUpperCase()}`);
      console.log('Error ID:', error.errorId);
      console.log('Component:', error.component || 'Unknown');
      console.log('Message:', error.message);
      console.log('Category:', error.category);
      if (error.stack) {
        console.log('Stack:', error.stack);
      }
      console.groupEnd();
    }

    // Send to external tracking service in production
    if (this.isProduction && typeof window !== 'undefined') {
      this.sendToExternalService(error);
    }

    // Check if alert thresholds are exceeded
    this.checkAlertThresholds();

    // Clean up old errors (keep last 1000)
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }
  }

  /**
   * Get error rate metrics for a specific time window
   */
  getErrorRateMetrics(timeWindowMinutes: number = 60): ErrorRateMetrics {
    const now = Date.now();
    const timeWindow = timeWindowMinutes * 60 * 1000;
    const windowStart = now - timeWindow;

    const recentErrors = this.errors.filter(error => error.timestamp >= windowStart);
    
    const componentErrors: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let criticalErrors = 0;

    recentErrors.forEach(error => {
      // Count by component
      if (error.component) {
        componentErrors[error.component] = (componentErrors[error.component] || 0) + 1;
      }

      // Count by category
      categoryBreakdown[error.category] = (categoryBreakdown[error.category] || 0) + 1;

      // Track critical errors
      if (error.severity === 'critical') {
        criticalErrors++;
      }

      // Calculate average response time
      if (error.responseTime) {
        totalResponseTime += error.responseTime;
        responseTimeCount++;
      }
    });

    const errorRate = recentErrors.length / (timeWindowMinutes / 60); // errors per hour
    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    return {
      timeWindow: `${timeWindowMinutes} minutes`,
      totalErrors: recentErrors.length,
      errorRate,
      criticalErrors,
      componentErrors,
      categoryBreakdown,
      averageResponseTime
    };
  }

  /**
   * Get aggregated error analysis
   */
  getErrorAnalysis(): {
    topErrors: Array<{ message: string; count: number; severity: string }>;
    errorTrends: Array<{ hour: string; count: number }>;
    componentHealth: Array<{ component: string; errorCount: number; healthScore: number }>;
    resolutionRate: number;
  } {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(error => error.timestamp >= last24Hours);

    // Top errors by frequency
    const errorCounts: Record<string, { count: number; severity: string }> = {};
    recentErrors.forEach(error => {
      const key = error.message;
      if (!errorCounts[key]) {
        errorCounts[key] = { count: 0, severity: error.severity };
      }
      errorCounts[key].count++;
    });

    const topErrors = Object.entries(errorCounts)
      .map(([message, data]) => ({ message, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error trends by hour
    const hourlyErrors: Record<string, number> = {};
    recentErrors.forEach(error => {
      const hour = new Date(error.timestamp).getHours().toString().padStart(2, '0');
      hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1;
    });

    const errorTrends = Object.entries(hourlyErrors)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Component health analysis
    const componentStats: Record<string, { total: number; resolved: number }> = {};
    recentErrors.forEach(error => {
      if (error.component) {
        if (!componentStats[error.component]) {
          componentStats[error.component] = { total: 0, resolved: 0 };
        }
        componentStats[error.component].total++;
        if (error.resolved) {
          componentStats[error.component].resolved++;
        }
      }
    });

    const componentHealth = Object.entries(componentStats)
      .map(([component, stats]) => ({
        component,
        errorCount: stats.total,
        healthScore: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100
      }))
      .sort((a, b) => b.errorCount - a.errorCount);

    // Overall resolution rate
    const totalErrors = recentErrors.length;
    const resolvedErrors = recentErrors.filter(error => error.resolved).length;
    const resolutionRate = totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 100;

    return {
      topErrors,
      errorTrends,
      componentHealth,
      resolutionRate
    };
  }

  /**
   * Mark an error as resolved
   */
  markErrorResolved(errorId: string): void {
    const error = this.errors.find(e => e.errorId === errorId);
    if (error) {
      error.resolved = true;
      
      if (!this.isProduction) {
        console.log(`✅ Error resolved: ${errorId}`);
      }
    }
  }

  /**
   * Setup performance monitoring for error handling components
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        // Monitor error boundary performance
        if (entry.name.includes('ErrorBoundary') || entry.name.includes('error-handling')) {
          const responseTime = entry.duration;
          
          if (responseTime > 100) { // Alert if error handling takes more than 100ms
            console.warn(`⚠️ Slow error handling detected: ${entry.name} took ${responseTime.toFixed(2)}ms`);
          }

          // Track performance metrics
          this.trackPerformanceMetric({
            component: entry.name,
            duration: responseTime,
            timestamp: Date.now()
          });
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
  }

  /**
   * Track performance metrics for error handling
   */
  private trackPerformanceMetric(metric: { component: string; duration: number; timestamp: number }): void {
    // Store performance data (could be sent to analytics service)
    if (!this.isProduction) {
      console.log(`📊 Performance: ${metric.component} - ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Start monitoring error rates and trigger alerts
   */
  private startErrorRateMonitoring(): void {
    this.errorRateCheckInterval = setInterval(() => {
      this.checkAlertThresholds();
    }, this.alertConfig.timeWindowMinutes * 60 * 1000); // Check every time window
  }

  /**
   * Check if error rate thresholds are exceeded and trigger alerts
   */
  private checkAlertThresholds(): void {
    const metrics = this.getErrorRateMetrics(this.alertConfig.timeWindowMinutes);

    // Check error rate threshold
    if (metrics.errorRate > this.alertConfig.errorRateThreshold) {
      this.triggerAlert('error_rate', {
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)} errors/hour`,
        metrics,
        severity: 'high'
      });
    }

    // Check critical error threshold
    if (metrics.criticalErrors > this.alertConfig.criticalErrorThreshold) {
      this.triggerAlert('critical_errors', {
        message: `Critical error threshold exceeded: ${metrics.criticalErrors} critical errors`,
        metrics,
        severity: 'critical'
      });
    }
  }

  /**
   * Trigger an alert through configured channels
   */
  private triggerAlert(type: string, data: any): void {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      ...data
    };

    this.alertConfig.alertChannels.forEach(channel => {
      switch (channel) {
        case 'console':
          console.error('🚨 ALERT:', alert);
          break;
        case 'webhook':
          if (this.alertConfig.webhookUrl) {
            this.sendWebhookAlert(alert);
          }
          break;
        case 'email':
          if (this.alertConfig.emailRecipients?.length) {
            this.sendEmailAlert(alert);
          }
          break;
      }
    });
  }

  /**
   * Send alert via webhook
   */
  private async sendWebhookAlert(alert: any): Promise<void> {
    if (!this.alertConfig.webhookUrl) return;

    try {
      await fetch(this.alertConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send alert via email (placeholder - would integrate with email service)
   */
  private sendEmailAlert(alert: any): void {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    console.log('Email alert would be sent to:', this.alertConfig.emailRecipients, alert);
  }

  /**
   * Send error to external tracking service
   */
  private async sendToExternalService(error: ErrorMetrics): Promise<void> {
    // This would integrate with services like Sentry, LogRocket, Bugsnag, etc.
    try {
      // Example integration point
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(new Error(error.message), {
          tags: {
            component: error.component,
            category: error.category,
            severity: error.severity
          },
          extra: {
            errorId: error.errorId,
            sessionId: error.sessionId,
            userId: error.userId
          }
        });
      }
    } catch (integrationError) {
      console.error('Failed to send error to external service:', integrationError);
    }
  }

  /**
   * Setup global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;
    
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        errorId: `global-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'high',
        category: 'runtime',
        message: event.message,
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        resolved: false
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        errorId: `promise-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'high',
        category: 'runtime',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        resolved: false
      });
    });
  }

  /**
   * Get or generate session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    let sessionId = sessionStorage.getItem('error-monitoring-session');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-monitoring-session', sessionId);
    }
    return sessionId;
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    isActive: boolean;
    totalErrors: number;
    recentErrorRate: number;
    alertsTriggered: number;
    performanceMonitoring: boolean;
  } {
    const recentMetrics = this.getErrorRateMetrics(60);
    
    return {
      isActive: true,
      totalErrors: this.errors.length,
      recentErrorRate: recentMetrics.errorRate,
      alertsTriggered: 0, // Would track this in a real implementation
      performanceMonitoring: !!this.performanceObserver
    };
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.errorRateCheckInterval) {
      clearInterval(this.errorRateCheckInterval);
    }
  }
}

// Safe environment variable access for browser
const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key];
  }
  return undefined;
};

// Default configuration for error monitoring
export const defaultAlertConfig: AlertConfig = {
  errorRateThreshold: 10, // 10 errors per hour
  criticalErrorThreshold: 3, // 3 critical errors in time window
  timeWindowMinutes: 60, // 1 hour window
  alertChannels: ['console'],
  webhookUrl: getEnvVar('REACT_APP_ERROR_WEBHOOK_URL'),
  emailRecipients: getEnvVar('REACT_APP_ERROR_EMAIL_RECIPIENTS')?.split(',')
};

// Singleton instance
export const errorMonitoring = new ErrorMonitoringService(defaultAlertConfig);

export default ErrorMonitoringService;