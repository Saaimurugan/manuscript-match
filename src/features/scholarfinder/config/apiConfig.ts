/**
 * ScholarFinder External API Configuration
 * Manages endpoints, timeouts, and other API-specific settings
 */

import { config } from '../../../lib/config';

/**
 * External API endpoints configuration
 * These would typically point to AWS Lambda functions or other external services
 */
export const SCHOLARFINDER_API_ENDPOINTS = {
  // Step 1: Upload and metadata extraction
  UPLOAD_EXTRACT_METADATA: '/scholarfinder/upload_extract_metadata',
  
  // Step 2: Metadata retrieval
  GET_METADATA: (jobId: string) => `/scholarfinder/metadata/${jobId}`,
  
  // Step 3: Keyword enhancement
  KEYWORD_ENHANCEMENT: '/scholarfinder/keyword_enhancement',
  KEYWORD_STRING_GENERATOR: '/scholarfinder/keyword_string_generator',
  
  // Step 4: Database search
  DATABASE_SEARCH: '/scholarfinder/database_search',
  
  // Step 5: Manual author addition
  MANUAL_AUTHORS: '/scholarfinder/manual_authors',
  
  // Step 6: Author validation
  VALIDATE_AUTHORS: '/scholarfinder/validate_authors',
  VALIDATION_STATUS: (jobId: string) => `/scholarfinder/validation_status/${jobId}`,
  
  // Step 7: Recommendations
  GET_RECOMMENDATIONS: (jobId: string) => `/scholarfinder/recommendations/${jobId}`,
  
  // Utility endpoints
  JOB_STATUS: (jobId: string) => `/scholarfinder/job_status/${jobId}`,
} as const;

/**
 * API configuration for different environments
 */
interface ApiEnvironmentConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  enableMocking: boolean;
}

const getApiConfig = (): ApiEnvironmentConfig => {
  const environment = config.environment;
  
  switch (environment) {
    case 'development':
      return {
        baseURL: import.meta.env.VITE_SCHOLARFINDER_API_URL || 'http://localhost:3003', // Different port for external API
        timeout: 120000, // 2 minutes for development
        retries: 2,
        retryDelay: 1000,
        enableMocking: config.enableApiMocking,
      };
    
    case 'staging':
      return {
        baseURL: import.meta.env.VITE_SCHOLARFINDER_API_URL || 'https://api-staging.scholarfinder.com',
        timeout: 180000, // 3 minutes for staging
        retries: 3,
        retryDelay: 2000,
        enableMocking: false,
      };
    
    case 'production':
      return {
        baseURL: import.meta.env.VITE_SCHOLARFINDER_API_URL || 'https://api.scholarfinder.com',
        timeout: 300000, // 5 minutes for production (large files)
        retries: 3,
        retryDelay: 3000,
        enableMocking: false,
      };
    
    default:
      return {
        baseURL: 'http://localhost:3003',
        timeout: 120000,
        retries: 3,
        retryDelay: 1000,
        enableMocking: false,
      };
  }
};

export const SCHOLARFINDER_API_CONFIG = getApiConfig();

/**
 * Supported file formats and constraints
 */
export const FILE_CONSTRAINTS = {
  SUPPORTED_FORMATS: ['.doc', '.docx'],
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MIN_FILE_SIZE: 1024, // 1KB
  SUPPORTED_MIME_TYPES: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
} as const;

/**
 * Database options for search
 */
export const AVAILABLE_DATABASES = [
  {
    id: 'pubmed',
    name: 'PubMed',
    description: 'MEDLINE database of life science and biomedical literature',
    defaultSelected: true,
  },
  {
    id: 'tandfonline',
    name: 'Taylor & Francis Online',
    description: 'Academic journals in humanities, social sciences, and science',
    defaultSelected: true,
  },
  {
    id: 'sciencedirect',
    name: 'ScienceDirect',
    description: 'Elsevier\'s platform for scientific and medical publications',
    defaultSelected: true,
  },
  {
    id: 'wileylibrary',
    name: 'Wiley Online Library',
    description: 'Multidisciplinary academic content from Wiley',
    defaultSelected: false,
  },
] as const;

/**
 * Validation criteria for author validation
 */
export const VALIDATION_CRITERIA = [
  'No co-authorship with manuscript authors',
  'Different institutional affiliation',
  'Sufficient publication record',
  'Recent publication activity',
  'Relevant research area',
  'Geographic diversity',
  'No conflicts of interest',
  'Available contact information',
] as const;

/**
 * Timeout configurations for different operations
 */
export const OPERATION_TIMEOUTS = {
  UPLOAD: 300000, // 5 minutes for file upload
  METADATA_EXTRACTION: 120000, // 2 minutes for metadata extraction
  KEYWORD_ENHANCEMENT: 60000, // 1 minute for keyword enhancement
  KEYWORD_STRING_GENERATION: 30000, // 30 seconds for string generation
  DATABASE_SEARCH: 600000, // 10 minutes for database search
  MANUAL_AUTHOR_SEARCH: 30000, // 30 seconds for manual search
  AUTHOR_VALIDATION: 1800000, // 30 minutes for validation (can be long)
  RECOMMENDATIONS_RETRIEVAL: 60000, // 1 minute for recommendations
  JOB_STATUS_CHECK: 10000, // 10 seconds for status check
} as const;

/**
 * Retry configurations for different operations
 */
export const RETRY_CONFIGS = {
  UPLOAD: { maxRetries: 2, retryDelay: 5000 },
  METADATA: { maxRetries: 3, retryDelay: 2000 },
  KEYWORD_ENHANCEMENT: { maxRetries: 3, retryDelay: 1000 },
  DATABASE_SEARCH: { maxRetries: 2, retryDelay: 10000 },
  VALIDATION: { maxRetries: 2, retryDelay: 5000 },
  RECOMMENDATIONS: { maxRetries: 3, retryDelay: 2000 },
  DEFAULT: { maxRetries: 3, retryDelay: 1000 },
} as const;

/**
 * Cache configurations for React Query
 */
export const CACHE_CONFIGS = {
  METADATA: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  KEYWORDS: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  VALIDATION: {
    staleTime: 0, // Always fresh for status checks
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  RECOMMENDATIONS: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  JOB_STATUS: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
} as const;

/**
 * Polling intervals for different operations
 */
export const POLLING_INTERVALS = {
  VALIDATION_STATUS: 5000, // 5 seconds
  SEARCH_PROGRESS: 3000, // 3 seconds
  JOB_STATUS: 10000, // 10 seconds
} as const;

/**
 * Error message templates
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to ScholarFinder services. Please check your internet connection.',
  TIMEOUT_ERROR: 'The operation timed out. Please try again.',
  FILE_TOO_LARGE: `File size exceeds the maximum limit of ${FILE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB.`,
  INVALID_FILE_FORMAT: `Unsupported file format. Please upload a ${FILE_CONSTRAINTS.SUPPORTED_FORMATS.join(' or ')} file.`,
  VALIDATION_IN_PROGRESS: 'Author validation is already in progress for this job.',
  JOB_NOT_FOUND: 'The specified job was not found. Please start a new analysis.',
  INSUFFICIENT_KEYWORDS: 'Please select at least one primary keyword to continue.',
  NO_DATABASES_SELECTED: 'Please select at least one database to search.',
  EMPTY_AUTHOR_NAME: 'Please enter an author name to search.',
} as const;

/**
 * Success message templates
 */
export const SUCCESS_MESSAGES = {
  UPLOAD_COMPLETE: 'Manuscript uploaded and processed successfully!',
  KEYWORDS_ENHANCED: 'Keywords have been enhanced with AI suggestions.',
  SEARCH_STRING_GENERATED: 'Boolean search string generated successfully.',
  DATABASE_SEARCH_COMPLETE: 'Database search completed successfully.',
  AUTHOR_ADDED: 'Author has been added to the candidate pool.',
  VALIDATION_STARTED: 'Author validation has been initiated.',
  VALIDATION_COMPLETE: 'Author validation completed successfully.',
  RECOMMENDATIONS_READY: 'Reviewer recommendations are ready for review.',
} as const;

/**
 * Get configuration for specific operation
 */
export const getOperationConfig = (operation: keyof typeof OPERATION_TIMEOUTS) => ({
  timeout: OPERATION_TIMEOUTS[operation],
  retry: RETRY_CONFIGS[operation] || RETRY_CONFIGS.DEFAULT,
});

/**
 * Validate API configuration
 */
export const validateApiConfig = (): boolean => {
  try {
    new URL(SCHOLARFINDER_API_CONFIG.baseURL);
    return true;
  } catch {
    console.error('Invalid ScholarFinder API base URL:', SCHOLARFINDER_API_CONFIG.baseURL);
    return false;
  }
};

/**
 * Get environment-specific debug settings
 */
export const getDebugConfig = () => ({
  enableLogging: config.enableDebugLogging,
  enableDevTools: config.enableDevTools,
  logApiCalls: config.environment === 'development',
  logErrors: true,
  logPerformance: config.enablePerformanceMonitoring,
});

export default SCHOLARFINDER_API_CONFIG;