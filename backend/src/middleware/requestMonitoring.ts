import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '@/services/MonitoringService';

export interface MonitoredRequest extends Request {
  startTime?: Date;
  requestId?: string;
}

export const requestMonitoringMiddleware = (
  req: MonitoredRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = new Date();
  req.startTime = startTime;
  
  const monitoring = MonitoringService.getInstance();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const endTime = new Date();
    const responseTime = endTime.getTime() - startTime.getTime();
    
    // Record request metrics
    monitoring.recordRequest({
      timestamp: startTime,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      requestId: req.requestId || 'unknown',
      userId: (req as any).user?.id,
    });
    
    // Call original end method and return the response
    return originalEnd(chunk, encoding, cb);
  } as any;
  
  next();
};