/**
 * Tests for ProcessManagementService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessManagementService } from '../ProcessManagementService';
import { ProcessStep, ProcessStatus } from '../../types/process';
import { ApiService } from '../../../../services/apiService';

// Mock ApiService
vi.mock('../../../../services/apiService');

describe('ProcessManagementService', () => {
  let service: ProcessManagementService;
  let mockApiService: vi.Mocked<ApiService>;

  beforeEach(() => {
    mockApiService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;
    
    service = new ProcessManagementService(mockApiService);
  });

  describe('createProcess', () => {
    it('should create a new process with correct initial state', async () => {
      const mockProcess = {
        id: 'test-id',
        jobId: 'job-123',
        title: 'Test Process',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          userId: 'user-123',
          fileName: 'test.docx',
          fileSize: 1024,
          manuscriptTitle: 'Test Process',
          authors: [],
          totalReviewers: 0,
          shortlistCount: 0
        },
        stepData: {}
      };

      mockApiService.post.mockResolvedValue({ data: mockProcess });

      const request = {
        title: 'Test Process',
        jobId: 'job-123',
        fileName: 'test.docx',
        fileSize: 1024,
        userId: 'user-123'
      };

      const result = await service.createProcess(request);

      expect(mockApiService.post).toHaveBeenCalledWith('/scholarfinder/processes', {
        title: 'Test Process',
        jobId: 'job-123',
        status: ProcessStatus.CREATED,
        currentStep: ProcessStep.UPLOAD,
        metadata: {
          userId: 'user-123',
          fileName: 'test.docx',
          fileSize: 1024,
          manuscriptTitle: 'Test Process',
          authors: [],
          totalReviewers: 0,
          shortlistCount: 0
        },
        stepData: {}
      });

      expect(result).toEqual(mockProcess);
    });
  });

  describe('updateProcessStep', () => {
    it('should update process step and status', async () => {
      const mockProcess = {
        id: 'test-id',
        currentStep: ProcessStep.METADATA,
        status: ProcessStatus.IN_PROGRESS
      };

      mockApiService.put.mockResolvedValue({ data: mockProcess });

      const result = await service.updateProcessStep('test-id', ProcessStep.METADATA, { test: 'data' });

      expect(mockApiService.put).toHaveBeenCalledWith('/scholarfinder/processes/test-id', {
        currentStep: ProcessStep.METADATA,
        status: ProcessStatus.IN_PROGRESS,
        stepData: {
          metadata: {
            test: 'data',
            lastModified: expect.any(Date)
          }
        }
      });

      expect(result).toEqual(mockProcess);
    });
  });
});