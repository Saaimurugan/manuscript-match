import { useCallback, useEffect, useRef } from 'react';
import { monitoringService, ErrorEvent, PerformanceEvent } from '../services/MonitoringService';
import { analyticsService } from '../services/AnalyticsService';
import { ProcessStep } from '../types/process';
import { useScholarFinderContext } from './useScholarFinderContext';

export interface UseMonitoringOptions {
  trackErrors?: boolean;
  trackPerformance?: boolean;
  trackAnalytics?: boolean;
  componentName?: string;
}

export const useMonitoring = (options: UseMonitoringOptions = {}) => {
  const {
    trackErrors = true,
    trackPerformance = true,
    trackAnalytics = true,
    componentName,
  } = options;

  const { currentProcess } = useScholarFinderContext();
  const renderStartTime = useRef<number>();

  // Track component mount and unmount
  useEffect(() => {
    if (trackAnalytics && componentName) {
      analyticsService.trackFeatureUsage('component_mount', {
        component: componentName,
      });

      return () => {
        analyticsService.trackFeatureUsage('component_unmount', {
          component: componentName,
        });
      };
    }
  }, [trackAnalytics, componentName]);

  // Performance tracking for component renders
  useEffect(() => {
    if (trackPerformance && componentName) {
      if (renderStartTime.current) {
        const renderDuration = performance.now() - renderStartTime.current;
        monitoringService.trackPerformance({
          type: 'component_render',
          duration: renderDuration,
          component: componentName,
          processId: currentProcess?.id,
        });
      }
      renderStartTime.current = performance.now();
    }
  });

  // Error tracking
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    if (trackErrors) {
      analyticsService.trackError(error, {
        ...context,
        component: componentName,
        processId: currentProcess?.id,
      });
    }
  }, [trackErrors, componentName, currentProcess?.id]);

  // Performance tracking
  const trackPerformanceEvent = useCallback((event: Omit<PerformanceEvent, 'timestamp'>) => {
    if (trackPerformance) {
      monitoringService.trackPerformance({
        ...event,
        processId: currentProcess?.id,
      });
    }
  }, [trackPerformance, currentProcess?.id]);

  // Analytics tracking
  const trackFeature = useCallback((feature: string, metadata?: Record<string, any>) => {
    if (trackAnalytics) {
      analyticsService.trackFeatureUsage(feature, {
        ...metadata,
        component: componentName,
      });
    }
  }, [trackAnalytics, componentName]);

  // Step tracking
  const trackStepStart = useCallback((step: ProcessStep) => {
    if (trackAnalytics) {
      analyticsService.trackStepStart(step, currentProcess?.id);
    }
  }, [trackAnalytics, currentProcess?.id]);

  const trackStepComplete = useCallback((step: ProcessStep, duration?: number, metadata?: Record<string, any>) => {
    if (trackAnalytics) {
      analyticsService.trackStepComplete(step, currentProcess?.id, duration, metadata);
    }
  }, [trackAnalytics, currentProcess?.id]);

  const trackStepAbandon = useCallback((step: ProcessStep, reason?: string) => {
    if (trackAnalytics) {
      analyticsService.trackStepAbandon(step, currentProcess?.id, reason);
    }
  }, [trackAnalytics, currentProcess?.id]);

  // User behavior tracking
  const trackUserBehavior = useCallback((behavior: string, metadata?: Record<string, any>) => {
    if (trackAnalytics) {
      analyticsService.trackUserBehavior(behavior, {
        ...metadata,
        component: componentName,
      });
    }
  }, [trackAnalytics, componentName]);

  // API call monitoring wrapper
  const monitorApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    if (trackPerformance) {
      return monitoringService.measureApiCall(endpoint, apiCall, {
        ...context,
        component: componentName,
        processId: currentProcess?.id,
      });
    }
    return apiCall();
  }, [trackPerformance, componentName, currentProcess?.id]);

  return {
    trackError,
    trackPerformanceEvent,
    trackFeature,
    trackStepStart,
    trackStepComplete,
    trackStepAbandon,
    trackUserBehavior,
    monitorApiCall,
  };
};

// Hook for monitoring form interactions
export const useFormMonitoring = (formName: string) => {
  const { trackFeature, trackUserBehavior } = useMonitoring({
    componentName: `form_${formName}`,
  });

  const trackFormStart = useCallback(() => {
    trackFeature('form_start', { formName });
  }, [trackFeature, formName]);

  const trackFormSubmit = useCallback((success: boolean, errors?: string[]) => {
    trackFeature('form_submit', {
      formName,
      success,
      errorCount: errors?.length || 0,
      errors,
    });
  }, [trackFeature, formName]);

  const trackFieldInteraction = useCallback((fieldName: string, action: 'focus' | 'blur' | 'change') => {
    trackUserBehavior('field_interaction', {
      formName,
      fieldName,
      action,
    });
  }, [trackUserBehavior, formName]);

  const trackValidationError = useCallback((fieldName: string, error: string) => {
    trackUserBehavior('validation_error', {
      formName,
      fieldName,
      error,
    });
  }, [trackUserBehavior, formName]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldInteraction,
    trackValidationError,
  };
};

// Hook for monitoring table interactions
export const useTableMonitoring = (tableName: string) => {
  const { trackFeature, trackUserBehavior } = useMonitoring({
    componentName: `table_${tableName}`,
  });

  const trackSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    trackUserBehavior('table_sort', {
      tableName,
      column,
      direction,
    });
  }, [trackUserBehavior, tableName]);

  const trackFilter = useCallback((filters: Record<string, any>) => {
    trackUserBehavior('table_filter', {
      tableName,
      filterCount: Object.keys(filters).length,
      activeFilters: Object.keys(filters),
    });
  }, [trackUserBehavior, tableName]);

  const trackSelection = useCallback((selectedCount: number, totalCount: number) => {
    trackUserBehavior('table_selection', {
      tableName,
      selectedCount,
      totalCount,
      selectionRate: selectedCount / totalCount,
    });
  }, [trackUserBehavior, tableName]);

  const trackPagination = useCallback((page: number, pageSize: number) => {
    trackUserBehavior('table_pagination', {
      tableName,
      page,
      pageSize,
    });
  }, [trackUserBehavior, tableName]);

  return {
    trackSort,
    trackFilter,
    trackSelection,
    trackPagination,
  };
};

// Hook for monitoring file upload
export const useUploadMonitoring = () => {
  const { trackFeature, trackPerformanceEvent, trackError } = useMonitoring({
    componentName: 'file_upload',
  });

  const trackUploadStart = useCallback((fileName: string, fileSize: number) => {
    trackFeature('upload_start', {
      fileName,
      fileSize,
      fileType: fileName.split('.').pop(),
    });
  }, [trackFeature]);

  const trackUploadProgress = useCallback((progress: number, fileName: string) => {
    if (progress % 25 === 0) { // Track at 25%, 50%, 75%, 100%
      trackFeature('upload_progress', {
        fileName,
        progress,
      });
    }
  }, [trackFeature]);

  const trackUploadComplete = useCallback((fileName: string, duration: number, fileSize: number) => {
    trackFeature('upload_complete', {
      fileName,
      duration,
      fileSize,
      uploadSpeed: fileSize / (duration / 1000), // bytes per second
    });

    trackPerformanceEvent({
      type: 'file_upload',
      duration,
      metadata: {
        fileName,
        fileSize,
      },
    });
  }, [trackFeature, trackPerformanceEvent]);

  const trackUploadError = useCallback((error: Error, fileName: string) => {
    trackError(error, {
      fileName,
      uploadStage: 'upload',
    });
  }, [trackError]);

  return {
    trackUploadStart,
    trackUploadProgress,
    trackUploadComplete,
    trackUploadError,
  };
};