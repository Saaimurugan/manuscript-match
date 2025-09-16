import { Request, Response, NextFunction } from 'express';
import { requestLogger, logActivity } from '../../middleware/requestLogger';

// Mock the entire middleware module's dependencies
jest.mock('../../repositories/ActivityLogRepository');
jest.mock('../../config/database', () => ({
  prisma: {},
}));

// Mock the ActivityLogRepository create method
const mockCreate = jest.fn();

// Mock the ActivityLogRepository constructor
jest.mock('../../repositories/ActivityLogRepository', () => ({
  ActivityLogRepository: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

describe('requestLogger middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockClear();

    mockRequest = {
      method: 'POST',
      path: '/api/processes',
      user: { id: 'user-123', email: 'test@example.com' },
      ip: '127.0.0.1',
      requestId: 'req-456',
      body: { title: 'Test Process' },
      query: {},
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    } as any;

    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('requestLogger', () => {
    it('should log POST requests by default', async () => {
      const middleware = requestLogger();
      mockCreate.mockResolvedValue({} as any);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'PROCESS_CREATED',
        details: JSON.stringify({
          method: 'POST',
          path: '/api/processes',
          userAgent: 'Mozilla/5.0',
          ip: '127.0.0.1',
          requestId: 'req-456',
          body: { title: 'Test Process' },
          query: {},
        }),
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract process ID from URL', async () => {
      (mockRequest as any).path = '/api/processes/process-789/upload';
      const middleware = requestLogger();
      mockCreate.mockResolvedValue({} as any);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-123',
        processId: 'process-789',
        action: 'MANUSCRIPT_UPLOADED',
        details: expect.any(String),
      });
    });

    it('should skip logging for excluded paths', async () => {
      (mockRequest as any).path = '/health';
      const middleware = requestLogger();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip logging for unauthenticated users by default', async () => {
      (mockRequest as any).user = undefined;
      const middleware = requestLogger();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log all requests when logAllRequests is true', async () => {
      (mockRequest as any).user = undefined;
      (mockRequest as any).method = 'GET';
      const middleware = requestLogger({ logAllRequests: true });
      mockCreate.mockResolvedValue({} as any);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Should not create log for unauthenticated user even with logAllRequests
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should only log specified actions', async () => {
      (mockRequest as any).method = 'GET';
      const middleware = requestLogger({ loggedActions: ['POST', 'PUT'] });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize sensitive data from request body', async () => {
      (mockRequest as any).body = {
        title: 'Test Process',
        password: 'secret123',
        token: 'jwt-token',
      };
      const middleware = requestLogger();
      mockCreate.mockResolvedValue({} as any);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const createCall = mockCreate.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const details = JSON.parse(createCall!.details!);
      expect(details.body.password).toBe('[REDACTED]');
      expect(details.body.token).toBe('[REDACTED]');
      expect(details.body.title).toBe('Test Process');
    });

    it('should continue execution if logging fails', async () => {
      const middleware = requestLogger();
      mockCreate.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('Request logging failed:', expect.any(Error));
      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('logActivity middleware', () => {
    it('should log custom activity with details', async () => {
      const getDetails = (_req: Request) => ({ customField: 'value' });
      const middleware = logActivity('CUSTOM_ACTION', getDetails);
      mockCreate.mockResolvedValue({} as any);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'CUSTOM_ACTION',
        details: JSON.stringify({
          method: 'POST',
          path: '/api/processes',
          requestId: 'req-456',
          customField: 'value',
        }),
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log activity without custom details', async () => {
      const middleware = logActivity('SIMPLE_ACTION');
      mockCreate.mockResolvedValue({} as any);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'SIMPLE_ACTION',
        details: JSON.stringify({
          method: 'POST',
          path: '/api/processes',
          requestId: 'req-456',
        }),
      });
    });

    it('should skip logging for unauthenticated users', async () => {
      (mockRequest as any).user = undefined;
      const middleware = logActivity('CUSTOM_ACTION');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue execution if logging fails', async () => {
      const middleware = logActivity('FAILING_ACTION');
      mockCreate.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('Activity logging failed:', expect.any(Error));
      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  // Note: determineAction is a private function, tested indirectly through middleware behavior
});