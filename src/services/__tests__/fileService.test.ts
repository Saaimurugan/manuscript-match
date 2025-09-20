/**
 * File service tests
 * Tests for file upload, metadata extraction, and metadata management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileService } from '../fileService';
import { apiService } from '../apiService';
import type { UploadResponse, ExtractedMetadata, UpdateMetadataRequest } from '../../types/api';

// Mock the API service
vi.mock('../apiService', () => ({
  apiService: {
    uploadFile: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('FileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const mockResponse: UploadResponse = {
        fileId: 'file-123',
        fileName: 'test.docx',
        fileSize: 1024,
        uploadedAt: '2023-01-01T00:00:00Z',
      };
      const mockProgressCallback = vi.fn();

      (apiService.uploadFile as any).mockResolvedValue({ data: mockResponse });

      const result = await fileService.uploadFile('process-123', mockFile, mockProgressCallback);

      expect(apiService.uploadFile).toHaveBeenCalledWith(
        '/api/processes/process-123/upload',
        mockFile,
        mockProgressCallback
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const mockError = new Error('Upload failed');

      (apiService.uploadFile as any).mockRejectedValue(mockError);

      await expect(fileService.uploadFile('process-123', mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('getMetadata', () => {
    it('should fetch metadata successfully', async () => {
      const mockMetadata: ExtractedMetadata = {
        title: 'Test Title',
        abstract: 'Test Abstract',
        keywords: ['keyword1', 'keyword2'],
        authors: [
          {
            id: 'author-1',
            name: 'John Doe',
            email: 'john@example.com',
            affiliation: 'University',
            country: 'US',
            publicationCount: 10,
            recentPublications: [],
            expertise: [],
            database: 'test',
            matchScore: 0,
          },
        ],
        affiliations: [
          {
            id: 'affiliation-1',
            name: 'University',
            country: 'US',
            type: 'Academic',
          },
        ],
      };

      (apiService.get as any).mockResolvedValue({ data: mockMetadata });

      const result = await fileService.getMetadata('process-123');

      expect(apiService.get).toHaveBeenCalledWith('/api/processes/process-123/metadata');
      expect(result).toEqual(mockMetadata);
    });

    it('should handle metadata fetch errors', async () => {
      const mockError = new Error('Metadata not found');

      (apiService.get as any).mockRejectedValue(mockError);

      await expect(fileService.getMetadata('process-123')).rejects.toThrow('Metadata not found');
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata successfully', async () => {
      const mockUpdateRequest: UpdateMetadataRequest = {
        title: 'Updated Title',
        abstract: 'Updated Abstract',
        keywords: ['new-keyword'],
      };

      const mockUpdatedMetadata: ExtractedMetadata = {
        title: 'Updated Title',
        abstract: 'Updated Abstract',
        keywords: ['new-keyword'],
        authors: [],
        affiliations: [],
      };

      (apiService.put as any).mockResolvedValue({ data: mockUpdatedMetadata });

      const result = await fileService.updateMetadata('process-123', mockUpdateRequest);

      expect(apiService.put).toHaveBeenCalledWith(
        '/api/processes/process-123/metadata',
        mockUpdateRequest
      );
      expect(result).toEqual(mockUpdatedMetadata);
    });

    it('should handle metadata update errors', async () => {
      const mockUpdateRequest: UpdateMetadataRequest = {
        title: 'Updated Title',
      };
      const mockError = new Error('Update failed');

      (apiService.put as any).mockRejectedValue(mockError);

      await expect(fileService.updateMetadata('process-123', mockUpdateRequest)).rejects.toThrow('Update failed');
    });
  });
});