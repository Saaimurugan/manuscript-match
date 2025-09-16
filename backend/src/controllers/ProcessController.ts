import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProcessService } from '../services/ProcessService';
import { ManuscriptProcessingService } from '../services/ManuscriptProcessingService';
import { KeywordEnhancementService } from '../services/KeywordEnhancementService';
import { DatabaseIntegrationService } from '../services/DatabaseIntegrationService';
import { ManualReviewerSearchService } from '../services/ManualReviewerSearchService';
import { AuthorValidationService } from '../services/AuthorValidationService';
import { RecommendationService } from '../services/RecommendationService';
import { ShortlistService } from '../services/ShortlistService';
import { ActivityLogService } from '../services/ActivityLogService';
import { 
  createProcessSchema, 
  updateProcessSchema, 
  updateProcessStepSchema,
  processQuerySchema,
  uuidSchema,
  manuscriptMetadataSchema,
  createAuthorWithAffiliationsSchema,
  createAffiliationSchema,
  recommendationQuerySchema,
  activityLogSearchSchema
} from '../validation/schemas';
import Joi from 'joi';
import { ProcessStatus, ProcessStep, ApiResponse, ManuscriptMetadata, AuthorRole } from '../types';

const prisma = new PrismaClient();

export class ProcessController {
  private processService: ProcessService;
  private manuscriptProcessingService: ManuscriptProcessingService;
  private keywordEnhancementService: KeywordEnhancementService;
  private databaseIntegrationService: DatabaseIntegrationService;
  private manualReviewerSearchService: ManualReviewerSearchService;
  private authorValidationService: AuthorValidationService;
  private recommendationService: RecommendationService;
  private shortlistService: ShortlistService;
  private activityLogService: ActivityLogService;

  constructor() {
    this.processService = new ProcessService(prisma);
    this.manuscriptProcessingService = new ManuscriptProcessingService();
    this.keywordEnhancementService = new KeywordEnhancementService();
    this.databaseIntegrationService = new DatabaseIntegrationService({
      ...(process.env['PUBMED_API_KEY'] && { pubmedApiKey: process.env['PUBMED_API_KEY'] }),
      ...(process.env['ELSEVIER_API_KEY'] && { elsevierApiKey: process.env['ELSEVIER_API_KEY'] }),
    });
    this.manualReviewerSearchService = new ManualReviewerSearchService(
      this.databaseIntegrationService,
      this.processService
    );
    this.authorValidationService = new AuthorValidationService(prisma);
    this.recommendationService = new RecommendationService(prisma);
    this.shortlistService = new ShortlistService(
      new (require('../repositories/ShortlistRepository').ShortlistRepository)(prisma),
      new (require('../repositories/ProcessAuthorRepository').ProcessAuthorRepository)(prisma),
      new (require('../repositories/AuthorRepository').AuthorRepository)(prisma)
    );
    this.activityLogService = new ActivityLogService(prisma);
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

  // POST /api/processes/:id/upload - Upload manuscript file
  uploadManuscript = async (req: Request, res: Response): Promise<void> => {
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

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'No file uploaded',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Update process status to processing
      await this.processService.updateProcessStep(
        processId, 
        userId, 
        ProcessStep.METADATA_EXTRACTION, 
        ProcessStatus.PROCESSING
      );

      // Process the manuscript file
      const processingResult = await this.manuscriptProcessingService.extractMetadata(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (!processingResult.success) {
        // Update process status to error
        await this.processService.updateProcessStep(
          processId, 
          userId, 
          ProcessStep.UPLOAD, 
          ProcessStatus.ERROR
        );

        res.status(400).json({
          success: false,
          error: {
            type: 'FILE_PROCESSING_ERROR',
            message: processingResult.error || 'Failed to process manuscript',
            details: { processingTime: processingResult.processingTime },
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate extracted metadata
      const { error: metadataError } = manuscriptMetadataSchema.validate(processingResult.metadata);
      if (metadataError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: `Invalid extracted metadata: ${metadataError.details[0]?.message}`,
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Store the extracted metadata in the process
      const updatedProcess = await this.processService.storeManuscriptMetadata(
        processId,
        userId,
        processingResult.metadata!,
        req.file.originalname
      );

      // Update process status to completed metadata extraction
      await this.processService.updateProcessStep(
        processId, 
        userId, 
        ProcessStep.METADATA_EXTRACTION, 
        ProcessStatus.COMPLETED
      );

      const response: ApiResponse = {
        success: true,
        data: {
          process: updatedProcess,
          metadata: processingResult.metadata,
          processingTime: processingResult.processingTime,
          fileName: req.file.originalname,
          fileSize: req.file.size
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error uploading manuscript:', error);
      
      // Try to update process status to error if we have the processId
      const processId = req.params['id'];
      const userId = req.user?.id;
      if (processId && userId) {
        try {
          await this.processService.updateProcessStep(
            processId, 
            userId, 
            ProcessStep.UPLOAD, 
            ProcessStatus.ERROR
          );
        } catch (updateError) {
          console.error('Error updating process status to error:', updateError);
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to process manuscript upload',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/metadata - Get extracted metadata
  getMetadata = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;
      const metadata = await this.processService.getProcessMetadata(processId, userId);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process or metadata not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: metadata,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch metadata',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // PUT /api/processes/:id/metadata - Update extracted metadata
  updateMetadata = async (req: Request, res: Response): Promise<void> => {
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

      const { error: metadataError, value } = manuscriptMetadataSchema.validate(req.body);
      if (metadataError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: metadataError.details[0]?.message || 'Invalid metadata',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      const updatedProcess = await this.processService.updateProcessMetadata(
        processId,
        userId,
        value as ManuscriptMetadata
      );

      if (!updatedProcess) {
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
        data: updatedProcess,
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating metadata:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update metadata',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/authors - Get structured author data
  getAuthors = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;
      const authors = await this.processService.getProcessAuthors(processId, userId);

      if (authors === null) {
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
        data: authors,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch authors',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // PUT /api/processes/:id/authors - Update authors
  updateAuthors = async (req: Request, res: Response): Promise<void> => {
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

      // Validate authors array
      const authorsSchema = Joi.array().items(createAuthorWithAffiliationsSchema).min(1).required();
      const { error: authorsError, value } = authorsSchema.validate(req.body);
      if (authorsError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: authorsError.details[0]?.message || 'Invalid authors data',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      const updatedAuthors = await this.processService.updateProcessAuthors(
        processId,
        userId,
        value
      );

      if (!updatedAuthors) {
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
        data: updatedAuthors,
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating authors:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update authors',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/affiliations - Get affiliations
  getAffiliations = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;
      const affiliations = await this.processService.getProcessAffiliations(processId, userId);

      if (affiliations === null) {
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
        data: affiliations,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching affiliations:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch affiliations',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // PUT /api/processes/:id/affiliations - Update affiliations
  updateAffiliations = async (req: Request, res: Response): Promise<void> => {
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

      // Validate affiliations array
      const affiliationsSchema = Joi.array().items(createAffiliationSchema).required();
      const { error: affiliationsError, value } = affiliationsSchema.validate(req.body);
      if (affiliationsError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: affiliationsError.details[0]?.message || 'Invalid affiliations data',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      const updatedAffiliations = await this.processService.updateProcessAffiliations(
        processId,
        userId,
        value
      );

      if (!updatedAffiliations) {
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
        data: updatedAffiliations,
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating affiliations:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update affiliations',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/keywords/enhance - Generate enhanced keywords
  enhanceKeywords = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;

      // Get process metadata
      const metadata = await this.processService.getProcessMetadata(processId, userId);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process or metadata not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Update process status to processing
      await this.processService.updateProcessStep(
        processId, 
        userId, 
        ProcessStep.KEYWORD_ENHANCEMENT, 
        ProcessStatus.PROCESSING
      );

      // Enhance keywords
      const enhancementResult = await this.keywordEnhancementService.enhanceKeywords(metadata);

      // Store the enhancement result in the process
      await this.processService.storeKeywordEnhancement(processId, userId, enhancementResult);

      // Update process status to completed
      await this.processService.updateProcessStep(
        processId, 
        userId, 
        ProcessStep.KEYWORD_ENHANCEMENT, 
        ProcessStatus.COMPLETED
      );

      const response: ApiResponse = {
        success: true,
        data: enhancementResult,
      };

      res.json(response);
    } catch (error) {
      console.error('Error enhancing keywords:', error);
      
      // Try to update process status to error
      const processId = req.params['id'];
      const userId = req.user?.id;
      if (processId && userId) {
        try {
          await this.processService.updateProcessStep(
            processId, 
            userId, 
            ProcessStep.KEYWORD_ENHANCEMENT, 
            ProcessStatus.ERROR
          );
        } catch (updateError) {
          console.error('Error updating process status to error:', updateError);
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to enhance keywords',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/keywords - Get keyword enhancement results
  getKeywords = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;
      const keywordData = await this.processService.getKeywordEnhancement(processId, userId);

      if (!keywordData) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process or keyword data not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: keywordData,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch keywords',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // PUT /api/processes/:id/keywords/selection - Update keyword selection
  updateKeywordSelection = async (req: Request, res: Response): Promise<void> => {
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

      // Validate keyword selection updates
      const keywordSelectionSchema = Joi.array().items(
        Joi.object({
          keyword: Joi.string().required(),
          selected: Joi.boolean().required()
        })
      ).min(1).required();

      const { error: selectionError, value } = keywordSelectionSchema.validate(req.body);
      if (selectionError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: selectionError.details[0]?.message || 'Invalid keyword selection data',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Get current keyword enhancement data
      const currentKeywordData = await this.processService.getKeywordEnhancement(processId, userId);
      if (!currentKeywordData) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process or keyword data not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Update keyword selection
      const updatedResult = await this.keywordEnhancementService.updateKeywordSelection(
        currentKeywordData,
        value
      );

      // Store the updated result
      await this.processService.storeKeywordEnhancement(processId, userId, updatedResult);

      const response: ApiResponse = {
        success: true,
        data: updatedResult,
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating keyword selection:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update keyword selection',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/search - Initiate database search
  initiateSearch = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get keyword enhancement data to use for search
      const keywordData = await this.processService.getKeywordEnhancement(processId, userId);
      if (!keywordData) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Keyword enhancement must be completed before searching',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Update process status to searching
      await this.processService.updateProcessStep(
        processId,
        userId,
        ProcessStep.DATABASE_SEARCH,
        ProcessStatus.SEARCHING
      );

      // Prepare search terms
      const searchTerms = {
        keywords: keywordData.selectedKeywords,
        meshTerms: keywordData.meshTerms,
        booleanQueries: keywordData.searchStrings,
      };

      // Start the search (this runs asynchronously)
      this.databaseIntegrationService.searchAuthors(processId, searchTerms).catch(error => {
        console.error(`Database search failed for process ${processId}:`, error);
        // Update process status to error
        this.processService.updateProcessStep(
          processId,
          userId,
          ProcessStep.DATABASE_SEARCH,
          ProcessStatus.ERROR
        ).catch(updateError => {
          console.error('Failed to update process status to error:', updateError);
        });
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Database search initiated',
          processId,
          searchTerms: {
            keywordCount: searchTerms.keywords.length,
            meshTermCount: searchTerms.meshTerms.length,
            databases: this.databaseIntegrationService.getEnabledDatabases(),
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error initiating search:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to initiate database search',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/search/status - Get search progress
  getSearchStatus = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get search status from the database integration service
      const searchStatus = this.databaseIntegrationService.getSearchStatus(processId);

      if (!searchStatus) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'No search found for this process',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // If search is completed, update process status
      if (searchStatus.status === 'completed' && process.status === ProcessStatus.SEARCHING) {
        await this.processService.updateProcessStep(
          processId,
          userId,
          ProcessStep.DATABASE_SEARCH,
          ProcessStatus.COMPLETED
        );
      } else if (searchStatus.status === 'error' && process.status === ProcessStatus.SEARCHING) {
        await this.processService.updateProcessStep(
          processId,
          userId,
          ProcessStep.DATABASE_SEARCH,
          ProcessStatus.ERROR
        );
      }

      const response: ApiResponse = {
        success: true,
        data: searchStatus,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting search status:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get search status',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/search/manual/name - Search reviewers by name
  searchReviewersByName = async (req: Request, res: Response): Promise<void> => {
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

      // Validate search query
      const searchSchema = Joi.object({
        name: Joi.string().min(2).max(100).required(),
        databases: Joi.array().items(Joi.string().valid('pubmed', 'elsevier', 'wiley', 'taylor_francis')).optional(),
      });

      const { error: searchError, value } = searchSchema.validate(req.body);
      if (searchError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: searchError.details[0]?.message || 'Invalid search parameters',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Search for authors by name using the manual reviewer search service
      const searchResult = await this.manualReviewerSearchService.searchByName(
        value.name,
        value.databases
      );

      const response: ApiResponse = {
        success: true,
        data: searchResult,
      };

      res.json(response);
    } catch (error) {
      console.error('Error searching reviewers by name:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to search reviewers by name',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/search/manual/email - Search reviewers by email
  searchReviewersByEmail = async (req: Request, res: Response): Promise<void> => {
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

      // Validate search query
      const searchSchema = Joi.object({
        email: Joi.string().email().required(),
        databases: Joi.array().items(Joi.string().valid('pubmed', 'elsevier', 'wiley', 'taylor_francis')).optional(),
      });

      const { error: searchError, value } = searchSchema.validate(req.body);
      if (searchError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: searchError.details[0]?.message || 'Invalid search parameters',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Search for authors by email using the manual reviewer search service
      const searchResult = await this.manualReviewerSearchService.searchByEmail(
        value.email,
        value.databases
      );

      const response: ApiResponse = {
        success: true,
        data: searchResult,
      };

      res.json(response);
    } catch (error) {
      console.error('Error searching reviewers by email:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to search reviewers by email',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/reviewers/add - Add manual reviewer to candidate pool
  addManualReviewer = async (req: Request, res: Response): Promise<void> => {
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

      // Validate author data
      const authorSchema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().optional(),
        affiliations: Joi.array().items(Joi.object({
          id: Joi.string().required(),
          institutionName: Joi.string().required(),
          department: Joi.string().optional(),
          address: Joi.string().required(),
          country: Joi.string().required(),
        })).default([]),
        publicationCount: Joi.number().integer().min(0).default(0),
        clinicalTrials: Joi.number().integer().min(0).default(0),
        retractions: Joi.number().integer().min(0).default(0),
        researchAreas: Joi.array().items(Joi.string()).default([]),
        meshTerms: Joi.array().items(Joi.string()).default([]),
      });

      const { error: authorError, value } = authorSchema.validate(req.body);
      if (authorError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: authorError.details[0]?.message || 'Invalid author data',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Add the reviewer to the candidate pool using the manual reviewer search service
      const success = await this.manualReviewerSearchService.addManualReviewer(processId, userId, value);

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process not found or failed to add reviewer',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Reviewer added to candidate pool successfully',
          authorName: value.name,
          authorEmail: value.email,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error adding manual reviewer:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to add manual reviewer',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // DELETE /api/processes/:id/reviewers/:authorId - Remove reviewer from candidate pool
  removeManualReviewer = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'];
      const authorId = req.params['authorId'];

      if (!processId || !authorId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Process ID and Author ID are required',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error: processIdError } = uuidSchema.validate(processId);
      if (processIdError) {
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

      const { error: authorIdError } = uuidSchema.validate(authorId);
      if (authorIdError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid author ID',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Remove the reviewer from the candidate pool using the manual reviewer search service
      const success = await this.manualReviewerSearchService.removeReviewer(processId, userId, authorId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process or reviewer not found',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Reviewer removed from candidate pool successfully',
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error removing manual reviewer:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to remove manual reviewer',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/candidates - Get candidate reviewers
  getCandidateReviewers = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;
      const role = req.query['role'] as string;

      // Validate role if provided
      let authorRole: AuthorRole | undefined;
      if (role) {
        if (!Object.values(AuthorRole).includes(role as AuthorRole)) {
          res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Invalid role parameter',
              requestId: req.requestId || 'unknown',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        authorRole = role as AuthorRole;
      }

      const candidates = await this.processService.getProcessCandidates(processId, userId, authorRole);

      if (candidates === null) {
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
        data: candidates,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching candidate reviewers:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch candidate reviewers',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/validate - Validate candidate authors
  validateAuthors = async (req: Request, res: Response): Promise<void> => {
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

      // Validate optional validation configuration
      const validationConfigSchema = Joi.object({
        minPublications: Joi.number().integer().min(0).optional(),
        maxRetractions: Joi.number().integer().min(0).optional(),
        minRecentPublications: Joi.number().integer().min(0).optional(),
        recentYears: Joi.number().integer().min(1).max(20).optional(),
        checkInstitutionalConflicts: Joi.boolean().optional(),
        checkCoAuthorConflicts: Joi.boolean().optional(),
        collaborationYears: Joi.number().integer().min(1).max(10).optional(),
      });

      const { error: configError, value: config } = validationConfigSchema.validate(req.body || {});
      if (configError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: configError.details[0]?.message || 'Invalid validation configuration',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get manuscript metadata for validation
      const metadata = await this.processService.getProcessMetadata(processId, userId);
      if (!metadata) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Manuscript metadata must be available before validation',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Update process status to validating
      await this.processService.updateProcessStep(
        processId,
        userId,
        ProcessStep.VALIDATION,
        ProcessStatus.VALIDATING
      );

      try {
        // Run validation
        const validationResult = await this.authorValidationService.validateProcessAuthors(
          processId,
          metadata,
          config
        );

        // Update process status to completed
        await this.processService.updateProcessStep(
          processId,
          userId,
          ProcessStep.VALIDATION,
          ProcessStatus.COMPLETED
        );

        const response: ApiResponse = {
          success: true,
          data: validationResult,
        };

        res.json(response);
      } catch (validationError) {
        console.error('Validation error:', validationError);
        
        // Update process status to error
        await this.processService.updateProcessStep(
          processId,
          userId,
          ProcessStep.VALIDATION,
          ProcessStatus.ERROR
        );

        res.status(500).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Author validation failed',
            details: validationError instanceof Error ? validationError.message : 'Unknown error',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    } catch (error) {
      console.error('Error validating authors:', error);
      
      // Try to update process status to error
      const processId = req.params['id'];
      const userId = req.user?.id;
      if (processId && userId) {
        try {
          await this.processService.updateProcessStep(
            processId,
            userId,
            ProcessStep.VALIDATION,
            ProcessStatus.ERROR
          );
        } catch (updateError) {
          console.error('Error updating process status to error:', updateError);
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to validate authors',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/validation/results - Get validation results
  getValidationResults = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get validation results
      const validationResults = await this.authorValidationService.getProcessValidationResults(processId);

      const response: ApiResponse = {
        success: true,
        data: {
          processId,
          totalResults: validationResults.length,
          validatedAuthors: validationResults.filter(r => r.passed).length,
          results: validationResults,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching validation results:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch validation results',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/candidates - Get validated candidates
  getCandidates = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get validated candidates
      const candidates = await this.recommendationService.getValidatedCandidates(processId);

      const response: ApiResponse = {
        success: true,
        data: {
          processId,
          totalCandidates: candidates.length,
          candidates,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch candidates',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/recommendations - Get filtered and sorted recommendations
  getRecommendations = async (req: Request, res: Response): Promise<void> => {
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

      // Validate query parameters
      const { error: queryError, value: queryParams } = recommendationQuerySchema.validate(req.query);
      if (queryError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: queryError.details[0]?.message || 'Invalid query parameters',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Parse filters from query parameters
      const filters: any = {};
      if (queryParams.minPublications !== undefined) filters.minPublications = queryParams.minPublications;
      if (queryParams.maxRetractions !== undefined) filters.maxRetractions = queryParams.maxRetractions;
      if (queryParams.minClinicalTrials !== undefined) filters.minClinicalTrials = queryParams.minClinicalTrials;
      if (queryParams.onlyValidated !== undefined) filters.onlyValidated = queryParams.onlyValidated;

      // Handle array parameters that might come as strings
      if (queryParams.countries) {
        filters.countries = Array.isArray(queryParams.countries) 
          ? queryParams.countries 
          : [queryParams.countries];
      }
      if (queryParams.institutions) {
        filters.institutions = Array.isArray(queryParams.institutions) 
          ? queryParams.institutions 
          : [queryParams.institutions];
      }
      if (queryParams.researchAreas) {
        filters.researchAreas = Array.isArray(queryParams.researchAreas) 
          ? queryParams.researchAreas 
          : [queryParams.researchAreas];
      }
      if (queryParams.excludeConflicts) {
        filters.excludeConflicts = Array.isArray(queryParams.excludeConflicts) 
          ? queryParams.excludeConflicts 
          : [queryParams.excludeConflicts];
      }

      // Parse sort options
      const sortOptions = queryParams.sortBy ? {
        field: queryParams.sortBy,
        order: queryParams.sortOrder || 'desc'
      } : undefined;

      // Get recommendations
      const recommendations = await this.recommendationService.getRecommendations(
        processId,
        filters,
        sortOptions,
        queryParams.page,
        queryParams.limit
      );

      const response: ApiResponse = {
        success: true,
        data: recommendations,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch recommendations',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/recommendations/filters - Get available filter options
  getRecommendationFilters = async (req: Request, res: Response): Promise<void> => {
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

      const userId = req.user!.id;

      // Verify process exists and belongs to user
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get filter options
      const filterOptions = await this.recommendationService.getFilterOptions(processId);

      const response: ApiResponse = {
        success: true,
        data: filterOptions,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch filter options',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // POST /api/processes/:id/shortlist - Create shortlist
  createShortlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'] as string;
      
      const { error: idError } = uuidSchema.validate(processId);
      if (idError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID format',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const createShortlistSchema = Joi.object({
        name: Joi.string().required().min(1).max(255),
        authorIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
      });

      const { error, value } = createShortlistSchema.validate(req.body);
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
      
      // Verify process ownership
      const process = await this.processService.getProcessById(processId, userId);
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

      const shortlist = await this.shortlistService.createShortlist({
        processId,
        name: value.name,
        authorIds: value.authorIds,
      });

      const response: ApiResponse = {
        success: true,
        data: shortlist,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating shortlist:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to create shortlist',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/shortlists - Get shortlists for process
  getShortlists = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'] as string;
      
      const { error: idError } = uuidSchema.validate(processId);
      if (idError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID format',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      // Verify process ownership
      const process = await this.processService.getProcessById(processId, userId);
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

      const shortlists = await this.shortlistService.getShortlistsByProcess(processId);

      const response: ApiResponse = {
        success: true,
        data: shortlists,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching shortlists:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch shortlists',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/export/:format - Export shortlist
  exportShortlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'] as string;
      const format = req.params['format'] as string;
      
      const { error: idError } = uuidSchema.validate(processId);
      if (idError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID format',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const formatSchema = Joi.string().valid('csv', 'xlsx', 'docx').required();
      const { error: formatError } = formatSchema.validate(format);
      if (formatError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid export format. Supported formats: csv, xlsx, docx',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      // Verify process ownership
      const process = await this.processService.getProcessById(processId, userId);
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

      const exportResult = await this.shortlistService.exportShortlist(
        processId, 
        format as 'csv' | 'xlsx' | 'docx'
      );

      if (!exportResult.success) {
        res.status(400).json({
          success: false,
          error: {
            type: 'EXPORT_ERROR',
            message: exportResult.error || 'Export failed',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Set appropriate headers for file download
      const mimeTypes = {
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      res.setHeader('Content-Type', mimeTypes[format as keyof typeof mimeTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      
      // Send the file
      res.sendFile(exportResult.filePath!);
    } catch (error) {
      console.error('Error exporting shortlist:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to export shortlist',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // GET /api/processes/:id/logs - Get activity logs for process
  getProcessLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params['id'] as string;
      
      const { error: idError } = uuidSchema.validate(processId);
      if (idError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID format',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate query parameters
      const { error: queryError, value: queryParams } = activityLogSearchSchema.validate(req.query);
      if (queryError) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: queryError.details[0]?.message || 'Invalid query parameters',
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      
      // Verify process ownership
      const process = await this.processService.getProcessById(processId, userId);
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

      // Get activity logs for the process
      const result = await this.activityLogService.getProcessLogs(processId, {
        page: queryParams.page,
        limit: queryParams.limit,
        userId: queryParams.userId,
      });

      const response: ApiResponse = {
        success: true,
        data: result.logs,
      };

      // Add pagination info to response
      (response as any).pagination = result.pagination;

      res.json(response);
    } catch (error) {
      console.error('Error fetching process logs:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch process logs',
          requestId: req.requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}