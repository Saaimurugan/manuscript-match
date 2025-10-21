// ScholarFinder API Configuration
// Configuration for external API endpoints and settings

export interface ScholarFinderApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  endpoints: ApiEndpoints;
}

export interface ApiEndpoints {
  uploadExtractMetadata: string;
  getMetadata: string;
  keywordEnhancement: string;
  keywordStringGenerator: string;
  databaseSearch: string;
  manualAuthors: string;
  validateAuthors: string;
  getRecommendations: string;
}

// Default configuration
export const defaultApiConfig: ScholarFinderApiConfig = {
  baseUrl: import.meta.env.VITE_SCHOLARFINDER_API_URL || 'https://api.scholarfinder.aws.lambda',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  endpoints: {
    uploadExtractMetadata: '/upload_extract_metadata',
    getMetadata: '/get_metadata',
    keywordEnhancement: '/keyword_enhancement',
    keywordStringGenerator: '/keyword_string_generator',
    databaseSearch: '/database_search',
    manualAuthors: '/manual_authors',
    validateAuthors: '/validate_authors',
    getRecommendations: '/get_recommendations'
  }
};

// Environment-specific configurations
export const apiConfigs = {
  development: {
    ...defaultApiConfig,
    baseUrl: import.meta.env.VITE_SCHOLARFINDER_API_URL_DEV || 'https://dev-api.scholarfinder.aws.lambda',
    timeout: 60000, // Longer timeout for development
  },
  staging: {
    ...defaultApiConfig,
    baseUrl: import.meta.env.VITE_SCHOLARFINDER_API_URL_STAGING || 'https://staging-api.scholarfinder.aws.lambda',
  },
  production: {
    ...defaultApiConfig,
    baseUrl: import.meta.env.VITE_SCHOLARFINDER_API_URL_PROD || 'https://api.scholarfinder.aws.lambda',
    retryAttempts: 5, // More retries in production
  }
};

// Get configuration based on environment
export const getApiConfig = (): ScholarFinderApiConfig => {
  const env = import.meta.env.MODE || 'development';
  return apiConfigs[env as keyof typeof apiConfigs] || defaultApiConfig;
};