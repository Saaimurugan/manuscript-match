import React from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProcessStep } from '../../types/process';

interface PlaceholderStepProps extends StepComponentProps {
  stepType: ProcessStep;
}

export const PlaceholderStep: React.FC<PlaceholderStepProps> = ({
  stepType,
  processId,
  jobId,
  onNext,
  onPrevious,
  onSkip,
  isLoading,
  stepData
}) => {
  const handleNext = () => {
    // Simulate some step data
    const mockData = {
      [ProcessStep.UPLOAD]: { fileName: 'test.docx', fileSize: 1024 },
      [ProcessStep.METADATA]: { 
        title: 'Test Manuscript', 
        authors: [{ name: 'Test Author', affiliation: 'Test University' }],
        abstract: 'This is a test abstract with more than 50 characters to pass validation.',
        keywords: ['test', 'manuscript', 'research']
      },
      [ProcessStep.KEYWORDS]: { 
        selectedPrimaryKeywords: ['primary1', 'primary2'], 
        selectedSecondaryKeywords: ['secondary1', 'secondary2'] 
      },
      [ProcessStep.SEARCH]: { selectedDatabases: ['pubmed', 'sciencedirect'] },
      [ProcessStep.SHORTLIST]: { selectedReviewers: [{ id: '1', name: 'Test Reviewer' }] },
      [ProcessStep.EXPORT]: { selectedFormat: 'csv' }
    };

    onNext(mockData[stepType]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step: {stepType}</CardTitle>
          <CardDescription>
            This is a placeholder component for the {stepType} step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Process ID:</strong> {processId}
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Job ID:</strong> {jobId}
            </div>
            {stepData && (
              <div className="text-sm text-muted-foreground">
                <strong>Step Data:</strong>
                <pre className="mt-2 p-2 bg-muted rounded text-xs">
                  {JSON.stringify(stepData, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Processing...' : 'Complete Step'}
              </Button>
              
              {onSkip && (
                <Button 
                  variant="outline"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Skip
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};