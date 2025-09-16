import { Request, Response, NextFunction } from 'express';
import { requestMonitoringMiddleware } from '@/middleware/requestMonitoring';
import { MonitoringService } from '@/services/MonitoringService';

// Mock MonitoringService
jest.mock('@/services/MonitoringService');
const MockedMonitoringService = MonitoringService as jest.MockedClass<typeof MonitoringService>;

describe('requestMonitoringMiddleware', () => {
  let mockMonitoringService: jest.Mocked<MonitoringService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockMonitoringService = {
      recordRequest: jest.fn(),
    } as any;

    MockedMonitoringService.getInstance.mockReturnValue(mockMonitoringService);

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      url: '/api/test',
      requestId: 'test-123',
    };

    mockResponse = {
      statusCode: 200,
      end: jest.fn(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it('should set start time on request', () => {
    const beforeTime = new Date();
    
    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    
    const afterTime = new Date();
    
    expect((mockRequest as any).startTime).toBeInstanceOf(Date);
    expect((mockRequest as any).startTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect((mockRequest as any).startTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    expect(mockNext).toHaveBeenCalled();
  });

  it('should record request metrics when response ends', () => {
    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Simulate response ending
    const originalEnd = mockResponse.end as jest.Mock;
    originalEnd.mockImplementation(function(this: any, chunk?: any, encoding?: any, cb?: any) {
      // This simulates the actual res.end behavior
      if (typeof chunk === 'function') {
        chunk();
      } else if (typeof encoding === 'function') {
        encoding();
      } else if (typeof cb === 'function') {
        cb();
      }
    });

    // Call the overridden end method
    (mockResponse as any).end();

    expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith({
      timestamp: expect.any(Date),
      method: 'GET',
      url: '/api/test',
      statusCode: 200,
      responseTime: expect.any(Number),
      requestId: 'test-123',
      userId: undefined,
    });
  });

  it('should use originalUrl if available', () => {
    mockRequest.originalUrl = '/api/test?param=value';
    mockRequest.url = '/api/test';

    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Simulate response ending
    (mockResponse as any).end();

    expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/test?param=value',
      })
    );
  });

  it('should fall back to url if originalUrl is not available', () => {
    mockRequest.originalUrl = undefined;
    mockRequest.url = '/api/test';

    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Simulate response ending
    (mockResponse as any).end();

    expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/test',
      })
    );
  });

  it('should include user ID if available', () => {
    (mockRequest as any).user = { id: 'user-456' };

    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Simulate response ending
    (mockResponse as any).end();

    expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-456',
      })
    );
  });

  it('should handle missing requestId gracefully', () => {
    mockRequest.requestId = undefined;

    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Simulate response ending
    (mockResponse as any).end();

    expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'unknown',
      })
    );
  });

  it('should calculate response time correctly', (done) => {
    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Wait a bit to ensure some time passes
    setTimeout(() => {
      // Simulate response ending
      (mockResponse as any).end();

      expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          responseTime: expect.any(Number),
        })
      );

      const recordedMetrics = mockMonitoringService.recordRequest.mock.calls[0][0];
      expect(recordedMetrics.responseTime).toBeGreaterThan(0);
      done();
    }, 10);
  });

  it('should preserve original end method behavior', () => {
    const originalEnd = mockResponse.end as jest.Mock;
    const testChunk = 'test data';
    const testEncoding = 'utf8';
    const testCallback = jest.fn();

    requestMonitoringMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Call the overridden end method with parameters
    (mockResponse as any).end(testChunk, testEncoding, testCallback);

    // Verify original end was called with the same parameters
    expect(originalEnd).toHaveBeenCalledWith(testChunk, testEncoding, testCallback);
  });

  it('should handle different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach(method => {
      mockRequest.method = method;
      
      requestMonitoringMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate response ending
      (mockResponse as any).end();

      expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method,
        })
      );

      jest.clearAllMocks();
    });
  });

  it('should handle different status codes', () => {
    const statusCodes = [200, 201, 400, 401, 404, 500];

    statusCodes.forEach(statusCode => {
      mockResponse.statusCode = statusCode;
      
      requestMonitoringMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate response ending
      (mockResponse as any).end();

      expect(mockMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode,
        })
      );

      jest.clearAllMocks();
    });
  });
});