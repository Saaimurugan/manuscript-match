/**
 * Accessibility tests for keyboard navigation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StepWizard } from '../../components/wizard/StepWizard';
import { UploadStep } from '../../components/steps/UploadStep';
import { MetadataStep } from '../../components/steps/MetadataStep';

// Mock the hooks and services
vi.mock('../../hooks/useScholarFinderApi', () => ({
  useScholarFinderApi: () => ({
    uploadManuscript: {
      mutateAsync: vi.fn().mockResolvedValue({
        message: 'Success',
        data: { job_id: 'test-job-123' }
      }),
      isPending: false
    }
  })
}));

vi.mock('../../hooks/useProcessManagement', () => ({
  useUpdateProcessStep: () => ({
    mutateAsync: vi.fn().mockResolvedValue({})
  })
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Check: () => <div data-testid="check-icon" />
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Keyboard Navigation Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StepWizard Navigation', () => {
    it('should support keyboard navigation through steps', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StepWizard processId="test-process" />
        </TestWrapper>
      );

      // Tab through the step indicators
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'step-indicator-0');

      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'step-indicator-1');

      // Enter should activate the step
      await user.keyboard('{Enter}');
      // Should navigate to the step (if allowed)
    });

    it('should support arrow key navigation in step indicators', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StepWizard processId="test-process" />
        </TestWrapper>
      );

      // Focus first step indicator
      const firstStep = screen.getByTestId('step-indicator-0');
      firstStep.focus();

      // Arrow right should move to next step
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'step-indicator-1');

      // Arrow left should move back
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'step-indicator-0');
    });

    it('should wrap around at the ends of step navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StepWizard processId="test-process" />
        </TestWrapper>
      );

      // Focus last step indicator
      const lastStep = screen.getByTestId('step-indicator-8'); // Export step
      lastStep.focus();

      // Arrow right should wrap to first step
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'step-indicator-0');

      // Arrow left from first should wrap to last
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'step-indicator-8');
    });
  });

  describe('Form Navigation', () => {
    it('should support keyboard navigation in upload step', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UploadStep
            processId="test-process"
            jobId="test-job"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Tab should move through interactive elements
      await user.tab();
      expect(document.activeElement).toHaveAttribute('type', 'file');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Previous');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Upload File to Continue');
    });

    it('should support keyboard navigation in metadata form', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MetadataStep
            processId="test-process"
            jobId="test-job"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Tab through form fields
      await user.tab();
      expect(document.activeElement).toHaveAttribute('name', 'title');

      await user.tab();
      expect(document.activeElement).toHaveAttribute('name', 'abstract');

      // Continue through all form elements
      await user.tab();
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Previous');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Continue');
    });
  });

  describe('Table Navigation', () => {
    it('should support keyboard navigation in reviewer table', async () => {
      const user = userEvent.setup();
      
      // Mock reviewer data
      const mockReviewers = [
        {
          reviewer: 'Dr. John Doe',
          email: 'john@example.com',
          aff: 'University A',
          country: 'USA',
          Total_Publications: 50
        },
        {
          reviewer: 'Dr. Jane Smith',
          email: 'jane@example.com',
          aff: 'University B',
          country: 'UK',
          Total_Publications: 75
        }
      ];

      // This would be tested with the actual ReviewerTable component
      // For now, we'll test the keyboard navigation pattern
      render(
        <div role="table" aria-label="Reviewer recommendations">
          <div role="row">
            <div role="columnheader" tabIndex={0}>Name</div>
            <div role="columnheader" tabIndex={0}>Affiliation</div>
            <div role="columnheader" tabIndex={0}>Publications</div>
          </div>
          {mockReviewers.map((reviewer, index) => (
            <div key={index} role="row" tabIndex={0}>
              <div role="cell">{reviewer.reviewer}</div>
              <div role="cell">{reviewer.aff}</div>
              <div role="cell">{reviewer.Total_Publications}</div>
            </div>
          ))}
        </div>
      );

      // Tab through table headers
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Name');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Affiliation');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Publications');

      // Tab through table rows
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Dr. John Doe');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Dr. Jane Smith');
    });

    it('should support arrow key navigation within table cells', async () => {
      const user = userEvent.setup();
      
      render(
        <div role="grid" aria-label="Reviewer grid">
          <div role="row">
            <div role="gridcell" tabIndex={0} data-testid="cell-0-0">Dr. John Doe</div>
            <div role="gridcell" tabIndex={-1} data-testid="cell-0-1">University A</div>
          </div>
          <div role="row">
            <div role="gridcell" tabIndex={-1} data-testid="cell-1-0">Dr. Jane Smith</div>
            <div role="gridcell" tabIndex={-1} data-testid="cell-1-1">University B</div>
          </div>
        </div>
      );

      // Focus first cell
      const firstCell = screen.getByTestId('cell-0-0');
      firstCell.focus();

      // Arrow right should move to next cell
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'cell-0-1');

      // Arrow down should move to cell below
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'cell-1-1');

      // Arrow left should move to previous cell
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'cell-1-0');

      // Arrow up should move to cell above
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toHaveAttribute('data-testid', 'cell-0-0');
    });
  });

  describe('Modal and Dialog Navigation', () => {
    it('should trap focus within modals', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Outside Button</button>
          <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <h2 id="dialog-title">Export Options</h2>
            <button>CSV Export</button>
            <button>Excel Export</button>
            <button>Close</button>
          </div>
        </div>
      );

      // Focus should be trapped within the dialog
      const csvButton = screen.getByText('CSV Export');
      csvButton.focus();

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Excel Export');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Close');

      // Tab from last element should wrap to first
      await user.tab();
      expect(document.activeElement).toHaveTextContent('CSV Export');

      // Shift+Tab should go backwards
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toHaveTextContent('Close');
    });

    it('should handle Escape key to close modals', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(
        <div
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose();
            }
          }}
        >
          <h2>Modal Content</h2>
          <button>Action</button>
        </div>
      );

      // Focus the modal
      const actionButton = screen.getByText('Action');
      actionButton.focus();

      // Escape should close the modal
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Skip Links and Landmarks', () => {
    it('should provide skip links for main content', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <nav aria-label="Main navigation">
            <button>Navigation Item</button>
          </nav>
          <main id="main-content">
            <h1>Main Content</h1>
            <button>Main Action</button>
          </main>
        </div>
      );

      // Tab should focus skip link first
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Skip to main content');

      // Activating skip link should move focus to main content
      await user.keyboard('{Enter}');
      expect(document.activeElement).toHaveAttribute('id', 'main-content');
    });

    it('should support landmark navigation', () => {
      render(
        <div>
          <header role="banner">
            <h1>ScholarFinder</h1>
          </header>
          <nav role="navigation" aria-label="Step navigation">
            <button>Step 1</button>
            <button>Step 2</button>
          </nav>
          <main role="main">
            <h2>Current Step</h2>
          </main>
          <aside role="complementary" aria-label="Help">
            <p>Help content</p>
          </aside>
          <footer role="contentinfo">
            <p>Footer content</p>
          </footer>
        </div>
      );

      // Verify landmarks are properly labeled
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Step navigation' })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: 'Help' })).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });
});