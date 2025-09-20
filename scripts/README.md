# Build Scripts

This directory contains build and deployment scripts for the ScholarFinder frontend application.

## Scripts

### validate-config.js

Validates environment configuration files to ensure all required variables are set and have valid values.

**Usage:**
```bash
# Validate all environments
node scripts/validate-config.js

# Validate specific environment
node scripts/validate-config.js production
```

**Features:**
- Validates required environment variables
- Checks URL formats
- Validates numeric values
- Checks boolean values
- Environment-specific validations
- Detailed error reporting

### build.js

Enhanced build script with comprehensive validation and environment handling.

**Usage:**
```bash
# Build for production (default)
node scripts/build.js

# Build for specific environment
node scripts/build.js --env=staging
```

**Features:**
- Pre-build validation
- Environment configuration validation
- TypeScript type checking
- ESLint validation
- Build directory cleaning
- Post-build validation
- Deployment summary generation
- Build info generation

## Build Process

The build process follows these steps:

1. **Environment Validation** - Validates the target environment configuration
2. **Pre-build Checks** - Runs TypeScript and ESLint checks
3. **Build Info Generation** - Creates build metadata
4. **Directory Cleaning** - Cleans the output directory
5. **Build Execution** - Runs the Vite build command
6. **Post-build Validation** - Verifies build output
7. **Summary Generation** - Creates deployment summary

## Configuration Validation

### Validation Rules

- **URLs**: Must be valid HTTP/HTTPS URLs
- **Numbers**: Must be valid positive integers (where applicable)
- **Booleans**: Must be 'true', 'false', '1', or '0'
- **File Types**: Must be comma-separated list of valid extensions
- **Required Fields**: Cannot be empty or undefined

### Environment-Specific Rules

- **Production**: Should not use localhost URLs or enable debug features
- **Development**: Can use localhost URLs and debug features
- **Staging**: Should use staging URLs but can have debug features enabled

## Error Handling

Both scripts provide detailed error messages and exit with appropriate codes:

- **Exit Code 0**: Success
- **Exit Code 1**: Validation or build failure

## Integration with Package.json

The scripts are integrated with npm scripts in package.json:

```json
{
  "scripts": {
    "validate-config": "node scripts/validate-config.js",
    "build:enhanced": "node scripts/build.js"
  }
}
```

## Continuous Integration

These scripts are designed to work in CI/CD environments:

```yaml
# Example GitHub Actions usage
- name: Validate Configuration
  run: npm run validate-config production

- name: Build Application
  run: node scripts/build.js --env=production
```

## Troubleshooting

### Common Issues

1. **Module Import Errors**: Ensure Node.js version 16+ is used
2. **Permission Errors**: Make scripts executable with `chmod +x scripts/*.js`
3. **Environment File Not Found**: Ensure environment files exist in project root
4. **Validation Failures**: Check environment variable values and formats

### Debug Mode

Enable verbose logging by setting environment variables:

```bash
DEBUG=1 node scripts/build.js --env=development
```