/**
 * Process management service
 * Handles CRUD operations for manuscript analysis processes
 */

import { apiService } from './apiService';
import type { 
  Process, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  ApiResponse 
} from '../types/api';

/**
 * Process service class for managing manuscript analysis processes
 */
class ProcessService {
  /**
   * Create a new process
   */
  async createProcess(data: CreateProcessRequest): Promise<Process> {
    const response = await apiService.post<Process>('/api/processes', data);
    return response.data;
  }

  /**
   * Get all processes for the current user
   */
  async getProcesses(): Promise<Process[]> {
    const response = await apiService.get<Process[]>('/api/processes');
    return response.data;
  }

  /**
   * Get a specific process by ID
   */
  async getProcess(id: string): Promise<Process> {
    const response = await apiService.get<Process>(`/api/processes/${id}`);
    return response.data;
  }

  /**
   * Update a process
   */
  async updateProcess(id: string, data: UpdateProcessRequest): Promise<Process> {
    const response = await apiService.put<Process>(`/api/processes/${id}`, data);
    return response.data;
  }

  /**
   * Update process step
   */
  async updateProcessStep(id: string, step: string): Promise<Process> {
    const response = await apiService.patch<Process>(`/api/processes/${id}/step`, { step });
    return response.data;
  }

  /**
   * Delete a process
   */
  async deleteProcess(id: string): Promise<void> {
    await apiService.delete(`/api/processes/${id}`);
  }
}

// Create and export service instance
export const processService = new ProcessService();
export default processService;