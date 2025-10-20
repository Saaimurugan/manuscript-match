/**
 * ScholarFinder External API Service
 * Handles all communication with the external AWS Lambda APIs for the 9-step workflow
 */

import { z } from 'zod';
import { ApiService } from '../../../services/apiService';
import { config } from '../../../lib/config';
import type {
  UploadResponse,
  MetadataResponse,
  KeywordEnhancementResponse,
  KeywordStringResponse,
  DatabaseSearchResponse,
  ManualAuthorResponse,
  ValidationResponse,
  RecommendationsResponse,
  KeywordSelection,
  DatabaseSelection,
  ManualAuthorRequest,
  ApiErrorResponse
} from '../types/api';

/**
 * Configuration for ScholarFinder external APIs
 */
interface ScholarFinderApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

/**
 * Error types specific to ScholarFinder API
 */
export enum ScholarFinderErrorType {
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  METADATA_ERROR = 'METADATA_ERROR',
  KEYWORD_ERROR = 'KEYWORD_ERROR',
  SEARCH_ERROR = 'SEARCH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  FILE_FORMAT_ERROR = 'FILE_FORMAT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

export interface ScholarFinderError {
  type: ScholarFinderErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Zod schemas for API response validation
 */
const UploadResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    job_id: z.string(),
    file_name: z.string(),
    timestamp: z.string(),
    heading: z.string(),
    authors: z.array(z.string()),
    affiliations: z.array(z.string()),
    keywords: z.string(),
    abstract: z.string(),
    author_aff_map: z.record(z.string())
  })
});

const MetadataResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    heading: z.string(),
    authors: z.array(z.string()),
    affiliations: z.array(z.string()),
    keywords: z.string(),
    abstract: z.string(),
    author_aff_map: z.record(z.string())
  })
});

const KeywordEnhancementResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    mesh_terms: z.array(z.string()),
    broader_terms: z.array(z.string()),
    primary_focus: z.array(z.string()),
    secondary_focus: z.array(z.string()),
    additional_primary_keywords: z.array(z.string()),
    additional_secondary_keywords: z.array(z.string()),
    all_primary_focus_list: z.array(z.string()),
    all_secondary_focus_list: z.array(z.string())
  })
});

const KeywordStringResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    search_string: z.string(),
    primary_keywords_used: z.array(z.string()),
    secondary_keywords_used: z.array(z.string())
  })
});

const ReviewerSchema = z.object({
  reviewer: z.string(),
  email: z.string(),
  aff: z.string(),
  city: z.string(),
  country: z.string(),
  Total_Publications: z.number(),
  English_Pubs: z.number(),
  'Publications (last 10 years)': z.number(),
  'Relevant Publications (last 5 years)': z.number(),
  'Publications (last 2 years)': z.number(),
  'Publications (last year)': z.number(),
  Clinical_Trials_no: z.number(),
  Clinical_study_no: z.number(),
  Case_reports_no: z.number(),
  Retracted_Pubs_no: z.number(),
  TF_Publications_last_year: z.number(),
  coauthor: z.boolean(),
  country_match: z.string(),
  aff_match: z.string(),
  conditions_met: z.number(),
  conditions_satisfied: z.string()
});

const DatabaseSearchResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    total_reviewers: z.number(),
    databases_searched: z.array(z.string()),
    search_status: z.record(z.enum(['success', 'failed', 'in_progress'])),
    preview_reviewers: z.array(ReviewerSchema).optional()
  })
});

const ManualAuthorSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  affiliation: z.string(),
  country: z.string().optional(),
  publications: z.number().optional()
});

const ManualAuthorResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    found_authors: z.array(ManualAuthorSchema),
    search_term: z.string(),
    total_found: z.number()
  })
});

const ValidationSummarySchema = z.object({
  total_authors: z.number(),
  authors_validated: z.number(),
  conditions_applied: z.array(z.string()),
  average_conditions_met: z.number()
});

const ValidationResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    validation_status: z.enum(['in_progress', 'completed', 'failed']),
    progress_percentage: z.number(),
    estimated_completion_time: z.string().optional(),
    total_authors_processed: z.number(),
    validation_criteria: z.array(z.string()),
    summary: ValidationSummarySchema.optional()
  })
});

const RecommendationsResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    reviewers: z.array(ReviewerSchema),
    total_count: z.number(),
    validation_summary: ValidationSummarySchema
  })
});

/**
 * ScholarFinder API Service Class
 * Handles all external API calls with proper error handling, validation, and retry logic
 */
export class ScholarFinderApiService {
  private apiService: ApiService;
  private config: ScholarFinderApiConfig;

  constructor(apiConfig?: Partial<ScholarFinderApiConfig>) {
    // Use external API configuration - these would be different endpoints
    // For now, using the same base URL but this would typically be different
    const defaultConfig: ScholarFinderApiConfig = {
      baseURL: config.apiBaseUrl, // This would be the external API URL
      timeout: 120000, // 2 minutes for external API calls
      retries: 3,
      retryDelay: 2000
    };

    this.config = { ...defaultConfig, ...apiConfig };
    
    // Create a separate API service instance for external calls
    this.apiService = new ApiService({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      retries: this.config.retries
    });
  }

  /**
   * Handle and transform API errors into ScholarFinder-specific errors
   */
  private handleApiError(error: any, operation: string): ScholarFinderError {
    // Network or connection errors
    if (!error.response) {
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        return {
          type: ScholarFinderErrorType.NETWORK_ERROR,
          message: `Network connection failed during ${operation}. Please check your internet connection and try again.`,
          details: error.message,
          retryable: true,
          retryAfter: 5000
        };
      }
      
      return {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: `Failed to connect to ScholarFinder API during ${operation}. Please check your internet connection and try again.`,
        details: error.message,
        retryable: true,
        retryAfter: 5000
      };
    }

    const { status, data } = error.response;

    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        type: ScholarFinderErrorType.TIMEOUT_ERROR,
        message: `The ${operation} operation timed out. This may be due to large file processing or high server load.`,
        details: error.message,
        retryable: true,
        retryAfter: 10000
      };
    }

    // File format errors (400 with specific message)
    if (status === 400 && data?.message?.includes('file format')) {
      return {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: 'Unsupported file format. Please upload a .doc or .docx file.',
        details: data,
        retryable: false
      };
    }

    // Rate limiting
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60') * 1000;
      return {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: `Too many requests to ScholarFinder API. Please wait ${retryAfter / 1000} seconds before trying again.`,
        details: data,
        retryable: true,
        retryAfter
      };
    }

    // Authentication errors
    if (status === 401 || status === 403) {
      return {
        type: ScholarFinderErrorType.AUTHENTICATION_ERROR,
        message: 'Authentication failed. Please log in again to continue.',
        details: data,
        retryable: false
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: `ScholarFinder API is temporarily unavailable during ${operation}. Please try again in a few minutes.`,
        details: data,
        retryable: true,
        retryAfter: 30000
      };
    }

    // Client errors
    return {
      type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
      message: data?.message || `An error occurred during ${operation}. Please try again.`,
      details: data,
      retryable: status >= 500
    };
  }

  /**
   * Validate API response using Zod schema
   */
  private validateResponse<T>(data: any, schema: z.ZodSchema<any>, operation: string): T {
    try {
      // Validate the structure but return the original data with proper typing
      schema.parse(data);
      return data as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw {
          type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
          message: `Invalid response format from ScholarFinder API during ${operation}`,
          details: error.errors,
          retryable: false
        } as ScholarFinderError;
      }
      throw error;
    }
  }

  /**
   * Make API request with retry logic and error handling
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    schema?: z.ZodSchema<T>,
    operation?: string
  ): Promise<T> {
    const maxRetries = this.config.retries;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let response;
        
        switch (method) {
          case 'GET':
            response = await this.apiService.get(endpoint, data);
            break;
          case 'POST':
            response = await this.apiService.post(endpoint, data);
            break;
          case 'PUT':
            response = await this.apiService.put(endpoint, data);
            break;
          case 'DELETE':
            response = await this.apiService.delete(endpoint);
            break;
        }

        // Validate response if schema provided
        if (schema && operation) {
          return this.validateResponse(response.data || response, schema, operation);
        }

        return (response.data || response) as T;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if we should retry this error
        const scholarFinderError = this.handleApiError(error, operation || 'API call');
        if (!scholarFinderError.retryable) {
          throw scholarFinderError;
        }

        // Wait before retrying with exponential backoff
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, attempt),
          30000 // Max 30 seconds
        );
        
        if (config.enableDebugLogging) {
          console.log(`[ScholarFinder API] Retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    const scholarFinderError = this.handleApiError(lastError, operation || 'API call');
    throw scholarFinderError;
  }

  /**
   * Step 1: Upload manuscript and extract metadata
   */
  async uploadManuscript(file: File): Promise<UploadResponse> {
    if (!file) {
      throw {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: 'No file provided for upload',
        retryable: false
      } as ScholarFinderError;
    }

    // Validate file format
    const allowedTypes = ['.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: `Unsupported file format: ${fileExtension}. Please upload a .doc or .docx file.`,
        retryable: false
      } as ScholarFinderError;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: `File size too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed size is 100MB.`,
        retryable: false
      } as ScholarFinderError;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use uploadFile method for proper file upload handling
      const response = await this.apiService.uploadFile<UploadResponse>(
        '/scholarfinder/upload_extract_metadata',
        file
      );

      return (response.data || response) as UploadResponse;
    } catch (error) {
      const scholarFinderError = this.handleApiError(error, 'manuscript upload');
      throw scholarFinderError;
    }
  }

  /**
   * Step 2: Get extracted metadata for review
   */
  async getMetadata(jobId: string): Promise<MetadataResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.METADATA_ERROR,
        message: 'Job ID is required to retrieve metadata',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<MetadataResponse>(
      'GET',
      `/scholarfinder/metadata/${jobId}`,
      undefined,
      undefined,
      'metadata retrieval'
    );
    
    return response;
  }

  /**
   * Step 3: Enhance keywords using AI
   */
  async enhanceKeywords(jobId: string): Promise<KeywordEnhancementResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'Job ID is required for keyword enhancement',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<KeywordEnhancementResponse>(
      'POST',
      '/scholarfinder/keyword_enhancement',
      { job_id: jobId },
      undefined,
      'keyword enhancement'
    );
    
    return response;
  }

  /**
   * Step 3b: Generate search string from selected keywords
   */
  async generateKeywordString(jobId: string, keywords: KeywordSelection): Promise<KeywordStringResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'Job ID is required for keyword string generation',
        retryable: false
      } as ScholarFinderError;
    }

    if (!keywords.primary_keywords_input && !keywords.secondary_keywords_input) {
      throw {
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'At least one primary or secondary keyword must be selected',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<KeywordStringResponse>(
      'POST',
      '/scholarfinder/keyword_string_generator',
      {
        job_id: jobId,
        ...keywords
      },
      undefined,
      'keyword string generation'
    );
    
    return response;
  }

  /**
   * Step 4: Search academic databases
   */
  async searchDatabases(jobId: string, databases: DatabaseSelection): Promise<DatabaseSearchResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Job ID is required for database search',
        retryable: false
      } as ScholarFinderError;
    }

    if (!databases.selected_websites || databases.selected_websites.length === 0) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'At least one database must be selected for search',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<DatabaseSearchResponse>(
      'POST',
      '/scholarfinder/database_search',
      {
        job_id: jobId,
        ...databases
      },
      undefined,
      'database search'
    );
    
    return response;
  }

  /**
   * Step 5: Add manual author by name search
   */
  async addManualAuthor(jobId: string, authorName: string): Promise<ManualAuthorResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Job ID is required for manual author addition',
        retryable: false
      } as ScholarFinderError;
    }

    if (!authorName || authorName.trim().length < 2) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Author name must be at least 2 characters long',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<ManualAuthorResponse>(
      'POST',
      '/scholarfinder/manual_authors',
      {
        job_id: jobId,
        author_name: authorName.trim()
      },
      undefined,
      'manual author search'
    );
    
    return response;
  }

  /**
   * Step 6: Validate authors against conflict rules
   */
  async validateAuthors(jobId: string): Promise<ValidationResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.VALIDATION_ERROR,
        message: 'Job ID is required for author validation',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<ValidationResponse>(
      'POST',
      '/scholarfinder/validate_authors',
      { job_id: jobId },
      undefined,
      'author validation'
    );
    
    return response;
  }

  /**
   * Step 6b: Get validation status (for polling during long-running validation)
   */
  async getValidationStatus(jobId: string): Promise<ValidationResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.VALIDATION_ERROR,
        message: 'Job ID is required to check validation status',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<ValidationResponse>(
      'GET',
      `/scholarfinder/validation_status/${jobId}`,
      undefined,
      undefined,
      'validation status check'
    );
    
    return response;
  }

  /**
   * Step 7: Get reviewer recommendations
   */
  async getRecommendations(jobId: string): Promise<RecommendationsResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: 'Job ID is required to retrieve recommendations',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<RecommendationsResponse>(
      'GET',
      `/scholarfinder/recommendations/${jobId}`,
      undefined,
      undefined,
      'recommendations retrieval'
    );
    
    return response;
  }

  /**
   * Utility method to check if a job exists and is valid
   */
  async checkJobStatus(jobId: string): Promise<{ exists: boolean; status: string }> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: 'Job ID is required to check status',
        retryable: false
      } as ScholarFinderError;
    }

    try {
      const response = await this.makeRequest<{ exists: boolean; status: string }>(
        'GET',
        `/scholarfinder/job_status/${jobId}`,
        undefined,
        undefined,
        'job status check'
      );
      
      return response;
    } catch (error) {
      // If job doesn't exist, return appropriate response
      if (error.type === ScholarFinderErrorType.EXTERNAL_API_ERROR && error.details?.status === 404) {
        return { exists: false, status: 'not_found' };
      }
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ScholarFinderApiConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScholarFinderApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update the underlying API service if needed
    this.apiService = new ApiService({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      retries: this.config.retries
    });
  }
}

// Create and export default instance
export const scholarFinderApiService = new ScholarFinderApiService();

export default scholarFinderApiService;