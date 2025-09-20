# ScholarFinder Backend

Backend API service for ScholarFinder manuscript analysis and peer reviewer recommendation system.

## Features

- Manuscript processing and metadata extraction
- Multi-database author search integration
- Author validation and conflict detection
- Reviewer recommendation and filtering
- Shortlist management and export
- User authentication and activity logging
- Administrative oversight capabilities

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT tokens
- **File Processing**: PDF and Word document parsing
- **Testing**: Jest with Supertest

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and navigate to backend directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run generate
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Documentation

### API Documentation
- **Interactive Swagger UI**: http://localhost:3000/api-docs
- **API Documentation Guide**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **OpenAPI Spec**: http://localhost:3000/api-docs.json

### Testing Documentation
- **Comprehensive Test Report**: [TEST_REPORT.md](./TEST_REPORT.md)
- **Testing Guide**: [TESTING.md](./TESTING.md)
- **API Testing Examples**: [api-testing-examples.json](./api-testing-examples.json)
- **Automated Test Reporting**: [docs/TEST_REPORTING.md](./docs/TEST_REPORTING.md)

### Additional Documentation
- **Performance Optimizations**: [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)
- **TypeScript Fixes**: [TYPESCRIPT_FIXES_SUMMARY.md](./TYPESCRIPT_FIXES_SUMMARY.md)
- **Admin Implementation**: [ADMIN_IMPLEMENTATION_SUMMARY.md](./ADMIN_IMPLEMENTATION_SUMMARY.md)

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

### Available Scripts

#### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

#### Testing
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:e2e` - Run end-to-end tests only
- `npm run test:coverage` - Run tests with coverage
- `npm run test:ci` - Run tests in CI mode

#### Test Reporting
- `npm run test:with-reports` - Run tests and generate reports
- `npm run test:report` - Generate reports from last test run
- `npm run test:report:html` - Generate HTML report only
- `npm run test:report:markdown` - Generate Markdown report only
- `npm run build:with-tests` - Build and run tests with reports

#### Database
- `npm run migrate` - Run database migrations
- `npm run generate` - Generate Prisma client
- `npm run studio` - Open Prisma Studio

## API Documentation

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Process Management
- `POST /api/processes` - Create new process
- `GET /api/processes` - List user processes
- `GET /api/processes/:id` - Get process details
- `PUT /api/processes/:id/step` - Update process step
- `DELETE /api/processes/:id` - Delete process

### File Processing
- `POST /api/processes/:id/upload` - Upload manuscript
- `GET /api/processes/:id/metadata` - Get extracted metadata
- `PUT /api/processes/:id/metadata` - Update metadata

## Environment Variables

See `.env.example` for all available configuration options.

## Automated Test Reporting

The ScholarFinder backend includes a comprehensive automated test reporting system that generates detailed, professional-quality test reports in multiple formats whenever tests are executed. This system provides immediate insights into test results, code coverage, performance metrics, and system health.

### Key Features

- **🔄 Automatic Generation**: Reports are generated automatically after test execution with zero configuration
- **📊 Multiple Formats**: Interactive HTML reports, structured Markdown summaries, and JSON data exports
- **📈 Comprehensive Metrics**: Test results, code coverage, performance benchmarks, and build metadata
- **🚀 CI/CD Ready**: Optimized configurations for continuous integration environments with artifact support
- **⚙️ Highly Configurable**: Extensive customization options via `test-reporting.config.js` and environment variables
- **🛡️ Error Resilient**: Robust error handling ensures reports are generated even when tests fail
- **⚡ Performance Optimized**: Efficient processing with parallel generation and configurable resource limits

### Quick Start

```bash
# Run all tests with automatic report generation
npm run test:with-reports

# Run specific test categories with reports
npm run test:unit && npm run test:report
npm run test:integration && npm run test:report
npm run test:e2e && npm run test:report

# Generate reports from the last test run
npm run test:report

# Generate specific report formats
npm run test:report:html      # HTML only
npm run test:report:markdown  # Markdown only
npm run test:report:json      # JSON only
npm run test:report:all       # All formats
```

### Report Types and Locations

#### Interactive HTML Report (`test-reports/test-report.html`)
- **Purpose**: Comprehensive interactive report for detailed analysis
- **Features**: Collapsible sections, sortable tables, progress bars, charts
- **Best For**: Development, debugging, detailed analysis
- **Size**: ~2-5MB with full interactivity

#### Markdown Summary (`test-reports/test-report.md`)
- **Purpose**: Structured summary for documentation and quick review
- **Features**: Emoji status indicators, formatted tables, failure details
- **Best For**: Documentation, PR reviews, quick status checks
- **Size**: ~50-200KB lightweight format

#### JSON Data Export (`test-reports/test-results.json`)
- **Purpose**: Raw data for automation, integrations, and custom processing
- **Features**: Complete test metadata, structured data, API-friendly format
- **Best For**: CI/CD integrations, custom dashboards, data analysis
- **Size**: ~100-500KB structured data

### Integration Examples

#### Development Workflow
```bash
# Standard development testing with reports
npm run test:watch  # Development with watch mode
npm run test:with-reports  # Full test suite with reports

# View results
open test-reports/test-report.html  # Interactive analysis
```

#### CI/CD Pipeline
```bash
# CI-optimized testing with reports
npm run test:ci  # Runs tests in CI mode with automatic reporting
npm run test:report:generate:ci  # Generate reports for CI artifacts
```

#### Build Integration
```bash
# Build with comprehensive testing and reporting
npm run build:with-tests  # Build + test + reports
npm run build:enhanced  # Enhanced build with detailed reporting
```

### Configuration Overview

The reporting system is highly configurable through multiple methods:

1. **Configuration File**: `test-reporting.config.js` - Project-level settings
2. **Environment Variables**: Override any setting for different environments
3. **Package.json**: Additional configuration in the `testReporting` section
4. **Runtime Options**: Command-line flags for specific runs

#### Quick Configuration Examples

```javascript
// test-reporting.config.js
module.exports = {
  enabled: true,
  outputDirectory: 'test-reports',
  formats: {
    html: true,      // Interactive HTML reports
    markdown: true,  // Markdown summaries
    json: false      // JSON data (disabled by default)
  },
  html: {
    theme: 'light',  // 'light', 'dark', or 'auto'
    includeCharts: true,
    includeInteractiveFeatures: true
  }
};
```

```bash
# Environment variable examples
export TEST_REPORTS_DIR="custom-reports"
export HTML_THEME="dark"
export GENERATE_JSON_REPORTS="true"
```

### Performance Characteristics

- **Generation Time**: Typically 5-15 seconds for standard test suites
- **Memory Usage**: ~50-100MB during generation
- **File Sizes**: HTML (2-5MB), Markdown (50-200KB), JSON (100-500KB)
- **Parallel Processing**: Multiple formats generated simultaneously
- **Resource Limits**: Configurable timeouts and memory limits

### Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Reports not generating | Check `TEST_REPORTING_ENABLED` environment variable |
| Missing HTML features | Verify `HTML_INCLUDE_INTERACTIVE=true` |
| Large file sizes | Disable charts with `HTML_INCLUDE_CHARTS=false` |
| CI/CD failures | Use `npm run test:report:generate:ci` for CI mode |
| Permission errors | Check write permissions on `test-reports/` directory |

For comprehensive documentation, configuration guides, examples, and troubleshooting, see [docs/TEST_REPORTING.md](./docs/TEST_REPORTING.md).

## Database Schema

The application uses SQLite with Prisma ORM. See `prisma/schema.prisma` for the complete database schema.

## Contributing

1. Follow TypeScript best practices
2. Write tests for new features
3. Use conventional commit messages
4. Ensure all tests pass before submitting PRs

## License

MIT