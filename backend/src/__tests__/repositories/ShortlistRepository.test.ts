import { PrismaClient } from '@prisma/client';
import { ShortlistRepository, CreateShortlistInput, UpdateShortlistInput } from '../../repositories/ShortlistRepository';

// Mock PrismaClient
const mockPrisma = {
  shortlist: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ShortlistRepository', () => {
  let shortlistRepository: ShortlistRepository;

  beforeEach(() => {
    shortlistRepository = new ShortlistRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new shortlist', async () => {
      const shortlistData: CreateShortlistInput = {
        processId: 'process-123',
        name: 'Top Reviewers',
      };

      const expectedShortlist = {
        id: 'shortlist-123',
        processId: 'process-123',
        name: 'Top Reviewers',
        createdAt: new Date(),
      };

      (mockPrisma.shortlist.create as jest.Mock).mockResolvedValue(expectedShortlist);

      const result = await shortlistRepository.create(shortlistData);

      expect(mockPrisma.shortlist.create).toHaveBeenCalledWith({
        data: shortlistData,
      });
      expect(result).toEqual(expectedShortlist);
    });
  });

  describe('findById', () => {
    it('should find shortlist by id', async () => {
      const shortlistId = 'shortlist-123';
      const expectedShortlist = {
        id: shortlistId,
        processId: 'process-123',
        name: 'Top Reviewers',
        createdAt: new Date(),
      };

      (mockPrisma.shortlist.findUnique as jest.Mock).mockResolvedValue(expectedShortlist);

      const result = await shortlistRepository.findById(shortlistId);

      expect(mockPrisma.shortlist.findUnique).toHaveBeenCalledWith({
        where: { id: shortlistId },
      });
      expect(result).toEqual(expectedShortlist);
    });

    it('should throw error for invalid id', async () => {
      await expect(shortlistRepository.findById('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('findByProcessId', () => {
    it('should find shortlists by process id', async () => {
      const processId = 'process-123';
      const expectedShortlists = [
        {
          id: 'shortlist-1',
          processId,
          name: 'Top Reviewers',
          createdAt: new Date(),
        },
        {
          id: 'shortlist-2',
          processId,
          name: 'Backup Reviewers',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.shortlist.findMany as jest.Mock).mockResolvedValue(expectedShortlists);

      const result = await shortlistRepository.findByProcessId(processId);

      expect(mockPrisma.shortlist.findMany).toHaveBeenCalledWith({
        where: { processId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedShortlists);
    });

    it('should throw error for invalid process id', async () => {
      await expect(shortlistRepository.findByProcessId('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('update', () => {
    it('should update shortlist', async () => {
      const shortlistId = 'shortlist-123';
      const updateData: UpdateShortlistInput = {
        name: 'Updated Shortlist Name',
      };

      const expectedShortlist = {
        id: shortlistId,
        processId: 'process-123',
        name: 'Updated Shortlist Name',
        createdAt: new Date(),
      };

      (mockPrisma.shortlist.update as jest.Mock).mockResolvedValue(expectedShortlist);

      const result = await shortlistRepository.update(shortlistId, updateData);

      expect(mockPrisma.shortlist.update).toHaveBeenCalledWith({
        where: { id: shortlistId },
        data: updateData,
      });
      expect(result).toEqual(expectedShortlist);
    });

    it('should throw error for invalid id', async () => {
      const updateData: UpdateShortlistInput = { name: 'Test' };
      await expect(shortlistRepository.update('', updateData)).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('delete', () => {
    it('should delete shortlist', async () => {
      const shortlistId = 'shortlist-123';

      (mockPrisma.shortlist.delete as jest.Mock).mockResolvedValue({});

      await shortlistRepository.delete(shortlistId);

      expect(mockPrisma.shortlist.delete).toHaveBeenCalledWith({
        where: { id: shortlistId },
      });
    });

    it('should throw error for invalid id', async () => {
      await expect(shortlistRepository.delete('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('countByProcessId', () => {
    it('should return shortlist count for process', async () => {
      const processId = 'process-123';
      const expectedCount = 3;

      (mockPrisma.shortlist.count as jest.Mock).mockResolvedValue(expectedCount);

      const result = await shortlistRepository.countByProcessId(processId);

      expect(mockPrisma.shortlist.count).toHaveBeenCalledWith({
        where: { processId },
      });
      expect(result).toBe(expectedCount);
    });

    it('should throw error for invalid process id', async () => {
      await expect(shortlistRepository.countByProcessId('')).rejects.toThrow('Invalid ID provided');
    });
  });
});