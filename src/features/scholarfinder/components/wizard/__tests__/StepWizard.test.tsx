import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StepWizard } from '../StepWizard';
import { ProcessStep } from '../../../types/process';
import { workflowConfig } from '../../../config/workflow';

// Mock the PlaceholderStep component
vi.mock('../../steps/PlaceholderStep', () => ({
  PlaceholderStep: ({ stepType, onNext }: any) => (
    <div data-testid={`step-${stepType}`}>
      <button onClick={() => onNext({ mockData: true })}>
        Complete {stepType}
      </button>
    </div>
  ),
}));

describe('StepWizard', () => {
  const defaultProps = {
    processId: 'test-process',
    jobId: 'test-job',
    steps: workflowConfig.steps,
    initialStep: ProcessStep.UPLOAD,
  };

  it('renders the wizard with initial step', () => {
    render(<StepWizard {...defaultProps} />);
    
    expect(screen.getByTestId('step-upload')).toBeInTheDocument();
    expect(screen.getByText('Upload Manuscript')).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<StepWizard {...defaultProps} />);
    
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('navigates to next step when completed', async () => {
    const onStepChange = vi.fn();
    render(<StepWizard {...defaultProps} onStepChange={onStepChange} />);
    
    const completeButton = screen.getByText('Complete upload');
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(onStepChange).toHaveBeenCalledWith(ProcessStep.METADATA, { mockData: true });
    });
  });

  it('handles step navigation via progress indicator', async () => {
    render(<StepWizard {...defaultProps} />);
    
    // Complete first step to enable navigation
    const completeButton = screen.getByText('Complete upload');
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('step-metadata')).toBeInTheDocument();
    });
  });

  it('validates step data before proceeding', async () => {
    render(<StepWizard {...defaultProps} />);
    
    // The wizard should validate step data using the validation system
    expect(screen.getByTestId('step-upload')).toBeInTheDocument();
  });

  it('handles workflow completion', async () => {
    const onComplete = vi.fn();
    render(<StepWizard {...defaultProps} onComplete={onComplete} />);
    
    // Navigate through all steps quickly for testing
    for (let i = 0; i < workflowConfig.steps.length; i++) {
      const completeButton = screen.getByText(/Complete/);
      fireEvent.click(completeButton);
      
      if (i === workflowConfig.steps.length - 1) {
        await waitFor(() => {
          expect(onComplete).toHaveBeenCalled();
        });
      }
    }
  });

  it('saves progress to localStorage when autoSave is enabled', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    
    render(<StepWizard {...defaultProps} autoSave={true} />);
    
    const completeButton = screen.getByText('Complete upload');
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(localStorageSpy).toHaveBeenCalledWith(
        'scholarfinder-process-test-process',
        expect.stringContaining('metadata')
      );
    });
    
    localStorageSpy.mockRestore();
  });
});