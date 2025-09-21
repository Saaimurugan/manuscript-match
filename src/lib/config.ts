/**
 * Application configuration management
 * Handles environment-specific settings for different deployment environments
 */

export interface AppConfig {
    // API Configuration
    apiBaseUrl: string;
    apiTimeout: number;
    apiRetryAttempts: number;
    apiRetryDelay: number;
    
    // File Upload Configuration
    maxFileSize: number;
    supportedFileTypes: string[];
    uploadChunkSize: number;
    
    // Authentication Configuration
    jwtStorageKey: string;
    tokenRefreshThreshold: number;
    
    // Feature Flags
    enableDevTools: boolean;
    enableQueryDevtools: boolean;
    enableDebugLogging: boolean;
    enablePerformanceMonitoring: boolean;
    
    // Cache Configuration
    cacheStaleTime: number;
    cacheGcTime: number;
    
    // UI Configuration
    paginationDefaultSize: number;
    toastDuration: number;
    debounceDelay: number;
    
    // Development Configuration
    mockApiDelay?: number;
    enableApiMocking: boolean;
    
    // Environment Information
    environment: 'development' | 'staging' | 'production';
    version: string;
}

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
    constructor(message: string, public field: string) {
        super(`Configuration validation failed for ${field}: ${message}`);
        this.name = 'ConfigValidationError';
    }
}

/**
 * Validate URL format
 */
const validateUrl = (url: string, fieldName: string): void => {
    try {
        new URL(url);
    } catch {
        throw new ConfigValidationError(`Invalid URL format: ${url}`, fieldName);
    }
};

/**
 * Validate positive number
 */
const validatePositiveNumber = (value: number, fieldName: string): void => {
    if (isNaN(value) || value <= 0) {
        throw new ConfigValidationError(`Must be a positive number, got: ${value}`, fieldName);
    }
};

/**
 * Validate non-negative number
 */
const validateNonNegativeNumber = (value: number, fieldName: string): void => {
    if (isNaN(value) || value < 0) {
        throw new ConfigValidationError(`Must be a non-negative number, got: ${value}`, fieldName);
    }
};

/**
 * Validate array is not empty
 */
const validateNonEmptyArray = (array: any[], fieldName: string): void => {
    if (!Array.isArray(array) || array.length === 0) {
        throw new ConfigValidationError(`Must be a non-empty array, got: ${array}`, fieldName);
    }
};

/**
 * Get environment variable with fallback
 */
const getEnvVar = (key: string, fallback?: string): string => {
    const value = import.meta.env[key];
    if (value !== undefined) return value;
    if (fallback !== undefined) return fallback;
    throw new ConfigValidationError(`Environment variable ${key} is required but not set`, key);
};

/**
 * Get environment variable as number with fallback
 */
const getEnvNumber = (key: string, fallback?: number): number => {
    const value = import.meta.env[key];
    if (value !== undefined) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            throw new ConfigValidationError(`Environment variable ${key} must be a valid number, got: ${value}`, key);
        }
        return parsed;
    }
    if (fallback !== undefined) return fallback;
    throw new ConfigValidationError(`Environment variable ${key} is required but not set`, key);
};

/**
 * Get environment variable as boolean with fallback
 */
const getEnvBoolean = (key: string, fallback?: boolean): boolean => {
    const value = import.meta.env[key];
    if (value !== undefined) {
        return value === 'true' || value === '1';
    }
    if (fallback !== undefined) return fallback;
    throw new ConfigValidationError(`Environment variable ${key} is required but not set`, key);
};

/**
 * Determine current environment
 */
const determineEnvironment = (): 'development' | 'staging' | 'production' => {
    const mode = import.meta.env.MODE;
    const isDev = import.meta.env.DEV;
    
    if (isDev || mode === 'development') return 'development';
    if (mode === 'staging') return 'staging';
    return 'production';
};

/**
 * Load and validate application configuration from environment variables
 */
const loadConfig = (): AppConfig => {
    try {
        const environment = determineEnvironment();
        
        // Load configuration values
        const apiBaseUrl = getEnvVar('VITE_API_BASE_URL', 'http://localhost:3002');
        const apiTimeout = getEnvNumber('VITE_API_TIMEOUT', 60000); // Increased to 60 seconds
        const apiRetryAttempts = getEnvNumber('VITE_API_RETRY_ATTEMPTS', 3);
        const apiRetryDelay = getEnvNumber('VITE_API_RETRY_DELAY', 1000);
        
        const maxFileSize = getEnvNumber('VITE_MAX_FILE_SIZE', 104857600); // Increased to 100MB
        const supportedFileTypes = getEnvVar('VITE_SUPPORTED_FILE_TYPES', 'pdf,docx,doc').split(',').map(type => type.trim());
        const uploadChunkSize = getEnvNumber('VITE_UPLOAD_CHUNK_SIZE', 1048576); // 1MB
        
        const jwtStorageKey = getEnvVar('VITE_JWT_STORAGE_KEY', 'scholarfinder_token');
        const tokenRefreshThreshold = getEnvNumber('VITE_TOKEN_REFRESH_THRESHOLD', 300000); // 5 minutes
        
        const enableDevTools = getEnvBoolean('VITE_ENABLE_DEV_TOOLS', environment === 'development');
        const enableQueryDevtools = getEnvBoolean('VITE_ENABLE_QUERY_DEVTOOLS', environment === 'development');
        const enableDebugLogging = getEnvBoolean('VITE_ENABLE_DEBUG_LOGGING', environment !== 'production');
        const enablePerformanceMonitoring = getEnvBoolean('VITE_ENABLE_PERFORMANCE_MONITORING', true);
        
        const cacheStaleTime = getEnvNumber('VITE_CACHE_STALE_TIME', 300000); // 5 minutes
        const cacheGcTime = getEnvNumber('VITE_CACHE_GC_TIME', 600000); // 10 minutes
        
        const paginationDefaultSize = getEnvNumber('VITE_PAGINATION_DEFAULT_SIZE', 20);
        const toastDuration = getEnvNumber('VITE_TOAST_DURATION', 5000);
        const debounceDelay = getEnvNumber('VITE_DEBOUNCE_DELAY', 300);
        
        const enableApiMocking = getEnvBoolean('VITE_ENABLE_API_MOCKING', false);
        const mockApiDelay = environment === 'development' ? getEnvNumber('VITE_MOCK_API_DELAY', 500) : undefined;
        
        const config: AppConfig = {
            // API Configuration
            apiBaseUrl,
            apiTimeout,
            apiRetryAttempts,
            apiRetryDelay,
            
            // File Upload Configuration
            maxFileSize,
            supportedFileTypes,
            uploadChunkSize,
            
            // Authentication Configuration
            jwtStorageKey,
            tokenRefreshThreshold,
            
            // Feature Flags
            enableDevTools,
            enableQueryDevtools,
            enableDebugLogging,
            enablePerformanceMonitoring,
            
            // Cache Configuration
            cacheStaleTime,
            cacheGcTime,
            
            // UI Configuration
            paginationDefaultSize,
            toastDuration,
            debounceDelay,
            
            // Development Configuration
            mockApiDelay,
            enableApiMocking,
            
            // Environment Information
            environment,
            version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        };

        // Validate configuration
        validateUrl(config.apiBaseUrl, 'VITE_API_BASE_URL');
        validatePositiveNumber(config.apiTimeout, 'VITE_API_TIMEOUT');
        validatePositiveNumber(config.apiRetryAttempts, 'VITE_API_RETRY_ATTEMPTS');
        validateNonNegativeNumber(config.apiRetryDelay, 'VITE_API_RETRY_DELAY');
        
        validatePositiveNumber(config.maxFileSize, 'VITE_MAX_FILE_SIZE');
        validateNonEmptyArray(config.supportedFileTypes, 'VITE_SUPPORTED_FILE_TYPES');
        validatePositiveNumber(config.uploadChunkSize, 'VITE_UPLOAD_CHUNK_SIZE');
        
        if (!config.jwtStorageKey.trim()) {
            throw new ConfigValidationError('Cannot be empty', 'VITE_JWT_STORAGE_KEY');
        }
        validatePositiveNumber(config.tokenRefreshThreshold, 'VITE_TOKEN_REFRESH_THRESHOLD');
        
        validatePositiveNumber(config.cacheStaleTime, 'VITE_CACHE_STALE_TIME');
        validatePositiveNumber(config.cacheGcTime, 'VITE_CACHE_GC_TIME');
        
        validatePositiveNumber(config.paginationDefaultSize, 'VITE_PAGINATION_DEFAULT_SIZE');
        validatePositiveNumber(config.toastDuration, 'VITE_TOAST_DURATION');
        validateNonNegativeNumber(config.debounceDelay, 'VITE_DEBOUNCE_DELAY');
        
        if (config.mockApiDelay !== undefined) {
            validateNonNegativeNumber(config.mockApiDelay, 'VITE_MOCK_API_DELAY');
        }

        // Log configuration in development
        if (config.enableDebugLogging) {
            console.log('🔧 Application Configuration Loaded:', {
                environment: config.environment,
                apiBaseUrl: config.apiBaseUrl,
                enableDevTools: config.enableDevTools,
                enableQueryDevtools: config.enableQueryDevtools,
                enablePerformanceMonitoring: config.enablePerformanceMonitoring,
            });
        }

        return config;
    } catch (error) {
        if (error instanceof ConfigValidationError) {
            console.error('❌ Configuration Error:', error.message);
            throw error;
        }
        
        console.error('❌ Unexpected error loading configuration:', error);
        throw new Error('Failed to load application configuration');
    }
};

// Export the configuration instance with error handling
let config: AppConfig;
try {
  config = loadConfig();
} catch (error) {
  console.error('Failed to load configuration, using defaults:', error);
  
  // Fallback configuration
  config = {
    apiBaseUrl: 'http://localhost:3002',
    apiTimeout: 60000,
    apiRetryAttempts: 3,
    apiRetryDelay: 1000,
    maxFileSize: 104857600,
    supportedFileTypes: ['pdf', 'docx', 'doc'],
    uploadChunkSize: 1048576,
    jwtStorageKey: 'scholarfinder_token',
    tokenRefreshThreshold: 300000,
    enableDevTools: true,
    enableQueryDevtools: true,
    enableDebugLogging: true,
    enablePerformanceMonitoring: true,
    cacheStaleTime: 300000,
    cacheGcTime: 600000,
    paginationDefaultSize: 20,
    toastDuration: 5000,
    debounceDelay: 300,
    enableApiMocking: false,
    environment: 'development',
    version: '1.0.0',
  };
}

export { config };

// Export individual config values for convenience
export const {
    apiBaseUrl,
    apiTimeout,
    apiRetryAttempts,
    apiRetryDelay,
    maxFileSize,
    supportedFileTypes,
    uploadChunkSize,
    jwtStorageKey,
    tokenRefreshThreshold,
    enableDevTools,
    enableQueryDevtools,
    enableDebugLogging,
    enablePerformanceMonitoring,
    cacheStaleTime,
    cacheGcTime,
    paginationDefaultSize,
    toastDuration,
    debounceDelay,
    mockApiDelay,
    enableApiMocking,
    environment,
    version,
} = config;

/**
 * Get configuration for specific feature
 */
export const getApiConfig = () => ({
    baseUrl: apiBaseUrl,
    timeout: apiTimeout,
    retryAttempts: apiRetryAttempts,
    retryDelay: apiRetryDelay,
});

export const getFileConfig = () => ({
    maxFileSize,
    supportedFileTypes,
    uploadChunkSize,
});

export const getAuthConfig = () => ({
    storageKey: jwtStorageKey,
    refreshThreshold: tokenRefreshThreshold,
});

export const getCacheConfig = () => ({
    staleTime: cacheStaleTime,
    gcTime: cacheGcTime,
});

export const getUIConfig = () => ({
    paginationDefaultSize,
    toastDuration,
    debounceDelay,
});

export default config;