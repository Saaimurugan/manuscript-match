import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MonitoringService } from '@/services/MonitoringService';
import { config } from '@/config/environment';

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  EXPORT_ERROR = 'EXPORT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CIRCUIT_BREAKER_ERROR = 'CIRCUIT_BREAKER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface ApiError extends Error {
  type: ErrorType;
  statusCode: number;
  details?: any;
  requestId?: string;
}

export class CustomError extends Error implements ApiError {
  public type: ErrorType;
  public statusCode: number;
  public details?: any;
  public requestId?: string;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Error handling middleware
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId || uuidv4();
  const monitoring = MonitoringService.getInstance();
  
  // Default error response
  let statusCode = 500;
  let type = ErrorType.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle custom API errors
  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    type = error.type;
    message = error.message;
    details = error.details;
  }
  // Handle rate limit errors specifically
  else if (error.name === 'TooManyRequestsError' || type === ErrorType.RATE_LIMIT_ERROR) {
    statusCode = 429;
    type = ErrorType.RATE_LIMIT_ERROR;
    message = 'Rate limit exceeded';
  }
  // Handle Prisma errors
  else if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    type = ErrorType.DATABASE_CONNECTION_ERROR;
    message = 'Database operation failed';
    details = { code: (error as any).code };
  }
  // Handle validation errors (Joi and custom ValidationException)
  else if (error.name === 'ValidationError' || error.name === 'ValidationException') {
    statusCode = 400;
    type = ErrorType.VALIDATION_ERROR;
    message = 'Validation failed';
    details = (error as any).details || (error as any).errors;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    type = ErrorType.AUTHENTICATION_ERROR;
    message = 'Authentication failed';
  }
  // Handle timeout errors
  else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    statusCode = 504;
    type = ErrorType.TIMEOUT_ERROR;
    message = 'Request timeout';
  }
  // Handle circuit breaker errors
  else if (error.message.includes('Circuit breaker') && error.message.includes('OPEN')) {
    statusCode = 503;
    type = ErrorType.CIRCUIT_BREAKER_ERROR;
    message = 'Service temporarily unavailable';
  }
  // Handle other known errors
  else if (error.message) {
    message = error.message;
  }

  // Record error in monitoring system
  monitoring.recordError({
    timestamp: new Date(),
    type,
    message,
    requestId,
    url: req.url,
    statusCode,
  });

  // Log error with appropriate level based on environment
  const logData = {
    error: config.env === 'development' ? error.stack : error.message,
    details: config.env === 'development' ? details : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  };

  if (config.env === 'production') {
    // In production, log to structured logging service
    console.error(JSON.stringify({
      level: 'error',
      requestId,
      type,
      message,
      ...logData,
    }));
  } else {
    // In development, use readable format
    console.error(`[${requestId}] ${type}: ${message}`, logData);
  }

  // Send error response (sanitize details in production)
  const responseDetails = config.env === 'production' 
    ? sanitizeErrorDetails(details, type)
    : details;

  res.status(statusCode).json({
    success: false,
    error: {
      type,
      message,
      details: responseDetails,
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.requestId || uuidv4();
  
  res.status(404).json({
    error: {
      type: ErrorType.NOT_FOUND_ERROR,
      message: `Route ${req.method} ${req.path} not found`,
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

// Sanitize error details for production
const sanitizeErrorDetails = (details: any, errorType: ErrorType): any => {
  if (!details) return undefined;

  // For validation errors, keep the validation details
  if (errorType === ErrorType.VALIDATION_ERROR) {
    return details;
  }

  // For database errors, remove sensitive information
  if (errorType === ErrorType.DATABASE_ERROR || errorType === ErrorType.DATABASE_CONNECTION_ERROR) {
    return {
      code: details.code,
      // Remove any potential sensitive data
    };
  }

  // For external API errors, keep basic info
  if (errorType === ErrorType.EXTERNAL_API_ERROR) {
    return {
      service: details.service,
      statusCode: details.statusCode,
    };
  }

  // For other errors, return minimal details
  return undefined;
};

// Global error event handler for uncaught exceptions
export const setupGlobalErrorHandlers = (): void => {
  const monitoring = MonitoringService.getInstance();

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    monitoring.recordError({
      timestamp: new Date(),
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: `Uncaught Exception: ${error.message}`,
      requestId: 'system',
    });
    
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    monitoring.recordError({
      timestamp: new Date(),
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: `Unhandled Rejection: ${reason?.message || reason}`,
      requestId: 'system',
    });
  });

  // Graceful shutdown handler
  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    // Close monitoring service
    monitoring.destroy();
    
    // Exit after cleanup
    setTimeout(() => {
      console.log('Graceful shutdown completed');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};