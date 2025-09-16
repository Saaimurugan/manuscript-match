import axios from 'axios';
import { EnhancedHttpClient } from '@/utils/EnhancedHttpClient';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EnhancedHttpClient', () => {
  let client: EnhancedHttpClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    client = new EnhancedHttpClient('test-service', {
      baseURL: 'https://api.test.com',
      timeout: 5000,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    client.resetCircuitBreaker();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 5000,
        headers: {
          'User-Agent': 'ScholarFinder/1.0.0',
        },
      });
    });

    it('should set up interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('successful requests', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        status: 200,
      });
    });

    it('should make GET request successfully', async () => {
      const result = await client.get('/test');
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
      });
    });

    it('should make POST request successfully', async () => {
      const data = { name: 'test' };
      const result = await client.post('/test', data);
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/test',
        data,
      });
    });

    it('should make PUT request successfully', async () => {
      const data = { name: 'updated' };
      const result = await client.put('/test/1', data);
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/test/1',
        data,
      });
    });

    it('should make DELETE request successfully', async () => {
      const result = await client.delete('/test/1');
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/test/1',
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('ECONNRESET');
      mockAxiosInstance.request.mockRejectedValue(networkError);
      
      await expect(client.get('/test')).rejects.toThrow(CustomError);
      await expect(client.get('/test')).rejects.toThrow('Network error when calling test-service');
    });

    it('should handle 429 rate limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
        message: 'Too Many Requests',
      };
      mockAxiosInstance.request.mockRejectedValue(rateLimitError);
      
      await expect(client.get('/test')).rejects.toThrow(CustomError);
      await expect(client.get('/test')).rejects.toThrow('Rate limit exceeded for test-service');
    });

    it('should handle 5xx server errors', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      mockAxiosInstance.request.mockRejectedValue(serverError);
      
      await expect(client.get('/test')).rejects.toThrow(CustomError);
      await expect(client.get('/test')).rejects.toThrow('Server error from test-service');
    });

    it('should handle 4xx client errors', async () => {
      const clientError = {
        response: { status: 400 },
        message: 'Bad Request',
      };
      mockAxiosInstance.request.mockRejectedValue(clientError);
      
      await expect(client.get('/test')).rejects.toThrow(CustomError);
      await expect(client.get('/test')).rejects.toThrow('Client error from test-service');
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue({ data: { success: true }, status: 200 });
      
      const result = await client.get('/test');
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx errors', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Server Error' })
        .mockResolvedValue({ data: { success: true }, status: 200 });
      
      const result = await client.get('/test');
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        response: { status: 400 },
        message: 'Bad Request',
      });
      
      await expect(client.get('/test')).rejects.toThrow();
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 rate limit errors', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce({ response: { status: 429 }, message: 'Rate Limited' })
        .mockResolvedValue({ data: { success: true }, status: 200 });
      
      const result = await client.get('/test');
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('circuit breaker integration', () => {
    it('should open circuit breaker after multiple failures', async () => {
      mockAxiosInstance.request.mockRejectedValue(new Error('ECONNRESET'));
      
      // Make multiple failed requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await client.get('/test');
        } catch (error) {
          // Expected to fail
        }
      }
      
      const stats = client.getCircuitBreakerStats();
      expect(stats.state).toBe('OPEN');
    });

    it('should reject requests immediately when circuit breaker is open', async () => {
      // Force circuit breaker open
      client.forceCircuitBreakerOpen();
      
      await expect(client.get('/test')).rejects.toThrow('Circuit breaker test-service is OPEN');
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting delay', async () => {
      const clientWithRateLimit = new EnhancedHttpClient('test-service', {
        baseURL: 'https://api.test.com',
        rateLimitDelay: 100,
      });
      
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        status: 200,
      });
      
      const startTime = Date.now();
      await clientWithRateLimit.get('/test');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('metrics and monitoring', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        status: 200,
      });
    });

    it('should track request metrics', async () => {
      await client.get('/test');
      
      const metrics = client.getRecentMetrics(10);
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toHaveProperty('requestId');
      expect(metrics[0]).toHaveProperty('url');
      expect(metrics[0]).toHaveProperty('method');
      expect(metrics[0]).toHaveProperty('startTime');
    });

    it('should clear metrics', async () => {
      await client.get('/test');
      expect(client.getRecentMetrics()).toHaveLength(1);
      
      client.clearMetrics();
      expect(client.getRecentMetrics()).toHaveLength(0);
    });
  });

  describe('manual circuit breaker control', () => {
    it('should allow manual reset', () => {
      client.forceCircuitBreakerOpen();
      expect(client.getCircuitBreakerStats().state).toBe('OPEN');
      
      client.resetCircuitBreaker();
      expect(client.getCircuitBreakerStats().state).toBe('CLOSED');
    });

    it('should allow forcing closed', () => {
      client.forceCircuitBreakerOpen();
      expect(client.getCircuitBreakerStats().state).toBe('OPEN');
      
      client.forceCircuitBreakerClosed();
      expect(client.getCircuitBreakerStats().state).toBe('CLOSED');
    });
  });
});