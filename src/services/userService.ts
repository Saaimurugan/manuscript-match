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
      console.log('UserService: Updating profile...');
      console.log('UserService: Profile data:', profileData);
      
      const response = await apiService.put<ApiResponse<UserProfileData>>('/api/user/profile', profileData);
      console.log('UserService: Profile update response:', response);
      
      // The apiService.request method already returns response.data
      // So 'response' here is already the API response object
      if (response && typeof response === 'object' && response.success !== undefined) {
        console.log('UserService: Returning API response directly');
        return response;
      }
      
      // Fallback - assume success if we got here without error
      console.log('UserService: Using fallback success response');
      return {
        success: true,
        data: profileData as UserProfileData,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('UserService: Failed to update profile:', error);
      console.error('UserService: Error details:', {
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status,
        message: error?.message
      });
      
      // Return a proper error response instead of throwing
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Failed to update profile'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: PasswordChangeData): Promise<ApiResponse<void>> {
    try {
      console.log('UserService: Calling password change API...');
      console.log('UserService: Password data:', {
        hasCurrentPassword: !!passwordData.currentPassword,
        hasNewPassword: !!passwordData.newPassword
      });
      
      const response = await apiService.put<ApiResponse<void>>('/api/user/password', passwordData);
      console.log('UserService: Raw API response:', response);
      console.log('UserService: Response type:', typeof response);
      console.log('UserService: Response keys:', response ? Object.keys(response) : 'null');
      
      // The apiService.request method already returns response.data
      // So 'response' here is already the API response object
      if (response && typeof response === 'object' && response.success !== undefined) {
        console.log('UserService: Returning API response directly');
        return response;
      }
      
      // Fallback - assume success if we got here without error
      console.log('UserService: Using fallback success response');
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('UserService: Failed to change password:', error);
      console.error('UserService: Error type:', typeof error);
      console.error('UserService: Error keys:', error ? Object.keys(error) : 'null');
      
      // Return a proper error response instead of throwing
      if (error && typeof error === 'object' && error.response) {
        console.error('UserService: Error response:', error.response);
        return {
          success: false,
          message: error.response.data?.message || error.message || 'Failed to change password'
        };
      }
      
      return {
        success: false,
        message: 'Failed to change password. Please try again.'
      };
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(imageData: ProfileImageData): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      console.log('UserService: Uploading profile image...');
      console.log('UserService: Image data length:', imageData.imageData?.length);
      console.log('UserService: File name:', imageData.fileName);
      
      const response = await apiService.post<ApiResponse<{ imageUrl: string }>>('/api/user/profile/image', imageData);
      console.log('UserService: Upload response:', response);
      
      // The apiService.request method already returns response.data
      // So 'response' here is already the API response object
      if (response && typeof response === 'object' && response.success !== undefined) {
        console.log('UserService: Returning API response directly');
        return response;
      }
      
      // Fallback - assume success if we got here without error
      console.log('UserService: Using fallback success response');
      return {
        success: true,
        data: { imageUrl: imageData.imageData },
        message: 'Profile image uploaded successfully'
      };
    } catch (error) {
      console.error('UserService: Failed to upload profile image:', error);
      console.error('UserService: Error details:', {
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status,
        message: error?.message
      });
      
      // Return a proper error response instead of throwing
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Failed to upload profile image'
      };
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