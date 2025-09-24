import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface QueuedRequest {
  req: Request;
  res: Response;
  next: NextFunction;
  timestamp: number;
  priority: number;
}

class LoadBalancingService {
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = 0;
  private readonly maxConcurrentRequests = 50; // Increased from default
  private readonly maxQueueSize = 200;
  private readonly requestTimeout = 30000; // 30 seconds
  private processing = false;

  /**
   * Add request to queue or process immediately if capacity available
   */
  async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if we can process immediately
    if (this.activeRequests < this.maxConcurrentRequests) {
      this.activeRequests++;
      this.processRequest(req, res, next);
      return;
    }

    // Check queue capacity
    if (this.requestQueue.length >= this.maxQueueSize) {
      res.status(503).json({
        error: {
          type: 'SERVICE_UNAVAILABLE',
          message: 'Server is currently overloaded. Please try again later.',
          retryAfter: 30
        }
      });
      return;
    }

    // Add to queue
    const queuedRequest: QueuedRequest = {
      req,
      res,
      next,
      timestamp: Date.now(),
      priority: this.calculatePriority(req)
    };

    this.requestQueue.push(queuedRequest);
    this.requestQueue.sort((a, b) => b.priority - a.priority); // Higher priority first

    // Set timeout for queued request
    setTimeout(() => {
      this.removeFromQueue(queuedRequest);
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            type: 'REQUEST_TIMEOUT',
            message: 'Request timed out while waiting in queue'
          }
        });
      }
    }, this.requestTimeout);

    // Start processing queue if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Calculate request priority based on various factors
   */
  private calculatePriority(req: Request): number {
    let priority = 0;

    // Higher priority for authenticated users
    if ((req as any).user) {
      priority += 10;
    }

    // Higher priority for admin users
    if ((req as any).user?.role === 'ADMIN') {
      priority += 20;
    }

    // Higher priority for certain endpoints
    const highPriorityPaths = ['/api/auth', '/api/health'];
    if (highPriorityPaths.some(path => req.path.startsWith(path))) {
      priority += 15;
    }

    // Lower priority for file uploads (they take longer)
    if (req.path.includes('/upload')) {
      priority -= 5;
    }

    // Lower priority for search operations (they can be resource intensive)
    if (req.path.includes('/search')) {
      priority -= 3;
    }

    return priority;
  }

  /**
   * Process the next request in queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const queuedRequest = this.requestQueue.shift();
      if (!queuedRequest) break;

      // Check if request has timed out
      if (Date.now() - queuedRequest.timestamp > this.requestTimeout) {
        if (!queuedRequest.res.headersSent) {
          queuedRequest.res.status(408).json({
            error: {
              type: 'REQUEST_TIMEOUT',
              message: 'Request timed out while waiting in queue'
            }
          });
        }
        continue;
      }

      // Check if response has already been sent
      if (queuedRequest.res.headersSent) {
        continue;
      }

      this.activeRequests++;
      this.processRequest(queuedRequest.req, queuedRequest.res, queuedRequest.next);
    }

    this.processing = false;
  }

  /**
   * Process a single request
   */
  private processRequest(req: Request, res: Response, next: NextFunction): void {
    const startTime = performance.now();

    // Override res.end to track completion
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any): Response {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Decrease active request count
      loadBalancingService.activeRequests--;

      // Add performance headers
      res.setHeader('X-Queue-Time', `${Date.now() - (req as any).queueStartTime || 0}ms`);
      res.setHeader('X-Processing-Time', `${responseTime.toFixed(2)}ms`);
      res.setHeader('X-Active-Requests', loadBalancingService.activeRequests.toString());
      res.setHeader('X-Queue-Length', loadBalancingService.requestQueue.length.toString());

      // Process next request in queue
      if (loadBalancingService.requestQueue.length > 0) {
        setTimeout(() => loadBalancingService.processQueue(), 0);
      }

      return originalEnd(chunk, encoding);
    } as any;

    // Mark queue start time
    (req as any).queueStartTime = Date.now();

    next();
  }

  /**
   * Remove request from queue
   */
  private removeFromQueue(queuedRequest: QueuedRequest): void {
    const index = this.requestQueue.indexOf(queuedRequest);
    if (index > -1) {
      this.requestQueue.splice(index, 1);
    }
  }

  /**
   * Get current load statistics
   */
  getLoadStats() {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      maxConcurrentRequests: this.maxConcurrentRequests,
      maxQueueSize: this.maxQueueSize,
      loadPercentage: (this.activeRequests / this.maxConcurrentRequests) * 100
    };
  }

  /**
   * Health check for load balancer
   */
  isHealthy(): boolean {
    return this.activeRequests < this.maxConcurrentRequests * 0.9 && 
           this.requestQueue.length < this.maxQueueSize * 0.8;
  }
}

// Create singleton instance
const loadBalancingService = new LoadBalancingService();

/**
 * Load balancing middleware
 */
export const loadBalancingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  loadBalancingService.handleRequest(req, res, next);
};

/**
 * Health check endpoint for load balancer
 */
export const loadBalancerHealthCheck = (_req: Request, res: Response) => {
  const stats = loadBalancingService.getLoadStats();
  const isHealthy = loadBalancingService.isHealthy();

  res.status(isHealthy ? 200 : 503).json({
    healthy: isHealthy,
    stats,
    timestamp: new Date().toISOString()
  });
};

export { loadBalancingService };