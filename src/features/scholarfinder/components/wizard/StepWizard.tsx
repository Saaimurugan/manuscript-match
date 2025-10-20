import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { ProcessStep } from '../../types/process';
import { 
  StepDefinition, 
  NavigationState, 
  StepValidationResult, 
  WorkflowProgress,
  StepComponentProps 
} from '../../types/workflow';
import { ProgressIndicator } from './ProgressIndicator';
import { StepContainer } from './StepContainer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { getContainerClasses } from '../../utils/responsive';
import { getNavigationAria, getLiveRegionAria } from '../../utils/accessibility';
import { StepLoadingFallback } from '../steps/LazySteps';
import { usePrefetch } from '../../hooks/usePrefetch';

interface StepWizardProps {
  processId: string;
  jobId: string;
  steps: StepDefinition[];
  initialStep?: ProcessStep;
  onStepChange?: (step: ProcessStep, data?: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error, step: ProcessStep) => void;
  allowSkipping?: boolean;
  allowBackNavigation?: boolean;
  autoSave?: boolean;
  className?: string;
}

interface StepState {
  currentStep: ProcessStep;
  completedSteps: ProcessStep[];
  stepData: Record<ProcessStep, any>;
  validationResults: Record<ProcessStep, StepValidationResult>;
  isLoading: boolean;
  error?: Error;
}

export const StepWizard: React.FC<StepWizardProps> = ({
  processId,
  jobId,
  steps,
  initialStep,
  onStepChange,
  onComplete,
  onError,
  allowSkipping = true,
  allowBackNavigation = true,
  autoSave = true,
  className
}) => {
  const { announceMessage } = useAccessibilityContext();
  
  // Initialize prefetching for upcoming steps
  const { prefetchSpecificStep, cancelPrefetches } = usePrefetch(
    state.currentStep,
    jobId,
    processId,
    true // enabled
  );
  
  const [state, setState] = useState<StepState>(() => ({
    currentStep: initialStep || steps[0]?.key || ProcessStep.UPLOAD,
    completedSteps: [],
    stepData: {} as Record<ProcessStep, any>,
    validationResults: {} as Record<ProcessStep, StepValidationResult>,
    isLoading: false,
  }));

  // Calculate current step index and navigation state
  const currentStepIndex = useMemo(() => 
    steps.findIndex(step => step.key === state.currentStep),
    [steps, state.currentStep]
  );

  const currentStepDefinition = useMemo(() => 
    steps[currentStepIndex],
    [steps, currentStepIndex]
  );

  const navigationState = useMemo((): NavigationState => {
    const availableSteps = steps
      .filter((step, index) => {
        // Always allow access to completed steps
        if (state.completedSteps.includes(step.key)) return true;
        
        // Allow access to current step
        if (step.key === state.currentStep) return true;
        
        // Check prerequisites for future steps
        if (step.prerequisites) {
          return step.prerequisites.every(prereq => 
            state.completedSteps.includes(prereq)
          );
        }
        
        // Allow access to next step if current is completed or optional
        return index <= currentStepIndex + 1;
      })
      .map(step => step.key);

    return {
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      availableSteps,
      canNavigateToStep: (step: ProcessStep) => availableSteps.includes(step),
      canProceedToNext: currentStepIndex < steps.length - 1 && 
                       (!state.validationResults[state.currentStep] || 
                        state.validationResults[state.currentStep].canProceed),
      canGoToPrevious: currentStepIndex > 0 && allowBackNavigation,
    };
  }, [state, steps, currentStepIndex, allowBackNavigation]);

  const workflowProgress = useMemo((): WorkflowProgress => {
    const totalSteps = steps.length;
    const completedSteps = state.completedSteps.length;
    const progressPercentage = (completedSteps / totalSteps) * 100;
    
    // Calculate estimated time remaining based on step durations
    const remainingSteps = steps.slice(currentStepIndex + 1);
    const estimatedTimeRemaining = remainingSteps.reduce(
      (total, step) => total + (step.estimatedDuration || 10), 
      0
    );

    return {
      currentStepIndex,
      totalSteps,
      completedSteps,
      progressPercentage,
      estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined,
    };
  }, [state.completedSteps, steps, currentStepIndex]);

  // Step validation function
  const validateStep = useCallback(async (
    step: ProcessStep, 
    data?: any
  ): Promise<StepValidationResult> => {
    // Basic validation - can be extended with step-specific logic
    const errors: string[] = [];
    const warnings: string[] = [];

    // Add step-specific validation logic here
    switch (step) {
      case ProcessStep.UPLOAD:
        if (!data?.fileName) {
          errors.push('Please upload a manuscript file');
        }
        break;
      case ProcessStep.METADATA:
        if (!data?.title?.trim()) {
          errors.push('Manuscript title is required');
        }
        if (!data?.authors?.length) {
          errors.push('At least one author is required');
        }
        break;
      case ProcessStep.KEYWORDS:
        if (!data?.selectedPrimaryKeywords?.length) {
          errors.push('Please select at least one primary keyword');
        }
        break;
      // Add more validation cases as needed
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
    };
  }, []);

  // Navigation handlers
  const navigateToStep = useCallback(async (targetStep: ProcessStep, data?: any) => {
    if (!navigationState.canNavigateToStep(targetStep)) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Validate current step before navigation if moving forward
      const targetIndex = steps.findIndex(s => s.key === targetStep);
      if (targetIndex > currentStepIndex) {
        const validation = await validateStep(state.currentStep, data);
        
        setState(prev => ({
          ...prev,
          validationResults: {
            ...prev.validationResults,
            [state.currentStep]: validation,
          },
        }));

        if (!validation.canProceed) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      // Update step data if provided
      if (data !== undefined) {
        setState(prev => ({
          ...prev,
          stepData: {
            ...prev.stepData,
            [state.currentStep]: data,
          },
        }));
      }

      // Mark current step as completed if moving forward
      if (targetIndex > currentStepIndex && !state.completedSteps.includes(state.currentStep)) {
        setState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, state.currentStep],
        }));
      }

      // Navigate to target step
      setState(prev => ({
        ...prev,
        currentStep: targetStep,
        isLoading: false,
      }));

      // Announce step change for screen readers
      const stepDefinition = steps.find(s => s.key === targetStep);
      if (stepDefinition) {
        announceMessage(`Navigated to ${stepDefinition.title}`, 'polite');
      }

      onStepChange?.(targetStep, data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Navigation failed');
      setState(prev => ({ ...prev, error: err, isLoading: false }));
      onError?.(err, state.currentStep);
    }
  }, [navigationState, steps, currentStepIndex, state.currentStep, state.completedSteps, validateStep, onStepChange, onError]);

  const handleNext = useCallback((data?: any) => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      navigateToStep(steps[nextStepIndex].key, data);
    } else {
      // Workflow complete
      onComplete?.(state.stepData);
    }
  }, [currentStepIndex, steps, navigateToStep, onComplete, state.stepData]);

  const handlePrevious = useCallback(() => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0 && allowBackNavigation) {
      navigateToStep(steps[prevStepIndex].key);
    }
  }, [currentStepIndex, steps, allowBackNavigation, navigateToStep]);

  const handleSkip = useCallback(() => {
    if (currentStepDefinition?.isOptional && allowSkipping) {
      handleNext();
    }
  }, [currentStepDefinition, allowSkipping, handleNext]);

  const retryCurrentStep = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined, isLoading: false }));
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && Object.keys(state.stepData).length > 0) {
      // Implement auto-save logic here
      // This could save to localStorage or make API calls
      const saveData = {
        processId,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        stepData: state.stepData,
        timestamp: new Date().toISOString(),
      };
      
      localStorage.setItem(`scholarfinder-process-${processId}`, JSON.stringify(saveData));
    }
  }, [autoSave, processId, state.currentStep, state.completedSteps, state.stepData]);

  // Load saved data on mount
  useEffect(() => {
    if (autoSave) {
      const savedData = localStorage.getItem(`scholarfinder-process-${processId}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setState(prev => ({
            ...prev,
            currentStep: parsed.currentStep || prev.currentStep,
            completedSteps: parsed.completedSteps || prev.completedSteps,
            stepData: parsed.stepData || prev.stepData,
          }));
        } catch (error) {
          console.warn('Failed to load saved workflow data:', error);
        }
      }
    }
  }, [autoSave, processId]);

  // Cleanup prefetches on unmount
  useEffect(() => {
    return () => {
      cancelPrefetches();
    };
  }, [cancelPrefetches]);

  if (!currentStepDefinition) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Invalid step configuration. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  const StepComponent = currentStepDefinition.component;
  const stepProps: StepComponentProps = {
    processId,
    jobId,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSkip: currentStepDefinition.isOptional ? handleSkip : undefined,
    isLoading: state.isLoading,
    stepData: state.stepData[state.currentStep],
  };

  return (
    <div 
      className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        "space-y-4 sm:space-y-6 lg:space-y-8",
        className
      )}
      role="main"
      aria-label="ScholarFinder Workflow"
      {...getNavigationAria('step', 1, steps.length, currentStepIndex + 1)}
    >
      {/* Skip to Content Link */}
      <a
        href="#step-content"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded"
      >
        Skip to step content
      </a>

      {/* Progress Indicator */}
      <div className="w-full">
        <ProgressIndicator
          steps={steps}
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={navigateToStep}
          progress={workflowProgress}
          disabled={state.isLoading}
        />
      </div>

      {/* Error Display */}
      {state.error && (
        <Alert 
          variant="destructive"
          role="alert"
          aria-live="assertive"
          className="mx-auto max-w-4xl"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span>{state.error.message}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={retryCurrentStep}
              className="self-start sm:self-auto"
              aria-label="Retry current step"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Step Container */}
      <div id="step-content" tabIndex={-1}>
        <StepContainer
          step={currentStepDefinition}
          stepIndex={currentStepIndex}
          totalSteps={steps.length}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={currentStepDefinition.isOptional ? handleSkip : undefined}
          canProceed={navigationState.canProceedToNext}
          canGoBack={navigationState.canGoToPrevious}
          canSkip={currentStepDefinition.isOptional && allowSkipping}
          isLoading={state.isLoading}
          validationResult={state.validationResults[state.currentStep]}
          estimatedDuration={currentStepDefinition.estimatedDuration}
        >
          <Suspense fallback={<StepLoadingFallback />}>
            <StepComponent {...stepProps} />
          </Suspense>
        </StepContainer>
      </div>

      {/* Live Region for Announcements */}
      <div 
        {...getLiveRegionAria('polite', true)}
        className="sr-only"
        id="wizard-announcements"
      />
    </div>
  );
};