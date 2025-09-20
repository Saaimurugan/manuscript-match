# Frontend-Backend Integration Testing

This directory contains comprehensive tests for the frontend-backend integration, covering unit tests, integration tests, component tests, and end-to-end tests.

## Test Structure

```
src/test/
├── setup.ts                    # Global test setup and mocks
├── integration-setup.ts        # MSW server setup for integration tests
├── utils.tsx                   # Test utilities and helpers
├── run-all-tests.ts            # Comprehensive test runner
├── fixtures/                   # Test fixtures and mock data
│   ├── test-manuscript.pdf
│   └── invalid-file.txt
├── integration/                # Integration tests
│   ├── authentication-flow.integration.test.tsx
│   └── manuscript-analysis-workflow.integration.test.tsx
└── e2e/                       # End-to-end tests
    └── complete-workflow.e2e.test.ts
```

## Test Categories

### 1. Unit Tests

Located in `src/**/__tests__/*.test.ts` files throughout the codebase.

**Service Layer Tests:**
- `src/services/__tests__/authService.test.ts` - Authentication service
- `src/services/__tests__/apiService.test.ts` - HTTP client and API communication
- `src/services/__tests__/processService.test.ts` - Process management
- `src/services/__tests__/fileService.test.ts` - File upload and metadata
- `src/services/__tests__/keywordService.test.ts` - Keyword enhancement
- `src/services/__tests__/searchService.test.ts` - Database search
- `src/services/__tests__/validationService.test.ts` - Author validation
- `src/services/__tests__/recommendationService.test.ts` - Reviewer recommendations
- `src/services/__tests__/shortlistService.test.ts` - Shortlist management
- `src/services/__tests__/adminService.test.ts` - Admin functionality
- `src/services/__tests__/activityLogger.test.ts` - Activity logging

**Hook Tests:**
- `src/hooks/__tests__/useAuth.test.ts` - Authentication hook
- `src/hooks/__tests__/useProcesses.test.ts` - Process management hook
- `src/hooks/__tests__/useFiles.test.ts` - File operations hook
- `src/hooks/__tests__/useKeywords.test.ts` - Keyword enhancement hook
- `src/hooks/__tests__/useSearch.test.ts` - Search functionality hook
- `src/hooks/__tests__/useValidation.test.ts` - Validation hook
- `src/hooks/__tests__/useRecommendations.test.ts` - Recommendations hook
- `src/hooks/__tests__/useShortlists.test.ts` - Shortlist management hook
- `src/hooks/__tests__/useAdmin.test.ts` - Admin functionality hook
- `src/hooks/__tests__/useActivityLogs.test.ts` - Activity logging hook

**Utility Tests:**
- `src/lib/__tests__/config.test.ts` - Configuration management
- `src/lib/__tests__/fileValidation.test.ts` - File validation utilities

### 2. Integration Tests

Located in `src/test/integration/` directory.

**Authentication Flow Integration:**
- Complete login/logout workflow
- Token management and expiration
- Protected route access control
- Password change functionality
- Error handling and recovery

**Manuscript Analysis Workflow Integration:**
- End-to-end manuscript analysis process
- File upload with progress tracking
- Metadata extraction and editing
- Keyword enhancement and selection
- Database search with progress monitoring
- Author validation with detailed results
- Reviewer recommendations with filtering
- Shortlist creation and management
- Error handling throughout workflow
- Progress saving and resuming

### 3. Component Tests

Located in `src/components/**/__tests__/*.test.tsx` files.

**Authentication Components:**
- `src/components/auth/__tests__/AuthenticationFlow.test.tsx` - Complete auth flow
- Login form validation and submission
- Protected route behavior
- User profile management

**Process Management Components:**
- Process creation and editing
- Process workflow navigation
- Step tracking and progress

**File Upload Components:**
- File selection and validation
- Upload progress tracking
- Error handling for invalid files

**Data Extraction Components:**
- Metadata display and editing
- Form validation and submission

**Keyword Enhancement Components:**
- Keyword enhancement workflow
- Selection management
- Search string generation

**Search Components:**
- Database search initiation
- Progress monitoring
- Manual search functionality

**Validation Components:**
- Validation rule configuration
- Results display
- Step-by-step validation tracking

**Results Components:**
- Reviewer recommendation display
- Filtering and sorting
- Pagination handling

**Shortlist Components:**
- Shortlist creation and management
- Export functionality
- Reviewer selection

**Admin Components:**
- Dashboard data display
- User management
- System statistics

**Error Components:**
- Error boundary behavior
- Toast notifications
- Retry mechanisms

### 4. End-to-End Tests

Located in `src/test/e2e/` directory using Playwright.

**Complete Workflow E2E:**
- Full user journey from login to shortlist export
- Error handling and recovery
- Progress saving and resuming
- Network error simulation
- Authentication expiration handling

## Running Tests

### Individual Test Suites

```bash
# Unit tests only
npm run test

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Visual test UI
npm run test:ui
npm run test:e2e:ui
```

### Comprehensive Test Suite

```bash
# Run all tests with comprehensive reporting
npm run test:all

# CI/CD pipeline tests
npm run test:ci
```

## Test Configuration

### Vitest Configuration

- **Unit Tests:** `vitest.config.ts`
- **Integration Tests:** `vitest.integration.config.ts`
- **Coverage:** V8 provider with 80% threshold
- **Environment:** jsdom for React component testing

### Playwright Configuration

- **Config File:** `playwright.config.ts`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reports:** HTML, JSON, JUnit
- **Features:** Screenshots on failure, video recording, trace collection

### Mock Service Worker (MSW)

- **Setup:** `src/test/integration-setup.ts`
- **Purpose:** Mock backend API responses for integration tests
- **Coverage:** All API endpoints with realistic responses

## Test Data and Fixtures

### Mock Data

- **Users:** Test user profiles with different roles
- **Processes:** Sample manuscript analysis processes
- **Files:** PDF and document fixtures for upload testing
- **Authors:** Mock reviewer data with validation states
- **Metadata:** Sample extracted manuscript metadata

### Test Utilities

- **Custom Render:** React component rendering with providers
- **Data Factories:** Functions to create mock data objects
- **Assertions:** Custom matchers for common test scenarios
- **Helpers:** Utilities for async operations and DOM interactions

## Coverage Requirements

### Minimum Coverage Thresholds

- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

### Coverage Exclusions

- Configuration files
- Type definitions
- Test files themselves
- Build artifacts
- Node modules

## Best Practices

### Unit Tests

1. **Isolation:** Each test should be independent
2. **Mocking:** Mock external dependencies and API calls
3. **Assertions:** Use specific, meaningful assertions
4. **Naming:** Descriptive test names that explain the scenario
5. **Setup:** Proper beforeEach/afterEach cleanup

### Integration Tests

1. **Real Scenarios:** Test actual user workflows
2. **API Mocking:** Use MSW for consistent API responses
3. **Error Cases:** Test error handling and recovery
4. **State Management:** Verify state changes across components
5. **Async Operations:** Proper handling of promises and timeouts

### Component Tests

1. **User Interactions:** Test from user perspective
2. **Accessibility:** Verify ARIA attributes and keyboard navigation
3. **Props Testing:** Test different prop combinations
4. **Event Handling:** Verify event callbacks and state updates
5. **Loading States:** Test loading, error, and success states

### End-to-End Tests

1. **User Journeys:** Test complete workflows
2. **Real Browser:** Use actual browser environments
3. **Data Independence:** Each test should create its own data
4. **Stability:** Use reliable selectors and wait strategies
5. **Cleanup:** Proper test data cleanup

## Debugging Tests

### Common Issues

1. **Async Operations:** Use proper await/waitFor patterns
2. **Mock Cleanup:** Ensure mocks are reset between tests
3. **DOM Queries:** Use appropriate queries (getBy, findBy, queryBy)
4. **Timing Issues:** Add proper waits for async operations
5. **State Persistence:** Clear state between tests

### Debugging Tools

1. **Test UI:** `npm run test:ui` for interactive debugging
2. **Playwright Inspector:** `npm run test:e2e:ui` for E2E debugging
3. **Coverage Reports:** Identify untested code paths
4. **Console Logs:** Strategic logging for test debugging
5. **Breakpoints:** Use debugger statements in tests

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

### Test Reports

- **JSON Report:** Machine-readable test results
- **Markdown Report:** Human-readable summary
- **Coverage Report:** HTML coverage visualization
- **Playwright Report:** E2E test results with screenshots

## Maintenance

### Regular Tasks

1. **Update Dependencies:** Keep testing libraries current
2. **Review Coverage:** Ensure coverage thresholds are met
3. **Refactor Tests:** Keep tests maintainable and readable
4. **Mock Updates:** Update mocks when API changes
5. **Performance:** Monitor test execution times

### When Adding New Features

1. **Unit Tests:** Test new services and utilities
2. **Integration Tests:** Test new workflows and interactions
3. **Component Tests:** Test new UI components
4. **E2E Tests:** Update workflows that include new features
5. **Mock Data:** Add new mock data as needed

This comprehensive testing setup ensures that the frontend-backend integration is thoroughly tested at all levels, providing confidence in the reliability and functionality of the application.