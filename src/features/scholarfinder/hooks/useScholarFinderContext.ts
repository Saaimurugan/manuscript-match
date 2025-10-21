/**
 * Custom hooks for accessing ScholarFinder context
 * Provides convenient access to workflow state throughout the application
 */

import { useContext } from 'react';
import { useScholarFinderContext as useScholarFinderContextFromProvider } from '../contexts/ScholarFinderContext';
import { ProcessStep } from '../types/process';
import type { Reviewer } from '../types/api';

// Re-export the context hook for external use
export { useScholarFinderContext } from '../contexts/ScholarFinderContext';

/**
 * Hook for accessing the full ScholarFinder context
 * Throws error if used outside of ScholarFinderProvider
 */
export const useScholarFinder = () => {
  const context = useScholarFinderContextFromProvider();
  if (!context) {
    throw new Error('useScholarFinder must be used within a ScholarFinderProvider');
  }
  return context;
};

/**
 * Hook for accessing current process information
 */
export const useCurrentProcess = () => {
  const { currentProcess, setCurrentProcess, switchToProcess } = useScholarFinder();
  
  return {
    process: currentProcess,
    setProcess: setCurrentProcess,
    switchToProcess,
    hasProcess: !!currentProcess,
    processId: currentProcess?.id || null,
    jobId: currentProcess?.jobId || null,
    title: currentProcess?.title || null,
    status: currentProcess?.status || null,
  };
};

/**
 * Hook for accessing user's process list
 */
export const useUserProcesses = () => {
  const { userProcesses, isLoading, error } = useScholarFinder();
  
  return {
    processes: userProcesses,
    isLoading,
    error,
    processCount: userProcesses.length,
    hasProcesses: userProcesses.length > 0,
  };
};

/**
 * Hook for step navigation and workflow state
 */
export const useWorkflowNavigation = () => {
  const { 
    currentStep, 
    setCurrentStep, 
    canProceedToNextStep, 
    completedSteps,
    currentProcess 
  } = useScholarFinder();
  
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
  
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === stepOrder.length - 1;
  
  const canGoToStep = (targetStep: ProcessStep): boolean => {
    const targetIndex = stepOrder.indexOf(targetStep);
    return targetIndex <= currentStepIndex || completedSteps.includes(targetStep);
  };
  
  const getNextStep = (): ProcessStep | null => {
    if (isLastStep) return null;
    return stepOrder[currentStepIndex + 1];
  };
  
  const getPreviousStep = (): ProcessStep | null => {
    if (isFirstStep) return null;
    return stepOrder[currentStepIndex - 1];
  };
  
  const getStepProgress = () => {
    const totalSteps = stepOrder.length;
    const completedCount = completedSteps.length;
    return {
      completed: completedCount,
      total: totalSteps,
      percentage: Math.round((completedCount / totalSteps) * 100),
    };
  };
  
  return {
    currentStep,
    setCurrentStep,
    canProceedToNextStep,
    completedSteps,
    stepOrder,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    canGoToStep,
    getNextStep,
    getPreviousStep,
    getStepProgress,
  };
};

/**
 * Hook for shortlist management
 */
export const useShortlistManagement = () => {
  const { 
    shortlist, 
    addToShortlist, 
    removeFromShortlist, 
    clearShortlist,
    currentProcess 
  } = useScholarFinder();
  
  const isInShortlist = (reviewer: Reviewer): boolean => {
    return shortlist.some(r => r.email === reviewer.email);
  };
  
  const toggleReviewer = (reviewer: Reviewer) => {
    if (isInShortlist(reviewer)) {
      removeFromShortlist(reviewer.email);
    } else {
      addToShortlist(reviewer);
    }
  };
  
  const addMultipleReviewers = (reviewers: Reviewer[]) => {
    reviewers.forEach(reviewer => {
      if (!isInShortlist(reviewer)) {
        addToShortlist(reviewer);
      }
    });
  };
  
  const removeMultipleReviewers = (reviewerEmails: string[]) => {
    reviewerEmails.forEach(email => {
      removeFromShortlist(email);
    });
  };
  
  const getShortlistStats = () => {
    return {
      count: shortlist.length,
      isEmpty: shortlist.length === 0,
      hasReviewers: shortlist.length > 0,
      maxReached: shortlist.length >= 10, // Assuming max of 10 reviewers
    };
  };
  
  return {
    shortlist,
    addToShortlist,
    removeFromShortlist,
    clearShortlist,
    isInShortlist,
    toggleReviewer,
    addMultipleReviewers,
    removeMultipleReviewers,
    getShortlistStats,
  };
};

/**
 * Hook for UI state management
 */
export const useScholarFinderUI = () => {
  const { 
    isLoading, 
    setIsLoading, 
    error, 
    setError,
    isAuthenticated,
    userId 
  } = useScholarFinder();
  
  const clearError = () => setError(null);
  
  const showError = (message: string) => setError(message);
  
  const withLoading = async <T>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await operation();
      clearError();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      showError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    setIsLoading,
    error,
    setError,
    clearError,
    showError,
    withLoading,
    isAuthenticated,
    userId,
    hasError: !!error,
  };
};

/**
 * Hook for step-specific data access
 */
export const useStepData = <T = any>(step: ProcessStep): T | null => {
  const { currentProcess } = useScholarFinder();
  
  if (!currentProcess || !currentProcess.stepData) {
    return null;
  }
  
  return (currentProcess.stepData[step] as T) || null;
};

/**
 * Hook for checking step completion status
 */
export const useStepCompletion = () => {
  const { completedSteps, currentStep } = useScholarFinder();
  
  const isStepCompleted = (step: ProcessStep): boolean => {
    return completedSteps.includes(step);
  };
  
  const isCurrentStepCompleted = (): boolean => {
    return completedSteps.includes(currentStep);
  };
  
  const getCompletionStatus = () => {
    const allSteps = [
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
    
    return allSteps.reduce((status, step) => {
      status[step] = isStepCompleted(step);
      return status;
    }, {} as Record<ProcessStep, boolean>);
  };
  
  return {
    completedSteps,
    isStepCompleted,
    isCurrentStepCompleted,
    getCompletionStatus,
  };
};

/**
 * Hook for process metadata access
 */
export const useProcessMetadata = () => {
  const { currentProcess } = useScholarFinder();
  
  if (!currentProcess) {
    return null;
  }
  
  const metadata = currentProcess.metadata;
  
  return {
    userId: metadata.userId,
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    manuscriptTitle: metadata.manuscriptTitle,
    authors: metadata.authors,
    totalReviewers: metadata.totalReviewers,
    shortlistCount: metadata.shortlistCount,
    createdAt: currentProcess.createdAt,
    updatedAt: currentProcess.updatedAt,
  };
};

/**
 * Hook for authentication-aware operations
 */
export const useAuthenticatedScholarFinder = () => {
  const { isAuthenticated, userId, error, setError } = useScholarFinder();
  
  const requireAuth = <T extends any[], R>(
    operation: (...args: T) => R
  ) => {
    return (...args: T): R | null => {
      if (!isAuthenticated) {
        setError('Authentication required for this operation');
        return null;
      }
      
      try {
        return operation(...args);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Operation failed';
        setError(errorMessage);
        return null;
      }
    };
  };
  
  return {
    isAuthenticated,
    userId,
    requireAuth,
    canPerformOperations: isAuthenticated && !!userId,
  };
};