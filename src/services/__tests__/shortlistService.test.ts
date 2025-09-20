/**
 * Shortlist Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shortlistService } from '../shortlistService';
import { apiService } from '../apiService';
import type { Shortlist, CreateShortlistRequest, UpdateShortlistRequest } from '../../types/api';

// Mock the API service
vi.mock('../apiService');

const mockApiService = vi.mocked(apiService);

const mockShortlist: Shortlist = {
  id: '1',
  name: 'Primary Reviewers',
  processId: 'process-1',
  selectedReviewers: ['reviewer-1', 'reviewer-2'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockShortlists: Shortlist[] = [
  mockShortlist,
  {
    id: '2',
    name: 'Backup Options',
    processId: 'process-1',
    selectedReviewers: ['reviewer-3'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

describe('ShortlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getShortlists', () => {
    it('should fetch all shortlists for a process', async () => {
      mockApiService.get.mockResolvedValue({ data: mockShortlists });

      const result = await shortlistService.getShortlists('process-1');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/processes/process-1/shortlists');
      expect(result).toEqual(mockShortlists);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApiService.get.mockRejectedValue(error);

      await expect(shortlistService.getShortlists('process-1')).rejects.toThrow('API Error');
      expect(mockApiService.get).toHaveBeenCalledWith('/api/processes/process-1/shortlists');
    });
  });

  describe('getShortlist', () => {
    it('should fetch a specific shortlist', async () => {
      mockApiService.get.mockResolvedValue({ data: mockShortlist });

      const result = await shortlistService.getShortlist('process-1', 'shortlist-1');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1');
      expect(result).toEqual(mockShortlist);
    });

    it('should handle API errors', async () => {
      const error = new Error('Shortlist not found');
      mockApiService.get.mockRejectedValue(error);

      await expect(shortlistService.getShortlist('process-1', 'shortlist-1')).rejects.toThrow('Shortlist not found');
      expect(mockApiService.get).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1');
    });
  });

  describe('createShortlist', () => {
    it('should create a new shortlist', async () => {
      const createRequest: CreateShortlistRequest = {
        name: 'New Shortlist',
        selectedReviewers: ['reviewer-1', 'reviewer-2']
      };

      const newShortlist: Shortlist = {
        id: '3',
        name: 'New Shortlist',
        processId: 'process-1',
        selectedReviewers: ['reviewer-1', 'reviewer-2'],
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      };

      mockApiService.post.mockResolvedValue({ data: newShortlist });

      const result = await shortlistService.createShortlist('process-1', createRequest);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/processes/process-1/shortlists', createRequest);
      expect(result).toEqual(newShortlist);
    });

    it('should handle validation errors', async () => {
      const createRequest: CreateShortlistRequest = {
        name: '',
        selectedReviewers: []
      };

      const error = new Error('Validation failed');
      mockApiService.post.mockRejectedValue(error);

      await expect(shortlistService.createShortlist('process-1', createRequest)).rejects.toThrow('Validation failed');
      expect(mockApiService.post).toHaveBeenCalledWith('/api/processes/process-1/shortlists', createRequest);
    });
  });

  describe('updateShortlist', () => {
    it('should update an existing shortlist', async () => {
      const updateRequest: UpdateShortlistRequest = {
        name: 'Updated Shortlist',
        selectedReviewers: ['reviewer-1', 'reviewer-3']
      };

      const updatedShortlist: Shortlist = {
        ...mockShortlist,
        name: 'Updated Shortlist',
        selectedReviewers: ['reviewer-1', 'reviewer-3'],
        updatedAt: '2024-01-04T00:00:00Z'
      };

      mockApiService.put.mockResolvedValue({ data: updatedShortlist });

      const result = await shortlistService.updateShortlist('process-1', 'shortlist-1', updateRequest);

      expect(mockApiService.put).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1', updateRequest);
      expect(result).toEqual(updatedShortlist);
    });

    it('should handle partial updates', async () => {
      const updateRequest: UpdateShortlistRequest = {
        name: 'Partially Updated'
      };

      const updatedShortlist: Shortlist = {
        ...mockShortlist,
        name: 'Partially Updated',
        updatedAt: '2024-01-04T00:00:00Z'
      };

      mockApiService.put.mockResolvedValue({ data: updatedShortlist });

      const result = await shortlistService.updateShortlist('process-1', 'shortlist-1', updateRequest);

      expect(mockApiService.put).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1', updateRequest);
      expect(result).toEqual(updatedShortlist);
    });

    it('should handle API errors', async () => {
      const updateRequest: UpdateShortlistRequest = {
        name: 'Updated Shortlist'
      };

      const error = new Error('Update failed');
      mockApiService.put.mockRejectedValue(error);

      await expect(shortlistService.updateShortlist('process-1', 'shortlist-1', updateRequest)).rejects.toThrow('Update failed');
      expect(mockApiService.put).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1', updateRequest);
    });
  });

  describe('deleteShortlist', () => {
    it('should delete a shortlist', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      await shortlistService.deleteShortlist('process-1', 'shortlist-1');

      expect(mockApiService.delete).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1');
    });

    it('should handle API errors', async () => {
      const error = new Error('Delete failed');
      mockApiService.delete.mockRejectedValue(error);

      await expect(shortlistService.deleteShortlist('process-1', 'shortlist-1')).rejects.toThrow('Delete failed');
      expect(mockApiService.delete).toHaveBeenCalledWith('/api/processes/process-1/shortlists/shortlist-1');
    });
  });

  describe('exportShortlist', () => {
    it('should export shortlist as CSV', async () => {
      mockApiService.downloadFile.mockResolvedValue(undefined);

      await shortlistService.exportShortlist('process-1', 'shortlist-1', 'csv');

      expect(mockApiService.downloadFile).toHaveBeenCalledWith(
        '/api/processes/process-1/shortlists/shortlist-1/export/csv',
        'shortlist-shortlist-1.csv'
      );
    });

    it('should export shortlist as XLSX', async () => {
      mockApiService.downloadFile.mockResolvedValue(undefined);

      await shortlistService.exportShortlist('process-1', 'shortlist-1', 'xlsx');

      expect(mockApiService.downloadFile).toHaveBeenCalledWith(
        '/api/processes/process-1/shortlists/shortlist-1/export/xlsx',
        'shortlist-shortlist-1.xlsx'
      );
    });

    it('should export shortlist as DOCX', async () => {
      mockApiService.downloadFile.mockResolvedValue(undefined);

      await shortlistService.exportShortlist('process-1', 'shortlist-1', 'docx');

      expect(mockApiService.downloadFile).toHaveBeenCalledWith(
        '/api/processes/process-1/shortlists/shortlist-1/export/docx',
        'shortlist-shortlist-1.docx'
      );
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      mockApiService.downloadFile.mockRejectedValue(error);

      await expect(shortlistService.exportShortlist('process-1', 'shortlist-1', 'csv')).rejects.toThrow('Export failed');
      expect(mockApiService.downloadFile).toHaveBeenCalledWith(
        '/api/processes/process-1/shortlists/shortlist-1/export/csv',
        'shortlist-shortlist-1.csv'
      );
    });
  });

  describe('error handling', () => {
    it('should propagate network errors', async () => {
      const networkError = new Error('Network error');
      mockApiService.get.mockRejectedValue(networkError);

      await expect(shortlistService.getShortlists('process-1')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockApiService.post.mockRejectedValue(timeoutError);

      const createRequest: CreateShortlistRequest = {
        name: 'Test Shortlist',
        selectedReviewers: ['reviewer-1']
      };

      await expect(shortlistService.createShortlist('process-1', createRequest)).rejects.toThrow('Request timeout');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal server error');
      mockApiService.put.mockRejectedValue(serverError);

      const updateRequest: UpdateShortlistRequest = {
        name: 'Updated Name'
      };

      await expect(shortlistService.updateShortlist('process-1', 'shortlist-1', updateRequest)).rejects.toThrow('Internal server error');
    });
  });

  describe('data validation', () => {
    it('should handle empty shortlist arrays', async () => {
      mockApiService.get.mockResolvedValue({ data: [] });

      const result = await shortlistService.getShortlists('process-1');

      expect(result).toEqual([]);
    });

    it('should handle shortlists with empty reviewer arrays', async () => {
      const emptyShortlist: Shortlist = {
        id: '1',
        name: 'Empty Shortlist',
        processId: 'process-1',
        selectedReviewers: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockApiService.get.mockResolvedValue({ data: emptyShortlist });

      const result = await shortlistService.getShortlist('process-1', 'shortlist-1');

      expect(result).toEqual(emptyShortlist);
      expect(result.selectedReviewers).toHaveLength(0);
    });
  });
});