import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from '@/config/environment';
import { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware 
} from '@/middleware/errorHandler';
import { apiRateLimiter } from '@/middleware/rateLimiter';

// Create Express application
const app = express();

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: config.env === 'production' 
    ? ['https://your-frontend-domain.com'] // Replace with actual frontend domain
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request ID middleware
app.use(requestIdMiddleware);

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined', {
    skip: (_req, res) => res.statusCode < 400, // Only log errors in production
  }));
}

// Rate limiting
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: process.env['npm_package_version'] || '1.0.0',
  });
});

// API routes
import authRoutes from '@/routes/auth';
import processRoutes from '@/routes/processes';

app.use('/api/auth', authRoutes);
app.use('/api/processes', processRoutes);
// app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;