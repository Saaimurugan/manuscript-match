/**
 * Custom hooks for workflow state management and step navigation
 * Provides high-level abstractions for managing ScholarFinder workflow state
 */

import { useState, useEffect, useCallback } from 'react';
import { useProcess, useUpdateProcessStep, useProcessNavigation } from './useProcessManagement';
import { ProcessStep, type Process } from '../types/process';
import type { Reviewer } from '../types/api';

/**
 * Workflow state interface
 */
export interface WorkflowState {
  process: Process | null;
  currentStep: ProcessStep;
  isLoading: boolean;
  error: string | null;
  canProceed: boolean;
  stepProgress: Record<ProcessStep, boolean>;
}

/**
 * Hook for managing overall workflow state
 */
export const useWorkflowState = (processId: string) => {
  const { data: process, isLoading: processLoading, error: processError } = useProcess(processId);
  const [error, setError] = useState<string | null>(null);

  // Calculate step completion status
  const stepProgress = useCallback((process: Process | null): Record<ProcessStep, boolean> => {
    if (!process) {
      return {
        [ProcessStep.UPLOAD]: false,
        [ProcessStep.METADATA]: false,
        [ProcessStep.KEYWORDS]: false,
        [ProcessStep.SEARCH]: false,
        [ProcessStep.MANUAL]: false,
        [ProcessStep.VALIDATION]: false,
        [ProcessStep.RECOMMENDATIONS]: false,
        [ProcessStep.SHORTLIST]: false,
        [ProcessStep.EXPORT]: false,
      };
    }

    return {
      [ProcessStep.UPLOAD]: !!process.stepData.upload,
      [ProcessStep.METADATA]: !!process.stepData.metadata,
      [ProcessStep.KEYWORDS]: !!process.stepData.keywords,
      [ProcessStep.SEARCH]: !!process.stepData.search,
      [ProcessStep.MANUAL]: !!process.stepData.manual,
      [ProcessStep.VALIDATION]: process.stepData.validation?.validationStatus === 'completed',
      [ProcessStep.RECOMMENDATIONS]: !!process.stepData.recommendations,
      [ProcessStep.SHORTLIST]: !!process.stepData.shortlist && process.stepData.shortlist.selectedReviewers.length > 0,
      [ProcessStep.EXPORT]: !!process.stepData.export,
    };
  }, []);

  // Determine if user can proceed to next step
  const canProceed = useCallback((process: Process | null): boolean => {
    if (!process) return false;

    const progress = stepProgress(process);
    const currentStep = process.currentStep;

    switch (currentStep) {
      case ProcessStep.UPLOAD:
        return progress[ProcessStep.UPLOAD];
      case ProcessStep.METADATA:
        return progress[ProcessStep.METADATA];
      case ProcessStep.KEYWORDS:
        return progress[ProcessStep.KEYWORDS];
      case ProcessStep.SEARCH:
        return progress[ProcessStep.SEARCH];
      case ProcessStep.MANUAL:
        return true; // Manual step is optional
      case ProcessStep.VALIDATION:
        return progress[ProcessStep.VALIDATION];
      case ProcessStep.RECOMMENDATIONS:
        return progress[ProcessStep.RECOMMENDATIONS];
      case ProcessStep.SHORTLIST:
        return progress[ProcessStep.SHORTLIST];
      case ProcessStep.EXPORT:
        return true; // Final step
      default:
        return false;
    }
  }, [stepProgress]);

  // Clear error when process changes
  useEffect(() => {
    if (processError) {
      setError(processError.message || 'An error occurred');
    } else {
      setError(null);
    }
  }, [processError]);

  const workflowState: WorkflowState = {
    process: process || null,
    currentStep: process?.currentStep || ProcessStep.UPLOAD,
    isLoading: processLoading,
    error,
    canProceed: canProceed(process || null),
    stepProgress: stepProgress(process || null),
  };

  return workflowState;
};

/**
 * Hook for managing step-specific state and validation
 */
export const useStepState = (processId: string, step: ProcessStep) => {
  const { process, stepProgress } = useWorkflowState(processId);
  const [localError, setLocalError] = useState<string | null>(null);

  const isCompleted = stepProgress[step];
  const isCurrent = process?.currentStep === step;
  const isAccessible = process ? Object.values(ProcessStep).indexOf(step) <= Object.values(ProcessStep).indexOf(process.currentStep) : false;

  const stepData = process?.stepData[step];

  const clearError = () => setLocalError(null);

  return {
    isCompleted,
    isCurrent,
    isAccessible,
    stepData,
    error: localError,
    setError: setLocalError,
    clearError,
  };
};

/**
 * Hook for managing reviewer selection state
 */
export const useReviewerSelection = (processId: string) => {
  const { process } = useWorkflowState(processId);
  const [selectedReviewers, setSelectedReviewers] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('multiple');

  // Sync with process shortlist
  useEffect(() => {
    if (process?.stepData.shortlist?.selectedReviewers) {
      const emails = new Set(process.stepData.shortlist.selectedReviewers.map(r => r.email));
      setSelectedReviewers(emails);
    }
  }, [process?.stepData.shortlist?.selectedReviewers]);

  const toggleReviewer = (reviewerEmail: string) => {
    setSelectedReviewers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewerEmail)) {
        newSet.delete(reviewerEmail);
      } else {
        if (selectionMode === 'single') {
          newSet.clear();
        }
        newSet.add(reviewerEmail);
      }
      return newSet;
    });
  };

  const selectAll = (reviewers: Reviewer[]) => {
    const emails = new Set(reviewers.map(r => r.email));
    setSelectedReviewers(emails);
  };

  const clearSelection = () => {
    setSelectedReviewers(new Set());
  };

  const isSelected = (reviewerEmail: string) => selectedReviewers.has(reviewerEmail);

  return {
    selectedReviewers: Array.from(selectedReviewers),
    selectionMode,
    setSelectionMode,
    toggleReviewer,
    selectAll,
    clearSelection,
    isSelected,
    selectionCount: selectedReviewers.size,
  };
};

/**
 * Hook for managing form state across steps
 */
export const useStepFormState = <T extends Record<string, any>>(
  processId: string,
  step: ProcessStep,
  initialData: T
) => {
  const { stepData } = useStepState(processId, step);
  const [formData, setFormData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);

  // Sync form data with step data
  useEffect(() => {
    if (stepData) {
      setFormData({ ...initialData, ...stepData });
      setIsDirty(false);
    }
  }, [stepData, initialData]);

  const updateFormData = (updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const resetForm = () => {
    setFormData(stepData ? { ...initialData, ...stepData } : initialData);
    setIsDirty(false);
  };

  return {
    formData,
    updateFormData,
    resetForm,
    isDirty,
    setIsDirty,
  };
};

/**
 * Hook for managing validation state
 */
export const useValidationState = (processId: string) => {
  const { process } = useWorkflowState(processId);
  const validationData = process?.stepData.validation;

  const isValidating = validationData?.validationStatus === 'in_progress';
  const isCompleted = validationData?.validationStatus === 'completed';
  const hasFailed = validationData?.validationStatus === 'failed';
  const progress = validationData?.progressPercentage || 0;

  return {
    isValidating,
    isCompleted,
    hasFailed,
    progress,
    validationData,
  };
};

/**
 * Hook for managing export state
 */
export const useExportState = (processId: string) => {
  const { process } = useWorkflowState(processId);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportData = process?.stepData.export;
  const shortlistData = process?.stepData.shortlist;

  const canExport = !!(shortlistData?.selectedReviewers && shortlistData.selectedReviewers.length > 0);

  const startExport = () => {
    setIsExporting(true);
    setExportError(null);
  };

  const completeExport = () => {
    setIsExporting(false);
  };

  const failExport = (error: string) => {
    setIsExporting(false);
    setExportError(error);
  };

  return {
    canExport,
    isExporting,
    exportError,
    exportData,
    startExport,
    completeExport,
    failExport,
  };
};

/**
 * Hook for managing workflow progress and completion
 */
export const useWorkflowProgress = (processId: string) => {
  const { stepProgress, process } = useWorkflowState(processId);

  const completedSteps = Object.values(stepProgress).filter(Boolean).length;
  const totalSteps = Object.keys(stepProgress).length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const isWorkflowComplete = completedSteps === totalSteps;
  const nextIncompleteStep = Object.entries(stepProgress).find(([_, completed]) => !completed)?.[0] as ProcessStep | undefined;

  return {
    completedSteps,
    totalSteps,
    progressPercentage,
    isWorkflowComplete,
    nextIncompleteStep,
    stepProgress,
  };
};