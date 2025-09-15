import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
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
  // Handle other known errors
  else if (error.message) {
    message = error.message;
  }

  // Log error (in production, use proper logging service)
  console.error(`[${requestId}] ${type}: ${message}`, {
    error: error.stack,
    details,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      type,
      message,
      details,
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

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};