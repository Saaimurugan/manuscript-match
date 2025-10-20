import React from 'react';
import { ProcessStep } from '../../types/process';
import { StepDefinition, WorkflowProgress } from '../../types/workflow';
import { cn } from '@/lib/utils';
import { Check, Clock, Lock } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { getProgressAria, getButtonAria, getNavigationAria } from '../../utils/accessibility';
import { responsiveText, responsiveSpacing } from '../../utils/responsive';

interface ProgressIndicatorProps {
  steps: StepDefinition[];
  currentStep: ProcessStep;
  completedSteps: ProcessStep[];
  onStepClick?: (step: ProcessStep) => void;
  disabled?: boolean;
  progress?: WorkflowProgress;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  disabled = false,
  progress,
  className
}) => {
  const { isMobile, isTablet } = useResponsive();
  const { announceMessage } = useAccessibilityContext();
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  
  const getStepStatus = (step: StepDefinition, index: number) => {
    if (completedSteps.includes(step.key)) {
      return 'completed';
    }
    if (step.key === currentStep) {
      return 'current';
    }
    if (index < currentStepIndex) {
      return 'available';
    }
    return 'locked';
  };

  const canNavigateToStep = (step: StepDefinition, index: number) => {
    if (disabled) return false;
    if (!onStepClick) return false;
    
    const status = getStepStatus(step, index);
    return status === 'completed' || status === 'current' || 
           (status === 'available' && index <= currentStepIndex + 1);
  };

  const handleStepClick = (step: StepDefinition, index: number) => {
    if (canNavigateToStep(step, index)) {
      announceMessage(`Navigating to ${step.title}`, 'polite');
      onStepClick?.(step.key);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      {progress && (
        <div className={cn("mb-4 sm:mb-6", responsiveSpacing({ xs: '4', sm: '6' }, 'mb'))}>
          <div className={cn(
            "flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 mb-2",
            responsiveText({ xs: 'xs', sm: 'sm' })
          )}>
            <span className="text-muted-foreground">
              Progress: {progress.completedSteps} of {progress.totalSteps} steps
            </span>
            <span className="text-muted-foreground font-medium">
              {Math.round(progress.progressPercentage)}% complete
            </span>
          </div>
          <div 
            className="w-full bg-secondary rounded-full h-2 sm:h-3"
            role="progressbar"
            {...getProgressAria(
              progress.progressPercentage,
              0,
              100,
              `Workflow progress: ${progress.completedSteps} of ${progress.totalSteps} steps completed`,
              `${Math.round(progress.progressPercentage)}% complete`
            )}
          >
            <div 
              className="bg-primary h-2 sm:h-3 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
          {progress.estimatedTimeRemaining && (
            <div className={cn(
              "mt-1 flex items-center gap-1 text-muted-foreground",
              responsiveText({ xs: 'xs', sm: 'sm' })
            )}>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Estimated time remaining: {progress.estimatedTimeRemaining} minutes</span>
            </div>
          )}
        </div>
      )}

      {/* Desktop Step Indicator */}
      <div className="hidden lg:flex items-center justify-between">
        <nav 
          role="navigation" 
          aria-label="Workflow steps"
          className="flex items-center justify-between w-full"
        >
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            const isClickable = canNavigateToStep(step, index);
            
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleStepClick(step, index)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 xl:w-12 xl:h-12 rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      {
                        'bg-primary border-primary text-primary-foreground': status === 'completed',
                        'bg-primary border-primary text-primary-foreground ring-2 ring-primary/20': status === 'current',
                        'bg-background border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary': status === 'available' && isClickable,
                        'bg-muted border-muted text-muted-foreground cursor-not-allowed': status === 'locked' || !isClickable,
                      }
                    )}
                    {...getButtonAria(
                      `${step.title}${step.isOptional ? ' (Optional)' : ''}`,
                      undefined,
                      undefined,
                      undefined,
                      !isClickable
                    )}
                    {...getNavigationAria(
                      status === 'current' ? 'step' : false,
                      undefined,
                      steps.length,
                      index + 1
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="h-5 w-5 xl:h-6 xl:w-6" aria-hidden="true" />
                    ) : status === 'locked' ? (
                      <Lock className="h-4 w-4 xl:h-5 xl:w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm xl:text-base font-medium">{index + 1}</span>
                    )}
                  </button>
                  
                  <div className="mt-2 text-center max-w-20 xl:max-w-24">
                    <div className={cn(
                      responsiveText({ lg: 'xs', xl: 'sm' }),
                      "font-medium",
                      {
                        'text-primary': status === 'current' || status === 'completed',
                        'text-muted-foreground': status === 'available' || status === 'locked',
                      }
                    )}>
                      {step.title}
                    </div>
                    {step.isOptional && (
                      <div className={cn(
                        responsiveText({ lg: 'xs', xl: 'xs' }),
                        "text-muted-foreground mt-1"
                      )}>
                        (Optional)
                      </div>
                    )}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "flex-1 h-0.5 mx-2 xl:mx-4 transition-colors duration-200",
                      {
                        'bg-primary': completedSteps.includes(steps[index + 1].key) || 
                                      (status === 'completed' && index < currentStepIndex),
                        'bg-muted': status !== 'completed' || index >= currentStepIndex,
                      }
                    )}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Mobile/Tablet Step Indicator */}
      <div className="lg:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
          <div className={cn(
            "font-medium",
            responsiveText({ xs: 'sm', sm: 'base' })
          )}>
            Step {currentStepIndex + 1} of {steps.length}
          </div>
          <div className={cn(
            "text-muted-foreground",
            responsiveText({ xs: 'sm', sm: 'base' })
          )}>
            {steps[currentStepIndex]?.title}
          </div>
        </div>
        
        <nav role="navigation" aria-label="Workflow steps">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const status = getStepStatus(step, index);
              const isClickable = canNavigateToStep(step, index);
              
              return (
                <button
                  key={step.key}
                  onClick={() => handleStepClick(step, index)}
                  disabled={!isClickable}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg border transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    {
                      'bg-primary/5 border-primary': status === 'current',
                      'bg-muted/50 border-muted': status === 'completed',
                      'bg-background border-border hover:bg-muted/50': status === 'available' && isClickable,
                      'bg-muted/20 border-muted cursor-not-allowed': status === 'locked' || !isClickable,
                    }
                  )}
                  {...getButtonAria(
                    `${step.title}${step.isOptional ? ' (Optional)' : ''}`,
                    undefined,
                    undefined,
                    undefined,
                    !isClickable
                  )}
                  {...getNavigationAria(
                    status === 'current' ? 'step' : false,
                    undefined,
                    steps.length,
                    index + 1
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border font-medium",
                    responsiveText({ xs: 'xs', sm: 'sm' }),
                    {
                      'bg-primary border-primary text-primary-foreground': status === 'completed' || status === 'current',
                      'bg-background border-muted-foreground text-muted-foreground': status === 'available',
                      'bg-muted border-muted text-muted-foreground': status === 'locked',
                    }
                  )}>
                    {status === 'completed' ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                    ) : status === 'locked' ? (
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium truncate",
                      responsiveText({ xs: 'sm', sm: 'base' }),
                      {
                        'text-primary': status === 'current',
                        'text-foreground': status === 'completed' || status === 'available',
                        'text-muted-foreground': status === 'locked',
                      }
                    )}>
                      {step.title}
                      {step.isOptional && (
                        <span className="text-muted-foreground ml-1">(Optional)</span>
                      )}
                    </div>
                    {step.description && (
                      <div className={cn(
                        "text-muted-foreground mt-1 line-clamp-2",
                        responsiveText({ xs: 'xs', sm: 'sm' })
                      )}>
                        {step.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};