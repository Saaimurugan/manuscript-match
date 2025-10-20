import { UserRepository } from '@/repositories/UserRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';

import { User } from '@prisma/client';
import { UserRole, UserStatus } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';

export interface UserProfileUpdateData {
  name?: string;
  phone?: string;
  department?: string;
  bio?: string;
}

export class UserService {
  private userRepository: UserRepository;
  private activityLogRepository: ActivityLogRepository;

  constructor() {
    this.userRepository = new UserRepository(prisma);
    this.activityLogRepository = new ActivityLogRepository(prisma);
    // Note: PermissionService requires repositories, but we don't use it in current implementation
    // this.permissionService = new PermissionService(permissionRepository, userRepository, activityLogRepository);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, profileData: UserProfileUpdateData): Promise<User> {
    return await this.userRepository.updateProfile(userId, profileData);
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    return await this.userRepository.updatePassword(userId, hashedPassword);
  }

  /**
   * Update user profile image
   */
  async updateUserProfileImage(userId: string, imageData: string): Promise<User> {
    return await this.userRepository.updateProfileImage(userId, imageData);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  /**
   * Promote user to admin role
   */
  async promoteToAdmin(userId: string, promotedBy: string): Promise<User> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    // Check if user is already an admin
    if (user.role === UserRole.ADMIN) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User is already an admin',
        400
      );
    }

    // Update user role
    const updatedUser = await this.userRepository.update(userId, {
      role: UserRole.ADMIN
    });

    // Log the activity
    try {
      await this.activityLogRepository.create({
        userId: promotedBy,
        action: 'USER_PROMOTED_TO_ADMIN',
        details: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email,
          previousRole: user.role
        }),
        resourceType: 'user',
        resourceId: userId
      });
    } catch (error) {
      console.warn('Failed to log promotion activity:', error);
    }

    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    // Prevent self-deletion
    if (userId === deletedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Cannot delete yourself',
        400
      );
    }

    // Log the activity before deletion
    try {
      await this.activityLogRepository.create({
        userId: deletedBy,
        action: 'USER_DELETED',
        details: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email,
          targetUserRole: user.role
        }),
        resourceType: 'user',
        resourceId: userId
      });
    } catch (error) {
      console.warn('Failed to log deletion activity:', error);
    }

    // Delete the user
    await this.userRepository.delete(userId);
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateData: any, updatedBy: string): Promise<User> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    // Update the user
    const updatedUser = await this.userRepository.update(userId, updateData);

    // Log the activity
    try {
      await this.activityLogRepository.create({
        userId: updatedBy,
        action: 'USER_UPDATED',
        details: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email,
          changes: updateData
        }),
        resourceType: 'user',
        resourceId: userId
      });
    } catch (error) {
      console.warn('Failed to log update activity:', error);
    }

    return updatedUser;
  }

  /**
   * Block user
   */
  async blockUser(userId: string, blockedBy: string, reason?: string): Promise<User> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    // Check if user is already blocked
    if (user.status === UserStatus.BLOCKED) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User is already blocked',
        400
      );
    }

    // Prevent self-blocking
    if (userId === blockedBy) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Cannot block yourself',
        400
      );
    }

    // Update user status using direct prisma call since UpdateUserInput doesn't include status fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.BLOCKED,
        blockedAt: new Date(),
        blockedBy: blockedBy
      }
    });

    // Log the activity
    try {
      await this.activityLogRepository.create({
        userId: blockedBy,
        action: 'USER_BLOCKED',
        details: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason || 'No reason provided'
        }),
        resourceType: 'user',
        resourceId: userId
      });
    } catch (error) {
      console.warn('Failed to log blocking activity:', error);
    }

    return updatedUser;
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string, unblockedBy: string): Promise<User> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomError(
        ErrorType.NOT_FOUND,
        'User not found',
        404
      );
    }

    // Check if user is actually blocked
    if (user.status !== UserStatus.BLOCKED) {
      throw new CustomError(
        ErrorType.VALIDATION_ERROR,
        'User is not blocked',
        400
      );
    }

    // Update user status using direct prisma call since UpdateUserInput doesn't include status fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        blockedAt: null,
        blockedBy: null
      }
    });

    // Log the activity
    try {
      await this.activityLogRepository.create({
        userId: unblockedBy,
        action: 'USER_UNBLOCKED',
        details: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email
        }),
        resourceType: 'user',
        resourceId: userId
      });
    } catch (error) {
      console.warn('Failed to log unblocking activity:', error);
    }

    return updatedUser;
  }
}