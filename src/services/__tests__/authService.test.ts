/**
 * Unit tests for AuthService
 * Tests authentication functionality with mocked API calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';
import { apiService } from '../apiService';
import type { LoginCredentials, AuthResponse, UserProfile } from '../../types/api';

// Mock the API service
vi.mock('../apiService', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    isAuthenticated: vi.fn(),
    getAuthToken: vi.fn(),
  },
  TokenManager: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    isTokenExpired: vi.fn(),
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse: AuthResponse = {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'USER',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };

      (apiService.post as any).mockResolvedValue({ data: mockAuthResponse });

      const result = await authService.login(credentials);

      expect(apiService.post).toHaveBeenCalledWith('/api/auth/login', credentials);
      expect(apiService.setAuthToken).toHaveBeenCalledWith('mock-jwt-token');
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error on login failure', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockError = new Error('Invalid credentials');
      (apiService.post as any).mockRejectedValue(mockError);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(apiService.setAuthToken).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      (apiService.post as any).mockRejectedValue(networkError);

      await expect(authService.login(credentials)).rejects.toThrow('Network Error');
    });

    it('should handle rate limiting errors', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const rateLimitError = new Error('Too many requests');
      (rateLimitError as any).response = { status: 429 };
      (apiService.post as any).mockRejectedValue(rateLimitError);

      await expect(authService.login(credentials)).rejects.toThrow('Too many requests');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      (apiService.isAuthenticated as any).mockReturnValue(true);
      (apiService.post as any).mockResolvedValue({});

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/auth/logout');
      expect(apiService.clearAuthToken).toHaveBeenCalled();
    });

    it('should clear auth token even if API call fails', async () => {
      (apiService.isAuthenticated as any).mockReturnValue(true);
      (apiService.post as any).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(apiService.clearAuthToken).toHaveBeenCalled();
    });

    it('should handle logout when not authenticated', async () => {
      (apiService.isAuthenticated as any).mockReturnValue(false);

      await authService.logout();

      expect(apiService.post).not.toHaveBeenCalled();
      expect(apiService.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should return true for valid token', async () => {
      const mockToken = 'valid-token';
      const { TokenManager } = require('../apiService');
      
      TokenManager.getToken.mockReturnValue(mockToken);
      TokenManager.isTokenExpired.mockReturnValue(false);
      (apiService.get as any).mockResolvedValue({});

      const result = await authService.verifyToken();

      expect(result).toBe(true);
      expect(apiService.get).toHaveBeenCalledWith('/api/auth/verify');
    });

    it('should return false for expired token', async () => {
      const mockToken = 'expired-token';
      const { TokenManager } = require('../apiService');
      
      TokenManager.getToken.mockReturnValue(mockToken);
      TokenManager.isTokenExpired.mockReturnValue(true);

      const result = await authService.verifyToken();

      expect(result).toBe(false);
      expect(apiService.clearAuthToken).toHaveBeenCalled();
    });

    it('should return false when no token exists', async () => {
      const { TokenManager } = require('../apiService');
      TokenManager.getToken.mockReturnValue(null);

      const result = await authService.verifyToken();

      expect(result).toBe(false);
      expect(apiService.get).not.toHaveBeenCalled();
    });

    it('should handle token verification API errors', async () => {
      const mockToken = 'valid-token';
      const { TokenManager } = require('../apiService');
      
      TokenManager.getToken.mockReturnValue(mockToken);
      TokenManager.isTokenExpired.mockReturnValue(false);
      (apiService.get as any).mockRejectedValue(new Error('Server error'));

      const result = await authService.verifyToken();

      expect(result).toBe(false);
      expect(apiService.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const newToken = 'new-jwt-token';
      (apiService.post as any).mockResolvedValue({ data: { token: newToken } });

      const result = await authService.refreshToken();

      expect(apiService.post).toHaveBeenCalledWith('/api/auth/refresh');
      expect(apiService.setAuthToken).toHaveBeenCalledWith(newToken);
      expect(result).toBe(newToken);
    });

    it('should handle refresh token failure', async () => {
      (apiService.post as any).mockRejectedValue(new Error('Refresh failed'));

      await expect(authService.refreshToken()).rejects.toThrow('Refresh failed');
      expect(apiService.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockProfile: UserProfile = {
        id: '1',
        email: 'test@example.com',
        role: 'USER',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (apiService.get as any).mockResolvedValue({ data: mockProfile });

      const result = await authService.getProfile();

      expect(apiService.get).toHaveBeenCalledWith('/api/auth/profile');
      expect(result).toEqual(mockProfile);
    });

    it('should handle profile loading errors', async () => {
      (apiService.get as any).mockRejectedValue(new Error('Profile not found'));

      await expect(authService.getProfile()).rejects.toThrow('Profile not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        oldPassword: 'oldpass',
        newPassword: 'newpass'
      };

      (apiService.post as any).mockResolvedValue({});

      await authService.changePassword(passwordData);

      expect(apiService.post).toHaveBeenCalledWith('/api/auth/change-password', passwordData);
    });

    it('should handle password change validation errors', async () => {
      const passwordData = {
        oldPassword: 'wrongpass',
        newPassword: 'newpass'
      };

      const validationError = new Error('Current password is incorrect');
      (validationError as any).response = { status: 400 };
      (apiService.post as any).mockRejectedValue(validationError);

      await expect(authService.changePassword(passwordData)).rejects.toThrow('Current password is incorrect');
    });

    it('should validate password strength', async () => {
      const passwordData = {
        oldPassword: 'oldpass',
        newPassword: '123' // weak password
      };

      const validationError = new Error('Password too weak');
      (validationError as any).response = { status: 400 };
      (apiService.post as any).mockRejectedValue(validationError);

      await expect(authService.changePassword(passwordData)).rejects.toThrow('Password too weak');
    });
  });

  describe('isAuthenticated', () => {
    it('should return authentication status from API service', () => {
      (apiService.isAuthenticated as any).mockReturnValue(true);

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
      expect(apiService.isAuthenticated).toHaveBeenCalled();
    });

    it('should return false when not authenticated', () => {
      (apiService.isAuthenticated as any).mockReturnValue(false);

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle API service unavailable', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const serviceError = new Error('Service Unavailable');
      (serviceError as any).response = { status: 503 };
      (apiService.post as any).mockRejectedValue(serviceError);

      await expect(authService.login(credentials)).rejects.toThrow('Service Unavailable');
    });

    it('should handle timeout errors', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      (apiService.post as any).mockRejectedValue(timeoutError);

      await expect(authService.login(credentials)).rejects.toThrow('Request timeout');
    });
  });
});