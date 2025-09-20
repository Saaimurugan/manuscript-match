/**
 * Integration tests for the complete manuscript analysis workflow
 * Tests the end-to-end process from file upload to reviewer recommendations
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, createMockFile, createMockProcess } from '../utils';
import { ProcessWorkflow } from '../../components/process/ProcessWorkflow';
import { FileUpload } from '../../components/upload/FileUpload';
import { DataExtraction } from '../../components/extraction/DataExtraction';
import { KeywordEnhancement } from '../../components/keywords/KeywordEnhancement';
import { ReviewerSearch } from '../../components/search/ReviewerSearch';
import { AuthorValidation } from '../../components/validation/AuthorValidation';
import { ReviewerResults } from '../../components/results/ReviewerResults';
import { ShortlistManager } from '../../components/shortlist/ShortlistManager';
import { server } from '../integration-setup';
import { http, HttpResponse } from 'msw';

describe('Manuscript Analysis Workflow Integration', () => {
  const mockProcess = createMockProcess();

  beforeEach(() => {
    localStorage.setItem('scholarfinder_token', 'valid-token');
    vi.clearAllMocks();
  });

  describe('Complete Workflow', () => {
    it('should complete full manuscript analysis workflow', async () => {
      const user = userEvent.setup();

      render(<ProcessWorkflow processId={mockProcess.id} />);

      // Step 1: File Upload
      await waitFor(() => {
        expect(screen.getByText(/upload manuscript/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/choose file/i);
      const mockFile = createMockFile('manuscript.pdf');
      
      await user.upload(fileInput, mockFile);

      // Wait for upload to complete and move to next step
      await waitFor(() => {
        expect(screen.getByText(/metadata extraction/i)).toBeInTheDocument();
      });

      // Step 2: Metadata Review
      expect(screen.getByText('Test Manuscript')).toBeInTheDocument();
      expect(screen.getByText('Test abstract content')).toBeInTheDocument();

      // Proceed to next step
      fireEvent.click(screen.getByText(/continue/i));

      // Step 3: Keyword Enhancement
      await waitFor(() => {
        expect(screen.getByText(/keyword enhancement/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/enhance keywords/i));

      await waitFor(() => {
        expect(screen.getByText(/enhanced keywords/i)).toBeInTheDocument();
      });

      // Proceed to next step
      fireEvent.click(screen.getByText(/continue/i));

      // Step 4: Database Search
      await waitFor(() => {
        expect(screen.getByText(/database search/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/start search/i));

      await waitFor(() => {
        expect(screen.getByText(/search completed/i)).toBeInTheDocument();
      });

      // Proceed to next step
      fireEvent.click(screen.getByText(/continue/i));

      // Step 5: Author Validation
      await waitFor(() => {
        expect(screen.getByText(/author validation/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/validate authors/i));

      await waitFor(() => {
        expect(screen.getByText(/validation completed/i)).toBeInTheDocument();
      });

      // Proceed to next step
      fireEvent.click(screen.getByText(/continue/i));

      // Step 6: Reviewer Results
      await waitFor(() => {
        expect(screen.getByText(/reviewer recommendations/i)).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test University')).toBeInTheDocument();

      // Create shortlist
      fireEvent.click(screen.getByText(/create shortlist/i));

      await waitFor(() => {
        expect(screen.getByText(/shortlist created/i)).toBeInTheDocument();
      });
    });

    it('should handle errors gracefully throughout workflow', async () => {
      // Mock file upload error
      server.use(
        http.post('/api/processes/:id/upload', () => {
          return HttpResponse.json(
            { type: 'FILE_ERROR', message: 'File too large' },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();

      render(<ProcessWorkflow processId={mockProcess.id} />);

      // Try to upload file
      const fileInput = screen.getByLabelText(/choose file/i);
      const mockFile = createMockFile('large-file.pdf');
      
      await user.upload(fileInput, mockFile);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });

      // Should allow retry
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('should save progress and allow resuming', async () => {
      render(<ProcessWorkflow processId={mockProcess.id} />);

      // Complete first step
      const user = userEvent.setup();
      const fileInput = screen.getByLabelText(/choose file/i);
      const mockFile = createMockFile('manuscript.pdf');
      
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/metadata extraction/i)).toBeInTheDocument();
      });

      // Simulate page refresh by re-rendering
      render(<ProcessWorkflow processId={mockProcess.id} />);

      // Should resume from metadata step
      await waitFor(() => {
        expect(screen.getByText(/metadata extraction/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload Integration', () => {
    it('should handle file upload with progress tracking', async () => {
      const user = userEvent.setup();
      const onUploadComplete = vi.fn();

      render(
        <FileUpload 
          processId={mockProcess.id} 
          onUploadComplete={onUploadComplete}
        />
      );

      const fileInput = screen.getByLabelText(/choose file/i);
      const mockFile = createMockFile('manuscript.pdf');
      
      await user.upload(fileInput, mockFile);

      // Should show upload progress
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledWith({
          fileId: 'file-1',
          fileName: 'test.pdf',
          fileSize: 1024,
          uploadedAt: expect.any(String)
        });
      });
    });

    it('should validate file types and sizes', async () => {
      const user = userEvent.setup();

      render(<FileUpload processId={mockProcess.id} />);

      // Try to upload unsupported file type
      const fileInput = screen.getByLabelText(/choose file/i);
      const invalidFile = createMockFile('document.txt', 'text/plain');
      
      await user.upload(fileInput, invalidFile);

      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });
  });

  describe('Metadata Extraction Integration', () => {
    it('should display extracted metadata and allow editing', async () => {
      render(<DataExtraction processId={mockProcess.id} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Manuscript')).toBeInTheDocument();
      });

      // Edit title
      const titleInput = screen.getByDisplayValue('Test Manuscript');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

      // Save changes
      fireEvent.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/metadata updated/i)).toBeInTheDocument();
      });
    });

    it('should handle metadata extraction errors', async () => {
      server.use(
        http.get('/api/processes/:id/metadata', () => {
          return HttpResponse.json(
            { type: 'EXTRACTION_ERROR', message: 'Failed to extract metadata' },
            { status: 500 }
          );
        })
      );

      render(<DataExtraction processId={mockProcess.id} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to extract metadata/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });
  });

  describe('Keyword Enhancement Integration', () => {
    it('should enhance keywords and generate search strings', async () => {
      render(<KeywordEnhancement processId={mockProcess.id} />);

      // Initial keywords should be displayed
      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
        expect(screen.getByText('manuscript')).toBeInTheDocument();
      });

      // Enhance keywords
      fireEvent.click(screen.getByText(/enhance keywords/i));

      await waitFor(() => {
        expect(screen.getByText('analysis')).toBeInTheDocument();
        expect(screen.getByText('research')).toBeInTheDocument();
      });

      // Check search strings
      expect(screen.getByText(/pubmed/i)).toBeInTheDocument();
      expect(screen.getByText('(test OR manuscript) AND analysis')).toBeInTheDocument();
    });

    it('should allow keyword selection customization', async () => {
      render(<KeywordEnhancement processId={mockProcess.id} />);

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });

      // Enhance keywords first
      fireEvent.click(screen.getByText(/enhance keywords/i));

      await waitFor(() => {
        expect(screen.getByText('analysis')).toBeInTheDocument();
      });

      // Deselect a keyword
      const analysisCheckbox = screen.getByRole('checkbox', { name: /analysis/i });
      fireEvent.click(analysisCheckbox);

      // Save selection
      fireEvent.click(screen.getByText(/save selection/i));

      await waitFor(() => {
        expect(screen.getByText(/selection updated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Database Search Integration', () => {
    it('should perform database search with progress tracking', async () => {
      render(<ReviewerSearch processId={mockProcess.id} />);

      // Start search
      fireEvent.click(screen.getByText(/start search/i));

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText(/searching databases/i)).toBeInTheDocument();
      });

      // Should show completion
      await waitFor(() => {
        expect(screen.getByText(/search completed/i)).toBeInTheDocument();
        expect(screen.getByText('525 potential reviewers found')).toBeInTheDocument();
      });
    });

    it('should handle manual reviewer search', async () => {
      render(<ReviewerSearch processId={mockProcess.id} />);

      // Switch to manual search
      fireEvent.click(screen.getByText(/manual search/i));

      // Search by name
      const nameInput = screen.getByPlaceholderText(/enter reviewer name/i);
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.click(screen.getByText(/search by name/i));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Author Validation Integration', () => {
    it('should validate authors with detailed results', async () => {
      render(<AuthorValidation processId={mockProcess.id} />);

      // Start validation
      fireEvent.click(screen.getByText(/validate authors/i));

      await waitFor(() => {
        expect(screen.getByText(/validation completed/i)).toBeInTheDocument();
      });

      // Check validation results
      expect(screen.getByText('420 validated reviewers')).toBeInTheDocument();
      expect(screen.getByText('105 excluded reviewers')).toBeInTheDocument();

      // Check step-by-step results
      expect(screen.getByText(/manuscript authors/i)).toBeInTheDocument();
      expect(screen.getByText(/co-authors/i)).toBeInTheDocument();
      expect(screen.getByText(/publications/i)).toBeInTheDocument();
    });

    it('should allow validation rule customization', async () => {
      render(<AuthorValidation processId={mockProcess.id} />);

      // Modify validation rules
      const minPublicationsInput = screen.getByLabelText(/minimum publications/i);
      fireEvent.change(minPublicationsInput, { target: { value: '5' } });

      // Re-validate
      fireEvent.click(screen.getByText(/validate authors/i));

      await waitFor(() => {
        expect(screen.getByText(/validation completed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Reviewer Results Integration', () => {
    it('should display and filter reviewer recommendations', async () => {
      render(<ReviewerResults processId={mockProcess.id} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Apply filters
      const countryFilter = screen.getByLabelText(/country/i);
      fireEvent.change(countryFilter, { target: { value: 'US' } });

      // Should update results
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle pagination for large result sets', async () => {
      // Mock large result set
      server.use(
        http.get('/api/processes/:id/recommendations', ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page') || '1';
          
          return HttpResponse.json({
            data: [createMockAuthor()],
            pagination: {
              page: parseInt(page),
              limit: 20,
              total: 100,
              totalPages: 5,
              hasNextPage: parseInt(page) < 5,
              hasPreviousPage: parseInt(page) > 1
            }
          });
        })
      );

      render(<ReviewerResults processId={mockProcess.id} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
      });

      // Navigate to next page
      fireEvent.click(screen.getByText(/next/i));

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
      });
    });
  });

  describe('Shortlist Management Integration', () => {
    it('should create and manage reviewer shortlists', async () => {
      render(<ShortlistManager processId={mockProcess.id} />);

      // Create new shortlist
      fireEvent.click(screen.getByText(/create shortlist/i));

      // Fill in shortlist details
      const nameInput = screen.getByLabelText(/shortlist name/i);
      fireEvent.change(nameInput, { target: { value: 'Top Reviewers' } });

      // Save shortlist
      fireEvent.click(screen.getByText(/save/i));

      await waitFor(() => {
        expect(screen.getByText('Top Reviewers')).toBeInTheDocument();
      });
    });

    it('should export shortlists in different formats', async () => {
      render(<ShortlistManager processId={mockProcess.id} />);

      await waitFor(() => {
        expect(screen.getByText('Test Shortlist')).toBeInTheDocument();
      });

      // Export as CSV
      fireEvent.click(screen.getByText(/export/i));
      fireEvent.click(screen.getByText(/csv/i));

      // Should trigger download
      await waitFor(() => {
        expect(screen.getByText(/download started/i)).toBeInTheDocument();
      });
    });
  });
});