# Configuration Guide

This document describes the environment configuration system for the ScholarFinder frontend application.

## Overview

The application uses environment-specific configuration files to manage settings across different deployment environments (development, staging, production). This approach ensures proper separation of concerns and secure deployment practices.

## Environment Files

### Available Environment Files

- `.env` - Default configuration (fallback)
- `.env.development` - Development environment
- `.env.staging` - Staging environment  
- `.env.production` - Production environment
- `.env.example` - Template file with all available options

### Environment Selection

The environment is automatically determined based on:

1. Vite's `--mode` flag (e.g., `vite --mode staging`)
2. The `MODE` environment variable
3. The `DEV` flag (for development detection)

## Configuration Variables

### API Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001` | ✅ |
| `VITE_API_TIMEOUT` | Request timeout in milliseconds | `30000` | ✅ |
| `VITE_API_RETRY_ATTEMPTS` | Number of retry attempts for failed requests | `3` | ❌ |
| `VITE_API_RETRY_DELAY` | Delay between retries in milliseconds | `1000` | ❌ |

### File Upload Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_MAX_FILE_SIZE` | Maximum file size in bytes | `10485760` (10MB) | ✅ |
| `VITE_SUPPORTED_FILE_TYPES` | Comma-separated list of supported file types | `pdf,docx,doc` | ✅ |
| `VITE_UPLOAD_CHUNK_SIZE` | Upload chunk size in bytes | `1048576` (1MB) | ❌ |

### Authentication Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_JWT_STORAGE_KEY` | Local storage key for JWT token | `scholarfinder_token` | ✅ |
| `VITE_TOKEN_REFRESH_THRESHOLD` | Token refresh threshold in milliseconds | `300000` (5 min) | ❌ |

### Feature Flags

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_ENABLE_DEV_TOOLS` | Enable development tools | `true` (dev), `false` (prod) | ❌ |
| `VITE_ENABLE_QUERY_DEVTOOLS` | Enable React Query devtools | `true` (dev), `false` (prod) | ❌ |
| `VITE_ENABLE_DEBUG_LOGGING` | Enable debug logging | `true` (dev/staging), `false` (prod) | ❌ |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | `true` | ❌ |

### Cache Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_CACHE_STALE_TIME` | Cache stale time in milliseconds | `300000` (5 min) | ❌ |
| `VITE_CACHE_GC_TIME` | Cache garbage collection time in milliseconds | `600000` (10 min) | ❌ |

### UI Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_PAGINATION_DEFAULT_SIZE` | Default pagination size | `20` | ❌ |
| `VITE_TOAST_DURATION` | Toast notification duration in milliseconds | `5000` | ❌ |
| `VITE_DEBOUNCE_DELAY` | Input debounce delay in milliseconds | `300` | ❌ |

### Development Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_MOCK_API_DELAY` | Simulated API delay in development | `500` | ❌ |
| `VITE_ENABLE_API_MOCKING` | Enable API mocking | `false` | ❌ |

## Environment-Specific Recommendations

### Development Environment

```bash
# .env.development
VITE_API_BASE_URL="http://localhost:3001"
VITE_ENABLE_DEV_TOOLS="true"
VITE_ENABLE_QUERY_DEVTOOLS="true"
VITE_ENABLE_DEBUG_LOGGING="true"
VITE_SUPPORTED_FILE_TYPES="pdf,docx,doc,txt"  # More permissive for testing
```

### Staging Environment

```bash
# .env.staging
VITE_API_BASE_URL="https://staging-api.scholarfinder.com"
VITE_ENABLE_DEV_TOOLS="true"  # Keep enabled for testing
VITE_ENABLE_DEBUG_LOGGING="true"
VITE_JWT_STORAGE_KEY="scholarfinder_token_staging"  # Separate from production
```

### Production Environment

```bash
# .env.production
VITE_API_BASE_URL="https://api.scholarfinder.com"
VITE_ENABLE_DEV_TOOLS="false"
VITE_ENABLE_QUERY_DEVTOOLS="false"
VITE_ENABLE_DEBUG_LOGGING="false"
VITE_CACHE_STALE_TIME="600000"  # Longer cache times
```

## Build Scripts

### Available Scripts

| Script | Description | Environment |
|--------|-------------|-------------|
| `npm run dev` | Development server | development |
| `npm run dev:staging` | Development server with staging config | staging |
| `npm run build` | Production build | production |
| `npm run build:dev` | Development build | development |
| `npm run build:staging` | Staging build | staging |
| `npm run build:prod` | Production build | production |
| `npm run validate-config` | Validate all environment configurations | all |

### Custom Build Script

Use the enhanced build script for comprehensive validation:

```bash
# Build for specific environment
node scripts/build.js --env=staging

# Validate configuration only
npm run validate-config staging
```

## Configuration Validation

### Automatic Validation

The application automatically validates configuration on startup and will throw descriptive errors for:

- Missing required variables
- Invalid URL formats
- Invalid numeric values
- Invalid boolean values
- Empty arrays where values are required

### Manual Validation

Run configuration validation manually:

```bash
# Validate all environments
npm run validate-config

# Validate specific environment
npm run validate-config production
```

### Validation Rules

1. **URLs**: Must be valid HTTP/HTTPS URLs
2. **Numbers**: Must be valid positive integers (where applicable)
3. **Booleans**: Must be 'true', 'false', '1', or '0'
4. **File Types**: Must be comma-separated list of valid extensions
5. **Required Fields**: Cannot be empty or undefined

## Error Handling

### Configuration Errors

When configuration validation fails, the application will:

1. Log detailed error messages to the console
2. Throw a `ConfigValidationError` with field-specific information
3. Prevent application startup until issues are resolved

### Example Error Messages

```
❌ Configuration validation failed for VITE_API_BASE_URL: Invalid URL format: not-a-url
❌ Configuration validation failed for VITE_API_TIMEOUT: Must be a positive number, got: -1000
❌ Configuration validation failed for VITE_SUPPORTED_FILE_TYPES: Must be a non-empty array, got: 
```

## Best Practices

### Security

1. **Never commit sensitive data** to environment files
2. **Use different storage keys** for different environments
3. **Disable debug features** in production
4. **Use HTTPS URLs** in staging and production

### Performance

1. **Increase cache times** in production
2. **Disable development tools** in production
3. **Use appropriate timeout values** for each environment
4. **Enable performance monitoring** in all environments

### Maintenance

1. **Keep .env.example up to date** with all available options
2. **Document environment-specific requirements**
3. **Validate configurations** before deployment
4. **Use consistent naming conventions**

## Troubleshooting

### Common Issues

1. **"Environment variable X is required but not set"**
   - Add the missing variable to your environment file
   - Check the variable name for typos

2. **"Invalid URL format"**
   - Ensure URLs include protocol (http:// or https://)
   - Check for trailing slashes or invalid characters

3. **"Must be a positive number"**
   - Ensure numeric values are valid integers
   - Remove any non-numeric characters

4. **Configuration not loading**
   - Check that the environment file exists
   - Verify the file is in the project root
   - Ensure proper file naming (.env.development, not .env.dev)

### Debug Configuration Loading

Enable debug logging to see configuration loading:

```bash
VITE_ENABLE_DEBUG_LOGGING=true npm run dev
```

This will log the loaded configuration to the browser console.

## Migration from Legacy Configuration

If migrating from an older configuration system:

1. **Copy existing values** to the new environment files
2. **Update variable names** to match the new schema
3. **Add missing required variables**
4. **Run validation** to ensure everything is correct
5. **Test in development** before deploying

## Support

For configuration-related issues:

1. Check this documentation
2. Run `npm run validate-config` to identify issues
3. Review the console logs for detailed error messages
4. Ensure all required variables are set correctly