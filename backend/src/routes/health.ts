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

export default router;