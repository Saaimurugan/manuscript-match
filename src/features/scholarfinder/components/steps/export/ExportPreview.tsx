import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Reviewer } from '../../../types/api';
import { ExportFormat } from './ExportOptions';

interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  format: ExportFormat;
  reviewers: Reviewer[];
  isExporting: boolean;
}

const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV File',
  excel: 'Excel Spreadsheet',
  report: 'Formatted Report'
};

const CSVPreview: React.FC<{ reviewers: Reviewer[] }> = ({ reviewers }) => {
  const headers = [
    'Name', 'Email', 'Affiliation', 'Country', 'Total Publications',
    'Recent Publications', 'Validation Score'
  ];

  const sampleRows = reviewers.slice(0, 5);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Preview of CSV format with {reviewers.length} reviewers (showing first 5 rows):
      </p>
      
      <ScrollArea className="h-64 border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="text-xs font-medium">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRows.map((reviewer, index) => (
              <TableRow key={index}>
                <TableCell className="text-xs">{reviewer.reviewer}</TableCell>
                <TableCell className="text-xs">{reviewer.email}</TableCell>
                <TableCell className="text-xs">{reviewer.aff}</TableCell>
                <TableCell className="text-xs">{reviewer.country}</TableCell>
                <TableCell className="text-xs">{reviewer.Total_Publications}</TableCell>
                <TableCell className="text-xs">{reviewer['Publications (last 2 years)']}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="secondary" className="text-xs">
                    {reviewer.conditions_met}/8
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

const ExcelPreview: React.FC<{ reviewers: Reviewer[] }> = ({ reviewers }) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Excel export will include {reviewers.length} reviewers with the following features:
      </p>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="font-medium">Included Sheets:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Reviewer Summary</li>
            <li>• Detailed Data</li>
            <li>• Validation Criteria</li>
            <li>• Export Metadata</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Formatting Features:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Professional headers</li>
            <li>• Color-coded validation scores</li>
            <li>• Sortable columns</li>
            <li>• Summary statistics</li>
          </ul>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          The Excel file will be optimized for journal submission requirements and peer review workflows.
        </p>
      </div>
    </div>
  );
};

const ReportPreview: React.FC<{ reviewers: Reviewer[] }> = ({ reviewers }) => {
  const topReviewers = reviewers
    .sort((a, b) => b.conditions_met - a.conditions_met)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Formatted report will include detailed profiles for {reviewers.length} reviewers:
      </p>
      
      <div className="space-y-3">
        <h4 className="font-medium">Sample Reviewer Profiles:</h4>
        {topReviewers.map((reviewer, index) => (
          <div key={index} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-medium text-sm">{reviewer.reviewer}</h5>
              <Badge variant="secondary">
                Score: {reviewer.conditions_met}/8
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {reviewer.aff}, {reviewer.country}
            </p>
            <p className="text-xs text-muted-foreground">
              {reviewer.Total_Publications} total publications, 
              {reviewer['Publications (last 2 years)']} recent publications
            </p>
          </div>
        ))}
      </div>

      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          The report will include publication summaries, validation details, and professional formatting suitable for journal editors.
        </p>
      </div>
    </div>
  );
};

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  isOpen,
  onClose,
  onConfirmExport,
  format,
  reviewers,
  isExporting
}) => {
  const renderPreview = () => {
    switch (format) {
      case 'csv':
        return <CSVPreview reviewers={reviewers} />;
      case 'excel':
        return <ExcelPreview reviewers={reviewers} />;
      case 'report':
        return <ReportPreview reviewers={reviewers} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Export Preview - {formatLabels[format]}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {renderPreview()}
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={onConfirmExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Exporting...
              </>
            ) : (
              'Confirm Export'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};