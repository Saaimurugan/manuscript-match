/**
 * Test suite for ErrorAnalyticsDashboard component
 * Tests dashboard rendering, data display, and user interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorAnalyticsDashboard from '../ErrorAnalyticsDashboard';
import { useErrorMonitoring } from '../../../hooks/useErrorMonitoring';

// Mock the useErrorMonitoring hook
vi.mock('../../../hooks/useErrorMonitoring', () => ({
  useErrorMonitoring: vi.fn()
}));

describe('ErrorAnalyticsDashboard', () => {
  const mockUseErrorMonitoring = useErrorMonitoring as any;

  const mockMetrics = {
    timeWindow: '60 minutes',
    totalErrors: 15,
    errorRate: 7.5,
    criticalErrors: 3,
    componentErrors: {
      'ComponentA': 8,
      'ComponentB': 4,
      'ComponentC': 3
    },
    categoryBreakdown: {
      'runtime': 10,
      'network': 3,
      'user': 2
    },
    averageResponseTime: 125.5
  };

  const mockAnalysis = {
    topErrors: [
      { message: 'Network timeout error', count: 5, severity: 'high' },
      { message: 'Validation failed', count: 3, severity: 'medium' },
      { message: 'Component render error', count: 2, severity: 'critical' }
    ],
    errorTrends: [
      { hour: '09:00', count: 2 },
      { hour: '10:00', count: 5 },
      { hour: '11:00', count: 3 },
      { hour: '12:00', count: 1 }
    ],
    componentHealth: [
      { component: 'ComponentA', errorCount: 8, healthScore: 75 },
      { component: 'ComponentB', errorCount: 4, healthScore: 90 },
      { component: 'ComponentC', errorCount: 3, healthScore: 60 }
    ],
    resolutionRate: 85
  };

  const mockMonitoringStatus = {
    isActive: true,
    totalErrors: 50,
    recentErrorRate: 7.5,
    alertsTriggered: 2,
    performanceMonitoring: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseErrorMonitoring.mockReturnValue({
      getErrorMetrics: vi.fn().mockReturnValue(mockMetrics),
      getErrorAnalysis: vi.fn().mockReturnValue(mockAnalysis),
      monitoringStatus: mockMonitoringStatus,
      trackError: vi.fn(),
      markErrorResolved: vi.fn()
    });
  });

  describe('Basic Rendering', () => {
    it('should render dashboard when monitoring is active', () => {
      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText('Error Analytics')).toBeInTheDocument();
      expect(screen.getByText('Monitoring 50 total errors')).toBeInTheDocument();
    });

    it('should show inactive message when monitoring is not active', () => {
      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        monitoringStatus: { ...mockMonitoringStatus, isActive: false }
      });

      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText('Error monitoring is not active')).toBeInTheDocument();
    });

    it('should display key metrics correctly', () => {
      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText('15')).toBeInTheDocument(); // Total errors
      expect(screen.getByText('7.5')).toBeInTheDocument(); // Error rate
      expect(screen.getByText('3')).toBeInTheDocument(); // Critical errors
      expect(screen.getByText('85%')).toBeInTheDocument(); // Resolution rate
    });

    it('should show performance metrics when available', () => {
      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText(/Average error handling time: 125.50ms/)).toBeInTheDocument();
    });
  });

  describe('Time Window Selection', () => {
    it('should render time window selector', () => {
      render(<ErrorAnalyticsDashboard />);

      const selector = screen.getByDisplayValue('Last hour');
      expect(selector).toBeInTheDocument();
    });

    it('should update metrics when time window changes', async () => {
      const mockGetErrorMetrics = vi.fn().mockReturnValue(mockMetrics);
      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        getErrorMetrics: mockGetErrorMetrics
      });

      render(<ErrorAnalyticsDashboard />);

      const selector = screen.getByDisplayValue('Last hour');
      fireEvent.change(selector, { target: { value: '360' } });

      await waitFor(() => {
        expect(mockGetErrorMetrics).toHaveBeenCalledWith(360);
      });
    });

    it('should show all time window options', () => {
      render(<ErrorAnalyticsDashboard />);

      const selector = screen.getByDisplayValue('Last hour');
      expect(selector.children).toHaveLength(4); // 15min, 1h, 6h, 24h
    });
  });

  describe('Expandable Details', () => {
    it('should toggle expanded view', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });

    it('should show detailed metrics when expanded', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('Most Frequent Errors')).toBeInTheDocument();
      expect(screen.getByText('Component Health')).toBeInTheDocument();
      expect(screen.getByText('Error Categories')).toBeInTheDocument();
    });

    it('should not show detailed metrics when showDetailedMetrics is false', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={false} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Most Frequent Errors')).not.toBeInTheDocument();
    });
  });

  describe('Top Errors Display', () => {
    it('should display top errors with correct information', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('Network timeout error')).toBeInTheDocument();
      expect(screen.getByText('5x')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('should limit top errors to 5 items', () => {
      const manyErrors = Array.from({ length: 10 }, (_, i) => ({
        message: `Error ${i}`,
        count: 10 - i,
        severity: 'medium'
      }));

      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        getErrorAnalysis: vi.fn().mockReturnValue({
          ...mockAnalysis,
          topErrors: manyErrors
        })
      });

      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      // Should only show first 5 errors
      expect(screen.getByText('Error 0')).toBeInTheDocument();
      expect(screen.getByText('Error 4')).toBeInTheDocument();
      expect(screen.queryByText('Error 5')).not.toBeInTheDocument();
    });
  });

  describe('Component Health Display', () => {
    it('should display component health scores', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('ComponentA')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('8 errors')).toBeInTheDocument();
    });

    it('should apply correct health score colors', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      // ComponentB has 90% health score (should be green)
      const healthScore90 = screen.getByText('90%');
      expect(healthScore90).toHaveClass('text-green-600');

      // ComponentC has 60% health score (should be red)
      const healthScore60 = screen.getByText('60%');
      expect(healthScore60).toHaveClass('text-red-600');
    });
  });

  describe('Error Categories Display', () => {
    it('should display error category breakdown', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('Runtime')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should show correct counts for each category', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      // Check that category counts are displayed
      const categorySection = screen.getByText('Error Categories').closest('div');
      expect(categorySection).toBeInTheDocument();
    });
  });

  describe('Error Trends Visualization', () => {
    it('should display error trends chart', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('24-Hour Error Trends')).toBeInTheDocument();
    });

    it('should show hourly data points', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      // Check for time labels
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data periodically', async () => {
      vi.useFakeTimers();
      
      const mockGetErrorMetrics = vi.fn().mockReturnValue(mockMetrics);
      const mockGetErrorAnalysis = vi.fn().mockReturnValue(mockAnalysis);
      
      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        getErrorMetrics: mockGetErrorMetrics,
        getErrorAnalysis: mockGetErrorAnalysis
      });

      render(<ErrorAnalyticsDashboard refreshInterval={1000} />);

      // Initial calls
      expect(mockGetErrorMetrics).toHaveBeenCalledTimes(1);
      expect(mockGetErrorAnalysis).toHaveBeenCalledTimes(1);

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockGetErrorMetrics).toHaveBeenCalledTimes(2);
        expect(mockGetErrorAnalysis).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should cleanup refresh interval on unmount', () => {
      vi.useFakeTimers();
      
      const { unmount } = render(<ErrorAnalyticsDashboard refreshInterval={1000} />);
      
      unmount();

      // Verify no more calls after unmount
      vi.advanceTimersByTime(1000);
      
      vi.useRealTimers();
    });
  });

  describe('Status Indicators', () => {
    it('should show monitoring active indicator', () => {
      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText('Monitoring Active')).toBeInTheDocument();
    });

    it('should show performance tracking indicator when enabled', () => {
      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText('Performance Tracking')).toBeInTheDocument();
    });

    it('should not show performance tracking when disabled', () => {
      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        monitoringStatus: { ...mockMonitoringStatus, performanceMonitoring: false }
      });

      render(<ErrorAnalyticsDashboard />);

      expect(screen.queryByText('Performance Tracking')).not.toBeInTheDocument();
    });

    it('should show last updated timestamp', () => {
      render(<ErrorAnalyticsDashboard />);

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe('Severity Color Coding', () => {
    it('should apply correct colors for different severities', () => {
      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      const expandButton = screen.getByText('Expand');
      fireEvent.click(expandButton);

      const criticalSeverity = screen.getByText('critical');
      expect(criticalSeverity).toHaveClass('text-red-600', 'bg-red-50');

      const highSeverity = screen.getByText('high');
      expect(highSeverity).toHaveClass('text-orange-600', 'bg-orange-50');

      const mediumSeverity = screen.getByText('medium');
      expect(mediumSeverity).toHaveClass('text-yellow-600', 'bg-yellow-50');
    });
  });

  describe('Responsive Design', () => {
    it('should render grid layout for metrics', () => {
      render(<ErrorAnalyticsDashboard />);

      const metricsGrid = screen.getByText('Total Errors').closest('.grid');
      expect(metricsGrid).toHaveClass('grid-cols-2', 'md:grid-cols-4');
    });

    it('should handle empty data gracefully', () => {
      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        getErrorMetrics: vi.fn().mockReturnValue({
          ...mockMetrics,
          totalErrors: 0,
          componentErrors: {},
          categoryBreakdown: {}
        }),
        getErrorAnalysis: vi.fn().mockReturnValue({
          topErrors: [],
          errorTrends: [],
          componentHealth: [],
          resolutionRate: 100
        })
      });

      render(<ErrorAnalyticsDashboard showDetailedMetrics={true} />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Total errors
      expect(screen.getByText('100%')).toBeInTheDocument(); // Resolution rate
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<ErrorAnalyticsDashboard className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use custom refresh interval', () => {
      vi.useFakeTimers();
      
      const mockGetErrorMetrics = vi.fn().mockReturnValue(mockMetrics);
      mockUseErrorMonitoring.mockReturnValue({
        ...mockUseErrorMonitoring(),
        getErrorMetrics: mockGetErrorMetrics
      });

      render(<ErrorAnalyticsDashboard refreshInterval={5000} />);

      vi.advanceTimersByTime(4999);
      expect(mockGetErrorMetrics).toHaveBeenCalledTimes(1); // Only initial call

      vi.advanceTimersByTime(1);
      expect(mockGetErrorMetrics).toHaveBeenCalledTimes(2); // Refresh after 5000ms

      vi.useRealTimers();
    });
  });
});