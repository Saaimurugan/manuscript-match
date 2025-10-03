import { UserRepository } from '@/repositories/UserRepository';
import { User } from '@prisma/client';
import { prisma } from '@/config/database';

export interface UserProfileUpdateData {
  name?: string;
  phone?: string;
  department?: string;
  bio?: string;
}

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository(prisma);
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
}