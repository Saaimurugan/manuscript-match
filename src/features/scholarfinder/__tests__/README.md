# ScholarFinder Comprehensive Test Suite

This directory contains a comprehensive test suite for the ScholarFinder frontend application, covering all aspects of functionality, accessibility, and user experience.

## Test Structure

```
src/features/scholarfinder/__tests__/
├── accessibility/                 # Accessibility compliance tests
│   ├── KeyboardNavigation.test.tsx
│   └── ScreenReader.test.tsx
├── integration/                   # Integration tests
│   ├── ApiIntegration.test.tsx
│   └── WorkflowIntegration.test.tsx
└── README.md                     # This file

src/features/scholarfinder/
├── components/
│   └── **/__tests__/            # Component unit tests
├── hooks/
│   └── __tests__/               # Hook unit tests
├── services/
│   └── __tests__/               # Service unit tests
└── utils/
    └── __tests__/               # Utility function tests

src/test/
├── e2e/                         # End-to-end tests
│   ├── complete-workflow.e2e.test.ts
│   └── scholarfinder-critical-journeys.e2e.test.ts
├── integration/                 # Cross-feature integration tests
└── run-comprehensive-tests.ts   # Test runner script
```

## Test Categories

### 1. Unit Tests

**Location**: `src/features/scholarfinder/*/__tests__/`

**Purpose**: Test individual components, hooks, services, and utilities in isolation.

**Coverage**:
- ✅ All custom hooks (`useScholarFinderApi`, `useProcessManagement`, `useWorkflowState`, etc.)
- ✅ All utility functions (`errorHandling`, `stepValidation`, `accessibility`, etc.)
- ✅ All service classes (`ScholarFinderApiService`, `ProcessManagementService`)
- ✅ All step components (`UploadStep`, `MetadataStep`, `KeywordStep`, etc.)
- ✅ All common components (`FileUpload`, `ProgressIndicator`, `StepWizard`, etc.)

**Key Features Tested**:
- Component rendering and props handling
- User interaction scenarios
- State management and updates
- Error handling and recovery
- Form validation and submission
- API integration with mocked responses

### 2. Integration Tests

**Location**: `src/features/scholarfinder/__tests__/integration/`

**Purpose**: Test how different parts of the application work together.

**Coverage**:
- ✅ Complete workflow processes from upload to export
- ✅ API integration with external ScholarFinder services
- ✅ State persistence and recovery
- ✅ Error handling across component boundaries
- ✅ React Query caching and synchronization

**Key Scenarios**:
- Full manuscript analysis workflow
- Error recovery and retry mechanisms
- Network failure handling
- Data validation and transformation
- Cross-step navigation and state preservation

### 3. Accessibility Tests

**Location**: `src/features/scholarfinder/__tests__/accessibility/`

**Purpose**: Ensure the application is accessible to users with disabilities.

**Coverage**:
- ✅ Keyboard navigation throughout the application
- ✅ Screen reader compatibility and ARIA labels
- ✅ Focus management and tab order
- ✅ Color contrast and visual accessibility
- ✅ Semantic HTML structure
- ✅ Form accessibility and error announcements

**Standards Compliance**:
- WCAG 2.1 AA compliance
- Section 508 compliance
- Proper ARIA usage
- Semantic HTML structure

### 4. End-to-End Tests

**Location**: `src/test/e2e/`

**Purpose**: Test complete user journeys from a user's perspective.

**Coverage**:
- ✅ Complete manuscript analysis workflow (happy path)
- ✅ Error scenarios and recovery
- ✅ State persistence across page refreshes
- ✅ Authentication integration
- ✅ Cross-browser compatibility
- ✅ Performance under load

**Critical User Journeys**:
1. **Complete Workflow**: Upload → Metadata → Keywords → Search → Validation → Recommendations → Shortlist → Export
2. **Error Recovery**: Handle file upload errors, network failures, API timeouts
3. **State Persistence**: Resume workflow after page refresh or navigation
4. **Accessibility**: Complete workflow using only keyboard navigation
5. **Performance**: Handle large datasets efficiently

## Running Tests

### Individual Test Types

```bash
# Unit tests only
npm run test

# Integration tests only
npm run test:integration

# Accessibility tests only
npx vitest run src/features/scholarfinder/__tests__/accessibility

# End-to-end tests only
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Comprehensive Test Suite

```bash
# Run all test types with comprehensive reporting
npx tsx src/test/run-comprehensive-tests.ts

# Or use the npm script
npm run test:comprehensive
```

### Test Configuration

The comprehensive test suite uses multiple configuration files:

- `vitest.config.ts` - Standard unit tests
- `vitest.integration.config.ts` - Integration tests
- `vitest.comprehensive.config.ts` - Comprehensive test suite
- `playwright.config.ts` - End-to-end tests

## Test Coverage Requirements

### Minimum Coverage Thresholds

- **Statements**: 85%
- **Branches**: 85%
- **Functions**: 85%
- **Lines**: 85%

### Critical Component Thresholds

- **Services**: 90% (higher due to business logic importance)
- **Utilities**: 90% (higher due to reusability)
- **Hooks**: 85%
- **Components**: 80%

## Test Patterns and Best Practices

### Component Testing

```typescript
// Example component test structure
describe('ComponentName', () => {
  const defaultProps = { /* ... */ };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    
    render(<ComponentName {...defaultProps} onAction={onAction} />);
    
    await user.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalledWith(expectedArgs);
  });

  it('handles error states', () => {
    render(<ComponentName {...defaultProps} error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
// Example hook test structure
describe('useCustomHook', () => {
  it('returns expected initial state', () => {
    const { result } = renderHook(() => useCustomHook());
    
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles state updates', () => {
    const { result } = renderHook(() => useCustomHook());
    
    act(() => {
      result.current.updateData('new data');
    });
    
    expect(result.current.data).toBe('new data');
  });
});
```

### API Integration Testing

```typescript
// Example API integration test
describe('API Integration', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('handles successful API calls', async () => {
    server.use(
      http.post('/api/endpoint', () => {
        return HttpResponse.json({ success: true });
      })
    );

    const result = await apiService.callEndpoint();
    expect(result.success).toBe(true);
  });

  it('handles API errors', async () => {
    server.use(
      http.post('/api/endpoint', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    await expect(apiService.callEndpoint()).rejects.toThrow();
  });
});
```

## Continuous Integration

The test suite is designed to run in CI/CD environments with the following considerations:

### Test Execution Order

1. **Unit Tests** (fastest, run first)
2. **Integration Tests** (medium speed)
3. **Accessibility Tests** (medium speed)
4. **End-to-End Tests** (slowest, run last)

### Failure Handling

- **Required Tests**: Unit, Integration, Accessibility (must pass)
- **Optional Tests**: End-to-End (failures don't block deployment)

### Performance Considerations

- Tests run in parallel where possible
- Timeouts configured appropriately for each test type
- Resource cleanup after each test
- Efficient mocking to reduce external dependencies

## Debugging Tests

### Common Issues and Solutions

1. **Flaky Tests**: Use `waitFor` for async operations, proper cleanup
2. **Memory Leaks**: Clear mocks and timers in `afterEach`
3. **Timeout Issues**: Increase timeout for slow operations
4. **Mock Issues**: Ensure mocks are reset between tests

### Debug Commands

```bash
# Run tests in debug mode
npx vitest run --reporter=verbose

# Run specific test file
npx vitest run path/to/test.test.ts

# Run tests with UI
npx vitest --ui

# Debug end-to-end tests
npx playwright test --debug
```

## Reporting

The comprehensive test suite generates multiple report formats:

- **HTML Report**: Visual test results with coverage
- **JSON Report**: Machine-readable results for CI/CD
- **JUnit XML**: Compatible with most CI systems
- **Coverage Reports**: Detailed code coverage analysis

Reports are generated in the `test-reports/` directory.

## Contributing

When adding new features to ScholarFinder:

1. **Write tests first** (TDD approach recommended)
2. **Ensure all test types are covered**:
   - Unit tests for new components/hooks/utilities
   - Integration tests for new workflows
   - Accessibility tests for new UI elements
   - E2E tests for new user journeys
3. **Maintain coverage thresholds**
4. **Update this documentation** if adding new test patterns

### Test Checklist for New Features

- [ ] Unit tests for all new functions/components
- [ ] Integration tests for new workflows
- [ ] Accessibility tests for new UI elements
- [ ] E2E tests for new user journeys
- [ ] Error handling tests
- [ ] Performance tests for data-heavy operations
- [ ] Cross-browser compatibility verification
- [ ] Mobile responsiveness tests (if applicable)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MSW (Mock Service Worker)](https://mswjs.io/)