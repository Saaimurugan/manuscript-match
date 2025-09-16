import { HealthCheckService } from '@/services/HealthCheckService';

// Mock Prisma client
const mockPrismaClient = {
  $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

// Mock database clients
jest.mock('@/services/database/PubMedClient', () => ({
  PubMedClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/services/database/ElsevierClient', () => ({
  ElsevierClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/services/database/WileyClient', () => ({
  WileyClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/services/database/TaylorFrancisClient', () => ({
  TaylorFrancisClient: jest.fn().mockImplementation(() => ({})),
}));

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    healthCheckService = new HealthCheckService();
    jest.clearAllMocks();
    // Reset mock to default successful state
    mockPrismaClient.$queryRaw.mockResolvedValue([{ '1': 1 }]);
  });

  describe('getHealthStatus', () => {
    it('should return health status structure', async () => {
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.version).toBeDefined();
      expect(health.environment).toBeDefined();
      expect(health.checks).toHaveProperty('database');
      expect(health.checks).toHaveProperty('externalApis');
      expect(health.checks).toHaveProperty('memory');
    });

    it('should return database health check results', async () => {
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.checks.database.status).toMatch(/healthy|unhealthy/);
      if (health.checks.database.responseTime) {
        expect(health.checks.database.responseTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return memory health check results', async () => {
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.checks.memory.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.checks.memory.details).toHaveProperty('heapUsed');
      expect(health.checks.memory.details).toHaveProperty('heapTotal');
      expect(health.checks.memory.details).toHaveProperty('usagePercent');
    });

    it('should return external API health check results', async () => {
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.checks.externalApis).toHaveProperty('pubmed');
      expect(health.checks.externalApis).toHaveProperty('wiley');
      expect(health.checks.externalApis).toHaveProperty('taylor_francis');
    });
  });

  describe('isAlive', () => {
    it('should return true for liveness check', async () => {
      const isAlive = await healthCheckService.isAlive();
      expect(isAlive).toBe(true);
    });
  });

  describe('isReady', () => {
    it('should return boolean for readiness check', async () => {
      const isReady = await healthCheckService.isReady();
      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('database health check', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      mockPrismaClient.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));
      
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.checks.database.status).toBe('unhealthy');
      expect(health.checks.database.error).toBe('Connection failed');
    });
  });

  describe('memory health check', () => {
    it('should detect high memory usage', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 950 * 1024 * 1024, // 950MB
        heapTotal: 1000 * 1024 * 1024, // 1000MB (95% usage)
        external: 50 * 1024 * 1024,
        rss: 1100 * 1024 * 1024,
      });
      
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.checks.memory.status).toBe('unhealthy');
      expect(health.checks.memory.details.usagePercent).toBe(95);
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect degraded memory usage', async () => {
      // Mock degraded memory usage
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 1000 * 1024 * 1024, // 1000MB (80% usage)
        external: 50 * 1024 * 1024,
        rss: 900 * 1024 * 1024,
      });
      
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.checks.memory.status).toBe('degraded');
      expect(health.checks.memory.details.usagePercent).toBe(80);
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('overall status determination', () => {
    it('should return unhealthy when core services are unhealthy', async () => {
      // Mock database error
      mockPrismaClient.$queryRaw.mockRejectedValueOnce(new Error('Database down'));
      
      const health = await healthCheckService.getHealthStatus();
      
      expect(health.status).toBe('unhealthy');
    });

    it('should return valid status', async () => {
      const health = await healthCheckService.getHealthStatus();
      
      // Should be one of the valid statuses
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});