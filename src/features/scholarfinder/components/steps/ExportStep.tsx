import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { ExportOptions, ExportFormat } from './export/ExportOptions';
import { ExportProgress, ExportStatus } from './export/ExportProgress';
import { ExportPreview } from './export/ExportPreview';
import { useScholarFinder } from '../../hooks/useScholarFinderContext';
import { exportReviewers, createExportMetadata } from '../../utils/exportUtils';
import { toast } from 'sonner';

interface ExportStepProps {
  processId: string;
  jobId: string;
  onNext: (data?: any) => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const { shortlist, currentProcess } = useScholarFinder();
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Check if we have reviewers to export
  const hasReviewers = shortlist.length > 0;

  const handlePreview = useCallback((format: ExportFormat) => {
    setPreviewFormat(format);
    setIsPreviewOpen(true);
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!hasReviewers) {
      toast.error('No reviewers selected for export');
      return;
    }

    try {
      // Initialize export status
      setExportStatus({
        format,
        status: 'preparing',
        progress: 0,
        message: 'Preparing export...'
      });

      // Simulate preparation phase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExportStatus(prev => prev ? {
        ...prev,
        status: 'generating',
        progress: 25,
        message: 'Generating file...'
      } : null);

      // Create export metadata
      const metadata = createExportMetadata(
        shortlist,
        format,
        currentProcess?.title,
        processId
      );

      // Simulate file generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setExportStatus(prev => prev ? {
        ...prev,
        progress: 75,
        message: 'Finalizing export...'
      } : null);

      // Perform the actual export
      await exportReviewers(shortlist, format, metadata);

      // Complete the export
      setExportStatus(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        message: 'Export completed successfully!',
        fileName: `reviewer-${format === 'report' ? 'report' : 'shortlist'}-${metadata.exportDate}.${format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'md'}`
      } : null);

      toast.success(`${format.toUpperCase()} export completed successfully!`);

    } catch (error) {
      console.error('Export failed:', error);
      
      setExportStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        progress: 0,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } : null);

      toast.error('Export failed. Please try again.');
    }
  }, [hasReviewers, shortlist, currentProcess, processId]);

  const handleConfirmExport = useCallback(() => {
    if (previewFormat) {
      setIsPreviewOpen(false);
      handleExport(previewFormat);
    }
  }, [previewFormat, handleExport]);

  const handleRetryExport = useCallback(() => {
    if (exportStatus?.format) {
      handleExport(exportStatus.format);
    }
  }, [exportStatus, handleExport]);

  const handleDownload = useCallback(() => {
    // The file should already be downloaded by the export function
    // This is just for UI feedback
    toast.success('File downloaded successfully!');
  }, []);

  const handleCloseProgress = useCallback(() => {
    setExportStatus(null);
  }, []);

  const handleComplete = useCallback(() => {
    onNext({ exported: true, exportCount: shortlist.length });
  }, [onNext, shortlist.length]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading export options...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Export Reviewer Shortlist</h2>
        <p className="text-muted-foreground">
          Download your curated list of potential reviewers in your preferred format
        </p>
      </div>

      {/* Shortlist Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Shortlist Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasReviewers ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{shortlist.length}</div>
                <div className="text-sm text-muted-foreground">Selected Reviewers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {[...new Set(shortlist.map(r => r.country))].length}
                </div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {(shortlist.reduce((sum, r) => sum + r.conditions_met, 0) / shortlist.length).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Validation Score</div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No reviewers have been selected for export. Please go back to the shortlist step to select reviewers.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Progress */}
      {exportStatus && (
        <div className="flex justify-center">
          <ExportProgress
            exportStatus={exportStatus}
            onRetry={handleRetryExport}
            onDownload={handleDownload}
            onClose={handleCloseProgress}
          />
        </div>
      )}

      {/* Export Options */}
      {!exportStatus && hasReviewers && (
        <ExportOptions
          onExport={handleExport}
          onPreview={handlePreview}
          isExporting={false}
          reviewerCount={shortlist.length}
        />
      )}

      {/* Export Preview Dialog */}
      <ExportPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirmExport={handleConfirmExport}
        format={previewFormat || 'csv'}
        reviewers={shortlist}
        isExporting={exportStatus?.status === 'preparing' || exportStatus?.status === 'generating'}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shortlist
        </Button>
        
        {exportStatus?.status === 'completed' && (
          <Button onClick={handleComplete}>
            Complete Workflow
          </Button>
        )}
      </div>
    </div>
  );
};