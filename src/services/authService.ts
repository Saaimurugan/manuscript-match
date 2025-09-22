/**
 * Authentication service for handling login, logout, token verification, and profile management
 * Provides methods for user authentication and JWT token management
 */

import { apiService } from './apiService';
import { TokenManager } from './apiService';
import type {
  LoginCredentials,
  AuthResponse,
  UserProfile,
  ApiResponse
} from '../types/api';

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * Authentication service class
 */
export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', credentials);

      // Debug: Log the actual response structure
      console.log('DEBUG: Full API response:', response);
      console.log('DEBUG: Response data:', response.data);

      // Extract the actual auth response from the wrapped API response
      const authResponse = response.data.data;

      console.log('DEBUG: Extracted auth response:', authResponse);

      // Handle different possible response structures
      let finalAuthResponse: AuthResponse;

      if (authResponse) {
        // Response is wrapped in ApiResponse structure
        finalAuthResponse = authResponse;
      } else if (response.data.token) {
        // Response data directly contains the auth response
        finalAuthResponse = response.data as AuthResponse;
      } else {
        throw new Error('Invalid response structure: no token found');
      }

      // Set the token in the API service and token manager
      if (finalAuthResponse.token) {
        apiService.setAuthToken(finalAuthResponse.token);

        // Store refresh token if provided
        if (finalAuthResponse.refreshToken) {
          TokenManager.setRefreshToken(finalAuthResponse.refreshToken);
        }
      }

      return finalAuthResponse;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint if authenticated
      if (apiService.isAuthenticated()) {
        const refreshToken = TokenManager.getRefreshToken();
        await apiService.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Log error but don't throw - we still want to clear local state
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local authentication state
      apiService.clearAuthToken();
    }
  }

  /**
   * Verify if the current token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      const token = TokenManager.getToken();

      // No token available
      if (!token) {
        return false;
      }

      // Token is expired
      if (TokenManager.isTokenExpired(token)) {
        apiService.clearAuthToken();
        return false;
      }

      // Verify token with backend
      await apiService.get('/api/auth/verify');
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      apiService.clearAuthToken();
      return false;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      console.log('DEBUG: Calling getProfile API...');
      const response = await apiService.get<{ success: boolean; data: UserProfile }>('/api/auth/profile');
      console.log('DEBUG: getProfile response:', response);
      console.log('DEBUG: getProfile response.data:', response.data);
      
      // Handle different possible response structures
      let userProfile: UserProfile;
      
      if (response.data.data) {
        // Response is wrapped in ApiResponse structure
        userProfile = response.data.data;
      } else if (response.data.id) {
        // Response data directly contains the user profile
        userProfile = response.data as UserProfile;
      } else {
        throw new Error('Invalid response structure: no user profile found');
      }
      
      console.log('DEBUG: Final user profile:', userProfile);
      return userProfile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await apiService.put<{ success: boolean; data: UserProfile }>('/api/auth/profile', profileData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      await apiService.post('/api/auth/change-password', passwordData);
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiService.post('/api/auth/forgot-password', { email });
    } catch (error) {
      console.error('Failed to request password reset:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiService.post('/api/auth/reset-password', { token, newPassword });
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post<{ success: boolean; data: { token: string; refreshToken?: string } }>('/api/auth/refresh', {
        refreshToken
      });

      const tokenData = response.data.data;

      if (tokenData.token) {
        apiService.setAuthToken(tokenData.token);

        // Update refresh token if provided
        if (tokenData.refreshToken) {
          TokenManager.setRefreshToken(tokenData.refreshToken);
        }
      }

      return tokenData.token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      apiService.clearAuthToken();
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  /**
   * Get current authentication token
   */
  getCurrentToken(): string | null {
    return apiService.getAuthToken();
  }
}

// Create and export default auth service instance
export const authService = new AuthService();

export default authService;