import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Simple test component that can throw errors
const TestComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Test component rendered successfully</div>;
};

describe('ErrorBoundary Basic Tests', () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test component rendered successfully')).toBeInTheDocument();
  });

  it('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('displays error category and severity', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('RUNTIME ERROR')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM SEVERITY')).toBeInTheDocument();
  });

  it('shows error ID in alert', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/Category: runtime/)).toBeInTheDocument();
    expect(screen.getByText(/Severity: medium/)).toBeInTheDocument();
  });
});