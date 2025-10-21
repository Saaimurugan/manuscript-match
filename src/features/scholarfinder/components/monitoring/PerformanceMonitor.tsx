import React, { useEffect, useRef, ReactNode } from 'react';
import { useMonitoring } from '../../hooks/useMonitoring';

interface PerformanceMonitorProps {
  children: ReactNode;
  componentName: string;
  trackRender?: boolean;
  trackMount?: boolean;
  thresholds?: {
    renderTime?: number; // ms
    mountTime?: number; // ms
  };
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  children,
  componentName,
  trackRender = true,
  trackMount = true,
  thresholds = {
    renderTime: 16, // 60fps threshold
    mountTime: 100,
  },
}) => {
  const { trackPerformanceEvent, trackFeature } = useMonitoring({
    componentName,
    trackPerformance: true,
  });

  const mountStartTime = useRef<number>();
  const renderStartTime = useRef<number>();
  const renderCount = useRef(0);

  // Track component mount performance
  useEffect(() => {
    if (trackMount) {
      mountStartTime.current = performance.now();
      
      return () => {
        if (mountStartTime.current) {
          const mountDuration = performance.now() - mountStartTime.current;
          
          trackPerformanceEvent({
            type: 'component_render',
            duration: mountDuration,
            component: `${componentName}_mount`,
            metadata: {
              renderCount: renderCount.current,
              exceedsThreshold: thresholds.mountTime ? mountDuration > thresholds.mountTime : false,
            },
          });

          // Track slow mounts
          if (thresholds.mountTime && mountDuration > thresholds.mountTime) {
            trackFeature('slow_component_mount', {
              component: componentName,
              duration: mountDuration,
              threshold: thresholds.mountTime,
            });
          }
        }
      };
    }
  }, [trackMount, componentName, trackPerformanceEvent, trackFeature, thresholds.mountTime]);

  // Track render performance
  useEffect(() => {
    if (trackRender) {
      if (renderStartTime.current) {
        const renderDuration = performance.now() - renderStartTime.current;
        renderCount.current++;
        
        trackPerformanceEvent({
          type: 'component_render',
          duration: renderDuration,
          component: `${componentName}_render`,
          metadata: {
            renderNumber: renderCount.current,
            exceedsThreshold: thresholds.renderTime ? renderDuration > thresholds.renderTime : false,
          },
        });

        // Track slow renders
        if (thresholds.renderTime && renderDuration > thresholds.renderTime) {
          trackFeature('slow_component_render', {
            component: componentName,
            duration: renderDuration,
            threshold: thresholds.renderTime,
            renderNumber: renderCount.current,
          });
        }
      }
      
      renderStartTime.current = performance.now();
    }
  });

  return <>{children}</>;
};

// HOC version for easier integration
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    componentName?: string;
    trackRender?: boolean;
    trackMount?: boolean;
    thresholds?: {
      renderTime?: number;
      mountTime?: number;
    };
  } = {}
) => {
  const {
    componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component',
    trackRender = true,
    trackMount = true,
    thresholds,
  } = options;

  const MonitoredComponent: React.FC<P> = (props) => (
    <PerformanceMonitor
      componentName={componentName}
      trackRender={trackRender}
      trackMount={trackMount}
      thresholds={thresholds}
    >
      <WrappedComponent {...props} />
    </PerformanceMonitor>
  );

  MonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;

  return MonitoredComponent;
};