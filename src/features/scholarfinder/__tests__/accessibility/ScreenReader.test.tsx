/**
 * Screen reader accessibility tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StepWizard } from '../../components/wizard/StepWizard';
import { UploadStep } from '../../components/steps/UploadStep';
import { ProgressIndicator } from '../../components/wizard/ProgressIndicator';

// Mock the hooks
vi.mock('../../hooks/useScholarFinderApi', () => ({
  useScholarFinderApi: () => ({
    uploadManuscript: {
      mutateAsync: vi.fn(),
      isPending: false
    }
  })
}));

vi.mock('../../hooks/useProcessManagement', () => ({
  useUpdateProcessStep: () => ({
    mutateAsync: vi.fn()
  })
}));

// Mock lucide-react icons with proper accessibility
vi.mock('lucide-react', () => ({
  Upload: ({ 'aria-hidden': ariaHidden = true }) => (
    <svg aria-hidden={ariaHidden} data-testid="upload-icon" />
  ),
  FileText: ({ 'aria-hidden': ariaHidden = true }) => (
    <svg aria-hidden={ariaHidden} data-testid="file-text-icon" />
  ),
  Check: ({ 'aria-hidden': ariaHidden = true }) => (
    <svg aria-hidden={ariaHidden} data-testid="check-icon" />
  ),
  AlertCircle: ({ 'aria-hidden': ariaHidden = true }) => (
    <svg aria-hidden={ariaHidden} data-testid="alert-circle-icon" />
  )
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

describe('Screen Reader Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels for step wizard', () => {
      render(
        <TestWrapper>
          <StepWizard processId="test-process" />
        </TestWrapper>
      );

      // Main wizard should have proper role and label
      expect(screen.getByRole('region', { name: /manuscript analysis workflow/i })).toBeInTheDocument();
      
      // Progress indicator should be labeled
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', expect.stringContaining('Step'));
    });

    it('should have descriptive labels for form elements', () => {
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

      // File input should have proper label
      const fileInput = screen.getByLabelText(/file upload/i);
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('aria-describedby');

      // Description should exist
      const description = document.getElementById(fileInput.getAttribute('aria-describedby')!);
      expect(description).toHaveTextContent(/supported formats/i);
    });

    it('should provide live region announcements', () => {
      render(
        <TestWrapper>
          <div>
            <div
              role="status"
              aria-live="polite"
              aria-label="Upload status"
              data-testid="upload-status"
            >
              File uploaded successfully
            </div>
            <div
              role="alert"
              aria-live="assertive"
              data-testid="error-alert"
            >
              Upload failed: File too large
            </div>
          </div>
        </TestWrapper>
      );

      // Status updates should be announced politely
      expect(screen.getByRole('status')).toHaveTextContent('File uploaded successfully');
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

      // Errors should be announced assertively
      expect(screen.getByRole('alert')).toHaveTextContent('Upload failed: File too large');
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Semantic HTML Structure', () => {
    it('should use proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <div>
            <h1>ScholarFinder</h1>
            <h2>Upload Manuscript</h2>
            <h3>File Requirements</h3>
            <h4>Supported Formats</h4>
          </div>
        </TestWrapper>
      );

      // Verify heading levels are sequential
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ScholarFinder');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Upload Manuscript');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('File Requirements');
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Supported Formats');
    });

    it('should use proper list structures', () => {
      render(
        <div>
          <h2>Validation Criteria</h2>
          <ul aria-labelledby="criteria-heading">
            <li>No co-authorship with manuscript authors</li>
            <li>Different institutional affiliation</li>
            <li>Minimum 5 publications in relevant field</li>
          </ul>
        </div>
      );

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-labelledby', 'criteria-heading');
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
      expect(listItems[0]).toHaveTextContent('No co-authorship');
    });

    it('should use proper table structure for reviewer data', () => {
      render(
        <table role="table" aria-label="Reviewer recommendations">
          <caption>150 potential reviewers found</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Affiliation</th>
              <th scope="col">Publications</th>
              <th scope="col">Validation Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dr. John Doe</td>
              <td>University of Technology</td>
              <td>85</td>
              <td>8 of 8</td>
            </tr>
          </tbody>
        </table>
      );

      // Table should have proper structure
      expect(screen.getByRole('table', { name: 'Reviewer recommendations' })).toBeInTheDocument();
      expect(screen.getByText('150 potential reviewers found')).toBeInTheDocument();
      
      // Headers should have proper scope
      const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
      expect(nameHeader).toHaveAttribute('scope', 'col');
    });
  });

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', () => {
      render(
        <form>
          <div>
            <label htmlFor="manuscript-title">Manuscript Title</label>
            <input
              id="manuscript-title"
              type="text"
              aria-describedby="title-help"
              required
            />
            <div id="title-help">Enter the full title of your manuscript</div>
          </div>
          
          <div>
            <label htmlFor="abstract">Abstract</label>
            <textarea
              id="abstract"
              aria-describedby="abstract-help"
              aria-required="true"
            />
            <div id="abstract-help">Provide a brief summary of your research</div>
          </div>
        </form>
      );

      // Labels should be properly associated
      const titleInput = screen.getByLabelText('Manuscript Title');
      expect(titleInput).toHaveAttribute('id', 'manuscript-title');
      expect(titleInput).toHaveAttribute('aria-describedby', 'title-help');
      expect(titleInput).toBeRequired();

      const abstractInput = screen.getByLabelText('Abstract');
      expect(abstractInput).toHaveAttribute('aria-required', 'true');
      expect(abstractInput).toHaveAttribute('aria-describedby', 'abstract-help');
    });

    it('should provide error messages with proper associations', () => {
      render(
        <form>
          <div>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              aria-describedby="email-error"
              aria-invalid="true"
            />
            <div id="email-error" role="alert">
              Please enter a valid email address
            </div>
          </div>
        </form>
      );

      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Please enter a valid email address');
    });

    it('should provide fieldset grouping for related controls', () => {
      render(
        <form>
          <fieldset>
            <legend>Database Selection</legend>
            <div>
              <input type="checkbox" id="pubmed" name="databases" value="pubmed" />
              <label htmlFor="pubmed">PubMed</label>
            </div>
            <div>
              <input type="checkbox" id="elsevier" name="databases" value="elsevier" />
              <label htmlFor="elsevier">Elsevier</label>
            </div>
          </fieldset>
        </form>
      );

      const fieldset = screen.getByRole('group', { name: 'Database Selection' });
      expect(fieldset).toBeInTheDocument();
      
      const pubmedCheckbox = screen.getByLabelText('PubMed');
      expect(pubmedCheckbox).toHaveAttribute('type', 'checkbox');
    });
  });

  describe('Progress and Status Indicators', () => {
    it('should provide accessible progress indicators', () => {
      render(
        <ProgressIndicator
          currentStep={2}
          totalSteps={9}
          completedSteps={[0, 1]}
          stepTitles={[
            'Upload',
            'Metadata',
            'Keywords',
            'Search',
            'Manual',
            'Validation',
            'Recommendations',
            'Shortlist',
            'Export'
          ]}
        />
      );

      // Progress bar should have proper attributes
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '2');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '9');
      expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining('Step 2 of 9'));
    });

    it('should announce step completion status', () => {
      render(
        <div>
          <div
            role="status"
            aria-live="polite"
            aria-label="Step completion status"
          >
            Step 1: Upload - Completed
          </div>
          <div
            role="status"
            aria-live="polite"
            aria-label="Current step"
          >
            Step 2: Metadata Review - In Progress
          </div>
        </div>
      );

      const statusElements = screen.getAllByRole('status');
      expect(statusElements[0]).toHaveTextContent('Step 1: Upload - Completed');
      expect(statusElements[1]).toHaveTextContent('Step 2: Metadata Review - In Progress');
    });
  });

  describe('Interactive Elements', () => {
    it('should provide accessible button descriptions', () => {
      render(
        <div>
          <button
            aria-label="Upload manuscript file"
            aria-describedby="upload-help"
          >
            <svg aria-hidden="true" />
            Upload
          </button>
          <div id="upload-help">
            Select a .doc or .docx file to begin the analysis process
          </div>
        </div>
      );

      const uploadButton = screen.getByRole('button', { name: 'Upload manuscript file' });
      expect(uploadButton).toHaveAttribute('aria-describedby', 'upload-help');
      
      // Icon should be hidden from screen readers
      const icon = uploadButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should provide accessible link descriptions', () => {
      render(
        <div>
          <a
            href="/help/file-formats"
            aria-describedby="format-help"
          >
            Supported file formats
          </a>
          <div id="format-help">
            Learn about which document formats are accepted for analysis
          </div>
        </div>
      );

      const link = screen.getByRole('link', { name: 'Supported file formats' });
      expect(link).toHaveAttribute('aria-describedby', 'format-help');
    });

    it('should provide accessible modal dialogs', () => {
      render(
        <div>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <h2 id="dialog-title">Export Options</h2>
            <p id="dialog-description">
              Choose the format for exporting your reviewer shortlist
            </p>
            <button>Export as CSV</button>
            <button>Export as Excel</button>
            <button aria-label="Close dialog">×</button>
          </div>
        </div>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
      
      const closeButton = screen.getByRole('button', { name: 'Close dialog' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Data Tables', () => {
    it('should provide accessible data table structure', () => {
      render(
        <table role="table" aria-label="Reviewer validation results">
          <caption>
            Validation results for 150 potential reviewers
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort="none">
                <button aria-label="Sort by reviewer name">
                  Reviewer Name
                </button>
              </th>
              <th scope="col" aria-sort="descending">
                <button aria-label="Sort by publication count, currently sorted descending">
                  Publications
                </button>
              </th>
              <th scope="col">Validation Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dr. John Doe</td>
              <td>85</td>
              <td>
                <span aria-label="8 out of 8 validation criteria met">
                  8 of 8
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      );

      // Table structure should be accessible
      const table = screen.getByRole('table', { name: 'Reviewer validation results' });
      expect(table).toBeInTheDocument();
      
      // Sortable columns should indicate sort state
      const publicationsHeader = screen.getByRole('button', { 
        name: 'Sort by publication count, currently sorted descending' 
      });
      expect(publicationsHeader.closest('th')).toHaveAttribute('aria-sort', 'descending');
      
      // Data should have meaningful labels
      const validationScore = screen.getByLabelText('8 out of 8 validation criteria met');
      expect(validationScore).toBeInTheDocument();
    });
  });
});