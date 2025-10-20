import React from 'react';
import { StepWizard } from '../components/wizard/StepWizard';
import { workflowConfig } from '../config/workflow';
import { ProcessStep } from '../types/process';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const WizardDemo: React.FC = () => {
  const handleStepChange = (step: ProcessStep, data?: any) => {
    console.log('Step changed to:', step, 'with data:', data);
  };

  const handleComplete = (data: any) => {
    console.log('Workflow completed with data:', data);
    alert('Workflow completed! Check console for data.');
  };

  const handleError = (error: Error, step: ProcessStep) => {
    console.error('Error in step', step, ':', error);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>ScholarFinder Wizard Demo</CardTitle>
          <CardDescription>
            This demo shows the step wizard framework with placeholder components.
            Navigate through the steps to test the wizard functionality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Features demonstrated:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Progress indicator with clickable steps</li>
              <li>Step validation and navigation guards</li>
              <li>Responsive design for different screen sizes</li>
              <li>Step container with common layout and navigation</li>
              <li>Auto-save functionality (localStorage)</li>
              <li>Error handling and recovery</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <StepWizard
        processId="demo-process-123"
        jobId="demo-job-456"
        steps={workflowConfig.steps}
        initialStep={ProcessStep.UPLOAD}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        onError={handleError}
        allowSkipping={workflowConfig.allowSkipping}
        allowBackNavigation={workflowConfig.allowBackNavigation}
        autoSave={workflowConfig.autoSave}
      />
    </div>
  );
};