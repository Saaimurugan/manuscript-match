import { ProcessController } from '../../controllers/ProcessController';
import { Request, Response } from 'express';

// Mock the services
jest.mock('../../services/ProcessService');
jest.mock('../../services/RecommendationService');
jest.mock('@prisma/client');

describe('ProcessController Recommendation Endpoints', () => {
  let controller: ProcessController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      params: {},
      query: {},
      user: { id: 'test-user-id', email: 'test@example.com' },
      requestId: 'test-request-id'
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    controller = new ProcessController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCandidates', () => {
    it('should return 400 when process ID is missing', async () => {
      mockRequest.params = {};

      await controller.getCandidates(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Process ID is required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when process ID is invalid', async () => {
      mockRequest.params = { id: 'invalid-id' };

      await controller.getCandidates(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid process ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getRecommendations', () => {
    it('should return 400 when process ID is missing', async () => {
      mockRequest.params = {};

      await controller.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Process ID is required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when process ID is invalid', async () => {
      mockRequest.params = { id: 'invalid-id' };

      await controller.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid process ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when query parameters are invalid', async () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      mockRequest.query = { minPublications: 'invalid' };

      await controller.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid query parameters'),
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getRecommendationFilters', () => {
    it('should return 400 when process ID is missing', async () => {
      mockRequest.params = {};

      await controller.getRecommendationFilters(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Process ID is required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when process ID is invalid', async () => {
      mockRequest.params = { id: 'invalid-id' };

      await controller.getRecommendationFilters(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid process ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });
});