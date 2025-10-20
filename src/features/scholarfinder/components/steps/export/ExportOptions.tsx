import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, Download, Eye } from 'lucide-react';

export type ExportFormat = 'csv' | 'excel' | 'report';

export interface ExportOption {
  format: ExportFormat;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

interface ExportOptionsProps {
  onExport: (format: ExportFormat) => void;
  onPreview: (format: ExportFormat) => void;
  isExporting: boolean;
  exportingFormat?: ExportFormat;
  reviewerCount: number;
}

const exportOptions: ExportOption[] = [
  {
    format: 'csv',
    title: 'CSV Export',
    description: 'Structured data file compatible with spreadsheet applications',
    icon: <FileText className="h-6 w-6" />,
    features: ['All reviewer data columns', 'Easy to import', 'Lightweight format']
  },
  {
    format: 'excel',
    title: 'Excel Export',
    description: 'Formatted spreadsheet with headers and proper formatting',
    icon: <FileSpreadsheet className="h-6 w-6" />,
    features: ['Professional formatting', 'Multiple sheets', 'Charts and summaries']
  },
  {
    format: 'report',
    title: 'Formatted Report',
    description: 'Professional document with detailed reviewer profiles',
    icon: <FileText className="h-6 w-6" />,
    features: ['Detailed profiles', 'Publication summaries', 'Ready for submission']
  }
];

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  onExport,
  onPreview,
  isExporting,
  exportingFormat,
  reviewerCount
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Export Your Reviewer Shortlist</h3>
        <p className="text-muted-foreground">
          Choose your preferred format to export {reviewerCount} selected reviewers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {exportOptions.map((option) => (
          <Card key={option.format} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {option.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{option.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm">
                {option.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Features:</p>
                <div className="flex flex-wrap gap-1">
                  {option.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(option.format)}
                  disabled={isExporting}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                
                <Button
                  onClick={() => onExport(option.format)}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting && exportingFormat === option.format ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  {isExporting && exportingFormat === option.format ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};