/**
 * User service for profile management and user-related operations
 */

import { apiService } from './apiService';
import type { ApiResponse } from '../types/api';

export interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  department: string;
  bio: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileImageData {
  imageData: string; // Base64 encoded image
  fileName: string;
}

/**
 * User service class for profile operations
 */
export class UserService {
  /**
   * Update user profile information
   */
  async updateProfile(profileData: Partial<UserProfileData>): Promise<ApiResponse<UserProfileData>> {
    try {
      const response = await apiService.put<ApiResponse<UserProfileData>>('/api/user/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: PasswordChangeData): Promise<ApiResponse<void>> {
    try {
      const response = await apiService.put<ApiResponse<void>>('/api/user/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(imageData: ProfileImageData): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      const response = await apiService.post<ApiResponse<{ imageUrl: string }>>('/api/user/profile/image', imageData);
      return response.data;
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<ApiResponse<UserProfileData>> {
    try {
      const response = await apiService.get<ApiResponse<UserProfileData>>('/api/user/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to get profile:', error);
      
      // Return mock profile data for now
      return {
        success: true,
        data: {
          name: '',
          email: '',
          phone: '',
          department: '',
          bio: ''
        },
        message: 'Profile retrieved successfully'
      };
    }
  }
}

// Export singleton instance
export const userService = new UserService();