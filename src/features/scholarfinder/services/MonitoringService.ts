import { ProcessStep } from '../types/process';

export interface ErrorEvent {
  type: 'api_error' | 'validation_error' | 'network_error' | 'component_error';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  processId?: string;
  step?: ProcessStep;
}

export interface PerformanceEvent {
  type: 'api_response' | 'component_render' | 'step_transition' | 'file_upload';
  duration: number;
  endpoint?: string;
  component?: string;
  step?: ProcessStep;
  timestamp: Date;
  userId?: string;
  processId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsEvent {
  type: 'step_start' | 'step_complete' | 'step_abandon' | 'workflow_complete' | 'feature_usage';
  step?: ProcessStep;
  feature?: string;
  timestamp: Date;
  userId?: string;
  processId?: string;
  metadata?: Record<string, any>;
}

export interface ABTestEvent {
  testId: string;
  variant: string;
  event: 'impression' | 'conversion' | 'interaction';
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private isProduction = import.meta.env.MODE === 'production';
  private apiEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT || '/api/monitoring';
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private eventQueue: Array<ErrorEvent | PerformanceEvent | AnalyticsEvent | ABTestEvent> = [];
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startBatchFlush();
    this.setupGlobalErrorHandling();
  }

  // Error tracking
  trackError(error: Omit<ErrorEvent, 'timestamp'>): void {
    const errorEvent: ErrorEvent = {
      ...error,
      timestamp: new Date(),
    };

    this.addToQueue(errorEvent);

    // Log to console in development
    if (!this.isProduction) {
      console.error('Monitoring Error:', errorEvent);
    }
  }

  // Performance monitoring
  trackPerformance(performance: Omit<PerformanceEvent, 'timestamp'>): void {
    const performanceEvent: PerformanceEvent = {
      ...performance,
      timestamp: new Date(),
    };

    this.addToQueue(performanceEvent);

    // Log to console in development
    if (!this.isProduction) {
      console.log('Performance Event:', performanceEvent);
    }
  }

  // Analytics tracking
  trackAnalytics(analytics: Omit<AnalyticsEvent, 'timestamp'>): void {
    const analyticsEvent: AnalyticsEvent = {
      ...analytics,
      timestamp: new Date(),
    };

    this.addToQueue(analyticsEvent);

    // Log to console in development
    if (!this.isProduction) {
      console.log('Analytics Event:', analyticsEvent);
    }
  }

  // A/B testing
  trackABTest(abTest: Omit<ABTestEvent, 'timestamp'>): void {
    const abTestEvent: ABTestEvent = {
      ...abTest,
      timestamp: new Date(),
    };

    this.addToQueue(abTestEvent);

    // Log to console in development
    if (!this.isProduction) {
      console.log('A/B Test Event:', abTestEvent);
    }
  }

  // Performance measurement utilities
  measureApiCall<T>(
    endpoint: string,
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.trackPerformance({
          type: 'api_response',
          duration,
          endpoint,
          metadata: { ...context, success: true },
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.trackPerformance({
          type: 'api_response',
          duration,
          endpoint,
          metadata: { ...context, success: false, error: error.message },
        });
        
        this.trackError({
          type: 'api_error',
          message: error.message,
          stack: error.stack,
          context: { endpoint, ...context },
        });
        
        throw error;
      });
  }

  measureComponentRender(componentName: string, renderFn: () => void): void {
    const startTime = performance.now();
    renderFn();
    const duration = performance.now() - startTime;
    
    this.trackPerformance({
      type: 'component_render',
      duration,
      component: componentName,
    });
  }

  // Workflow analytics
  trackStepStart(step: ProcessStep, processId?: string, userId?: string): void {
    this.trackAnalytics({
      type: 'step_start',
      step,
      processId,
      userId,
    });
  }

  trackStepComplete(step: ProcessStep, processId?: string, userId?: string, metadata?: Record<string, any>): void {
    this.trackAnalytics({
      type: 'step_complete',
      step,
      processId,
      userId,
      metadata,
    });
  }

  trackStepAbandon(step: ProcessStep, processId?: string, userId?: string, reason?: string): void {
    this.trackAnalytics({
      type: 'step_abandon',
      step,
      processId,
      userId,
      metadata: { reason },
    });
  }

  trackWorkflowComplete(processId?: string, userId?: string, metadata?: Record<string, any>): void {
    this.trackAnalytics({
      type: 'workflow_complete',
      processId,
      userId,
      metadata,
    });
  }

  trackFeatureUsage(feature: string, userId?: string, metadata?: Record<string, any>): void {
    this.trackAnalytics({
      type: 'feature_usage',
      feature,
      userId,
      metadata,
    });
  }

  private addToQueue(event: ErrorEvent | PerformanceEvent | AnalyticsEvent | ABTestEvent): void {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  private async flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (this.isProduction) {
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });
      }
    } catch (error) {
      console.error('Failed to send monitoring events:', error);
      // Re-queue events on failure (with limit to prevent memory issues)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  private setupGlobalErrorHandling(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'component_error',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'component_error',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        context: {
          type: 'unhandledrejection',
        },
      });
    });
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents();
  }
}

export const monitoringService = new MonitoringService();