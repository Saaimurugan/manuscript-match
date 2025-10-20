import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UploadStep } from '../UploadStep';
import { ProcessStep } from '../../../types/process';

// Mock the hooks
vi.mock('../../../hooks/useScholarFinderApi', () => ({
  useScholarFinderApi: () => ({
    uploadManuscript: {
      mutateAsync: vi.fn().mockResolvedValue({
        message: 'Success',
        data: {
          job_id: 'test-job-123',
          file_name: 'test.docx',
          timestamp: '2024-01-01T00:00:00Z',
          heading: 'Test Manuscript Title',
          authors: ['John Doe', 'Jane Smith'],
          affiliations: ['University A', 'University B'],
          keywords: 'test, manuscript, research',
          abstract: 'This is a test abstract for the manuscript.',
          author_aff_map: {
            'John Doe': 'University A',
            'Jane Smith': 'University B'
          }
        }
      }),
      isPending: false
    }
  })
}));

vi.mock('../../../hooks/useProcessManagement', () => ({
  useUpdateProcessStep: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      id: 'test-process-123',
      currentStep: ProcessStep.UPLOAD
    })
  })
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  File: () => <div data-testid="file-icon" />,
  X: () => <div data-testid="x-icon" />
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
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

describe('UploadStep', () => {
  const defaultProps = {
    processId: 'test-process-123',
    jobId: 'test-job-123',
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload step with file upload area', () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Upload Manuscript')).toBeInTheDocument();
    expect(screen.getByText('Upload your manuscript')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: .doc, .docx')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 100MB')).toBeInTheDocument();
  });

  it('shows navigation buttons', () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Upload File to Continue')).toBeInTheDocument();
  });

  it('handles file selection and validation', async () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    // Create a test file
    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    // Find the file input
    const fileInput = screen.getByLabelText('File upload');
    
    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for the file to be processed
    await waitFor(() => {
      expect(screen.getByText('test.docx')).toBeInTheDocument();
    });
  });

  it('validates file type correctly', async () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    // Test that valid file types are accepted
    const validFile = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText('test.docx')).toBeInTheDocument();
    });
  });

  it('handles file upload process', async () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should show the file is selected
    await waitFor(() => {
      expect(screen.getByText('test.docx')).toBeInTheDocument();
    });
  });

  it('calls onPrevious when Previous button is clicked', () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    const previousButton = screen.getByText('Previous');
    fireEvent.click(previousButton);

    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('disables continue button when no file is uploaded', () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} />
      </TestWrapper>
    );

    const continueButton = screen.getByText('Upload File to Continue');
    expect(continueButton).toBeDisabled();
  });

  it('handles loading state correctly', () => {
    render(
      <TestWrapper>
        <UploadStep {...defaultProps} isLoading={true} />
      </TestWrapper>
    );

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });
});