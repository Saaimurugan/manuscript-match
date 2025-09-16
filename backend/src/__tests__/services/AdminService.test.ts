import { AdminService } from '@/services/AdminService';
import { ProcessRepository } from '@/repositories/ProcessRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ProcessStatus, ProcessStep, UserRole } from '@/types';
import { CustomError } from '@/middleware/errorHandler';

// Mock the repositories
jest.mock('@/repositories/ProcessRepository');
jest.mock('@/repositories/ActivityLogRepository');
jest.mock('@/repositories/UserRepository');

describe('AdminService', () => {
  let adminService: AdminService;
  let mockProcessRepository: jest.Mocked<ProcessRepository>;
  let mockActivityLogRepository: jest.Mocked<ActivityLogRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProcess = {
    id: 'process-1',
    userId: 'user-1',
    title: 'Test Process',
    status: ProcessStatus.COMPLETED,
    currentStep: ProcessStep.EXPORT,
    metadata: JSON.stringify({ test: 'data' }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActivityLog = {
    id: 'log-1',
    userId: 'user-1',
    processId: 'process-1',
    action: 'PROCESS_CREATED',
    details: 'Created test process',
    timestamp: new Date(),
  };

  beforeEach(() => {
    mockProcessRepository = new ProcessRepository({} as any) as jest.Mocked<ProcessRepository>;
    mockActivityLogRepository = new ActivityLogRepository({} as any) as jest.Mocked<ActivityLogRepository>;
    mockUserRepository = new UserRepository({} as any) as jest.Mocked<UserRepository>;

    adminService = new AdminService(
      mockProcessRepository,
      mockActivityLogRepository,
      mockUserRepository
    );

    // Setup default mocks
    const mockPrismaProcess = {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    };
    
    const mockPrismaActivityLog = {
      count: jest.fn(),
      findFirst: jest.fn(),
    };
    
    const mockPrismaUser = {
      findMany: jest.fn(),
    };

    mockProcessRepository.getPrismaClient = jest.fn().mockReturnValue({
      process: mockPrismaProcess,
    });

    mockActivityLogRepository.getPrismaClient = jest.fn().mockReturnValue({
      activityLog: mockPrismaActivityLog,
    });

    mockUserRepository.getPrismaClient = jest.fn().mockReturnValue({
      user: mockPrismaUser,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProcesses', () => {
    it('should return paginated processes with sanitized user data', async () => {
      const mockProcesses = [mockProcess];
      mockProcessRepository.findMany.mockResolvedValue(mockProcesses);
      const mockPrismaProcess = mockProcessRepository.getPrismaClient().process;
      mockPrismaProcess.count.mockResolvedValue(1);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockActivityLogRepository.countByProcessId.mockResolvedValue(5);

      const result = await adminService.getAllProcesses(1, 10, {});

      expect(result.processes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.processes[0]).toMatchObject({
        id: 'process-1',
        title: 'Test Process',
        status: ProcessStatus.COMPLETED,
        user: {
          id: 'user-1',
          email: 'us***@test.com', // Sanitized email
          role: UserRole.USER,
        },
        activityLogCount: 5,
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        userId: 'user-1',
        status: ProcessStatus.COMPLETED,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      mockProcessRepository.findMany.mockResolvedValue([]);
      mockProcessRepository.getPrismaClient().process.count.mockResolvedValue(0);

      await adminService.getAllProcesses(1, 10, filters);

      expect(mockProcessRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        userId: 'user-1',
        status: ProcessStatus.COMPLETED,
      });
    });

    it('should handle database errors', async () => {
      mockProcessRepository.findMany.mockRejectedValue(new Error('Database error'));

      await expect(adminService.getAllProcesses(1, 10, {}))
        .rejects.toThrow(CustomError);
    });
  });

  describe('getAllLogs', () => {
    it('should return paginated logs with enriched data', async () => {
      const mockLogs = [mockActivityLog];
      mockActivityLogRepository.search.mockResolvedValueOnce(mockLogs);
      mockActivityLogRepository.search.mockResolvedValueOnce(mockLogs);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProcessRepository.findById.mockResolvedValue(mockProcess);

      const result = await adminService.getAllLogs(1, 20, {});

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0]).toMatchObject({
        id: 'log-1',
        action: 'PROCESS_CREATED',
        user: {
          id: 'user-1',
          email: 'us***@test.com', // Sanitized email
          role: UserRole.USER,
        },
        process: {
          id: 'process-1',
          title: 'Test Process',
          status: ProcessStatus.COMPLETED,
        },
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        userId: 'user-1',
        processId: 'process-1',
        action: 'PROCESS_CREATED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };

      mockActivityLogRepository.search.mockResolvedValue([]);

      await adminService.getAllLogs(1, 20, filters);

      expect(mockActivityLogRepository.search).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        userId: 'user-1',
        processId: 'process-1',
        action: 'PROCESS_CREATED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      });
    });
  });

  describe('getAdminStats', () => {
    it('should return comprehensive admin statistics', async () => {
      // Mock basic counts
      mockUserRepository.count.mockResolvedValue(10);
      mockProcessRepository.getPrismaClient().process.count.mockResolvedValue(25);
      mockActivityLogRepository.getPrismaClient().activityLog.count.mockResolvedValue(100);

      // Mock status breakdown
      mockProcessRepository.countByStatus.mockImplementation((status) => {
        const counts: Record<ProcessStatus, number> = {
          [ProcessStatus.CREATED]: 5,
          [ProcessStatus.UPLOADING]: 2,
          [ProcessStatus.PROCESSING]: 3,
          [ProcessStatus.SEARCHING]: 1,
          [ProcessStatus.VALIDATING]: 2,
          [ProcessStatus.COMPLETED]: 15,
          [ProcessStatus.ERROR]: 2,
        };
        return Promise.resolve(counts[status] || 0);
      });

      // Mock step breakdown
      mockProcessRepository.getPrismaClient().process.count.mockImplementation(({ where }: any) => {
        if (where?.currentStep === ProcessStep.UPLOAD) return Promise.resolve(3);
        if (where?.currentStep === ProcessStep.EXPORT) return Promise.resolve(8);
        return Promise.resolve(0);
      });

      // Mock recent activity
      mockActivityLogRepository.getPrismaClient().activityLog.count.mockImplementation(({ where }: any) => {
        if (where?.timestamp?.gte) return Promise.resolve(15);
        return Promise.resolve(100);
      });

      // Mock top users
      mockProcessRepository.getPrismaClient().process.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: { id: 5 } },
        { userId: 'user-2', _count: { id: 3 } },
      ]);
      mockUserRepository.findById.mockImplementation((id) => {
        if (id === 'user-1') return Promise.resolve({ ...mockUser, id: 'user-1', email: 'user1@test.com' });
        if (id === 'user-2') return Promise.resolve({ ...mockUser, id: 'user-2', email: 'user2@test.com' });
        return Promise.resolve(null);
      });
      mockActivityLogRepository.getPrismaClient().activityLog.findFirst.mockResolvedValue({
        ...mockActivityLog,
        timestamp: new Date(),
      });

      const stats = await adminService.getAdminStats();

      expect(stats).toMatchObject({
        totalUsers: 10,
        totalProcesses: 25,
        totalLogs: 100,
        processStatusBreakdown: expect.any(Object),
        processStepBreakdown: expect.any(Object),
        recentActivity: {
          last24Hours: expect.any(Number),
          last7Days: expect.any(Number),
          last30Days: expect.any(Number),
        },
        topUsers: expect.any(Array),
      });

      expect(stats.topUsers).toHaveLength(2);
      expect(stats.topUsers[0]?.email).toBe('us***@test.com'); // Sanitized
    });
  });

  describe('getUserDetails', () => {
    it('should return detailed user information', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProcessRepository.findByUserId.mockResolvedValue([mockProcess]);
      mockActivityLogRepository.findByUserId.mockResolvedValue([mockActivityLog]);
      mockProcessRepository.getPrismaClient().process.count.mockResolvedValue(5);
      mockActivityLogRepository.countByUserId.mockResolvedValue(10);

      const result = await adminService.getUserDetails('user-1');

      expect(result).toMatchObject({
        user: {
          id: 'user-1',
          email: 'user@test.com', // Full email in detailed view
          role: UserRole.USER,
        },
        statistics: {
          processCount: 5,
          logCount: 10,
          lastActivity: expect.any(Date),
        },
        recentProcesses: expect.any(Array),
        recentActivity: expect.any(Array),
      });
    });

    it('should return null for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await adminService.getUserDetails('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getProcessDetails', () => {
    it('should return detailed process information with audit trail', async () => {
      const mockProcessWithRelations = {
        ...mockProcess,
        user: mockUser,
      };

      mockProcessRepository.findByIdWithRelations.mockResolvedValue(mockProcessWithRelations);
      mockActivityLogRepository.findByProcessId.mockResolvedValue([mockActivityLog]);

      const result = await adminService.getProcessDetails('process-1');

      expect(result).toMatchObject({
        process: {
          id: 'process-1',
          title: 'Test Process',
          status: ProcessStatus.COMPLETED,
          metadata: { test: 'data' },
        },
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: UserRole.USER,
        },
        activityLogs: expect.any(Array),
        statistics: {
          totalLogs: 1,
          duration: expect.any(Number),
        },
      });
    });

    it('should return null for non-existent process', async () => {
      mockProcessRepository.findByIdWithRelations.mockResolvedValue(null);

      const result = await adminService.getProcessDetails('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('exportData', () => {
    it('should export processes data as CSV', async () => {
      const mockProcesses = [{
        ...mockProcess,
        user: mockUser,
      }];

      mockProcessRepository.getPrismaClient().process.findMany.mockResolvedValue(mockProcesses);

      const result = await adminService.exportData('processes', 'csv', {});

      expect(result.filename).toMatch(/processes_export_.*\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toBeInstanceOf(Buffer);
      
      const csvContent = result.data.toString();
      expect(csvContent).toContain('id,title,status');
      expect(csvContent).toContain('process-1');
    });

    it('should export logs data as CSV', async () => {
      mockActivityLogRepository.search.mockResolvedValue([mockActivityLog]);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProcessRepository.findById.mockResolvedValue(mockProcess);

      const result = await adminService.exportData('logs', 'csv', {});

      expect(result.filename).toMatch(/logs_export_.*\.csv/);
      expect(result.mimeType).toBe('text/csv');
      
      const csvContent = result.data.toString();
      expect(csvContent).toContain('id,action,details');
      expect(csvContent).toContain('PROCESS_CREATED');
    });

    it('should export users data as CSV', async () => {
      mockUserRepository.getPrismaClient().user.findMany.mockResolvedValue([mockUser]);
      mockProcessRepository.getPrismaClient().process.count.mockResolvedValue(3);
      mockActivityLogRepository.getPrismaClient().activityLog.findFirst.mockResolvedValue(mockActivityLog);

      const result = await adminService.exportData('users', 'csv', {});

      expect(result.filename).toMatch(/users_export_.*\.csv/);
      expect(result.mimeType).toBe('text/csv');
      
      const csvContent = result.data.toString();
      expect(csvContent).toContain('id,email,role');
      expect(csvContent).toContain('us***@test.com'); // Sanitized email
    });

    it('should handle invalid export type', async () => {
      await expect(adminService.exportData('invalid' as any, 'csv', {}))
        .rejects.toThrow(CustomError);
    });

    it('should apply date filters for export', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };

      mockProcessRepository.getPrismaClient().process.findMany.mockResolvedValue([]);

      await adminService.exportData('processes', 'csv', filters);

      expect(mockProcessRepository.getPrismaClient().process.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        include: { user: true },
      });
    });
  });

  describe('Email Sanitization', () => {
    it('should sanitize short emails correctly', async () => {
      const service = adminService as any; // Access private method
      
      expect(service.sanitizeEmail('a@test.com')).toBe('a***@test.com');
      expect(service.sanitizeEmail('ab@test.com')).toBe('ab***@test.com');
    });

    it('should sanitize long emails correctly', async () => {
      const service = adminService as any; // Access private method
      
      expect(service.sanitizeEmail('longusername@test.com')).toBe('lo***@test.com');
      expect(service.sanitizeEmail('user@test.com')).toBe('us***@test.com');
    });
  });

  describe('CSV Conversion', () => {
    it('should convert data to CSV format correctly', async () => {
      const service = adminService as any; // Access private method
      const testData = [
        { id: '1', name: 'Test', value: 'Simple' },
        { id: '2', name: 'Test with, comma', value: 'Complex' },
        { id: '3', name: 'Test with "quotes"', value: 'Quoted' },
      ];

      const csvBuffer = service.convertToCSV(testData);
      const csvContent = csvBuffer.toString();

      expect(csvContent).toContain('id,name,value');
      expect(csvContent).toContain('1,Test,Simple');
      expect(csvContent).toContain('"Test with, comma"');
      expect(csvContent).toContain('"Test with ""quotes"""');
    });

    it('should handle empty data', async () => {
      const service = adminService as any; // Access private method
      const csvBuffer = service.convertToCSV([]);
      
      expect(csvBuffer.toString()).toBe('No data available');
    });
  });
});