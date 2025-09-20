import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { performanceMonitoringService } from '../services/PerformanceMonitoringService';

export interface PerformanceRequest extends Request {
  startTime?: number;
  performanceMetrics?: {
    startMemory: NodeJS.MemoryUsage;
    startTime: number;
  };
}

/**
 * Middleware to monitor endpoint performance
 */
export const performanceMonitoringMiddleware = (
  req: PerformanceRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // Store performance data in request
  req.startTime = startTime;
  req.performanceMetrics = {
    startTime,
    startMemory
  };

  // Override res.end to capture response metrics
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any): Response {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();

    // Record endpoint metrics
    performanceMonitoringService.recordEndpointMetric({
      path: req.route?.path || req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent') || 'unknown',
      userId: (req as any).user?.id
    });

    // Record memory usage if significant
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    if (Math.abs(memoryDelta) > 1024 * 1024) { // Only record if > 1MB change
      performanceMonitoringService.recordMetric({
        name: `endpoint.memory_delta.${req.method.toLowerCase()}.${req.route?.path || 'unknown'}`,
        value: memoryDelta,
        unit: 'bytes',
        tags: {
          method: req.method,
          path: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        }
      });
    }

    // Record slow requests with improved threshold
    if (responseTime > 500) { // Lowered threshold from 1000ms to 500ms
      performanceMonitoringService.recordMetric({
        name: 'endpoint.slow_request',
        value: responseTime,
        unit: 'ms',
        tags: {
          method: req.method,
          path: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
          threshold: responseTime > 1000 ? 'very_slow' : 'slow'
        }
      });
    }

    // Add response time header for debugging
    res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    
    // Add performance warning header for slow requests
    if (responseTime > 1000) {
      res.setHeader('X-Performance-Warning', 'slow-response');
    }

    // Call original end method and return the response
    return originalEnd(chunk, encoding);
  } as any;

  next();
};

/**
 * Middleware to monitor database query performance
 */
export const databasePerformanceMiddleware = () => {
  return async (req: PerformanceRequest, res: Response, next: NextFunction) => {
    // This would integrate with Prisma middleware to track query performance
    // For now, we'll add a simple query counter
    let queryCount = 0;

    // Mock query tracking (in real implementation, this would be done via Prisma middleware)
    const trackQuery = (queryType: string, duration: number) => {
      queryCount++;
      performanceMonitoringService.recordMetric({
        name: `database.query.${queryType}`,
        value: duration,
        unit: 'ms',
        tags: {
          endpoint: req.route?.path || req.path,
          method: req.method,
          query_type: queryType
        }
      });
    };

    // Add query tracking to request context
    (req as any).trackQuery = trackQuery;

    // Track total queries per request
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any): Response {
      if (queryCount > 0) {
        performanceMonitoringService.recordMetric({
          name: 'database.queries_per_request',
          value: queryCount,
          unit: 'count',
          tags: {
            endpoint: req.route?.path || req.path,
            method: req.method
          }
        });
      }

      return originalEnd(chunk, encoding);
    } as any;

    next();
  };
};

/**
 * Middleware to monitor cache performance
 */
export const cachePerformanceMiddleware = (
  req: PerformanceRequest,
  res: Response,
  next: NextFunction
) => {
  let cacheHits = 0;
  let cacheMisses = 0;

  // Add cache tracking to request context
  (req as any).trackCacheHit = () => {
    cacheHits++;
    performanceMonitoringService.recordMetric({
      name: 'cache.hit',
      value: 1,
      unit: 'count',
      tags: {
        endpoint: req.route?.path || req.path,
        method: req.method
      }
    });
  };

  (req as any).trackCacheMiss = () => {
    cacheMisses++;
    performanceMonitoringService.recordMetric({
      name: 'cache.miss',
      value: 1,
      unit: 'count',
      tags: {
        endpoint: req.route?.path || req.path,
        method: req.method
      }
    });
  };

  // Track cache hit ratio at the end of request
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any): Response {
    const totalCacheOperations = cacheHits + cacheMisses;
    if (totalCacheOperations > 0) {
      const hitRatio = (cacheHits / totalCacheOperations) * 100;
      performanceMonitoringService.recordMetric({
        name: 'cache.hit_ratio',
        value: hitRatio,
        unit: 'percentage',
        tags: {
          endpoint: req.route?.path || req.path,
          method: req.method
        }
      });
    }

    return originalEnd(chunk, encoding);
  } as any;

  next();
};

/**
 * Middleware to add performance headers to responses
 */
export const performanceHeadersMiddleware = (
  req: PerformanceRequest,
  res: Response,
  next: NextFunction
) => {
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any): Response {
    if (req.startTime) {
      const responseTime = performance.now() - req.startTime;
      res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    }

    const memoryUsage = process.memoryUsage();
    res.set('X-Memory-Usage', `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    return originalEnd(chunk, encoding);
  } as any;

  next();
};

/**
 * Express error handler for performance monitoring
 */
export const performanceErrorHandler = (
  error: Error,
  req: PerformanceRequest,
  _res: Response,
  next: NextFunction
) => {
  // Record error metrics
  performanceMonitoringService.recordMetric({
    name: 'endpoint.error',
    value: 1,
    unit: 'count',
    tags: {
      method: req.method,
      path: req.route?.path || req.path,
      error_type: error.name,
      error_message: error.message
    }
  });

  // Record response time even for errors
  if (req.startTime) {
    const responseTime = performance.now() - req.startTime;
    performanceMonitoringService.recordMetric({
      name: 'endpoint.error_response_time',
      value: responseTime,
      unit: 'ms',
      tags: {
        method: req.method,
        path: req.route?.path || req.path,
        error_type: error.name
      }
    });
  }

  next(error);
};