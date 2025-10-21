import { monitoringService } from '../services/MonitoringService';
import { analyticsService } from '../services/AnalyticsService';
import { ProcessStep } from '../types/process';

// Performance measurement utilities
export const measureAsync = async <T>(
  name: string,
  asyncFn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await asyncFn();
    const duration = performance.now() - startTime;
    
    monitoringService.trackPerformance({
      type: 'api_response',
      duration,
      endpoint: name,
      metadata: { ...context, success: true },
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    monitoringService.trackPerformance({
      type: 'api_response',
      duration,
      endpoint: name,
      metadata: { ...context, success: false, error: (error as Error).message },
    });
    
    throw error;
  }
};

export const measureSync = <T>(
  name: string,
  syncFn: () => T,
  context?: Record<string, any>
): T => {
  const startTime = performance.now();
  
  try {
    const result = syncFn();
    const duration = performance.now() - startTime;
    
    monitoringService.trackPerformance({
      type: 'component_render',
      duration,
      component: name,
      metadata: { ...context, success: true },
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    monitoringService.trackPerformance({
      type: 'component_render',
      duration,
      component: name,
      metadata: { ...context, success: false, error: (error as Error).message },
    });
    
    throw error;
  }
};

// Error handling utilities
export const trackAndThrow = (error: Error, context?: Record<string, any>): never => {
  analyticsService.trackError(error, context);
  throw error;
};

export const safeExecute = <T>(
  fn: () => T,
  fallback: T,
  context?: Record<string, any>
): T => {
  try {
    return fn();
  } catch (error) {
    analyticsService.trackError(error as Error, context);
    return fallback;
  }
};

export const safeExecuteAsync = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: Record<string, any>
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    analyticsService.trackError(error as Error, context);
    return fallback;
  }
};

// Analytics utilities
export const trackUserJourney = (
  journey: string,
  step: string,
  metadata?: Record<string, any>
): void => {
  analyticsService.trackFeatureUsage(`journey_${journey}_${step}`, metadata);
};

export const trackConversion = (
  conversionType: string,
  value?: number,
  metadata?: Record<string, any>
): void => {
  analyticsService.trackFeatureUsage(`conversion_${conversionType}`, {
    ...metadata,
    value,
    timestamp: new Date().toISOString(),
  });
};

export const trackEngagement = (
  engagementType: string,
  duration?: number,
  metadata?: Record<string, any>
): void => {
  analyticsService.trackUserBehavior(`engagement_${engagementType}`, {
    ...metadata,
    duration,
  });
};

// Workflow-specific tracking
export const trackWorkflowProgress = (
  currentStep: ProcessStep,
  totalSteps: number,
  processId?: string
): void => {
  const stepIndex = getStepIndex(currentStep);
  const progressPercentage = ((stepIndex + 1) / totalSteps) * 100;
  
  analyticsService.trackFeatureUsage('workflow_progress', {
    currentStep,
    stepIndex,
    totalSteps,
    progressPercentage,
    processId,
  });
};

export const trackStepTransition = (
  fromStep: ProcessStep,
  toStep: ProcessStep,
  transitionType: 'next' | 'previous' | 'jump',
  processId?: string
): void => {
  analyticsService.trackFeatureUsage('step_transition', {
    fromStep,
    toStep,
    transitionType,
    processId,
  });
};

export const trackWorkflowAbandon = (
  currentStep: ProcessStep,
  reason: string,
  processId?: string,
  metadata?: Record<string, any>
): void => {
  analyticsService.trackStepAbandon(currentStep, processId, reason);
  analyticsService.trackFeatureUsage('workflow_abandon', {
    currentStep,
    reason,
    processId,
    ...metadata,
  });
};

// Performance monitoring utilities
export const trackPageLoad = (): void => {
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load: navigation.loadEventEnd - navigation.loadEventStart,
        total: navigation.loadEventEnd - navigation.navigationStart,
      };
      
      Object.entries(metrics).forEach(([metric, value]) => {
        monitoringService.trackPerformance({
          type: 'component_render',
          duration: value,
          component: `page_load_${metric}`,
        });
      });
    }
  }
};

export const trackResourceTiming = (): void => {
  if (typeof window !== 'undefined' && window.performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resources.forEach((resource) => {
      if (resource.duration > 0) {
        monitoringService.trackPerformance({
          type: 'api_response',
          duration: resource.duration,
          endpoint: resource.name,
          metadata: {
            resourceType: resource.initiatorType,
            transferSize: resource.transferSize,
            encodedBodySize: resource.encodedBodySize,
            decodedBodySize: resource.decodedBodySize,
          },
        });
      }
    });
    
    // Clear the buffer to prevent memory leaks
    performance.clearResourceTimings();
  }
};

// Memory monitoring
export const trackMemoryUsage = (): void => {
  if (typeof window !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    
    monitoringService.trackPerformance({
      type: 'component_render',
      duration: memory.usedJSHeapSize,
      component: 'memory_usage',
      metadata: {
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      },
    });
  }
};

// Network monitoring
export const trackNetworkStatus = (): void => {
  if (typeof window !== 'undefined' && (navigator as any).connection) {
    const connection = (navigator as any).connection;
    
    analyticsService.trackFeatureUsage('network_status', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    });
  }
};

// Utility functions
const getStepIndex = (step: ProcessStep): number => {
  const stepOrder: ProcessStep[] = [
    ProcessStep.UPLOAD,
    ProcessStep.METADATA,
    ProcessStep.KEYWORDS,
    ProcessStep.SEARCH,
    ProcessStep.MANUAL,
    ProcessStep.VALIDATION,
    ProcessStep.RECOMMENDATIONS,
    ProcessStep.SHORTLIST,
    ProcessStep.EXPORT,
  ];
  return stepOrder.indexOf(step);
};

// Batch tracking for high-frequency events
class BatchTracker {
  private events: Array<{ type: string; data: any; timestamp: number }> = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private timer?: NodeJS.Timeout;

  constructor() {
    this.startBatchFlush();
  }

  track(type: string, data: any): void {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
    });

    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  private startBatchFlush(): void {
    this.timer = setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private flush(): void {
    const eventsToFlush = [...this.events];
    this.events = [];

    eventsToFlush.forEach(event => {
      analyticsService.trackFeatureUsage(`batch_${event.type}`, {
        ...event.data,
        batchTimestamp: event.timestamp,
      });
    });
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

export const batchTracker = new BatchTracker();

// High-frequency event tracking
export const trackMouseMovement = (throttleMs: number = 1000): void => {
  let lastTrack = 0;
  
  const handleMouseMove = (event: MouseEvent) => {
    const now = Date.now();
    if (now - lastTrack > throttleMs) {
      batchTracker.track('mouse_movement', {
        x: event.clientX,
        y: event.clientY,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
      lastTrack = now;
    }
  };

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
  };
};

export const trackScrollBehavior = (throttleMs: number = 500): void => {
  let lastTrack = 0;
  
  const handleScroll = () => {
    const now = Date.now();
    if (now - lastTrack > throttleMs) {
      batchTracker.track('scroll_behavior', {
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        scrollPercentage: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100,
      });
      lastTrack = now;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
};