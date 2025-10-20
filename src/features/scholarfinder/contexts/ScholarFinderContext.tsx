// ScholarFinder Context
// Context provider for ScholarFinder workflow state management

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { Process, ProcessStep } from '../types/process';
import { Reviewer } from '../types/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useProcessList } from '../hooks/useProcessManagement';

interface ScholarFinderContextType {
  // Process management
  currentProcess: Process | null;
  setCurrentProcess: (process: Process) => void;
  userProcesses: Process[];
  
  // Step navigation
  currentStep: ProcessStep;
  setCurrentStep: (step: ProcessStep) => void;
  
  // Shortlist management
  shortlist: Reviewer[];
  addToShortlist: (reviewer: Reviewer) => void;
  removeFromShortlist: (reviewerId: string) => void;
  clearShortlist: () => void;
  
  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  
  // User context integration
  isAuthenticated: boolean;
  userId: string | null;
  
  // Process switching
  switchToProcess: (processId: string) => void;
  
  // Workflow state
  canProceedToNextStep: boolean;
  completedSteps: ProcessStep[];
}

interface ScholarFinderState {
  currentProcess: Process | null;
  currentStep: ProcessStep;
  shortlist: Reviewer[];
  isLoading: boolean;
  error: string | null;
  userProcesses: Process[];
}

type ScholarFinderAction =
  | { type: 'SET_CURRENT_PROCESS'; payload: Process }
  | { type: 'SET_CURRENT_STEP'; payload: ProcessStep }
  | { type: 'ADD_TO_SHORTLIST'; payload: Reviewer }
  | { type: 'REMOVE_FROM_SHORTLIST'; payload: string }
  | { type: 'CLEAR_SHORTLIST' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER_PROCESSES'; payload: Process[] }
  | { type: 'UPDATE_PROCESS_IN_LIST'; payload: Process }
  | { type: 'REMOVE_PROCESS_FROM_LIST'; payload: string };

const initialState: ScholarFinderState = {
  currentProcess: null,
  currentStep: ProcessStep.UPLOAD,
  shortlist: [],
  isLoading: false,
  error: null,
  userProcesses: [],
};

const scholarFinderReducer = (
  state: ScholarFinderState,
  action: ScholarFinderAction
): ScholarFinderState => {
  switch (action.type) {
    case 'SET_CURRENT_PROCESS':
      return {
        ...state,
        currentProcess: action.payload,
        currentStep: action.payload.currentStep,
        // Sync shortlist with process data
        shortlist: action.payload.stepData.shortlist?.selectedReviewers || [],
      };
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };
    case 'ADD_TO_SHORTLIST':
      // Check if reviewer is already in shortlist
      const isAlreadyInShortlist = state.shortlist.some(
        (reviewer) => reviewer.email === action.payload.email
      );
      if (isAlreadyInShortlist) {
        return state;
      }
      return {
        ...state,
        shortlist: [...state.shortlist, action.payload],
      };
    case 'REMOVE_FROM_SHORTLIST':
      return {
        ...state,
        shortlist: state.shortlist.filter(
          (reviewer) => reviewer.email !== action.payload
        ),
      };
    case 'CLEAR_SHORTLIST':
      return {
        ...state,
        shortlist: [],
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_USER_PROCESSES':
      return {
        ...state,
        userProcesses: action.payload,
      };
    case 'UPDATE_PROCESS_IN_LIST':
      return {
        ...state,
        userProcesses: state.userProcesses.map(process =>
          process.id === action.payload.id ? action.payload : process
        ),
        // Update current process if it's the same one
        currentProcess: state.currentProcess?.id === action.payload.id 
          ? action.payload 
          : state.currentProcess,
      };
    case 'REMOVE_PROCESS_FROM_LIST':
      return {
        ...state,
        userProcesses: state.userProcesses.filter(process => process.id !== action.payload),
        // Clear current process if it was deleted
        currentProcess: state.currentProcess?.id === action.payload 
          ? null 
          : state.currentProcess,
      };
    default:
      return state;
  }
};

const ScholarFinderContext = createContext<ScholarFinderContextType | undefined>(
  undefined
);

export const useScholarFinderContext = (): ScholarFinderContextType => {
  const context = useContext(ScholarFinderContext);
  if (!context) {
    throw new Error(
      'useScholarFinderContext must be used within a ScholarFinderProvider'
    );
  }
  return context;
};

interface ScholarFinderProviderProps {
  children: ReactNode;
}

export const ScholarFinderProvider: React.FC<ScholarFinderProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(scholarFinderReducer, initialState);
  
  // Integration with authentication context
  const { user, isAuthenticated } = useAuth();
  
  // Fetch user processes when authenticated
  const { 
    data: userProcesses, 
    isLoading: processesLoading, 
    error: processesError 
  } = useProcessList(undefined);

  // Sync user processes with context state
  useEffect(() => {
    if (userProcesses) {
      dispatch({ type: 'SET_USER_PROCESSES', payload: userProcesses });
    }
  }, [userProcesses]);

  // Handle process loading errors
  useEffect(() => {
    if (processesError) {
      dispatch({ type: 'SET_ERROR', payload: processesError.message || 'Failed to load processes' });
    } else {
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [processesError]);

  // Clear state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'SET_CURRENT_PROCESS', payload: null as any });
      dispatch({ type: 'SET_USER_PROCESSES', payload: [] });
      dispatch({ type: 'CLEAR_SHORTLIST' });
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [isAuthenticated]);

  // Action creators
  const setCurrentProcess = useCallback((process: Process) => {
    dispatch({ type: 'SET_CURRENT_PROCESS', payload: process });
  }, []);

  const setCurrentStep = useCallback((step: ProcessStep) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, []);

  const addToShortlist = useCallback((reviewer: Reviewer) => {
    dispatch({ type: 'ADD_TO_SHORTLIST', payload: reviewer });
  }, []);

  const removeFromShortlist = useCallback((reviewerId: string) => {
    dispatch({ type: 'REMOVE_FROM_SHORTLIST', payload: reviewerId });
  }, []);

  const clearShortlist = useCallback(() => {
    dispatch({ type: 'CLEAR_SHORTLIST' });
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // Process switching functionality
  const switchToProcess = useCallback((processId: string) => {
    const targetProcess = state.userProcesses.find(p => p.id === processId);
    if (targetProcess) {
      setCurrentProcess(targetProcess);
    } else {
      setError(`Process with ID ${processId} not found`);
    }
  }, [state.userProcesses, setCurrentProcess, setError]);

  // Calculate workflow state
  const completedSteps = useCallback((): ProcessStep[] => {
    if (!state.currentProcess) return [];
    
    const steps: ProcessStep[] = [];
    const stepData = state.currentProcess.stepData;
    
    if (stepData.upload) steps.push(ProcessStep.UPLOAD);
    if (stepData.metadata) steps.push(ProcessStep.METADATA);
    if (stepData.keywords) steps.push(ProcessStep.KEYWORDS);
    if (stepData.search) steps.push(ProcessStep.SEARCH);
    if (stepData.manual) steps.push(ProcessStep.MANUAL);
    if (stepData.validation?.validationStatus === 'completed') steps.push(ProcessStep.VALIDATION);
    if (stepData.recommendations) steps.push(ProcessStep.RECOMMENDATIONS);
    if (stepData.shortlist && stepData.shortlist.selectedReviewers.length > 0) steps.push(ProcessStep.SHORTLIST);
    if (stepData.export) steps.push(ProcessStep.EXPORT);
    
    return steps;
  }, [state.currentProcess]);

  const canProceedToNextStep = useCallback((): boolean => {
    if (!state.currentProcess) return false;
    
    const completed = completedSteps();
    const currentStep = state.currentProcess.currentStep;
    
    switch (currentStep) {
      case ProcessStep.UPLOAD:
        return completed.includes(ProcessStep.UPLOAD);
      case ProcessStep.METADATA:
        return completed.includes(ProcessStep.METADATA);
      case ProcessStep.KEYWORDS:
        return completed.includes(ProcessStep.KEYWORDS);
      case ProcessStep.SEARCH:
        return completed.includes(ProcessStep.SEARCH);
      case ProcessStep.MANUAL:
        return true; // Manual step is optional
      case ProcessStep.VALIDATION:
        return completed.includes(ProcessStep.VALIDATION);
      case ProcessStep.RECOMMENDATIONS:
        return completed.includes(ProcessStep.RECOMMENDATIONS);
      case ProcessStep.SHORTLIST:
        return completed.includes(ProcessStep.SHORTLIST);
      case ProcessStep.EXPORT:
        return true; // Final step
      default:
        return false;
    }
  }, [state.currentProcess, completedSteps]);

  const value: ScholarFinderContextType = {
    // Process management
    currentProcess: state.currentProcess,
    setCurrentProcess,
    userProcesses: state.userProcesses,
    
    // Step navigation
    currentStep: state.currentStep,
    setCurrentStep,
    
    // Shortlist management
    shortlist: state.shortlist,
    addToShortlist,
    removeFromShortlist,
    clearShortlist,
    
    // UI state
    isLoading: state.isLoading || processesLoading,
    setIsLoading,
    error: state.error,
    setError,
    
    // User context integration
    isAuthenticated,
    userId: user?.id || null,
    
    // Process switching
    switchToProcess,
    
    // Workflow state
    canProceedToNextStep: canProceedToNextStep(),
    completedSteps: completedSteps(),
  };

  return (
    <ScholarFinderContext.Provider value={value}>
      {children}
    </ScholarFinderContext.Provider>
  );
};