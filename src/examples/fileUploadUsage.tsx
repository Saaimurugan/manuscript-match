/**
 * File Upload Integration Example
 * Demonstrates how to use the FileUpload and DataExtraction components with real backend integration
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/upload/FileUpload';
import { DataExtraction } from '@/components/extraction/DataExtraction';
import { useToast } from '@/hooks/use-toast';
import type { UploadResponse } from '@/types/api';

/**
 * Example component showing file upload and metadata extraction workflow
 */
export const FileUploadExample: React.FC = () => {
  const { toast } = useToast();
  const [processId] = useState('example-process-123'); // In real app, this would come from process creation
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [showExtraction, setShowExtraction] = useState(false);

  const handleFileUpload = (response: UploadResponse) => {
    setUploadResponse(response);
    setUploadedFile({ name: response.fileName, size: response.fileSize } as File);
    setShowExtraction(true);
    
    toast({
      title: 'Upload Complete',
      description: `File ${response.fileName} uploaded successfully. Metadata extraction in progress...`,
    });
  };

  const handleReset = () => {
    setUploadedFile(null);
    setUploadResponse(null);
    setShowExtraction(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>File Upload Integration Example</CardTitle>
          <CardDescription>
            This example demonstrates the complete file upload and metadata extraction workflow
            using real backend API integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Features Demonstrated:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• File validation (type, size, format)</li>
                <li>• Progress tracking during upload</li>
                <li>• Real-time metadata extraction</li>
                <li>• Error handling and user feedback</li>
                <li>• Editable metadata with backend sync</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Reset Example
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Step 1: Upload Manuscript</h3>
        <FileUpload
          processId={processId}
          onFileUpload={handleFileUpload}
          uploadedFile={uploadedFile}
        />
      </div>

      {/* Metadata Extraction Section */}
      {showExtraction && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 2: Review Extracted Metadata</h3>
          <DataExtraction
            processId={processId}
            fileName={uploadedFile?.name}
          />
        </div>
      )}

      {/* API Integration Details */}
      <Card>
        <CardHeader>
          <CardTitle>API Integration Details</CardTitle>
          <CardDescription>
            Technical details about the backend integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Upload Endpoint:</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                POST /api/processes/{processId}/upload
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Metadata Endpoint:</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                GET /api/processes/{processId}/metadata
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Update Metadata Endpoint:</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                PUT /api/processes/{processId}/metadata
              </code>
            </div>

            {uploadResponse && (
              <div>
                <h4 className="font-medium mb-2">Upload Response:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(uploadResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploadExample;