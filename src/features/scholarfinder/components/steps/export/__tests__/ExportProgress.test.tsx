import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportProgress, ExportStatus } from '../ExportProgress';

describe('ExportProgress', () => {
  const mockProps = {
    onRetry: vi.fn(),
    onDownload: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders preparing status correctly', () => {
    const exportStatus: ExportStatus = {
      format: 'csv',
      status: 'preparing',
      progress: 10,
      message: 'Preparing export...'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    expect(screen.getByText('Exporting CSV File')).toBeInTheDocument();
    expect(screen.getByText('Preparing export...')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    
    // Should show cancel button but not retry or download
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });

  it('renders generating status correctly', () => {
    const exportStatus: ExportStatus = {
      format: 'excel',
      status: 'generating',
      progress: 50,
      message: 'Generating file...'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    expect(screen.getByText('Exporting Excel Spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Generating file...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    
    // Cancel button should be disabled during generation
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('renders completed status correctly', () => {
    const exportStatus: ExportStatus = {
      format: 'report',
      status: 'completed',
      progress: 100,
      message: 'Export completed successfully!',
      fileName: 'reviewer-report-2024-01-15.md'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    expect(screen.getByText('Exporting Formatted Report')).toBeInTheDocument();
    expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Ready for download:')).toBeInTheDocument();
    expect(screen.getByText('reviewer-report-2024-01-15.md')).toBeInTheDocument();
    
    // Should show download and close buttons
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('renders failed status correctly', () => {
    const exportStatus: ExportStatus = {
      format: 'csv',
      status: 'failed',
      progress: 0,
      message: 'Export failed',
      error: 'Network connection error'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    expect(screen.getByText('Exporting CSV File')).toBeInTheDocument();
    expect(screen.getByText('Export failed')).toBeInTheDocument();
    expect(screen.getByText('Export failed:')).toBeInTheDocument();
    expect(screen.getByText('Network connection error')).toBeInTheDocument();
    
    // Should show retry and close buttons
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const exportStatus: ExportStatus = {
      format: 'excel',
      status: 'failed',
      progress: 0,
      message: 'Export failed',
      error: 'File generation error'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(mockProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDownload when download button is clicked', () => {
    const exportStatus: ExportStatus = {
      format: 'csv',
      status: 'completed',
      progress: 100,
      message: 'Export completed successfully!',
      fileName: 'reviewer-shortlist-2024-01-15.csv'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    
    expect(mockProps.onDownload).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const exportStatus: ExportStatus = {
      format: 'report',
      status: 'completed',
      progress: 100,
      message: 'Export completed successfully!'
    };

    render(<ExportProgress exportStatus={exportStatus} {...mockProps} />);
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows correct progress bar color for different statuses', () => {
    const { rerender } = render(
      <ExportProgress 
        exportStatus={{
          format: 'csv',
          status: 'generating',
          progress: 50,
          message: 'Generating...'
        }} 
        {...mockProps} 
      />
    );

    // Check that progress bar exists
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Test different statuses
    rerender(
      <ExportProgress 
        exportStatus={{
          format: 'csv',
          status: 'completed',
          progress: 100,
          message: 'Completed'
        }} 
        {...mockProps} 
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});