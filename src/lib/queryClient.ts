/**
 * React Query client configuration with caching and retry strategies
 * Provides optimized settings for server state management
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { ErrorHandler } from '../services/apiService';
import { EnhancedErrorHandler, type EnhancedError } from './errorHandler';
import type { UserFriendlyError } from '../types/api';

/**
 * Default query options with appropriate caching and retry strategies
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Cache data for 5 minutes by default
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Enhanced retry logic using error handler
    retry: (failureCount, error: any) => {
      const enhancedError = EnhancedErrorHandler.handle(error, {
        component: 'ReactQuery',
        action: 'query_retry',
      });
      
      return enhancedError.canRetry && failureCount < (enhancedError.maxRetries || 3);
    },
    retryDelay: (attemptIndex, error) => {
      const enhancedError = EnhancedErrorHandler.handle(error, {
        component: 'ReactQuery',
        action: 'query_retry_delay',
      });
      
      // Use retry-after header for rate limit errors
      if (enhancedError.type === 'RATE_LIMIT_ERROR' && enhancedError.retryAfter) {
        return enhancedError.retryAfter * 1000;
      }
      
      // Exponential backoff with jitter based on error severity
      const baseDelay = enhancedError.severity === 'critical' ? 2000 : 1000;
      const maxDelay = enhancedError.severity === 'critical' ? 60000 : 30000;
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
      
      // Add jitter (±25%)
      const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
      
      return Math.max(exponentialDelay + jitter, baseDelay);
    },
    // Refetch on window focus for critical data
    refetchOnWindowFocus: false,
    // Refetch on reconnect
    refetchOnReconnect: true,
    // Error handling
    throwOnError: false,
  },
  mutations: {
    // Enhanced retry logic for mutations
    retry: (failureCount, error: any) => {
      const enhancedError = EnhancedErrorHandler.handle(error, {
        component: 'ReactQuery',
        action: 'mutation_retry',
      });
      
      // Only retry network and server errors for mutations
      if (enhancedError.type === 'NETWORK_ERROR' || enhancedError.type === 'SERVER_ERROR') {
        return failureCount < 1; // Only retry once for mutations
      }
      
      return false;
    },
    retryDelay: (attemptIndex, error) => {
      const enhancedError = EnhancedErrorHandler.handle(error, {
        component: 'ReactQuery',
        action: 'mutation_retry_delay',
      });
      
      // Use retry-after header for rate limit errors
      if (enhancedError.type === 'RATE_LIMIT_ERROR' && enhancedError.retryAfter) {
        return enhancedError.retryAfter * 1000;
      }
      
      return 2000; // 2 second delay for mutations
    },
    // Throw errors for mutations to handle in components
    throwOnError: true,
  },
};

/**
 * Create and configure React Query client
 */
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
    queryCache: undefined, // Use default query cache
    mutationCache: undefined, // Use default mutation cache
  });
};

/**
 * Query key factories for consistent cache management
 */
export const queryKeys = {
  // Authentication
  auth: {
    profile: () => ['auth', 'profile'] as const,
    verify: () => ['auth', 'verify'] as const,
  },
  
  // Processes
  processes: {
    all: () => ['processes'] as const,
    lists: () => [...queryKeys.processes.all(), 'list'] as const,
    list: (filters?: any) => [...queryKeys.processes.lists(), filters] as const,
    details: () => [...queryKeys.processes.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.processes.details(), id] as const,
  },
  
  // Metadata
  metadata: {
    all: (processId: string) => ['metadata', processId] as const,
    detail: (processId: string) => [...queryKeys.metadata.all(processId), 'detail'] as const,
  },
  
  // Keywords
  keywords: {
    all: (processId: string) => ['keywords', processId] as const,
    enhanced: (processId: string) => [...queryKeys.keywords.all(processId), 'enhanced'] as const,
    selection: (processId: string) => [...queryKeys.keywords.all(processId), 'selection'] as const,
  },
  
  // Search
  search: {
    all: (processId: string) => ['search', processId] as const,
    status: (processId: string) => [...queryKeys.search.all(processId), 'status'] as const,
    manual: {
      name: (processId: string, name: string) => [...queryKeys.search.all(processId), 'manual', 'name', name] as const,
      email: (processId: string, email: string) => [...queryKeys.search.all(processId), 'manual', 'email', email] as const,
    },
  },
  
  // Validation
  validation: {
    all: (processId: string) => ['validation', processId] as const,
    results: (processId: string) => [...queryKeys.validation.all(processId), 'results'] as const,
  },
  
  // Recommendations
  recommendations: {
    all: (processId: string) => ['recommendations', processId] as const,
    list: (processId: string, filters?: any) => [...queryKeys.recommendations.all(processId), 'list', filters] as const,
  },
  
  // Shortlists
  shortlists: {
    all: (processId: string) => ['shortlists', processId] as const,
    lists: (processId: string) => [...queryKeys.shortlists.all(processId), 'list'] as const,
    detail: (processId: string, shortlistId: string) => [...queryKeys.shortlists.all(processId), 'detail', shortlistId] as const,
  },
  
  // Activity logs
  activityLogs: {
    all: () => ['activityLogs'] as const,
    lists: () => [...queryKeys.activityLogs.all(), 'list'] as const,
    list: (filters?: any) => [...queryKeys.activityLogs.lists(), filters] as const,
  },
  
  // Admin
  admin: {
    all: () => ['admin'] as const,
    stats: () => [...queryKeys.admin.all(), 'stats'] as const,
    processes: () => [...queryKeys.admin.all(), 'processes'] as const,
    logs: () => [...queryKeys.admin.all(), 'logs'] as const,
  },
} as const;

/**
 * Cache invalidation utilities
 */
export const cacheUtils = {
  // Invalidate all process-related data
  invalidateProcess: (queryClient: QueryClient, processId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.metadata.all(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.search.all(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.validation.all(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all(processId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.shortlists.all(processId) });
  },
  
  // Invalidate all processes list
  invalidateProcessesList: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.processes.lists() });
  },
  
  // Invalidate authentication data
  invalidateAuth: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.verify() });
  },
  
  // Clear all cache
  clearAll: (queryClient: QueryClient) => {
    queryClient.clear();
  },
  
  // Remove specific process data from cache
  removeProcess: (queryClient: QueryClient, processId: string) => {
    queryClient.removeQueries({ queryKey: queryKeys.processes.detail(processId) });
    queryClient.removeQueries({ queryKey: queryKeys.metadata.all(processId) });
    queryClient.removeQueries({ queryKey: queryKeys.keywords.all(processId) });
    queryClient.removeQueries({ queryKey: queryKeys.search.all(processId) });
    queryClient.removeQueries({ queryKey: queryKeys.validation.all(processId) });
    queryClient.removeQueries({ queryKey: queryKeys.recommendations.all(processId) });
    queryClient.removeQueries({ queryKey: queryKeys.shortlists.all(processId) });
  },
};

/**
 * Enhanced error handling for React Query
 */
export const handleQueryError = (error: any, context?: any): EnhancedError => {
  return EnhancedErrorHandler.handle(error, {
    component: 'ReactQuery',
    action: 'query_error',
    ...context,
  });
};

/**
 * Enhanced error handling for React Query mutations
 */
export const handleMutationError = (error: any, context?: any): EnhancedError => {
  return EnhancedErrorHandler.handle(error, {
    component: 'ReactQuery',
    action: 'mutation_error',
    ...context,
  });
};

/**
 * Default query client instance
 */
export const queryClient = createQueryClient();