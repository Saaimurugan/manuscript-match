import { Router } from 'express';
import { HealthCheckService } from '@/services/HealthCheckService';
import { MonitoringService } from '@/services/MonitoringService';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const healthCheckService = new HealthCheckService();
const monitoring = MonitoringService.getInstance();

// Basic health check endpoint
router.get('/health', asyncHandler(async (_req, res) => {
  const health = await healthCheckService.getHealthStatus();
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
}));

// Liveness probe (for Kubernetes)
router.get('/health/live', asyncHandler(async (_req, res) => {
  const isAlive = await healthCheckService.isAlive();
  
  if (isAlive) {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
    });
  }
}));

// Readiness probe (for Kubernetes)
router.get('/health/ready', asyncHandler(async (_req, res) => {
  const isReady = await healthCheckService.isReady();
  
  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
    });
  }
}));

// System metrics endpoint
router.get('/metrics', asyncHandler(async (_req, res) => {
  const metrics = monitoring.getSystemMetrics();
  res.json(metrics);
}));

// Performance statistics endpoint
router.get('/metrics/performance', asyncHandler(async (req, res) => {
  const timeRange = req.query.timeRange as string;
  let range: { start: Date; end: Date } | undefined;
  
  if (timeRange) {
    const now = new Date();
    const minutes = parseInt(timeRange, 10);
    if (!isNaN(minutes)) {
      range = {
        start: new Date(now.getTime() - minutes * 60 * 1000),
        end: now,
      };
    }
  }
  
  const perfStats = monitoring.getPerformanceStats(range);
  res.json(perfStats);
}));

// Request metrics endpoint
router.get('/metrics/requests', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const timeRange = req.query.timeRange as string;
  
  let range: { start: Date; end: Date } | undefined;
  if (timeRange) {
    const now = new Date();
    const minutes = parseInt(timeRange, 10);
    if (!isNaN(minutes)) {
      range = {
        start: new Date(now.getTime() - minutes * 60 * 1000),
        end: now,
      };
    }
  }
  
  const requests = monitoring.getRequestMetrics(range).slice(-limit);
  res.json(requests);
}));

// Error metrics endpoint
router.get('/metrics/errors', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const timeRange = req.query.timeRange as string;
  
  let range: { start: Date; end: Date } | undefined;
  if (timeRange) {
    const now = new Date();
    const minutes = parseInt(timeRange, 10);
    if (!isNaN(minutes)) {
      range = {
        start: new Date(now.getTime() - minutes * 60 * 1000),
        end: now,
      };
    }
  }
  
  const errors = monitoring.getErrorMetrics(range).slice(-limit);
  res.json(errors);
}));

// Admin health endpoints (public for testing)
router.get('/admin/health', asyncHandler(async (_req, res) => {
  const systemHealth = {
    status: 'healthy' as const,
    services: {
      database: 'up' as const,
      externalApis: 'degraded' as const,
      fileStorage: 'up' as const
    },
    uptime: Math.floor(process.uptime()),
    version: '1.0.0'
  };

  res.status(200).json({
    success: true,
    data: systemHealth,
    message: 'System health retrieved successfully'
  });
}));

router.get('/admin/alerts', asyncHandler(async (req, res) => {
  const { severity, limit = 10, resolved } = req.query;

  let mockAlerts = [
    {
      id: '1',
      severity: 'medium' as const,
      message: 'External API response time increased by 15%',
      details: { service: 'PubMed API', responseTime: '2.3s' },
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      resolved: false
    },
    {
      id: '2',
      severity: 'low' as const,
      message: 'Scheduled maintenance completed successfully',
      details: { duration: '45 minutes', affectedServices: ['database'] },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      resolved: true,
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString()
    },
    {
      id: '3',
      severity: 'high' as const,
      message: 'High memory usage detected on server',
      details: { usage: '87%', threshold: '85%' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      resolved: true,
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
    }
  ];

  // Apply filters
  if (severity) {
    mockAlerts = mockAlerts.filter(alert => alert.severity === severity);
  }

  if (resolved !== undefined) {
    const isResolved = resolved === 'true';
    mockAlerts = mockAlerts.filter(alert => alert.resolved === isResolved);
  }

  if (limit) {
    mockAlerts = mockAlerts.slice(0, parseInt(limit as string));
  }

  res.status(200).json({
    success: true,
    data: mockAlerts,
    message: 'System alerts retrieved successfully'
  });
}));

export default router;