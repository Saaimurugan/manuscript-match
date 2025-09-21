import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUploadSkeleton } from "@/components/ui/skeleton-components";
import { FileUploadProgress } from "@/components/ui/progress-indicators";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFiles";
import { useRenderPerformance } from "@/hooks/usePerformance";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { UploadResponse } from "@/types/api";

// Simple file utilities
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeDescription = (extension: string): string => {
  const descriptions: Record<string, string> = {
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document'
  };
  return descriptions[extension.toLowerCase()] || extension.toUpperCase() + ' File';
};

const supportsMetadataExtraction = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['pdf', 'doc', 'docx'].includes(extension || '');
};

interface FileUploadProps {
  processId: string;
  onFileUpload: (uploadResponse: UploadResponse) => void;
  uploadedFile?: File | null;
}

export const FileUpload = ({ processId, onFileUpload, uploadedFile }: FileUploadProps) => {
  useRenderPerformance('FileUpload');

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const { toast } = useToast();
  const uploadMutation = useFileUpload();

  const validateFileForUpload = (file: File): { isValid: boolean; error?: string } => {
    try {
      // Simple inline validation as fallback
      const allowedTypes = ['pdf', 'doc', 'docx'];
      const maxSize = 100 * 1024 * 1024; // 100MB

      const extension = file.name.split('.').pop()?.toLowerCase();

      if (!extension || !allowedTypes.includes(extension)) {
        return {
          isValid: false,
          error: 'Please upload a PDF or Word document (.pdf, .doc, .docx)'
        };
      }

      if (file.size > maxSize) {
        return {
          isValid: false,
          error: 'File size must be less than 100MB'
        };
      }

      if (file.size === 0) {
        return {
          isValid: false,
          error: 'File appears to be empty'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('File validation error:', error);
      return {
        isValid: false,
        error: 'File validation failed. Please try again.'
      };
    }
  };

  const handleFile = useCallback(async (file: File) => {
    const validation = validateFileForUpload(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if file supports metadata extraction
    if (!supportsMetadataExtraction(file.name)) {
      toast({
        title: "Limited metadata extraction",
        description: `${getFileTypeDescription(file.name.split('.').pop() || '')} files may have limited metadata extraction capabilities.`,
        variant: "default",
      });
    }

    // Check if file supports metadata extraction
    if (!supportsMetadataExtraction(file.name)) {
      toast({
        title: "Limited metadata extraction",
        description: `${getFileTypeDescription(file.name.split('.').pop() || '')} files may have limited metadata extraction capabilities.`,
        variant: "default",
      });
    }

    try {
      setUploadProgress(0);
      setUploadStatus('uploading');
      setCurrentFileName(file.name);

      const uploadResponse = await uploadMutation.mutateAsync({
        processId,
        file,
        onProgress: (progress) => {
          setUploadProgress(progress);
          if (progress >= 100) {
            setUploadStatus('processing');
          }
        }
      });

      setUploadStatus('completed');
      onFileUpload(uploadResponse);

      toast({
        title: "File uploaded successfully",
        description: `${file.name} (${formatFileSize(file.size)}) has been uploaded and is being processed for metadata extraction.`,
      });
    } catch (error: any) {
      setUploadStatus('error');
      console.error('File upload error:', error);

      let errorMessage = "There was an error uploading your file. Please try again.";

      if (error.type === 'VALIDATION_ERROR') {
        errorMessage = error.message;
      } else if (error.type === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.type === 'SERVER_ERROR') {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('idle');
        setCurrentFileName('');
      }, 2000);
    }
  }, [processId, onFileUpload, toast, uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const removeFile = () => {
    // Reset upload state - parent component should handle clearing the uploaded file
    setUploadProgress(0);
    setUploadStatus('idle');
    setCurrentFileName('');
    // Note: We don't call onFileUpload(null) as the parent should manage this state
  };

  const handleCancelUpload = () => {
    // Cancel the upload mutation if possible
    setUploadStatus('idle');
    setUploadProgress(0);
    setCurrentFileName('');
  };

  const isUploading = uploadMutation.isPending;
  const hasError = uploadMutation.isError;

  if (uploadedFile) {
    return (
      <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">File Uploaded</CardTitle>
                <CardDescription>Manuscript uploaded successfully</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show progress indicator during upload
  if (uploadStatus !== 'idle' && currentFileName) {
    return (
      <FileUploadProgress
        fileName={currentFileName}
        progress={uploadProgress}
        status={uploadStatus}
        error={hasError ? 'Upload failed. Please try again.' : undefined}
        onCancel={handleCancelUpload}
      />
    );
  }

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Manuscript</span>
        </CardTitle>
        <CardDescription>
          Upload your .doc or .docx manuscript file for peer reviewer analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border",
            isUploading && "pointer-events-none opacity-50",
            hasError && "border-destructive/50 bg-destructive/5"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full",
              hasError ? "bg-destructive/10" : "bg-primary/10"
            )}>
              {hasError ? (
                <AlertCircle className="w-8 h-8 text-destructive" />
              ) : (
                <FileText className="w-8 h-8 text-primary" />
              )}
            </div>

            {isUploading ? (
              <div className="space-y-3 w-full max-w-xs">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-medium">Uploading manuscript...</p>
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragOver ? "Drop your file here" : "Drag & drop your manuscript"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                  {hasError && (
                    <p className="text-sm text-destructive">
                      Upload failed. Please try again.
                    </p>
                  )}
                </div>

                <input
                  type="file"
                  accept={config.supportedFileTypes.map(type => `.${type}`).join(',')}
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />

                <Button variant="secondary" disabled={isUploading}>
                  Choose File
                </Button>
              </>
            )}
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <p>Supported formats: {config.supportedFileTypes.join(', ')}</p>
            <p>Maximum file size: {Math.round(config.maxFileSize / (1024 * 1024))}MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;