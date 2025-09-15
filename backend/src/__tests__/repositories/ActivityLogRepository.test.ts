import { PrismaClient } from '@prisma/client';
import { ActivityLogRepository, CreateActivityLogInput, ActivityLogSearchOptions } from '../../repositories/ActivityLogRepository';

// Mock PrismaClient
const mockPrisma = {
  activityLog: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ActivityLogRepository', () => {
  let activityLogRepository: ActivityLogRepository;

  beforeEach(() => {
    activityLogRepository = new ActivityLogRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new activity log', async () => {
      const logData: CreateActivityLogInput = {
        userId: 'user-123',
        processId: 'process-123',
        action: 'PROCESS_CREATED',
        details: 'User created a new process',
      };

      const expectedLog = {
        id: 'log-123',
        userId: 'user-123',
        processId: 'process-123',
        action: 'PROCESS_CREATED',
        details: 'User created a new process',
        timestamp: new Date(),
      };

      (mockPrisma.activityLog.create as jest.Mock).mockResolvedValue(expectedLog);

      const result = await activityLogRepository.create(logData);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: logData,
      });
      expect(result).toEqual(expectedLog);
    });
  });

  describe('findById', () => {
    it('should find activity log by id', async () => {
      const logId = 'log-123';
      const expectedLog = {
        id: logId,
        userId: 'user-123',
        processId: 'process-123',
        action: 'PROCESS_CREATED',
        details: 'User created a new process',
        timestamp: new Date(),
      };

      (mockPrisma.activityLog.findUnique as jest.Mock).mockResolvedValue(expectedLog);

      const result = await activityLogRepository.findById(logId);

      expect(mockPrisma.activityLog.findUnique).toHaveBeenCalledWith({
        where: { id: logId },
      });
      expect(result).toEqual(expectedLog);
    });

    it('should throw error for invalid id', async () => {
      await expect(activityLogRepository.findById('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('findByUserId', () => {
    it('should find activity logs by user id', async () => {
      const userId = 'user-123';
      const expectedLogs = [
        {
          id: 'log-1',
          userId,
          processId: 'process-123',
          action: 'PROCESS_CREATED',
          details: 'User created a new process',
          timestamp: new Date(),
        },
        {
          id: 'log-2',
          userId,
          processId: 'process-123',
          action: 'FILE_UPLOADED',
          details: 'User uploaded a manuscript',
          timestamp: new Date(),
        },
      ];

      (mockPrisma.activityLog.findMany as jest.Mock).mockResolvedValue(expectedLogs);

      const result = await activityLogRepository.findByUserId(userId);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should find activity logs by user id with pagination', async () => {
      const userId = 'user-123';
      const options = { skip: 10, take: 5, processId: 'process-123' };

      (mockPrisma.activityLog.findMany as jest.Mock).mockResolvedValue([]);

      await activityLogRepository.findByUserId(userId, options);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId, processId: 'process-123' },
        orderBy: { timestamp: 'desc' },
        skip: 10,
        take: 5,
      });
    });

    it('should throw error for invalid user id', async () => {
      await expect(activityLogRepository.findByUserId('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('search', () => {
    it('should search activity logs with all options', async () => {
      const searchOptions: ActivityLogSearchOptions = {
        userId: 'user-123',
        processId: 'process-123',
        action: 'PROCESS',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        skip: 0,
        take: 10,
      };

      const expectedLogs = [
        {
          id: 'log-1',
          userId: 'user-123',
          processId: 'process-123',
          action: 'PROCESS_CREATED',
          details: 'User created a new process',
          timestamp: new Date(),
        },
      ];

      (mockPrisma.activityLog.findMany as jest.Mock).mockResolvedValue(expectedLogs);

      const result = await activityLogRepository.search(searchOptions);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          processId: 'process-123',
          action: {
            contains: 'PROCESS',
          },
          timestamp: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-12-31'),
          },
        },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should search activity logs with minimal options', async () => {
      const searchOptions: ActivityLogSearchOptions = {
        userId: 'user-123',
      };

      (mockPrisma.activityLog.findMany as jest.Mock).mockResolvedValue([]);

      await activityLogRepository.search(searchOptions);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create activity logs', async () => {
      const logsData: CreateActivityLogInput[] = [
        {
          userId: 'user-123',
          processId: 'process-123',
          action: 'PROCESS_CREATED',
          details: 'User created a new process',
        },
        {
          userId: 'user-123',
          processId: 'process-123',
          action: 'FILE_UPLOADED',
          details: 'User uploaded a manuscript',
        },
      ];

      (mockPrisma.activityLog.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await activityLogRepository.bulkCreate(logsData);

      expect(mockPrisma.activityLog.createMany).toHaveBeenCalledWith({
        data: logsData,
      });
      expect(result).toBe(2);
    });
  });

  describe('countByUserId', () => {
    it('should return activity log count for user', async () => {
      const userId = 'user-123';
      const expectedCount = 25;

      (mockPrisma.activityLog.count as jest.Mock).mockResolvedValue(expectedCount);

      const result = await activityLogRepository.countByUserId(userId);

      expect(mockPrisma.activityLog.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBe(expectedCount);
    });

    it('should throw error for invalid user id', async () => {
      await expect(activityLogRepository.countByUserId('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('countByProcessId', () => {
    it('should return activity log count for process', async () => {
      const processId = 'process-123';
      const expectedCount = 15;

      (mockPrisma.activityLog.count as jest.Mock).mockResolvedValue(expectedCount);

      const result = await activityLogRepository.countByProcessId(processId);

      expect(mockPrisma.activityLog.count).toHaveBeenCalledWith({
        where: { processId },
      });
      expect(result).toBe(expectedCount);
    });

    it('should throw error for invalid process id', async () => {
      await expect(activityLogRepository.countByProcessId('')).rejects.toThrow('Invalid ID provided');
    });
  });
});