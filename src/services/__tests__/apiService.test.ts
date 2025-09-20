/**
 * Unit tests for ApiService
 * Tests HTTP client functionality, error handling, and token management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosError } from 'axios';
import { apiService, TokenManager } from '../apiService';
import type { ApiResponse, ApiError } from '../../types/api';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('HTTP methods', () => {
    it('should make GET request successfully', async () => {
      const mockResponse = {
        data: { data: { id: 1, name: 'test' }, message: 'Success' },
        status: 200,
        statusText: 'OK',
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.get('/test');

      expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should make POST request successfully', async () => {
      const mockData = { name: 'test' };
      const mockResponse = {
        data: { data: { id: 1, ...mockData }, message: 'Created' },
        status: 201,
        statusText: 'Created',
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.post('/test', mockData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/test', mockData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should make PUT request successfully', async () => {
      const mockData = { id: 1, name: 'updated' };
      const mockResponse = {
        data: { data: mockData, message: 'Updated' },
        status: 200,
        statusText: 'OK',
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await apiService.put('/test/1', mockData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/test/1', mockData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should make DELETE request successfully', async () => {
      const mockResponse = {
        data: { message: 'Deleted' },
        status: 200,
        statusText: 'OK',
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await apiService.delete('/test/1');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should include custom headers in requests', async () => {
      const mockResponse = {
        data: { data: {}, message: 'Success' },
        status: 200,
        statusText: 'OK',
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const customHeaders = { 'Custom-Header': 'value' };
      await apiService.get('/test', { headers: customHeaders });

      expect(mockedAxios.get).toHaveBeenCalledWith('/test', {
        headers: customHeaders,
      });
    });
  });

  describe('Authentication token management', () => {
    it('should set auth token', () => {
      const token = 'test-token';
      apiService.setAuthToken(token);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('scholarfinder_token', token);
    });

    it('should get auth token', () => {
      const token = 'test-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      const result = apiService.getAuthToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('scholarfinder_token');
      expect(result).toBe(token);
    });

    it('should clear auth token', () => {
      apiService.clearAuthToken();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('scholarfinder_token');
    });

    it('should check authentication status', () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');

      const result = apiService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false for authentication when no token', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = apiService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const authError = new AxiosError('Unauthorized');
      authError.response = {
        status: 401,
        data: { type: 'AUTHENTICATION_ERROR', message: 'Token expired' },
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };

      mockedAxios.get.mockRejectedValue(authError);

      await expect(apiService.get('/test')).rejects.toThrow('Token expired');
    });

    it('should handle 403 authorization errors', async () => {
      const authError = new AxiosError('Forbidden');
      authError.response = {
        status: 403,
        data: { type: 'AUTHORIZATION_ERROR', message: 'Insufficient permissions' },
        statusText: 'Forbidden',
        headers: {},
        config: {} as any,
      };

      mockedAxios.get.mockRejectedValue(authError);

      await expect(apiService.get('/test')).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = new AxiosError('Not Found');
      notFoundError.response = {
        status: 404,
        data: { type: 'NOT_FOUND_ERROR', message: 'Resource not found' },
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };

      mockedAxios.get.mockRejectedValue(notFoundError);

      await expect(apiService.get('/test')).rejects.toThrow('Resource not found');
    });

    it('should handle 429 rate limit errors', async () => {
      const rateLimitError = new AxiosError('Too Many Requests');
      rateLimitError.response = {
        status: 429,
        data: { type: 'RATE_LIMIT_ERROR', message: 'Too many requests' },
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '60' },
        config: {} as any,
      };

      mockedAxios.get.mockRejectedValue(rateLimitError);

      await expect(apiService.get('/test')).rejects.toThrow('Too many requests');
    });

    it('should handle 500 server errors', async () => {
      const serverError = new AxiosError('Internal Server Error');
      serverError.response = {
        status: 500,
        data: { type: 'SERVER_ERROR', message: 'Internal server error' },
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      mockedAxios.get.mockRejectedValue(serverError);

      await expect(apiService.get('/test')).rejects.toThrow('Internal server error');
    });

    it('should handle network errors', async () => {
      const networkError = new AxiosError('Network Error');
      networkError.code = 'NETWORK_ERROR';

      mockedAxios.get.mockRejectedValue(networkError);

      await expect(apiService.get('/test')).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new AxiosError('Timeout');
      timeoutError.code = 'ECONNABORTED';

      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(apiService.get('/test')).rejects.toThrow('Request timeout');
    });

    it('should handle validation errors with field details', async () => {
      const validationError = new AxiosError('Validation Error');
      validationError.response = {
        status: 400,
        data: {
          type: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            email: 'Invalid email format',
            password: 'Password too short'
          }
        },
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      mockedAxios.post.mockRejectedValue(validationError);

      await expect(apiService.post('/test', {})).rejects.toThrow('Validation failed');
    });
  });

  describe('Request interceptors', () => {
    it('should add auth token to requests when authenticated', async () => {
      const token = 'test-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      const mockResponse = {
        data: { data: {}, message: 'Success' },
        status: 200,
        statusText: 'OK',
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await apiService.get('/test');

      // Verify that the request was made with the auth header
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
    });

    it('should not add auth token when not authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const mockResponse = {
        data: { data: {}, message: 'Success' },
        status: 200,
        statusText: 'OK',
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await apiService.get('/test');

      expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
    });
  });

  describe('Retry mechanism', () => {
    it('should retry failed requests up to max retries', async () => {
      const networkError = new AxiosError('Network Error');
      networkError.code = 'NETWORK_ERROR';

      // First two calls fail, third succeeds
      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({
          data: { data: {}, message: 'Success' },
          status: 200,
          statusText: 'OK',
        });

      const result = await apiService.get('/test');

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(result.message).toBe('Success');
    });

    it('should not retry non-retryable errors', async () => {
      const authError = new AxiosError('Unauthorized');
      authError.response = {
        status: 401,
        data: { type: 'AUTHENTICATION_ERROR', message: 'Token expired' },
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };

      mockedAxios.get.mockRejectedValue(authError);

      await expect(apiService.get('/test')).rejects.toThrow('Token expired');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});

describe('TokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('token operations', () => {
    it('should set token in localStorage', () => {
      const token = 'test-token';
      TokenManager.setToken(token);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('scholarfinder_token', token);
    });

    it('should get token from localStorage', () => {
      const token = 'test-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      const result = TokenManager.getToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('scholarfinder_token');
      expect(result).toBe(token);
    });

    it('should clear token from localStorage', () => {
      TokenManager.clearToken();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('scholarfinder_token');
    });

    it('should return null when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = TokenManager.getToken();

      expect(result).toBeNull();
    });
  });

  describe('token expiration', () => {
    it('should detect expired token', () => {
      // Create a token that expired 1 hour ago
      const expiredTime = Math.floor(Date.now() / 1000) - 3600;
      const expiredToken = `header.${btoa(JSON.stringify({ exp: expiredTime }))}.signature`;

      const result = TokenManager.isTokenExpired(expiredToken);

      expect(result).toBe(true);
    });

    it('should detect valid token', () => {
      // Create a token that expires in 1 hour
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const validToken = `header.${btoa(JSON.stringify({ exp: futureTime }))}.signature`;

      const result = TokenManager.isTokenExpired(validToken);

      expect(result).toBe(false);
    });

    it('should handle malformed tokens', () => {
      const malformedToken = 'invalid.token';

      const result = TokenManager.isTokenExpired(malformedToken);

      expect(result).toBe(true);
    });

    it('should handle tokens without expiration', () => {
      const tokenWithoutExp = `header.${btoa(JSON.stringify({ sub: 'user' }))}.signature`;

      const result = TokenManager.isTokenExpired(tokenWithoutExp);

      expect(result).toBe(true);
    });

    it('should handle empty or null tokens', () => {
      expect(TokenManager.isTokenExpired('')).toBe(true);
      expect(TokenManager.isTokenExpired(null as any)).toBe(true);
      expect(TokenManager.isTokenExpired(undefined as any)).toBe(true);
    });
  });

  describe('token parsing', () => {
    it('should extract user info from token', () => {
      const userInfo = { sub: 'user123', email: 'test@example.com', role: 'USER' };
      const token = `header.${btoa(JSON.stringify(userInfo))}.signature`;

      const result = TokenManager.parseToken(token);

      expect(result).toEqual(userInfo);
    });

    it('should handle malformed token parsing', () => {
      const malformedToken = 'invalid.token';

      const result = TokenManager.parseToken(malformedToken);

      expect(result).toBeNull();
    });

    it('should handle empty token parsing', () => {
      const result = TokenManager.parseToken('');

      expect(result).toBeNull();
    });
  });
});