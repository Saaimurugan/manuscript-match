/**
 * Process Step Tracker Component
 * Displays and manages the current step in the manuscript analysis workflow
 */

import React from 'react';
import { CheckCircle, Circle, FileText, Search, Zap, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUpdateProcessStep } from '@/hooks/useProcesses';
import type { Process } from '@/types/api';

interface ProcessStepInfo {
  id: string;
  order: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PROCESS_STEPS: ProcessStepInfo[] = [
  {
    id: 'UPLOAD',
    order: 1,
    title: 'Upload & Extract',
    description: 'Upload manuscript and extract metadata',
    icon: FileText,
  },
  {
    id: 'METADATA_EXTRACTION',
    order: 2,
    title: 'Metadata Extraction',
    description: 'Extract and process manuscript metadata',
    icon: FileText,
  },
  {
    id: 'KEYWORD_ENHANCEMENT',
    order: 3,
    title: 'Keyword Enhancement',
    description: 'Enhance keywords and generate search terms',
    icon: Zap,
  },
  {
    id: 'DATABASE_SEARCH',
    order: 4,
    title: 'Database Search',
    description: 'Search academic databases for potential reviewers',
    icon: Search,
  },
  {
    id: 'MANUAL_SEARCH',
    order: 5,
    title: 'Manual Search',
    description: 'Add reviewers manually if needed',
    icon: Users,
  },
  {
    id: 'VALIDATION',
    order: 6,
    title: 'Author Validation',
    description: 'Validate reviewers against conflict rules',
    icon: Shield,
  },
  {
    id: 'RECOMMENDATIONS',
    order: 7,
    title: 'Recommendations',
    description: 'Review and filter potential reviewers',
    icon: Users,
  },
  {
    id: 'SHORTLIST',
    order: 8,
    title: 'Shortlist',
    description: 'Create shortlist of selected reviewers',
    icon: Users,
  },
  {
    id: 'EXPORT',
    order: 9,
    title: 'Export',
    description: 'Export final reviewer recommendations',
    icon: FileText,
  },
];

interface ProcessStepTrackerProps {
  process: Process;
  onStepChange?: (step: string) => void;
  allowStepNavigation?: boolean;
}

export const ProcessStepTracker: React.FC<ProcessStepTrackerProps> = ({
  process,
  onStepChange,
  allowStepNavigation = false,
}) => {
  const { toast } = useToast();
  const updateStepMutation = useUpdateProcessStep();

  // Safety check for process
  if (!process) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading process information...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug logging
  console.log('ProcessStepTracker - Current process:', {
    id: process.id,
    currentStep: process.currentStep,
    status: process.status
  });

  const getCurrentStepOrder = () => {
    if (!process?.currentStep) {
      console.warn('ProcessStepTracker - No currentStep found, defaulting to 1');
      return 1;
    }
    
    const currentStep = PROCESS_STEPS.find(step => step.id === process.currentStep);
    if (!currentStep) {
      console.warn(`ProcessStepTracker - Invalid currentStep: ${process.currentStep}, defaulting to 1`);
      return 1;
    }
    
    return currentStep.order;
  };

  const handleStepClick = async (stepId: string) => {
    console.log('handleStepClick called with:', {
      stepId,
      allowStepNavigation,
      currentStep: process.currentStep,
      processId: process.id
    });

    if (!allowStepNavigation || stepId === process.currentStep) {
      console.log('Skipping step click - navigation not allowed or same step');
      return;
    }

    // Validate step ID
    const stepInfo = PROCESS_STEPS.find(s => s.id === stepId);
    console.log('Step validation:', { 
      stepId, 
      stepInfo, 
      allSteps: PROCESS_STEPS.map(s => s.id),
      stepIdType: typeof stepId,
      stepIdLength: stepId?.length 
    });
    
    if (!stepInfo) {
      console.error('Invalid step ID:', stepId);
      console.error('Available steps:', PROCESS_STEPS.map(s => ({ id: s.id, order: s.order })));
      toast({
        title: 'Error',
        description: `Invalid step: "${stepId}". Available steps: ${PROCESS_STEPS.map(s => s.id).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateStepMutation.mutateAsync({
        processId: process.id,
        step: stepId,
      });
      
      onStepChange?.(stepId);
      
      toast({
        title: 'Step updated',
        description: `Moved to step: ${stepInfo.title}`,
      });
    } catch (error) {
      console.error('Step update error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update process step. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStepProgress = () => {
    const currentOrder = getCurrentStepOrder();
    return Math.min((currentOrder / PROCESS_STEPS.length) * 100, 100);
  };

  const getStepStatus = (stepId: string) => {
    if (!process?.currentStep) return stepId === 'UPLOAD' ? 'current' : 'upcoming';
    
    const currentOrder = getCurrentStepOrder();
    const stepOrder = PROCESS_STEPS.find(step => step.id === stepId)?.order || 1;
    
    if (stepOrder < currentOrder) return 'completed';
    if (stepOrder === currentOrder) return 'current';
    return 'upcoming';
  };

  const getStepIcon = (step: ProcessStep, status: string) => {
    const IconComponent = step.icon;
    
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    
    if (status === 'current') {
      return <IconComponent className="w-5 h-5 text-primary" />;
    }
    
    return <Circle className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Workflow Progress</CardTitle>
          <Badge variant="outline">
            Step {getCurrentStepOrder()} of {PROCESS_STEPS.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(getStepProgress())}% Complete</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Step List */}
        <div className="space-y-4">
          {PROCESS_STEPS.map((step) => {
            const status = getStepStatus(step.id);
            const isClickable = allowStepNavigation && status !== 'upcoming';
            
            return (
              <div
                key={step.id}
                className={`flex items-start space-x-4 p-3 rounded-lg transition-colors ${
                  isClickable 
                    ? 'cursor-pointer hover:bg-muted/50' 
                    : ''
                } ${
                  status === 'current' 
                    ? 'bg-primary/5 border border-primary/20' 
                    : ''
                }`}
                onClick={() => isClickable && handleStepClick(step.id)}
              >
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step, status)}
                </div>
                
                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${
                      status === 'current' 
                        ? 'text-primary' 
                        : status === 'completed'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </h4>
                    
                    {status === 'completed' && (
                      <Badge variant="secondary" className="text-xs">
                        Complete
                      </Badge>
                    )}
                    
                    {status === 'current' && (
                      <Badge className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
                
                {/* Step Number */}
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : status === 'current'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.order}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        {allowStepNavigation && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              disabled={getCurrentStepOrder() <= 1 || updateStepMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                const currentOrder = getCurrentStepOrder();
                const prevStep = PROCESS_STEPS.find(s => s.order === currentOrder - 1);
                if (prevStep) handleStepClick(prevStep.id);
              }}
            >
              Previous Step
            </Button>
            
            <Button
              disabled={(() => {
                const currentOrder = getCurrentStepOrder();
                const isDisabled = currentOrder >= PROCESS_STEPS.length || updateStepMutation.isPending;
                console.log('Next Step button disabled check:', {
                  currentOrder,
                  stepsLength: PROCESS_STEPS.length,
                  isPending: updateStepMutation.isPending,
                  isDisabled
                });
                return isDisabled;
              })()}
              onClick={(e) => {
                e.stopPropagation();
                const currentOrder = getCurrentStepOrder();
                console.log('Next Step clicked - currentOrder:', currentOrder);
                const nextStep = PROCESS_STEPS.find(s => s.order === currentOrder + 1);
                console.log('Next Step found:', nextStep);
                if (nextStep) {
                  console.log('Calling handleStepClick with:', nextStep.id);
                  handleStepClick(nextStep.id);
                } else {
                  console.error('No next step found for order:', currentOrder + 1);
                }
              }}
            >
              {updateStepMutation.isPending ? 'Updating...' : 'Next Step'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};