// External API Response Types
// TypeScript interfaces for ScholarFinder external API responses

export interface UploadResponse {
  message: string;
  data: {
    job_id: string;
    file_name: string;
    timestamp: string;
    heading: string;
    authors: string[];
    affiliations: string[];
    keywords: string;
    abstract: string;
    author_aff_map: Record<string, string>;
  };
}

export interface MetadataResponse {
  message: string;
  job_id: string;
  data: {
    heading: string;
    authors: string[];
    affiliations: string[];
    keywords: string;
    abstract: string;
    author_aff_map: Record<string, string>;
  };
}

export interface KeywordEnhancementResponse {
  message: string;
  job_id: string;
  data: {
    mesh_terms: string[];
    broader_terms: string[];
    primary_focus: string[];
    secondary_focus: string[];
    additional_primary_keywords: string[];
    additional_secondary_keywords: string[];
    all_primary_focus_list: string[];
    all_secondary_focus_list: string[];
  };
}

export interface KeywordStringResponse {
  message: string;
  job_id: string;
  data: {
    search_string: string;
    primary_keywords_used: string[];
    secondary_keywords_used: string[];
  };
}

export interface DatabaseSearchResponse {
  message: string;
  job_id: string;
  data: {
    total_reviewers: number;
    databases_searched: string[];
    search_status: Record<string, 'success' | 'failed' | 'in_progress'>;
    preview_reviewers?: Reviewer[];
  };
}

export interface ManualAuthorResponse {
  message: string;
  job_id: string;
  data: {
    found_authors: ManualAuthor[];
    search_term: string;
    total_found: number;
  };
}

export interface ValidationResponse {
  message: string;
  job_id: string;
  data: {
    validation_status: 'in_progress' | 'completed' | 'failed';
    progress_percentage: number;
    estimated_completion_time?: string;
    total_authors_processed: number;
    validation_criteria: string[];
    summary?: ValidationSummary;
  };
}

export interface RecommendationsResponse {
  message: string;
  job_id: string;
  data: {
    reviewers: Reviewer[];
    total_count: number;
    validation_summary: ValidationSummary;
  };
}

export interface ValidationSummary {
  total_authors: number;
  authors_validated: number;
  conditions_applied: string[];
  average_conditions_met: number;
}

export interface ManualAuthor {
  name: string;
  email?: string;
  affiliation: string;
  country?: string;
  publications?: number;
}

export interface Reviewer {
  reviewer: string;
  email: string;
  aff: string;
  city: string;
  country: string;
  Total_Publications: number;
  English_Pubs: number;
  'Publications (last 10 years)': number;
  'Relevant Publications (last 5 years)': number;
  'Publications (last 2 years)': number;
  'Publications (last year)': number;
  Clinical_Trials_no: number;
  Clinical_study_no: number;
  Case_reports_no: number;
  Retracted_Pubs_no: number;
  TF_Publications_last_year: number;
  coauthor: boolean;
  country_match: string;
  aff_match: string;
  conditions_met: number;
  conditions_satisfied: string;
}

// API Request Types
export interface KeywordSelection {
  primary_keywords_input: string;
  secondary_keywords_input: string;
}

export interface DatabaseSelection {
  selected_websites: string[];
}

export interface ManualAuthorRequest {
  author_name: string;
}

// Error Response Type
export interface ApiErrorResponse {
  message: string;
  error_code?: string;
  details?: any;
}