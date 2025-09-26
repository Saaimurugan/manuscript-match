/**
 * TypeScript interfaces for all API request/response types
 * Defines the contract between frontend and backend API
 */

// Base API Response Structure
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

// Error Response Structure
export interface ApiError {
  type: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Pagination Structure
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: UserProfile;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'USER' | 'QC' | 'MANAGER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

// Process Management Types
export interface Process {
  id: string;
  title: string;
  description: string;
  currentStep: 'UPLOAD' | 'METADATA_EXTRACTION' | 'KEYWORD_ENHANCEMENT' | 'DATABASE_SEARCH' | 'MANUAL_SEARCH' | 'VALIDATION' | 'RECOMMENDATIONS' | 'SHORTLIST' | 'EXPORT';
  status: 'CREATED' | 'UPLOADING' | 'PROCESSING' | 'SEARCHING' | 'VALIDATING' | 'COMPLETED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

// Admin Process Management Types
export interface AdminProcess extends Process {
  userId: string;
  userEmail: string;
  templateId?: string;
  templateName?: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  steps: string[];
  defaultSettings: {
    maxResults?: number;
    autoValidation?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminProcessRequest {
  title: string;
  description: string;
  templateId?: string;
  userId?: string;
}

export interface UpdateAdminProcessRequest {
  title?: string;
  description?: string;
  currentStep?: Process['currentStep'];
  status?: Process['status'];
}

export interface ResetProcessStageRequest {
  targetStep: Process['currentStep'];
  reason?: string;
}

export interface CreateProcessRequest {
  title: string;
  description: string;
}

export interface UpdateProcessRequest {
  title?: string;
  description?: string;
  currentStep?: number;
  status?: Process['status'];
}

// File Upload Types
export interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ExtractedMetadata {
  title: string;
  abstract: string;
  keywords: string[];
  authors: Author[];
  affiliations: Affiliation[];
}

export interface UpdateMetadataRequest {
  title?: string;
  abstract?: string;
  keywords?: string[];
  authors?: Author[];
  affiliations?: Affiliation[];
}

// Author and Affiliation Types
export interface Author {
  id: string;
  name: string;
  email?: string;
  affiliation: string;
  country: string;
  publicationCount: number;
  recentPublications: string[];
  expertise: string[];
  database: string;
  matchScore: number;
}

export interface Affiliation {
  id: string;
  name: string;
  country: string;
  type: string;
}

// Keyword Enhancement Types
export interface KeywordEnhancementRequest {
  includeOriginal: boolean;
  generateMeshTerms: boolean;
  generateSearchStrings: boolean;
}

export interface EnhancedKeywords {
  original: string[];
  enhanced: string[];
  meshTerms: string[];
  searchStrings: {
    pubmed: string;
    elsevier: string;
    wiley: string;
    taylorFrancis: string;
  };
}

export interface KeywordSelectionRequest {
  selectedKeywords: string[];
}

// Database Search Types
export interface SearchRequest {
  keywords: string[];
  databases: string[];
  searchOptions: {
    maxResults: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
}

export interface SearchStatus {
  status: 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: {
    pubmed?: { status: string; count: number };
    elsevier?: { status: string; count: number };
    wiley?: { status: string; count: number };
    taylorFrancis?: { status: string; count: number };
  };
  totalFound: number;
}

export interface ManualSearchRequest {
  query: string;
}

// Validation Types
export interface ValidationRequest {
  rules: {
    excludeManuscriptAuthors: boolean;
    excludeCoAuthors: boolean;
    minimumPublications: number;
    maxRetractions: number;
    excludeInstitutionalConflicts: boolean;
  };
}

export interface ValidationResults {
  totalCandidates: number;
  validatedReviewers: number;
  excludedReviewers: number;
  validationSteps: {
    manuscriptAuthors: { excluded: number; passed: number };
    coAuthors: { excluded: number; passed: number };
    publications: { excluded: number; passed: number };
    retractions: { excluded: number; passed: number };
    institutions: { excluded: number; passed: number };
  };
}

export interface Reviewer extends Author {
  validationStatus: {
    excludedAsManuscriptAuthor: boolean;
    excludedAsCoAuthor: boolean;
    hasMinimumPublications: boolean;
    hasAcceptableRetractions: boolean;
    hasInstitutionalConflict: boolean;
  };
}

// Recommendation Types
export interface RecommendationFilters {
  minPublications?: number;
  maxPublications?: number;
  countries?: string[];
  affiliationTypes?: string[];
  expertise?: string[];
  databases?: string[];
  search?: string; // Search term for name, affiliation, or expertise
}

export interface RecommendationSort {
  field: 'matchScore' | 'publicationCount' | 'name' | 'country';
  direction: 'asc' | 'desc';
}

export interface RecommendationRequest {
  filters?: RecommendationFilters;
  sort?: RecommendationSort;
  page?: number;
  limit?: number;
}

// Shortlist Types
export interface Shortlist {
  id: string;
  name: string;
  processId: string;
  selectedReviewers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortlistRequest {
  name: string;
  selectedReviewers: string[];
}

export interface UpdateShortlistRequest {
  name?: string;
  selectedReviewers?: string[];
}

export interface ExportFormat {
  format: 'csv' | 'xlsx' | 'docx';
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  userId: string;
  processId?: string;
  action: string;
  details: any;
  timestamp: string;
}

export interface ActivityLogFilters {
  userId?: string;
  processId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  totalSearches: number;
  totalReviewers: number;
}

export interface AdminProcess extends Process {
  userId: string;
  userEmail: string;
}

export interface AdminUserDetails extends UserProfile {
  lastLoginAt?: string;
  processCount: number;
  activityCount: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down' | 'degraded';
    externalApis: 'up' | 'down' | 'degraded';
    fileStorage: 'up' | 'down' | 'degraded';
  };
  uptime: number;
  version: string;
}

export interface SystemAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

// HTTP Method Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request Configuration
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

// User-Friendly Error Types
export interface UserFriendlyError {
  type: 'NETWORK_ERROR' | 'AUTHENTICATION_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT_ERROR' | 'SERVER_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  action?: 'REDIRECT_TO_LOGIN' | 'RETRY' | 'CONTACT_SUPPORT';
  retryAfter?: number;
  details?: any;
}