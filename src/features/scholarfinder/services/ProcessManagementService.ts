/**
 * Process Management Service
 * Handles internal process tracking, persistence, and state management
 * for ScholarFinder workflows
 */

import { ApiService } from '../../../services/apiService';
import {
  ProcessStep,
  ProcessStatus,
  type Process,
  type ProcessMetadata,
  type ProcessStepData,
  type UploadStepData,
  type MetadataStepData,
  type KeywordStepData,
  type SearchStepData,
  type ManualStepData,
  type ValidationStepData,
  type RecommendationsStepData,
  type ShortlistStepData,
  type ExportStepData
} from '../types/process';
import type { Reviewer } from '../types/api';

/**
 * Process creation request interface
 */
export interface CreateProcessRequest {
  title: string;
  jobId: string;
  fileName?: string;
  fileSize?: number;
  userId: string;
}

/**
 * Process update request interface
 */
export interface UpdateProcessRequest {
  status?: ProcessStatus;
  currentStep?: ProcessStep;
  metadata?: Partial<ProcessMetadata>;
  stepData?: Partial<ProcessStepData>;
}

/**
 * Process list filters
 */
export interface ProcessListFilters {
  status?: ProcessStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

/**
 * Process Management Service Class
 * Handles CRUD operations for ScholarFinder processes
 */
export class ProcessManagementService {
  private apiService: ApiService;

  constructor(apiService?: ApiService) {
    this.apiService = apiService || new ApiService();
  }

  /**
   * Create a new process
   */
  async createProcess(request: CreateProcessRequest): Promise<Process> {
    const processData = {
      title: request.title,
      jobId: request.jobId,
      status: ProcessStatus.CREATED,
      currentStep: ProcessStep.UPLOAD,
      metadata: {
        userId: request.userId,
        fileName: request.fileName,
        fileSize: request.fileSize,
        manuscriptTitle: request.title,
        authors: [],
        totalReviewers: 0,
        shortlistCount: 0
      } as ProcessMetadata,
      stepData: {} as ProcessStepData
    };

    const response = await this.apiService.post<Process>('/scholarfinder/processes', processData);
    return response.data;
  }

  /**
   * Get a specific process by ID
   */
  async getProcess(processId: string): Promise<Process> {
    const response = await this.apiService.get<Process>(`/scholarfinder/processes/${processId}`);
    
    // Ensure dates are properly parsed
    const process = response.data;
    process.createdAt = new Date(process.createdAt);
    process.updatedAt = new Date(process.updatedAt);
    
    return process;
  }

  /**
   * Update a process
   */
  async updateProcess(processId: string, updates: UpdateProcessRequest): Promise<Process> {
    const response = await this.apiService.put<Process>(`/scholarfinder/processes/${processId}`, updates);
    
    // Ensure dates are properly parsed
    const process = response.data;
    process.createdAt = new Date(process.createdAt);
    process.updatedAt = new Date(process.updatedAt);
    
    return process;
  }

  /**
   * Update process step and associated data
   */
  async updateProcessStep(processId: string, step: ProcessStep, stepData?: any): Promise<Process> {
    const updates: UpdateProcessRequest = {
      currentStep: step,
      status: ProcessStatus.IN_PROGRESS
    };

    // Add step-specific data if provided
    if (stepData) {
      updates.stepData = {
        [step]: {
          ...stepData,
          lastModified: new Date()
        }
      };
    }

    return this.updateProcess(processId, updates);
  }

  /**
   * Update upload step data
   */
  async updateUploadStepData(processId: string, data: Omit<UploadStepData, 'uploadedAt'>): Promise<Process> {
    const stepData: UploadStepData = {
      ...data,
      uploadedAt: new Date()
    };

    return this.updateProcessStep(processId, ProcessStep.UPLOAD, stepData);
  }

  /**
   * Update metadata step data
   */
  async updateMetadataStepData(processId: string, data: Omit<MetadataStepData, 'lastModified'>): Promise<Process> {
    const stepData: MetadataStepData = {
      ...data,
      lastModified: new Date()
    };

    // Also update process metadata
    const metadataUpdates: Partial<ProcessMetadata> = {
      manuscriptTitle: data.title,
      authors: data.authors
    };

    const updates: UpdateProcessRequest = {
      currentStep: ProcessStep.METADATA,
      metadata: metadataUpdates,
      stepData: {
        metadata: stepData
      }
    };

    return this.updateProcess(processId, updates);
  }

  /**
   * Update keyword step data
   */
  async updateKeywordStepData(processId: string, data: Omit<KeywordStepData, 'lastModified'>): Promise<Process> {
    const stepData: KeywordStepData = {
      ...data,
      lastModified: new Date()
    };

    return this.updateProcessStep(processId, ProcessStep.KEYWORDS, stepData);
  }

  /**
   * Update search step data
   */
  async updateSearchStepData(processId: string, data: Omit<SearchStepData, 'searchCompletedAt'>): Promise<Process> {
    const stepData: SearchStepData = {
      ...data,
      searchCompletedAt: new Date()
    };

    // Update total reviewers in metadata
    const metadataUpdates: Partial<ProcessMetadata> = {
      totalReviewers: data.totalReviewers
    };

    const updates: UpdateProcessRequest = {
      currentStep: ProcessStep.SEARCH,
      metadata: metadataUpdates,
      stepData: {
        search: stepData
      }
    };

    return this.updateProcess(processId, updates);
  }

  /**
   * Update manual step data
   */
  async updateManualStepData(processId: string, data: Omit<ManualStepData, 'lastModified'>): Promise<Process> {
    const stepData: ManualStepData = {
      ...data,
      lastModified: new Date()
    };

    return this.updateProcessStep(processId, ProcessStep.MANUAL, stepData);
  }

  /**
   * Update validation step data
   */
  async updateValidationStepData(processId: string, data: ValidationStepData): Promise<Process> {
    const stepData: ValidationStepData = {
      ...data,
      completedAt: data.validationStatus === 'completed' ? new Date() : data.completedAt
    };

    return this.updateProcessStep(processId, ProcessStep.VALIDATION, stepData);
  }

  /**
   * Update recommendations step data
   */
  async updateRecommendationsStepData(processId: string, data: Omit<RecommendationsStepData, 'lastModified'>): Promise<Process> {
    const stepData: RecommendationsStepData = {
      ...data,
      lastModified: new Date()
    };

    return this.updateProcessStep(processId, ProcessStep.RECOMMENDATIONS, stepData);
  }

  /**
   * Update shortlist step data
   */
  async updateShortlistStepData(processId: string, data: Omit<ShortlistStepData, 'lastModified'>): Promise<Process> {
    const stepData: ShortlistStepData = {
      ...data,
      lastModified: new Date()
    };

    // Update shortlist count in metadata
    const metadataUpdates: Partial<ProcessMetadata> = {
      shortlistCount: data.selectedReviewers.length
    };

    const updates: UpdateProcessRequest = {
      currentStep: ProcessStep.SHORTLIST,
      metadata: metadataUpdates,
      stepData: {
        shortlist: stepData
      }
    };

    return this.updateProcess(processId, updates);
  }

  /**
   * Update export step data
   */
  async updateExportStepData(processId: string, data: ExportStepData): Promise<Process> {
    return this.updateProcessStep(processId, ProcessStep.EXPORT, data);
  }

  /**
   * Add reviewer to shortlist
   */
  async addToShortlist(processId: string, reviewer: Reviewer): Promise<Process> {
    const process = await this.getProcess(processId);
    const currentShortlist = process.stepData.shortlist?.selectedReviewers || [];
    
    // Check if reviewer is already in shortlist
    const isAlreadySelected = currentShortlist.some(r => r.email === reviewer.email);
    if (isAlreadySelected) {
      throw new Error('Reviewer is already in shortlist');
    }

    const updatedShortlist = [...currentShortlist, reviewer];
    const selectionHistory = process.stepData.shortlist?.selectionHistory || [];
    
    const shortlistData: ShortlistStepData = {
      selectedReviewers: updatedShortlist,
      selectionHistory: [
        ...selectionHistory,
        {
          type: 'add',
          reviewerId: reviewer.email,
          timestamp: new Date()
        }
      ],
      lastModified: new Date()
    };

    return this.updateShortlistStepData(processId, shortlistData);
  }

  /**
   * Remove reviewer from shortlist
   */
  async removeFromShortlist(processId: string, reviewerEmail: string): Promise<Process> {
    const process = await this.getProcess(processId);
    const currentShortlist = process.stepData.shortlist?.selectedReviewers || [];
    
    const updatedShortlist = currentShortlist.filter(r => r.email !== reviewerEmail);
    const selectionHistory = process.stepData.shortlist?.selectionHistory || [];
    
    const shortlistData: ShortlistStepData = {
      selectedReviewers: updatedShortlist,
      selectionHistory: [
        ...selectionHistory,
        {
          type: 'remove',
          reviewerId: reviewerEmail,
          timestamp: new Date()
        }
      ],
      lastModified: new Date()
    };

    return this.updateShortlistStepData(processId, shortlistData);
  }

  /**
   * Clear entire shortlist
   */
  async clearShortlist(processId: string): Promise<Process> {
    const process = await this.getProcess(processId);
    const selectionHistory = process.stepData.shortlist?.selectionHistory || [];
    
    const shortlistData: ShortlistStepData = {
      selectedReviewers: [],
      selectionHistory: [
        ...selectionHistory,
        ...process.stepData.shortlist?.selectedReviewers.map(r => ({
          type: 'remove' as const,
          reviewerId: r.email,
          timestamp: new Date()
        })) || []
      ],
      lastModified: new Date()
    };

    return this.updateShortlistStepData(processId, shortlistData);
  }

  /**
   * Get list of processes for current user
   */
  async listUserProcesses(filters?: ProcessListFilters): Promise<Process[]> {
    const params = new URLSearchParams();
    
    if (filters?.status && filters.status.length > 0) {
      params.append('status', filters.status.join(','));
    }
    
    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const queryString = params.toString();
    const endpoint = `/scholarfinder/processes${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.apiService.get<Process[]>(endpoint);
    
    // Ensure dates are properly parsed for all processes
    return response.data.map(process => ({
      ...process,
      createdAt: new Date(process.createdAt),
      updatedAt: new Date(process.updatedAt)
    }));
  }

  /**
   * Delete a process
   */
  async deleteProcess(processId: string): Promise<void> {
    await this.apiService.delete(`/scholarfinder/processes/${processId}`);
  }

  /**
   * Mark process as completed
   */
  async completeProcess(processId: string): Promise<Process> {
    return this.updateProcess(processId, {
      status: ProcessStatus.COMPLETED,
      currentStep: ProcessStep.EXPORT
    });
  }

  /**
   * Mark process as failed
   */
  async failProcess(processId: string, error?: string): Promise<Process> {
    const updates: UpdateProcessRequest = {
      status: ProcessStatus.FAILED
    };

    // Store error information in step data if provided
    if (error) {
      updates.stepData = {
        export: {
          exportedFormats: [],
          exportHistory: [],
          error: {
            message: error,
            timestamp: new Date()
          }
        }
      };
    }

    return this.updateProcess(processId, updates);
  }

  /**
   * Cancel a process
   */
  async cancelProcess(processId: string): Promise<Process> {
    return this.updateProcess(processId, {
      status: ProcessStatus.CANCELLED
    });
  }

  /**
   * Get process statistics for dashboard
   */
  async getProcessStatistics(): Promise<{
    total: number;
    byStatus: Record<ProcessStatus, number>;
    recentActivity: Process[];
  }> {
    const response = await this.apiService.get<{
      total: number;
      byStatus: Record<ProcessStatus, number>;
      recentActivity: Process[];
    }>('/scholarfinder/processes/statistics');

    // Parse dates in recent activity
    const data = response.data;
    data.recentActivity = data.recentActivity.map(process => ({
      ...process,
      createdAt: new Date(process.createdAt),
      updatedAt: new Date(process.updatedAt)
    }));

    return data;
  }

  /**
   * Duplicate a process (create new process from existing one)
   */
  async duplicateProcess(processId: string, newTitle: string): Promise<Process> {
    const originalProcess = await this.getProcess(processId);
    
    const duplicateRequest: CreateProcessRequest = {
      title: newTitle,
      jobId: '', // Will need new job ID from external API
      fileName: originalProcess.metadata.fileName,
      fileSize: originalProcess.metadata.fileSize,
      userId: originalProcess.metadata.userId
    };

    const newProcess = await this.createProcess(duplicateRequest);

    // Copy metadata step data if it exists
    if (originalProcess.stepData.metadata) {
      await this.updateMetadataStepData(newProcess.id, {
        ...originalProcess.stepData.metadata,
        title: newTitle // Update title
      });
    }

    return newProcess;
  }
}

// Create and export default instance
export const processManagementService = new ProcessManagementService();

export default processManagementService;