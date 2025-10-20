/**
 * ValidationStep Component
 * Step 6 of the ScholarFinder workflow - Author validation against conflict rules
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, AlertCircle, RefreshCw, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import { cn } from '@/lib/utils';
import type { ValidationResponse } from '../../types/api';

// Import sub-components
import { ValidationProgress, ValidationSummary } from './validation';

interface ValidationStepProps extends StepComponentProps {}

interface ValidationStepData {
  validationStatus?: 'idle' | 'in_progress' | 'completed' | 'failed';
  validationResults?: ValidationResponse['data'];
  lastValidated?: Date;
  validationError?: string;
  estimatedCompletionTime?: string;
  progressPercentage?: number;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { toast } = useToast();
  const { validateAuthors, getValidationStatus } = useScholarFinderApi();
  const { data: process } = useProcess(processId);
  const updateProcessStep = useUpdateProcessStep();

  // Local state
  const [validationStatus, setValidationStatus] = useState<'idle' | 'in_progress' | 'completed' | 'failed'>('idle');
  const [validationResults, setValidationResults] = useState<ValidationResponse['data'] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Loading states
  const isValidating = validateAuthors.isPending || getValidationStatus.isPending;
  const isLoading = externalLoading || isValidating;

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
  }, [process, stepData]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const loadExistingData = () => {
    try {
      // Load from process step data if available
      const existingData = process?.stepData?.validation as ValidationStepData;
      if (existingData) {
        if (existingData.validationStatus) {
          setValidationStatus(existingData.validationStatus);
        }
        if (existingData.validationResults) {
          setValidationResults(existingData.validationResults);
        }
        if (existingData.validationError) {
          setValidationError(existingData.validationError);
        }
        if (existingData.lastValidated) {
          setLastValidated(existingData.lastValidated);
        }

        // If validation was in progress, resume polling
        if (existingData.validationStatus === 'in_progress') {
          startPolling();
        }
      }
    } catch (error) {
      console.error('Failed to load existing validation data:', error);
    }
  };

  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        if (!jobId) return;

        const response = await getValidationStatus.mutateAsync(jobId);
        setValidationResults(response.data);

        if (response.data.validation_status === 'completed') {
          setValidationStatus('completed');
          setLastValidated(new Date());
          setHasUnsavedChanges(true);
          clearInterval(interval);
          setPollingInterval(null);

          toast({
            title: 'Validation Completed',
            description: `Successfully validated ${response.data.total_authors_processed} authors.`,
            variant: 'default'
          });
        } else if (response.data.validation_status === 'failed') {
          setValidationStatus('failed');
          setValidationError('Validation process failed');
          clearInterval(interval);
          setPollingInterval(null);

          toast({
            title: 'Validation Failed',
            description: 'The validation process encountered an error. Please try again.',
            variant: 'destructive'
          });
        }
        // Continue polling if still in progress
      } catch (error: any) {
        console.error('Polling error:', error);
        // Don't stop polling for temporary errors, but log them
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  }, [jobId, getValidationStatus, toast]);

  const handleStartValidation = async () => {
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'Job ID is required for author validation',
        variant: 'destructive'
      });
      return;
    }

    try {
      setValidationStatus('in_progress');
      setValidationError(null);
      setValidationResults(null);

      const response = await validateAuthors.mutateAsync(jobId);
      
      setValidationResults(response.data);

      if (response.data.validation_status === 'in_progress') {
        // Start polling for updates
        startPolling();
        
        toast({
          title: 'Validation Started',
          description: 'Author validation is in progress. This may take several minutes.',
          variant: 'default'
        });
      } else if (response.data.validation_status === 'completed') {
        setValidationStatus('completed');
        setLastValidated(new Date());
        
        toast({
          title: 'Validation Completed',
          description: `Successfully validated ${response.data.total_authors_processed} authors.`,
          variant: 'default'
        });
      } else if (response.data.validation_status === 'failed') {
        setValidationStatus('failed');
        setValidationError('Validation process failed');
        
        toast({
          title: 'Validation Failed',
          description: 'The validation process encountered an error. Please try again.',
          variant: 'destructive'
        });
      }

      setHasUnsavedChanges(true);
    } catch (error: any) {
      console.error('Validation failed:', error);
      setValidationStatus('failed');
      setValidationError(error.message || 'Validation failed');
      
      toast({
        title: 'Validation Failed',
        description: error.message || 'Failed to start author validation. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRetryValidation = async () => {
    setValidationError(null);
    await handleStartValidation();
  };

  const handleCheckStatus = async () => {
    if (!jobId) return;

    try {
      const response = await getValidationStatus.mutateAsync(jobId);
      setValidationResults(response.data);

      if (response.data.validation_status === 'completed') {
        setValidationStatus('completed');
        setLastValidated(new Date());
        setHasUnsavedChanges(true);

        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        toast({
          title: 'Validation Completed',
          description: `Successfully validated ${response.data.total_authors_processed} authors.`,
          variant: 'default'
        });
      } else if (response.data.validation_status === 'failed') {
        setValidationStatus('failed');
        setValidationError('Validation process failed');

        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else if (response.data.validation_status === 'in_progress') {
        setValidationStatus('in_progress');
        if (!pollingInterval) {
          startPolling();
        }
      }
    } catch (error: any) {
      console.error('Failed to check validation status:', error);
      toast({
        title: 'Status Check Failed',
        description: error.message || 'Failed to check validation status.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async (showToast = true) => {
    try {
      const stepData: ValidationStepData = {
        validationStatus,
        validationResults: validationResults || undefined,
        validationError: validationError || undefined,
        lastValidated: lastValidated || undefined,
        estimatedCompletionTime: validationResults?.estimated_completion_time,
        progressPercentage: validationResults?.progress_percentage
      };

      await updateProcessStep.mutateAsync({
        processId,
        step: ProcessStep.VALIDATION,
        stepData
      });

      setHasUnsavedChanges(false);

      if (showToast) {
        toast({
          title: 'Validation Data Saved',
          description: 'Your validation progress and results have been saved.',
          variant: 'default'
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to save validation data:', error);
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save validation data. Please try again.',
          variant: 'destructive'
        });
      }
      return false;
    }
  };

  const handleNext = async () => {
    // Validate that validation has been completed successfully
    if (validationStatus !== 'completed') {
      toast({
        title: 'Validation Required',
        description: 'Please complete the author validation before continuing.',
        variant: 'destructive'
      });
      return;
    }

    if (!validationResults || !validationResults.summary) {
      toast({
        title: 'No Validation Results',
        description: 'Validation results are not available. Please retry the validation.',
        variant: 'destructive'
      });
      return;
    }

    // Auto-save before proceeding
    const saved = await handleSave(false);
    if (saved) {
      onNext({
        validationStatus,
        validationResults,
        totalAuthorsValidated: validationResults.total_authors_processed,
        validationSummary: validationResults.summary
      });
    }
  };

  const canProceed = validationStatus === 'completed' && validationResults?.summary;
  const hasValidationStarted = validationStatus !== 'idle';

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Author Validation</CardTitle>
              <CardDescription>
                Validate potential reviewers against conflict of interest rules and quality criteria
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Save Status */}
      {(hasUnsavedChanges || lastValidated) && (
        <Alert className={hasUnsavedChanges ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          {hasUnsavedChanges ? (
            <AlertCircle className="h-4 w-4 text-orange-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={hasUnsavedChanges ? 'text-orange-800' : 'text-green-800'}>
            {hasUnsavedChanges 
              ? 'You have unsaved changes. Your validation results will be saved automatically when you continue.'
              : `Last validated: ${lastValidated?.toLocaleString()}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Validation Process</span>
          </CardTitle>
          <CardDescription>
            Start the validation process to check authors against conflict rules and quality criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {validationStatus === 'idle' && 'Ready to start validation'}
                {validationStatus === 'in_progress' && 'Validation in progress...'}
                {validationStatus === 'completed' && 'Validation completed successfully'}
                {validationStatus === 'failed' && 'Validation failed'}
              </p>
              <p className="text-sm text-muted-foreground">
                {validationStatus === 'idle' && 'This process may take several minutes depending on the number of authors'}
                {validationStatus === 'in_progress' && validationResults?.estimated_completion_time && 
                  `Estimated completion: ${validationResults.estimated_completion_time}`}
                {validationStatus === 'completed' && validationResults && 
                  `${validationResults.total_authors_processed} authors validated`}
                {validationStatus === 'failed' && 'Please try again or contact support if the issue persists'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {validationStatus === 'in_progress' && (
                <Button
                  variant="outline"
                  onClick={handleCheckStatus}
                  disabled={isLoading}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Status
                </Button>
              )}
              
              {validationStatus === 'failed' && (
                <Button
                  variant="outline"
                  onClick={handleRetryValidation}
                  disabled={isLoading}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              
              {(validationStatus === 'idle' || validationStatus === 'failed') && (
                <Button
                  onClick={handleStartValidation}
                  disabled={isLoading}
                  className="min-w-[140px]"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Start Validation
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Progress */}
      {validationStatus === 'in_progress' && validationResults && (
        <ValidationProgress
          progressPercentage={validationResults.progress_percentage}
          estimatedCompletionTime={validationResults.estimated_completion_time}
          totalAuthorsProcessed={validationResults.total_authors_processed}
          validationCriteria={validationResults.validation_criteria}
        />
      )}

      {/* Validation Summary */}
      {validationStatus === 'completed' && validationResults?.summary && (
        <ValidationSummary
          summary={validationResults.summary}
          validationCriteria={validationResults.validation_criteria}
          totalAuthorsProcessed={validationResults.total_authors_processed}
        />
      )}

      {/* Validation Error */}
      {(validationError || validateAuthors.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {validationError || validateAuthors.error?.message || 'Validation failed. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading}
        >
          Previous
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={isLoading || !hasUnsavedChanges}
          >
            Save Progress
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className={cn(
              "min-w-[140px]",
              canProceed && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : canProceed ? (
              <>
                <Users className="h-4 w-4 mr-2" />
                View Recommendations
              </>
            ) : (
              'Complete Validation to Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ValidationStep;