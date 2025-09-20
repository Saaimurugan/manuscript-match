# React Query Hooks

This directory contains custom React Query hooks for the ScholarFinder application. These hooks provide a clean, type-safe interface for interacting with the backend API while handling caching, error handling, and loading states automatically.

## Overview

The React Query setup includes:

- **Centralized Configuration**: Optimized QueryClient with appropriate caching and retry strategies
- **Custom Hooks**: Type-safe hooks for all major API endpoints
- **Error Handling**: Centralized error handling with user-friendly messages
- **Loading States**: Comprehensive loading state management
- **Cache Management**: Intelligent cache invalidation and optimistic updates
- **Optimistic Updates**: Immediate UI updates with automatic rollback on errors

## Architecture

```
src/hooks/
├── index.ts                 # Centralized exports
├── useAuth.ts              # Authentication hooks
├── useProcesses.ts         # Process management hooks
├── useFiles.ts             # File upload and metadata hooks
├── useKeywords.ts          # Keyword enhancement hooks
├── useSearch.ts            # Database search hooks
├── useValidation.ts        # Author validation hooks
├── useRecommendations.ts   # Reviewer recommendation hooks
├── useShortlists.ts        # Shortlist management hooks
├── useActivityLogs.ts      # Activity logging hooks
├── useAdmin.ts             # Admin functionality hooks
├── useErrorHandling.ts     # Error handling utilities
└── useLoadingStates.ts     # Loading state utilities
```

## Key Features

### 1. Automatic Caching

All hooks implement intelligent caching strategies:

```typescript
// Data is cached for 5 minutes, kept in memory for 10 minutes
const { data: processes } = useProcesses();

// Process details are cached longer (15 minutes)
const { data: process } = useProcess(processId);
```

### 2. Error Handling

Centralized error handling with user-friendly messages:

```typescript
const { handleError, handleSuccess } = useApiErrorHandler();

try {
  await createProcessMutation.mutateAsync(data);
  handleSuccess('Process created successfully!');
} catch (error) {
  handleError(error, 'Failed to create process');
}
```

### 3. Loading States

Comprehensive loading state management:

```typescript
const {
  isAnyLoading,
  loadingSteps,
  progressPercentage,
} = useProcessWorkflowLoading(
  processLoading,
  metadataLoading,
  keywordsLoading,
  searchLoading,
  validationLoading,
  recommendationsLoading
);
```

### 4. Optimistic Updates

Immediate UI updates with automatic rollback:

```typescript
const { updateProcessOptimistically, revertOptimisticUpdate } = useOptimisticProcessUpdate();

// Update UI immediately
updateProcessOptimistically(processId, { status: 'IN_PROGRESS' });

// Revert if API call fails
if (error) {
  revertOptimisticUpdate(processId);
}
```

### 5. Real-time Updates

Automatic polling for real-time data:

```typescript
// Polls every 5 seconds while search is in progress
const { status, progress } = useSearchStatus(processId);
```

## Usage Examples

### Basic Query

```typescript
import { useProcesses } from '@/hooks';

const ProcessList = () => {
  const { data: processes, isLoading, error } = useProcesses();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {processes?.map(process => (
        <div key={process.id}>{process.title}</div>
      ))}
    </div>
  );
};
```

### Mutation with Error Handling

```typescript
import { useCreateProcess, useApiErrorHandler } from '@/hooks';

const CreateProcessForm = () => {
  const createProcess = useCreateProcess();
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  const handleSubmit = async (data) => {
    try {
      await createProcess.mutateAsync(data);
      handleSuccess('Process created successfully!');
    } catch (error) {
      handleError(error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createProcess.isPending}>
        {createProcess.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
};
```

### Pagination

```typescript
import { useRecommendations } from '@/hooks';

const RecommendationsList = ({ processId }) => {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useRecommendations(processId, {
    page,
    limit: 20,
    sort: { field: 'matchScore', direction: 'desc' }
  });
  
  return (
    <div>
      {data?.data.map(reviewer => (
        <div key={reviewer.id}>{reviewer.name}</div>
      ))}
      
      <Pagination
        currentPage={page}
        totalPages={data?.pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};
```

### File Upload with Progress

```typescript
import { useFileUpload } from '@/hooks';

const FileUploader = ({ processId }) => {
  const [progress, setProgress] = useState(0);
  const uploadFile = useFileUpload();
  
  const handleUpload = async (file) => {
    await uploadFile.mutateAsync({
      processId,
      file,
      onProgress: setProgress
    });
  };
  
  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {uploadFile.isPending && (
        <Progress value={progress} />
      )}
    </div>
  );
};
```

## Cache Management

### Query Keys

All hooks use consistent query keys for cache management:

```typescript
// Defined in src/lib/queryClient.ts
export const queryKeys = {
  processes: {
    all: () => ['processes'],
    detail: (id: string) => ['processes', 'detail', id],
  },
  metadata: {
    detail: (processId: string) => ['metadata', processId, 'detail'],
  },
  // ... more query keys
};
```

### Cache Invalidation

Automatic cache invalidation on mutations:

```typescript
// When a process is updated, related caches are invalidated
onSuccess: (updatedProcess) => {
  queryClient.setQueryData(queryKeys.processes.detail(processId), updatedProcess);
  queryClient.invalidateQueries({ queryKey: queryKeys.processes.list() });
}
```

### Cache Utilities

Helper functions for cache management:

```typescript
import { cacheUtils } from '@/lib/queryClient';

// Invalidate all process-related data
cacheUtils.invalidateProcess(queryClient, processId);

// Clear all cache
cacheUtils.clearAll(queryClient);
```

## Error Handling

### Error Types

The system handles different types of errors:

- **Network Errors**: Connection issues, timeouts
- **Authentication Errors**: Invalid tokens, expired sessions
- **Validation Errors**: Invalid input data
- **Rate Limiting Errors**: Too many requests
- **Server Errors**: Internal server errors

### Retry Logic

Intelligent retry strategies:

```typescript
retry: (failureCount, error) => {
  // Don't retry authentication errors
  if (error?.type === 'AUTHENTICATION_ERROR') return false;
  
  // Retry network errors up to 3 times
  if (error?.type === 'NETWORK_ERROR') return failureCount < 3;
  
  return false;
}
```

## Performance Optimizations

### Stale-While-Revalidate

Data is served from cache while being updated in the background:

```typescript
staleTime: 5 * 60 * 1000, // Serve from cache for 5 minutes
gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
```

### Prefetching

Prefetch data before it's needed:

```typescript
const { prefetchFiltered } = useFilteredRecommendations(processId, filters);

// Prefetch next page
useEffect(() => {
  if (nextPageFilters) {
    prefetchFiltered(nextPageFilters);
  }
}, [nextPageFilters, prefetchFiltered]);
```

### Background Updates

Automatic background updates:

```typescript
refetchOnWindowFocus: false,  // Don't refetch on focus
refetchOnReconnect: true,     // Refetch on reconnect
```

## Development Tools

React Query DevTools are enabled in development mode:

```typescript
// In App.tsx
{config.enableDevTools && <ReactQueryDevtools initialIsOpen={false} />}
```

## Best Practices

1. **Use Specific Query Keys**: Include all relevant parameters in query keys
2. **Handle Loading States**: Always handle loading and error states
3. **Implement Optimistic Updates**: For better user experience
4. **Cache Invalidation**: Invalidate related caches on mutations
5. **Error Boundaries**: Use error boundaries for graceful error handling
6. **Type Safety**: Use TypeScript interfaces for all data structures

## Testing

Mock React Query hooks in tests:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);
```

## Migration from Mock Data

When migrating from mock data:

1. Replace mock service calls with React Query hooks
2. Remove local state management for server data
3. Update loading states to use React Query loading states
4. Replace manual error handling with centralized error handling
5. Remove manual cache management

## Troubleshooting

### Common Issues

1. **Stale Data**: Check staleTime and gcTime settings
2. **Infinite Loops**: Ensure query keys are stable
3. **Memory Leaks**: Use proper cleanup in useEffect
4. **Authentication Issues**: Check token refresh logic
5. **Cache Issues**: Use React Query DevTools to inspect cache

### Debug Mode

Enable debug logging:

```typescript
// In development
if (config.enableDevTools) {
  console.log('[React Query]', queryKey, data);
}
```