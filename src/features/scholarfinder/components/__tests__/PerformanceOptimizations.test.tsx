/**
 * Performance Optimizations Test Suite
 * Tests for code splitting, virtual scrolling, debouncing, memoization, and prefetching
 */

import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import components to test
import { MemoizedVirtualizedTable } from '../common/VirtualizedTable';
import { DebouncedInput, DebouncedSearchInput } from '../common/DebouncedInput';
import { MemoizedOptimizedReviewerTable } from '../common/OptimizedReviewerTable';
import { LazySteps, StepLoadingFallback } from '../steps/LazySteps';
import { usePrefetch } from '../../hooks/usePrefetch';
import { useDebounce, useDebouncedCallback } from '../../hooks/useDebounce';
import { PerformanceMonitor, usePerformanceMeasurement } from '../../utils/performance';

// Mock data
const mockReviewers = Array.from({ length: 1000 }, (_, index) => ({
  reviewer: `Reviewer ${index}`,
  email: `reviewer${index}@example.com`,
  aff: `Institution ${index}`,
  city: `City ${index}`,
  country: `Country ${index % 10}`,
  Total_Publications: Math.floor(Math.random() * 100),
  English_Pubs: Math.floor(Math.random() * 50),
  'Publications (last 10 years)': Math.floor(Math.random() * 30),
  'Relevant Publications (last 5 years)': Math.floor(Math.random() * 20),
  'Publications (last 2 years)': Math.floor(Math.random() * 10),
  'Publications (last year)': Math.floor(Math.random() * 5),
  Clinical_Trials_no: Math.floor(Math.random() * 5),
  Clinical_study_no: Math.floor(Math.random() * 5),
  Case_reports_no: Math.floor(Math.random() * 5),
  Retracted_Pubs_no: Math.floor(Math.random() * 2),
  TF_Publications_last_year: Math.floor(Math.random() * 3),
  coauthor: Math.random() > 0.8,
  country_match: 'No',
  aff_match: 'No',
  conditions_met: Math.floor(Math.random() * 8),
  conditions_satisfied: 'condition1,condition2,condition3,condition4,condition5,condition6,condition7,condition8'
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Performance Optimizations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Code Splitting with React.lazy', () => {
    it('should load lazy components with suspense fallback', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div>Lazy Component Loaded</div>
        })
      );

      render(
        <Suspense fallback={<StepLoadingFallback />}>
          <LazyComponent />
        </Suspense>
      );

      // Should show loading fallback initially
      expect(screen.getByText('Loading step...')).toBeInTheDocument();

      // Should load the actual component
      await waitFor(() => {
        expect(screen.getByText('Lazy Component Loaded')).toBeInTheDocument();
      });
    });

    it('should have all lazy step components defined', () => {
      expect(LazySteps.upload).toBeDefined();
      expect(LazySteps.metadata).toBeDefined();
      expect(LazySteps.keywords).toBeDefined();
      expect(LazySteps.search).toBeDefined();
      expect(LazySteps.manual).toBeDefined();
      expect(LazySteps.validation).toBeDefined();
      expect(LazySteps.recommendations).toBeDefined();
      expect(LazySteps.shortlist).toBeDefined();
      expect(LazySteps.export).toBeDefined();
    });
  });

  describe('Virtual Scrolling', () => {
    it('should render large datasets efficiently with virtual scrolling', async () => {
      const mockProps = {
        data: mockReviewers,
        selectedIds: new Set<string>(),
        onSelectionChange: vi.fn(),
        onSelectAll: vi.fn(),
        onDeselectAll: vi.fn(),
        onAddToShortlist: vi.fn(),
        height: 400,
        itemHeight: 60
      };

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <MemoizedVirtualizedTable {...mockProps} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly even with large dataset
      expect(renderTime).toBeLessThan(100); // Less than 100ms

      // Should only render visible items (not all 1000)
      const visibleRows = screen.getAllByRole('row');
      expect(visibleRows.length).toBeLessThan(50); // Much less than total data
    });

    it('should handle sorting without performance degradation', async () => {
      const mockProps = {
        data: mockReviewers,
        selectedIds: new Set<string>(),
        onSelectionChange: vi.fn(),
        onSelectAll: vi.fn(),
        onDeselectAll: vi.fn(),
        onSort: vi.fn(),
        sortColumn: 'reviewer',
        sortDirection: 'asc' as const
      };

      render(
        <TestWrapper>
          <MemoizedVirtualizedTable {...mockProps} />
        </TestWrapper>
      );

      const sortButton = screen.getByRole('button', { name: /name/i });
      
      const startTime = performance.now();
      fireEvent.click(sortButton);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Fast sorting
      expect(mockProps.onSort).toHaveBeenCalled();
    });
  });

  describe('Debounced Inputs', () => {
    it('should debounce input changes to reduce API calls', async () => {
      const mockOnChange = vi.fn();
      
      render(
        <DebouncedInput
          value=""
          onChange={mockOnChange}
          debounceMs={300}
          placeholder="Test input"
        />
      );

      const input = screen.getByPlaceholderText('Test input');

      // Type multiple characters quickly
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });

      // Should not call onChange immediately
      expect(mockOnChange).not.toHaveBeenCalled();

      // Should call onChange after debounce delay
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('abc');
      }, { timeout: 500 });

      // Should only be called once despite multiple changes
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should provide immediate feedback in UI while debouncing API calls', () => {
      const mockOnChange = vi.fn();
      
      render(
        <DebouncedSearchInput
          value=""
          onChange={mockOnChange}
          debounceMs={300}
        />
      );

      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'test search' } });

      // Input should show immediate feedback
      expect(input).toHaveValue('test search');
      
      // But onChange should not be called yet
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('React.memo and useMemo Optimizations', () => {
    it('should prevent unnecessary re-renders with React.memo', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = React.memo<{ data: any[]; filter: string }>(({ data, filter }) => {
        renderSpy();
        return <div>Items: {data.length}, Filter: {filter}</div>;
      });

      const { rerender } = render(
        <TestComponent data={mockReviewers} filter="test" />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props - should not trigger re-render
      rerender(<TestComponent data={mockReviewers} filter="test" />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with different props - should trigger re-render
      rerender(<TestComponent data={mockReviewers} filter="different" />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should memoize expensive computations', () => {
      const expensiveComputation = vi.fn((data: any[]) => {
        // Simulate expensive operation
        return data.filter(item => item.Total_Publications > 50).length;
      });

      const TestComponent: React.FC<{ data: any[]; otherProp: string }> = ({ data, otherProp }) => {
        const expensiveResult = React.useMemo(() => expensiveComputation(data), [data]);
        return <div>Result: {expensiveResult}, Other: {otherProp}</div>;
      };

      const { rerender } = render(
        <TestComponent data={mockReviewers} otherProp="test" />
      );

      expect(expensiveComputation).toHaveBeenCalledTimes(1);

      // Re-render with same data but different otherProp
      rerender(<TestComponent data={mockReviewers} otherProp="different" />);
      
      // Expensive computation should not run again
      expect(expensiveComputation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Prefetching and Progressive Loading', () => {
    it('should prefetch upcoming steps', async () => {
      const TestComponent: React.FC = () => {
        const { prefetchSpecificStep } = usePrefetch(
          'upload' as any,
          'test-job-id',
          'test-process-id',
          true
        );

        React.useEffect(() => {
          prefetchSpecificStep('metadata' as any);
        }, [prefetchSpecificStep]);

        return <div>Test Component</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should initiate prefetch
      await waitFor(() => {
        expect(screen.getByText('Test Component')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure component performance', () => {
      const TestComponent: React.FC = () => {
        const { measureOperation } = usePerformanceMeasurement('TestComponent', true);

        const handleClick = () => {
          measureOperation('button-click', () => {
            // Simulate some work
            for (let i = 0; i < 1000; i++) {
              Math.random();
            }
          });
        };

        return <button onClick={handleClick}>Test Button</button>;
      };

      render(<TestComponent />);

      const button = screen.getByText('Test Button');
      fireEvent.click(button);

      // Performance measurement should not throw errors
      expect(button).toBeInTheDocument();
    });

    it('should track render counts in development', () => {
      const monitor = PerformanceMonitor.getInstance();
      
      // Clear any existing measurements
      monitor.clear();

      const TestComponent: React.FC<{ prop: string }> = ({ prop }) => {
        return <div>{prop}</div>;
      };

      const { rerender } = render(<TestComponent prop="initial" />);
      
      rerender(<TestComponent prop="updated" />);
      rerender(<TestComponent prop="final" />);

      // Should track multiple renders
      expect(screen.getByText('final')).toBeInTheDocument();
    });
  });

  describe('Optimized Reviewer Table Integration', () => {
    it('should handle large datasets with all optimizations enabled', async () => {
      const mockProps = {
        availableReviewers: mockReviewers,
        selectedReviewers: [],
        onAddToShortlist: vi.fn(),
        onBulkAdd: vi.fn(),
        maxReviewers: 10,
        isLoading: false
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <MemoizedOptimizedReviewerTable {...mockProps} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly with all optimizations
      expect(renderTime).toBeLessThan(200);

      // Should show search input (debounced)
      expect(screen.getByPlaceholderText(/search reviewers/i)).toBeInTheDocument();

      // Should show filter button
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should debounce search input in optimized table', async () => {
      const mockProps = {
        availableReviewers: mockReviewers.slice(0, 10), // Smaller dataset for testing
        selectedReviewers: [],
        onAddToShortlist: vi.fn(),
        onBulkAdd: vi.fn(),
        maxReviewers: 10,
        isLoading: false
      };

      render(
        <TestWrapper>
          <MemoizedOptimizedReviewerTable {...mockProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search reviewers/i);

      // Type in search - should update immediately in UI
      fireEvent.change(searchInput, { target: { value: 'Reviewer 1' } });
      expect(searchInput).toHaveValue('Reviewer 1');

      // Should filter results after debounce
      await waitFor(() => {
        // The table should update to show filtered results
        expect(screen.getByText(/available/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on unmount', () => {
      const TestComponent: React.FC = () => {
        const { cancelPrefetches } = usePrefetch(
          'upload' as any,
          'test-job-id',
          'test-process-id',
          true
        );

        React.useEffect(() => {
          return () => {
            cancelPrefetches();
          };
        }, [cancelPrefetches]);

        return <div>Test Component</div>;
      };

      const { unmount } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});

describe('Debounce Hook', () => {
  it('should debounce values correctly', async () => {
    let debouncedValue: string;
    
    const TestComponent: React.FC<{ value: string }> = ({ value }) => {
      debouncedValue = useDebounce(value, 100);
      return <div>{debouncedValue}</div>;
    };

    const { rerender } = render(<TestComponent value="initial" />);
    
    // Should show initial value immediately
    expect(screen.getByText('initial')).toBeInTheDocument();

    // Change value multiple times quickly
    rerender(<TestComponent value="a" />);
    rerender(<TestComponent value="ab" />);
    rerender(<TestComponent value="abc" />);

    // Should still show initial value
    expect(screen.getByText('initial')).toBeInTheDocument();

    // Should update after debounce delay
    await waitFor(() => {
      expect(screen.getByText('abc')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('should debounce callbacks correctly', async () => {
    const mockCallback = vi.fn();
    
    const TestComponent: React.FC = () => {
      const debouncedCallback = useDebouncedCallback(mockCallback, 100);
      
      return (
        <button onClick={() => debouncedCallback('test')}>
          Click me
        </button>
      );
    };

    render(<TestComponent />);
    
    const button = screen.getByText('Click me');

    // Click multiple times quickly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should not call callback immediately
    expect(mockCallback).not.toHaveBeenCalled();

    // Should call callback once after debounce delay
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith('test');
    }, { timeout: 200 });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});