import { Request, Response, NextFunction } from 'express';
import { UserService } from '@/services/UserService';
import { ApiResponse } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import bcrypt from 'bcrypt';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get current user profile
   * GET /api/user/profile
   */
  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      console.log('Get profile request - User ID:', userId);
      
      if (!userId) {
        throw new CustomError(ErrorType.AUTHENTICATION_ERROR, 'User not authenticated', 401);
      }

      const user = await this.userService.getUserById(userId);
      console.log('Retrieved user for profile:', { 
        id: user?.id, 
        email: user?.email, 
        hasPasswordHash: !!user?.passwordHash 
      });
      
      if (!user) {
        throw new CustomError(ErrorType.NOT_FOUND_ERROR, 'User not found', 404);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          phone: user.phone || '',
          department: user.department || '',
          bio: user.bio || '',
          role: user.role,
          profileImage: user.profileImage || null,
          hasPassword: !!user.passwordHash // Add this for debugging
        },
        message: 'Profile retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   * PUT /api/user/profile
   */
  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new CustomError(ErrorType.AUTHENTICATION_ERROR, 'User not authenticated', 401);
      }

      const { name, phone, department, bio } = req.body;

      // Validate phone number if provided
      if (phone && !/^[\d\s\-\(\)\+]+$/.test(phone)) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'Phone number can only contain numbers, spaces, hyphens, parentheses, and plus sign', 
          400
        );
      }

      const updatedUser = await this.userService.updateUserProfile(userId, {
        name,
        phone,
        department,
        bio
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name || '',
          phone: updatedUser.phone || '',
          department: updatedUser.department || '',
          bio: updatedUser.bio || '',
          role: updatedUser.role
        },
        message: 'Profile updated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change user password
   * PUT /api/user/password
   */
  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      console.log('Change password request - User ID:', userId);
      console.log('Request user object:', req.user);
      console.log('Request body:', req.body);
      
      if (!userId) {
        throw new CustomError(ErrorType.AUTHENTICATION_ERROR, 'User not authenticated', 401);
      }

      const { currentPassword, newPassword } = req.body;
      console.log('Password change data received:', { 
        hasCurrentPassword: !!currentPassword, 
        hasNewPassword: !!newPassword,
        currentPasswordLength: currentPassword?.length,
        newPasswordLength: newPassword?.length
      });

      if (!currentPassword || !newPassword) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'Current password and new password are required', 
          400
        );
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'New password must be at least 8 characters long', 
          400
        );
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'Password must contain at least one uppercase letter, one lowercase letter, and one number', 
          400
        );
      }

      // Get current user
      const user = await this.userService.getUserById(userId);
      console.log('Retrieved user:', { 
        id: user?.id, 
        email: user?.email, 
        hasPasswordHash: !!user?.passwordHash 
      });
      
      if (!user) {
        throw new CustomError(ErrorType.NOT_FOUND_ERROR, 'User not found', 404);
      }

      // Check if user has a password set
      if (!user.passwordHash) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'No password is set for this account. Please contact support.', 
          400
        );
      }

      // Verify current password
      console.log('Comparing passwords...');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      console.log('Password comparison result:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'Current password is incorrect', 
          400
        );
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log('New password hashed successfully');

      // Update password
      console.log('Updating password in database...');
      const updatedUser = await this.userService.updateUserPassword(userId, hashedNewPassword);
      console.log('Password updated successfully for user:', updatedUser.id);

      const response: ApiResponse<void> = {
        success: true,
        message: 'Password updated successfully'
      };

      console.log('UserController: Sending response:', response);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload profile image
   * POST /api/user/profile/image
   */
  uploadProfileImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      console.log('Upload profile image request - User ID:', userId);
      console.log('Request body keys:', Object.keys(req.body));
      
      if (!userId) {
        throw new CustomError(ErrorType.AUTHENTICATION_ERROR, 'User not authenticated', 401);
      }

      const { imageData, fileName } = req.body;
      console.log('Upload data received:', {
        hasImageData: !!imageData,
        imageDataLength: imageData?.length,
        fileName: fileName
      });

      if (!imageData || !fileName) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'Image data and file name are required', 
          400
        );
      }

      // Validate image data (should be base64)
      if (!imageData.startsWith('data:image/')) {
        throw new CustomError(
          ErrorType.VALIDATION_ERROR, 
          'Invalid image data format', 
          400
        );
      }

      console.log('Updating user profile image in database...');
      
      // In a real implementation, you would:
      // 1. Validate the image
      // 2. Resize/optimize the image
      // 3. Upload to cloud storage (AWS S3, etc.)
      // 4. Save the URL to the database
      
      // For now, we'll just save the base64 data (not recommended for production)
      const updatedUser = await this.userService.updateUserProfileImage(userId, imageData);
      console.log('Profile image updated successfully for user:', updatedUser.id);

      const response: ApiResponse<{ imageUrl: string }> = {
        success: true,
        data: {
          imageUrl: updatedUser.profileImage || imageData
        },
        message: 'Profile image uploaded successfully'
      };

      console.log('UserController: Sending upload response:', response);
      res.status(200).json(response);
    } catch (error) {
      console.error('UserController: Upload profile image error:', error);
      next(error);
    }
  };
}