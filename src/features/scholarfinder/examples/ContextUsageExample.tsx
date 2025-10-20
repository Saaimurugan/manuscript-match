/**
 * Example component demonstrating ScholarFinder Context usage
 * Shows how to integrate context with components and hooks
 */

import React from 'react';
import { ScholarFinderProvider } from '../contexts/ScholarFinderContext';
import { 
  useCurrentProcess, 
  useUserProcesses,
  useWorkflowNavigation, 
  useShortlistManagement,
  useScholarFinderUI 
} from '../hooks/useScholarFinderContext';
import { ProcessStep } from '../types/process';

// Example component using the context hooks
const WorkflowStatus: React.FC = () => {
  const { process, hasProcess, title, status } = useCurrentProcess();
  const { currentStep, getStepProgress, canProceedToNextStep } = useWorkflowNavigation();
  const { shortlist, getShortlistStats } = useShortlistManagement();
  const { isLoading, error, isAuthenticated } = useScholarFinderUI();

  if (!isAuthenticated) {
    return <div>Please log in to access ScholarFinder</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!hasProcess) {
    return <div>No active process. Please create or select a process.</div>;
  }

  const progress = getStepProgress();
  const shortlistStats = getShortlistStats();

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Workflow Status</h2>
      
      {/* Process Information */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Current Process</h3>
        <p><strong>Title:</strong> {title}</p>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Current Step:</strong> {currentStep}</p>
      </div>

      {/* Progress Information */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
        <p>{progress.completed} of {progress.total} steps completed ({progress.percentage}%)</p>
        <p>Can proceed to next step: {canProceedToNextStep ? 'Yes' : 'No'}</p>
      </div>

      {/* Shortlist Information */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Shortlist</h3>
        <p><strong>Reviewers selected:</strong> {shortlistStats.count}</p>
        <p><strong>Status:</strong> {shortlistStats.isEmpty ? 'Empty' : 'Has reviewers'}</p>
        {shortlistStats.maxReached && (
          <p className="text-amber-600">Maximum reviewers reached</p>
        )}
      </div>

      {/* Shortlist Details */}
      {shortlistStats.hasReviewers && (
        <div>
          <h4 className="font-medium mb-2">Selected Reviewers:</h4>
          <ul className="space-y-1">
            {shortlist.map((reviewer, index) => (
              <li key={reviewer.email} className="text-sm">
                {index + 1}. {reviewer.reviewer} ({reviewer.email})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Example component for step navigation
const StepNavigation: React.FC = () => {
  const { 
    currentStep, 
    setCurrentStep, 
    stepOrder, 
    canGoToStep, 
    getNextStep, 
    getPreviousStep,
    isFirstStep,
    isLastStep 
  } = useWorkflowNavigation();

  const nextStep = getNextStep();
  const prevStep = getPreviousStep();

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Step Navigation</h3>
      
      {/* Step Indicators */}
      <div className="flex space-x-2 mb-4">
        {stepOrder.map((step, index) => (
          <button
            key={step}
            onClick={() => canGoToStep(step) && setCurrentStep(step)}
            disabled={!canGoToStep(step)}
            className={`
              px-3 py-2 rounded text-sm font-medium
              ${step === currentStep 
                ? 'bg-blue-600 text-white' 
                : canGoToStep(step)
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {index + 1}. {step}
          </button>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => prevStep && setCurrentStep(prevStep)}
          disabled={isFirstStep || !prevStep}
          className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => nextStep && setCurrentStep(nextStep)}
          disabled={isLastStep || !nextStep}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Example component for process management
const ProcessManager: React.FC = () => {
  const { processes, processCount, hasProcesses } = useUserProcesses();
  const { switchToProcess } = useCurrentProcess();
  const { showError, clearError } = useScholarFinderUI();

  const handleProcessSwitch = (processId: string) => {
    try {
      switchToProcess(processId);
      clearError();
    } catch (err) {
      showError('Failed to switch to process');
    }
  };

  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-lg font-medium mb-4">Process Management</h3>
      
      <p className="mb-4">Total processes: {processCount}</p>
      
      {!hasProcesses ? (
        <p className="text-gray-500">No processes found. Create a new process to get started.</p>
      ) : (
        <div className="space-y-2">
          <h4 className="font-medium">Available Processes:</h4>
          {processes.map((process) => (
            <div key={process.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="font-medium">{process.title}</p>
                <p className="text-sm text-gray-600">
                  Status: {process.status} | Step: {process.currentStep}
                </p>
              </div>
              <button
                onClick={() => handleProcessSwitch(process.id)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Switch
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main example component
const ContextUsageExample: React.FC = () => {
  return (
    <ScholarFinderProvider>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">ScholarFinder Context Example</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkflowStatus />
          <ProcessManager />
        </div>
        
        <StepNavigation />
      </div>
    </ScholarFinderProvider>
  );
};

export default ContextUsageExample;