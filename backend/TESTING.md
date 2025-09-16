# Comprehensive Testing Guide

This document provides detailed information about the testing suite for the ScholarFinder backend application.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Test Data and Fixtures](#test-data-and-fixtures)
6. [Performance Testing](#performance-testing)
7. [Continuous Integration](#continuous-integration)
8. [Writing New Tests](#writing-new-tests)
9. [Troubleshooting](#troubleshooting)

## Overview

The ScholarFinder backend employs a comprehensive testing strategy that includes:

- **Unit Tests**: Testing individual components in isolation
- **Integration Tests**: Testing API endpoints and database interactions
- **End-to-End Tests**: Testing complete workflows
- **Performance Tests**: Load testing and performance benchmarking
- **Security Tests**: Authentication and authorization testing

### Test Coverage Goals

- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: All critical user workflows covered
- **Performance Tests**: All performance-critical operations benchmarked

## Test Structure

```
backend/src/__tests__/
├── unit/                     # Unit tests
│   ├── comprehensive-unit.test.ts
│   └── recommendation-endpoints.test.ts
├── integration/              # Integration tests
│   ├── comprehensive-integration.test.ts
│   ├── auth.integration.test.ts
│   ├── processes.test.ts
│   └── ...
├── e2e/                      # End-to-end tests
│   └── complete-workflows.test.ts
├── performance/              # Performance tests
│   ├── load-testing.test.ts
│   ├── cache-performance.test.ts
│   └── endpoint-performance.test.ts
├── services/                 # Service-specific tests
├── repositories/             # Repository tests
├── middleware/               # Middleware tests
├── utils/                    # Utility tests
└── setup/                    # Test setup and utilities
```

## Running Tests

### Prerequisites

1. Node.js 18+ installed
2. Dependencies installed: `npm install`
3. Database migrations applied: `npx prisma migrate deploy`
4. Environment variables set (see `.env.example`)

### Test Commands

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for CI/CD
npm run test:ci
```

### Environment Variables for Testing

```bash
NODE_ENV=test
DATABASE_URL=file:./test.db
JWT_SECRET=test-jwt-secret-that-is-at-least-32-characters-long
REDIS_URL=redis://localhost:6379
```

## Test Categories

### Unit Tests

Unit tests focus on testing individual functions, classes, and modules in isolation.

**Location**: `src/__tests__/unit/`

**Coverage**:
- Service classes (AuthorValidationService, KeywordEnhancementService, etc.)
- Repository classes
- Utility functions
- Middleware functions
- Data models and validation

**Example**:
```typescript
describe('AuthorValidationService', () => {
  let validationService: AuthorValidationService;

  beforeEach(() => {
    validationService = new AuthorValidationService(mockPrisma);
  });

  it('should validate authors with no conflicts', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Integration tests verify that different components work together correctly, particularly API endpoints and database interactions.

**Location**: `src/__tests__/integration/`

**Coverage**:
- All REST API endpoints
- Database operations
- Authentication and authorization
- File upload and processing
- External API integrations

**Example**:
```typescript
describe('Process Management API', () => {
  it('should create a new process', async () => {
    const response = await testContext.request
      .post('/api/processes')
      .set(authHeaders)
      .send({ title: 'Test Process' });

    expect(response.status).toBe(201);
  });
});
```

### End-to-End Tests

E2E tests verify complete user workflows from start to finish.

**Location**: `src/__tests__/e2e/`

**Coverage**:
- Complete manuscript processing workflow
- User registration and authentication flow
- Admin oversight workflows
- Error recovery scenarios
- Multi-user concurrent operations

**Example**:
```typescript
describe('Complete Manuscript Processing Workflow', () => {
  it('should complete entire workflow from upload to export', async () => {
    // Step 1: User registration
    // Step 2: Create process
    // Step 3: Upload manuscript
    // Step 4: Process and validate
    // Step 5: Generate recommendations
    // Step 6: Create and export shortlist
  });
});
```

### Performance Tests

Performance tests ensure the application meets performance requirements under various load conditions.

**Location**: `src/__tests__/performance/`

**Coverage**:
- Concurrent user load testing
- File processing performance
- Database query performance
- Memory usage monitoring
- API response time benchmarks

**Example**:
```typescript
describe('Load Testing', () => {
  it('should handle 50 concurrent users', async () => {
    const users = await createConcurrentUsers(50);
    const responses = await Promise.all(
      users.map(user => makeRequest(user))
    );
    
    expect(responses.every(r => r.status < 400)).toBe(true);
  });
});
```

## Test Data and Fixtures

### Test Fixtures

Test fixtures provide consistent, reusable test data across the test suite.

**Location**: `src/test/fixtures.ts`

**Available Fixtures**:
- `testUsers`: User accounts for testing
- `testProcesses`: Process data templates
- `testAuthors`: Author data for validation testing
- `testAffiliations`: Institution data
- `testKeywords`: Keyword sets for different domains
- `testPerformanceThresholds`: Performance benchmarks

### Test Utilities

**Location**: `src/test/testUtils.ts`

**Key Utilities**:
- `TestContext`: Manages test environment setup/teardown
- `PerformanceTracker`: Monitors performance metrics
- `createTestContext()`: Factory for test contexts
- `seedTestDatabase()`: Populates test database
- Mock data generators for files and API responses

### Database Seeding

```typescript
// Seed test database with sample data
await seedTestDatabase(testContext.prisma);

// Create authenticated test user
const user = await testContext.createAuthenticatedUser();

// Clean up test data
await testContext.cleanup();
```

## Performance Testing

### Performance Thresholds

The application maintains the following performance standards:

```typescript
export const testPerformanceThresholds = {
  responseTime: {
    fast: 100,        // ms - Health checks, simple queries
    acceptable: 500,  // ms - Standard API operations
    slow: 1000       // ms - Complex operations (file processing)
  },
  throughput: {
    minimum: 10,     // requests/second
    target: 50,      // requests/second
    maximum: 100     // requests/second
  },
  memory: {
    baseline: 50,    // MB
    warning: 100,    // MB
    critical: 200    // MB
  }
};
```

### Load Testing Scenarios

1. **Concurrent Users**: 10-50 simultaneous users
2. **File Processing**: Multiple large file uploads
3. **Database Operations**: Complex queries with large datasets
4. **Sustained Load**: Extended periods of continuous requests
5. **Memory Stress**: Operations that could cause memory leaks

### Performance Monitoring

Performance tests automatically track:
- Response times for all operations
- Memory usage patterns
- Database query performance
- Concurrent operation success rates
- Resource utilization metrics

## Continuous Integration

### GitHub Actions Workflow

The CI/CD pipeline runs comprehensive tests on every push and pull request:

1. **Setup**: Install dependencies, setup database
2. **Unit Tests**: Run all unit tests with coverage
3. **Integration Tests**: Test API endpoints and database operations
4. **E2E Tests**: Execute complete workflow tests
5. **Performance Tests**: Run load tests and benchmarks
6. **Security Scan**: Check for vulnerabilities
7. **Coverage Report**: Generate and upload coverage data

### Test Environment

CI tests run in a controlled environment with:
- Node.js 18.x and 20.x (matrix testing)
- SQLite test database
- Redis for caching tests
- Isolated test data for each run

### Quality Gates

Tests must pass the following criteria:
- All test suites pass (unit, integration, e2e, performance)
- Code coverage ≥ 85%
- No high-severity security vulnerabilities
- Performance benchmarks within acceptable thresholds

## Writing New Tests

### Test File Naming

- Unit tests: `*.test.ts` in appropriate subdirectory
- Integration tests: `*.integration.test.ts` or `*.test.ts` in `integration/`
- E2E tests: `*.test.ts` in `e2e/`
- Performance tests: `*.test.ts` in `performance/`

### Test Structure Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestContext, createTestContext } from '../test/testUtils';

describe('Feature Name', () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = createTestContext();
    await testContext.setup();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Specific Functionality', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const testData = { /* test data */ };

      // Act
      const result = await performOperation(testData);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after each test
3. **Descriptive Names**: Use clear, descriptive test names
4. **AAA Pattern**: Arrange, Act, Assert structure
5. **Mock External Dependencies**: Use mocks for external APIs and services
6. **Performance Awareness**: Include performance assertions for critical operations
7. **Error Testing**: Test both success and failure scenarios

### Adding Performance Tests

```typescript
describe('Performance Test', () => {
  it('should complete operation within time limit', async () => {
    const startTime = Date.now();
    
    await performOperation();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(testPerformanceThresholds.responseTime.acceptable);
  });
});
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is properly initialized
   - Check DATABASE_URL environment variable
   - Run `npx prisma migrate deploy` before tests

2. **Authentication Failures**
   - Verify JWT_SECRET is set correctly
   - Check token generation in test utilities
   - Ensure user creation is working properly

3. **File Processing Errors**
   - Verify mock file buffers are valid
   - Check file upload middleware configuration
   - Ensure temporary directories are writable

4. **Performance Test Failures**
   - Check system resources during test execution
   - Adjust performance thresholds if needed
   - Verify test isolation (no interference between tests)

5. **Memory Issues**
   - Enable garbage collection in tests: `--expose-gc`
   - Check for memory leaks in long-running tests
   - Monitor memory usage patterns

### Debug Mode

Run tests with additional debugging:

```bash
# Enable debug logging
DEBUG=* npm test

# Run with increased timeout
npm test -- --testTimeout=30000

# Run specific test file
npm test -- --testPathPattern=unit/comprehensive-unit.test.ts
```

### Test Data Cleanup

If tests are failing due to data conflicts:

```bash
# Reset test database
rm backend/prisma/test.db
npx prisma migrate deploy

# Clear Redis cache
redis-cli FLUSHALL
```

## Maintenance

### Regular Tasks

1. **Update Test Data**: Keep fixtures current with application changes
2. **Performance Baselines**: Review and update performance thresholds
3. **Coverage Analysis**: Monitor coverage reports and add tests for uncovered code
4. **Dependency Updates**: Keep testing dependencies up to date
5. **CI/CD Optimization**: Improve test execution speed and reliability

### Monitoring

- Track test execution times
- Monitor test failure rates
- Review coverage trends
- Analyze performance benchmark results
- Check for flaky tests and improve stability

For questions or issues with the testing suite, please refer to the project documentation or contact the development team.