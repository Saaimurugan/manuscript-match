import { PrismaClient } from '@prisma/client';
import { ProcessRepository, CreateProcessInput, UpdateProcessInput } from '../repositories/ProcessRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { ProcessStatus, ProcessStep, ProcessMetadata, PaginatedResponse } from '../types';

export interface ProcessListOptions {
  page?: number;
  limit?: number;
  status?: ProcessStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProcessWithMetadata {
  id: string;
  userId: string;
  title: string;
  status: ProcessStatus;
  currentStep: ProcessStep;
  metadata: ProcessMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProcessService {
  private processRepository: ProcessRepository;
  private activityLogRepository: ActivityLogRepository;

  constructor(prisma: PrismaClient) {
    this.processRepository = new ProcessRepository(prisma);
    this.activityLogRepository = new ActivityLogRepository(prisma);
  }

  async createProcess(userId: string, data: { title: string }): Promise<ProcessWithMetadata> {
    const createData: CreateProcessInput = {
      userId,
      title: data.title,
      status: ProcessStatus.CREATED,
      currentStep: ProcessStep.UPLOAD,
    };

    const process = await this.processRepository.create(createData);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId: process.id,
      action: 'PROCESS_CREATED',
      details: JSON.stringify({ title: data.title }),
    });

    return this.formatProcess(process);
  }

  async getProcessById(processId: string, userId: string): Promise<ProcessWithMetadata | null> {
    const process = await this.processRepository.findById(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    return this.formatProcess(process);
  }

  async getProcessWithDetails(processId: string, userId: string): Promise<any | null> {
    const process = await this.processRepository.findByIdWithRelations(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    return {
      ...this.formatProcess(process),
      user: process.user,
      authors: process.processAuthors?.map(pa => ({
        ...pa.author,
        role: pa.role,
        validationStatus: pa.validationStatus ? JSON.parse(pa.validationStatus) : null,
        addedAt: pa.addedAt,
      })) || [],
      shortlists: process.shortlists || [],
      recentActivity: process.activityLogs || [],
    };
  }

  async getUserProcesses(
    userId: string, 
    options: ProcessListOptions = {}
  ): Promise<PaginatedResponse<ProcessWithMetadata>> {
    const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const findOptions: any = {
      skip,
      take: limit,
    };
    
    if (status) {
      findOptions.status = status;
    }

    const processes = await this.processRepository.findByUserId(userId, findOptions);

    const total = await this.processRepository.countByUserId(userId);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: processes.map(p => this.formatProcess(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async updateProcessStep(
    processId: string, 
    userId: string, 
    step: ProcessStep, 
    status?: ProcessStatus
  ): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updatedProcess = await this.processRepository.updateStep(processId, step, status);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'STEP_UPDATED',
      details: JSON.stringify({ 
        previousStep: existingProcess.currentStep,
        newStep: step,
        previousStatus: existingProcess.status,
        newStatus: status || existingProcess.status,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async updateProcess(
    processId: string, 
    userId: string, 
    data: UpdateProcessInput
  ): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updatedProcess = await this.processRepository.update(processId, data);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'PROCESS_UPDATED',
      details: JSON.stringify({ 
        changes: data,
        previousTitle: existingProcess.title,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async deleteProcess(processId: string, userId: string): Promise<boolean> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return false;
    }

    // Log the activity before deletion
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'PROCESS_DELETED',
      details: JSON.stringify({ 
        title: existingProcess.title,
        status: existingProcess.status,
        step: existingProcess.currentStep,
      }),
    });

    await this.processRepository.delete(processId);
    return true;
  }

  async getProcessStats(userId: string): Promise<{
    total: number;
    byStatus: Record<ProcessStatus, number>;
    byStep: Record<ProcessStep, number>;
  }> {
    const processes = await this.processRepository.findByUserId(userId);
    
    const stats = {
      total: processes.length,
      byStatus: {} as Record<ProcessStatus, number>,
      byStep: {} as Record<ProcessStep, number>,
    };

    // Initialize counters
    Object.values(ProcessStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });
    Object.values(ProcessStep).forEach(step => {
      stats.byStep[step] = 0;
    });

    // Count processes
    processes.forEach(process => {
      stats.byStatus[process.status as ProcessStatus]++;
      stats.byStep[process.currentStep as ProcessStep]++;
    });

    return stats;
  }

  private formatProcess(process: any): ProcessWithMetadata {
    return {
      id: process.id,
      userId: process.userId,
      title: process.title,
      status: process.status as ProcessStatus,
      currentStep: process.currentStep as ProcessStep,
      metadata: process.metadata ? JSON.parse(process.metadata) : null,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
    };
  }
}