import { PrismaClient } from '@prisma/client';
import { UserRepository, CreateUserInput, UpdateUserInput } from '../../repositories/UserRepository';

// Mock PrismaClient
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData: CreateUserInput = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
      };

      const expectedUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(expectedUser);

      const result = await userRepository.create(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userId = 'user-123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(expectedUser);

      const result = await userRepository.findById(userId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw error for invalid id', async () => {
      await expect(userRepository.findById('')).rejects.toThrow('Invalid ID provided');
      await expect(userRepository.findById(null as any)).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: 'user-123',
        email,
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(expectedUser);

      const result = await userRepository.findByEmail(email);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw error for invalid email', async () => {
      await expect(userRepository.findByEmail('')).rejects.toThrow('Invalid email provided');
      await expect(userRepository.findByEmail(null as any)).rejects.toThrow('Invalid email provided');
    });
  });

  describe('findMany', () => {
    it('should find users with default options', async () => {
      const expectedUsers = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(expectedUsers);

      const result = await userRepository.findMany();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedUsers);
    });

    it('should find users with pagination options', async () => {
      const options = { skip: 10, take: 5, orderBy: { email: 'asc' } };
      const expectedUsers = [{ id: 'user-1', email: 'user1@example.com' }];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(expectedUsers);

      const result = await userRepository.findMany(options);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(options);
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const userId = 'user-123';
      const updateData: UpdateUserInput = {
        email: 'newemail@example.com',
      };

      const expectedUser = {
        id: userId,
        email: 'newemail@example.com',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(expectedUser);

      const result = await userRepository.update(userId, updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw error for invalid id', async () => {
      const updateData: UpdateUserInput = { email: 'test@example.com' };
      await expect(userRepository.update('', updateData)).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const userId = 'user-123';

      (mockPrisma.user.delete as jest.Mock).mockResolvedValue({});

      await userRepository.delete(userId);

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw error for invalid id', async () => {
      await expect(userRepository.delete('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('count', () => {
    it('should return user count', async () => {
      const expectedCount = 42;

      (mockPrisma.user.count as jest.Mock).mockResolvedValue(expectedCount);

      const result = await userRepository.count();

      expect(mockPrisma.user.count).toHaveBeenCalled();
      expect(result).toBe(expectedCount);
    });
  });
});