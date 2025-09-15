import { Request, Response, NextFunction } from 'express';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { prisma } from '@/config/database';

// Create activity log repository instance
const activityLogRepository = new ActivityLogRepository(prisma);

/**
 * Request logging middleware for audit trails
 */
export const requestLogger = (options: {
  logAllRequests?: boolean;
  loggedActions?: string[];
  excludePaths?: string[];
} = {}) => {
  const {
    logAllRequests = false,
    loggedActions = ['POST', 'PUT', 'DELETE'],
    excludePaths = ['/health', '/api/auth/verify']
  } = options;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip logging for excluded paths
      if (excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Skip if user is not authenticated and we're not logging all requests
      if (!req.user && !logAllRequests) {
        return next();
      }

      // Check if we should log this request
      const shouldLog = logAllRequests || loggedActions.includes(req.method);
      
      if (shouldLog) {
        // Extract process ID from URL if present
        const processIdMatch = req.path.match(/\/processes\/([a-f0-9-]+)/);
        const processId = processIdMatch ? processIdMatch[1] : undefined;

        // Determine action based on method and path
        const action = determineAction(req.method, req.path);
        
        // Prepare log details
        const details = {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          requestId: req.requestId,
          body: sanitizeBody(req.body),
          query: req.query,
        };

        // Log the activity
        if (req.user) {
          const logData: any = {
            userId: req.user.id,
            action,
            details: JSON.stringify(details),
          };
          
          if (processId) {
            logData.processId = processId;
          }
          
          await activityLogRepository.create(logData);
        }
      }

      next();
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Request logging failed:', error);
      next();
    }
  };
};

/**
 * Determine action name based on HTTP method and path
 */
function determineAction(method: string, path: string): string {
  // Authentication actions
  if (path.includes('/auth/login')) return 'LOGIN_ATTEMPT';
  if (path.includes('/auth/register')) return 'REGISTER_ATTEMPT';
  if (path.includes('/auth/logout')) return 'LOGOUT';

  // Process actions
  if (path.includes('/processes')) {
    if (method === 'POST' && !path.includes('/')) return 'PROCESS_CREATED';
    if (method === 'PUT' && path.includes('/step')) return 'PROCESS_STEP_UPDATED';
    if (method === 'DELETE') return 'PROCESS_DELETED';
    if (method === 'POST' && path.includes('/upload')) return 'MANUSCRIPT_UPLOADED';
    if (method === 'PUT' && path.includes('/metadata')) return 'METADATA_UPDATED';
    if (method === 'POST' && path.includes('/search')) return 'DATABASE_SEARCH_INITIATED';
    if (method === 'POST' && path.includes('/validate')) return 'AUTHOR_VALIDATION_RUN';
    if (method === 'POST' && path.includes('/shortlist')) return 'SHORTLIST_CREATED';
    if (method === 'GET' && path.includes('/export')) return 'SHORTLIST_EXPORTED';
  }

  // Admin actions
  if (path.includes('/admin')) {
    if (method === 'GET' && path.includes('/processes')) return 'ADMIN_PROCESSES_VIEWED';
    if (method === 'GET' && path.includes('/logs')) return 'ADMIN_LOGS_VIEWED';
  }

  // Generic actions
  return `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'passwordHash', 'token', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Activity logging middleware for specific actions
 */
export const logActivity = (action: string, getDetails?: (req: Request) => any) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        // Extract process ID from URL if present
        const processIdMatch = req.path.match(/\/processes\/([a-f0-9-]+)/);
        const processId = processIdMatch ? processIdMatch[1] : undefined;

        // Get custom details if provided
        const customDetails = getDetails ? getDetails(req) : {};
        
        const details = {
          method: req.method,
          path: req.path,
          requestId: req.requestId,
          ...customDetails,
        };

        const logData: any = {
          userId: req.user.id,
          action,
          details: JSON.stringify(details),
        };
        
        if (processId) {
          logData.processId = processId;
        }
        
        await activityLogRepository.create(logData);
      }

      next();
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Activity logging failed:', error);
      next();
    }
  };
};