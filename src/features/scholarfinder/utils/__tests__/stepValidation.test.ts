/**
 * Tests for step validation utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateUploadStep,
  validateMetadataStep,
  validateKeywordStep,
  validateSearchStep,
  validateManualStep,
  validateValidationStep,
  validateRecommendationsStep,
  validateShortlistStep,
  validateExportStep,
  validateStepTransition,
  getStepValidationRules,
  isStepComplete,
  getNextAvailableStep,
  getPreviousAvailableStep,
} from '../stepValidation';
import { ProcessStep } from '../../types/process';
import type { Process, ManuscriptMetadata } from '../../types/process';
import type { Reviewer } from '../../types/reviewer';

describe('stepValidation utilities', () => {
  const mockProcess: Process = {
    id: 'test-process-123',
    jobId: 'test-job-123',
    title: 'Test Manuscript',
    status: 'active',
    currentStep: ProcessStep.UPLOAD,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      uploadedFile: null,
      extractedMetadata: null,
      enhancedKeywords: null,
      selectedKeywords: null,
      searchResults: null,
      manualAuthors: [],
      validationResults: null,
      recommendations: null,
      shortlist: [],
      exportData: null,
    },
  };

  const mockMetadata: ManuscriptMetadata = {
    title: 'Test Manuscript Title',
    authors: [
      { name: 'John Doe', email: 'john@example.com', affiliation: 'University A' },
      { name: 'Jane Smith', email: 'jane@example.com', affiliation: 'University B' },
    ],
    affiliations: ['University A', 'University B'],
    abstract: 'This is a test abstract that is long enough to be valid.',
    keywords: ['machine learning', 'artificial intelligence'],
    primaryFocusAreas: ['deep learning', 'neural networks'],
    secondaryFocusAreas: ['data mining', 'pattern recognition'],
  };

  const mockReviewer: Reviewer = {
    reviewer: 'Dr. Test Reviewer',
    email: 'reviewer@example.com',
    aff: 'Test University',
    city: 'Test City',
    country: 'Test Country',
    Total_Publications: 50,
    English_Pubs: 45,
    'Publications (last 10 years)': 30,
    'Relevant Publications (last 5 years)': 20,
    'Publications (last 2 years)': 8,
    'Publications (last year)': 3,
    Clinical_Trials_no: 2,
    Clinical_study_no: 5,
    Case_reports_no: 1,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 2,
    coauthor: false,
    country_match: 'different',
    aff_match: 'different',
    conditions_met: 8,
    conditions_satisfied: '8 of 8',
  };

  describe('validateUploadStep', () => {
    it('should pass validation with uploaded file', () => {
      const processWithFile = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          uploadedFile: new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        },
      };

      const result = validateUploadStep(processWithFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without uploaded file', () => {
      const result = validateUploadStep(mockProcess);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No file has been uploaded');
    });

    it('should fail validation with invalid file type', () => {
      const processWithInvalidFile = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          uploadedFile: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        },
      };

      const result = validateUploadStep(processWithInvalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid file format. Only .doc and .docx files are supported');
    });

    it('should fail validation with oversized file', () => {
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const processWithLargeFile = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          uploadedFile: largeFile,
        },
      };

      const result = validateUploadStep(processWithLargeFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum limit of 100MB');
    });
  });

  describe('validateMetadataStep', () => {
    it('should pass validation with complete metadata', () => {
      const processWithMetadata = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          extractedMetadata: mockMetadata,
        },
      };

      const result = validateMetadataStep(processWithMetadata);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without metadata', () => {
      const result = validateMetadataStep(mockProcess);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Manuscript metadata is required');
    });

    it('should fail validation with missing title', () => {
      const incompleteMetadata = { ...mockMetadata, title: '' };
      const processWithIncompleteMetadata = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          extractedMetadata: incompleteMetadata,
        },
      };

      const result = validateMetadataStep(processWithIncompleteMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should fail validation with no authors', () => {
      const incompleteMetadata = { ...mockMetadata, authors: [] };
      const processWithIncompleteMetadata = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          extractedMetadata: incompleteMetadata,
        },
      };

      const result = validateMetadataStep(processWithIncompleteMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one author is required');
    });

    it('should fail validation with short abstract', () => {
      const incompleteMetadata = { ...mockMetadata, abstract: 'Too short' };
      const processWithIncompleteMetadata = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          extractedMetadata: incompleteMetadata,
        },
      };

      const result = validateMetadataStep(processWithIncompleteMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Abstract must be at least 50 characters long');
    });
  });

  describe('validateKeywordStep', () => {
    it('should pass validation with selected keywords', () => {
      const processWithKeywords = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          selectedKeywords: {
            primary_keywords_input: 'machine learning, deep learning',
            secondary_keywords_input: 'neural networks, AI',
          },
        },
      };

      const result = validateKeywordStep(processWithKeywords);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without selected keywords', () => {
      const result = validateKeywordStep(mockProcess);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Keywords must be selected');
    });

    it('should fail validation with empty keywords', () => {
      const processWithEmptyKeywords = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          selectedKeywords: {
            primary_keywords_input: '',
            secondary_keywords_input: '',
          },
        },
      };

      const result = validateKeywordStep(processWithEmptyKeywords);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one primary or secondary keyword must be selected');
    });
  });

  describe('validateSearchStep', () => {
    it('should pass validation with search results', () => {
      const processWithResults = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          searchResults: {
            total_reviewers: 100,
            databases_searched: ['pubmed', 'sciencedirect'],
            search_status: { pubmed: 'success', sciencedirect: 'success' },
            preview_reviewers: [mockReviewer],
          },
        },
      };

      const result = validateSearchStep(processWithResults);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without search results', () => {
      const result = validateSearchStep(mockProcess);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Database search must be completed');
    });

    it('should fail validation with no reviewers found', () => {
      const processWithNoResults = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          searchResults: {
            total_reviewers: 0,
            databases_searched: ['pubmed'],
            search_status: { pubmed: 'success' },
            preview_reviewers: [],
          },
        },
      };

      const result = validateSearchStep(processWithNoResults);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No potential reviewers found. Try different keywords or databases');
    });
  });

  describe('validateManualStep', () => {
    it('should pass validation (manual step is optional)', () => {
      const result = validateManualStep(mockProcess);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with manual authors', () => {
      const processWithManualAuthors = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          manualAuthors: [mockReviewer],
        },
      };

      const result = validateManualStep(processWithManualAuthors);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateValidationStep', () => {
    it('should pass validation with completed validation', () => {
      const processWithValidation = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          validationResults: {
            validation_status: 'completed',
            progress_percentage: 100,
            estimated_completion_time: new Date().toISOString(),
            total_authors_processed: 100,
            validation_criteria: ['No co-authorship', 'Different affiliation'],
          },
        },
      };

      const result = validateValidationStep(processWithValidation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without validation results', () => {
      const result = validateValidationStep(mockProcess);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Author validation must be completed');
    });

    it('should fail validation with incomplete validation', () => {
      const processWithIncompleteValidation = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          validationResults: {
            validation_status: 'in_progress',
            progress_percentage: 50,
            estimated_completion_time: new Date().toISOString(),
            total_authors_processed: 50,
            validation_criteria: ['No co-authorship'],
          },
        },
      };

      const result = validateValidationStep(processWithIncompleteValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Author validation is still in progress');
    });
  });

  describe('validateRecommendationsStep', () => {
    it('should pass validation with recommendations', () => {
      const processWithRecommendations = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          recommendations: {
            reviewers: [mockReviewer],
            total_count: 1,
            validation_summary: {
              total_authors: 100,
              authors_validated: 100,
              conditions_applied: ['No co-authorship'],
              average_conditions_met: 7.5,
            },
          },
        },
      };

      const result = validateRecommendationsStep(processWithRecommendations);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without recommendations', () => {
      const result = validateRecommendationsStep(mockProcess);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reviewer recommendations must be generated');
    });
  });

  describe('validateShortlistStep', () => {
    it('should pass validation with adequate shortlist', () => {
      const processWithShortlist = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          shortlist: [mockReviewer, { ...mockReviewer, reviewer: 'Dr. Another Reviewer' }],
        },
      };

      const result = validateShortlistStep(processWithShortlist);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with insufficient shortlist', () => {
      const processWithSmallShortlist = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          shortlist: [mockReviewer],
        },
      };

      const result = validateShortlistStep(processWithSmallShortlist);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 2 reviewers must be selected for the shortlist');
    });

    it('should fail validation with oversized shortlist', () => {
      const largeShortlist = Array(21).fill(mockReviewer).map((reviewer, index) => ({
        ...reviewer,
        reviewer: `Dr. Reviewer ${index + 1}`,
      }));

      const processWithLargeShortlist = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          shortlist: largeShortlist,
        },
      };

      const result = validateShortlistStep(processWithLargeShortlist);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shortlist cannot exceed 20 reviewers');
    });
  });

  describe('validateExportStep', () => {
    it('should pass validation with export data', () => {
      const processWithExport = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          exportData: {
            format: 'csv',
            data: 'exported data',
            generatedAt: new Date(),
          },
        },
      };

      const result = validateExportStep(processWithExport);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation without export data (export is optional)', () => {
      const result = validateExportStep(mockProcess);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateStepTransition', () => {
    it('should allow transition to next step when current is valid', () => {
      const processWithFile = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          uploadedFile: new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        },
      };

      const result = validateStepTransition(processWithFile, ProcessStep.UPLOAD, ProcessStep.METADATA);
      expect(result.canTransition).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent transition when current step is invalid', () => {
      const result = validateStepTransition(mockProcess, ProcessStep.UPLOAD, ProcessStep.METADATA);
      expect(result.canTransition).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should prevent skipping steps', () => {
      const result = validateStepTransition(mockProcess, ProcessStep.UPLOAD, ProcessStep.KEYWORDS);
      expect(result.canTransition).toBe(false);
      expect(result.errors).toContain('Cannot skip steps. Complete METADATA step first');
    });

    it('should allow backward navigation', () => {
      const result = validateStepTransition(mockProcess, ProcessStep.METADATA, ProcessStep.UPLOAD);
      expect(result.canTransition).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getStepValidationRules', () => {
    it('should return validation rules for each step', () => {
      const rules = getStepValidationRules(ProcessStep.UPLOAD);
      expect(rules).toHaveProperty('required');
      expect(rules).toHaveProperty('optional');
      expect(rules.required).toContain('File must be uploaded');
    });

    it('should return different rules for different steps', () => {
      const uploadRules = getStepValidationRules(ProcessStep.UPLOAD);
      const metadataRules = getStepValidationRules(ProcessStep.METADATA);
      
      expect(uploadRules.required).not.toEqual(metadataRules.required);
    });
  });

  describe('isStepComplete', () => {
    it('should return true for completed steps', () => {
      const processWithFile = {
        ...mockProcess,
        metadata: {
          ...mockProcess.metadata,
          uploadedFile: new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        },
      };

      expect(isStepComplete(processWithFile, ProcessStep.UPLOAD)).toBe(true);
    });

    it('should return false for incomplete steps', () => {
      expect(isStepComplete(mockProcess, ProcessStep.UPLOAD)).toBe(false);
    });
  });

  describe('getNextAvailableStep', () => {
    it('should return next step in sequence', () => {
      const next = getNextAvailableStep(ProcessStep.UPLOAD);
      expect(next).toBe(ProcessStep.METADATA);
    });

    it('should return null for last step', () => {
      const next = getNextAvailableStep(ProcessStep.EXPORT);
      expect(next).toBeNull();
    });
  });

  describe('getPreviousAvailableStep', () => {
    it('should return previous step in sequence', () => {
      const previous = getPreviousAvailableStep(ProcessStep.METADATA);
      expect(previous).toBe(ProcessStep.UPLOAD);
    });

    it('should return null for first step', () => {
      const previous = getPreviousAvailableStep(ProcessStep.UPLOAD);
      expect(previous).toBeNull();
    });
  });
});