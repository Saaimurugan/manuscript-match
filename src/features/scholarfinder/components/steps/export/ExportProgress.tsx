import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { ExportFormat } from './ExportOptions';

export interface ExportStatus {
  format: ExportFormat;
  status: 'preparing' | 'generating' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  downloadUrl?: string;
  fileName?: string;
}

interface ExportProgressProps {
  exportStatus: ExportStatus;
  onRetry: () => void;
  onDownload: () => void;
  onClose: () => void;
}

const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV File',
  excel: 'Excel Spreadsheet',
  report: 'Formatted Report'
};

const getStatusIcon = (status: ExportStatus['status']) => {
  switch (status) {
    case 'preparing':
    case 'generating':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: ExportStatus['status']) => {
  switch (status) {
    case 'preparing':
    case 'generating':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export const ExportProgress: React.FC<ExportProgressProps> = ({
  exportStatus,
  onRetry,
  onDownload,
  onClose
}) => {
  const { format, status, progress, message, error, fileName } = exportStatus;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getStatusIcon(status)}
          Exporting {formatLabels[format]}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{message}</span>
            <span>{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
          />
        </div>

        {fileName && status === 'completed' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Ready for download:</strong> {fileName}
            </p>
          </div>
        )}

        {error && status === 'failed' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Export failed:</strong> {error}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
          
          {status === 'completed' && (
            <Button
              onClick={onDownload}
              className="flex-1"
            >
              Download
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={status === 'preparing' || status === 'generating'}
          >
            {status === 'completed' || status === 'failed' ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};