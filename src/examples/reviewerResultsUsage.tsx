/**
 * Example usage of ReviewerResults component
 * Demonstrates integration with backend API and export functionality
 */

import React from 'react';
import { ReviewerResults } from '@/components/results/ReviewerResults';
import { useShortlists } from '@/hooks/useShortlists';
import { toast } from 'sonner';
import type { Reviewer } from '@/types/api';

/**
 * Example: Basic usage with export functionality
 */
export function BasicReviewerResultsExample() {
  const processId = 'example-process-id';

  const handleExport = async (selectedReviewers: Reviewer[]) => {
    try {
      // Example: Create a CSV export
      const csvContent = createCSVContent(selectedReviewers);
      downloadCSV(csvContent, 'reviewer-recommendations.csv');
      
      toast.success(`Exported ${selectedReviewers.length} reviewers successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export reviewers. Please try again.');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Reviewer Recommendations</h1>
      <ReviewerResults 
        processId={processId}
        onExport={handleExport}
      />
    </div>
  );
}

/**
 * Example: Integration with shortlist creation
 */
export function ReviewerResultsWithShortlistExample() {
  const processId = 'example-process-id';
  const { createShortlist } = useShortlists(processId);

  const handleExport = async (selectedReviewers: Reviewer[]) => {
    try {
      // Create a shortlist instead of direct export
      await createShortlist.mutateAsync({
        name: `Shortlist ${new Date().toLocaleDateString()}`,
        selectedReviewers: selectedReviewers.map(r => r.id)
      });

      toast.success(`Created shortlist with ${selectedReviewers.length} reviewers`);
    } catch (error) {
      console.error('Shortlist creation failed:', error);
      toast.error('Failed to create shortlist. Please try again.');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Create Reviewer Shortlist</h1>
      <ReviewerResults 
        processId={processId}
        onExport={handleExport}
      />
    </div>
  );
}

/**
 * Example: Custom export with multiple formats
 */
export function ReviewerResultsWithMultiFormatExportExample() {
  const processId = 'example-process-id';

  const handleExport = async (selectedReviewers: Reviewer[]) => {
    try {
      // Show format selection dialog
      const format = await showFormatSelectionDialog();
      
      switch (format) {
        case 'csv':
          exportAsCSV(selectedReviewers);
          break;
        case 'excel':
          exportAsExcel(selectedReviewers);
          break;
        case 'pdf':
          exportAsPDF(selectedReviewers);
          break;
        default:
          throw new Error('Invalid format selected');
      }

      toast.success(`Exported ${selectedReviewers.length} reviewers as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export reviewers. Please try again.');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Export Reviewers</h1>
      <ReviewerResults 
        processId={processId}
        onExport={handleExport}
      />
    </div>
  );
}

/**
 * Example: Read-only mode without export
 */
export function ReadOnlyReviewerResultsExample() {
  const processId = 'example-process-id';

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Reviewer Recommendations (Read-Only)</h1>
      <ReviewerResults 
        processId={processId}
        // No onExport prop - export functionality will be disabled
      />
    </div>
  );
}

// Helper functions for export examples

function createCSVContent(reviewers: Reviewer[]): string {
  const headers = [
    'Name',
    'Email',
    'Affiliation',
    'Country',
    'Publications',
    'Match Score',
    'Database',
    'Expertise'
  ];

  const rows = reviewers.map(reviewer => [
    reviewer.name,
    reviewer.email || '',
    reviewer.affiliation,
    reviewer.country,
    reviewer.publicationCount.toString(),
    reviewer.matchScore.toString(),
    reviewer.database,
    reviewer.expertise.join('; ')
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

async function showFormatSelectionDialog(): Promise<'csv' | 'excel' | 'pdf'> {
  // This would typically show a modal dialog
  // For this example, we'll just return CSV
  return 'csv';
}

function exportAsCSV(reviewers: Reviewer[]): void {
  const csvContent = createCSVContent(reviewers);
  downloadCSV(csvContent, 'reviewers.csv');
}

function exportAsExcel(reviewers: Reviewer[]): void {
  // Implementation would use a library like xlsx
  console.log('Exporting as Excel:', reviewers);
}

function exportAsPDF(reviewers: Reviewer[]): void {
  // Implementation would use a library like jsPDF
  console.log('Exporting as PDF:', reviewers);
}

/**
 * Example: Integration with process workflow
 */
export function ProcessWorkflowWithReviewerResultsExample() {
  const processId = 'example-process-id';

  const handleExport = async (selectedReviewers: Reviewer[]) => {
    try {
      // Update process step after export
      await updateProcessStep(processId, 'SHORTLIST_CREATED');
      
      // Create shortlist
      const csvContent = createCSVContent(selectedReviewers);
      downloadCSV(csvContent, `process-${processId}-reviewers.csv`);
      
      toast.success('Reviewers exported and process updated');
    } catch (error) {
      console.error('Process update failed:', error);
      toast.error('Export succeeded but failed to update process');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Step 4: Select Reviewers</h1>
        <p className="text-muted-foreground">
          Review and select the most suitable reviewers for your manuscript
        </p>
      </div>
      
      <ReviewerResults 
        processId={processId}
        onExport={handleExport}
      />
    </div>
  );
}

async function updateProcessStep(processId: string, step: string): Promise<void> {
  // Implementation would call the process API
  console.log(`Updating process ${processId} to step ${step}`);
}

/**
 * Example: Custom styling and theming
 */
export function ThemedReviewerResultsExample() {
  const processId = 'example-process-id';

  const handleExport = async (selectedReviewers: Reviewer[]) => {
    const csvContent = createCSVContent(selectedReviewers);
    downloadCSV(csvContent, 'reviewers.csv');
    toast.success('Export completed');
  };

  return (
    <div className="container mx-auto py-6 dark">
      <div className="bg-background text-foreground min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-6 text-primary">
          Reviewer Recommendations (Dark Theme)
        </h1>
        <ReviewerResults 
          processId={processId}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}