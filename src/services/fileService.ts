/**
 * File upload and metadata service
 * Handles file upload, metadata extraction, and metadata management
 */

import { apiService } from './apiService';
import type { 
  UploadResponse, 
  ExtractedMetadata, 
  UpdateMetadataRequest,
  ApiResponse 
} from '../types/api';

/**
 * File service class for file operations and metadata management
 */
class FileService {
  /**
   * Upload a file for a specific process
   */
  async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const response = await apiService.uploadFile<UploadResponse>(
      `/api/processes/${processId}/upload`,
      file,
      onProgress
    );
    return response.data;
  }

  /**
   * Get extracted metadata for a process
   */
  async getMetadata(processId: string): Promise<ExtractedMetadata> {
    const response = await apiService.get<ExtractedMetadata>(`/api/processes/${processId}/metadata`);
    return response.data;
  }

  /**
   * Update metadata for a process
   */
  async updateMetadata(processId: string, metadata: UpdateMetadataRequest): Promise<ExtractedMetadata> {
    const response = await apiService.put<ExtractedMetadata>(`/api/processes/${processId}/metadata`, metadata);
    return response.data;
  }
}

// Create and export service instance
export const fileService = new FileService();
export default fileService;