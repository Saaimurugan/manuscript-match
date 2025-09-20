/**
 * Export Shortlist Dialog Component
 * Provides UI for exporting reviewer shortlists in different formats
 */

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useExportShortlist } from '../../hooks/useShortlists';
import { useToast } from '../../hooks/use-toast';
import type { Shortlist, ExportFormat } from '../../types/api';

interface ExportShortlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  shortlist: Shortlist;
}

interface ExportOption {
  format: ExportFormat['format'];
  label: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
}

const exportOptions: ExportOption[] = [
  {
    format: 'csv',
    label: 'CSV (Comma Separated Values)',
    description: 'Simple spreadsheet format compatible with Excel, Google Sheets, and other tools',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    fileExtension: 'csv'
  },
  {
    format: 'xlsx',
    label: 'Excel Spreadsheet',
    description: 'Microsoft Excel format with formatting and multiple sheets support',
    icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    fileExtension: 'xlsx'
  },
  {
    format: 'docx',
    label: 'Word Document',
    description: 'Microsoft Word format suitable for formal documentation and reports',
    icon: <FileText className="h-5 w-5 text-blue-600" />,
    fileExtension: 'docx'
  }
];

export const ExportShortlistDialog: React.FC<ExportShortlistDialogProps> = ({
  open,
  onOpenChange,
  processId,
  shortlist
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat['format']>('xlsx');
  
  const { toast } = useToast();
  const exportShortlistMutation = useExportShortlist();

  const handleExport = async () => {
    try {
      await exportShortlistMutation.mutateAsync({
        processId,
        shortlistId: shortlist.id,
        format: selectedFormat
      });

      toast({
        title: 'Export Started',
        description: `Your shortlist is being exported as ${selectedFormat.toUpperCase()}. The download will start shortly.`,
        variant: 'default'
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export shortlist. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const selectedOption = exportOptions.find(option => option.format === selectedFormat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Shortlist</DialogTitle>
          <DialogDescription>
            Export "{shortlist.name}" with {shortlist.selectedReviewers.length} reviewers in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Choose Export Format</Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value) => setSelectedFormat(value as ExportFormat['format'])}
              className="mt-3"
            >
              <div className="space-y-3">
                {exportOptions.map((option) => (
                  <div key={option.format} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.format} id={option.format} />
                    <Label htmlFor={option.format} className="flex-1 cursor-pointer">
                      <Card className="hover:bg-gray-50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            {option.icon}
                            <div>
                              <CardTitle className="text-sm">{option.label}</CardTitle>
                              <CardDescription className="text-xs">
                                {option.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {selectedOption && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Ready to export as {selectedOption.label}
                    </p>
                    <p className="text-xs text-blue-700">
                      File will be downloaded as: shortlist-{shortlist.id}.{selectedOption.fileExtension}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Export Contents</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Reviewer names and contact information</li>
              <li>• Affiliation and institutional details</li>
              <li>• Publication counts and expertise areas</li>
              <li>• Validation status and conflict checks</li>
              <li>• Match scores and recommendation rankings</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exportShortlistMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportShortlistMutation.isPending}
          >
            {exportShortlistMutation.isPending ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedOption?.fileExtension.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};