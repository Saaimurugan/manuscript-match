// Workflow and Navigation Types
// Types for step navigation and workflow management

import { ProcessStep } from './process';

export interface StepDefinition {
  key: ProcessStep;
  title: string;
  description: string;
  component: React.ComponentType<StepComponentProps>;
  isOptional?: boolean;
  estimatedDuration?: number; // in minutes
  prerequisites?: ProcessStep[];
}

export interface StepComponentProps {
  processId: string;
  jobId: string;
  onNext: (data?: any) => void;
  onPrevious: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  stepData?: any;
}

export interface NavigationState {
  currentStep: ProcessStep;
  completedSteps: ProcessStep[];
  availableSteps: ProcessStep[];
  canNavigateToStep: (step: ProcessStep) => boolean;
  canProceedToNext: boolean;
  canGoToPrevious: boolean;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

export interface WorkflowProgress {
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number; // in minutes
}

export interface StepTransition {
  from: ProcessStep;
  to: ProcessStep;
  timestamp: Date;
  data?: any;
  userId: string;
}

export interface WorkflowConfiguration {
  steps: StepDefinition[];
  allowSkipping: boolean;
  allowBackNavigation: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds
  sessionTimeout: number; // in milliseconds
}

export interface ErrorRecoveryOptions {
  retryAction?: () => Promise<void>;
  skipAction?: () => void;
  resetAction?: () => void;
  contactSupport?: boolean;
}

export interface WorkflowError {
  step: ProcessStep;
  type: 'validation' | 'api' | 'network' | 'timeout' | 'unknown';
  message: string;
  details?: any;
  timestamp: Date;
  recoveryOptions: ErrorRecoveryOptions;
}