# ScholarFinder Context

The ScholarFinder Context provides centralized state management for the ScholarFinder workflow, integrating with the existing authentication system and providing user-specific data management.

## Overview

The context manages:
- Current process and step navigation
- User's process list
- Shortlist management
- UI state (loading, errors)
- Authentication integration
- Workflow progress tracking

## Usage

### Basic Setup

Wrap your ScholarFinder components with the provider:

```tsx
import { ScholarFinderProvider } from './contexts/ScholarFinderContext';

function App() {
  return (
    <ScholarFinderProvider>
      <YourScholarFinderComponents />
    </ScholarFinderProvider>
  );
}
```

### Using Context Hooks

The context provides several specialized hooks for different aspects of the workflow:

#### 1. Current Process Management

```tsx
import { useCurrentProcess } from '../hooks/useScholarFinderContext';

function ProcessInfo() {
  const { 
    process, 
    hasProcess, 
    title, 
    status, 
    setProcess, 
    switchToProcess 
  } = useCurrentProcess();

  if (!hasProcess) {
    return <div>No active process</div>;
  }

  return (
    <div>
      <h2>{title}</h2>
      <p>Status: {status}</p>
    </div>
  );
}
```

#### 2. Workflow Navigation

```tsx
import { useWorkflowNavigation } from '../hooks/useScholarFinderContext';

function StepNavigation() {
  const { 
    currentStep, 
    setCurrentStep, 
    canProceedToNextStep,
    getStepProgress,
    canGoToStep 
  } = useWorkflowNavigation();

  const progress = getStepProgress();

  return (
    <div>
      <p>Current Step: {currentStep}</p>
      <p>Progress: {progress.percentage}%</p>
      <button 
        disabled={!canProceedToNextStep}
        onClick={() => {/* navigate to next step */}}
      >
        Next Step
      </button>
    </div>
  );
}
```

#### 3. Shortlist Management

```tsx
import { useShortlistManagement } from '../hooks/useScholarFinderContext';

function ReviewerShortlist() {
  const { 
    shortlist, 
    addToShortlist, 
    removeFromShortlist,
    isInShortlist,
    toggleReviewer,
    getShortlistStats 
  } = useShortlistManagement();

  const stats = getShortlistStats();

  return (
    <div>
      <h3>Shortlist ({stats.count} reviewers)</h3>
      {shortlist.map(reviewer => (
        <div key={reviewer.email}>
          {reviewer.reviewer}
          <button onClick={() => removeFromShortlist(reviewer.email)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### 4. UI State Management

```tsx
import { useScholarFinderUI } from '../hooks/useScholarFinderContext';

function UIStateHandler() {
  const { 
    isLoading, 
    error, 
    clearError, 
    showError,
    withLoading,
    isAuthenticated 
  } = useScholarFinderUI();

  const handleAsyncOperation = async () => {
    await withLoading(async () => {
      // Your async operation here
      await someApiCall();
    });
  };

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && (
        <div>
          Error: {error}
          <button onClick={clearError}>Clear</button>
        </div>
      )}
      <button onClick={handleAsyncOperation}>
        Perform Operation
      </button>
    </div>
  );
}
```

#### 5. Process List Management

```tsx
import { useUserProcesses } from '../hooks/useScholarFinderContext';

function ProcessList() {
  const { 
    processes, 
    processCount, 
    hasProcesses, 
    isLoading, 
    error 
  } = useUserProcesses();

  if (isLoading) return <div>Loading processes...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!hasProcesses) return <div>No processes found</div>;

  return (
    <div>
      <h3>Your Processes ({processCount})</h3>
      {processes.map(process => (
        <div key={process.id}>
          <h4>{process.title}</h4>
          <p>Status: {process.status}</p>
          <p>Step: {process.currentStep}</p>
        </div>
      ))}
    </div>
  );
}
```

## Context Integration Features

### Authentication Integration

The context automatically:
- Syncs with the authentication state
- Loads user processes when authenticated
- Clears state when user logs out
- Provides user ID for process operations

### Process Synchronization

The context:
- Automatically loads user's processes
- Syncs shortlist with process data
- Updates process list when processes change
- Handles process switching and state preservation

### Error Handling

The context provides:
- Centralized error state management
- Automatic error clearing on successful operations
- User-friendly error messages
- Error recovery mechanisms

### Loading States

The context manages:
- Global loading state for UI feedback
- Process-specific loading states
- Async operation loading with `withLoading` helper

## Advanced Usage

### Step Data Access

```tsx
import { useStepData } from '../hooks/useScholarFinderContext';
import { ProcessStep } from '../types/process';

function MetadataStep() {
  const metadataData = useStepData<MetadataStepData>(ProcessStep.METADATA);
  
  if (!metadataData) {
    return <div>No metadata available</div>;
  }

  return (
    <div>
      <h3>{metadataData.title}</h3>
      <p>Authors: {metadataData.authors.join(', ')}</p>
    </div>
  );
}
```

### Step Completion Tracking

```tsx
import { useStepCompletion } from '../hooks/useScholarFinderContext';

function ProgressIndicator() {
  const { 
    completedSteps, 
    isStepCompleted, 
    getCompletionStatus 
  } = useStepCompletion();

  const completionStatus = getCompletionStatus();

  return (
    <div>
      {Object.entries(completionStatus).map(([step, completed]) => (
        <div key={step} className={completed ? 'completed' : 'pending'}>
          {step}: {completed ? '✓' : '○'}
        </div>
      ))}
    </div>
  );
}
```

### Authentication-Aware Operations

```tsx
import { useAuthenticatedScholarFinder } from '../hooks/useScholarFinderContext';

function SecureComponent() {
  const { 
    isAuthenticated, 
    requireAuth, 
    canPerformOperations 
  } = useAuthenticatedScholarFinder();

  const secureOperation = requireAuth((data: any) => {
    // This operation will only run if user is authenticated
    return processData(data);
  });

  if (!canPerformOperations) {
    return <div>Authentication required</div>;
  }

  return (
    <button onClick={() => secureOperation(someData)}>
      Perform Secure Operation
    </button>
  );
}
```

## Best Practices

1. **Use Specific Hooks**: Use the specialized hooks (`useCurrentProcess`, `useWorkflowNavigation`, etc.) instead of the raw context for better type safety and cleaner code.

2. **Handle Loading States**: Always handle loading and error states in your components.

3. **Authentication Checks**: Use `isAuthenticated` to conditionally render components that require authentication.

4. **Error Boundaries**: Wrap ScholarFinder components in error boundaries to handle context errors gracefully.

5. **Process Validation**: Always check if a process exists before accessing process-specific data.

## Testing

The context is fully testable with mocked dependencies:

```tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScholarFinderProvider } from '../contexts/ScholarFinderContext';

// Mock the auth context and process hooks
vi.mock('../../../contexts/AuthContext');
vi.mock('../hooks/useProcessManagement');

const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ScholarFinderProvider>
        {children}
      </ScholarFinderProvider>
    </QueryClientProvider>
  );
};

// Your tests here
```

## Type Safety

All context hooks are fully typed with TypeScript, providing:
- Compile-time type checking
- IntelliSense support
- Runtime type validation where appropriate
- Clear interface definitions for all data structures

## Performance Considerations

The context is optimized for performance with:
- Memoized callbacks to prevent unnecessary re-renders
- Selective state updates to minimize component re-renders
- React Query integration for efficient data caching
- Conditional hook execution based on authentication state