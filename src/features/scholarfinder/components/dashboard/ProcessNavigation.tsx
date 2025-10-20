/**
 * ProcessNavigation Component
 * Handles navigation between processes and workflow steps with state preservation
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Save, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useProcess, 
  useProcessNavigation,
  useUpdateProcess 
} from '../../hooks/useProcessManagement';
import { ProcessStep, ProcessStatus } from '../../types/process';
import ProcessSwitcher from './ProcessSwitcher';
import { toast } from 'sonner';

interface ProcessNavigationProps {
  processId: string;
  currentStep?: ProcessStep;
  onStepChange?: (step: ProcessStep) => void;
  showProcessSwitcher?: boolean;
  className?: string;
}

const ProcessNavigation: React.FC<ProcessNavigationProps> = ({
  processId,
  currentStep,
  onStepChange,
  showProcessSwitcher = true,
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { data: process, isLoading } = useProcess(processId);
  const { 
    canNavigateToStep, 
    navigateToStep, 
    nextStep, 
    previousStep, 
    isNavigating 
  } = useProcessNavigation(processId);
  const updateProcess = useUpdateProcess();

  const stepOrder = [
    ProcessStep.UPLOAD,
    ProcessStep.METADATA,
    ProcessStep.KEYWORDS,
    ProcessStep.SEARCH,
    ProcessStep.MANUAL,
    ProcessStep.VALIDATION,
    ProcessStep.RECOMMENDATIONS,
    ProcessStep.SHORTLIST,
    ProcessStep.EXPORT
  ];

  const stepLabels = {
    [ProcessStep.UPLOAD]: 'Upload',
    [ProcessStep.METADATA]: 'Metadata',
    [ProcessStep.KEYWORDS]: 'Keywords',
    [ProcessStep.SEARCH]: 'Search',
    [ProcessStep.MANUAL]: 'Manual',
    [ProcessStep.VALIDATION]: 'Validation',
    [ProcessStep.RECOMMENDATIONS]: 'Recommendations',
    [ProcessStep.SHORTLIST]: 'Shortlist',
    [ProcessStep.EXPORT]: 'Export'
  };

  const activeStep = currentStep || process?.currentStep;
  const currentStepIndex = activeStep ? stepOrder.indexOf(activeStep) : 0;
  const canGoNext = currentStepIndex < stepOrder.length - 1;
  const canGoPrevious = currentStepIndex > 0;

  // Auto-save functionality
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleStepNavigation = (targetStep: ProcessStep) => {
    if (!canNavigateToStep(targetStep)) {
      toast.error('Cannot navigate to this step', {
        description: 'Please complete the previous steps first.'
      });
      return;
    }

    if (hasUnsavedChanges) {
      toast.warning('You have unsaved changes', {
        description: 'Please save your changes before navigating.'
      });
      return;
    }

    if (onStepChange) {
      onStepChange(targetStep);
    } else {
      navigateToStep(targetStep);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    
    const nextStepValue = stepOrder[currentStepIndex + 1];
    handleStepNavigation(nextStepValue);
  };

  const handlePrevious = () => {
    if (!canGoPrevious) return;
    
    const prevStepValue = stepOrder[currentStepIndex - 1];
    handleStepNavigation(prevStepValue);
  };

  const handleSave = async () => {
    if (!process) return;
    
    try {
      // This would typically save current step data
      // For now, just update the process timestamp
      await updateProcess.mutateAsync({
        processId: process.id,
        updates: {
          // Add any pending changes here
        }
      });
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast.error('Failed to save changes');
    }
  };

  const getStepStatus = (step: ProcessStep) => {
    if (!process) return 'pending';
    
    const stepIndex = stepOrder.indexOf(step);
    const currentIndex = stepOrder.indexOf(process.currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStepIcon = (step: ProcessStep) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'current':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  if (isLoading || !process) {
    return (
      <div className={`flex items-center justify-between p-4 border-b bg-white ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-64 h-10 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center justify-between p-4 border-b bg-white ${className}`}>
        {/* Left Section - Process Switcher and Info */}
        <div className="flex items-center gap-4">
          {showProcessSwitcher && (
            <ProcessSwitcher
              currentProcessId={processId}
              showBackButton={true}
            />
          )}
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* Process Status */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={process.status === ProcessStatus.COMPLETED ? 'default' : 'secondary'}
            >
              {process.status}
            </Badge>
            
            {hasUnsavedChanges && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>You have unsaved changes</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Center Section - Step Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {stepOrder.map((step, index) => {
            const status = getStepStatus(step);
            const isActive = step === activeStep;
            const canNavigate = canNavigateToStep(step);
            
            return (
              <React.Fragment key={step}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleStepNavigation(step)}
                      disabled={!canNavigate || isNavigating}
                      className={`flex items-center gap-2 ${
                        status === 'completed' ? 'text-green-600' : ''
                      }`}
                    >
                      {getStepIcon(step)}
                      <span className="hidden xl:inline">
                        {stepLabels[step]}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {stepLabels[step]} 
                      {!canNavigate && ' (Complete previous steps first)'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                {index < stepOrder.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Section - Navigation Controls */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={updateProcess.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={!canGoPrevious || isNavigating}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext || isNavigating}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Mobile Step Indicator */}
      <div className="lg:hidden flex items-center justify-center p-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Step {currentStepIndex + 1} of {stepOrder.length}:
          </span>
          <Badge variant="outline">
            {activeStep && stepLabels[activeStep]}
          </Badge>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProcessNavigation;