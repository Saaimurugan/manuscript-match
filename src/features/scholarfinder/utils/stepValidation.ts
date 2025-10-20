import { ProcessStep } from '../types/process';
import { StepValidationResult } from '../types/workflow';

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface StepValidationConfig {
  [ProcessStep.UPLOAD]: ValidationRule[];
  [ProcessStep.METADATA]: ValidationRule[];
  [ProcessStep.KEYWORDS]: ValidationRule[];
  [ProcessStep.SEARCH]: ValidationRule[];
  [ProcessStep.MANUAL]: ValidationRule[];
  [ProcessStep.VALIDATION]: ValidationRule[];
  [ProcessStep.RECOMMENDATIONS]: ValidationRule[];
  [ProcessStep.SHORTLIST]: ValidationRule[];
  [ProcessStep.EXPORT]: ValidationRule[];
}

// Default validation rules for each step
export const defaultValidationConfig: Partial<StepValidationConfig> = {
  [ProcessStep.UPLOAD]: [
    {
      field: 'fileName',
      required: true,
      custom: (value) => {
        if (!value) return 'Please upload a manuscript file';
        const allowedExtensions = ['.doc', '.docx'];
        const hasValidExtension = allowedExtensions.some(ext => 
          value.toLowerCase().endsWith(ext)
        );
        if (!hasValidExtension) {
          return `File must be in one of these formats: ${allowedExtensions.join(', ')}`;
        }
        return null;
      }
    },
    {
      field: 'fileSize',
      required: true,
      custom: (value) => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (value > maxSize) {
          return 'File size must be less than 10MB';
        }
        return null;
      }
    }
  ],

  [ProcessStep.METADATA]: [
    {
      field: 'title',
      required: true,
      minLength: 5,
      maxLength: 500,
      custom: (value) => {
        if (!value?.trim()) return 'Manuscript title is required';
        if (value.trim().length < 5) return 'Title must be at least 5 characters long';
        if (value.trim().length > 500) return 'Title must be less than 500 characters';
        return null;
      }
    },
    {
      field: 'authors',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one author is required';
        }
        
        for (let i = 0; i < value.length; i++) {
          const author = value[i];
          if (!author.name?.trim()) {
            return `Author ${i + 1} name is required`;
          }
          if (!author.affiliation?.trim()) {
            return `Author ${i + 1} affiliation is required`;
          }
          if (author.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            return `Author ${i + 1} has an invalid email address`;
          }
        }
        return null;
      }
    },
    {
      field: 'abstract',
      required: true,
      minLength: 50,
      maxLength: 5000,
      custom: (value) => {
        if (!value?.trim()) return 'Abstract is required';
        if (value.trim().length < 50) return 'Abstract must be at least 50 characters long';
        if (value.trim().length > 5000) return 'Abstract must be less than 5000 characters';
        return null;
      }
    },
    {
      field: 'keywords',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one keyword is required';
        }
        if (value.length > 20) {
          return 'Maximum 20 keywords allowed';
        }
        return null;
      }
    }
  ],

  [ProcessStep.KEYWORDS]: [
    {
      field: 'selectedPrimaryKeywords',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one primary keyword';
        }
        if (value.length > 10) {
          return 'Maximum 10 primary keywords allowed';
        }
        return null;
      }
    },
    {
      field: 'selectedSecondaryKeywords',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one secondary keyword';
        }
        if (value.length > 15) {
          return 'Maximum 15 secondary keywords allowed';
        }
        return null;
      }
    }
  ],

  [ProcessStep.SEARCH]: [
    {
      field: 'selectedDatabases',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one database to search';
        }
        return null;
      }
    }
  ],

  [ProcessStep.SHORTLIST]: [
    {
      field: 'selectedReviewers',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one reviewer for your shortlist';
        }
        if (value.length > 50) {
          return 'Maximum 50 reviewers allowed in shortlist';
        }
        return null;
      }
    }
  ],

  [ProcessStep.EXPORT]: [
    {
      field: 'selectedFormat',
      required: true,
      custom: (value) => {
        const allowedFormats = ['csv', 'excel', 'pdf', 'json'];
        if (!allowedFormats.includes(value)) {
          return 'Please select a valid export format';
        }
        return null;
      }
    }
  ]
};

/**
 * Validates step data against defined rules
 */
export const validateStepData = (
  step: ProcessStep,
  data: any,
  customRules?: ValidationRule[]
): StepValidationResult => {
  const rules = customRules || defaultValidationConfig[step] || [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const value = data?.[rule.field];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    // Skip other validations if field is empty and not required
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Check minimum length
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
    }

    // Check maximum length
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push(`${rule.field} must be less than ${rule.maxLength} characters long`);
    }

    // Check pattern
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(`${rule.field} format is invalid`);
    }

    // Check custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  // Add step-specific warnings
  addStepWarnings(step, data, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    canProceed: errors.length === 0,
  };
};

/**
 * Adds step-specific warnings that don't prevent progression
 */
const addStepWarnings = (step: ProcessStep, data: any, warnings: string[]) => {
  switch (step) {
    case ProcessStep.METADATA:
      if (data?.authors?.length === 1) {
        warnings.push('Single author manuscripts may have limited reviewer options');
      }
      if (data?.keywords?.length < 3) {
        warnings.push('Consider adding more keywords for better reviewer matching');
      }
      break;

    case ProcessStep.KEYWORDS:
      if (data?.selectedPrimaryKeywords?.length < 3) {
        warnings.push('More primary keywords may improve search results');
      }
      break;

    case ProcessStep.SEARCH:
      if (data?.selectedDatabases?.length === 1) {
        warnings.push('Searching multiple databases may yield more reviewers');
      }
      break;

    case ProcessStep.SHORTLIST:
      if (data?.selectedReviewers?.length < 5) {
        warnings.push('Consider selecting more reviewers to ensure availability');
      }
      if (data?.selectedReviewers?.length > 20) {
        warnings.push('Large shortlists may be difficult to manage');
      }
      break;
  }
};

/**
 * Checks if a step can be skipped based on prerequisites and data
 */
export const canSkipStep = (
  step: ProcessStep,
  completedSteps: ProcessStep[],
  stepData: Record<ProcessStep, any>
): boolean => {
  // Manual step is always optional
  if (step === ProcessStep.MANUAL) {
    return true;
  }

  // Other steps are generally not skippable unless they have no prerequisites
  // or their prerequisites are met through alternative means
  return false;
};

/**
 * Determines if navigation to a specific step is allowed
 */
export const canNavigateToStep = (
  targetStep: ProcessStep,
  currentStep: ProcessStep,
  completedSteps: ProcessStep[],
  stepDefinitions: any[]
): boolean => {
  // Always allow navigation to completed steps
  if (completedSteps.includes(targetStep)) {
    return true;
  }

  // Allow navigation to current step
  if (targetStep === currentStep) {
    return true;
  }

  // Find step definition
  const stepDef = stepDefinitions.find(s => s.key === targetStep);
  if (!stepDef) {
    return false;
  }

  // Check prerequisites
  if (stepDef.prerequisites) {
    return stepDef.prerequisites.every((prereq: ProcessStep) => 
      completedSteps.includes(prereq)
    );
  }

  // Allow navigation to next step
  const currentIndex = stepDefinitions.findIndex(s => s.key === currentStep);
  const targetIndex = stepDefinitions.findIndex(s => s.key === targetStep);
  
  return targetIndex <= currentIndex + 1;
};

/**
 * Gets the next available step based on current progress
 */
export const getNextAvailableStep = (
  currentStep: ProcessStep,
  completedSteps: ProcessStep[],
  stepDefinitions: any[]
): ProcessStep | null => {
  const currentIndex = stepDefinitions.findIndex(s => s.key === currentStep);
  
  for (let i = currentIndex + 1; i < stepDefinitions.length; i++) {
    const step = stepDefinitions[i];
    
    if (canNavigateToStep(step.key, currentStep, completedSteps, stepDefinitions)) {
      return step.key;
    }
  }
  
  return null;
};