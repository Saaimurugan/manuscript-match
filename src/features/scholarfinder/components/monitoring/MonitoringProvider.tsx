import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { monitoringService } from '../../services/MonitoringService';
import { analyticsService } from '../../services/AnalyticsService';
import { abTestingService } from '../../services/ABTestingService';
import { useAuth } from '../../../../contexts/AuthContext';

interface MonitoringContextType {
  trackError: (error: Error, context?: Record<string, any>) => void;
  trackFeature: (feature: string, metadata?: Record<string, any>) => void;
  trackPerformance: (metric: string, value: number, metadata?: Record<string, any>) => void;
  isMonitoringEnabled: boolean;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

interface MonitoringProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({
  children,
  enabled = true,
}) => {
  const { user } = useAuth();

  // Initialize monitoring services with user context
  useEffect(() => {
    if (enabled && user?.id) {
      analyticsService.setUser(user.id);
      abTestingService.setUser(user.id);
    }
  }, [enabled, user?.id]);

  // Setup page visibility tracking for session management
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        analyticsService.trackUserBehavior('page_hidden');
      } else {
        analyticsService.trackUserBehavior('page_visible');
      }
    };

    const handleBeforeUnload = () => {
      analyticsService.endSession('navigation');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);

  // Setup performance monitoring
  useEffect(() => {
    if (!enabled) return;

    // Monitor page load performance
    const trackPageLoad = () => {
      if (performance.navigation && performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        monitoringService.trackPerformance({
          type: 'component_render',
          duration: loadTime,
          component: 'page_load',
          metadata: {
            navigationType: performance.navigation.type,
            redirectCount: performance.navigation.redirectCount,
          },
        });
      }
    };

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      trackPageLoad();
    } else {
      window.addEventListener('load', trackPageLoad);
      return () => window.removeEventListener('load', trackPageLoad);
    }
  }, [enabled]);

  // Context value
  const contextValue: MonitoringContextType = {
    trackError: (error: Error, context?: Record<string, any>) => {
      if (enabled) {
        analyticsService.trackError(error, context);
      }
    },
    trackFeature: (feature: string, metadata?: Record<string, any>) => {
      if (enabled) {
        analyticsService.trackFeatureUsage(feature, metadata);
      }
    },
    trackPerformance: (metric: string, value: number, metadata?: Record<string, any>) => {
      if (enabled) {
        analyticsService.trackPerformanceInsight(metric, value, metadata);
      }
    },
    isMonitoringEnabled: enabled,
  };

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoringContext = (): MonitoringContextType => {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error('useMonitoringContext must be used within a MonitoringProvider');
  }
  return context;
};