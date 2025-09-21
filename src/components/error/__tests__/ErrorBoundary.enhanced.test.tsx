import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for enhanced bug reporting');
  }
  return <div>No error</div>;
};

// Mock the errorReportService
vi.mock('@/services/errorReportService', () => ({
  errorReportService: {
    generateReport: vi.fn().mockReturnValue({
      errorId: 'test-error-123',
      message: 'Test error for enhanced bug reporting',
      timestamp: '2024-01-01T00:00:00.000Z',
      severity: 'medium',
      category: 'runtime',
    }),
    submitReport: vi.fn().mockResolvedValue({
      success: true,
      reportId: 'test-report-456',
    }),
    saveReportLocally: vi.fn(),
  },
}));

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('ErrorBoundary Enhanced Bug Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
  });

  describe('Enhanced Bug Report Button', () => {
    it('shows enhanced report bug button with proper states', () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      expect(reportButton).toBeInTheDocument();
      expect(reportButton).not.toBeDisabled();
    });

    it('opens bug report dialog when clicked', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByText('Report Bug')).toBeInTheDocument();
        expect(screen.getByText(/Help us fix this issue/)).toBeInTheDocument();
      });
    });
  });

  describe('Bug Report Dialog', () => {
    it('displays error summary in dialog', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByText('Error Summary')).toBeInTheDocument();
        expect(screen.getByText(/runtime/)).toBeInTheDocument();
        expect(screen.getByText(/medium severity/)).toBeInTheDocument();
      });
    });

    it('includes user description textarea', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('describe the steps'));
      });
    });

    it('allows user to enter description', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'I was clicking the submit button when this happened' } });
        expect(textarea).toHaveValue('I was clicking the submit button when this happened');
      });
    });

    it('has cancel and send report buttons', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send report/i })).toBeInTheDocument();
      });
    });
  });

  describe('Report Status Indicators', () => {
    it('shows sending state during report submission', async () => {
      const { errorReportService } = await import('@/services/errorReportService');
      
      // Mock a delayed response
      vi.mocked(errorReportService.submitReport).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send report/i });
        fireEvent.click(sendButton);
      });

      // Should show sending state
      expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument();
      expect(screen.getByText(/submitting your bug report/i)).toBeInTheDocument();
    });

    it('shows success state after successful submission', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send report/i });
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/bug report submitted successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/report sent/i)).toBeInTheDocument();
      });
    });

    it('shows failure state when submission fails', async () => {
      const { errorReportService } = await import('@/services/errorReportService');
      
      // Mock failed submission
      vi.mocked(errorReportService.submitReport).mockResolvedValue({
        success: false,
        error: 'Network error occurred',
      });

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send report/i });
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to submit bug report/i)).toBeInTheDocument();
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Report Submission Integration', () => {
    it('calls errorReportService with correct parameters', async () => {
      const { errorReportService } = await import('@/services/errorReportService');

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'User description here' } });
        
        const sendButton = screen.getByRole('button', { name: /send report/i });
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(errorReportService.generateReport).toHaveBeenCalledWith(
          expect.any(Error),
          expect.any(Object),
          expect.objectContaining({
            errorId: expect.any(String),
            category: 'runtime',
            severity: 'medium',
          })
        );

        expect(errorReportService.submitReport).toHaveBeenCalledWith(
          expect.any(Object),
          'User description here'
        );
      });
    });

    it('saves report locally as backup', async () => {
      const { errorReportService } = await import('@/services/errorReportService');

      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send report/i });
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(errorReportService.saveReportLocally).toHaveBeenCalled();
      });
    });
  });

  describe('Dialog Interaction', () => {
    it('closes dialog when cancel is clicked', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByText('Report Bug')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Report Bug')).not.toBeInTheDocument();
      });
    });

    it('closes dialog after successful submission', async () => {
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send report/i });
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Report Bug')).not.toBeInTheDocument();
      });
    });
  });
});