import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from '@/config/environment';
import { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware,
  setupGlobalErrorHandlers 
} from '@/middleware/errorHandler';
import { errorCorrelationMiddleware } from '@/middleware/errorRecovery';
import { apiRateLimiter } from '@/middleware/rateLimiter';
import { requestMonitoringMiddleware } from '@/middleware/requestMonitoring';
import { MonitoringService } from '@/services/MonitoringService';
import { 
  performanceMonitoringMiddleware,
  databasePerformanceMiddleware,
  cachePerformanceMiddleware,
  performanceHeadersMiddleware,
  performanceErrorHandler
} from '@/middleware/performanceMonitoring';
import { loadBalancingMiddleware } from '@/middleware/loadBalancing';

// Create Express application
const app = express();

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS debugging middleware (development only)
if (config.env === 'development') {
  app.use((req, res, next) => {
    console.log(`CORS Debug - Origin: ${req.headers.origin}, Method: ${req.method}, Path: ${req.path}`);
    next();
  });
}

// CORS configuration
app.use(cors({
  origin: config.env === 'production' 
    ? ['https://your-frontend-domain.com'] // Replace with actual frontend domain
    : [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8082'
      ], // Allow common development ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request ID middleware
app.use(requestIdMiddleware);

// Error correlation middleware
app.use(errorCorrelationMiddleware);

// Load balancing middleware (should be early in the chain)
app.use(loadBalancingMiddleware);

// Request monitoring middleware
app.use(requestMonitoringMiddleware);

// Performance monitoring middleware
app.use(performanceMonitoringMiddleware);
app.use(databasePerformanceMiddleware());
app.use(cachePerformanceMiddleware);
app.use(performanceHeadersMiddleware);

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined', {
    skip: (_req, res) => res.statusCode < 400, // Only log errors in production
  }));
}

// Rate limiting
app.use('/api', apiRateLimiter);

// Initialize monitoring service
const monitoring = MonitoringService.getInstance();

// Set up monitoring alerts
monitoring.setAlertThresholds({
  errorRate: 10, // 10% error rate
  responseTime: 5000, // 5 seconds
  memoryUsage: 85, // 85% memory usage
  consecutiveErrors: 5, // 5 consecutive errors
});

// Set up global error handlers for uncaught exceptions
setupGlobalErrorHandlers();

// Swagger documentation setup
import { setupSwagger } from '@/config/swagger';
if (config.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// API routes
import authRoutes from '@/routes/auth';
import processRoutes from '@/routes/processes';
import adminRoutes from '@/routes/admin';
import healthRoutes from '@/routes/health';
import performanceRoutes from '@/routes/performance';

app.use('/api/auth', authRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/', healthRoutes);

// 404 handler
app.use(notFoundHandler);

// Performance error handler (before main error handler)
app.use(performanceErrorHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
export { app };