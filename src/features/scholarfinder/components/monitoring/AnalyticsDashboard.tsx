import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { analyticsService } from '../../services/AnalyticsService';
import { abTestingService } from '../../services/ABTestingService';
import { useABTestAnalytics } from '../../hooks/useABTesting';

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
}) => {
  const [sessionInfo, setSessionInfo] = useState(analyticsService.getCurrentSession());
  const { activeTests, assignments, getTestSummary } = useABTestAnalytics();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(analyticsService.getCurrentSession());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Only show in development or for admin users
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isAdmin = sessionInfo?.userId && sessionInfo.userId.includes('admin'); // Simple admin check
    setIsVisible(isDevelopment || !!isAdmin);
  }, [sessionInfo]);

  if (!isVisible) {
    return null;
  }

  const testSummary = getTestSummary();
  const sessionDuration = sessionInfo 
    ? Date.now() - sessionInfo.startTime.getTime()
    : 0;

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 max-h-96 overflow-y-auto bg-white shadow-lg border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Analytics Dashboard
            <Badge variant="outline" className="text-xs">
              DEV
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Session Information */}
          <div className="space-y-1">
            <h4 className="font-medium text-gray-700">Current Session</h4>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>Duration:</div>
              <div>{formatDuration(sessionDuration)}</div>
              <div>User ID:</div>
              <div className="truncate">{sessionInfo?.userId || 'Anonymous'}</div>
              <div>Processes:</div>
              <div>{sessionInfo?.processIds.length || 0}</div>
              <div>Completed Steps:</div>
              <div>{sessionInfo?.completedSteps.length || 0}</div>
            </div>
          </div>

          {/* A/B Test Information */}
          <div className="space-y-1">
            <h4 className="font-medium text-gray-700">A/B Tests</h4>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>Active Tests:</div>
              <div>{testSummary.totalActiveTests}</div>
              <div>Assignments:</div>
              <div>{testSummary.totalAssignments}</div>
              <div>Participating:</div>
              <div>{testSummary.testsWithAssignments}</div>
            </div>
          </div>

          {/* Active Test Assignments */}
          {assignments.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-medium text-gray-700">Test Assignments</h4>
              <div className="space-y-1">
                {assignments.map((assignment) => {
                  const test = activeTests.find(t => t.id === assignment.testId);
                  return (
                    <div key={assignment.testId} className="flex justify-between items-center">
                      <span className="truncate text-gray-600">
                        {test?.name || assignment.testId}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {assignment.variantId}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-1">
            <h4 className="font-medium text-gray-700">Actions</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  analyticsService.trackFeatureUsage('analytics_dashboard_export');
                  console.log('Session Data:', sessionInfo);
                  console.log('A/B Tests:', { activeTests, assignments });
                }}
                className="text-xs"
              >
                Export Data
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  analyticsService.endSession('manual');
                  window.location.reload();
                }}
                className="text-xs"
              >
                Reset Session
              </Button>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="space-y-1">
            <h4 className="font-medium text-gray-700">Performance</h4>
            <div className="text-gray-600">
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span>
                  {(performance as any).memory 
                    ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Connection:</span>
                <span>
                  {(navigator as any).connection?.effectiveType || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};