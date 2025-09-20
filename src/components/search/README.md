# Database Search Integration

This directory contains components and functionality for integrating with the backend database search system. The search integration allows users to search multiple academic databases for potential reviewers and perform manual searches by name or email.

## Components

### ReviewerSearch
The main search component that handles keyword management and database search initiation.

**Features:**
- Enhanced keyword display from backend
- Keyword management (add/remove primary and secondary keywords)
- Database selection (PubMed, Elsevier, Wiley, Taylor & Francis)
- Search string generation and display
- Real-time search initiation with backend API

**Props:**
- `processId: string` - The process ID for the manuscript analysis
- `primaryKeywords: string[]` - Primary keywords for search
- `secondaryKeywords: string[]` - Secondary keywords for search
- `onKeywordsChange: (primary: string[], secondary: string[]) => void` - Callback for keyword changes
- `onSearchComplete?: () => void` - Optional callback when search completes

### SearchProgress
A component that displays real-time search progress with database-specific status updates.

**Features:**
- Overall progress percentage
- Database-specific progress tracking
- Real-time status updates via polling
- Error handling and display
- Success/failure notifications

**Props:**
- `processId: string` - The process ID to monitor
- `onComplete?: () => void` - Optional callback when search completes

### ManualSearch
A component for manual reviewer searches by name or email.

**Features:**
- Search by reviewer name
- Search by email address
- Input validation
- Error handling
- Success notifications

**Props:**
- `processId: string` - The process ID for the search
- `onSearchComplete?: (results: any[]) => void` - Optional callback with search results

## Hooks

### useInitiateSearch
Mutation hook for starting database searches.

```typescript
const initiateSearch = useInitiateSearch();

await initiateSearch.mutateAsync({
  processId: 'process-123',
  request: {
    keywords: ['machine learning', 'AI'],
    databases: ['pubmed', 'elsevier'],
    searchOptions: {
      maxResults: 1000,
      dateRange: {
        from: '2019-01-01T00:00:00.000Z',
        to: '2024-01-01T00:00:00.000Z'
      }
    }
  }
});
```

### useSearchStatus
Query hook for fetching search status with automatic polling.

```typescript
const { data: status, isLoading } = useSearchStatus('process-123');
```

### useSearchProgress
Convenience hook that combines search status with progress calculations.

```typescript
const { 
  status, 
  progress, 
  totalFound, 
  progressPercentage, 
  isSearching, 
  isCompleted, 
  isFailed 
} = useSearchProgress('process-123');
```

### useSearchByName / useSearchByEmail
Mutation hooks for manual searches.

```typescript
const searchByName = useSearchByName();
const searchByEmail = useSearchByEmail();

const nameResults = await searchByName.mutateAsync({
  processId: 'process-123',
  name: 'John Smith'
});

const emailResults = await searchByEmail.mutateAsync({
  processId: 'process-123',
  email: 'researcher@university.edu'
});
```

## Service

### SearchService
The backend service class that handles all search-related API calls.

**Methods:**
- `initiateSearch(processId, request)` - Start a database search
- `getSearchStatus(processId)` - Get current search status
- `searchByName(processId, name)` - Manual search by name
- `searchByEmail(processId, email)` - Manual search by email

## Usage Examples

### Basic Search
```typescript
import { ReviewerSearch } from '@/components/search/ReviewerSearch';

const MyComponent = () => {
  const [keywords, setKeywords] = useState(['AI', 'machine learning']);
  
  return (
    <ReviewerSearch
      processId="process-123"
      primaryKeywords={keywords}
      secondaryKeywords={[]}
      onKeywordsChange={(primary, secondary) => {
        setKeywords(primary);
      }}
      onSearchComplete={() => {
        // Navigate to next step
      }}
    />
  );
};
```

### Progress Monitoring
```typescript
import { SearchProgress } from '@/components/search/SearchProgress';

const ProgressPage = () => {
  return (
    <SearchProgress
      processId="process-123"
      onComplete={() => {
        console.log('Search completed!');
      }}
    />
  );
};
```

### Manual Search
```typescript
import { ManualSearch } from '@/components/search/ManualSearch';

const ManualSearchPage = () => {
  return (
    <ManualSearch
      processId="process-123"
      onSearchComplete={(results) => {
        console.log(`Found ${results.length} reviewers`);
      }}
    />
  );
};
```

## API Integration

The search components integrate with the following backend endpoints:

- `POST /api/processes/:id/search` - Initiate database search
- `GET /api/processes/:id/search/status` - Get search status
- `POST /api/processes/:id/search/manual/name` - Manual search by name
- `POST /api/processes/:id/search/manual/email` - Manual search by email

## Error Handling

All search components include comprehensive error handling:

- Network errors with retry suggestions
- Validation errors with specific field feedback
- Rate limiting with wait time information
- Server errors with support contact information

## Testing

Test files are available for all search functionality:

- `src/services/__tests__/searchService.test.ts` - Service layer tests
- `src/hooks/__tests__/useSearch.test.ts` - Hook tests

## Performance Considerations

- Search status polling is optimized to only poll during active searches
- Manual search results are cached for 5 minutes
- Progress updates use efficient polling intervals (5 seconds during search)
- Large result sets are handled with pagination

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **5.1**: Database search initiation with keyword and database selection
- **5.2**: Real-time search progress tracking with database-specific status
- **5.3**: Search completion handling with result counts
- **5.4**: Manual reviewer search by name and email with error handling