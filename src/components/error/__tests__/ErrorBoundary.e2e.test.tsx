/**
 * ErrorBoundary End-to-End Test Suite
 * 
 * Tests complete user workflows for error recovery, reporting, and navigation.
 * Simulates real user interactions and verifies the complete user experience.
 * 
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock Router for navigation testing
const MockRouter = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-router">{children}</div>;
};

// Application-like component structure
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="app-layout">
    <header data-testid="app-header">Header</header>
    <main data-testid="app-main">{children}</main>
    <footer data-testid="app-footer">Footer</footer>
  </div>
);

// Simulated page components
const HomePage = () => <div data-testid="home-page">Home Page</div>;
const ProfilePage = () => <div data-testid="profile-page">Profile Page</div>;

// Component that can simulate various error scenarios
const ErrorProneComponent = ({ 
  scenario = 'none',
  triggerDelay = 0,
}: {
  scenario?: 'none' | 'immediate' | 'delayed' | 'user-action' | 'network' | 'form-submission';
  triggerDelay?: number;
}) => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (scenario === 'immediate') {
      setShouldThrow(true);
    } else if (scenario === 'delayed') {
      const timer = setTimeout(() => {
        setShouldThrow(true);
      }, triggerDelay);
      return () => clearTimeout(timer);
    }
  }, [scenario, triggerDelay]);

  const handleUserAction = async () => {
    if (scenario === 'user-action') {
      setShouldThrow(true);
    } else if (scenario === 'network') {
      setLoading(true);
      // Simulate network request
      setTimeout(() => {
        setLoading(false);
        setShouldThrow(true);
      }, 100);
    } else if (scenario === 'form-submission') {
      setLoading(true);
      // Simulate form submission error
      setTimeout(() => {
        setLoading(false);
        setShouldThrow(true);
      }, 200);
    }
  };

  if (shouldThrow) {
    const errorMessages = {
      immediate: 'Component failed to render',
      delayed: 'Delayed initialization error',
      'user-action': 'User action triggered error',
      network: 'Network request failed',
      'form-submission': 'Form validation failed',
    };
    throw new Error(errorMessages[scenario as keyof typeof errorMessages] || 'Unknown error');
  }

  if (loading) {
    return <div data-testid="loading-spinner">Loading...</div>;
  }

  return (
    <div data-testid="error-prone-component">
      <h2>Error Prone Component</h2>
      <p>This component can simulate various error scenarios.</p>
      <button 
        data-testid="trigger-error-button" 
        onClick={handleUserAction}
      >
        Trigger Action
      </button>
      <form data-testid="test-form">
        <input data-testid="test-input" placeholder="Test input" />
        <button 
          type="button" 
          data-testid="submit-form-button"
          onClick={handleUserAction}
        >
          Submit Form
        </button>
      </form>
    </div>
  );
};

describe('ErrorBoundary End-to-End Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;
  let mockLocalStorage: any;
  let mockSessionStorage: any;
  let mockWindowOpen: ReturnType<typeof vi.fn>;
  let mockHistory: any;

  beforeEach(() => {
    user = userEvent.setup();

    // Mock console.error
    mockConsoleError = vi.fn();
    vi.stubGlobal('console', { ...console, error: mockConsoleError });

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Mock sessionStorage
    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('sessionStorage', mockSessionStorage);

    // Mock fetch
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Mock window.open
    mockWindowOpen = vi.fn();
    vi.stubGlobal('open', mockWindowOpen);

    // Mock history
    mockHistory = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    };
    vi.stubGlobal('history', mockHistory);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Error Recovery Workflows', () => {
    it('should handle immediate error with complete recovery workflow', async () => {
      let errorScenario: 'none' | 'immediate' = 'immediate';
      
      const TestApp = () => (
        <MockRouter>
          <AppLayout>
            <ErrorBoundary enableReporting={true} showErrorDetails={true}>
              <ErrorProneComponent scenario={errorScenario} />
            </ErrorBoundary>
          </AppLayout>
        </MockRouter>
      );

      const { rerender } = render(<TestApp />);

      // 1. Verify error is displayed
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('home-button')).toBeInTheDocument();
      expect(screen.getByTestId('report-button')).toBeInTheDocument();

      // 2. User views error details
      const showDetailsButton = screen.getByTestId('show-details-button');
      await user.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-details')).toBeInTheDocument();
      });

      // 3. User attempts retry (should fail first time)
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Try Again \(1\/3\)/)).toBeInTheDocument();
      });

      // 4. User reports the error
      const reportButton = screen.getByTestId('report-button');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      // Add user description
      const descriptionTextarea = screen.getByTestId('user-description');
      await user.type(descriptionTextarea, 'The component failed to load immediately after page refresh');

      // Submit report
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, reportId: 'report-123' }),
      });

      const submitReportButton = screen.getByTestId('submit-report-button');
      await user.click(submitReportButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/error-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"errorId"'),
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('report-success')).toBeInTheDocument();
      });

      // 5. User successfully recovers by fixing the issue
      errorScenario = 'none';
      await user.click(retryButton);

      rerender(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('error-prone-component')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    it('should handle user-triggered error with navigation recovery', async () => {
      render(
        <MockRouter>
          <AppLayout>
            <ErrorBoundary enableReporting={true}>
              <ErrorProneComponent scenario="user-action" />
            </ErrorBoundary>
          </AppLayout>
        </MockRouter>
      );

      // 1. User interacts with component normally
      expect(screen.getByTestId('error-prone-component')).toBeInTheDocument();
      expect(screen.getByTestId('trigger-error-button')).toBeInTheDocument();

      // 2. User triggers an error through interaction
      const triggerButton = screen.getByTestId('trigger-error-button');
      await user.click(triggerButton);

      // 3. Error boundary catches the error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // 4. User chooses to navigate home instead of retry
      const homeButton = screen.getByTestId('home-button');
      await user.click(homeButton);

      // 5. Verify navigation occurred
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/');
    });

    it('should handle form submission error with detailed reporting', async () => {
      render(
        <MockRouter>
          <AppLayout>
            <ErrorBoundary enableReporting={true} showErrorDetails={true}>
              <ErrorProneComponent scenario="form-submission" />
            </ErrorBoundary>
          </AppLayout>
        </MockRouter>
      );

      // 1. User fills out form
      const testInput = screen.getByTestId('test-input');
      await user.type(testInput, 'test data');

      // 2. User submits form which triggers error
      const submitButton = screen.getByTestId('submit-form-button');
      await user.click(submitButton);

      // 3. Loading state is shown briefly
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      // 4. Error boundary catches the form submission error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // 5. User reports error with detailed context
      const reportButton = screen.getByTestId('report-button');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      const descriptionTextarea = screen.getByTestId('user-description');
      await user.type(descriptionTextarea, 'Form submission failed after entering valid data. The error occurred immediately after clicking submit.');

      // 6. API fails, user uses mailto fallback
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const submitReportButton = screen.getByTestId('submit-report-button');
      await user.click(submitReportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-error')).toBeInTheDocument();
      });

      const mailtoButton = screen.getByTestId('mailto-fallback');
      await user.click(mailtoButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:')
      );
    });
  });

  describe('Multi-Step Error Recovery Workflows', () => {
    it('should handle multiple retry attempts with escalating support', async () => {
      render(
        <ErrorBoundary enableReporting={true} showErrorDetails={true}>
          <ErrorProneComponent scenario="immediate" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-button');

      // First retry attempt
      await user.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/Try Again \(1\/3\)/)).toBeInTheDocument();
      });

      // Second retry attempt
      await user.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/Try Again \(2\/3\)/)).toBeInTheDocument();
      });

      // Third retry attempt
      await user.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/Try Again \(3\/3\)/)).toBeInTheDocument();
      });

      // Fourth attempt should be disabled and show escalation options
      await user.click(retryButton);
      await waitFor(() => {
        expect(screen.getByTestId('max-retries-message')).toBeInTheDocument();
        expect(retryButton).toBeDisabled();
      });

      // Should show additional support options
      expect(screen.getByTestId('contact-support-button')).toBeInTheDocument();
      expect(screen.getByTestId('report-button')).toBeInTheDocument();
    });

    it('should handle network error with automatic retry and manual intervention', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorProneComponent scenario="network" />
        </ErrorBoundary>
      );

      // Trigger network error
      const triggerButton = screen.getByTestId('trigger-error-button');
      await user.click(triggerButton);

      // Loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      // Network error caught
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should show network-specific error UI
      expect(screen.getByTestId('network-error-ui')).toBeInTheDocument();
      expect(screen.getByText(/Connection Issue/)).toBeInTheDocument();

      // User manually retries
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Should show retry attempt
      await waitFor(() => {
        expect(screen.getByText(/Try Again \(1\/3\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience Workflows', () => {
    it('should provide accessible error recovery workflow', async () => {
      render(
        <ErrorBoundary enableReporting={true} showErrorDetails={true}>
          <ErrorProneComponent scenario="immediate" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify ARIA labels and roles
      const errorBoundary = screen.getByTestId('error-boundary');
      expect(errorBoundary).toHaveAttribute('role', 'alert');
      expect(errorBoundary).toHaveAttribute('aria-live', 'assertive');

      // Verify keyboard navigation
      const retryButton = screen.getByTestId('retry-button');
      const homeButton = screen.getByTestId('home-button');
      const reportButton = screen.getByTestId('report-button');

      // Tab through buttons
      await user.tab();
      expect(retryButton).toHaveFocus();

      await user.tab();
      expect(homeButton).toHaveFocus();

      await user.tab();
      expect(reportButton).toHaveFocus();

      // Activate with keyboard
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      // Verify dialog accessibility
      const dialog = screen.getByTestId('report-dialog');
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should provide clear user feedback throughout error workflow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, reportId: 'report-123' }),
      });

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorProneComponent scenario="immediate" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // 1. Clear error message
      expect(screen.getByTestId('error-message')).toHaveTextContent(/Something went wrong/);

      // 2. Report error with loading feedback
      const reportButton = screen.getByTestId('report-button');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-report-button');
      await user.click(submitButton);

      // 3. Loading state during submission
      await waitFor(() => {
        expect(screen.getByTestId('report-loading')).toBeInTheDocument();
      });

      // 4. Success feedback
      await waitFor(() => {
        expect(screen.getByTestId('report-success')).toBeInTheDocument();
      });

      expect(screen.getByText(/Bug report submitted successfully/)).toBeInTheDocument();
    });
  });

  describe('Cross-Browser and Device Compatibility Workflows', () => {
    it('should handle touch interactions on mobile devices', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorProneComponent scenario="user-action" />
        </ErrorBoundary>
      );

      // Simulate touch interaction
      const triggerButton = screen.getByTestId('trigger-error-button');
      fireEvent.touchStart(triggerButton);
      fireEvent.touchEnd(triggerButton);
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify mobile-optimized UI
      expect(screen.getByTestId('error-boundary')).toHaveClass('mobile-optimized');
    });

    it('should handle offline scenarios gracefully', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorProneComponent scenario="immediate" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Try to report error while offline
      const reportButton = screen.getByTestId('report-button');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-report-button');
      await user.click(submitButton);

      // Should show offline message and queue for later
      await waitFor(() => {
        expect(screen.getByTestId('offline-message')).toBeInTheDocument();
      });

      expect(screen.getByText(/Report will be sent when connection is restored/)).toBeInTheDocument();
    });
  });

  describe('Performance and Stress Test Workflows', () => {
    it('should handle rapid error occurrences without degradation', async () => {
      const startTime = performance.now();

      // Render multiple error boundaries rapidly
      for (let i = 0; i < 10; i++) {
        render(
          <ErrorBoundary key={i}>
            <ErrorProneComponent scenario="immediate" />
          </ErrorBoundary>
        );
      }

      // Wait for all errors to be processed
      await waitFor(() => {
        const errorBoundaries = screen.getAllByTestId('error-boundary');
        expect(errorBoundaries).toHaveLength(10);
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should handle multiple errors efficiently
      expect(processingTime).toBeLessThan(1000);
    });

    it('should maintain responsiveness during error reporting', async () => {
      // Mock slow API response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true }),
          }), 2000)
        )
      );

      render(
        <ErrorBoundary enableReporting={true}>
          <ErrorProneComponent scenario="immediate" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Start error reporting
      const reportButton = screen.getByTestId('report-button');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-report-button');
      await user.click(submitButton);

      // UI should remain responsive during slow API call
      await waitFor(() => {
        expect(screen.getByTestId('report-loading')).toBeInTheDocument();
      });

      // User should be able to cancel
      const cancelButton = screen.getByTestId('cancel-report-button');
      expect(cancelButton).toBeEnabled();
      
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('report-dialog')).not.toBeInTheDocument();
      });
    });
  });
});