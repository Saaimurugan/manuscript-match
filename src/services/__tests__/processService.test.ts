/**
 * Process service tests
 * Tests for the ProcessService class CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processService } from '../processService';
import { apiService } from '../apiService';
import type { Process, CreateProcessRequest, UpdateProcessRequest } from '../../types/api';

// Mock the API service
vi.mock('../apiService', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiService = apiService as any;

describe('ProcessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProcess: Process = {
    id: '1',
    title: 'Test Process',
    description: 'Test Description',
    currentStep: 1,
    status: 'DRAFT',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  describe('createProcess', () => {
    it('should create a new process', async () => {
      const createRequest: CreateProcessRequest = {
        title: 'Test Process',
        description: 'Test Description',
      };

      mockApiService.post.mockResolvedValue({ data: mockProcess });

      const result = await processService.createProcess(createRequest);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/processes', createRequest);
      expect(result).toEqual(mockProcess);
    });

    it('should handle creation errors', async () => {
      const createRequest: CreateProcessRequest = {
        title: 'Test Process',
        description: 'Test Description',
      };

      const error = new Error('Creation failed');
      mockApiService.post.mockRejectedValue(error);

      await expect(processService.createProcess(createRequest)).rejects.toThrow('Creation failed');
    });
  });

  describe('getProcesses', () => {
    it('should fetch all processes', async () => {
      const mockProcesses = [mockProcess];
      mockApiService.get.mockResolvedValue({ data: mockProcesses });

      const result = await processService.getProcesses();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/processes');
      expect(result).toEqual(mockProcesses);
    });
  });

  describe('getProcess', () => {
    it('should fetch a specific process', async () => {
      mockApiService.get.mockResolvedValue({ data: mockProcess });

      const result = await processService.getProcess('1');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/processes/1');
      expect(result).toEqual(mockProcess);
    });
  });

  describe('updateProcess', () => {
    it('should update a process', async () => {
      const updateRequest: UpdateProcessRequest = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const updatedProcess = { ...mockProcess, ...updateRequest };
      mockApiService.put.mockResolvedValue({ data: updatedProcess });

      const result = await processService.updateProcess('1', updateRequest);

      expect(mockApiService.put).toHaveBeenCalledWith('/api/processes/1', updateRequest);
      expect(result).toEqual(updatedProcess);
    });
  });

  describe('updateProcessStep', () => {
    it('should update process step', async () => {
      const updatedProcess = { ...mockProcess, currentStep: 'METADATA_EXTRACTION' };
      mockApiService.patch.mockResolvedValue({ data: updatedProcess });

      const result = await processService.updateProcessStep('1', 'METADATA_EXTRACTION');

      expect(mockApiService.patch).toHaveBeenCalledWith('/api/processes/1/step', { step: 'METADATA_EXTRACTION' });
      expect(result).toEqual(updatedProcess);
    });
  });

  describe('deleteProcess', () => {
    it('should delete a process', async () => {
      mockApiService.delete.mockResolvedValue({});

      await processService.deleteProcess('1');

      expect(mockApiService.delete).toHaveBeenCalledWith('/api/processes/1');
    });
  });
});