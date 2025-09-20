/**
 * Deployment Configuration
 * Environment-specific build and deployment settings
 */

export const deploymentConfig = {
    development: {
        buildCommand: 'npm run build:dev',
        outputDir: 'dist',
        publicPath: '/',
        sourcemap: true,
        minify: false,
        environmentFile: '.env.development',
        apiBaseUrl: 'http://localhost:3001',
        features: {
            devTools: true,
            queryDevtools: true,
            debugLogging: true,
            performanceMonitoring: true,
        },
    },
    
    staging: {
        buildCommand: 'npm run build:staging',
        outputDir: 'dist',
        publicPath: '/',
        sourcemap: true,
        minify: true,
        environmentFile: '.env.staging',
        apiBaseUrl: 'https://staging-api.scholarfinder.com',
        features: {
            devTools: true,
            queryDevtools: true,
            debugLogging: true,
            performanceMonitoring: true,
        },
        deployment: {
            target: 'staging',
            healthCheck: '/health',
            timeout: 300,
        },
    },
    
    production: {
        buildCommand: 'npm run build:prod',
        outputDir: 'dist',
        publicPath: '/',
        sourcemap: false,
        minify: true,
        environmentFile: '.env.production',
        apiBaseUrl: 'https://api.scholarfinder.com',
        features: {
            devTools: false,
            queryDevtools: false,
            debugLogging: false,
            performanceMonitoring: true,
        },
        deployment: {
            target: 'production',
            healthCheck: '/health',
            timeout: 600,
        },
        optimization: {
            splitChunks: true,
            treeshaking: true,
            compression: 'gzip',
            caching: true,
        },
    },
};

/**
 * Get deployment configuration for environment
 */
export function getDeploymentConfig(environment = 'production') {
    const config = deploymentConfig[environment];
    if (!config) {
        throw new Error(`Unknown deployment environment: ${environment}`);
    }
    return config;
}

/**
 * Validate deployment configuration
 */
export function validateDeploymentConfig(environment) {
    const config = getDeploymentConfig(environment);
    
    const errors = [];
    
    if (!config.buildCommand) {
        errors.push('buildCommand is required');
    }
    
    if (!config.outputDir) {
        errors.push('outputDir is required');
    }
    
    if (!config.environmentFile) {
        errors.push('environmentFile is required');
    }
    
    if (!config.apiBaseUrl) {
        errors.push('apiBaseUrl is required');
    }
    
    if (errors.length > 0) {
        throw new Error(`Invalid deployment configuration for ${environment}: ${errors.join(', ')}`);
    }
    
    return true;
}

export default deploymentConfig;