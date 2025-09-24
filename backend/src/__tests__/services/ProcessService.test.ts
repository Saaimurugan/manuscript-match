import { ProcessService } from '../../services/ProcessService';
import { ProcessRepository } from '../../repositories/ProcessRepository';
import { ActivityLogRepository } from '../../repositories/ActivityLogRepository';
import { ProcessStatus, ProcessStep } from '../../types';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  process: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock repositories
jest.mock('../../repositories/ProcessRepository');
jest.mock('../../repositories/ActivityLogRepository');

const MockProcessRepository = ProcessRepository as jest.MockedClass<typeof ProcessRepository>;
const MockActivityLogRepository = ActivityLogRepository as jest.MockedClass<typeof ActivityLogRepository>;

describe('ProcessService - Admin Capabilities', () => {
  let processService: ProcessService;
  let mockProcessRepository: jest.Mocked<ProcessRepository>;
  let mockActivityLogRepository: jest.Mocked<ActivityLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProcessRepository = new MockProcessRepository(mockPrisma) as jest.Mocked<ProcessRepository>;
    mockActivityLogRepository = new MockActivityLogRepository(mockPrisma) as jest.Mocked<ActivityLogRepository>;
    
    processService = new ProcessService(mockPrisma);
    (processService as any).processRepository = mockProcessRepository;
    (processService as any).activityLogRepository = mockActivityLogRepository;
  });

  describe('adminDeleteProcess', () => {
    const mockProcess = {
      id: 'process-1',
      userId: 'user-1',
      title: 'Test Process',
      status: ProcessStatus.COMPLETED,
      currentStep: ProcessStep.EXPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully delete a completed process', async () => {
      mockProcessRepository.findByIdWithRelations.mockResolvedValue(mockProcess as any);
      mockProcessRepository.delete.mockResolvedValue();
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      const result = await processService.adminDeleteProcess('process-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(mockProcessRepository.delete).toHaveBeenCalledWith('process-1');
      expect(mockActivityLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-1',
        processId: 'process-1',
        action: 'ADMIN_PROCESS_DELETED',
        details: expect.stringContaining('Test Process'),
      });
    });

    it('should prevent deletion of active processes', async () => {
      const activeProcess = {
        ...mockProcess,
        status: ProcessStatus.PROCESSING,
      };
      mockProcessRepository.findByIdWithRelations.mockResolvedValue(activeProcess as any);

      const result = await processService.adminDeleteProcess('process-1', 'admin-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot delete process with active status');
      expect(mockProcessRepository.delete).not.toHaveBeenCalled();
    });

    it('should return error for non-existent process', async () => {
      mockProcessRepository.findByIdWithRelations.mockResolvedValue(null);

      const result = await processService.adminDeleteProcess('process-1', 'admin-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Process not found');
    });
  });

  describe('adminResetProcessStage', () => {
    const mockProcess = {
      id: 'process-1',
      userId: 'user-1',
      title: 'Test Process',
      status: ProcessStatus.VALIDATING,
      currentStep: ProcessStep.VALIDATION,
      metadata: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully reset process stage', async () => {
      mockProcessRepository.findById.mockResolvedValue(mockProcess as any);
      mockProcessRepository.update.mockResolvedValue({
        ...mockProcess,
        currentStep: ProcessStep.UPLOAD,
        status: ProcessStatus.CREATED,
      } as any);
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      const result = await processService.adminResetProcessStage(
        'process-1',
        ProcessStep.UPLOAD,
        'admin-1'
      );

      expect(result.success).toBe(true);
      expect(result.process).toBeDefined();
      expect(mockProcessRepository.update).toHaveBeenCalledWith('process-1', {
        currentStep: ProcessStep.UPLOAD,
        status: ProcessStatus.CREATED,
      });
    });

    it('should return error for invalid target stage', async () => {
      mockProcessRepository.findById.mockResolvedValue(mockProcess as any);

      const result = await processService.adminResetProcessStage(
        'process-1',
        'INVALID_STAGE' as ProcessStep,
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid target stage');
    });

    it('should return error for non-existent process', async () => {
      mockProcessRepository.findById.mockResolvedValue(null);

      const result = await processService.adminResetProcessStage(
        'process-1',
        ProcessStep.UPLOAD,
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Process not found');
    });
  });

  describe('getProcessTemplates', () => {
    it('should return predefined process templates', async () => {
      const templates = await processService.getProcessTemplates();

      expect(templates).toHaveLength(4);
      expect(templates[0]).toEqual({
        id: 'standard-review',
        name: 'Standard Peer Review',
        description: 'Standard manuscript peer review process with full validation',
        defaultMetadata: expect.objectContaining({
          description: 'Standard peer review process',
          expectedReviewers: 3,
        }),
        defaultStep: ProcessStep.UPLOAD,
        defaultStatus: ProcessStatus.CREATED,
      });
    });
  });

  describe('adminCreateProcessFromTemplate', () => {
    it('should create process from template successfully', async () => {
      const mockCreatedProcess = {
        id: 'process-1',
        userId: 'user-1',
        title: 'New Process',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        metadata: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProcessRepository.create.mockResolvedValue(mockCreatedProcess as any);
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      const result = await processService.adminCreateProcessFromTemplate(
        'standard-review',
        'user-1',
        'New Process',
        'admin-1'
      );

      expect(result.success).toBe(true);
      expect(result.process).toBeDefined();
      expect(mockProcessRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'New Process',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        metadata: expect.stringContaining('Standard peer review process'),
      });
    });

    it('should return error for invalid template', async () => {
      const result = await processService.adminCreateProcessFromTemplate(
        'invalid-template',
        'user-1',
        'New Process',
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Template not found');
    });
  });

  describe('getProcessMetrics', () => {
    const mockProcesses = [
      {
        id: 'process-1',
        userId: 'user-1',
        status: ProcessStatus.COMPLETED,
        currentStep: ProcessStep.EXPORT,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 'process-2',
        userId: 'user-2',
        status: ProcessStatus.PROCESSING,
        currentStep: ProcessStep.DATABASE_SEARCH,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'process-3',
        userId: 'user-3',
        status: ProcessStatus.ERROR,
        currentStep: ProcessStep.VALIDATION,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ];

    it('should return comprehensive process metrics', async () => {
      mockProcessRepository.findMany.mockResolvedValue(mockProcesses as any);

      const metrics = await processService.getProcessMetrics();

      expect(metrics.totalProcesses).toBe(3);
      expect(metrics.activeProcesses).toBe(1);
      expect(metrics.completedProcesses).toBe(1);
      expect(metrics.errorProcesses).toBe(1);
      expect(metrics.byStatus[ProcessStatus.COMPLETED]).toBe(1);
      expect(metrics.byStatus[ProcessStatus.PROCESSING]).toBe(1);
      expect(metrics.byStatus[ProcessStatus.ERROR]).toBe(1);
      expect(metrics.recentActivity).toBe(2); // Two processes updated recently
    });
  });

  describe('getActiveProcesses', () => {
    const mockActiveProcesses = [
      {
        id: 'process-1',
        userId: 'user-1',
        title: 'Active Process 1',
        status: ProcessStatus.PROCESSING,
        currentStep: ProcessStep.DATABASE_SEARCH,
        metadata: '{}',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'process-2',
        userId: 'user-2',
        title: 'Active Process 2',
        status: ProcessStatus.VALIDATING,
        currentStep: ProcessStep.VALIDATION,
        metadata: '{}',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ];

    it('should return active processes with duration', async () => {
      mockProcessRepository.findMany.mockResolvedValue(mockActiveProcesses as any);

      const activeProcesses = await processService.getActiveProcesses();

      expect(activeProcesses).toHaveLength(2);
      expect(activeProcesses[0]).toMatchObject({
        id: 'process-1',
        title: 'Active Process 1',
        status: ProcessStatus.PROCESSING,
      });
      expect(activeProcesses[0]?.duration).toBeGreaterThan(0);
    });

    it('should limit results when limit option is provided', async () => {
      mockProcessRepository.findMany.mockResolvedValue(mockActiveProcesses as any);

      await processService.getActiveProcesses({ limit: 1 });

      expect(mockProcessRepository.findMany).toHaveBeenCalledWith({
        take: 1,
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('adminUpdateProcess', () => {
    const mockProcess = {
      id: 'process-1',
      userId: 'user-1',
      title: 'Original Title',
      status: ProcessStatus.CREATED,
      currentStep: ProcessStep.UPLOAD,
      metadata: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully update process with versioning', async () => {
      mockProcessRepository.findById.mockResolvedValue(mockProcess as any);
      mockProcessRepository.update.mockResolvedValue({
        ...mockProcess,
        title: 'Updated Title',
      } as any);
      mockActivityLogRepository.create.mockResolvedValue({} as any);
      mockActivityLogRepository.findByProcessId.mockResolvedValue([]);

      const result = await processService.adminUpdateProcess(
        'process-1',
        { title: 'Updated Title', description: 'New description' },
        'admin-1'
      );

      expect(result.success).toBe(true);
      expect(result.process?.title).toBe('Updated Title');
      expect(result.version).toBe(1);
      expect(mockProcessRepository.update).toHaveBeenCalled();
      expect(mockActivityLogRepository.create).toHaveBeenCalledTimes(2); // Version creation + update
    });

    it('should return error for non-existent process', async () => {
      mockProcessRepository.findById.mockResolvedValue(null);

      const result = await processService.adminUpdateProcess(
        'process-1',
        { title: 'Updated Title' },
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Process not found');
    });

    it('should validate process configuration', async () => {
      mockProcessRepository.findById.mockResolvedValue(mockProcess as any);

      const result = await processService.adminUpdateProcess(
        'process-1',
        { 
          status: ProcessStatus.COMPLETED,
          currentStep: ProcessStep.UPLOAD // Invalid combination
        },
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid status-step combination');
    });
  });

  describe('getProcessChangeHistory', () => {
    it('should return process change history', async () => {
      const mockActivityLogs = [
        {
          id: 'log-1',
          userId: 'admin-1',
          action: 'PROCESS_VERSION_CREATED',
          details: JSON.stringify({
            version: 2,
            previousVersion: 1,
            snapshot: { title: 'Version 2' },
          }),
          timestamp: new Date(),
        },
        {
          id: 'log-2',
          userId: 'admin-1',
          action: 'PROCESS_VERSION_CREATED',
          details: JSON.stringify({
            version: 1,
            previousVersion: 0,
            snapshot: { title: 'Version 1' },
          }),
          timestamp: new Date(),
        },
      ];

      mockActivityLogRepository.findByProcessId.mockResolvedValue(mockActivityLogs as any);

      const history = await processService.getProcessChangeHistory('process-1');

      expect(history).toHaveLength(2);
      expect(history[0]?.version).toBe(2);
      expect(history[1]?.version).toBe(1);
      expect(mockActivityLogRepository.findByProcessId).toHaveBeenCalledWith('process-1', {
        take: 20,
      });
    });
  });

  describe('rollbackProcessToVersion', () => {
    const mockProcess = {
      id: 'process-1',
      userId: 'user-1',
      title: 'Current Title',
      status: ProcessStatus.PROCESSING,
      currentStep: ProcessStep.METADATA_EXTRACTION,
      metadata: '{"version": 2}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully rollback to previous version', async () => {
      const mockHistory = [
        {
          version: 1,
          changedBy: 'admin-1',
          changedAt: new Date(),
          changes: {},
          snapshot: {
            title: 'Original Title',
            status: ProcessStatus.CREATED,
            currentStep: ProcessStep.UPLOAD,
            metadata: { version: 1 },
          },
        },
      ];

      // Mock the getProcessChangeHistory method
      jest.spyOn(processService, 'getProcessChangeHistory').mockResolvedValue(mockHistory);
      mockProcessRepository.findById.mockResolvedValue(mockProcess as any);
      mockProcessRepository.update.mockResolvedValue({
        ...mockProcess,
        title: 'Original Title',
      } as any);
      mockActivityLogRepository.create.mockResolvedValue({} as any);

      const result = await processService.rollbackProcessToVersion('process-1', 1, 'admin-1');

      expect(result.success).toBe(true);
      expect(result.process?.title).toBe('Original Title');
      expect(mockProcessRepository.update).toHaveBeenCalled();
    });

    it('should return error for non-existent version', async () => {
      jest.spyOn(processService, 'getProcessChangeHistory').mockResolvedValue([]);

      const result = await processService.rollbackProcessToVersion('process-1', 999, 'admin-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Version not found or no snapshot available');
    });
  });

  describe('getProcessHealthStatus', () => {
    it('should return healthy status with no issues', async () => {
      const mockProcesses = [
        {
          id: 'process-1',
          title: 'Healthy Process',
          status: ProcessStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProcessRepository.findMany.mockResolvedValue(mockProcesses as any);

      const healthStatus = await processService.getProcessHealthStatus();

      expect(healthStatus.overallHealth).toBe('healthy');
      expect(healthStatus.stuckProcesses).toBe(0);
      expect(healthStatus.errorProcesses).toBe(0);
      expect(healthStatus.longRunningProcesses).toBe(0);
      expect(healthStatus.alerts).toHaveLength(0);
    });

    it('should detect stuck processes', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const mockProcesses = [
        {
          id: 'process-1',
          title: 'Stuck Process',
          status: ProcessStatus.PROCESSING,
          createdAt: new Date(),
          updatedAt: threeHoursAgo,
        },
      ];

      mockProcessRepository.findMany.mockResolvedValue(mockProcesses as any);

      const healthStatus = await processService.getProcessHealthStatus();

      expect(healthStatus.overallHealth).toBe('warning');
      expect(healthStatus.stuckProcesses).toBe(1);
      expect(healthStatus.alerts).toHaveLength(1);
      expect(healthStatus.alerts[0]?.type).toBe('stuck');
      expect(healthStatus.alerts[0]?.severity).toBe('high');
    });

    it('should detect error processes', async () => {
      const mockProcesses = [
        {
          id: 'process-1',
          title: 'Error Process',
          status: ProcessStatus.ERROR,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProcessRepository.findMany.mockResolvedValue(mockProcesses as any);

      const healthStatus = await processService.getProcessHealthStatus();

      expect(healthStatus.overallHealth).toBe('warning');
      expect(healthStatus.errorProcesses).toBe(1);
      expect(healthStatus.alerts).toHaveLength(1);
      expect(healthStatus.alerts[0]?.type).toBe('error');
    });

    it('should detect long-running processes', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const mockProcesses = [
        {
          id: 'process-1',
          title: 'Long Running Process',
          status: ProcessStatus.PROCESSING,
          createdAt: twoDaysAgo,
          updatedAt: new Date(),
        },
      ];

      mockProcessRepository.findMany.mockResolvedValue(mockProcesses as any);

      const healthStatus = await processService.getProcessHealthStatus();

      expect(healthStatus.overallHealth).toBe('warning');
      expect(healthStatus.longRunningProcesses).toBe(1);
      expect(healthStatus.alerts).toHaveLength(1);
      expect(healthStatus.alerts[0]?.type).toBe('performance');
    });
  });

  describe('generateSearchSuggestions', () => {
    it('should generate name search suggestions', async () => {
      const suggestions = await processService.generateSearchSuggestions('John Smith', 'name');

      expect(suggestions).toContain('Smith John');
      expect(suggestions).toContain('S. John');
      expect(suggestions).toContain('Smith J.');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should generate email search suggestions', async () => {
      const suggestions = await processService.generateSearchSuggestions('john.smith@university.com', 'email');

      expect(suggestions).toContain('john.smith@edu');
      expect(suggestions).toContain('john.smith@ac.uk');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle partial search terms', async () => {
      const suggestions = await processService.generateSearchSuggestions('John', 'name');

      expect(suggestions).toContain('Joh');
      expect(suggestions).toContain('ohn');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});