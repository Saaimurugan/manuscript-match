import React, { useState, useCallback } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '../common/FileUpload';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import { cn } from '@/lib/utils';
import { FileText, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import type { UploadResponse } from '../../types/api';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { responsiveText, responsiveSpacing, responsiveFormLayout } from '../../utils/responsive';
import { getButtonAria } from '../../utils/accessibility';

interface UploadStepProps extends StepComponentProps {}

export const UploadStep: React.FC<UploadStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { isMobile, isTablet } = useResponsive();
  const { announceMessage } = useAccessibilityContext();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  
  const { uploadManuscript } = useScholarFinderApi();
  const updateProcessStep = useUpdateProcessStep();
  
  const isUploading = uploadManuscript.isPending;
  const isLoading = externalLoading || isUploading;

  // File validation configuration
  const acceptedTypes = ['.doc', '.docx'];
  const maxFileSize = 100 * 1024 * 1024; // 100MB

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    setUploadProgress(0);
    setUploadResponse(null);

    // Validate file
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      setUploadError(`File type ${fileExtension} is not supported. Please upload a .doc or .docx file.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(1);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      setUploadError(`File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB).`);
      setSelectedFile(null);
      return;
    }

    // File is valid, set it
    setSelectedFile(file);

    // Start upload
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Keep at 90% until actual upload completes
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadManuscript.mutateAsync(file);
      
      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResponse(response);

      // Announce success
      announceMessage('File uploaded and processed successfully', 'polite');

      // Update process with the new job ID and step data
      if (response.data.job_id) {
        await updateProcessStep.mutateAsync({
          processId,
          step: ProcessStep.UPLOAD,
          stepData: {
            jobId: response.data.job_id,
            fileName: response.data.file_name,
            fileSize: file.size,
            extractedMetadata: {
              title: response.data.heading,
              authors: response.data.authors,
              affiliations: response.data.affiliations,
              keywords: response.data.keywords,
              abstract: response.data.abstract,
              authorAffiliationMap: response.data.author_aff_map
            }
          }
        });
      }

    } catch (error: any) {
      setUploadProgress(0);
      const errorMessage = error.message || 'Upload failed. Please try again.';
      setUploadError(errorMessage);
      announceMessage(`Upload failed: ${errorMessage}`, 'assertive');
      console.error('Upload error:', error);
    }
  }, [uploadManuscript, updateProcessStep, processId, acceptedTypes, maxFileSize, announceMessage]);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadResponse(null);
  }, []);

  const handleNext = useCallback(() => {
    if (uploadResponse && uploadResponse.data.job_id) {
      onNext({
        jobId: uploadResponse.data.job_id,
        fileName: uploadResponse.data.file_name,
        extractedMetadata: {
          title: uploadResponse.data.heading,
          authors: uploadResponse.data.authors,
          affiliations: uploadResponse.data.affiliations,
          keywords: uploadResponse.data.keywords,
          abstract: uploadResponse.data.abstract,
          authorAffiliationMap: uploadResponse.data.author_aff_map
        }
      });
    }
  }, [uploadResponse, onNext]);

  const canProceed = uploadResponse && uploadResponse.data.job_id && !isLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader className={cn(
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg self-start">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className={cn(
                responsiveText({ xs: 'lg', sm: 'xl' })
              )}>
                Upload Manuscript
              </CardTitle>
              <CardDescription className={cn(
                responsiveText({ xs: 'sm', sm: 'base' })
              )}>
                Upload your manuscript file to begin the reviewer identification process
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* File Upload Area */}
      <FileUpload
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        acceptedTypes={acceptedTypes}
        maxSize={maxFileSize}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={uploadError}
        disabled={isLoading}
        selectedFile={selectedFile}
      />

      {/* Upload Success - Extracted Metadata Preview */}
      {uploadResponse && !isUploading && (
        <Card>
          <CardHeader className={cn(
            responsiveSpacing({ xs: '4', sm: '6' }, 'p')
          )}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <CardTitle className={cn(
                responsiveText({ xs: 'base', sm: 'lg' })
              )}>
                Upload Successful
              </CardTitle>
            </div>
            <CardDescription className={cn(
              responsiveText({ xs: 'sm', sm: 'base' })
            )}>
              Your manuscript has been uploaded and processed. Here's what we extracted:
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4",
            responsiveSpacing({ xs: '4', sm: '6' }, 'p')
          )}>
            <div className={cn(
              responsiveFormLayout({ xs: 1, lg: 2 }, { xs: '4', lg: '6' })
            )}>
              {/* Title */}
              <div>
                <label className={cn(
                  "font-medium text-muted-foreground block mb-2",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  Title
                </label>
                <p className={cn(
                  "p-3 bg-muted rounded-md",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  {uploadResponse.data.heading || 'No title extracted'}
                </p>
              </div>

              {/* Authors */}
              <div>
                <label className={cn(
                  "font-medium text-muted-foreground block mb-2",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  Authors
                </label>
                <div className="p-3 bg-muted rounded-md">
                  {uploadResponse.data.authors && uploadResponse.data.authors.length > 0 ? (
                    <div className="space-y-1">
                      {uploadResponse.data.authors.map((author, index) => (
                        <div key={index} className={cn(
                          responsiveText({ xs: 'xs', sm: 'sm' })
                        )}>
                          <span className="font-medium">{author}</span>
                          {uploadResponse.data.author_aff_map[author] && (
                            <span className="text-muted-foreground ml-2 block sm:inline">
                              {isMobile ? '' : '- '}{uploadResponse.data.author_aff_map[author]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={cn(
                      "text-muted-foreground",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      No authors extracted
                    </p>
                  )}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className={cn(
                  "font-medium text-muted-foreground block mb-2",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  Keywords
                </label>
                <p className={cn(
                  "p-3 bg-muted rounded-md",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  {uploadResponse.data.keywords || 'No keywords extracted'}
                </p>
              </div>

              {/* Abstract Preview */}
              <div className="lg:col-span-2">
                <label className={cn(
                  "font-medium text-muted-foreground block mb-2",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  Abstract
                </label>
                <div className="p-3 bg-muted rounded-md">
                  {uploadResponse.data.abstract ? (
                    <p className={cn(
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      {uploadResponse.data.abstract.length > (isMobile ? 150 : 200)
                        ? `${uploadResponse.data.abstract.substring(0, isMobile ? 150 : 200)}...`
                        : uploadResponse.data.abstract
                      }
                    </p>
                  ) : (
                    <p className={cn(
                      "text-muted-foreground",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      No abstract extracted
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className={cn(
                responsiveText({ xs: 'xs', sm: 'sm' })
              )}>
                You'll be able to review and edit this information in the next step.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={cn(
            responsiveText({ xs: 'xs', sm: 'sm' })
          )}>
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 pt-4 sm:pt-6"
      )}>
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading}
          className="min-h-[44px] order-2 sm:order-1"
          {...getButtonAria(
            'Go to previous step',
            undefined,
            undefined,
            undefined,
            isLoading
          )}
        >
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className={cn(
            "min-h-[44px] order-1 sm:order-2",
            canProceed && "bg-green-600 hover:bg-green-700"
          )}
          {...getButtonAria(
            canProceed ? 'Continue to next step' : 'Upload file to continue',
            undefined,
            undefined,
            undefined,
            !canProceed
          )}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              <span>{isUploading ? 'Uploading...' : 'Processing...'}</span>
            </>
          ) : canProceed ? (
            'Continue'
          ) : (
            isMobile ? 'Upload File' : 'Upload File to Continue'
          )}
        </Button>
      </div>
    </div>
  );
};

export default UploadStep;