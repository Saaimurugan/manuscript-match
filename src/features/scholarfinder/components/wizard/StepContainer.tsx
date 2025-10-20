import React from 'react';
import { ProcessStep } from '../../types/process';
import { StepDefinition, StepValidationResult } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  SkipForward, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { responsiveText, responsiveSpacing, getContainerClasses } from '../../utils/responsive';
import { getButtonAria, getLiveRegionAria } from '../../utils/accessibility';

interface StepContainerProps {
  step: StepDefinition;
  stepIndex: number;
  totalSteps: number;
  children: React.ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  canProceed?: boolean;
  canGoBack?: boolean;
  canSkip?: boolean;
  isLoading?: boolean;
  validationResult?: StepValidationResult;
  estimatedDuration?: number;
  className?: string;
}

export const StepContainer: React.FC<StepContainerProps> = ({
  step,
  stepIndex,
  totalSteps,
  children,
  onNext,
  onPrevious,
  onSkip,
  canProceed = true,
  canGoBack = true,
  canSkip = false,
  isLoading = false,
  validationResult,
  estimatedDuration,
  className
}) => {
  const { isMobile, isTablet } = useResponsive();
  const { announceMessage } = useAccessibilityContext();
  
  const hasErrors = validationResult && !validationResult.isValid;
  const hasWarnings = validationResult && validationResult.warnings.length > 0;
  const showSkipOption = step.isOptional && canSkip && onSkip;

  return (
    <div className={cn(
      "w-full mx-auto",
      getContainerClasses('4xl', { xs: '0', sm: '4', lg: '6' }),
      className
    )}>
      <Card className="shadow-lg">
        <CardHeader className={cn(
          "pb-4",
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge 
                variant="outline" 
                className={cn(
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}
              >
                Step {stepIndex + 1} of {totalSteps}
              </Badge>
              {step.isOptional && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    responsiveText({ xs: 'xs', sm: 'sm' })
                  )}
                >
                  Optional
                </Badge>
              )}
            </div>
            
            {estimatedDuration && (
              <div className={cn(
                "flex items-center gap-1 text-muted-foreground",
                responsiveText({ xs: 'xs', sm: 'sm' })
              )}>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>~{estimatedDuration} min</span>
              </div>
            )}
          </div>
          
          <CardTitle className={cn(
            responsiveText({ xs: 'xl', sm: '2xl', lg: '3xl' })
          )}>
            {step.title}
          </CardTitle>
          <CardDescription className={cn(
            responsiveText({ xs: 'sm', sm: 'base' })
          )}>
            {step.description}
          </CardDescription>
        </CardHeader>

        <CardContent className={cn(
          "space-y-4 sm:space-y-6 relative",
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          {/* Validation Messages */}
          {hasErrors && (
            <Alert 
              variant="destructive"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Please fix the following errors:</div>
                  <ul className="list-disc list-inside space-y-1" role="list">
                    {validationResult.errors.map((error, index) => (
                      <li key={index} className={cn(
                        responsiveText({ xs: 'xs', sm: 'sm' })
                      )}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {hasWarnings && !hasErrors && (
            <Alert role="alert" aria-live="polite">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Please review the following:</div>
                  <ul className="list-disc list-inside space-y-1" role="list">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index} className={cn(
                        responsiveText({ xs: 'xs', sm: 'sm' })
                      )}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <div 
            className="min-h-[300px] sm:min-h-[400px]"
            role="main"
            aria-label={`${step.title} content`}
          >
            {children}
          </div>

          {/* Loading State Overlay */}
          {isLoading && (
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg"
              role="status"
              aria-live="polite"
              {...getLiveRegionAria('polite', true, true)}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Processing...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Navigation Footer */}
        <div className={cn(
          "border-t bg-muted/20",
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-2">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              {stepIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={onPrevious}
                  disabled={!canGoBack || isLoading}
                  className="flex items-center gap-2 min-h-[44px]"
                  {...getButtonAria(
                    'Go to previous step',
                    undefined,
                    undefined,
                    undefined,
                    !canGoBack || isLoading
                  )}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2">
              {showSkipOption && (
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px]"
                  {...getButtonAria(
                    'Skip this optional step',
                    undefined,
                    undefined,
                    undefined,
                    isLoading
                  )}
                >
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                  <span>Skip this step</span>
                </Button>
              )}

              {stepIndex < totalSteps - 1 ? (
                <Button
                  onClick={onNext}
                  disabled={!canProceed || isLoading || (hasErrors && !validationResult?.canProceed)}
                  className="flex items-center gap-2 min-h-[44px]"
                  {...getButtonAria(
                    'Continue to next step',
                    undefined,
                    undefined,
                    undefined,
                    !canProceed || isLoading || (hasErrors && !validationResult?.canProceed)
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  disabled={!canProceed || isLoading || (hasErrors && !validationResult?.canProceed)}
                  className="flex items-center gap-2 min-h-[44px]"
                  variant="default"
                  {...getButtonAria(
                    'Complete workflow',
                    undefined,
                    undefined,
                    undefined,
                    !canProceed || isLoading || (hasErrors && !validationResult?.canProceed)
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Completing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Complete</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Step Progress Indicator */}
          <div 
            className="mt-4 flex items-center gap-1"
            role="progressbar"
            aria-label="Step progress"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuetext={`Step ${stepIndex + 1} of ${totalSteps}`}
          >
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 sm:h-1.5 flex-1 rounded-full transition-colors duration-200",
                  {
                    'bg-primary': index <= stepIndex,
                    'bg-muted': index > stepIndex,
                  }
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};