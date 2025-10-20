// Process Management Types
// Internal data models for process tracking and management

import { Reviewer } from './api';

import { ManualAuthor } from './api';

export enum ProcessStep {
  UPLOAD = 'upload',
  METADATA = 'metadata',
  KEYWORDS = 'keywords',
  SEARCH = 'search',
  MANUAL = 'manual',
  VALIDATION = 'validation',
  RECOMMENDATIONS = 'recommendations',
  SHORTLIST = 'shortlist',
  EXPORT = 'export'
}

export enum ProcessStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Process {
  id: string;
  jobId: string; // External API job ID
  title: string;
  status: ProcessStatus;
  currentStep: ProcessStep;
  createdAt: Date;
  updatedAt: Date;
  metadata: ProcessMetadata;
  stepData: ProcessStepData;
}

export interface ProcessMetadata {
  userId: string;
  fileName?: string;
  fileSize?: number;
  manuscriptTitle?: string;
  authors?: Author[];
  totalReviewers?: number;
  shortlistCount?: number;
}

export interface ProcessStepData {
  upload?: UploadStepData;
  metadata?: MetadataStepData;
  keywords?: KeywordStepData;
  search?: SearchStepData;
  manual?: ManualStepData;
  validation?: ValidationStepData;
  recommendations?: RecommendationsStepData;
  shortlist?: ShortlistStepData;
  export?: ExportStepData;
}

export interface UploadStepData {
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  extractedMetadata: any;
}

export interface MetadataStepData {
  title: string;
  authors: Author[];
  affiliations: Affiliation[];
  abstract: string;
  keywords: string[];
  lastModified: Date;
}

export interface KeywordStepData {
  enhancedKeywords: any;
  selectedPrimaryKeywords: string[];
  selectedSecondaryKeywords: string[];
  generatedSearchString?: string;
  lastModified: Date;
}

export interface SearchStepData {
  selectedDatabases: string[];
  searchResults: any;
  totalReviewers: number;
  searchCompletedAt: Date;
}

export interface ManualStepData {
  addedAuthors?: ManualAuthor[];
  searchHistory?: Array<{
    searchTerm: string;
    results: ManualAuthor[];
    timestamp: Date;
  }>;
  lastSearched?: Date;
}

export interface ValidationStepData {
  validationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  progressPercentage: number;
  validationResults?: any;
  completedAt?: Date;
}

export interface RecommendationsStepData {
  reviewers: Reviewer[];
  appliedFilters: ReviewerFilters;
  sortConfig: SortConfig;
  lastModified: Date;
}

export interface ShortlistStepData {
  selectedReviewers: Reviewer[];
  selectionHistory: ShortlistAction[];
  lastModified: Date;
}

export interface ExportStepData {
  exportedFormats: ExportFormat[];
  exportHistory: ExportRecord[];
  error?: {
    message: string;
    timestamp: Date;
  };
}

export interface ShortlistAction {
  type: 'add' | 'remove' | 'reorder';
  reviewerId: string;
  timestamp: Date;
}

export interface ExportRecord {
  format: ExportFormat;
  fileName: string;
  exportedAt: Date;
  reviewerCount: number;
}

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

// Additional types needed for process management
export interface Author {
  name: string;
  email?: string;
  affiliation: string;
}

export interface Affiliation {
  name: string;
  country?: string;
  city?: string;
}

export interface ReviewerFilters {
  minPublications?: number;
  maxRetractions?: number;
  countries?: string[];
  affiliations?: string[];
  validationScore?: number;
  minConditionsMet?: number;
  publicationYears?: {
    lastYear?: number;
    last2Years?: number;
    last5Years?: number;
    last10Years?: number;
  };
  excludeCoauthors?: boolean;
  searchTerm?: string;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// Process list filters
export interface ProcessListFilters {
  status?: ProcessStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

// Re-export Reviewer from api types to avoid circular imports
export type { Reviewer, ManualAuthor } from './api';