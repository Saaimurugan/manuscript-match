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
    try {
      console.log('Creating process with data:', data); // Debug logging
      
      // The apiService returns the backend response directly, which has the format:
      // { success: boolean, data: Process }
      const backendResponse = await apiService.post('/api/processes', data);
      console.log('Backend response:', backendResponse); // Debug logging
      
      // The backendResponse is the actual response from our backend
      // which has the structure: { success: true, data: { process object } }
      
      // Validate response structure
      if (!backendResponse) {
        console.error('No response received from backend');
        throw new Error('No response received from server');
      }
      
      if (backendResponse.success === false) {
        console.error('Server returned success=false:', backendResponse);
        const errorMessage = backendResponse.error?.message || backendResponse.message || 'Unknown error';
        throw new Error(`Server error: ${errorMessage}`);
      }
      
      if (!backendResponse.data) {
        console.error('No process data in response:', backendResponse);
        console.error('Response keys:', Object.keys(backendResponse || {}));
        throw new Error('No process data returned from server');
      }
      
      const process = backendResponse.data;
      
      // Validate the process object
      if (!process || typeof process !== 'object') {
        console.error('Invalid process object:', process);
        throw new Error('Invalid process object returned from server');
      }
      
      if (!process.id) {
        console.error('Process missing id field:', process);
        throw new Error('Process object missing required id field');
      }
      
      if (!process.title) {
        console.error('Process missing title field:', process);
        throw new Error('Process object missing required title field');
      }
      
      console.log('Successfully created process:', process);
      return process;
    } catch (error) {
      console.error('Error creating process:', error);
      throw error;
    }
  }

  /**
   * Get all processes for the current user
   */
  async getProcesses(): Promise<Process[]> {
    try {
      // The apiService returns the backend response directly
      const backendResponse = await apiService.get('/api/processes');
      
      console.log('Backend response for getProcesses:', backendResponse); // Debug logging
      
      // Validate response structure
      if (!backendResponse) {
        console.error('No response received from backend');
        throw new Error('No response received from server');
      }
      
      if (backendResponse.success === false) {
        console.error('Server returned success=false:', backendResponse);
        const errorMessage = backendResponse.error?.message || backendResponse.message || 'Unknown error';
        throw new Error(`Server error: ${errorMessage}`);
      }
      
      // Handle successful response with data array
      if (backendResponse.success && Array.isArray(backendResponse.data)) {
        const processes = backendResponse.data;
        console.log('Processes received:', processes.length, processes); // Debug logging
        
        // Filter out any invalid processes on the frontend side as well
        const validProcesses = processes.filter(process => {
          if (!process || !process.id || !process.title) {
            console.warn('Invalid process filtered out:', process);
            return false;
          }
          return true;
        });
        
        return validProcesses;
      }
      
      // Handle case where data is not an array but success is true
      if (backendResponse.success && !backendResponse.data) {
        console.log('No processes found, returning empty array');
        return [];
      }
      
      // If we get here, the response structure is unexpected
      console.error('Unexpected response structure:', backendResponse);
      console.error('Response keys:', Object.keys(backendResponse || {}));
      throw new Error('Invalid response structure from server');
    } catch (error) {
      console.error('Error fetching processes:', error);
      throw error;
    }
  }

  /**
   * Get a specific process by ID
   */
  async getProcess(id: string): Promise<Process> {
    try {
      const backendResponse = await apiService.get(`/api/processes/${id}`);
      
      // Validate response structure
      if (!backendResponse) {
        throw new Error('No response received from server');
      }
      
      if (backendResponse.success === false) {
        const errorMessage = backendResponse.error?.message || 'Process not found';
        throw new Error(errorMessage);
      }
      
      if (!backendResponse.data) {
        throw new Error('No process data returned from server');
      }
      
      return backendResponse.data;
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
    const backendResponse = await apiService.put(`/api/processes/${id}`, data);
    
    if (!backendResponse || backendResponse.success === false) {
      throw new Error(backendResponse?.error?.message || 'Failed to update process');
    }
    
    return backendResponse.data;
  }

  /**
   * Update process step
   */
  async updateProcessStep(id: string, step: string): Promise<Process> {
    try {
      const backendResponse = await apiService.put(`/api/processes/${id}/step`, { step });
      
      if (!backendResponse || backendResponse.success === false) {
        throw new Error(backendResponse?.error?.message || 'Failed to update process step');
      }
      
      return backendResponse.data;
    } catch (error) {
      console.error('Failed to update process step:', error);
      throw error;
    }
  }

  /**
   * Delete a process
   */
  async deleteProcess(id: string): Promise<void> {
    const backendResponse = await apiService.delete(`/api/processes/${id}`);
    
    if (!backendResponse || backendResponse.success === false) {
      throw new Error(backendResponse?.error?.message || 'Failed to delete process');
    }
  }
}

export const processService = new ProcessService();
