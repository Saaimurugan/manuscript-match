import { PrismaClient } from '@prisma/client';
import { ProcessRepository, CreateProcessInput, UpdateProcessInput } from '../repositories/ProcessRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { ProcessStatus, ProcessStep, ProcessMetadata, ProcessTemplate, ProcessMetrics, ActiveProcess } from '../types';

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
  description?: string;
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

  async createProcess(userId: string, data: { title: string; description?: string }): Promise<ProcessWithMetadata> {
    const metadata = data.description ? JSON.stringify({ description: data.description }) : '';
<<<<<<< HEAD
<<<<<<< HEAD

=======
=======
>>>>>>> 9e091b2 (Bugs Fixed)
    
>>>>>>> 9e091b2 (Bugs Fixed)
    const createData: CreateProcessInput = {
      userId,
      title: data.title,
      status: ProcessStatus.CREATED,
      currentStep: ProcessStep.UPLOAD,
      metadata,
    };

    const process = await this.processRepository.create(createData);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId: process.id,
      action: 'PROCESS_CREATED',
      details: JSON.stringify({ title: data.title, description: data.description }),
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

  async getUserProcesses(userId: string, options: ProcessListOptions = {}): Promise<{
    processes: ProcessWithMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Get total count for pagination
    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    const total = await this.processRepository.count(where);

    // Get processes with pagination and sorting
    const findManyOptions: {
      skip: number;
      take: number;
      userId: string;
      status?: ProcessStatus;
      orderBy: { [key: string]: 'asc' | 'desc' };
    } = {
      skip,
      take: limit,
      userId,
      orderBy: { [sortBy]: sortOrder }
    };

    // Only add status if it's defined
    if (status) {
      findManyOptions.status = status;
    }

    const processes = await this.processRepository.findMany(findManyOptions);

    const formattedProcesses = processes.map(process => this.formatProcess(process));

    return {
      processes: formattedProcesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProcessWithDetails(processId: string, userId: string): Promise<ProcessWithMetadata | null> {
    // For now, this is the same as getProcessById, but could be extended with more details
    return this.getProcessById(processId, userId);
  }

  async updateProcessStep(processId: string, userId: string, step: ProcessStep, status: ProcessStatus): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);

    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updateData: UpdateProcessInput = {
      status,
      currentStep: step,
    };

    const updatedProcess = await this.processRepository.update(processId, updateData);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'PROCESS_STEP_UPDATED',
      details: JSON.stringify({
        previousStep: existingProcess.currentStep,
        newStep: step,
        previousStatus: existingProcess.status,
        newStatus: status,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async updateProcess(processId: string, userId: string, data: { title?: string; description?: string }): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);

    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updateData: UpdateProcessInput = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      const currentMetadata = existingProcess.metadata ? JSON.parse(existingProcess.metadata) : {};
      updateData.metadata = JSON.stringify({ ...currentMetadata, description: data.description });
    }

    const updatedProcess = await this.processRepository.update(processId, updateData);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'PROCESS_UPDATED',
      details: JSON.stringify({
        changes: data,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async getProcessStats(userId: string): Promise<{
    total: number;
    byStatus: Record<ProcessStatus, number>;
    byStep: Record<ProcessStep, number>;
    recentActivity: number;
  }> {
    const total = await this.processRepository.countByUserId(userId);

    // Get counts by status
    const byStatus: Record<ProcessStatus, number> = {
      [ProcessStatus.CREATED]: 0,
      [ProcessStatus.UPLOADING]: 0,
      [ProcessStatus.PROCESSING]: 0,
      [ProcessStatus.SEARCHING]: 0,
      [ProcessStatus.VALIDATING]: 0,
      [ProcessStatus.COMPLETED]: 0,
      [ProcessStatus.ERROR]: 0,
    };

    // Get counts by step
    const byStep: Record<ProcessStep, number> = {
      [ProcessStep.UPLOAD]: 0,
      [ProcessStep.METADATA_EXTRACTION]: 0,
      [ProcessStep.KEYWORD_ENHANCEMENT]: 0,
      [ProcessStep.DATABASE_SEARCH]: 0,
      [ProcessStep.MANUAL_SEARCH]: 0,
      [ProcessStep.VALIDATION]: 0,
      [ProcessStep.RECOMMENDATIONS]: 0,
      [ProcessStep.SHORTLIST]: 0,
      [ProcessStep.EXPORT]: 0,
    };

    // For now, return basic stats. This could be enhanced with actual queries
    const recentActivity = 0; // Could query activity logs from last 7 days

    return {
      total,
      byStatus,
      byStep,
      recentActivity,
    };
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

  private formatProcess(process: any): ProcessWithMetadata {
    const metadata = process.metadata ? JSON.parse(process.metadata) : null;
    const description = metadata?.description || undefined;

    return {
      id: process.id,
      userId: process.userId,
      title: process.title,
      description,
      status: process.status as ProcessStatus,
      currentStep: process.currentStep as ProcessStep,
      metadata,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
    };
  }

  // Admin Management Methods

  /**
   * Admin method to delete a process with validation for active instances
   */
  async adminDeleteProcess(processId: string, adminUserId: string): Promise<{
    success: boolean;
    message?: string;
    activeInstances?: number;
  }> {
    try {
      const process = await this.processRepository.findByIdWithRelations(processId);

      if (!process) {
        return {
          success: false,
          message: 'Process not found',
        };
      }

      // Check if process has active status that prevents deletion
      const activeStatuses = [ProcessStatus.PROCESSING, ProcessStatus.SEARCHING, ProcessStatus.VALIDATING];
      if (activeStatuses.includes(process.status as ProcessStatus)) {
        return {
          success: false,
          message: `Cannot delete process with active status: ${process.status}`,
          activeInstances: 1,
        };
      }

      // Log the activity before deletion
      await this.activityLogRepository.create({
        userId: adminUserId,
        processId,
        action: 'ADMIN_PROCESS_DELETED',
        details: JSON.stringify({
          title: process.title,
          status: process.status,
          step: process.currentStep,
          originalUserId: process.userId,
        }),
      });

      // Delete the process
      await this.processRepository.delete(processId);

      return {
        success: true,
        message: 'Process deleted successfully',
      };
    } catch (error) {
      console.error('Error in adminDeleteProcess:', error);
      return {
        success: false,
        message: 'Failed to delete process',
      };
    }
  }

  /**
   * Admin method to reset process stage with stage transition logic
   */
  async adminResetProcessStage(
    processId: string,
    targetStep: ProcessStep,
    adminUserId: string
  ): Promise<{
    success: boolean;
    process?: ProcessWithMetadata;
    message?: string;
  }> {
    try {
      const process = await this.processRepository.findById(processId);

      if (!process) {
        return {
          success: false,
          message: 'Process not found',
        };
      }

      // Validate target step
      if (!Object.values(ProcessStep).includes(targetStep)) {
        return {
          success: false,
          message: 'Invalid target stage',
        };
      }

      // Determine appropriate status based on target step
      let newStatus: ProcessStatus;
      switch (targetStep) {
        case ProcessStep.UPLOAD:
          newStatus = ProcessStatus.CREATED;
          break;
        case ProcessStep.METADATA_EXTRACTION:
        case ProcessStep.KEYWORD_ENHANCEMENT:
          newStatus = ProcessStatus.PROCESSING;
          break;
        case ProcessStep.DATABASE_SEARCH:
        case ProcessStep.MANUAL_SEARCH:
          newStatus = ProcessStatus.SEARCHING;
          break;
        case ProcessStep.VALIDATION:
          newStatus = ProcessStatus.VALIDATING;
          break;
        case ProcessStep.RECOMMENDATIONS:
        case ProcessStep.SHORTLIST:
        case ProcessStep.EXPORT:
          newStatus = ProcessStatus.COMPLETED;
          break;
        default:
          newStatus = ProcessStatus.PROCESSING;
      }

      // Update the process
      const updatedProcess = await this.processRepository.update(processId, {
        currentStep: targetStep,
        status: newStatus,
      });

      // Log the activity
      await this.activityLogRepository.create({
        userId: adminUserId,
        processId,
        action: 'ADMIN_STAGE_RESET',
        details: JSON.stringify({
          previousStep: process.currentStep,
          newStep: targetStep,
          previousStatus: process.status,
          newStatus,
          processTitle: process.title,
          originalUserId: process.userId,
        }),
      });

      return {
        success: true,
        process: this.formatProcess(updatedProcess),
        message: `Process stage reset to ${targetStep}`,
      };
    } catch (error) {
      console.error('Error in adminResetProcessStage:', error);
      return {
        success: false,
        message: 'Failed to reset process stage',
      };
    }
  }

  /**
   * Get predefined process templates for admin process creation
   */
  async getProcessTemplates(): Promise<ProcessTemplate[]> {
    return [
      {
        id: 'standard-review',
        name: 'Standard Peer Review',
        description: 'Standard manuscript peer review process with full validation',
        defaultMetadata: {
          description: 'Standard peer review process',
          expectedReviewers: 3,
          validationRequired: true,
          conflictCheckEnabled: true,
        },
        defaultStep: ProcessStep.UPLOAD,
        defaultStatus: ProcessStatus.CREATED,
      },
      {
        id: 'fast-track',
        name: 'Fast Track Review',
        description: 'Expedited review process with minimal validation',
        defaultMetadata: {
          description: 'Fast track review process',
          expectedReviewers: 2,
          validationRequired: false,
          conflictCheckEnabled: false,
        },
        defaultStep: ProcessStep.UPLOAD,
        defaultStatus: ProcessStatus.CREATED,
      },
      {
        id: 'comprehensive',
        name: 'Comprehensive Review',
        description: 'Thorough review process with extensive validation and multiple rounds',
        defaultMetadata: {
          description: 'Comprehensive review process',
          expectedReviewers: 5,
          validationRequired: true,
          conflictCheckEnabled: true,
          multipleRounds: true,
        },
        defaultStep: ProcessStep.UPLOAD,
        defaultStatus: ProcessStatus.CREATED,
      },
      {
        id: 'editorial',
        name: 'Editorial Review',
        description: 'Editorial review process for journal submissions',
        defaultMetadata: {
          description: 'Editorial review process',
          expectedReviewers: 2,
          validationRequired: true,
          conflictCheckEnabled: true,
          editorialReview: true,
        },
        defaultStep: ProcessStep.UPLOAD,
        defaultStatus: ProcessStatus.CREATED,
      },
    ];
  }

  /**
   * Admin method to create process from template
   */
  async adminCreateProcessFromTemplate(
    templateId: string,
    userId: string,
    title: string,
    adminUserId: string
  ): Promise<{
    success: boolean;
    process?: ProcessWithMetadata;
    message?: string;
  }> {
    try {
      const templates = await this.getProcessTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        return {
          success: false,
          message: 'Template not found',
        };
      }

      // Create process with template defaults
      const createData: CreateProcessInput = {
        userId,
        title,
        status: template.defaultStatus,
        currentStep: template.defaultStep,
        metadata: JSON.stringify(template.defaultMetadata),
      };

      const process = await this.processRepository.create(createData);

      // Log the activity
      await this.activityLogRepository.create({
        userId: adminUserId,
        processId: process.id,
        action: 'ADMIN_PROCESS_CREATED_FROM_TEMPLATE',
        details: JSON.stringify({
          templateId,
          templateName: template.name,
          title,
          targetUserId: userId,
        }),
      });

      return {
        success: true,
        process: this.formatProcess(process),
        message: `Process created from template: ${template.name}`,
      };
    } catch (error) {
      console.error('Error in adminCreateProcessFromTemplate:', error);
      return {
        success: false,
        message: 'Failed to create process from template',
      };
    }
  }

  /**
   * Get comprehensive process metrics for admin dashboard
   */
  async getProcessMetrics(): Promise<ProcessMetrics> {
    try {
      const processes = await this.processRepository.findMany({});

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const metrics: ProcessMetrics = {
        totalProcesses: processes.length,
        activeProcesses: 0,
        completedProcesses: 0,
        errorProcesses: 0,
        recentActivity: 0,
        byStatus: {} as Record<ProcessStatus, number>,
        byStep: {} as Record<ProcessStep, number>,
        averageCompletionTime: 0,
        processingTrends: {
          daily: 0,
          weekly: 0,
        },
      };

      // Initialize counters
      Object.values(ProcessStatus).forEach(status => {
        metrics.byStatus[status] = 0;
      });
      Object.values(ProcessStep).forEach(step => {
        metrics.byStep[step] = 0;
      });

      let totalCompletionTime = 0;
      let completedCount = 0;

      // Analyze processes
      processes.forEach(process => {
        const status = process.status as ProcessStatus;
        const step = process.currentStep as ProcessStep;

        metrics.byStatus[status]++;
        metrics.byStep[step]++;

        // Count active processes
        if ([ProcessStatus.PROCESSING, ProcessStatus.SEARCHING, ProcessStatus.VALIDATING].includes(status)) {
          metrics.activeProcesses++;
        }

        // Count completed processes
        if (status === ProcessStatus.COMPLETED) {
          metrics.completedProcesses++;
          const completionTime = process.updatedAt.getTime() - process.createdAt.getTime();
          totalCompletionTime += completionTime;
          completedCount++;
        }

        // Count error processes
        if (status === ProcessStatus.ERROR) {
          metrics.errorProcesses++;
        }

        // Count recent activity
        if (process.updatedAt > oneDayAgo) {
          metrics.recentActivity++;
        }

        // Count daily and weekly trends
        if (process.createdAt > oneDayAgo) {
          metrics.processingTrends.daily++;
        }
        if (process.createdAt > oneWeekAgo) {
          metrics.processingTrends.weekly++;
        }
      });

      // Calculate average completion time in hours
      if (completedCount > 0) {
        metrics.averageCompletionTime = Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60));
      }

      return metrics;
    } catch (error) {
      console.error('Error in getProcessMetrics:', error);
      throw new Error('Failed to get process metrics');
    }
  }

  /**
   * Get active processes for admin oversight
   */
  async getActiveProcesses(options: { limit?: number } = {}): Promise<ActiveProcess[]> {
    try {
      const { limit } = options;

      const findOptions: any = {
        orderBy: { updatedAt: 'desc' },
      };

      if (limit) {
        findOptions.take = limit;
      }

      const processes = await this.processRepository.findMany(findOptions);

      // Filter for active processes and add duration
      const activeProcesses: ActiveProcess[] = processes
        .filter(process => {
          const status = process.status as ProcessStatus;
          return [ProcessStatus.PROCESSING, ProcessStatus.SEARCHING, ProcessStatus.VALIDATING].includes(status);
        })
        .map(process => {
          const now = new Date();
          const duration = Math.max(1, Math.round((now.getTime() - process.updatedAt.getTime()) / (1000 * 60))); // Duration in minutes, minimum 1

          return {
            id: process.id,
            userId: process.userId,
            title: process.title,
            status: process.status as ProcessStatus,
            currentStep: process.currentStep as ProcessStep,
            duration,
            lastActivity: process.updatedAt,
            createdAt: process.createdAt,
          };
        });

      return activeProcesses;
    } catch (error) {
      console.error('Error in getActiveProcesses:', error);
      throw new Error('Failed to get active processes');
    }
  }

  /**
   * Admin method to update process with validation and versioning
   */
  async adminUpdateProcess(
    processId: string,
    updates: {
      title?: string;
      description?: string;
      status?: ProcessStatus;
      currentStep?: ProcessStep;
      metadata?: any;
    },
    updatedBy: string
  ): Promise<{ success: boolean; process?: ProcessWithMetadata; message?: string; version?: number }> {
    try {
      const existingProcess = await this.processRepository.findById(processId);

      if (!existingProcess) {
        return { success: false, message: 'Process not found' };
      }

      // Validate the process configuration
      const validationResult = await this.validateProcessConfiguration(updates, existingProcess);
      if (!validationResult.valid) {
        return { success: false, message: validationResult.message || 'Validation failed' };
      }

      // Create a version before updating
      const version = await this.createProcessVersion(processId, existingProcess, updatedBy);

      // Prepare update data
      let updateData: UpdateProcessInput = {};

      if (updates.title) updateData.title = updates.title;
      if (updates.status) updateData.status = updates.status;
      if (updates.currentStep) updateData.currentStep = updates.currentStep;

      // Handle metadata updates
      const existingMetadata = existingProcess.metadata ? JSON.parse(existingProcess.metadata) : {};
      const newMetadata = {
        ...existingMetadata,
        ...(updates.description && { description: updates.description }),
        ...(updates.metadata && updates.metadata),
        lastModifiedBy: updatedBy,
        lastModifiedAt: new Date(),
        version,
      };

      updateData.metadata = JSON.stringify(newMetadata);

      // Update the process
      const updatedProcess = await this.processRepository.update(processId, updateData);

      // Log the activity
      await this.activityLogRepository.create({
        userId: updatedBy,
        processId,
        action: 'ADMIN_PROCESS_UPDATED',
        details: JSON.stringify({
          processTitle: existingProcess.title,
          originalUserId: existingProcess.userId,
          changes: updates,
          version,
          updatedBy,
        }),
      });

      return {
        success: true,
        process: this.formatProcess(updatedProcess),
        message: 'Process updated successfully',
        version,
      };
    } catch (error) {
      console.error('Error in adminUpdateProcess:', error);
      return { success: false, message: 'Failed to update process' };
    }
  }

  /**
   * Validate process configuration for workflow integrity
   */
  private async validateProcessConfiguration(
    updates: any,
    existingProcess: any
  ): Promise<{ valid: boolean; message?: string }> {
    // Validate status transitions
    if (updates.status && updates.currentStep) {
      const validTransitions = this.getValidStatusStepCombinations();
      const combination = `${updates.status}-${updates.currentStep}`;

      if (!validTransitions.includes(combination)) {
        return {
          valid: false,
          message: `Invalid status-step combination: ${updates.status} with ${updates.currentStep}`
        };
      }
    }

    // Validate step progression (prevent skipping steps)
    if (updates.currentStep) {
      const stageOrder = [
        ProcessStep.UPLOAD,
        ProcessStep.METADATA_EXTRACTION,
        ProcessStep.KEYWORD_ENHANCEMENT,
        ProcessStep.DATABASE_SEARCH,
        ProcessStep.MANUAL_SEARCH,
        ProcessStep.VALIDATION,
        ProcessStep.RECOMMENDATIONS,
        ProcessStep.SHORTLIST,
        ProcessStep.EXPORT
      ];

      const currentIndex = stageOrder.indexOf(existingProcess.currentStep);
      const newIndex = stageOrder.indexOf(updates.currentStep);

      // Allow moving backwards or staying in same step, but warn about skipping forward
      if (newIndex > currentIndex + 1) {
        return {
          valid: false,
          message: `Cannot skip stages. Current: ${existingProcess.currentStep}, Target: ${updates.currentStep}`
        };
      }
    }

    // Validate metadata structure
    if (updates.metadata) {
      try {
        JSON.stringify(updates.metadata);
      } catch (error) {
        return {
          valid: false,
          message: 'Invalid metadata format'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get valid status-step combinations
   */
  private getValidStatusStepCombinations(): string[] {
    return [
      `${ProcessStatus.CREATED}-${ProcessStep.UPLOAD}`,
      `${ProcessStatus.UPLOADING}-${ProcessStep.UPLOAD}`,
      `${ProcessStatus.PROCESSING}-${ProcessStep.METADATA_EXTRACTION}`,
      `${ProcessStatus.PROCESSING}-${ProcessStep.KEYWORD_ENHANCEMENT}`,
      `${ProcessStatus.SEARCHING}-${ProcessStep.DATABASE_SEARCH}`,
      `${ProcessStatus.SEARCHING}-${ProcessStep.MANUAL_SEARCH}`,
      `${ProcessStatus.VALIDATING}-${ProcessStep.VALIDATION}`,
      `${ProcessStatus.COMPLETED}-${ProcessStep.RECOMMENDATIONS}`,
      `${ProcessStatus.COMPLETED}-${ProcessStep.SHORTLIST}`,
      `${ProcessStatus.COMPLETED}-${ProcessStep.EXPORT}`,
      `${ProcessStatus.ERROR}-${ProcessStep.UPLOAD}`,
      `${ProcessStatus.ERROR}-${ProcessStep.METADATA_EXTRACTION}`,
      `${ProcessStatus.ERROR}-${ProcessStep.KEYWORD_ENHANCEMENT}`,
      `${ProcessStatus.ERROR}-${ProcessStep.DATABASE_SEARCH}`,
      `${ProcessStatus.ERROR}-${ProcessStep.MANUAL_SEARCH}`,
      `${ProcessStatus.ERROR}-${ProcessStep.VALIDATION}`,
      `${ProcessStatus.ERROR}-${ProcessStep.RECOMMENDATIONS}`,
      `${ProcessStatus.ERROR}-${ProcessStep.SHORTLIST}`,
      `${ProcessStatus.ERROR}-${ProcessStep.EXPORT}`,
    ];
  }

  /**
   * Create a version snapshot of the process
   */
  private async createProcessVersion(
    processId: string,
    process: any,
    versionedBy: string
  ): Promise<number> {
    const existingMetadata = process.metadata ? JSON.parse(process.metadata) : {};
    const currentVersion = existingMetadata.version || 0;
    const newVersion = currentVersion + 1;

    // Log the version creation
    await this.activityLogRepository.create({
      userId: versionedBy,
      processId,
      action: 'PROCESS_VERSION_CREATED',
      details: JSON.stringify({
        version: newVersion,
        previousVersion: currentVersion,
        snapshot: {
          title: process.title,
          status: process.status,
          currentStep: process.currentStep,
          metadata: existingMetadata,
        },
        versionedBy,
      }),
    });

    return newVersion;
  }

  /**
   * Get process change history with versions
   */
  async getProcessChangeHistory(
    processId: string,
    limit: number = 20
  ): Promise<Array<{
    version: number;
    changedBy: string;
    changedAt: Date;
    changes: any;
    snapshot?: any;
  }>> {
    // Get version creation logs from activity log repository
    const activityLogs = await this.activityLogRepository.findByProcessId(processId, {
      take: limit,
    });

    const versionLogs = activityLogs.filter(log => log.action === 'PROCESS_VERSION_CREATED');

    return versionLogs.map(log => {
      const details = log.details ? JSON.parse(log.details) : {};
      return {
        version: details.version || 0,
        changedBy: log.userId || 'system',
        changedAt: log.timestamp,
        changes: details.changes || {},
        snapshot: details.snapshot,
      };
    });
  }

  /**
   * Rollback process to a previous version
   */
  async rollbackProcessToVersion(
    processId: string,
    targetVersion: number,
    rolledBackBy: string
  ): Promise<{ success: boolean; process?: ProcessWithMetadata; message?: string }> {
    try {
      const changeHistory = await this.getProcessChangeHistory(processId);
      const targetVersionData = changeHistory.find(h => h.version === targetVersion);

      if (!targetVersionData || !targetVersionData.snapshot) {
        return { success: false, message: 'Version not found or no snapshot available' };
      }

      const snapshot = targetVersionData.snapshot;

      // Get current process for version creation
      const currentProcess = await this.processRepository.findById(processId);
      if (!currentProcess) {
        return { success: false, message: 'Process not found' };
      }

      // Create a new version before rollback
      const newVersion = await this.createProcessVersion(processId, currentProcess, rolledBackBy);

      // Prepare rollback data
      const updateData: UpdateProcessInput = {
        title: snapshot.title,
        status: snapshot.status,
        currentStep: snapshot.currentStep,
        metadata: JSON.stringify({
          ...snapshot.metadata,
          rolledBackTo: targetVersion,
          rolledBackBy,
          rolledBackAt: new Date(),
          version: newVersion,
        }),
      };

      // Update the process
      const updatedProcess = await this.processRepository.update(processId, updateData);

      // Log the rollback
      await this.activityLogRepository.create({
        userId: rolledBackBy,
        processId,
        action: 'PROCESS_ROLLED_BACK',
        details: JSON.stringify({
          targetVersion,
          newVersion,
          rolledBackBy,
        }),
      });

      return {
        success: true,
        process: this.formatProcess(updatedProcess)
      };
    } catch (error) {
      console.error('Error in rollbackProcessToVersion:', error);
      return { success: false, message: 'Failed to rollback process' };
    }
  }

  /**
   * Get process health status for monitoring and alerting
   */
  async getProcessHealthStatus(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    stuckProcesses: number;
    errorProcesses: number;
    longRunningProcesses: number;
    systemLoad: number;
    alerts: Array<{
      type: 'stuck' | 'error' | 'performance' | 'system';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      processId?: string;
      count?: number;
    }>;
  }> {
    try {
      const now = new Date();

      // Get all processes for analysis
      const allProcesses = await this.processRepository.findMany({});
      const activeProcesses = allProcesses.filter(p =>
        [ProcessStatus.PROCESSING, ProcessStatus.SEARCHING, ProcessStatus.VALIDATING].includes(p.status as ProcessStatus)
      );

      // Initialize counters
      let stuckProcesses = 0;
      let errorProcesses = 0;
      let longRunningProcesses = 0;
      const alerts: any[] = [];

      // Analyze active processes for issues
      activeProcesses.forEach(process => {
        const timeSinceUpdate = now.getTime() - process.updatedAt.getTime();
        const hoursSinceUpdate = timeSinceUpdate / (1000 * 60 * 60);

        // Check for stuck processes (no activity for > 2 hours)
        if (hoursSinceUpdate > 2) {
          stuckProcesses++;
          alerts.push({
            type: 'stuck',
            severity: hoursSinceUpdate > 6 ? 'critical' : 'high',
            message: `Process "${process.title}" has been stuck for ${Math.round(hoursSinceUpdate)} hours`,
            processId: process.id,
          });
        }

        // Check for long-running processes (running for > 24 hours)
        const timeSinceCreation = now.getTime() - process.createdAt.getTime();
        if (timeSinceCreation > 24 * 60 * 60 * 1000) {
          longRunningProcesses++;
          alerts.push({
            type: 'performance',
            severity: 'medium',
            message: `Process "${process.title}" has been running for over 24 hours`,
            processId: process.id,
          });
        }
      });

      // Count error processes
      errorProcesses = allProcesses.filter(p => p.status === ProcessStatus.ERROR).length;
      if (errorProcesses > 0) {
        alerts.push({
          type: 'error',
          severity: errorProcesses > 10 ? 'high' : 'medium',
          message: `${errorProcesses} processes in error state`,
          count: errorProcesses,
        });
      }

      // Calculate system load (simple metric based on active processes)
      const systemLoad = Math.min(activeProcesses.length / 100, 1); // Assume capacity of 100 concurrent processes

      if (systemLoad > 0.8) {
        alerts.push({
          type: 'system',
          severity: systemLoad > 0.95 ? 'critical' : 'high',
          message: `High system load: ${Math.round(systemLoad * 100)}% capacity`,
        });
      }

      // Determine overall health
      let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (alerts.some(a => a.severity === 'critical')) {
        overallHealth = 'critical';
      } else if (alerts.some(a => ['high', 'medium'].includes(a.severity))) {
        overallHealth = 'warning';
      }

      return {
        overallHealth,
        stuckProcesses,
        errorProcesses,
        longRunningProcesses,
        systemLoad: Math.round(systemLoad * 100),
        alerts,
      };
    } catch (error) {
      console.error('Error in getProcessHealthStatus:', error);
      throw new Error('Failed to get process health status');
    }
  }

  /**
   * Generate search suggestions for process search
   */
  async generateSearchSuggestions(
    searchTerm: string,
    searchType: 'name' | 'email'
  ): Promise<string[]> {
    // Generate search suggestions based on the search term
    const suggestions: string[] = [];

    if (searchType === 'name') {
      // For name searches, suggest variations
      const nameParts = searchTerm.trim().split(/\s+/);

      if (nameParts.length > 1) {
        // Suggest different name orders
        suggestions.push(nameParts.reverse().join(' '));

        // Suggest initials + last name
        const initials = nameParts.slice(0, -1).map(part => part.charAt(0).toUpperCase()).join('. ');
        const lastName = nameParts[nameParts.length - 1];
        suggestions.push(`${initials}. ${lastName}`);

        // Suggest first name + last initial
        const firstName = nameParts[0];
        const lastInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase();
        if (lastInitial) {
          suggestions.push(`${firstName} ${lastInitial}.`);
        }
      }

      // Suggest partial matches
      if (searchTerm.length > 3) {
        suggestions.push(searchTerm.substring(0, searchTerm.length - 1));
        suggestions.push(searchTerm.substring(1));
      }
    } else if (searchType === 'email') {
      // For email searches, suggest domain variations
      const emailParts = searchTerm.split('@');
      if (emailParts.length === 2) {
        const [localPart, domain] = emailParts;

        // Suggest common academic domains
        const academicDomains = [
          'edu', 'ac.uk', 'ac.in', 'ac.jp', 'ac.au', 'ac.ca',
          'university.edu', 'college.edu', 'research.org'
        ];

        academicDomains.forEach(acadDomain => {
          if (domain && !domain.includes(acadDomain)) {
            suggestions.push(`${localPart}@${acadDomain}`);
          }
        });

        // Suggest variations of the local part
        if (localPart && localPart.includes('.')) {
          const withoutDots = localPart.replace(/\./g, '');
          suggestions.push(`${withoutDots}@${domain}`);
        } else if (localPart && localPart.length > 6) {
          // Add dots between potential name parts
          const midPoint = Math.floor(localPart.length / 2);
          const withDot = localPart.substring(0, midPoint) + '.' + localPart.substring(midPoint);
          suggestions.push(`${withDot}@${domain}`);
        }
      }
    }

    // Remove duplicates and return unique suggestions
    return [...new Set(suggestions)].slice(0, 5);
  }

  // Placeholder methods for manuscript processing functionality
  async storeManuscriptMetadata(processId: string, userId: string, metadata: any, fileName: string): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);

    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updateData: UpdateProcessInput = {
      metadata: JSON.stringify({ ...metadata, fileName }),
    };

    const updatedProcess = await this.processRepository.update(processId, updateData);
    return this.formatProcess(updatedProcess);
  }

  async getProcessMetadata(processId: string, userId: string): Promise<any | null> {
    const process = await this.getProcessById(processId, userId);
    return process?.metadata || null;
  }

  async updateProcessMetadata(processId: string, userId: string, metadata: any): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);

    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updateData: UpdateProcessInput = {
      metadata: JSON.stringify(metadata),
    };

    const updatedProcess = await this.processRepository.update(processId, updateData);
    return this.formatProcess(updatedProcess);
  }

  async getProcessAuthors(processId: string, userId: string): Promise<any[] | null> {
    const process = await this.getProcessById(processId, userId);
    if (!process) return null;

    // Return empty array for now - this would be implemented with proper author data
    return [];
  }

  async updateProcessAuthors(processId: string, userId: string, authors: any[]): Promise<any[] | null> {
    const process = await this.getProcessById(processId, userId);
    if (!process) return null;

    // Store authors in metadata for now
    await this.updateProcessMetadata(processId, userId, { ...process.metadata, authors });
    return authors;
  }

  async getProcessAffiliations(processId: string, userId: string): Promise<any[] | null> {
    const process = await this.getProcessById(processId, userId);
    if (!process) return null;

    // Return empty array for now
    return [];
  }

  async updateProcessAffiliations(processId: string, userId: string, affiliations: any[]): Promise<any[] | null> {
    const process = await this.getProcessById(processId, userId);
    if (!process) return null;

    // Store affiliations in metadata for now
    await this.updateProcessMetadata(processId, userId, { ...process.metadata, affiliations });
    return affiliations;
  }

  async storeKeywordEnhancement(processId: string, userId: string, enhancement: any): Promise<void> {
    const process = await this.getProcessById(processId, userId);
    if (process) {
      await this.updateProcessMetadata(processId, userId, { ...process.metadata, keywordEnhancement: enhancement });
    }
  }

  async getKeywordEnhancement(processId: string, userId: string): Promise<any | null> {
    const process = await this.getProcessById(processId, userId);
    return process?.metadata?.keywordEnhancement || null;
  }

  async getProcessCandidates(processId: string, userId: string, authorRole?: string): Promise<any[] | null> {
    const process = await this.getProcessById(processId, userId);
    if (!process) return null;

    // Return empty array for now
    return [];
  }
}