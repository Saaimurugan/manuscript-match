import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FileUpload } from '../FileUpload';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  File: () => <div data-testid="file-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />
}));

describe('FileUpload', () => {
  const defaultProps = {
    onFileSelect: vi.fn(),
    onFileRemove: vi.fn(),
    acceptedTypes: ['.doc', '.docx'],
    maxSize: 100 * 1024 * 1024, // 100MB
    isUploading: false,
    uploadProgress: 0,
    error: null,
    disabled: false,
    selectedFile: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area when no file is selected', () => {
    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText('Upload your manuscript')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your file here/)).toBeInTheDocument();
    expect(screen.getByText('browse')).toBeInTheDocument();
    expect(screen.getByText(/Supported formats:/)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size:/)).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('renders selected file when file is provided', () => {
    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    render(<FileUpload {...defaultProps} selectedFile={file} />);

    expect(screen.getByText('test.docx')).toBeInTheDocument();
    expect(screen.getByText('File ready for processing')).toBeInTheDocument();
  });

  it('shows upload progress when uploading', () => {
    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    render(
      <FileUpload 
        {...defaultProps} 
        selectedFile={file} 
        isUploading={true} 
        uploadProgress={50} 
      />
    );

    expect(screen.getByText('Uploading and processing...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<FileUpload {...defaultProps} error="Test error message" />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('calls onFileSelect when file is selected via input', async () => {
    render(<FileUpload {...defaultProps} />);

    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it('calls onFileRemove when remove button is clicked', () => {
    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    render(<FileUpload {...defaultProps} selectedFile={file} />);

    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);

    expect(defaultProps.onFileRemove).toHaveBeenCalledTimes(1);
  });

  it('handles drag and drop events', async () => {
    render(<FileUpload {...defaultProps} />);

    const dropZone = screen.getByText('Upload your manuscript').closest('div');
    
    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    });

    expect(screen.getByText('Drop your file here')).toBeInTheDocument();

    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it('disables interactions when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled={true} />);

    const fileInput = screen.getByLabelText('File upload');
    expect(fileInput).toBeDisabled();
  });

  it('disables interactions when uploading', () => {
    render(<FileUpload {...defaultProps} isUploading={true} />);

    const fileInput = screen.getByLabelText('File upload');
    expect(fileInput).toBeDisabled();
  });

  it('formats file size correctly', () => {
    const file = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    // Mock file size
    Object.defineProperty(file, 'size', {
      value: 1024 * 1024, // 1MB
      writable: false
    });

    render(<FileUpload {...defaultProps} selectedFile={file} />);

    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  it('shows drag over state correctly', () => {
    render(<FileUpload {...defaultProps} />);

    const dropZone = screen.getByText('Upload your manuscript').closest('div');
    
    // Simulate drag over
    fireEvent.dragOver(dropZone!);

    expect(screen.getByText('Drop your file here')).toBeInTheDocument();

    // Simulate drag leave
    fireEvent.dragLeave(dropZone!);

    expect(screen.getByText('Upload your manuscript')).toBeInTheDocument();
  });
});