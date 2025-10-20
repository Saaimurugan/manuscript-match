/**
 * ProcessWorkflow Page
 * Main workflow page for individual process execution with navigation
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProcessNavigation } from '../components/dashboard';
import { StepWizard } from '../components/wizard';
import { useProcess } from '../hooks/useProcessManagement';
import { ProcessStep, ProcessStatus } from '../types/process';
import { toast } from 'sonner';

const ProcessWorkflow: React.FC = () => {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<ProcessStep | undefined>();
  
  const { data: process, isLoading, error } = useProcess(processId || '', !!processId);

  // Get step from URL params or use process current step
  useEffect(() => {
    const stepParam = searchParams.get('step') as ProcessStep;
    if (stepParam && Object.values(ProcessStep).includes(stepParam)) {
      setCurrentStep(stepParam);
    } else if (process) {
      setCurrentStep(process.currentStep);
    }
  }, [searchParams, process]);

  // Update URL when step changes
  const handleStepChange = (step: ProcessStep) => {
    setCurrentStep(step);
    setSearchParams({ step });
  };

  // Handle process not found
  if (!processId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Process Not Found</h2>
              <p className="text-gray-600 mb-4">
                The requested process could not be found.
              </p>
              <Button onClick={() => navigate('/scholarfinder')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading process...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !process) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Process</h2>
              <p className="text-gray-600 mb-4">
                {error?.message || 'Failed to load the process. Please try again.'}
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
                <Button onClick={() => navigate('/scholarfinder')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process cancelled or failed state
  if (process.status === ProcessStatus.CANCELLED) {
    return (
      <div className="min-h-screen">
        <ProcessNavigation
          processId={processId}
          currentStep={currentStep}
          onStepChange={handleStepChange}
        />
        
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Process Cancelled</h2>
                <p className="text-gray-600 mb-4">
                  This process has been cancelled. You can restart it or create a new one.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Reset process to upload step
                      toast.info('Process reset functionality would be implemented here');
                    }}
                  >
                    Restart Process
                  </Button>
                  <Button onClick={() => navigate('/scholarfinder')}>
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <ProcessNavigation
        processId={processId}
        currentStep={currentStep}
        onStepChange={handleStepChange}
      />
      
      {/* Main Content */}
      <div className="container mx-auto p-6">
        <StepWizard
          processId={processId}
          initialStep={currentStep}
          onStepChange={handleStepChange}
          onComplete={(completedProcess) => {
            toast.success('Process completed successfully!', {
              description: 'All steps have been finished.'
            });
            navigate('/scholarfinder');
          }}
        />
      </div>
    </div>
  );
};

export default ProcessWorkflow;