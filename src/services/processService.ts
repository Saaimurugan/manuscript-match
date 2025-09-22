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
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data.data as Process;
      } else {
        throw new Error('Invalid response structure: no process found');
      }
    } catch (error) {
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
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data.data as Process;
      } else {
        throw new Error('Invalid response structure: no process found');
      }
    } catch (error) {
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
