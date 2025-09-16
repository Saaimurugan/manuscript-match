import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware, 
  CustomError, 
  ErrorType,
  asyncHandler 
} from '@/middleware/errorHandler';
import { MonitoringService } from '@/services/MonitoringService';

// Mock MonitoringService
jest.mock('@/services/MonitoringService', () => ({
  MonitoringService: {
    getInstance: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockMonitoringService: jest.Mocked<MonitoringService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockMonitoringService = {
      recordError: jest.fn(),
    } as any;

    (MonitoringService.getInstance as jest.Mock).mockReturnValue(mockMonitoringService);

    mockRequest = {
      requestId: 'test-123',
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      path: '/api/test',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestIdMiddleware', () => {
    it('should add request ID to request and response headers', () => {
      requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBeDefined();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.requestId);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle CustomError correctly', () => {
      const customError = new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Validation failed',
        400,
        { field: 'email' }
      );

      errorHandler(customError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Validation failed',
          details: { field: 'email' },
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle Prisma errors', () => {
      const prismaError = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      errorHandler(prismaError as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.DATABASE_CONNECTION_ERROR,
          message: 'Database operation failed',
          details: { code: 'P2002' },
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle validation errors', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email' }],
      };

      errorHandler(validationError as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Validation failed',
          details: [{ field: 'email', message: 'Invalid email' }],
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle JWT errors', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'Invalid token',
      };

      errorHandler(jwtError as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'Authentication failed',
          details: undefined,
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        name: 'TimeoutError',
        message: 'Request timeout',
      };

      errorHandler(timeoutError as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.TIMEOUT_ERROR,
          message: 'Request timeout',
          details: undefined,
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle circuit breaker errors', () => {
      const circuitBreakerError = new Error('Circuit breaker test-service is OPEN');

      errorHandler(circuitBreakerError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.CIRCUIT_BREAKER_ERROR,
          message: 'Service temporarily unavailable',
          details: undefined,
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');

      errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong',
          details: undefined,
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should record error in monitoring system', () => {
      const error = new CustomError(ErrorType.VALIDATION_ERROR, 'Test error', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockMonitoringService.recordError).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
        type: ErrorType.VALIDATION_ERROR,
        message: 'Test error',
        requestId: 'test-123',
        url: '/api/test',
        statusCode: 400,
      });
    });

    it('should generate request ID if missing', () => {
      const requestWithoutId = { ...mockRequest };
      delete (requestWithoutId as any).requestId;

      const error = new Error('Test error');
      errorHandler(error, requestWithoutId as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Test error',
          details: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 error for unknown routes', () => {
      const requestWithPath = { ...mockRequest, method: 'GET', path: '/unknown' };

      notFoundHandler(requestWithPath as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          type: ErrorType.NOT_FOUND_ERROR,
          message: 'Route GET /unknown not found',
          requestId: 'test-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('should generate request ID if missing', () => {
      const requestWithoutId = { 
        ...mockRequest, 
        method: 'POST', 
        path: '/missing' 
      };
      delete (requestWithoutId as any).requestId;

      notFoundHandler(requestWithoutId as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          type: ErrorType.NOT_FOUND_ERROR,
          message: 'Route POST /missing not found',
          requestId: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncOperation = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(asyncOperation);

      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncOperation).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncOperation = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(asyncOperation);

      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncOperation).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('CustomError class', () => {
    it('should create error with all properties', () => {
      const error = new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Test message',
        400,
        { field: 'test' }
      );

      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('CustomError');
      expect(error.stack).toBeDefined();
    });

    it('should use default status code', () => {
      const error = new CustomError(ErrorType.INTERNAL_SERVER_ERROR, 'Test message');

      expect(error.statusCode).toBe(500);
    });
  });
});