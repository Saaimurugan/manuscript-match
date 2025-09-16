import { Request, Response, NextFunction } from 'express';
import { 
  errorRecoveryMiddleware, 
  CircuitBreakerManager, 
  healthCheckMiddleware,
  errorCorrelationMiddleware 
} from '@/middleware/errorRecovery';
import { CustomError, ErrorType } from '@/middleware/errorHandler';
import { MonitoringService } from '@/services/MonitoringService';

// Mock MonitoringService
jest.mock('@/services/MonitoringService');
const MockedMonitoringService = MonitoringService as jest.MockedClass<typeof MonitoringService>;

describe('Error Recovery Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockMonitoringService: jest.Mocked<MonitoringService>;

  beforeEach(() => {
    mockMonitoringService = {
      recordError: jest.fn(),
    } as any;

    MockedMonitoringService.getInstance.mockReturnValue(mockMonitoringService);

    mockRequest = {
      requestId: 'test-123',
      url: '/api/test',
      method: 'GET',
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('errorRecoveryMiddleware', () => {
    it('should retry retryable errors', (done) => {
      const middleware = errorRecoveryMiddleware({
        maxRetries: 2,
        retryDelay: 10,
        retryableErrors: [ErrorType.DATABASE_CONNECTION_ERROR],
      });

      const error = new CustomError(
        ErrorType.DATABASE_CONNECTION_ERROR,
        'Connection failed',
        503
      );

      // Mock setTimeout to execute immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        callback();
        return {} as any;
      });

      let callCount = 0;
      const mockNextWithRetry = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call should trigger retry
          expect(mockRequest.retryCount).toBe(1);
          expect(mockMonitoringService.recordError).toHaveBeenCalledWith({
            timestamp: expect.any(Date),
            type: ErrorType.DATABASE_CONNECTION_ERROR,
            message: 'Retry attempt 1: Connection failed',
            requestId: 'test-123',
            url: '/api/test',
          });
          done();
        }
      });

      middleware(error, mockRequest as Request, mockResponse as Response, mockNextWithRetry);

      global.setTimeout = originalSetTimeout;
    });

    it('should not retry non-retryable errors', () => {
      const middleware = errorRecoveryMiddleware({
        retryableErrors: [ErrorType.DATABASE_CONNECTION_ERROR],
      });

      const error = new CustomError(
        ErrorType.VALIDATION_ERROR,
        'Validation failed',
        400
      );

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRequest.retryCount).toBeUndefined();
    });

    it('should not retry after max attempts reached', () => {
      const middleware = errorRecoveryMiddleware({
        maxRetries: 1,
        retryableErrors: [ErrorType.DATABASE_CONNECTION_ERROR],
      });

      const error = new CustomError(
        ErrorType.DATABASE_CONNECTION_ERROR,
        'Connection failed',
        503
      );

      // Set retry count to max
      (mockRequest as any).retryCount = 1;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should not retry regular errors', () => {
      const middleware = errorRecoveryMiddleware();
      const error = new Error('Regular error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('CircuitBreakerManager', () => {
    let manager: CircuitBreakerManager;
    let mockCircuitBreaker: any;

    beforeEach(() => {
      manager = CircuitBreakerManager.getInstance();
      mockCircuitBreaker = {
        getStats: jest.fn(),
        reset: jest.fn(),
        on: jest.fn(),
      };
    });

    it('should register circuit breaker and listen to events', () => {
      manager.registerCircuitBreaker('test-service', mockCircuitBreaker);

      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('opened', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('should get circuit breaker status', () => {
      const mockStats = { state: 'CLOSED', failureCount: 0 };
      mockCircuitBreaker.getStats.mockReturnValue(mockStats);
      
      manager.registerCircuitBreaker('test-service', mockCircuitBreaker);
      const status = manager.getCircuitBreakerStatus('test-service');

      expect(status).toBe(mockStats);
    });

    it('should return null for unknown circuit breaker', () => {
      const status = manager.getCircuitBreakerStatus('unknown-service');
      expect(status).toBeNull();
    });

    it('should get all circuit breaker statuses', () => {
      const mockStats1 = { state: 'CLOSED', failureCount: 0 };
      const mockStats2 = { state: 'OPEN', failureCount: 5 };
      
      const mockCB1 = { ...mockCircuitBreaker, getStats: () => mockStats1 };
      const mockCB2 = { ...mockCircuitBreaker, getStats: () => mockStats2 };

      manager.registerCircuitBreaker('service1', mockCB1);
      manager.registerCircuitBreaker('service2', mockCB2);

      const allStatuses = manager.getAllCircuitBreakerStatuses();

      expect(allStatuses).toEqual({
        service1: mockStats1,
        service2: mockStats2,
      });
    });

    it('should reset circuit breaker', () => {
      manager.registerCircuitBreaker('test-service', mockCircuitBreaker);
      const result = manager.resetCircuitBreaker('test-service');

      expect(result).toBe(true);
      expect(mockCircuitBreaker.reset).toHaveBeenCalled();
    });

    it('should return false when resetting unknown circuit breaker', () => {
      const result = manager.resetCircuitBreaker('unknown-service');
      expect(result).toBe(false);
    });

    it('should reset all circuit breakers', () => {
      const mockCB1 = { ...mockCircuitBreaker };
      const mockCB2 = { ...mockCircuitBreaker };

      manager.registerCircuitBreaker('service1', mockCB1);
      manager.registerCircuitBreaker('service2', mockCB2);

      manager.resetAllCircuitBreakers();

      expect(mockCB1.reset).toHaveBeenCalled();
      expect(mockCB2.reset).toHaveBeenCalled();
    });
  });

  describe('healthCheckMiddleware', () => {
    let manager: CircuitBreakerManager;

    beforeEach(() => {
      manager = CircuitBreakerManager.getInstance();
      jest.spyOn(CircuitBreakerManager, 'getInstance').mockReturnValue(manager);
    });

    it('should pass through when no critical services are down', () => {
      jest.spyOn(manager, 'getCircuitBreakerStatus').mockReturnValue({ state: 'CLOSED' });
      
      const middleware = healthCheckMiddleware(['service1', 'service2']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail when critical services are down', () => {
      jest.spyOn(manager, 'getCircuitBreakerStatus')
        .mockReturnValueOnce({ state: 'CLOSED' })
        .mockReturnValueOnce({ state: 'OPEN' });
      
      const middleware = healthCheckMiddleware(['service1', 'service2']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      const error = mockNext.mock.calls[0][0];
      expect(error.type).toBe(ErrorType.CIRCUIT_BREAKER_ERROR);
      expect(error.message).toContain('service2');
    });

    it('should pass through when no critical services specified', () => {
      const middleware = healthCheckMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('errorCorrelationMiddleware', () => {
    it('should add correlation ID from header', () => {
      mockRequest.headers = { 'x-correlation-id': 'existing-correlation-123' };

      errorCorrelationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.correlationId).toBe('existing-correlation-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-correlation-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use request ID as correlation ID when header not present', () => {
      mockRequest.headers = {};

      errorCorrelationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.correlationId).toBe('test-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-123');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});