import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';
import { ErrorType, CustomError } from './errorHandler';
import { ActivityLogService } from '@/services/ActivityLogService';

// IP-based access restrictions for sensitive operations
const ALLOWED_ADMIN_IPS = process.env.ALLOWED_ADMIN_IPS?.split(',') || [];
const BLOCKED_IPS = new Set<string>();

// Security event types
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED = 'IP_BLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  ADMIN_ACTION_BLOCKED = 'ADMIN_ACTION_BLOCKED',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS'
}

// Track failed attempts per IP
const failedAttempts = new Map<string, { count: number; lastAttempt: Date; blocked: boolean }>();

// Clean up old failed attempts every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [ip, data] of failedAttempts.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      failedAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return remoteAddress || 'unknown';
}

/**
 * Log security events
 */
async function logSecurityEvent(
  eventType: SecurityEventType,
  req: Request,
  details: any = {}
): Promise<void> {
  try {
    const { prisma } = await import('@/config/database');
    const activityLogService = new ActivityLogService(prisma);
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await activityLogService.logActivity({
      userId: req.user?.id || null,
      processId: null,
      action: eventType,
      resourceType: 'security',
      resourceId: null,
      details: {
        ip,
        userAgent,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        ...details
      },
      ipAddress: ip,
      userAgent
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Track and handle failed attempts
 */
function handleFailedAttempt(ip: string): boolean {
  const now = new Date();
  const attempt = failedAttempts.get(ip) || { count: 0, lastAttempt: now, blocked: false };
  
  // Reset count if last attempt was more than 1 hour ago
  if (now.getTime() - attempt.lastAttempt.getTime() > 60 * 60 * 1000) {
    attempt.count = 0;
  }
  
  attempt.count++;
  attempt.lastAttempt = now;
  
  // Block IP after 10 failed attempts in 1 hour
  if (attempt.count >= 10) {
    attempt.blocked = true;
    BLOCKED_IPS.add(ip);
    
    // Auto-unblock after 24 hours
    setTimeout(() => {
      BLOCKED_IPS.delete(ip);
      failedAttempts.delete(ip);
    }, 24 * 60 * 60 * 1000);
  }
  
  failedAttempts.set(ip, attempt);
  return attempt.blocked;
}

/**
 * IP-based access control middleware
 */
export function ipAccessControl(options: { 
  allowedIPs?: string[];
  blockSuspiciousIPs?: boolean;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    
    // Check if IP is blocked
    if (BLOCKED_IPS.has(ip)) {
      await logSecurityEvent(SecurityEventType.IP_BLOCKED, req, { blockedIP: ip });
      return next(new CustomError(
        ErrorType.FORBIDDEN,
        'Access denied from this IP address',
        403
      ));
    }
    
    // Check allowed IPs for sensitive operations
    if (options.allowedIPs && options.allowedIPs.length > 0) {
      if (!options.allowedIPs.includes(ip)) {
        await logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT, req, { 
          deniedIP: ip,
          allowedIPs: options.allowedIPs.length 
        });
        
        if (options.blockSuspiciousIPs) {
          const blocked = handleFailedAttempt(ip);
          if (blocked) {
            await logSecurityEvent(SecurityEventType.IP_BLOCKED, req, { 
              newlyBlockedIP: ip,
              reason: 'Multiple unauthorized access attempts'
            });
          }
        }
        
        return next(new CustomError(
          ErrorType.FORBIDDEN,
          'Access denied from this IP address',
          403
        ));
      }
    }
    
    next();
  };
}

/**
 * Enhanced rate limiter for admin endpoints
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window for admin operations
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message: 'Too many admin requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test',
  handler: async (req, _res, next) => {
    const ip = getClientIP(req);
    await logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, req, { 
      endpoint: 'admin',
      limit: 100,
      window: '15 minutes'
    });
    
    const error = new CustomError(
      ErrorType.RATE_LIMIT_ERROR,
      'Admin rate limit exceeded',
      429
    );
    next(error);
  },
});

/**
 * Stricter rate limiter for sensitive admin operations
 */
export const sensitiveAdminRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 sensitive operations per hour
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message: 'Too many sensitive admin operations from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test',
  keyGenerator: (req) => {
    // Use both IP and user ID for more granular control
    const ip = getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  },
  handler: async (req, _res, next) => {
    await logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, req, { 
      endpoint: 'sensitive_admin',
      limit: 20,
      window: '1 hour'
    });
    
    const error = new CustomError(
      ErrorType.RATE_LIMIT_ERROR,
      'Sensitive operation rate limit exceeded',
      429
    );
    next(error);
  },
});

/**
 * Request monitoring middleware for security events
 */
export function securityMonitoring() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Monitor for suspicious patterns
    const suspiciousPatterns = [
      /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection attempts
      /<script|javascript:|vbscript:|onload=|onerror=/i, // XSS attempts
      /\.\.\//g, // Path traversal attempts
      /\b(admin|root|administrator)\b.*\b(password|passwd|pwd)\b/i, // Credential stuffing
    ];
    
    const requestData = JSON.stringify({
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers
    });
    
    // Check for suspicious patterns
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));
    
    if (isSuspicious) {
      await logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
        suspiciousContent: requestData.substring(0, 1000), // Limit logged content
        patterns: suspiciousPatterns.map(p => p.toString()).filter(p => new RegExp(p.slice(1, -2), p.slice(-2)).test(requestData))
      });
      
      // Block IP after multiple suspicious requests
      const blocked = handleFailedAttempt(ip);
      if (blocked) {
        await logSecurityEvent(SecurityEventType.IP_BLOCKED, req, { 
          newlyBlockedIP: ip,
          reason: 'Multiple suspicious requests'
        });
        
        return next(new CustomError(
          ErrorType.FORBIDDEN,
          'Suspicious activity detected',
          403
        ));
      }
    }
    
    // Log response time and status for monitoring
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      
      // Log slow requests (>5 seconds) as potential DoS attempts
      if (responseTime > 5000) {
        await logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
          slowRequest: true,
          responseTime,
          statusCode: res.statusCode
        });
      }
      
      // Log failed authentication attempts
      if (res.statusCode === 401 || res.statusCode === 403) {
        const blocked = handleFailedAttempt(ip);
        if (blocked) {
          await logSecurityEvent(SecurityEventType.IP_BLOCKED, req, { 
            newlyBlockedIP: ip,
            reason: 'Multiple failed authentication attempts'
          });
        }
      }
    });
    
    next();
  };
}

/**
 * Admin-specific security middleware
 */
export function adminSecurityMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    
    // Enhanced logging for admin actions
    await logSecurityEvent(SecurityEventType.ADMIN_ACTION_BLOCKED, req, {
      adminUserId: req.user?.id,
      adminEmail: req.user?.email,
      targetResource: req.params.id || req.body?.id,
      action: req.method,
      endpoint: req.path
    });
    
    // Additional validation for sensitive admin operations
    const sensitiveOperations = [
      '/api/admin/users/invite',
      '/api/admin/users/:id/promote',
      '/api/admin/users/:id/delete',
      '/api/admin/users/:id/block',
      '/api/admin/processes/:id/delete'
    ];
    
    const isSensitiveOperation = sensitiveOperations.some(pattern => {
      const regex = new RegExp(pattern.replace(':id', '[^/]+'));
      return regex.test(req.path);
    });
    
    if (isSensitiveOperation) {
      // Apply stricter IP restrictions for sensitive operations
      if (ALLOWED_ADMIN_IPS.length > 0 && !ALLOWED_ADMIN_IPS.includes(ip)) {
        await logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT, req, {
          sensitiveOperation: true,
          deniedIP: ip
        });
        
        return next(new CustomError(
          ErrorType.FORBIDDEN,
          'Sensitive admin operations are restricted to authorized IP addresses',
          403
        ));
      }
    }
    
    next();
  };
}

/**
 * Export utility functions for testing and monitoring
 */
export const securityUtils = {
  getClientIP,
  logSecurityEvent,
  handleFailedAttempt,
  getFailedAttempts: () => failedAttempts,
  getBlockedIPs: () => BLOCKED_IPS,
  clearFailedAttempts: () => failedAttempts.clear(),
  clearBlockedIPs: () => BLOCKED_IPS.clear()
};