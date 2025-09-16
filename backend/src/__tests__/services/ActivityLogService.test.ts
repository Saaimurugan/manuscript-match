import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from '../../services/ActivityLogService';
import { ActivityLogRepository } from '../../repositories/ActivityLogRepository';

// Mock the Prisma client
jest.mock('@prisma/client');
jest.mock('../../repositories/ActivityLogRepository');

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
const MockActivityLogRepository = ActivityLogRepository as jest.MockedClass<typeof ActivityLogRepository>;

describe('ActivityLogService', () => {
  let activityLogService: ActivityLogService;
  let mockActivityLogRepository: jest.Mocked<ActivityLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockActivityLogRepository = new MockActivityLogRepository(mockPrisma) as jest.Mocked<ActivityLogRepository>;
    activityLogService = new ActivityLogService(mockPrisma);
    
    // Replace the repository instance with our mock
    (activityLogService as any).activityLogRepository = mockActivityLogRepository;
  });

  describe('logActivity', () => {
    it('should create a new activity log entry', async () => {
      const logData = {
        userId: 'user-123',
        processId: 'process-456',
        action: 'PROCESS_CREATED',
        details: 'Process created successfully',
      };

      const expectedLog = {
        id: 'log-789',
        ...logData,
        timestamp: new Date(),
      };

      mockActivityLogRepository.create.mockResolvedValue(expectedLog as any);

      const result = await activityLogService.logActivity(logData);

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith(logData);
      expect(result).toEqual(expectedLog);
    });
  });

  describe('getProcessLogs', () => {
    it('should return paginated process logs with default options', async () => {
      const processId = 'process-123';
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          processId,
          action: 'PROCESS_CREATED',
          details: '{"method":"POST"}',
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
        {
          id: 'log-2',
          userId: 'user-1',
          processId,
          action: 'MANUSCRIPT_UPLOADED',
          details: '{"filename":"test.pdf"}',
          timestamp: new Date('2023-01-01T11:00:00Z'),
        },
      ];

      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);
      mockActivityLogRepository.countByProcessId.mockResolvedValue(2);

      const result = await activityLogService.getProcessLogs(processId);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        processId,
        skip: 0,
        take: 20,
      });
      expect(mockActivityLogRepository.countByProcessId).toHaveBeenCalledWith(processId);
      expect(result.logs).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle pagination correctly', async () => {
      const processId = 'process-123';
      const options = { page: 2, limit: 10 };

      mockActivityLogRepository.search.mockResolvedValue([]);
      mockActivityLogRepository.countByProcessId.mockResolvedValue(25);

      const result = await activityLogService.getProcessLogs(processId, options);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        processId,
        skip: 10,
        take: 10,
      });
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should filter by userId when provided', async () => {
      const processId = 'process-123';
      const options = { userId: 'user-456' };

      mockActivityLogRepository.search.mockResolvedValue([]);
      mockActivityLogRepository.countByProcessId.mockResolvedValue(0);

      await activityLogService.getProcessLogs(processId, options);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        processId,
        userId: 'user-456',
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getUserLogs', () => {
    it('should return paginated user logs', async () => {
      const userId = 'user-123';
      const mockLogs = [
        {
          id: 'log-1',
          userId,
          processId: 'process-1',
          action: 'LOGIN_ATTEMPT',
          details: null,
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
      ];

      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);
      mockActivityLogRepository.countByUserId.mockResolvedValue(1);

      const result = await activityLogService.getUserLogs(userId);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        userId,
        skip: 0,
        take: 20,
      });
      expect(mockActivityLogRepository.countByUserId).toHaveBeenCalledWith(userId);
      expect(result.logs).toHaveLength(1);
    });

    it('should handle date filtering', async () => {
      const userId = 'user-123';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const options = { startDate, endDate };

      mockActivityLogRepository.search.mockResolvedValue([]);
      mockActivityLogRepository.countByUserId.mockResolvedValue(0);

      await activityLogService.getUserLogs(userId, options);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        userId,
        startDate,
        endDate,
        skip: 0,
        take: 20,
      });
    });
  });

  describe('searchLogs', () => {
    it('should search logs with all filters', async () => {
      const query = {
        userId: 'user-123',
        processId: 'process-456',
        action: 'PROCESS_CREATED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        page: 1,
        limit: 10,
      };

      mockActivityLogRepository.search
        .mockResolvedValueOnce([]) // First call for paginated results
        .mockResolvedValueOnce([]); // Second call for count

      await activityLogService.searchLogs(query);

      expect(mockActivityLogRepository.search).toHaveBeenCalledTimes(2);
      expect(mockActivityLogRepository.search).toHaveBeenNthCalledWith(1, {
        userId: 'user-123',
        processId: 'process-456',
        action: 'PROCESS_CREATED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getProcessActivitySummary', () => {
    it('should return activity summary for a process', async () => {
      const processId = 'process-123';
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          processId,
          action: 'PROCESS_CREATED',
          details: null,
          timestamp: new Date('2023-01-01T12:00:00Z'),
        },
        {
          id: 'log-2',
          userId: 'user-1',
          processId,
          action: 'MANUSCRIPT_UPLOADED',
          details: null,
          timestamp: new Date('2023-01-01T11:00:00Z'),
        },
        {
          id: 'log-3',
          userId: 'user-1',
          processId,
          action: 'PROCESS_CREATED',
          details: null,
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
      ];

      mockActivityLogRepository.findByProcessId.mockResolvedValue(mockLogs as any);

      const result = await activityLogService.getProcessActivitySummary(processId);

      expect(result.totalActivities).toBe(3);
      expect(result.lastActivity).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(result.activityTypes).toEqual([
        { action: 'PROCESS_CREATED', count: 2 },
        { action: 'MANUSCRIPT_UPLOADED', count: 1 },
      ]);
    });

    it('should handle empty logs', async () => {
      const processId = 'process-123';
      mockActivityLogRepository.findByProcessId.mockResolvedValue([]);

      const result = await activityLogService.getProcessActivitySummary(processId);

      expect(result.totalActivities).toBe(0);
      expect(result.lastActivity).toBeUndefined();
      expect(result.activityTypes).toEqual([]);
    });
  });

  describe('formatTimestamp', () => {
    beforeEach(() => {
      // Mock the current time to ensure consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format recent timestamps correctly', () => {
      const service = new ActivityLogService(mockPrisma);
      
      // Test "Just now"
      const justNow = new Date('2023-01-01T11:59:30Z');
      const formattedJustNow = (service as any).formatTimestamp(justNow);
      expect(formattedJustNow).toBe('Just now');

      // Test minutes ago
      const fiveMinutesAgo = new Date('2023-01-01T11:55:00Z');
      const formattedMinutes = (service as any).formatTimestamp(fiveMinutesAgo);
      expect(formattedMinutes).toBe('5 minutes ago');

      // Test hours ago
      const twoHoursAgo = new Date('2023-01-01T10:00:00Z');
      const formattedHours = (service as any).formatTimestamp(twoHoursAgo);
      expect(formattedHours).toBe('2 hours ago');

      // Test days ago
      const threeDaysAgo = new Date('2022-12-29T12:00:00Z');
      const formattedDays = (service as any).formatTimestamp(threeDaysAgo);
      expect(formattedDays).toBe('3 days ago');

      // Test older dates
      const oneWeekAgo = new Date('2022-12-25T12:00:00Z');
      const formattedOld = (service as any).formatTimestamp(oneWeekAgo);
      expect(formattedOld).toMatch(/Dec 25, 2022/);
    });
  });

  describe('getActionDisplayName', () => {
    it('should return display names for known actions', () => {
      expect(ActivityLogService.getActionDisplayName('PROCESS_CREATED')).toBe('Process Created');
      expect(ActivityLogService.getActionDisplayName('MANUSCRIPT_UPLOADED')).toBe('Manuscript Uploaded');
      expect(ActivityLogService.getActionDisplayName('DATABASE_SEARCH_INITIATED')).toBe('Database Search Started');
    });

    it('should format unknown actions', () => {
      expect(ActivityLogService.getActionDisplayName('CUSTOM_ACTION_NAME')).toBe('Custom Action Name');
      expect(ActivityLogService.getActionDisplayName('ANOTHER_TEST')).toBe('Another Test');
    });
  });

  describe('formatActivityLog', () => {
    it('should format activity log with parsed details', () => {
      const service = new ActivityLogService(mockPrisma);
      const log = {
        id: 'log-123',
        userId: 'user-456',
        processId: 'process-789',
        action: 'PROCESS_CREATED',
        details: '{"method":"POST","path":"/api/processes"}',
        timestamp: new Date('2023-01-01T12:00:00Z'),
      };

      const formatted = (service as any).formatActivityLog(log);

      expect(formatted.id).toBe('log-123');
      expect(formatted.userId).toBe('user-456');
      expect(formatted.processId).toBe('process-789');
      expect(formatted.action).toBe('PROCESS_CREATED');
      expect(formatted.details).toEqual({ method: 'POST', path: '/api/processes' });
      expect(formatted.timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(formatted.formattedTimestamp).toBeDefined();
    });

    it('should handle invalid JSON in details', () => {
      const service = new ActivityLogService(mockPrisma);
      const log = {
        id: 'log-123',
        userId: 'user-456',
        processId: null,
        action: 'INVALID_JSON',
        details: 'invalid json string',
        timestamp: new Date('2023-01-01T12:00:00Z'),
      };

      const formatted = (service as any).formatActivityLog(log);

      expect(formatted.details).toBe('invalid json string');
      expect(formatted.processId).toBeUndefined();
    });
  });
});