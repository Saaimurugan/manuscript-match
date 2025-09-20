/**
 * Shortlist management service
 * Handles creating, managing, and exporting reviewer shortlists
 */

import { apiService } from './apiService';
import type { 
  Shortlist, 
  CreateShortlistRequest, 
  UpdateShortlistRequest,
  ApiResponse 
} from '../types/api';

/**
 * Shortlist service class for shortlist management
 */
class ShortlistService {
  /**
   * Get all shortlists for a process
   */
  async getShortlists(processId: string): Promise<Shortlist[]> {
    const response = await apiService.get<Shortlist[]>(`/api/processes/${processId}/shortlists`);
    return response.data;
  }

  /**
   * Get a specific shortlist
   */
  async getShortlist(processId: string, shortlistId: string): Promise<Shortlist> {
    const response = await apiService.get<Shortlist>(`/api/processes/${processId}/shortlists/${shortlistId}`);
    return response.data;
  }

  /**
   * Create a new shortlist
   */
  async createShortlist(processId: string, data: CreateShortlistRequest): Promise<Shortlist> {
    const response = await apiService.post<Shortlist>(`/api/processes/${processId}/shortlists`, data);
    return response.data;
  }

  /**
   * Update a shortlist
   */
  async updateShortlist(processId: string, shortlistId: string, data: UpdateShortlistRequest): Promise<Shortlist> {
    const response = await apiService.put<Shortlist>(`/api/processes/${processId}/shortlists/${shortlistId}`, data);
    return response.data;
  }

  /**
   * Delete a shortlist
   */
  async deleteShortlist(processId: string, shortlistId: string): Promise<void> {
    await apiService.delete(`/api/processes/${processId}/shortlists/${shortlistId}`);
  }

  /**
   * Export a shortlist in the specified format
   */
  async exportShortlist(processId: string, shortlistId: string, format: 'csv' | 'xlsx' | 'docx'): Promise<void> {
    await apiService.downloadFile(
      `/api/processes/${processId}/shortlists/${shortlistId}/export/${format}`,
      `shortlist-${shortlistId}.${format}`
    );
  }
}

// Create and export service instance
export const shortlistService = new ShortlistService();
export default shortlistService;