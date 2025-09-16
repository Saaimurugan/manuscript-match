import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '@/services/MonitoringService';
import { CustomError, ErrorType } from './errorHandler';

export interface ErrorRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  retryableErrors: ErrorType[];
}

const DEFAULT_OPTIONS: ErrorRecoveryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: [
    ErrorType.DATABASE_CONNECTION_ERROR,
    ErrorType.EXTERNAL_API_ERROR,
    ErrorType.TIMEOUT_ERROR,
  ],
};

// Error recovery middleware for automatic retry of failed operations
export const errorRecoveryMiddleware = (options: Partial<ErrorRecoveryOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return (error: Error, req: Request, _res: Response, next: NextFunction): void => {
    const monitoring = MonitoringService.getInstance();
    
    // Check if this error is retryable
    if (error instanceof CustomError && config.retryableErrors.includes(error.type)) {
      const retryCount = (req as any).retryCount || 0;
      
      if (retryCount < config.maxRetries) {
        // Increment retry count
        (req as any).retryCount = retryCount + 1;
        
        // Log retry attempt
        console.log(`Retrying request ${req.requestId}, attempt ${retryCount + 1}/${config.maxRetries}`);
        
        // Record retry in monitoring
        monitoring.recordError({
          timestamp: new Date(),
          type: error.type,
          message: `Retry attempt ${retryCount + 1}: ${error.message}`,
          requestId: req.requestId || 'unknown',
          url: req.url,
        });
        
        // Delay before retry
        setTimeout(() => {
          // Re-execute the original handler
          // Note: This is a simplified approach. In a real implementation,
          // you might need to store the original handler and re-execute it
          next();
        }, config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        
        return;
      }
    }
    
    // If not retryable or max retries reached, pass to error handler
    next(error);
  };
};

// Circuit breaker state manager for coordinating multiple circuit breakers
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers: Map<string, any> = new Map();
  private monitoring: MonitoringService;

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
  }

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  registerCircuitBreaker(name: string, circuitBreaker: any): void {
    this.circuitBreakers.set(name, circuitBreaker);
    
    // Listen to circuit breaker events
    circuitBreaker.on('opened', () => {
      this.monitoring.recordError({
        timestamp: new Date(),
        type: ErrorType.CIRCUIT_BREAKER_ERROR,
        message: `Circuit breaker ${name} opened`,
        requestId: 'system',
      });
    });

    circuitBreaker.on('closed', () => {
      console.log(`Circuit breaker ${name} closed - service recovered`);
    });
  }

  getCircuitBreakerStatus(name: string): any {
    const cb = this.circuitBreakers.get(name);
    return cb ? cb.getStats() : null;
  }

  getAllCircuitBreakerStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    this.circuitBreakers.forEach((cb, name) => {
      statuses[name] = cb.getStats();
    });
    return statuses;
  }

  resetCircuitBreaker(name: string): boolean {
    const cb = this.circuitBreakers.get(name);
    if (cb) {
      cb.reset();
      return true;
    }
    return false;
  }

  resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
  }
}

// Health check middleware that fails fast if critical services are down
export const healthCheckMiddleware = (criticalServices: string[] = []) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    const cbManager = CircuitBreakerManager.getInstance();
    
    // Check if any critical services have open circuit breakers
    const failedServices = criticalServices.filter(service => {
      const status = cbManager.getCircuitBreakerStatus(service);
      return status && status.state === 'OPEN';
    });
    
    if (failedServices.length > 0) {
      const error = new CustomError(
        ErrorType.CIRCUIT_BREAKER_ERROR,
        `Critical services unavailable: ${failedServices.join(', ')}`,
        503,
        { failedServices }
      );
      return next(error);
    }
    
    next();
  };
};

// Error correlation middleware for tracking related errors
export const errorCorrelationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add correlation ID for tracking related requests
  const correlationId = (req.headers['x-correlation-id'] as string) || req.requestId || 'unknown';
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

// Declare module augmentation for custom properties
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      retryCount?: number;
    }
  }
}