import { performance } from 'perf_hooks';
import { cacheService } from './CacheService';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface EndpointMetrics {
  path: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  userAgent?: string;
  userId?: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cache: {
    connected: boolean;
    memory: string;
    keyspace: Record<string, any>;
  };
  database: {
    connected: boolean;
    activeConnections?: number;
  };
  timestamp: Date;
}

export class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private endpointMetrics: EndpointMetrics[] = [];
  private readonly maxMetricsInMemory = 1000;
  private readonly metricsRetentionHours = 24;

  constructor() {
    // Skip periodic tasks in test environment
    if (process.env['NODE_ENV'] !== 'test') {
      // Start periodic system metrics collection
      this.startSystemMetricsCollection();
      
      // Cleanup old metrics periodically
      setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
    }
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);
    this.trimMetricsArray();

    // Also cache recent metrics for quick access
    this.cacheRecentMetrics(fullMetric);
  }

  /**
   * Record endpoint performance metrics
   */
  recordEndpointMetric(metric: Omit<EndpointMetrics, 'timestamp' | 'memoryUsage'>) {
    const fullMetric: EndpointMetrics = {
      ...metric,
      timestamp: new Date(),
      memoryUsage: process.memoryUsage()
    };

    this.endpointMetrics.push(fullMetric);
    this.trimEndpointMetricsArray();

    // Cache endpoint performance data
    this.cacheEndpointMetrics(fullMetric);
  }

  /**
   * Measure execution time of a function
   */
  async measureExecutionTime<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const executionTime = performance.now() - startTime;
      
      const metric: any = {
        name: `execution_time.${name}`,
        value: executionTime,
        unit: 'ms'
      };
      if (tags) {
        metric.tags = tags;
      }
      this.recordMetric(metric);

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      const errorMetric: any = {
        name: `execution_time.${name}.error`,
        value: executionTime,
        unit: 'ms',
        tags: { ...(tags || {}), error: 'true' }
      };
      this.recordMetric(errorMetric);

      throw error;
    }
  }

  /**
   * Measure memory usage of a function
   */
  async measureMemoryUsage<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const initialMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      const finalMemory = process.memoryUsage();
      
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
      
      const metric: any = {
        name: `memory_usage.${name}`,
        value: memoryDelta,
        unit: 'bytes'
      };
      if (tags) {
        metric.tags = tags;
      }
      this.recordMetric(metric);

      return result;
    } catch (error) {
      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
      
      const errorMetric: any = {
        name: `memory_usage.${name}.error`,
        value: memoryDelta,
        unit: 'bytes',
        tags: { ...(tags || {}), error: 'true' }
      };
      this.recordMetric(errorMetric);

      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cacheStats = await cacheService.getStats();
    
    return {
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
        loadAverage: require('os').loadavg()
      },
      memory: {
        used: memoryUsage.heapUsed,
        free: memoryUsage.heapTotal - memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cache: cacheStats,
      database: {
        connected: true, // This would be checked via database health check
      },
      timestamp: new Date()
    };
  }

  /**
   * Get endpoint performance statistics
   */
  getEndpointStats(path?: string, timeRangeHours: number = 1) {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    
    let filteredMetrics = this.endpointMetrics.filter(
      metric => metric.timestamp >= cutoffTime
    );

    if (path) {
      filteredMetrics = filteredMetrics.filter(metric => metric.path === path);
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const responseTimes = filteredMetrics.map(m => m.responseTime);
    const statusCodes = filteredMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests: filteredMetrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: this.calculateMedian(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      statusCodeDistribution: statusCodes,
      errorRate: ((statusCodes[500] || 0) + (statusCodes[400] || 0)) / filteredMetrics.length * 100,
      timeRange: `${timeRangeHours}h`,
      path: path || 'all'
    };
  }

  /**
   * Get custom metrics statistics
   */
  getCustomMetricsStats(metricName?: string, timeRangeHours: number = 1) {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    
    let filteredMetrics = this.metrics.filter(
      metric => metric.timestamp >= cutoffTime
    );

    if (metricName) {
      filteredMetrics = filteredMetrics.filter(metric => metric.name === metricName);
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map(m => m.value);
    const unit = filteredMetrics[0]?.unit || 'unknown';

    return {
      metricName: metricName || 'all',
      count: filteredMetrics.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      median: this.calculateMedian(values),
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),
      unit,
      timeRange: `${timeRangeHours}h`
    };
  }

  /**
   * Get performance alerts based on thresholds
   */
  getPerformanceAlerts() {
    const alerts: Array<{
      type: 'warning' | 'critical';
      message: string;
      metric: string;
      value: number;
      threshold: number;
    }> = [];

    // Check recent endpoint performance
    const recentEndpointStats = this.getEndpointStats(undefined, 0.25); // Last 15 minutes
    
    if (recentEndpointStats) {
      // High response time alert
      if (recentEndpointStats.averageResponseTime > 2000) {
        alerts.push({
          type: 'critical',
          message: 'High average response time detected',
          metric: 'average_response_time',
          value: recentEndpointStats.averageResponseTime,
          threshold: 2000
        });
      } else if (recentEndpointStats.averageResponseTime > 1000) {
        alerts.push({
          type: 'warning',
          message: 'Elevated average response time',
          metric: 'average_response_time',
          value: recentEndpointStats.averageResponseTime,
          threshold: 1000
        });
      }

      // High error rate alert
      if (recentEndpointStats.errorRate > 10) {
        alerts.push({
          type: 'critical',
          message: 'High error rate detected',
          metric: 'error_rate',
          value: recentEndpointStats.errorRate,
          threshold: 10
        });
      } else if (recentEndpointStats.errorRate > 5) {
        alerts.push({
          type: 'warning',
          message: 'Elevated error rate',
          metric: 'error_rate',
          value: recentEndpointStats.errorRate,
          threshold: 5
        });
      }
    }

    return alerts;
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(format: 'json' | 'prometheus' = 'json') {
    const systemMetrics = await this.getSystemMetrics();
    const endpointStats = this.getEndpointStats();
    
    if (format === 'json') {
      return {
        system: systemMetrics,
        endpoints: endpointStats,
        custom_metrics: this.metrics.slice(-100), // Last 100 custom metrics
        timestamp: new Date().toISOString()
      };
    }

    // Prometheus format
    let prometheusMetrics = '';
    
    // System metrics
    prometheusMetrics += `# HELP system_memory_usage_bytes Memory usage in bytes\n`;
    prometheusMetrics += `# TYPE system_memory_usage_bytes gauge\n`;
    prometheusMetrics += `system_memory_usage_bytes{type="used"} ${systemMetrics.memory.used}\n`;
    prometheusMetrics += `system_memory_usage_bytes{type="free"} ${systemMetrics.memory.free}\n`;
    
    // Endpoint metrics
    if (endpointStats) {
      prometheusMetrics += `# HELP http_request_duration_ms HTTP request duration in milliseconds\n`;
      prometheusMetrics += `# TYPE http_request_duration_ms histogram\n`;
      prometheusMetrics += `http_request_duration_ms_average ${endpointStats.averageResponseTime}\n`;
      prometheusMetrics += `http_request_duration_ms_p95 ${endpointStats.p95ResponseTime}\n`;
    }

    return prometheusMetrics;
  }

  private startSystemMetricsCollection() {
    // Skip in test environment
    if (process.env['NODE_ENV'] === 'test') return;
    
    // Collect system metrics every 30 seconds
    setInterval(async () => {
      try {
        const systemMetrics = await this.getSystemMetrics();
        
        // Record individual system metrics
        this.recordMetric({
          name: 'system.memory.usage_percentage',
          value: systemMetrics.memory.percentage,
          unit: 'percentage'
        });

        this.recordMetric({
          name: 'system.memory.used_bytes',
          value: systemMetrics.memory.used,
          unit: 'bytes'
        });

        // Cache system metrics
        await cacheService.set('system:metrics:latest', systemMetrics, { ttl: 60 });
        
      } catch (error) {
        console.error('Failed to collect system metrics:', error);
      }
    }, 30000);
  }

  private async cacheRecentMetrics(metric: PerformanceMetric) {
    try {
      const recentMetrics = await cacheService.get<PerformanceMetric[]>('metrics:recent') || [];
      recentMetrics.push(metric);
      
      // Keep only last 100 metrics in cache
      if (recentMetrics.length > 100) {
        recentMetrics.splice(0, recentMetrics.length - 100);
      }
      
      await cacheService.set('metrics:recent', recentMetrics, { ttl: 3600 });
    } catch (error) {
      console.error('Failed to cache recent metrics:', error);
    }
  }

  private async cacheEndpointMetrics(metric: EndpointMetrics) {
    try {
      const key = `endpoint:metrics:${metric.path}:${metric.method}`;
      const recentMetrics = await cacheService.get<EndpointMetrics[]>(key) || [];
      recentMetrics.push(metric);
      
      // Keep only last 50 metrics per endpoint
      if (recentMetrics.length > 50) {
        recentMetrics.splice(0, recentMetrics.length - 50);
      }
      
      await cacheService.set(key, recentMetrics, { ttl: 1800 });
    } catch (error) {
      console.error('Failed to cache endpoint metrics:', error);
    }
  }

  private trimMetricsArray() {
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsInMemory);
    }
  }

  private trimEndpointMetricsArray() {
    if (this.endpointMetrics.length > this.maxMetricsInMemory) {
      this.endpointMetrics.splice(0, this.endpointMetrics.length - this.maxMetricsInMemory);
    }
  }

  private cleanupOldMetrics() {
    const cutoffTime = new Date(Date.now() - this.metricsRetentionHours * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoffTime);
    this.endpointMetrics = this.endpointMetrics.filter(metric => metric.timestamp >= cutoffTime);
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2
      : sorted[mid] || 0;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();