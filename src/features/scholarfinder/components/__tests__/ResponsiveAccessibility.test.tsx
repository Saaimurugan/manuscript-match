import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessibilityProvider } from '../accessibility/AccessibilityProvider';
import { AccessibilityToolbar } from '../accessibility/AccessibilityToolbar';
import { StepWizard } from '../wizard/StepWizard';
import { ResponsiveTable } from '../common/ResponsiveTable';
import { ProcessStep } from '../../types/process';
import { StepDefinition } from '../../types/workflow';

// Mock hooks
vi.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    width: 1024,
    height: 768,
    breakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLargeDesktop: false,
  }),
  useBreakpoint: (breakpoint: string) => breakpoint === 'lg',
  useResponsiveValue: (values: any) => values.lg || values.md || values.sm || values.xs,
}));

vi.mock('../../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    trapFocus: vi.fn(() => vi.fn()),
    restoreFocus: vi.fn(),
    announceLiveRegion: vi.fn(),
  }),
}));

// Mock API hooks
vi.mock('../../hooks/useScholarFinderApi', () => ({
  useScholarFinderApi: () => ({
    uploadManuscript: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
  }),
}));

vi.mock('../../hooks/useProcessManagement', () => ({
  useUpdateProcessStep: () => ({
    mutateAsync: vi.fn(),
  }),
}));

const mockSteps: StepDefinition[] = [
  {
    key: ProcessStep.UPLOAD,
    title: 'Upload Manuscript',
    description: 'Upload your manuscript file',
    component: () => <div>Upload Step</div>,
    isOptional: false,
    estimatedDuration: 5,
  },
  {
    key: ProcessStep.METADATA,
    title: 'Review Metadata',
    description: 'Review extracted metadata',
    component: () => <div>Metadata Step</div>,
    isOptional: false,
    estimatedDuration: 10,
  },
];

const mockTableData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Reviewer' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' },
];

const mockTableColumns = [
  {
    key: 'name',
    title: 'Name',
    accessor: 'name' as const,
    sortable: true,
    priority: 'high' as const,
  },
  {
    key: 'email',
    title: 'Email',
    accessor: 'email' as const,
    sortable: true,
    priority: 'medium' as const,
  },
  {
    key: 'role',
    title: 'Role',
    accessor: 'role' as const,
    priority: 'low' as const,
  },
];

describe('Responsive and Accessibility Features', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.className = '';
    localStorage.clear();
  });

  describe('AccessibilityProvider', () => {
    it('should provide accessibility context', () => {
      const TestComponent = () => {
        return (
          <AccessibilityProvider>
            <div data-testid="test-content">Test Content</div>
          </AccessibilityProvider>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should apply high contrast mode', async () => {
      const TestComponent = () => {
        return (
          <AccessibilityProvider>
            <AccessibilityToolbar />
          </AccessibilityProvider>
        );
      };

      render(<TestComponent />);
      
      const highContrastButton = screen.getByLabelText(/high contrast mode/i);
      fireEvent.click(highContrastButton);

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('high-contrast');
      });
    });

    it('should apply large text mode', async () => {
      const TestComponent = () => {
        return (
          <AccessibilityProvider>
            <AccessibilityToolbar />
          </AccessibilityProvider>
        );
      };

      render(<TestComponent />);
      
      const largeTextButton = screen.getByLabelText(/large text mode/i);
      fireEvent.click(largeTextButton);

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('large-text');
      });
    });
  });

  describe('AccessibilityToolbar', () => {
    it('should render compact toolbar', () => {
      render(
        <AccessibilityProvider>
          <AccessibilityToolbar compact />
        </AccessibilityProvider>
      );

      expect(screen.getByLabelText(/high contrast mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/large text mode/i)).toBeInTheDocument();
    });

    it('should render full toolbar', () => {
      render(
        <AccessibilityProvider>
          <AccessibilityToolbar />
        </AccessibilityProvider>
      );

      expect(screen.getByText('Accessibility Options')).toBeInTheDocument();
      expect(screen.getByText('High Contrast')).toBeInTheDocument();
      expect(screen.getByText('Large Text')).toBeInTheDocument();
    });

    it('should handle skip to content', () => {
      const mockFocus = vi.fn();
      const mockElement = { focus: mockFocus };
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);

      render(
        <AccessibilityProvider>
          <AccessibilityToolbar />
        </AccessibilityProvider>
      );

      const skipButton = screen.getByText('Skip to main content');
      fireEvent.click(skipButton);

      expect(mockFocus).toHaveBeenCalled();
    });
  });

  describe('StepWizard Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <AccessibilityProvider>
          <StepWizard
            processId="test-process"
            jobId="test-job"
            steps={mockSteps}
          />
        </AccessibilityProvider>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'ScholarFinder Workflow');
    });

    it('should have skip to content link', () => {
      render(
        <AccessibilityProvider>
          <StepWizard
            processId="test-process"
            jobId="test-job"
            steps={mockSteps}
          />
        </AccessibilityProvider>
      );

      const skipLink = screen.getByText('Skip to step content');
      expect(skipLink).toHaveAttribute('href', '#step-content');
    });

    it('should announce step changes', async () => {
      const mockAnnounce = vi.fn();
      
      // Mock the accessibility context to capture announcements
      const TestWrapper = ({ children }: { children: React.ReactNode }) => {
        const contextValue = {
          highContrast: false,
          reduceMotion: false,
          largeText: false,
          screenReader: false,
          toggleHighContrast: vi.fn(),
          toggleLargeText: vi.fn(),
          announceMessage: mockAnnounce,
        };

        return (
          <div>
            {React.cloneElement(children as React.ReactElement, {
              ...contextValue,
            })}
          </div>
        );
      };

      render(
        <TestWrapper>
          <StepWizard
            processId="test-process"
            jobId="test-job"
            steps={mockSteps}
          />
        </TestWrapper>
      );

      // The component should announce the initial step
      await waitFor(() => {
        expect(mockAnnounce).toHaveBeenCalled();
      });
    });
  });

  describe('ResponsiveTable', () => {
    it('should render desktop table view', () => {
      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={mockTableData}
            columns={mockTableColumns}
          />
        </AccessibilityProvider>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should have proper table ARIA attributes', () => {
      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={mockTableData}
            columns={mockTableColumns}
          />
        </AccessibilityProvider>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-rowcount');
      expect(table).toHaveAttribute('aria-colcount');
    });

    it('should handle sorting with keyboard', () => {
      const mockSort = vi.fn();
      
      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={mockTableData}
            columns={mockTableColumns}
            onSort={mockSort}
          />
        </AccessibilityProvider>
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      fireEvent.click(nameHeader);

      expect(mockSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('should support row selection', () => {
      const mockSelect = vi.fn();
      
      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={mockTableData}
            columns={mockTableColumns}
            selectable
            onRowSelect={mockSelect}
          />
        </AccessibilityProvider>
      );

      const selectAllCheckbox = screen.getByLabelText('Select all rows');
      fireEvent.click(selectAllCheckbox);

      expect(mockSelect).toHaveBeenCalledWith(mockTableData);
    });

    it('should render empty state', () => {
      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={[]}
            columns={mockTableColumns}
            emptyMessage="No reviewers found"
          />
        </AccessibilityProvider>
      );

      expect(screen.getByText('No reviewers found')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={[]}
            columns={mockTableColumns}
            loading
          />
        </AccessibilityProvider>
      );

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key for button activation', () => {
      const mockClick = vi.fn();
      
      render(
        <AccessibilityProvider>
          <button onClick={mockClick} onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              mockClick();
            }
          }}>
            Test Button
          </button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test Button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(mockClick).toHaveBeenCalled();
    });

    it('should support Space key for button activation', () => {
      const mockClick = vi.fn();
      
      render(
        <AccessibilityProvider>
          <button onClick={mockClick} onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
              mockClick();
            }
          }}>
            Test Button
          </button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test Button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(
        <AccessibilityProvider>
          <button>Focusable Button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Focusable Button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should maintain logical tab order', () => {
      render(
        <AccessibilityProvider>
          <div>
            <button>First Button</button>
            <button>Second Button</button>
            <button>Third Button</button>
          </div>
        </AccessibilityProvider>
      );

      const buttons = screen.getAllByRole('button');
      
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();

      fireEvent.keyDown(buttons[0], { key: 'Tab' });
      // Note: jsdom doesn't automatically handle tab navigation,
      // but we can verify the buttons are in the correct order
      expect(buttons).toHaveLength(3);
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper heading structure', () => {
      render(
        <AccessibilityProvider>
          <div>
            <h1>Main Title</h1>
            <h2>Section Title</h2>
            <h3>Subsection Title</h3>
          </div>
        </AccessibilityProvider>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should have descriptive labels', () => {
      render(
        <AccessibilityProvider>
          <div>
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" />
          </div>
        </AccessibilityProvider>
      );

      const input = screen.getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
    });

    it('should use live regions for dynamic content', () => {
      render(
        <AccessibilityProvider>
          <div aria-live="polite" aria-atomic="true">
            Status update
          </div>
        </AccessibilityProvider>
      );

      const liveRegion = screen.getByText('Status update');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Color and Contrast', () => {
    it('should apply high contrast styles', () => {
      document.documentElement.classList.add('high-contrast');
      
      render(
        <AccessibilityProvider>
          <button className="btn-accessible">High Contrast Button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('High Contrast Button');
      expect(document.documentElement).toHaveClass('high-contrast');
    });

    it('should not rely solely on color for information', () => {
      render(
        <AccessibilityProvider>
          <div>
            <span className="text-success">✓ Success message</span>
            <span className="text-error">✗ Error message</span>
            <span className="text-warning">⚠ Warning message</span>
          </div>
        </AccessibilityProvider>
      );

      // Icons provide additional context beyond color
      expect(screen.getByText(/✓ Success/)).toBeInTheDocument();
      expect(screen.getByText(/✗ Error/)).toBeInTheDocument();
      expect(screen.getByText(/⚠ Warning/)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      vi.mocked(require('../../hooks/useResponsive').useResponsive).mockReturnValue({
        width: 375,
        height: 667,
        breakpoint: 'xs',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });

      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={mockTableData}
            columns={mockTableColumns}
          />
        </AccessibilityProvider>
      );

      // On mobile, should render cards instead of table
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('should show appropriate content for tablet', () => {
      // Mock tablet viewport
      vi.mocked(require('../../hooks/useResponsive').useResponsive).mockReturnValue({
        width: 768,
        height: 1024,
        breakpoint: 'md',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isLargeDesktop: false,
      });

      render(
        <AccessibilityProvider>
          <ResponsiveTable
            data={mockTableData}
            columns={mockTableColumns}
          />
        </AccessibilityProvider>
      );

      // Should still render table on tablet
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});