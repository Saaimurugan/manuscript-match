import request from 'supertest';
import express from 'express';
import healthRoutes from '@/routes/health';
import { HealthCheckService } from '@/services/HealthCheckService';
import { MonitoringService } from '@/services/MonitoringService';

// Mock the services
jest.mock('@/services/HealthCheckService');
jest.mock('@/services/MonitoringService');

const MockedHealthCheckService = HealthCheckService as jest.MockedClass<typeof HealthCheckService>;
const MockedMonitoringService = MonitoringService as jest.MockedClass<typeof MonitoringService>;

describe('Health Routes', () => {
  let app: express.Application;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;
  let mockMonitoringService: jest.Mocked<MonitoringService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', healthRoutes);

    // Create mock instances
    mockHealthCheckService = {
      getHealthStatus: jest.fn(),
      isAlive: jest.fn(),
      isReady: jest.fn(),
    } as any;

    mockMonitoringService = {
      getSystemMetrics: jest.fn(),
      getPerformanceStats: jest.fn(),
      getRequestMetrics: jest.fn(),
      getErrorMetrics: jest.fn(),
    } as any;

    // Mock the constructors
    MockedHealthCheckService.mockImplementation(() => mockHealthCheckService);
    MockedMonitoringService.getInstance.mockReturnValue(mockMonitoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const healthStatus = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        environment: 'test',
        checks: {
          database: { status: 'healthy' as const },
          externalApis: { pubmed: { status: 'healthy' as const } },
          memory: { status: 'healthy' as const },
        },
      };

      mockHealthCheckService.getHealthStatus.mockResolvedValue(healthStatus);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual(healthStatus);
      expect(mockHealthCheckService.getHealthStatus).toHaveBeenCalled();
    });

    it('should return 503 for unhealthy status', async () => {
      const healthStatus = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        environment: 'test',
        checks: {
          database: { status: 'unhealthy' as const, error: 'Connection failed' },
          externalApis: {},
          memory: { status: 'healthy' as const },
        },
      };

      mockHealthCheckService.getHealthStatus.mockResolvedValue(healthStatus);

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toEqual(healthStatus);
    });

    it('should return 200 for degraded status', async () => {
      const healthStatus = {
        status: 'degraded' as const,
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        environment: 'test',
        checks: {
          database: { status: 'healthy' as const },
          externalApis: { pubmed: { status: 'degraded' as const } },
          memory: { status: 'healthy' as const },
        },
      };

      mockHealthCheckService.getHealthStatus.mockResolvedValue(healthStatus);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual(healthStatus);
    });
  });

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      mockHealthCheckService.isAlive.mockResolvedValue(true);

      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return dead status', async () => {
      mockHealthCheckService.isAlive.mockResolvedValue(false);

      const response = await request(app)
        .get('/health/live')
        .expect(503);

      expect(response.body.status).toBe('dead');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status', async () => {
      mockHealthCheckService.isReady.mockResolvedValue(true);

      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return not ready status', async () => {
      mockHealthCheckService.isReady.mockResolvedValue(false);

      const response = await request(app)
        .get('/health/ready')
        .expect(503);

      expect(response.body.status).toBe('not_ready');
    });
  });

  describe('GET /metrics', () => {
    it('should return system metrics', async () => {
      const systemMetrics = {
        timestamp: new Date(),
        memory: {
          heapUsed: 100,
          heapTotal: 200,
          external: 50,
          rss: 250,
          usagePercent: 50,
        },
        cpu: {
          userTime: 1000,
          systemTime: 500,
        },
        requests: {
          total: 100,
          successful: 95,
          failed: 5,
          averageResponseTime: 150,
        },
        errors: {
          total: 5,
          byType: { VALIDATION_ERROR: 3, EXTERNAL_API_ERROR: 2 },
          recentErrors: [],
        },
        circuitBreakers: {},
      };

      mockMonitoringService.getSystemMetrics.mockReturnValue(systemMetrics);

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toEqual(systemMetrics);
    });
  });

  describe('GET /metrics/performance', () => {
    it('should return performance statistics', async () => {
      const perfStats = {
        averageResponseTime: 150,
        p95ResponseTime: 300,
        p99ResponseTime: 500,
        requestsPerMinute: 60,
        errorRate: 5.0,
      };

      mockMonitoringService.getPerformanceStats.mockReturnValue(perfStats);

      const response = await request(app)
        .get('/metrics/performance')
        .expect(200);

      expect(response.body).toEqual(perfStats);
      expect(mockMonitoringService.getPerformanceStats).toHaveBeenCalledWith(undefined);
    });

    it('should handle time range parameter', async () => {
      const perfStats = {
        averageResponseTime: 150,
        p95ResponseTime: 300,
        p99ResponseTime: 500,
        requestsPerMinute: 60,
        errorRate: 5.0,
      };

      mockMonitoringService.getPerformanceStats.mockReturnValue(perfStats);

      await request(app)
        .get('/metrics/performance?timeRange=60')
        .expect(200);

      expect(mockMonitoringService.getPerformanceStats).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date),
      });
    });
  });

  describe('GET /metrics/requests', () => {
    it('should return request metrics', async () => {
      const requestMetrics = [
        {
          timestamp: new Date(),
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          responseTime: 150,
          requestId: 'req-1',
        },
      ];

      mockMonitoringService.getRequestMetrics.mockReturnValue(requestMetrics);

      const response = await request(app)
        .get('/metrics/requests')
        .expect(200);

      expect(response.body).toEqual(requestMetrics);
      expect(mockMonitoringService.getRequestMetrics).toHaveBeenCalledWith(undefined);
    });

    it('should handle limit parameter', async () => {
      mockMonitoringService.getRequestMetrics.mockReturnValue([]);

      await request(app)
        .get('/metrics/requests?limit=50')
        .expect(200);

      expect(mockMonitoringService.getRequestMetrics).toHaveBeenCalledWith(undefined);
    });

    it('should handle time range parameter', async () => {
      mockMonitoringService.getRequestMetrics.mockReturnValue([]);

      await request(app)
        .get('/metrics/requests?timeRange=30')
        .expect(200);

      expect(mockMonitoringService.getRequestMetrics).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date),
      });
    });
  });

  describe('GET /metrics/errors', () => {
    it('should return error metrics', async () => {
      const errorMetrics = [
        {
          timestamp: new Date(),
          type: 'VALIDATION_ERROR',
          message: 'Invalid input',
          requestId: 'req-1',
        },
      ];

      mockMonitoringService.getErrorMetrics.mockReturnValue(errorMetrics);

      const response = await request(app)
        .get('/metrics/errors')
        .expect(200);

      expect(response.body).toEqual(errorMetrics);
      expect(mockMonitoringService.getErrorMetrics).toHaveBeenCalledWith(undefined);
    });

    it('should handle limit parameter', async () => {
      mockMonitoringService.getErrorMetrics.mockReturnValue([]);

      await request(app)
        .get('/metrics/errors?limit=25')
        .expect(200);

      expect(mockMonitoringService.getErrorMetrics).toHaveBeenCalledWith(undefined);
    });

    it('should handle time range parameter', async () => {
      mockMonitoringService.getErrorMetrics.mockReturnValue([]);

      await request(app)
        .get('/metrics/errors?timeRange=15')
        .expect(200);

      expect(mockMonitoringService.getErrorMetrics).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date),
      });
    });
  });
});