import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProcessService } from '../services/ProcessService';
import { 
  createProcessSchema, 
  updateProcessSchema, 
  updateProcessStepSchema,
  processQuerySchema,
  uuidSchema 
} from '../validation/schemas';
import { ProcessStatus, ProcessStep, ApiResponse } from '../types';

const prisma = new PrismaClient();

export class ProcessController {
  private processService: ProcessService;

  constructor() {
    this.processService = new ProcessService(prisma);
  }

  // POST /api/processes - Create new process
  createProcess = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createProcessSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Validation error',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      const process = await this.processService.createProcess(userId, value);

      const response: ApiResponse = {
        success: true,
        data: process,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating process:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to create process',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes - List user processes with pagination and filtering
  getProcesses = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = processQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Validation error',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      const result = await this.processService.getUserProcesses(userId, value);

      res.json(result);
    } catch (error) {
      console.error('Error fetching processes:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch processes',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id - Get process details
  getProcess = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'];
      if (!processId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Process ID is required',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error } = uuidSchema.validate(processId);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      // Check if detailed view is requested
      const includeDetails = req.query['details'] === 'true';
      
      const process = includeDetails 
        ? await this.processService.getProcessWithDetails(processId, userId)
        : await this.processService.getProcessById(processId, userId);

      if (!process) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: process,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching process:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch process',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // PUT /api/processes/:id/step - Update process step
  updateProcessStep = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'];
      if (!processId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Process ID is required',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error: idError } = uuidSchema.validate(processId);
      if (idError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error, value } = updateProcessStepSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Validation error',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      const process = await this.processService.updateProcessStep(
        processId, 
        userId, 
        value.step as ProcessStep, 
        value.status as ProcessStatus
      );

      if (!process) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: process,
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating process step:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update process step',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // PUT /api/processes/:id - Update process
  updateProcess = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'];
      if (!processId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Process ID is required',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error: idError } = uuidSchema.validate(processId);
      if (idError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error, value } = updateProcessSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Validation error',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      const process = await this.processService.updateProcess(processId, userId, value);

      if (!process) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: process,
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating process:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update process',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // DELETE /api/processes/:id - Delete process
  deleteProcess = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'];
      if (!processId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Process ID is required',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error } = uuidSchema.validate(processId);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      const deleted = await this.processService.deleteProcess(processId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Process deleted successfully' },
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting process:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to delete process',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/stats - Get process statistics
  getProcessStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const stats = await this.processService.getProcessStats(userId);

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching process stats:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch process statistics',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}