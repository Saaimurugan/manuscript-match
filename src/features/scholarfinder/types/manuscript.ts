// Manuscript and Author Types
// Types for manuscript metadata and author information

export interface ManuscriptMetadata {
  title: string;
  authors: Author[];
  affiliations: Affiliation[];
  abstract: string;
  keywords: string[];
  primaryFocusAreas: string[];
  secondaryFocusAreas: string[];
  submissionDate?: Date;
  journalTarget?: string;
}

export interface Author {
  id?: string;
  name: string;
  email?: string;
  affiliation: string;
  affiliationId?: string;
  isCorresponding?: boolean;
  orcid?: string;
  position?: number;
}

export interface Affiliation {
  id: string;
  name: string;
  department?: string;
  city?: string;
  country?: string;
  type?: 'university' | 'hospital' | 'research_institute' | 'company' | 'other';
}

export interface KeywordData {
  meshTerms: string[];
  broaderTerms: string[];
  primaryFocus: string[];
  secondaryFocus: string[];
  additionalPrimaryKeywords: string[];
  additionalSecondaryKeywords: string[];
  allPrimaryFocusList: string[];
  allSecondaryFocusList: string[];
}

export interface SearchString {
  query: string;
  primaryKeywordsUsed: string[];
  secondaryKeywordsUsed: string[];
  booleanOperators: string[];
  generatedAt: Date;
}

export interface FileUploadConfig {
  maxFileSize: number; // in bytes
  allowedFormats: string[];
  allowedMimeTypes: string[];
  uploadTimeout: number; // in milliseconds
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
  };
}