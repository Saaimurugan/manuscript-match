/**
 * Example usage of the comprehensive error handling system
 * Demonstrates various error handling patterns and components
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ErrorBoundary,
  ErrorFallback,
  InlineError,
  RetryButton,
  useApiErrorHandler,
  useComponentErrorHandler,
  useErrorToast,
  useAsyncErrorHandler,
  useFormErrorHandler,
} from '@/components/error';

// Mock API functions for demonstration
const mockApiCall = async (shouldFail: boolean = false): Promise<{ message: string }> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (shouldFail) {
    const error = new Error('API call failed');
    (error as any).response = {
      status: 500,
      data: { message: 'Internal server error' }
    };
    throw error;
  }
  
  return { message: 'API call successful' };
};

const mockNetworkError = async (): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  throw new Error('Network connection failed');
};

const mockValidationError = async (): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const error = new Error('Validation failed');
  (error as any).response = {
    status: 400,
    data: { 
      message: 'Validation error',
      details: {
        email: ['Email is required', 'Email must be valid'],
        password: ['Password must be at least 8 characters']
      }
    }
  };
  throw error;
};

// Component that throws an error for testing error boundaries
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Component error for testing error boundary');
  }
  return <div className="p-4 bg-green-100 rounded">Component rendered successfully!</div>;
};

// Example component using error handling hooks
const ApiCallExample: React.FC = () => {
  const [shouldFail, setShouldFail] = useState(false);
  const { handleError, handleSuccess } = useComponentErrorHandler('ApiCallExample');
  const { executeWithErrorHandling } = useAsyncErrorHandler();
  
  const handleApiCall = async () => {
    const result = await executeWithErrorHandling(
      () => mockApiCall(shouldFail),
      {
        component: 'ApiCallExample',
        action: 'api_call',
      },
      'Failed to make API call'
    );
    
    if (result) {
      handleSuccess(result.message, 'api_call');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Call with Error Handling</CardTitle>
        <CardDescription>
          Demonstrates async error handling with custom context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="shouldFail"
            checked={shouldFail}
            onChange={(e) => setShouldFail(e.target.checked)}
          />
          <Label htmlFor="shouldFail">Simulate API failure</Label>
        </div>
        <Button onClick={handleApiCall}>
          Make API Call
        </Button>
      </CardContent>
    </Card>
  );
};

// Example component using React Query with error handling
const QueryExample: React.FC = () => {
  const [shouldFail, setShouldFail] = useState(false);
  const { handleError } = useApiErrorHandler();
  
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['example', shouldFail],
    queryFn: () => mockApiCall(shouldFail),
    onError: (error) => handleError(error, undefined, {
      component: 'QueryExample',
      action: 'query',
    }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>React Query with Error Handling</CardTitle>
        <CardDescription>
          Demonstrates query error handling with retry functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="queryFail"
            checked={shouldFail}
            onChange={(e) => setShouldFail(e.target.checked)}
          />
          <Label htmlFor="queryFail">Simulate query failure</Label>
        </div>
        
        {isLoading && <div>Loading...</div>}
        
        {data && (
          <div className="p-4 bg-green-100 rounded">
            Success: {data.message}
          </div>
        )}
        
        {error && (
          <InlineError 
            error={error} 
            onRetry={() => refetch()}
            onDismiss={() => {/* Handle dismiss */}}
          />
        )}
        
        <Button onClick={() => refetch()} disabled={isLoading}>
          Refetch Data
        </Button>
      </CardContent>
    </Card>
  );
};

// Example component using mutation with error handling
const MutationExample: React.FC = () => {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useComponentErrorHandler('MutationExample');
  
  const mutation = useMutation({
    mutationFn: mockNetworkError,
    onSuccess: () => {
      handleSuccess('Mutation completed successfully', 'mutation');
      queryClient.invalidateQueries({ queryKey: ['example'] });
    },
    onError: (error) => {
      handleError(error, 'mutation', 'Failed to complete mutation');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mutation with Error Handling</CardTitle>
        <CardDescription>
          Demonstrates mutation error handling with retry button
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Processing...' : 'Execute Mutation'}
        </Button>
        
        {mutation.error && (
          <div className="space-y-2">
            <InlineError error={mutation.error} />
            <RetryButton
              onRetry={() => mutation.mutate()}
              error={mutation.error}
              maxRetries={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Example component using form validation error handling
const FormExample: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { handleValidationErrors, handleFieldError } = useFormErrorHandler();
  const { showErrorToast, showSuccessToast } = useErrorToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await mockValidationError();
      showSuccessToast('Form submitted successfully');
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.details) {
        handleValidationErrors(error.response.data.details);
      } else {
        showErrorToast(error, {
          title: 'Form Submission Failed',
          showRetryButton: true,
          onRetry: () => handleSubmit(e),
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form with Validation Error Handling</CardTitle>
        <CardDescription>
          Demonstrates form validation error handling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <Button type="submit">Submit Form</Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Example component using error boundary
const ErrorBoundaryExample: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Boundary Example</CardTitle>
        <CardDescription>
          Demonstrates error boundary with fallback UI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="throwError"
            checked={shouldThrow}
            onChange={(e) => setShouldThrow(e.target.checked)}
          />
          <Label htmlFor="throwError">Throw component error</Label>
        </div>
        
        <ErrorBoundary
          fallback={
            <ErrorFallback 
              onRetry={() => setShouldThrow(false)}
              showRetryButton={true}
              showHomeButton={false}
            />
          }
        >
          <ErrorThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
};

// Main example component
export const ErrorHandlingUsageExample: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Handling System Examples</h1>
        <p className="text-gray-600">
          Comprehensive examples of error handling patterns and components
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ApiCallExample />
        <QueryExample />
        <MutationExample />
        <FormExample />
      </div>
      
      <ErrorBoundaryExample />
      
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Automatic error classification by severity and type</li>
            <li>Intelligent retry logic with exponential backoff</li>
            <li>Context-aware error tracking and logging</li>
            <li>User-friendly error messages and fallback UI</li>
            <li>Toast notifications with action buttons</li>
            <li>Error boundaries for graceful error recovery</li>
            <li>Form validation error handling</li>
            <li>Network status monitoring</li>
            <li>Global error handling for unhandled errors</li>
            <li>Integration with React Query for server state</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorHandlingUsageExample;