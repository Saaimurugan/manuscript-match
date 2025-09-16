import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CircuitBreaker, CircuitBreakerOptions } from './CircuitBreaker';
import { RetryHandler, RetryOptions } from './RetryHandler';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  retry?: Partial<RetryOptions>;
  rateLimitDelay?: number;
}

export interface RequestMetrics {
  requestId: string;
  url: string;
  method: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  statusCode?: number;
  error?: string;
  retryAttempts?: number;
  circuitBreakerState?: string;
}

export class EnhancedHttpClient {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private requestMetrics: Map<string, RequestMetrics> = new Map();
  private rateLimitDelay: number;

  constructor(
    private readonly name: string,
    private readonly options: HttpClientOptions
  ) {
    this.rateLimitDelay = options.rateLimitDelay || 100;
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'User-Agent': 'ScholarFinder/1.0.0',
        ...options.headers,
      },
    });

    // Create circuit breaker
    const circuitBreakerOptions: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedErrors: (error: Error) => {
        // Don't count 4xx errors (except 429) as circuit breaker failures
        const status = this.extractStatusCode(error);
        return status >= 400 && status < 500 && status !== 429;
      },
      ...options.circuitBreaker,
    };

    this.circuitBreaker = new CircuitBreaker(name, circuitBreakerOptions);
    
    // Set up circuit breaker event listeners
    this.setupCircuitBreakerListeners();
    
    // Set up axios interceptors
    this.setupInterceptors();
  }

  private setupCircuitBreakerListeners(): void {
    this.circuitBreaker.on('opened', (name, error) => {
      console.warn(`Circuit breaker ${name} opened due to error:`, error.message);
    });

    this.circuitBreaker.on('halfOpen', (name) => {
      console.info(`Circuit breaker ${name} is half-open, testing service`);
    });

    this.circuitBreaker.on('closed', (name) => {
      console.info(`Circuit breaker ${name} closed, service recovered`);
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = this.generateRequestId();
        config.metadata = { requestId, startTime: new Date() };
        
        // Store request metrics
        this.requestMetrics.set(requestId, {
          requestId,
          url: `${config.baseURL}${config.url}`,
          method: config.method?.toUpperCase() || 'GET',
          startTime: config.metadata.startTime,
        });

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.updateRequestMetrics(response.config.metadata?.requestId, {
          endTime: new Date(),
          statusCode: response.status,
        });
        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId;
        if (requestId) {
          this.updateRequestMetrics(requestId, {
            endTime: new Date(),
            statusCode: error.response?.status,
            error: error.message,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const retryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error: Error) => {
        const status = this.extractStatusCode(error);
        // Retry on network errors, 5xx errors, and 429 (rate limit)
        return this.isNetworkError(error) || 
               (status >= 500) || 
               (status === 429);
      },
      ...this.options.retry,
    };

    const operation = async (): Promise<T> => {
      return this.circuitBreaker.execute(async () => {
        // Add rate limiting delay
        if (this.rateLimitDelay > 0) {
          await this.sleep(this.rateLimitDelay);
        }

        try {
          const response: AxiosResponse<T> = await this.axiosInstance.request(config);
          return response.data;
        } catch (error) {
          throw this.enhanceError(error);
        }
      });
    };

    try {
      const result = await RetryHandler.execute(operation, retryOptions);
      
      // Update metrics with retry information
      const requestId = config.metadata?.requestId;
      if (requestId) {
        this.updateRequestMetrics(requestId, {
          retryAttempts: result.attempts - 1,
          circuitBreakerState: this.circuitBreaker.getStats().state,
        });
      }

      return result.result;
    } catch (error) {
      throw this.enhanceError(error);
    }
  }

  private enhanceError(error: any): CustomError {
    const status = this.extractStatusCode(error);
    
    if (this.isNetworkError(error)) {
      return new CustomError(
        ErrorType.EXTERNAL_API_ERROR,
        `Network error when calling ${this.name}: ${error.message}`,
        503,
        { originalError: error.message, service: this.name }
      );
    }

    if (status === 429) {
      return new CustomError(
        ErrorType.RATE_LIMIT_ERROR,
        `Rate limit exceeded for ${this.name}`,
        429,
        { service: this.name, retryAfter: error.response?.headers['retry-after'] }
      );
    }

    if (status >= 500) {
      return new CustomError(
        ErrorType.EXTERNAL_API_ERROR,
        `Server error from ${this.name}: ${error.message}`,
        502,
        { originalError: error.message, service: this.name, statusCode: status }
      );
    }

    if (status >= 400) {
      return new CustomError(
        ErrorType.EXTERNAL_API_ERROR,
        `Client error from ${this.name}: ${error.message}`,
        status,
        { originalError: error.message, service: this.name }
      );
    }

    return new CustomError(
      ErrorType.EXTERNAL_API_ERROR,
      `Unknown error from ${this.name}: ${error.message}`,
      500,
      { originalError: error.message, service: this.name }
    );
  }

  private extractStatusCode(error: any): number {
    return error.response?.status || 0;
  }

  private isNetworkError(error: any): boolean {
    return !error.response && (
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.message.includes('timeout') ||
      error.message.includes('socket hang up')
    );
  }

  private generateRequestId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateRequestMetrics(requestId: string, updates: Partial<RequestMetrics>): void {
    const existing = this.requestMetrics.get(requestId);
    if (existing) {
      const updated = { ...existing, ...updates };
      if (updated.startTime && updated.endTime) {
        updated.duration = updated.endTime.getTime() - updated.startTime.getTime();
      }
      this.requestMetrics.set(requestId, updated);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Monitoring and debugging methods
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  getRecentMetrics(limit: number = 100): RequestMetrics[] {
    const metrics = Array.from(this.requestMetrics.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
    
    return metrics;
  }

  clearMetrics(): void {
    this.requestMetrics.clear();
  }

  // Manual circuit breaker control
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  forceCircuitBreakerOpen(): void {
    this.circuitBreaker.forceOpen();
  }

  forceCircuitBreakerClosed(): void {
    this.circuitBreaker.forceClosed();
  }
}