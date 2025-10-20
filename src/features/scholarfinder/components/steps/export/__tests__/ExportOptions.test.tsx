import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportOptions, ExportFormat } from '../ExportOptions';

describe('ExportOptions', () => {
  const mockProps = {
    onExport: vi.fn(),
    onPreview: vi.fn(),
    isExporting: false,
    reviewerCount: 25
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export options correctly', () => {
    render(<ExportOptions {...mockProps} />);
    
    expect(screen.getByText('Export Your Reviewer Shortlist')).toBeInTheDocument();
    expect(screen.getByText('Choose your preferred format to export 25 selected reviewers')).toBeInTheDocument();
    
    expect(screen.getByText('CSV Export')).toBeInTheDocument();
    expect(screen.getByText('Excel Export')).toBeInTheDocument();
    expect(screen.getByText('Formatted Report')).toBeInTheDocument();
  });

  it('displays correct features for each export format', () => {
    render(<ExportOptions {...mockProps} />);
    
    // CSV features
    expect(screen.getByText('All reviewer data columns')).toBeInTheDocument();
    expect(screen.getByText('Easy to import')).toBeInTheDocument();
    expect(screen.getByText('Lightweight format')).toBeInTheDocument();
    
    // Excel features
    expect(screen.getByText('Professional formatting')).toBeInTheDocument();
    expect(screen.getByText('Multiple sheets')).toBeInTheDocument();
    expect(screen.getByText('Charts and summaries')).toBeInTheDocument();
    
    // Report features
    expect(screen.getByText('Detailed profiles')).toBeInTheDocument();
    expect(screen.getByText('Publication summaries')).toBeInTheDocument();
    expect(screen.getByText('Ready for submission')).toBeInTheDocument();
  });

  it('calls onPreview when preview button is clicked', () => {
    render(<ExportOptions {...mockProps} />);
    
    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[0]); // Click first preview button (CSV)
    
    expect(mockProps.onPreview).toHaveBeenCalledWith('csv');
  });

  it('calls onExport when export button is clicked', () => {
    render(<ExportOptions {...mockProps} />);
    
    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[1]); // Click second export button (Excel)
    
    expect(mockProps.onExport).toHaveBeenCalledWith('excel');
  });

  it('disables buttons when exporting', () => {
    render(<ExportOptions {...mockProps} isExporting={true} />);
    
    const previewButtons = screen.getAllByText('Preview');
    const exportButtons = screen.getAllByRole('button', { name: /export/i });
    
    previewButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
    
    exportButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows loading state for specific format when exporting', () => {
    render(<ExportOptions {...mockProps} isExporting={true} exportingFormat="excel" />);
    
    // Should show "Exporting..." for Excel format
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    
    // Other formats should still show "Export" - but all buttons are disabled
    const allButtons = screen.getAllByRole('button');
    const exportButtons = allButtons.filter(button => 
      button.textContent?.includes('Export') || button.textContent?.includes('Exporting')
    );
    expect(exportButtons).toHaveLength(3); // All three export buttons
  });

  it('displays reviewer count correctly', () => {
    render(<ExportOptions {...mockProps} reviewerCount={42} />);
    
    expect(screen.getByText('Choose your preferred format to export 42 selected reviewers')).toBeInTheDocument();
  });

  it('handles zero reviewers', () => {
    render(<ExportOptions {...mockProps} reviewerCount={0} />);
    
    expect(screen.getByText('Choose your preferred format to export 0 selected reviewers')).toBeInTheDocument();
  });
});