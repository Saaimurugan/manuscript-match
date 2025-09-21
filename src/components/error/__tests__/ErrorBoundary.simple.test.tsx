/**
 * Simple ErrorBoundary Test
 * Basic test to verify the ErrorBoundary component works
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

const NormalComponent = () => <div data-testid="normal-component">Normal Component</div>;

describe('ErrorBoundary Simple Tests', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('normal-component')).toBeInTheDocument();
  });

  it('should catch errors and display error UI', async () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // The error boundary should catch the error and display error UI
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });
});