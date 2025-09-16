import { Router } from 'express';
import { performanceMonitoringService } from '../services/PerformanceMonitoringService';
import { cacheService } from '../services/CacheService';
import { queryOptimizationService } from '../services/QueryOptimizationService';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/performance/metrics
 * Get performance metrics (admin only)
 */
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    // Check if user is admin (you may need to adjust this based on your auth system)
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const format = req.query['format'] as string || 'json';
    const metrics = await performanceMonitoringService.exportMetrics(format as 'json' | 'prometheus');

    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain');
      return res.send(metrics);
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/performance/system
 * Get system performance metrics
 */
router.get('/system', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const systemMetrics = await performanceMonitoringService.getSystemMetrics();
    
    res.json({
      success: true,
      data: systemMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system metrics'
    });
  }
});

/**
 * GET /api/performance/endpoints
 * Get endpoint performance statistics
 */
router.get('/endpoints', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const path = req.query['path'] as string;
    const timeRange = parseInt(req.query['timeRange'] as string) || 1;
    
    const endpointStats = performanceMonitoringService.getEndpointStats(path, timeRange);
    
    res.json({
      success: true,
      data: endpointStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get endpoint stats'
    });
  }
});

/**
 * GET /api/performance/alerts
 * Get performance alerts
 */
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const alerts = performanceMonitoringService.getPerformanceAlerts();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get alerts'
    });
  }
});

/**
 * GET /api/performance/cache
 * Get cache performance statistics
 */
router.get('/cache', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const cacheStats = await cacheService.getStats();
    const cacheHealth = await cacheService.health();
    
    res.json({
      success: true,
      data: {
        ...cacheStats,
        healthy: cacheHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cache stats'
    });
  }
});

/**
 * GET /api/performance/database
 * Get database performance statistics
 */
router.get('/database', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const dbStats = await queryOptimizationService.getQueryStats();
    
    res.json({
      success: true,
      data: dbStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get database stats'
    });
  }
});

/**
 * POST /api/performance/cache/clear
 * Clear cache (admin only)
 */
router.post('/cache/clear', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const pattern = req.body.pattern || '*';
    const clearedCount = await cacheService.invalidatePattern(pattern);
    
    res.json({
      success: true,
      data: {
        message: `Cleared ${clearedCount} cache entries`,
        pattern,
        clearedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache'
    });
  }
});

/**
 * GET /api/performance/custom-metrics
 * Get custom metrics statistics
 */
router.get('/custom-metrics', requireAdmin, async (req, res) => {
  try {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const metricName = req.query['metric'] as string;
    const timeRange = parseInt(req.query['timeRange'] as string) || 1;
    
    const customMetrics = performanceMonitoringService.getCustomMetricsStats(metricName, timeRange);
    
    res.json({
      success: true,
      data: customMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get custom metrics'
    });
  }
});

export default router;