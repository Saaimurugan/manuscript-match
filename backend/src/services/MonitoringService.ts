import { EventEmitter } from 'events';

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usagePercent: number;
  };
  cpu: {
    userTime: number;
    systemTime: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    recentErrors: ErrorMetric[];
  };
  circuitBreakers: Record<string, {
    state: string;
    failureCount: number;
    successCount: number;
  }>;
}

export interface ErrorMetric {
  timestamp: Date;
  type: string;
  message: string;
  requestId?: string;
  url?: string;
  statusCode?: number;
}

export interface RequestMetric {
  timestamp: Date;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  requestId: string;
  userId?: string;
}

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService;
  private requestMetrics: RequestMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private circuitBreakerStats: Map<string, any> = new Map();
  private startTime: Date;
  private metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.startTime = new Date();
    
    // Add default error listener to prevent unhandled error exceptions
    this.on('error', () => {
      // Default no-op listener to prevent unhandled error events
    });
    
    // Clean up old metrics every hour (skip in test environment)
    if (process.env['NODE_ENV'] !== 'test') {
      this.cleanupInterval = setInterval(() => {
        this.cleanupOldMetrics();
      }, 60 * 60 * 1000);
    }
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  recordRequest(metric: RequestMetric): void {
    this.requestMetrics.push(metric);
    
    if (this.listenerCount('request') > 0) {
      this.emit('request', metric);
    }
    
    // Emit alerts for slow requests
    if (metric.responseTime > 5000 && this.listenerCount('slowRequest') > 0) {
      this.emit('slowRequest', metric);
    }
  }

  recordError(error: ErrorMetric): void {
    try {
      this.errorMetrics.push(error);
      
      // Only emit events if there are listeners to prevent unhandled error exceptions
      if (this.listenerCount('error') > 0) {
        this.emit('error', error);
      }
      
      // Emit alerts for critical errors
      if (error.statusCode && error.statusCode >= 500 && this.listenerCount('criticalError') > 0) {
        this.emit('criticalError', error);
      }
    } catch (emitError) {
      // Prevent infinite loops by logging directly to console
      console.error('Failed to record error in monitoring service:', emitError);
      console.error('Original error:', error);
    }
  }

  updateCircuitBreakerStats(name: string, stats: any): void {
    this.circuitBreakerStats.set(name, {
      ...stats,
      timestamp: new Date(),
    });
    
    // Emit alert when circuit breaker opens
    if (stats.state === 'OPEN' && this.listenerCount('circuitBreakerOpen') > 0) {
      this.emit('circuitBreakerOpen', { name, stats });
    }
  }

  getSystemMetrics(): SystemMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Filter recent metrics
    const recentRequests = this.requestMetrics.filter(m => m.timestamp >= oneHourAgo);
    const recentErrors = this.errorMetrics.filter(m => m.timestamp >= oneHourAgo);
    
    // Calculate request metrics
    const totalRequests = recentRequests.length;
    const successfulRequests = recentRequests.filter(r => r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests 
      : 0;

    // Calculate error metrics by type
    const errorsByType: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Get CPU usage (simplified)
    const cpuUsage = process.cpuUsage();

    // Get circuit breaker stats
    const circuitBreakers: Record<string, any> = {};
    this.circuitBreakerStats.forEach((stats, name) => {
      circuitBreakers[name] = {
        state: stats.state,
        failureCount: stats.failureCount,
        successCount: stats.successCount,
      };
    });

    return {
      timestamp: now,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent),
      },
      cpu: {
        userTime: cpuUsage.user,
        systemTime: cpuUsage.system,
      },
      requests: {
        total: totalRequests,
        successful: successfulRequests,
        failed: failedRequests,
        averageResponseTime: Math.round(averageResponseTime),
      },
      errors: {
        total: recentErrors.length,
        byType: errorsByType,
        recentErrors: recentErrors.slice(-10), // Last 10 errors
      },
      circuitBreakers,
    };
  }

  getRequestMetrics(timeRange?: { start: Date; end: Date }): RequestMetric[] {
    if (!timeRange) {
      return [...this.requestMetrics];
    }
    
    return this.requestMetrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getErrorMetrics(timeRange?: { start: Date; end: Date }): ErrorMetric[] {
    if (!timeRange) {
      return [...this.errorMetrics];
    }
    
    return this.errorMetrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  // Get performance statistics
  getPerformanceStats(timeRange?: { start: Date; end: Date }): {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  } {
    const requests = this.getRequestMetrics(timeRange);
    
    if (requests.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 0,
      };
    }

    // Sort by response time for percentile calculations
    const sortedTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);
    
    const averageResponseTime = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    const p99ResponseTime = sortedTimes[p99Index] || 0;
    
    // Calculate requests per minute
    const timeSpanMs = timeRange 
      ? timeRange.end.getTime() - timeRange.start.getTime()
      : 60 * 1000; // Default to 1 minute
    const requestsPerMinute = (requests.length / timeSpanMs) * 60 * 1000;
    
    // Calculate error rate
    const errorCount = requests.filter(r => r.statusCode >= 400).length;
    const errorRate = (errorCount / requests.length) * 100;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      requestsPerMinute: Math.round(requestsPerMinute),
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.metricsRetentionPeriod);
    
    this.requestMetrics = this.requestMetrics.filter(m => m.timestamp >= cutoffTime);
    this.errorMetrics = this.errorMetrics.filter(m => m.timestamp >= cutoffTime);
    
    // Clean up old circuit breaker stats
    this.circuitBreakerStats.forEach((stats, name) => {
      if (stats.timestamp && stats.timestamp < cutoffTime) {
        this.circuitBreakerStats.delete(name);
      }
    });
  }

  // Alert thresholds and monitoring
  setAlertThresholds(thresholds: {
    errorRate?: number;
    responseTime?: number;
    memoryUsage?: number;
    consecutiveErrors?: number;
  }): void {
    let consecutiveErrorCount = 0;
    
    // Set up monitoring for alert thresholds
    const checkAlerts = () => {
      const metrics = this.getSystemMetrics();
      const perfStats = this.getPerformanceStats();
      
      if (thresholds.errorRate && perfStats.errorRate > thresholds.errorRate && this.listenerCount('highErrorRate') > 0) {
        this.emit('highErrorRate', { 
          rate: perfStats.errorRate, 
          threshold: thresholds.errorRate,
          timestamp: new Date(),
        });
      }
      
      if (thresholds.responseTime && perfStats.averageResponseTime > thresholds.responseTime && this.listenerCount('highResponseTime') > 0) {
        this.emit('highResponseTime', { 
          time: perfStats.averageResponseTime, 
          threshold: thresholds.responseTime,
          timestamp: new Date(),
        });
      }
      
      if (thresholds.memoryUsage && metrics.memory.usagePercent > thresholds.memoryUsage && this.listenerCount('highMemoryUsage') > 0) {
        this.emit('highMemoryUsage', { 
          usage: metrics.memory.usagePercent, 
          threshold: thresholds.memoryUsage,
          timestamp: new Date(),
        });
      }
      
      // Check for consecutive errors
      if (thresholds.consecutiveErrors) {
        const recentErrors = this.getErrorMetrics({
          start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          end: new Date(),
        });
        
        if (recentErrors.length >= thresholds.consecutiveErrors) {
          consecutiveErrorCount = recentErrors.length;
          if (this.listenerCount('consecutiveErrors') > 0) {
            this.emit('consecutiveErrors', {
              count: consecutiveErrorCount,
              threshold: thresholds.consecutiveErrors,
              timestamp: new Date(),
            });
          }
        } else {
          consecutiveErrorCount = 0;
        }
      }
    };
    
    // Check alerts every minute (skip in test environment)
    if (process.env['NODE_ENV'] !== 'test') {
      setInterval(checkAlerts, 60 * 1000);
    }
    
    // Set up alert handlers
    this.setupAlertHandlers();
  }

  private setupAlertHandlers(): void {
    this.on('highErrorRate', (data) => {
      console.warn(`🚨 HIGH ERROR RATE ALERT: ${data.rate}% (threshold: ${data.threshold}%)`);
    });

    this.on('highResponseTime', (data) => {
      console.warn(`🚨 HIGH RESPONSE TIME ALERT: ${data.time}ms (threshold: ${data.threshold}ms)`);
    });

    this.on('highMemoryUsage', (data) => {
      console.warn(`🚨 HIGH MEMORY USAGE ALERT: ${data.usage}% (threshold: ${data.threshold}%)`);
    });

    this.on('consecutiveErrors', (data) => {
      console.warn(`🚨 CONSECUTIVE ERRORS ALERT: ${data.count} errors (threshold: ${data.threshold})`);
    });

    this.on('criticalError', (error) => {
      console.error(`🚨 CRITICAL ERROR: ${error.message} (Status: ${error.statusCode})`);
    });

    this.on('circuitBreakerOpen', (data) => {
      console.warn(`🚨 CIRCUIT BREAKER OPENED: ${data.name}`);
    });
  }

  // Get system health summary
  getHealthSummary(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      memoryUsage: number;
      activeCircuitBreakers: number;
    };
  } {
    const metrics = this.getSystemMetrics();
    const perfStats = this.getPerformanceStats();
    const issues: string[] = [];
    
    // Check for issues
    if (perfStats.errorRate > 5) {
      issues.push(`High error rate: ${perfStats.errorRate}%`);
    }
    
    if (perfStats.averageResponseTime > 2000) {
      issues.push(`Slow response time: ${perfStats.averageResponseTime}ms`);
    }
    
    if (metrics.memory.usagePercent > 80) {
      issues.push(`High memory usage: ${metrics.memory.usagePercent}%`);
    }
    
    const openCircuitBreakers = Object.values(metrics.circuitBreakers)
      .filter((cb: any) => cb.state === 'OPEN').length;
    
    if (openCircuitBreakers > 0) {
      issues.push(`${openCircuitBreakers} circuit breaker(s) open`);
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 || perfStats.errorRate > 10 ? 'unhealthy' : 'degraded';
    }
    
    return {
      status,
      issues,
      metrics: {
        errorRate: perfStats.errorRate,
        averageResponseTime: perfStats.averageResponseTime,
        memoryUsage: metrics.memory.usagePercent,
        activeCircuitBreakers: openCircuitBreakers,
      },
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }
}