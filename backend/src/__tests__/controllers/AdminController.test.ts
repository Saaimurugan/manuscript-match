import { Request, Response, NextFunction } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { AdminService } from '@/services/AdminService';
import { ProcessStatus, UserRole } from '@/types';
import { CustomError, ErrorType } from '@/middleware/errorHandler';

// Mock the AdminService
jest.mock('@/services/AdminService');
jest.mock('@/repositories/ProcessRepository');
jest.mock('@/repositories/ActivityLogRepository');
jest.mock('@/repositories/UserRepository');
jest.mock('@/config/database');

describe('AdminController', () => {
  let adminController: AdminController;
  let mockAdminService: jest.Mocked<AdminService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockAdminService = new AdminService({} as any, {} as any, {} as any) as jest.Mocked<AdminService>;
    adminController = new AdminController();
    (adminController as any).adminService = mockAdminService;

    mockRequest = {
      query: {},
      params: {},
      user: { id: 'admin-1', email: 'admin@test.com', role: UserRole.ADMIN },
    };

    mockResponse = {
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProcesses', () => {
    it('should return paginated processes successfully', async () => {
      const mockResult = {
        processes: [
          {
            id: 'process-1',
            title: 'Test Process',
            status: ProcessStatus.COMPLETED,
            user: { id: 'user-1', email: 'us***@test.com', role: UserRole.USER },
            activityLogCount: 5,
          },
        ],
        total: 1,
      };

      mockAdminService.getAllProcesses.mockResolvedValue(mockResult);
      mockRequest.query = { page: '1', limit: '20' };

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getAllProcesses).toHaveBeenCalledWith(1, 20, {
        userId: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.processes,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should handle query parameters correctly', async () => {
      mockAdminService.getAllProcesses.mockResolvedValue({ processes: [], total: 0 });
      mockRequest.query = {
        page: '2',
        limit: '10',
        userId: 'user-1',
        status: ProcessStatus.COMPLETED,
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        search: 'test',
        sortBy: 'title',
        sortOrder: 'asc',
      };

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getAllProcesses).toHaveBeenCalledWith(2, 10, {
        userId: 'user-1',
        status: ProcessStatus.COMPLETED,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        search: 'test',
        sortBy: 'title',
        sortOrder: 'asc',
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.query = { page: '0', limit: '200' }; // Invalid pagination

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle service errors', async () => {
      const error = new CustomError(ErrorType.DATABASE_ERROR, 'Database error', 500);
      mockAdminService.getAllProcesses.mockRejectedValue(error);

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllLogs', () => {
    it('should return paginated logs successfully', async () => {
      const mockResult = {
        logs: [
          {
            id: 'log-1',
            action: 'PROCESS_CREATED',
            timestamp: new Date(),
            user: { id: 'user-1', email: 'us***@test.com', role: UserRole.USER },
          },
        ],
        total: 1,
      };

      mockAdminService.getAllLogs.mockResolvedValue(mockResult);
      mockRequest.query = { page: '1', limit: '50' };

      await adminController.getAllLogs(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getAllLogs).toHaveBeenCalledWith(1, 50, {
        userId: undefined,
        processId: undefined,
        action: undefined,
        startDate: undefined,
        endDate: undefined,
        search: undefined,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.logs,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should handle log filter parameters', async () => {
      mockAdminService.getAllLogs.mockResolvedValue({ logs: [], total: 0 });
      mockRequest.query = {
        userId: 'user-1',
        processId: 'process-1',
        action: 'PROCESS_CREATED',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      };

      await adminController.getAllLogs(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getAllLogs).toHaveBeenCalledWith(1, 50, {
        userId: 'user-1',
        processId: 'process-1',
        action: 'PROCESS_CREATED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        search: undefined,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });
    });
  });

  describe('getAdminStats', () => {
    it('should return admin statistics successfully', async () => {
      const mockStats = {
        totalUsers: 10,
        totalProcesses: 25,
        totalLogs: 100,
        processStatusBreakdown: {
          [ProcessStatus.CREATED]: 5,
          [ProcessStatus.UPLOADING]: 2,
          [ProcessStatus.PROCESSING]: 3,
          [ProcessStatus.SEARCHING]: 1,
          [ProcessStatus.VALIDATING]: 2,
          [ProcessStatus.COMPLETED]: 15,
          [ProcessStatus.ERROR]: 2,
        },
        processStepBreakdown: {
          [ProcessStep.UPLOAD]: 3,
          [ProcessStep.METADATA_EXTRACTION]: 2,
          [ProcessStep.KEYWORD_ENHANCEMENT]: 1,
          [ProcessStep.DATABASE_SEARCH]: 2,
          [ProcessStep.MANUAL_SEARCH]: 1,
          [ProcessStep.VALIDATION]: 3,
          [ProcessStep.RECOMMENDATIONS]: 5,
          [ProcessStep.SHORTLIST]: 4,
          [ProcessStep.EXPORT]: 8,
        },
        recentActivity: {
          last24Hours: 5,
          last7Days: 20,
          last30Days: 50,
        },
        topUsers: [],
      };

      mockAdminService.getAdminStats.mockResolvedValue(mockStats);

      await adminController.getAdminStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getAdminStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });
  });

  describe('getUserDetails', () => {
    it('should return user details successfully', async () => {
      const mockUserDetails = {
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: UserRole.USER,
        },
        statistics: {
          processCount: 5,
          logCount: 10,
        },
        recentProcesses: [],
        recentActivity: [],
      };

      mockAdminService.getUserDetails.mockResolvedValue(mockUserDetails);
      mockRequest.params = { userId: 'user-1' };

      await adminController.getUserDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith('user-1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserDetails,
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockAdminService.getUserDetails.mockResolvedValue(null);
      mockRequest.params = { userId: 'non-existent' };

      await adminController.getUserDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.NOT_FOUND,
          statusCode: 404,
        })
      );
    });

    it('should return 400 for missing user ID', async () => {
      mockRequest.params = {};

      await adminController.getUserDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          statusCode: 400,
        })
      );
    });
  });

  describe('getProcessDetails', () => {
    it('should return process details successfully', async () => {
      const mockProcessDetails = {
        process: {
          id: 'process-1',
          title: 'Test Process',
          status: ProcessStatus.COMPLETED,
        },
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: UserRole.USER,
        },
        activityLogs: [],
        statistics: {
          totalLogs: 5,
          duration: 3600000,
        },
      };

      mockAdminService.getProcessDetails.mockResolvedValue(mockProcessDetails);
      mockRequest.params = { processId: 'process-1' };

      await adminController.getProcessDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getProcessDetails).toHaveBeenCalledWith('process-1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockProcessDetails,
      });
    });

    it('should return 404 for non-existent process', async () => {
      mockAdminService.getProcessDetails.mockResolvedValue(null);
      mockRequest.params = { processId: 'non-existent' };

      await adminController.getProcessDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.NOT_FOUND,
          statusCode: 404,
        })
      );
    });
  });

  describe('exportAdminData', () => {
    it('should export processes data successfully', async () => {
      const mockExportResult = {
        data: Buffer.from('csv,data,here'),
        filename: 'processes_export_2023-01-01.csv',
        mimeType: 'text/csv',
      };

      mockAdminService.exportData.mockResolvedValue(mockExportResult);
      mockRequest.params = { type: 'processes' };
      mockRequest.query = { format: 'csv' };

      await adminController.exportAdminData(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.exportData).toHaveBeenCalledWith(
        'processes',
        'csv',
        {
          startDate: undefined,
          endDate: undefined,
        }
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="processes_export_2023-01-01.csv"'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockExportResult.data);
    });

    it('should handle date filters for export', async () => {
      const mockExportResult = {
        data: Buffer.from('csv,data,here'),
        filename: 'logs_export_2023-01-01.csv',
        mimeType: 'text/csv',
      };

      mockAdminService.exportData.mockResolvedValue(mockExportResult);
      mockRequest.params = { type: 'logs' };
      mockRequest.query = {
        format: 'xlsx',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      };

      await adminController.exportAdminData(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.exportData).toHaveBeenCalledWith(
        'logs',
        'xlsx',
        {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
        }
      );
    });

    it('should return 400 for invalid export type', async () => {
      mockRequest.params = { type: 'invalid' };

      await adminController.exportAdminData(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          statusCode: 400,
          message: 'Invalid export type. Must be one of: processes, logs, users',
        })
      );
    });

    it('should return 400 for invalid export format', async () => {
      mockRequest.params = { type: 'processes' };
      mockRequest.query = { format: 'invalid' };

      await adminController.exportAdminData(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          statusCode: 400,
          message: 'Invalid export format. Must be csv or xlsx',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockAdminService.getAllProcesses.mockRejectedValue(unexpectedError);

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });

    it('should handle invalid date ranges', async () => {
      mockRequest.query = {
        startDate: '2023-12-31',
        endDate: '2023-01-01', // End before start
      };

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Input Validation', () => {
    it('should validate pagination parameters', async () => {
      mockRequest.query = { page: '-1', limit: '0' };

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should use default pagination values', async () => {
      mockAdminService.getAllProcesses.mockResolvedValue({ processes: [], total: 0 });
      mockRequest.query = {}; // No pagination params

      await adminController.getAllProcesses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAdminService.getAllProcesses).toHaveBeenCalledWith(
        1, // default page
        20, // default limit
        expect.any(Object)
      );
    });

    it('should validate UUID parameters', async () => {
      mockRequest.params = { userId: 'invalid-uuid' };

      await adminController.getUserDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should still call the service, which will handle the invalid UUID
      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith('invalid-uuid');
    });
  });
});