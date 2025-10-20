/**
 * Tests for ScholarFinder Error Boundary components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScholarFinderErrorBoundary, StepErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Mock the error handling utility
vi.mock('../../../utils/errorHandling', () => ({
  handleComponentError: vi.fn(),
}));

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ScholarFinderErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ScholarFinderErrorBoundary>
        <div>Test content</div>
      </ScholarFinderErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ScholarFinderErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An error occurred in the ScholarFinder workflow/)).toBeInTheDocument();
  });

  it('shows context in error message when provided', () => {
    render(
      <ScholarFinderErrorBoundary context="Upload Step">
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    expect(screen.getByText(/Upload Step/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ScholarFinderErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ScholarFinderErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('shows technical details when showDetails is true', () => {
    render(
      <ScholarFinderErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    expect(screen.getByText(/Technical Details/)).toBeInTheDocument();
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });

  it('allows retry functionality', () => {
    render(
      <ScholarFinderErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    // Test that the retry button is clickable
    fireEvent.click(retryButton);
    
    // The error boundary should still show the error since the component will throw again
    // In a real scenario, the retry would work if the underlying issue was resolved
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('provides go home functionality', () => {
    // Mock window.location
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    render(
      <ScholarFinderErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ScholarFinderErrorBoundary>
    );

    const homeButton = screen.getByText('Go to Dashboard');
    fireEvent.click(homeButton);

    expect(mockLocation.href).toBe('/');
  });
});

describe('StepErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <StepErrorBoundary stepName="Upload">
        <div>Step content</div>
      </StepErrorBoundary>
    );

    expect(screen.getByText('Step content')).toBeInTheDocument();
  });

  it('renders step-specific error UI when child throws', () => {
    render(
      <StepErrorBoundary stepName="Upload">
        <ThrowError shouldThrow={true} />
      </StepErrorBoundary>
    );

    expect(screen.getByText('Error in Upload step')).toBeInTheDocument();
    expect(screen.getByText('Retry Step')).toBeInTheDocument();
  });

  it('calls onStepError callback with step name', () => {
    const onStepError = vi.fn();

    render(
      <StepErrorBoundary stepName="Upload" onStepError={onStepError}>
        <ThrowError shouldThrow={true} />
      </StepErrorBoundary>
    );

    expect(onStepError).toHaveBeenCalledWith('Upload', expect.any(Error));
  });

  it('allows step retry functionality', () => {
    render(
      <StepErrorBoundary stepName="Upload">
        <ThrowError shouldThrow={true} />
      </StepErrorBoundary>
    );

    expect(screen.getByText('Error in Upload step')).toBeInTheDocument();

    const retryButton = screen.getByText('Retry Step');
    expect(retryButton).toBeInTheDocument();
    
    // Test that the retry button is clickable
    fireEvent.click(retryButton);
    
    // The error boundary should still show the error since the component will throw again
    expect(screen.getByText('Error in Upload step')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('wraps component with error boundary', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Wrapped component</div>;
    };

    const WrappedComponent = withErrorBoundary(TestComponent, {
      context: 'Test Context'
    });

    render(<WrappedComponent shouldThrow={false} />);
    expect(screen.getByText('Wrapped component')).toBeInTheDocument();

    const { rerender } = render(<WrappedComponent shouldThrow={false} />);
    
    rerender(<WrappedComponent shouldThrow={true} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test Context/)).toBeInTheDocument();
  });

  it('sets correct display name', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });

  it('handles components without display name', () => {
    const TestComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});