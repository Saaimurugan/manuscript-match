/**
 * Process management service
 * Handles CRUD operations for manuscript analysis processes
 */

import { apiService } from './apiService';
import type { 
  Process, 
  CreateProcessRequest, 
  UpdateProcessRequest
} from '../types/api';

/**
 * Process service class for managing manuscript analysis processes
 */
class ProcessService {
  /**
   * Create a new process
   */
  async createProcess(data: CreateProcessRequest): Promise<Process> {
    const response = await apiService.post<{ success: boolean; data: Process }>('/api/processes', data);
    return response.data.data;
  }

  /**
   * Get all processes for the current user
   */
  async getProcesses(): Promise<Process[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: Process[] }>('/api/processes');
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data as Process[];
      } else {
        throw new Error('Invalid response structure: no processes found');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a specific process by ID
   */
  async getProcess(id: string): Promise<Process> {
    try {
      const response = await apiService.get<{ success: boolean; data: Process }>(`/api/processes/${id}`);
      
      // Handle different response structures
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data && !response.data.data && response.data.success !== false) {
        // Handle direct process object response
        return response.data as unknown as Process;
      } else {
        console.error('Invalid response structure:', response.data);
        throw new Error('Process not found or invalid response structure');
      }
    } catch (error: any) {
      console.error('Failed to fetch process:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error(`Process with ID ${id} not found`);
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to access this process');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error occurred while fetching process');
      }
      
      throw error;
    }
  }

  /**
   * Update a process
   */
  async updateProcess(id: string, data: UpdateProcessRequest): Promise<Process> {
    const response = await apiService.put<{ success: boolean; data: Process }>(`/api/processes/${id}`, data);
    return response.data.data;
  }

  /**
   * Update process step
   */
  async updateProcessStep(id: string, step: string): Promise<Process> {
    try {
      const response = await apiService.put<{ success: boolean; data: Process }>(`/api/processes/${id}/step`, { step });
      
      // Handle different response structures
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data && !response.data.data && response.data.success !== false) {
        // Handle direct process object response
        return response.data as unknown as Process;
      } else {
        console.error('Invalid response structure:', response.data);
        throw new Error('Invalid response structure: no process found');
      }
    } catch (error) {
      console.error('Failed to update process step:', error);
      throw error;
    }
  }

  /**
   * Delete a process
   */
  async deleteProcess(id: string): Promise<void> {
    await apiService.delete(`/api/processes/${id}`);
  }
}

export const processService = new ProcessService();
