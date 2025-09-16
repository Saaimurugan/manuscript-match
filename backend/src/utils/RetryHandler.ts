export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
}

export class RetryHandler {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      // Default: retry on network errors and 5xx status codes
      if (!error || !error.message) return false;
      return error.message.includes('ECONNRESET') ||
             error.message.includes('ENOTFOUND') ||
             error.message.includes('ETIMEDOUT') ||
             error.message.includes('5') ||
             error.name === 'TimeoutError';
    },
  };

  static async execute<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry if this is the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(lastError)) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }

    // If we get here, all attempts failed
    throw new Error(
      `Operation failed after ${config.maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  private static calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, options.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method for creating retry-enabled functions
  static withRetry<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: Partial<RetryOptions> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.execute(() => fn(...args), options);
      return result.result;
    };
  }
}

// Specific retry configurations for different scenarios
export const RetryConfigs = {
  // For external API calls
  externalApi: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      // Retry on network errors and 5xx status codes, but not on 4xx
      if (!error || !error.message) return false;
      const message = error.message.toLowerCase();
      return message.includes('econnreset') ||
             message.includes('enotfound') ||
             message.includes('etimedout') ||
             message.includes('socket hang up') ||
             (message.includes('status') && message.includes('5'));
    },
  },

  // For database operations
  database: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: false,
    retryCondition: (error: Error) => {
      // Retry on connection errors but not on constraint violations
      if (!error || !error.message) return false;
      const message = error.message.toLowerCase();
      return message.includes('connection') ||
             message.includes('timeout') ||
             message.includes('lock');
    },
  },

  // For file operations
  fileOperation: {
    maxAttempts: 2,
    baseDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: false,
    retryCondition: (error: Error) => {
      // Retry on temporary file system errors
      if (!error || !error.message) return false;
      const message = error.message.toLowerCase();
      return message.includes('ebusy') ||
             message.includes('emfile') ||
             message.includes('enfile');
    },
  },
} as const;