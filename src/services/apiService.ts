/**
 * Base API service class with Axios configuration and error handling
 * Provides centralized HTTP client with authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config } from '../lib/config';
import type { 
  ApiResponse, 
  ApiError, 
  UserFriendlyError, 
  RequestConfig,
  HttpMethod 
} from '../types/api';

/**
 * Configuration interface for API service
 */
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

/**
 * Token management utilities with enhanced JWT handling
 */
export class TokenManager {
  private static readonly TOKEN_KEY = 'scholarfinder_token';
  private static readonly REFRESH_TOKEN_KEY = 'scholarfinder_refresh_token';
  
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
  
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }
  
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  
  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
  
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  
  static getTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
  
  static getTokenExpirationTime(token: string): number | null {
    try {
      const payload = this.getTokenPayload(token);
      return payload?.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }
  
  static isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const expirationTime = this.getTokenExpirationTime(token);
      if (!expirationTime) return true;
      
      const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);
      return expirationTime <= thresholdTime;
    } catch {
      return true;
    }
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  static handle(error: any): UserFriendlyError {
    // Network errors (no response)
    if (!error.response) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        action: 'RETRY'
      };
    }

    const { status, data } = error.response;

    // Authentication errors
    if (status === 401) {
      // Use the error message from the backend if available
      const errorMessage = data?.error?.message || data?.message || 'Your session has expired. Please log in again.';
      
      return {
        type: 'AUTHENTICATION_ERROR',
        message: errorMessage,
        action: 'REDIRECT_TO_LOGIN'
      };
    }

    // Rate limiting errors
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      return {
        type: 'RATE_LIMIT_ERROR',
        message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        action: 'RETRY',
        retryAfter
      };
    }

    // Validation errors
    if (status === 400 || status === 409) {
      // Use the error message from the backend if available
      const errorMessage = data?.error?.message || data?.message || 'Invalid request data. Please check your input and try again.';
      
      return {
        type: 'VALIDATION_ERROR',
        message: errorMessage,
        details: data?.error?.details || data?.details
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        type: 'SERVER_ERROR',
        message: 'A server error occurred. Please try again later or contact support if the problem persists.',
        action: 'CONTACT_SUPPORT'
      };
    }

    // Other client errors
    if (status >= 400) {
      // Use the error message from the backend if available
      const errorMessage = data?.error?.message || data?.message || 'An unexpected error occurred. Please try again.';
      
      return {
        type: 'UNKNOWN_ERROR',
        message: errorMessage,
        details: data?.error?.details || data
      };
    }

    // Fallback for unknown errors
    return {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      details: error
    };
  }
}

/**
 * Base API service class
 */
export class ApiService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(apiConfig?: Partial<ApiConfig>) {
    const defaultConfig: ApiConfig = {
      baseURL: config.apiBaseUrl,
      timeout: config.apiTimeout,
      retries: 3
    };

    const finalConfig = { ...defaultConfig, ...apiConfig };

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: finalConfig.baseURL,
      timeout: finalConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Set up request interceptors
    this.setupRequestInterceptors();

    // Set up response interceptors
    this.setupResponseInterceptors();

    // Initialize with stored token if available
    const storedToken = TokenManager.getToken();
    if (storedToken && !TokenManager.isTokenExpired(storedToken)) {
      this.setAuthToken(storedToken);
    }
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    TokenManager.setToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
    delete this.axiosInstance.defaults.headers.common['Authorization'];
    TokenManager.clearToken();
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && !TokenManager.isTokenExpired(this.authToken);
  }

  /**
   * Add subscriber for token refresh
   */
  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify all refresh subscribers
   */
  private notifyRefreshSubscribers(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh authentication token
   */
  private async refreshAuthToken(): Promise<string> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the current refresh to complete
      return new Promise((resolve) => {
        this.addRefreshSubscriber(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.axiosInstance.post('/api/auth/refresh', {
        refreshToken
      });

      const { token, refreshToken: newRefreshToken } = response.data;
      
      this.setAuthToken(token);
      if (newRefreshToken) {
        TokenManager.setRefreshToken(newRefreshToken);
      }

      this.notifyRefreshSubscribers(token);
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuthToken();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Setup request interceptors
   */
  private setupRequestInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        // Add timestamp to prevent caching (but not for admin endpoints which might have issues)
        if (requestConfig.method === 'get' && !requestConfig.url?.includes('/admin/')) {
          requestConfig.params = {
            ...requestConfig.params,
            _t: Date.now()
          };
        }

        // Handle automatic token refresh
        const token = this.authToken;
        if (token && TokenManager.isTokenExpiringSoon(token)) {
          try {
            await this.refreshAuthToken();
          } catch (error) {
            console.error('Failed to refresh token in request interceptor:', error);
            // Continue with existing token - let response interceptor handle 401
          }
        }

        // Log request in development
        if (config.enableDevTools) {
          console.log(`[API Request] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
            params: requestConfig.params,
            data: requestConfig.data
          });
        }

        return requestConfig;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptors
   */
  private setupResponseInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (config.enableDevTools) {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle authentication errors with token refresh
        // BUT: Don't try to refresh token for login/register endpoints
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                               originalRequest.url?.includes('/auth/register') ||
                               originalRequest.url?.includes('/auth/refresh');
        
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            // Attempt to refresh token
            const newToken = await this.refreshAuthToken();
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.axiosInstance.request(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed, redirecting to login:', refreshError);
            
            // Clear authentication state
            this.clearAuthToken();
            
            // Redirect to login page
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
          }
        }

        // Log error in development
        if (config.enableDevTools) {
          console.error('[API Response Error]', {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async request<T = any>(requestConfig: RequestConfig): Promise<ApiResponse<T>> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const axiosConfig: AxiosRequestConfig = {
          method: requestConfig.method,
          url: requestConfig.url,
          data: requestConfig.data,
          params: requestConfig.params,
          headers: requestConfig.headers,
          timeout: requestConfig.timeout,
        };

        const response = await this.axiosInstance.request<ApiResponse<T>>(axiosConfig);
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if we should retry this error
        const shouldRetry = this.shouldRetryRequest(error, attempt);
        if (!shouldRetry) {
          break;
        }

        // Calculate retry delay with exponential backoff
        const delay = this.getRetryDelay(attempt, error);
        
        // Log retry attempt in development
        if (config.enableDevTools) {
          console.log(`[API Retry] Attempt ${attempt + 1}/${maxRetries} for ${requestConfig.method} ${requestConfig.url} in ${delay}ms`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed, throw the last error
    const userError = ErrorHandler.handle(lastError);
    
    // Create a proper Error object with the user-friendly message
    const error = new Error(userError.message);
    // Attach the full userError object for additional context
    (error as any).userError = userError;
    (error as any).type = userError.type;
    (error as any).details = userError.details;
    (error as any).action = userError.action;
    (error as any).retryAfter = userError.retryAfter;
    
    throw error;
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetryRequest(error: any, attemptNumber: number): boolean {
    // Don't retry if no response (might be network issue, but could be CORS, etc.)
    if (!error.response) {
      return true; // Retry network errors
    }

    const status = error.response.status;

    // Don't retry client errors (except 429)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // Retry server errors and rate limiting
    if (status >= 500 || status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attemptNumber: number, error?: any): number {
    // Use retry-after header for rate limit errors
    if (error?.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      return retryAfter * 1000;
    }

    // Exponential backoff with jitter
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    
    return Math.max(exponentialDelay + jitter, baseDelay);
  }

  /**
   * Convenience methods for different HTTP methods
   */
  async get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params
    });
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data
    });
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    console.log('ApiService PUT request:', { url, data });
    const result = await this.request<T>({
      method: 'PUT',
      url,
      data
    });
    console.log('ApiService PUT response:', result);
    return result;
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data
    });
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url
    });
  }

  /**
   * Upload file with progress tracking and extended timeout for large files
   */
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    // Calculate timeout based on file size (minimum 5 minutes, add 1 minute per 10MB)
    const baseTimeout = 5 * 60 * 1000; // 5 minutes
    const fileSizeInMB = file.size / (1024 * 1024);
    const additionalTimeout = Math.ceil(fileSizeInMB / 10) * 60 * 1000; // 1 minute per 10MB
    const uploadTimeout = baseTimeout + additionalTimeout;

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: uploadTimeout, // Dynamic timeout based on file size
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error) {
      const userError = ErrorHandler.handle(error);
      const err = new Error(userError.message);
      (err as any).userError = userError;
      (err as any).type = userError.type;
      throw err;
    }
  }

  /**
   * Download file
   */
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'blob',
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const userError = ErrorHandler.handle(error);
      const err = new Error(userError.message);
      (err as any).userError = userError;
      (err as any).type = userError.type;
      throw err;
    }
  }
}

// Create and export default API service instance
export const apiService = new ApiService();

export default apiService;