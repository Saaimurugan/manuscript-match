import { PrismaClient } from '@prisma/client';
import { ActivityLogService, ExportFormat, UserActionContext, SystemEventContext } from '../../services/ActivityLogService';
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
    it('should create a new activity log entry with serialized details', async () => {
      const logData = {
        userId: 'user-123',
        processId: 'process-456',
        action: 'PROCESS_CREATED',
        details: { method: 'POST', path: '/api/processes' } as any,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'process',
        resourceId: 'process-456',
      };

      const expectedLog = {
        id: 'log-789',
        ...logData,
        details: JSON.stringify(logData.details),
        timestamp: new Date(),
      };

      mockActivityLogRepository.create.mockResolvedValue(expectedLog as any);

      const result = await activityLogService.logActivity(logData);

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        ...logData,
        details: JSON.stringify(logData.details),
      });
      expect(result).toEqual(expectedLog);
    });

    it('should handle string details without double serialization', async () => {
      const logData = {
        userId: 'user-123',
        action: 'LOGIN_ATTEMPT',
        details: 'User login attempt',
      };

      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logActivity(logData);

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        ...logData,
        details: 'User login attempt',
      });
    });
  });

  describe('logUserAction', () => {
    it('should log user action with context', async () => {
      const context: UserActionContext = {
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const details = { targetUser: 'user-456' };
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logUserAction('USER_PROMOTED', context, details, 'user', 'user-456');

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'USER_PROMOTED',
        details: JSON.stringify(details),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'user',
        resourceId: 'user-456',
      });
    });
  });

  describe('logSystemEvent', () => {
    it('should log system event with trigger context', async () => {
      const context: SystemEventContext = {
        triggeredBy: 'user-123',
        ipAddress: '192.168.1.1',
      };

      const details = { reason: 'Scheduled maintenance' };
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logSystemEvent('SYSTEM_MAINTENANCE', context, details, 'system', 'maintenance-1');

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'SYSTEM_MAINTENANCE',
        details: JSON.stringify(details),
        ipAddress: '192.168.1.1',
        userAgent: undefined,
        resourceType: 'system',
        resourceId: 'maintenance-1',
      });
    });

    it('should use system user when no trigger specified', async () => {
      const context: SystemEventContext = {};
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logSystemEvent('SYSTEM_STARTUP', context);

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'system',
        action: 'SYSTEM_STARTUP',
        details: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        resourceType: undefined,
        resourceId: undefined,
      });
    });
  });

  describe('logUserManagementAction', () => {
    it('should log user management action with proper context', async () => {
      const context: UserActionContext = {
        userId: 'admin-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logUserManagementAction(
        'USER_PROMOTED',
        'admin-123',
        'user-456',
        context,
        { newRole: 'ADMIN' }
      );

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-123',
        action: 'USER_PROMOTED',
        details: JSON.stringify({
          targetUserId: 'user-456',
          performedBy: 'admin-123',
          newRole: 'ADMIN',
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'user',
        resourceId: 'user-456',
      });
    });
  });

  describe('logProcessManagementAction', () => {
    it('should log process management action', async () => {
      const context: UserActionContext = {
        userId: 'admin-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logProcessManagementAction(
        'PROCESS_DELETED',
        'admin-123',
        'process-456',
        context,
        { reason: 'Obsolete process' }
      );

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-123',
        action: 'PROCESS_DELETED',
        details: JSON.stringify({
          processId: 'process-456',
          performedBy: 'admin-123',
          reason: 'Obsolete process',
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'process',
        resourceId: 'process-456',
      });
    });
  });

  describe('logPermissionAction', () => {
    it('should log permission management action', async () => {
      const context: UserActionContext = {
        userId: 'admin-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logPermissionAction(
        'PERMISSION_GRANTED',
        'admin-123',
        'user-456',
        context,
        { permission: 'user.manage' }
      );

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-123',
        action: 'PERMISSION_GRANTED',
        details: JSON.stringify({
          targetUserId: 'user-456',
          performedBy: 'admin-123',
          permission: 'user.manage',
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'permission',
        resourceId: 'user-456',
      });
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log authentication event', async () => {
      const context: UserActionContext = {
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockActivityLogRepository.create.mockResolvedValue({} as any);

      await activityLogService.logAuthenticationEvent(
        'LOGIN_SUCCESS',
        'user-123',
        context,
        { method: 'password' }
      );

      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'LOGIN_SUCCESS',
        details: JSON.stringify({ method: 'password' }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'authentication',
        resourceId: 'user-123',
      });
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

  describe('getActivityLogs', () => {
    it('should return paginated activity logs with filters', async () => {
      const filters = {
        userId: 'user-123',
        action: 'USER_CREATED',
        resourceType: 'user',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      };

      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'USER_CREATED',
          details: '{"targetUser":"user-456"}',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          resourceType: 'user',
          resourceId: 'user-456',
          timestamp: new Date('2023-01-15T10:00:00Z'),
        },
      ];

      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);
      // Mock the private method call
      jest.spyOn(activityLogService as any, 'getFilteredLogsCount').mockResolvedValue(1);

      const result = await activityLogService.getActivityLogs(filters, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle pagination correctly', async () => {
      const filters = {};
      mockActivityLogRepository.search.mockResolvedValue([]);
      jest.spyOn(activityLogService as any, 'getFilteredLogsCount').mockResolvedValue(50);

      const result = await activityLogService.getActivityLogs(filters, 2, 10);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
      });
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });
  });

  describe('getUserActivity', () => {
    it('should get activity logs for specific user', async () => {
      const userId = 'user-123';
      const filters = {
        action: 'LOGIN_SUCCESS',
        startDate: new Date('2023-01-01'),
      };

      const mockLogs = [
        {
          id: 'log-1',
          userId,
          action: 'LOGIN_SUCCESS',
          details: null,
          timestamp: new Date('2023-01-15T10:00:00Z'),
        },
      ];

      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);

      const result = await activityLogService.getUserActivity(userId, filters);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        userId,
        action: 'LOGIN_SUCCESS',
        startDate: new Date('2023-01-01'),
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(userId);
    });
  });

  describe('getResourceActivity', () => {
    it('should get activity logs for specific resource', async () => {
      const resourceType = 'process';
      const resourceId = 'process-123';
      const filters = {
        userId: 'user-456',
      };

      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-456',
          action: 'PROCESS_UPDATED',
          resourceType,
          resourceId,
          details: null,
          timestamp: new Date('2023-01-15T10:00:00Z'),
        },
      ];

      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);

      const result = await activityLogService.getResourceActivity(resourceType, resourceId, filters);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        resourceType,
        resourceId,
        userId: 'user-456',
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.resourceType).toBe(resourceType);
      expect(result[0]?.resourceId).toBe(resourceId);
    });
  });

  describe('getActivityMetrics', () => {
    it('should calculate activity metrics', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'LOGIN_SUCCESS',
          timestamp: new Date('2023-01-15T10:00:00Z'),
        },
        {
          id: 'log-2',
          userId: 'user-2',
          action: 'LOGIN_SUCCESS',
          timestamp: new Date('2023-01-15T14:00:00Z'),
        },
        {
          id: 'log-3',
          userId: 'user-1',
          action: 'USER_CREATED',
          timestamp: new Date('2023-01-16T10:00:00Z'),
        },
      ];

      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);

      const result = await activityLogService.getActivityMetrics();

      expect(result.totalLogs).toBe(3);
      expect(result.uniqueUsers).toBe(2);
      expect(result.topActions).toEqual([
        { action: 'LOGIN_SUCCESS', count: 2 },
        { action: 'USER_CREATED', count: 1 },
      ]);
      expect(result.activityByHour).toHaveLength(24);
      
      // Check that the activity by hour array is properly initialized
      expect(result.activityByHour[10]).toBeDefined();
      expect(result.activityByHour[14]).toBeDefined();
      
      // Check the total count across all hours
      const totalHourlyCount = result.activityByHour.reduce((sum, hour) => sum + hour.count, 0);
      expect(totalHourlyCount).toBe(3);
      
      // Check that we have activity data by day
      expect(result.activityByDay.length).toBeGreaterThan(0);
    });
  });

  describe('searchLogs', () => {
    it('should search logs with all filters (legacy method)', async () => {
      const query = {
        userId: 'user-123',
        processId: 'process-456',
        action: 'PROCESS_CREATED',
        resourceType: 'process',
        resourceId: 'process-456',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        page: 1,
        limit: 10,
      };

      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-123',
          processId: 'process-456',
          action: 'PROCESS_CREATED',
          resourceType: 'process',
          resourceId: 'process-456',
          details: null,
          timestamp: new Date('2023-01-15T10:00:00Z'),
        },
      ];

      // Mock getActivityLogs method
      jest.spyOn(activityLogService, 'getActivityLogs').mockResolvedValue({
        success: true,
        data: mockLogs as any,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const result = await activityLogService.searchLogs(query);

      expect(result.logs).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
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

  describe('exportActivityLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        userId: 'user-123',
        processId: 'process-456',
        action: 'USER_CREATED',
        details: '{"targetUser":"user-789"}',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'user',
        resourceId: 'user-789',
        timestamp: new Date('2023-01-15T10:00:00Z'),
      },
    ];

    beforeEach(() => {
      mockActivityLogRepository.search.mockResolvedValue(mockLogs as any);
    });

    it('should export logs as JSON', async () => {
      const filters = { userId: 'user-123' };
      const result = await activityLogService.exportActivityLogs(filters, ExportFormat.JSON);

      expect(result).toBeInstanceOf(Buffer);
      const jsonData = JSON.parse(result.toString());
      expect(jsonData.totalRecords).toBe(1);
      expect(jsonData.logs).toHaveLength(1);
      expect(jsonData.logs[0].id).toBe('log-1');
      expect(jsonData.exportedAt).toBeDefined();
    });

    it('should export logs as CSV', async () => {
      const filters = { userId: 'user-123' };
      const result = await activityLogService.exportActivityLogs(filters, ExportFormat.CSV);

      expect(result).toBeInstanceOf(Buffer);
      const csvContent = result.toString();
      expect(csvContent).toContain('ID,User ID,Process ID,Action');
      expect(csvContent).toContain('log-1,user-123,process-456,USER_CREATED');
    });

    it('should export logs as PDF', async () => {
      const filters = { userId: 'user-123' };
      const result = await activityLogService.exportActivityLogs(filters, ExportFormat.PDF);

      expect(result).toBeInstanceOf(Buffer);
      const pdfContent = result.toString();
      expect(pdfContent).toContain('Activity Log Report');
      expect(pdfContent).toContain('USER_CREATED');
    });

    it('should throw error for unsupported format', async () => {
      const filters = { userId: 'user-123' };
      await expect(
        activityLogService.exportActivityLogs(filters, 'UNSUPPORTED' as ExportFormat)
      ).rejects.toThrow('Unsupported export format: UNSUPPORTED');
    });
  });

  describe('CSV export utilities', () => {
    it('should escape CSV fields correctly', () => {
      const service = new ActivityLogService(mockPrisma);
      
      // Test field with comma
      expect((service as any).escapeCsvField('Hello, World')).toBe('"Hello, World"');
      
      // Test field with quotes
      expect((service as any).escapeCsvField('Say "Hello"')).toBe('"Say ""Hello"""');
      
      // Test field with newline
      expect((service as any).escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      
      // Test normal field
      expect((service as any).escapeCsvField('Normal text')).toBe('Normal text');
    });
  });

  describe('formatActivityLog', () => {
    it('should format activity log with parsed details and enhanced fields', () => {
      const service = new ActivityLogService(mockPrisma);
      const log = {
        id: 'log-123',
        userId: 'user-456',
        processId: 'process-789',
        action: 'PROCESS_CREATED',
        details: '{"method":"POST","path":"/api/processes"}',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'process',
        resourceId: 'process-789',
        timestamp: new Date('2023-01-01T12:00:00Z'),
      };

      const formatted = (service as any).formatActivityLog(log);

      expect(formatted.id).toBe('log-123');
      expect(formatted.userId).toBe('user-456');
      expect(formatted.processId).toBe('process-789');
      expect(formatted.action).toBe('PROCESS_CREATED');
      expect(formatted.details).toEqual({ method: 'POST', path: '/api/processes' });
      expect(formatted.ipAddress).toBe('192.168.1.1');
      expect(formatted.userAgent).toBe('Mozilla/5.0');
      expect(formatted.resourceType).toBe('process');
      expect(formatted.resourceId).toBe('process-789');
      expect(formatted.timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(formatted.formattedTimestamp).toBeDefined();
    });

    it('should handle null/undefined enhanced fields', () => {
      const service = new ActivityLogService(mockPrisma);
      const log = {
        id: 'log-123',
        userId: 'user-456',
        processId: null,
        action: 'LOGIN_ATTEMPT',
        details: null,
        ipAddress: null,
        userAgent: null,
        resourceType: null,
        resourceId: null,
        timestamp: new Date('2023-01-01T12:00:00Z'),
      };

      const formatted = (service as any).formatActivityLog(log);

      expect(formatted.processId).toBeUndefined();
      expect(formatted.details).toBeUndefined();
      expect(formatted.ipAddress).toBeUndefined();
      expect(formatted.userAgent).toBeUndefined();
      expect(formatted.resourceType).toBeUndefined();
      expect(formatted.resourceId).toBeUndefined();
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

  describe('formatExtendedActivityLog', () => {
    it('should format extended activity log correctly', () => {
      const service = new ActivityLogService(mockPrisma);
      const log = {
        id: 'log-123',
        userId: 'user-456',
        processId: 'process-789',
        action: 'USER_UPDATED',
        details: '{"field":"email","oldValue":"old@test.com","newValue":"new@test.com"}',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resourceType: 'user',
        resourceId: 'user-456',
        timestamp: new Date('2023-01-01T12:00:00Z'),
      };

      const formatted = (service as any).formatExtendedActivityLog(log);

      expect(formatted.id).toBe('log-123');
      expect(formatted.userId).toBe('user-456');
      expect(formatted.processId).toBe('process-789');
      expect(formatted.action).toBe('USER_UPDATED');
      expect(formatted.details).toEqual({
        field: 'email',
        oldValue: 'old@test.com',
        newValue: 'new@test.com',
      });
      expect(formatted.ipAddress).toBe('192.168.1.1');
      expect(formatted.userAgent).toBe('Mozilla/5.0');
      expect(formatted.resourceType).toBe('user');
      expect(formatted.resourceId).toBe('user-456');
      expect(formatted.timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
    });
  });
});