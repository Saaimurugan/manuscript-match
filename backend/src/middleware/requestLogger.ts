import { Request, Response, NextFunction } from 'express';
import { ActivityLogService } from '@/services/ActivityLogService';
import { getClientIP } from './security';

interface RequestLoggerOptions {
  logAllRequests?: boolean;
  logOnlyErrors?: boolean;
  excludePaths?: string[];
  includeBody?: boolean;
  includeHeaders?: boolean;
  maxBodySize?: number;
}

/**
 * Enhanced request logging middleware for security monitoring
 */
export function requestLogger(options: RequestLoggerOptions = {}) {
  const {
    logAllRequests = false,
    logOnlyErrors = false,
    excludePaths = [],
    includeBody = false,
    includeHeaders = false,
    maxBodySize = 1000
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Skip excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Capture original end function
    const originalEnd = res.end;
    let responseBody = '';

    // Override res.end to capture response
    res.end = function(this: any, chunk?: any, encoding?: any, cb?: any) {
      if (chunk) {
        responseBody = chunk.toString();
      }
      return originalEnd.call(this, chunk, encoding, cb);
    } as any;

    // Log request completion
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const shouldLog = logAllRequests || 
                       (logOnlyErrors && res.statusCode >= 400) ||
                       res.statusCode >= 400;

      if (shouldLog) {
        try {
          const { prisma } = await import('@/config/database');
          const activityLogService = new ActivityLogService(prisma);
          
          const logData: any = {
            userId: req.user?.id || null,
            processId: null,
            action: 'HTTP_REQUEST',
            resourceType: 'api',
            resourceId: req.path,
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              responseTime,
              ip,
              userAgent,
              timestamp: new Date().toISOString(),
              query: Object.keys(req.query).length > 0 ? req.query : undefined,
              params: Object.keys(req.params).length > 0 ? req.params : undefined
            },
            ipAddress: ip,
            userAgent
          };

          // Include request body if enabled and not too large
          if (includeBody && req.body) {
            const bodyStr = JSON.stringify(req.body);
            if (bodyStr.length <= maxBodySize) {
              logData.details.requestBody = req.body;
            } else {
              logData.details.requestBodyTruncated = bodyStr.substring(0, maxBodySize) + '...';
            }
          }

          // Include relevant headers if enabled
          if (includeHeaders) {
            const relevantHeaders = {
              'content-type': req.headers['content-type'],
              'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
              'x-forwarded-for': req.headers['x-forwarded-for'],
              'x-real-ip': req.headers['x-real-ip'],
              'referer': req.headers.referer,
              'origin': req.headers.origin
            };
            
            logData.details.headers = Object.fromEntries(
              Object.entries(relevantHeaders).filter(([_, value]) => value !== undefined)
            );
          }

          // Include response body for errors (truncated)
          if (res.statusCode >= 400 && responseBody) {
            const truncatedResponse = responseBody.length > 500 
              ? responseBody.substring(0, 500) + '...'
              : responseBody;
            logData.details.responseBody = truncatedResponse;
          }

          await activityLogService.logActivity(logData);
        } catch (error) {
          console.error('Failed to log request:', error);
        }
      }
    });

    next();
  };
}

/**
 * Activity logging decorator for specific actions
 */
export function logActivity(action: string, options: { 
  includeBody?: boolean;
  includeParams?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store action for later logging
    req.logAction = action;
    req.logOptions = options;
    
    // Log the action completion
    res.on('finish', async () => {
      if (res.statusCode < 400) { // Only log successful actions
        try {
          const { prisma } = await import('@/config/database');
          const activityLogService = new ActivityLogService(prisma);
          const ip = getClientIP(req);
          const userAgent = req.headers['user-agent'] || 'unknown';
          
          const logData: any = {
            userId: req.user?.id || null,
            processId: req.params['processId'] || req.body?.processId || null,
            action,
            resourceType: getResourceTypeFromPath(req.path),
            resourceId: req.params['id'] || req.params['userId'] || req.params['processId'] || null,
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString()
            },
            ipAddress: ip,
            userAgent
          };

          // Include request body if specified
          if (options.includeBody && req.body) {
            logData.details.requestData = req.body;
          }

          // Include params if specified
          if (options.includeParams && Object.keys(req.params).length > 0) {
            logData.details.params = req.params;
          }

          await activityLogService.logActivity(logData);
        } catch (error) {
          console.error('Failed to log activity:', error);
        }
      }
    });

    next();
  };
}

/**
 * Extract resource type from request path
 */
function getResourceTypeFromPath(path: string): string {
  if (path.includes('/users')) return 'user';
  if (path.includes('/processes')) return 'process';
  if (path.includes('/permissions')) return 'permission';
  if (path.includes('/logs')) return 'activity_log';
  if (path.includes('/admin')) return 'admin';
  return 'api';
}

// Extend Request interface to include logging properties
declare global {
  namespace Express {
    interface Request {
      logAction?: string;
      logOptions?: {
        includeBody?: boolean;
        includeParams?: boolean;
      };
    }
  }
}