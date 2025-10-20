# ScholarFinder Frontend Design Document

## Overview

The ScholarFinder Frontend is a React-based web application that provides an intuitive interface for the 9-step academic peer reviewer identification workflow. The application integrates with external AWS Lambda APIs to guide researchers through manuscript analysis, keyword enhancement, database searching, and reviewer recommendation processes. Built using modern React patterns with TypeScript, the frontend leverages the existing authentication system and provides a responsive, accessible interface optimized for academic workflows.

The application follows a step-based wizard pattern, allowing users to progress through the reviewer identification process while maintaining state persistence and providing clear navigation between steps. The design emphasizes user experience with real-time feedback, progress tracking, and comprehensive error handling.

## Architecture

### System Architecture

The frontend follows a component-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│     (React Components, UI Components, Step Wizards)        │
├─────────────────────────────────────────────────────────────┤
│                   Application Layer                         │
│        (Hooks, Context Providers, State Management)        │
├─────────────────────────────────────────────────────────────┤
│                   Service Layer                             │
│    (API Clients, External Service Integration, Caching)    │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│      (HTTP Client, Error Handling, Authentication)         │
└─────────────────────────────────────────────────────────────┘
```

**Design Rationale**: The layered architecture ensures maintainability by separating UI concerns from business logic and external service integration. This allows for easier testing, reusability of components, and flexibility in changing external API implementations.

### Technology Stack

- **Framework**: React 18 with TypeScript for type safety and modern React features
- **Routing**: React Router DOM for client-side navigation and step management
- **State Management**: React Query (TanStack Query) for server state and caching
- **UI Framework**: Radix UI components with Tailwind CSS for consistent, accessible design
- **Form Management**: React Hook Form with Zod validation for robust form handling
- **HTTP Client**: Axios for API communication with interceptors and error handling
- **Authentication**: Existing JWT-based authentication system integration
- **File Handling**: Native File API with drag-and-drop support
- **Testing**: Vitest, React Testing Library, and Playwright for comprehensive testing

**Design Rationale**: Leverages the existing tech stack while adding specialized tools for the ScholarFinder workflow. React Query provides excellent caching and synchronization for external API calls, while React Hook Form offers optimal performance for complex forms with validation.

## Components and Interfaces

### Core Services

#### 1. ScholarFinder API Service
```typescript
interface ScholarFinderApiService {
  uploadManuscript(file: File): Promise<UploadResponse>
  getMetadata(jobId: string): Promise<MetadataResponse>
  enhanceKeywords(jobId: string): Promise<KeywordEnhancementResponse>
  generateKeywordString(jobId: string, keywords: KeywordSelection): Promise<KeywordStringResponse>
  searchDatabases(jobId: string, databases: DatabaseSelection): Promise<DatabaseSearchResponse>
  addManualAuthor(jobId: string, authorName: string): Promise<ManualAuthorResponse>
  validateAuthors(jobId: string): Promise<ValidationResponse>
  getRecommendations(jobId: string): Promise<RecommendationsResponse>
}

interface UploadResponse {
  message: string
  data: {
    job_id: string
    file_name: string
    timestamp: string
    heading: string
    authors: string[]
    affiliations: string[]
    keywords: string
    abstract: string
    author_aff_map: Record<string, string>
  }
}

interface KeywordEnhancementResponse {
  message: string
  job_id: string
  data: {
    mesh_terms: string[]
    broader_terms: string[]
    primary_focus: string[]
    secondary_focus: string[]
    additional_primary_keywords: string[]
    additional_secondary_keywords: string[]
    all_primary_focus_list: string[]
    all_secondary_focus_list: string[]
  }
}
```

**Design Rationale**: Strongly typed interfaces ensure type safety when integrating with external APIs. The service abstracts API complexity and provides a clean interface for React components to consume.

#### 2. Process Management Service
```typescript
interface ProcessManagementService {
  createProcess(manuscriptData: ManuscriptMetadata): Promise<Process>
  getProcess(processId: string): Promise<Process>
  updateProcessStep(processId: string, step: ProcessStep): Promise<void>
  listUserProcesses(): Promise<Process[]>
  deleteProcess(processId: string): Promise<void>
}

interface Process {
  id: string
  jobId: string // External API job ID
  title: string
  status: ProcessStatus
  currentStep: ProcessStep
  createdAt: Date
  updatedAt: Date
  metadata: ProcessMetadata
}

enum ProcessStep {
  UPLOAD = 'upload',
  METADATA = 'metadata',
  KEYWORDS = 'keywords',
  SEARCH = 'search',
  MANUAL = 'manual',
  VALIDATION = 'validation',
  RECOMMENDATIONS = 'recommendations',
  SHORTLIST = 'shortlist',
  EXPORT = 'export'
}
```

**Design Rationale**: Separates external API job management from internal process tracking. This allows for better user experience with process persistence and navigation while maintaining loose coupling with external services.

### React Components Architecture

#### 1. Step Wizard Components
```typescript
interface StepWizardProps {
  processId: string
  initialStep?: ProcessStep
  onStepChange?: (step: ProcessStep) => void
  onComplete?: (process: Process) => void
}

interface StepComponentProps {
  processId: string
  jobId: string
  onNext: (data?: any) => void
  onPrevious: () => void
  isLoading?: boolean
}

// Individual step components
const UploadStep: React.FC<StepComponentProps>
const MetadataStep: React.FC<StepComponentProps>
const KeywordStep: React.FC<StepComponentProps>
const SearchStep: React.FC<StepComponentProps>
const ValidationStep: React.FC<StepComponentProps>
const RecommendationsStep: React.FC<StepComponentProps>
const ShortlistStep: React.FC<StepComponentProps>
const ExportStep: React.FC<StepComponentProps>
```

**Design Rationale**: Modular step components allow for independent development and testing. Common props interface ensures consistency while allowing step-specific customization.

#### 2. Data Display Components
```typescript
interface ReviewerTableProps {
  reviewers: Reviewer[]
  onSort: (column: string, direction: 'asc' | 'desc') => void
  onFilter: (filters: ReviewerFilters) => void
  onSelect: (reviewerIds: string[]) => void
  selectedIds: string[]
  isLoading?: boolean
}

interface ReviewerFilters {
  minPublications?: number
  maxRetractions?: number
  countries?: string[]
  affiliations?: string[]
  validationScore?: number
}

interface ProgressIndicatorProps {
  currentStep: ProcessStep
  completedSteps: ProcessStep[]
  onStepClick?: (step: ProcessStep) => void
  disabled?: boolean
}
```

**Design Rationale**: Reusable components with clear interfaces promote consistency and reduce code duplication. Props-based configuration allows for flexible usage across different contexts.

### State Management

#### 1. React Query Integration
```typescript
// Custom hooks for API integration
const useUploadManuscript = () => {
  return useMutation({
    mutationFn: (file: File) => scholarFinderApi.uploadManuscript(file),
    onSuccess: (data) => {
      // Handle successful upload
      queryClient.setQueryData(['process', data.data.job_id], data)
    },
    onError: (error) => {
      // Handle upload error
      toast.error('Upload failed: ' + error.message)
    }
  })
}

const useProcessData = (processId: string) => {
  return useQuery({
    queryKey: ['process', processId],
    queryFn: () => processService.getProcess(processId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })
}

const useRecommendations = (jobId: string, filters: ReviewerFilters) => {
  return useQuery({
    queryKey: ['recommendations', jobId, filters],
    queryFn: () => scholarFinderApi.getRecommendations(jobId),
    enabled: !!jobId,
    select: (data) => applyFilters(data.reviewers, filters),
  })
}
```

**Design Rationale**: React Query provides excellent caching, synchronization, and error handling for external API calls. Custom hooks encapsulate API logic and provide consistent interfaces for components.

#### 2. Context Providers
```typescript
interface ScholarFinderContextType {
  currentProcess: Process | null
  setCurrentProcess: (process: Process) => void
  currentStep: ProcessStep
  setCurrentStep: (step: ProcessStep) => void
  shortlist: Reviewer[]
  addToShortlist: (reviewer: Reviewer) => void
  removeFromShortlist: (reviewerId: string) => void
  clearShortlist: () => void
}

const ScholarFinderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Context implementation
}
```

**Design Rationale**: Context provides global state management for workflow-specific data while avoiding prop drilling. Keeps state management simple and focused on the ScholarFinder workflow.

## Data Models

### Core Entities
```typescript
interface ManuscriptMetadata {
  title: string
  authors: Author[]
  affiliations: Affiliation[]
  abstract: string
  keywords: string[]
  primaryFocusAreas: string[]
  secondaryFocusAreas: string[]
}

interface Author {
  name: string
  email?: string
  affiliation: string
}

interface Reviewer {
  reviewer: string
  email: string
  aff: string
  city: string
  country: string
  Total_Publications: number
  English_Pubs: number
  'Publications (last 10 years)': number
  'Relevant Publications (last 5 years)': number
  'Publications (last 2 years)': number
  'Publications (last year)': number
  Clinical_Trials_no: number
  Clinical_study_no: number
  Case_reports_no: number
  Retracted_Pubs_no: number
  TF_Publications_last_year: number
  coauthor: boolean
  country_match: string
  aff_match: string
  conditions_met: number
  conditions_satisfied: string
}

interface KeywordSelection {
  primary_keywords_input: string
  secondary_keywords_input: string
}

interface DatabaseSelection {
  selected_websites: string[]
}
```

**Design Rationale**: TypeScript interfaces match the external API response structure while providing type safety. This ensures consistency between frontend and backend data models.

### Form Schemas
```typescript
// Zod schemas for form validation
const manuscriptMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.array(z.object({
    name: z.string().min(1, 'Author name is required'),
    email: z.string().email().optional(),
    affiliation: z.string().min(1, 'Affiliation is required'),
  })).min(1, 'At least one author is required'),
  abstract: z.string().min(50, 'Abstract must be at least 50 characters'),
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
})

const keywordSelectionSchema = z.object({
  primaryKeywords: z.array(z.string()).min(1, 'Select at least one primary keyword'),
  secondaryKeywords: z.array(z.string()).min(1, 'Select at least one secondary keyword'),
})

const databaseSelectionSchema = z.object({
  databases: z.array(z.string()).min(1, 'Select at least one database'),
})
```

**Design Rationale**: Zod schemas provide runtime validation and type inference, ensuring data integrity and providing clear error messages for users.

## User Interface Design

### Step-by-Step Workflow
```typescript
const ScholarFinderWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ProcessStep>(ProcessStep.UPLOAD)
  const [process, setProcess] = useState<Process | null>(null)

  const steps = [
    { key: ProcessStep.UPLOAD, title: 'Upload Manuscript', component: UploadStep },
    { key: ProcessStep.METADATA, title: 'Review Metadata', component: MetadataStep },
    { key: ProcessStep.KEYWORDS, title: 'Enhance Keywords', component: KeywordStep },
    { key: ProcessStep.SEARCH, title: 'Search Databases', component: SearchStep },
    { key: ProcessStep.MANUAL, title: 'Manual Addition', component: ManualStep },
    { key: ProcessStep.VALIDATION, title: 'Validate Authors', component: ValidationStep },
    { key: ProcessStep.RECOMMENDATIONS, title: 'Review Recommendations', component: RecommendationsStep },
    { key: ProcessStep.SHORTLIST, title: 'Create Shortlist', component: ShortlistStep },
    { key: ProcessStep.EXPORT, title: 'Export Results', component: ExportStep },
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <ProgressIndicator 
        currentStep={currentStep}
        steps={steps}
        onStepClick={handleStepNavigation}
      />
      <StepContent 
        step={currentStep}
        process={process}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </div>
  )
}
```

### Responsive Design Strategy
- **Desktop (1024px+)**: Full-width layout with side navigation and detailed tables
- **Tablet (768px-1023px)**: Stacked layout with collapsible sections
- **Mobile (320px-767px)**: Single-column layout with simplified interactions

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG AA compliant color schemes
- **Focus Management**: Clear focus indicators and logical tab order

## Error Handling

### Error Classification
```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

interface AppError {
  type: ErrorType
  message: string
  details?: any
  timestamp: Date
  recoverable: boolean
  retryAction?: () => Promise<void>
}
```

### Error Handling Strategy
1. **Network Errors**: Automatic retry with exponential backoff
2. **API Errors**: User-friendly messages with suggested actions
3. **Validation Errors**: Real-time field-level feedback
4. **File Errors**: Clear guidance on supported formats and size limits
5. **Authentication Errors**: Seamless integration with existing auth system

### Error Recovery
```typescript
const useErrorRecovery = () => {
  const [error, setError] = useState<AppError | null>(null)
  
  const handleError = useCallback((error: AppError) => {
    setError(error)
    
    // Log error for monitoring
    errorLogger.log(error)
    
    // Show user notification
    if (error.recoverable) {
      toast.error(error.message, {
        action: error.retryAction ? {
          label: 'Retry',
          onClick: error.retryAction
        } : undefined
      })
    } else {
      toast.error(error.message)
    }
  }, [])
  
  return { error, handleError, clearError: () => setError(null) }
}
```

**Design Rationale**: Comprehensive error handling improves user experience by providing clear feedback and recovery options. Integration with existing error handling systems ensures consistency.

## Testing Strategy

### Unit Testing
- **Components**: Test rendering, props handling, and user interactions
- **Hooks**: Test custom hooks with various scenarios and edge cases
- **Services**: Test API integration with mocked responses
- **Utilities**: Test helper functions and data transformations

### Integration Testing
- **Workflow**: Test complete step-by-step processes
- **API Integration**: Test external API calls with mock servers
- **State Management**: Test React Query caching and synchronization
- **Form Handling**: Test form validation and submission

### End-to-End Testing
- **Complete Workflows**: Test full manuscript processing pipeline
- **Error Scenarios**: Test system behavior under various failure conditions
- **Cross-browser**: Test compatibility across different browsers
- **Accessibility**: Test keyboard navigation and screen reader compatibility

### Testing Tools
- **Vitest**: Unit and integration testing framework
- **React Testing Library**: Component testing with user-centric approach
- **Playwright**: End-to-end testing with real browser automation
- **MSW**: API mocking for predictable testing

**Design Rationale**: Comprehensive testing strategy ensures reliability and maintainability. Focus on user behavior rather than implementation details provides more robust tests.

## Performance Considerations

### Optimization Strategies
1. **Code Splitting**: Lazy load step components to reduce initial bundle size
2. **Caching**: Leverage React Query for intelligent data caching
3. **Virtualization**: Use virtual scrolling for large reviewer tables
4. **Debouncing**: Debounce search and filter inputs to reduce API calls
5. **Memoization**: Use React.memo and useMemo for expensive computations

### Bundle Optimization
```typescript
// Lazy loading for step components
const UploadStep = lazy(() => import('./steps/UploadStep'))
const MetadataStep = lazy(() => import('./steps/MetadataStep'))
const KeywordStep = lazy(() => import('./steps/KeywordStep'))

// Code splitting by route
const ScholarFinderApp = lazy(() => import('./ScholarFinderApp'))
```

### Data Loading Strategy
- **Progressive Loading**: Load data as needed for each step
- **Background Prefetching**: Prefetch likely next step data
- **Optimistic Updates**: Update UI immediately for better perceived performance
- **Error Boundaries**: Isolate failures to prevent cascade errors

**Design Rationale**: Performance optimizations focus on perceived performance and actual load times. Progressive loading and caching strategies minimize wait times while maintaining responsiveness.