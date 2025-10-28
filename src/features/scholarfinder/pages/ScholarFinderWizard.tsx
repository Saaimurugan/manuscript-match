// ScholarFinder Wizard
// Step-by-step workflow for reviewer identification

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StepWizard } from '../components/wizard/StepWizard';
import { AccessibilityProvider } from '../components/accessibility/AccessibilityProvider';
import { workflowConfig } from '../config/workflow';
import { ProcessStep } from '../types/process';

const ScholarFinderWizard: React.FC = () => {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string>('');

  // If no processId, redirect to create new process or show error
  if (!processId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            New ScholarFinder Process
          </h1>
          <p className="text-gray-600 mt-2">
            Please create a process first before starting the workflow
          </p>
        </div>
      </div>
    );
  }

  return (
    <AccessibilityProvider>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            ScholarFinder Workflow
          </h1>
          <p className="text-gray-600 mt-2">
            Follow the steps to identify potential peer reviewers
          </p>
        </div>

        <StepWizard 
          processId={processId}
          jobId={jobId}
          steps={workflowConfig.steps}
          initialStep={ProcessStep.UPLOAD}
          allowSkipping={workflowConfig.allowSkipping}
          allowBackNavigation={workflowConfig.allowBackNavigation}
          autoSave={workflowConfig.autoSave}
          onStepChange={(step, data) => {
            // Update jobId when it's set from upload step
            if (data?.jobId && !jobId) {
              setJobId(data.jobId);
            }
          }}
          onComplete={() => {
            // Navigate to results or dashboard
            navigate(`/scholarfinder/process/${processId}/results`);
          }}
        />
      </div>
    </AccessibilityProvider>
  );
};

export default ScholarFinderWizard;