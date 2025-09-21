/**
 * Error Analytics Dashboard Component
 * Displays error monitoring metrics and analytics in a user-friendly interface
 */

import React, { useState, useEffect } from 'react';
import { useErrorMonitoring } from '../../hooks/useErrorMonitoring';

interface ErrorAnalyticsDashboardProps {
  className?: string;
  refreshInterval?: number; // in milliseconds
  showDetailedMetrics?: boolean;
}

const ErrorAnalyticsDashboard: React.FC<ErrorAnalyticsDashboardProps> = ({
  className = '',
  refreshInterval = 30000, // 30 seconds
  showDetailedMetrics = true
}) => {
  const { getErrorMetrics, getErrorAnalysis, monitoringStatus } = useErrorMonitoring('ErrorAnalyticsDashboard');
  const [metrics, setMetrics] = useState(getErrorMetrics(60));
  const [analysis, setAnalysis] = useState(getErrorAnalysis());
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(60);
  const [isExpanded, setIsExpanded] = useState(false);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getErrorMetrics(selectedTimeWindow));
      setAnalysis(getErrorAnalysis());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [getErrorMetrics, getErrorAnalysis, selectedTimeWindow, refreshInterval]);

  // Update metrics when time window changes
  useEffect(() => {
    setMetrics(getErrorMetrics(selectedTimeWindow));
  }, [selectedTimeWindow, getErrorMetrics]);

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!monitoringStatus.isActive) {
    return (
      <div className={`p-4 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-600">Error monitoring is not active</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Error Analytics</h3>
            <p className="text-sm text-gray-600">
              Monitoring {monitoringStatus.totalErrors} total errors
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedTimeWindow}
              onChange={(e) => setSelectedTimeWindow(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={15}>Last 15 min</option>
              <option value={60}>Last hour</option>
              <option value={360}>Last 6 hours</option>
              <option value={1440}>Last 24 hours</option>
            </select>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{metrics.totalErrors}</div>
            <div className="text-sm text-blue-800">Total Errors</div>
            <div className="text-xs text-blue-600">{metrics.timeWindow}</div>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.errorRate.toFixed(1)}
            </div>
            <div className="text-sm text-orange-800">Errors/Hour</div>
            <div className="text-xs text-orange-600">Current rate</div>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{metrics.criticalErrors}</div>
            <div className="text-sm text-red-800">Critical Errors</div>
            <div className="text-xs text-red-600">Needs attention</div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {analysis.resolutionRate}%
            </div>
            <div className="text-sm text-green-800">Resolution Rate</div>
            <div className="text-xs text-green-600">Last 24h</div>
          </div>
        </div>

        {/* Performance Metrics */}
        {metrics.averageResponseTime > 0 && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
            <div className="text-sm text-gray-600">
              Average error handling time: {metrics.averageResponseTime.toFixed(2)}ms
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && showDetailedMetrics && (
          <div className="space-y-6">
            {/* Top Errors */}
            {analysis.topErrors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Most Frequent Errors</h4>
                <div className="space-y-2">
                  {analysis.topErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {error.message}
                        </div>
                        <div className={`inline-block px-2 py-1 text-xs rounded ${getSeverityColor(error.severity)}`}>
                          {error.severity}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-600">
                        {error.count}x
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Component Health */}
            {analysis.componentHealth.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Component Health</h4>
                <div className="space-y-2">
                  {analysis.componentHealth.slice(0, 5).map((component, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {component.component}
                        </div>
                        <div className="text-xs text-gray-600">
                          {component.errorCount} errors
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${getHealthColor(component.healthScore)}`}>
                        {component.healthScore}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Categories */}
            {Object.keys(metrics.categoryBreakdown).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Error Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(metrics.categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="p-2 bg-gray-50 rounded text-center">
                      <div className="text-lg font-semibold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-600 capitalize">{category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Trends */}
            {analysis.errorTrends.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">24-Hour Error Trends</h4>
                <div className="flex items-end space-x-1 h-20">
                  {analysis.errorTrends.map((trend, index) => {
                    const maxCount = Math.max(...analysis.errorTrends.map(t => t.count));
                    const height = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-200 rounded-t"
                          style={{ height: `${height}%`, minHeight: trend.count > 0 ? '4px' : '0' }}
                          title={`${trend.hour}: ${trend.count} errors`}
                        />
                        <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                          {trend.hour}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              Monitoring Active
            </span>
            {monitoringStatus.performanceMonitoring && (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                Performance Tracking
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorAnalyticsDashboard;