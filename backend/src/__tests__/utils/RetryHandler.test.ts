import { RetryHandler, RetryConfigs } from '@/utils/RetryHandler';

describe('RetryHandler', () => {
  let mockOperation: jest.Mock;

  beforeEach(() => {
    mockOperation = jest.fn();
  });

  describe('successful operations', () => {
    it('should return result on first attempt', async () => {
      mockOperation.mockResolvedValue('success');

      const result = await RetryHandler.execute(mockOperation);

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      mockOperation
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const result = await RetryHandler.execute(mockOperation, {
        maxAttempts: 3,
        baseDelay: 10, // Short delay for testing
      });

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      mockOperation.mockRejectedValue(new Error('Validation failed'));

      await expect(RetryHandler.execute(mockOperation, {
        maxAttempts: 3,
        retryCondition: (error) => error.message.includes('network'),
      })).rejects.toThrow('Validation failed');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect maxAttempts limit', async () => {
      mockOperation.mockRejectedValue(new Error('ECONNRESET'));

      await expect(RetryHandler.execute(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10,
      })).rejects.toThrow('Operation failed after 2 attempts');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should use custom retry condition', async () => {
      mockOperation
        .mockRejectedValueOnce(new Error('Custom retryable error'))
        .mockResolvedValue('success');

      const result = await RetryHandler.execute(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10,
        retryCondition: (error) => error.message.includes('Custom'),
      });

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });
  });

  describe('delay calculation', () => {
    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for testing
      }) as any;

      mockOperation
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      await RetryHandler.execute(mockOperation, {
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitter: false,
      });

      expect(delays).toHaveLength(2);
      expect(delays[0]).toBe(100); // First retry: 100 * 2^0 = 100
      expect(delays[1]).toBe(200); // Second retry: 100 * 2^1 = 200

      global.setTimeout = originalSetTimeout;
    });

    it('should apply jitter when enabled', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      mockOperation
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      await RetryHandler.execute(mockOperation, {
        maxAttempts: 2,
        baseDelay: 100,
        jitter: true,
      });

      expect(delays).toHaveLength(1);
      // With jitter, delay should be between 50 and 100
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[0]).toBeLessThanOrEqual(100);

      global.setTimeout = originalSetTimeout;
    });

    it('should respect maxDelay limit', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      mockOperation
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      await RetryHandler.execute(mockOperation, {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 3,
        maxDelay: 1500,
        jitter: false,
      });

      expect(delays).toHaveLength(2);
      expect(delays[0]).toBe(1000); // First retry: 1000
      expect(delays[1]).toBe(1500); // Second retry: min(3000, 1500) = 1500

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('withRetry wrapper', () => {
    it('should create retry-enabled function', async () => {
      const originalFunction = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const retryFunction = RetryHandler.withRetry(originalFunction, {
        maxAttempts: 2,
        baseDelay: 10,
      });

      const result = await retryFunction('arg1', 'arg2');

      expect(result).toBe('success');
      expect(originalFunction).toHaveBeenCalledTimes(2);
      expect(originalFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('predefined configurations', () => {
    it('should use external API configuration', async () => {
      mockOperation
        .mockRejectedValueOnce(new Error('status 500'))
        .mockResolvedValue('success');

      const result = await RetryHandler.execute(mockOperation, RetryConfigs.externalApi);

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should use database configuration', async () => {
      mockOperation
        .mockRejectedValueOnce(new Error('connection timeout'))
        .mockResolvedValue('success');

      const result = await RetryHandler.execute(mockOperation, RetryConfigs.database);

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should not retry 4xx errors with external API config', async () => {
      mockOperation.mockRejectedValue(new Error('status 400'));

      await expect(RetryHandler.execute(mockOperation, RetryConfigs.externalApi))
        .rejects.toThrow('status 400');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should not retry constraint violations with database config', async () => {
      mockOperation.mockRejectedValue(new Error('unique constraint violation'));

      await expect(RetryHandler.execute(mockOperation, RetryConfigs.database))
        .rejects.toThrow('unique constraint violation');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should preserve original error message in final failure', async () => {
      const originalError = new Error('Original error message');
      mockOperation.mockRejectedValue(originalError);

      await expect(RetryHandler.execute(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10,
      })).rejects.toThrow('Operation failed after 2 attempts. Last error: Original error message');
    });

    it('should handle errors without message', async () => {
      const errorWithoutMessage = { name: 'CustomError' };
      mockOperation.mockRejectedValue(errorWithoutMessage);

      await expect(RetryHandler.execute(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10,
        retryCondition: () => false, // Don't retry to avoid null error issues
      })).rejects.toThrow('Operation failed after 2 attempts. Last error: Unknown error');
    });
  });
});