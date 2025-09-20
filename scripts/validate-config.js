#!/usr/bin/env node

/**
 * Configuration validation script
 * Validates environment configuration before build/deployment
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const REQUIRED_ENV_VARS = [
    'VITE_API_BASE_URL',
    'VITE_API_TIMEOUT',
    'VITE_MAX_FILE_SIZE',
    'VITE_SUPPORTED_FILE_TYPES',
    'VITE_JWT_STORAGE_KEY',
];

const OPTIONAL_ENV_VARS = [
    'VITE_API_RETRY_ATTEMPTS',
    'VITE_API_RETRY_DELAY',
    'VITE_UPLOAD_CHUNK_SIZE',
    'VITE_TOKEN_REFRESH_THRESHOLD',
    'VITE_ENABLE_DEV_TOOLS',
    'VITE_ENABLE_QUERY_DEVTOOLS',
    'VITE_ENABLE_DEBUG_LOGGING',
    'VITE_ENABLE_PERFORMANCE_MONITORING',
    'VITE_CACHE_STALE_TIME',
    'VITE_CACHE_GC_TIME',
    'VITE_PAGINATION_DEFAULT_SIZE',
    'VITE_TOAST_DURATION',
    'VITE_DEBOUNCE_DELAY',
    'VITE_ENABLE_API_MOCKING',
    'VITE_MOCK_API_DELAY',
];

/**
 * Parse environment file
 */
function parseEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return {};
    }

    const content = readFileSync(filePath, 'utf-8');
    const env = {};

    content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
            }
        }
    });

    return env;
}

/**
 * Validate URL format
 */
function validateUrl(url, fieldName) {
    try {
        new URL(url);
        return true;
    } catch {
        console.error(`❌ ${fieldName}: Invalid URL format - ${url}`);
        return false;
    }
}

/**
 * Validate positive number
 */
function validatePositiveNumber(value, fieldName) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
        console.error(`❌ ${fieldName}: Must be a positive number - ${value}`);
        return false;
    }
    return true;
}

/**
 * Validate non-negative number
 */
function validateNonNegativeNumber(value, fieldName) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
        console.error(`❌ ${fieldName}: Must be a non-negative number - ${value}`);
        return false;
    }
    return true;
}

/**
 * Validate boolean
 */
function validateBoolean(value, fieldName) {
    if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
        console.error(`❌ ${fieldName}: Must be 'true', 'false', '1', or '0' - ${value}`);
        return false;
    }
    return true;
}

/**
 * Validate file types
 */
function validateFileTypes(value, fieldName) {
    const types = value.split(',').map(t => t.trim());
    if (types.length === 0 || types.some(t => !t)) {
        console.error(`❌ ${fieldName}: Must be a comma-separated list of file types - ${value}`);
        return false;
    }
    return true;
}

/**
 * Validate configuration
 */
function validateConfig(env, envName) {
    console.log(`\n🔍 Validating ${envName} configuration...`);
    
    let isValid = true;
    const errors = [];
    const warnings = [];

    // Check required variables
    for (const varName of REQUIRED_ENV_VARS) {
        if (!env[varName]) {
            errors.push(`Missing required variable: ${varName}`);
            isValid = false;
        }
    }

    // Validate specific fields if they exist
    if (env.VITE_API_BASE_URL) {
        if (!validateUrl(env.VITE_API_BASE_URL, 'VITE_API_BASE_URL')) {
            isValid = false;
        }
    }

    if (env.VITE_API_TIMEOUT) {
        if (!validatePositiveNumber(env.VITE_API_TIMEOUT, 'VITE_API_TIMEOUT')) {
            isValid = false;
        }
    }

    if (env.VITE_API_RETRY_ATTEMPTS) {
        if (!validatePositiveNumber(env.VITE_API_RETRY_ATTEMPTS, 'VITE_API_RETRY_ATTEMPTS')) {
            isValid = false;
        }
    }

    if (env.VITE_API_RETRY_DELAY) {
        if (!validateNonNegativeNumber(env.VITE_API_RETRY_DELAY, 'VITE_API_RETRY_DELAY')) {
            isValid = false;
        }
    }

    if (env.VITE_MAX_FILE_SIZE) {
        if (!validatePositiveNumber(env.VITE_MAX_FILE_SIZE, 'VITE_MAX_FILE_SIZE')) {
            isValid = false;
        }
    }

    if (env.VITE_SUPPORTED_FILE_TYPES) {
        if (!validateFileTypes(env.VITE_SUPPORTED_FILE_TYPES, 'VITE_SUPPORTED_FILE_TYPES')) {
            isValid = false;
        }
    }

    if (env.VITE_UPLOAD_CHUNK_SIZE) {
        if (!validatePositiveNumber(env.VITE_UPLOAD_CHUNK_SIZE, 'VITE_UPLOAD_CHUNK_SIZE')) {
            isValid = false;
        }
    }

    if (env.VITE_TOKEN_REFRESH_THRESHOLD) {
        if (!validatePositiveNumber(env.VITE_TOKEN_REFRESH_THRESHOLD, 'VITE_TOKEN_REFRESH_THRESHOLD')) {
            isValid = false;
        }
    }

    // Validate boolean flags
    const booleanVars = [
        'VITE_ENABLE_DEV_TOOLS',
        'VITE_ENABLE_QUERY_DEVTOOLS',
        'VITE_ENABLE_DEBUG_LOGGING',
        'VITE_ENABLE_PERFORMANCE_MONITORING',
        'VITE_ENABLE_API_MOCKING',
    ];

    for (const varName of booleanVars) {
        if (env[varName] && !validateBoolean(env[varName], varName)) {
            isValid = false;
        }
    }

    // Validate numeric configurations
    const numericVars = [
        'VITE_CACHE_STALE_TIME',
        'VITE_CACHE_GC_TIME',
        'VITE_PAGINATION_DEFAULT_SIZE',
        'VITE_TOAST_DURATION',
        'VITE_DEBOUNCE_DELAY',
        'VITE_MOCK_API_DELAY',
    ];

    for (const varName of numericVars) {
        if (env[varName] && !validateNonNegativeNumber(env[varName], varName)) {
            isValid = false;
        }
    }

    // Environment-specific validations
    if (envName === 'production') {
        if (env.VITE_ENABLE_DEV_TOOLS === 'true') {
            warnings.push('Dev tools are enabled in production');
        }
        if (env.VITE_ENABLE_DEBUG_LOGGING === 'true') {
            warnings.push('Debug logging is enabled in production');
        }
        if (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.includes('localhost')) {
            errors.push('Production should not use localhost API URL');
            isValid = false;
        }
    }

    if (envName === 'development') {
        if (env.VITE_API_BASE_URL && !env.VITE_API_BASE_URL.includes('localhost')) {
            warnings.push('Development environment using non-localhost API URL');
        }
    }

    // Report results
    if (errors.length > 0) {
        console.error(`❌ ${envName} configuration has errors:`);
        errors.forEach(error => console.error(`   • ${error}`));
    }

    if (warnings.length > 0) {
        console.warn(`⚠️  ${envName} configuration has warnings:`);
        warnings.forEach(warning => console.warn(`   • ${warning}`));
    }

    if (isValid && errors.length === 0) {
        console.log(`✅ ${envName} configuration is valid`);
    }

    return isValid;
}

/**
 * Main validation function
 */
function main() {
    console.log('🔧 ScholarFinder Configuration Validator');
    console.log('=========================================');

    const mode = process.argv[2] || 'all';
    const environments = mode === 'all' 
        ? ['development', 'staging', 'production']
        : [mode];

    let allValid = true;

    for (const env of environments) {
        const envFile = `.env.${env}`;
        const envConfig = parseEnvFile(envFile);
        
        if (Object.keys(envConfig).length === 0) {
            console.warn(`⚠️  No configuration found for ${env} (${envFile})`);
            continue;
        }

        const isValid = validateConfig(envConfig, env);
        if (!isValid) {
            allValid = false;
        }
    }

    console.log('\n' + '='.repeat(50));
    
    if (allValid) {
        console.log('✅ All configurations are valid!');
        process.exit(0);
    } else {
        console.error('❌ Configuration validation failed!');
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { validateConfig, parseEnvFile };