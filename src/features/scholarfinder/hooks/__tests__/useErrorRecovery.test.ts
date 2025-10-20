/**
 * Tests for error recovery hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useErrorRecovery, useNetworkStatus, useRetryableOperation } from '../useErrorRecovery';
import { ScholarFinderError, ScholarFinderErrorType } from '../../services/ScholarFinderApiService';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the config
vi.mock('../../../lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 30000,
    enableDebugLogging: false,
  },
}));

// Mock the API service
vi.mock('../../../services/apiService', () => ({
  ApiService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  })),
}));

// Mock the ScholarFinder API service
vi.mock('../../services/ScholarFinderApiService', () => ({
  ScholarFinderErrorType: {
    UPLOAD_ERROR: 'UPLOAD_ERROR',
    FILE_FORMAT_ERROR: 'FILE_FORMAT_ERROR',
    METADATA_ERROR: 'METADATA_ERROR',
    KEYWORD_ERROR: 'KEYWORD_ERROR',
    SEARCH_ERROR: 'SEARCH_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  },
  ScholarFinderApiService: vi.fn(),
  scholarFinderApiService: {},
}));

// Mock the error handling utilities
vi.mock('../../utils/errorHandling', () => ({
  createUserFriendlyErrorDisplay: vi.fn((error) => ({
    title: `Error: ${error.type}`,
    message: error.message,
    suggestions: ['Try again', 'Check connection'],
    canRetry: error.retryable,
    retryDelay: error.retryAfter,
    severity: 'medium',
  })),
  isRetryableError: vi.fn((error) => error.retryable),
  getRetryDelay: vi.fn((error) => error.retryAfter || 5000),
  createRetryHelper: vi.fn((maxRetries) => 
    vi.fn(async (operation, shouldRetry) => {
      let attempts = 0;
      while (attempts <= maxRetries) {
        try {
          return await operation();
        } catch (error) {
          attempts++;
          if (attempts > maxRetries || !shouldRetry(error)) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    })
  ),
  checkNetworkStatus: vi.fn(() => true),
}));

describe('useErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty error state', () => {
    const { result } = renderHook(() => useErrorRecovery());
    const [state] = result.current;

    expect(state.error).toBeNull();
    expect(state.isRetrying).toBe(false);
    expect(state.retryCount).toBe(0);
    expect(state.userDisplay).toBeNull();
  });

  it('handles error reporting', () => {
    const { result } = renderHook(() => useErrorRecovery());
    const [, actions] = result.current;

    const testError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
      retryAfter: 5000,
    };

    act(() => {
      actions.handleError(testError, 'Test context');
    });

    const [state] = result.current;
    expect(state.error).toEqual(testError);
    expect(state.userDisplay).toBeTruthy();
    expect(state.userDisplay?.title).toBe('Error: UPLOAD_ERROR');
  });

  it('clears errors', () => {
    const { result } = renderHook(() => useErrorRecovery());
    const [, actions] = result.current;

    const testError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
    };

    act(() => {
      actions.handleError(testError);
    });

    act(() => {
      actions.clearError();
    });

    const [state] = result.current;
    expect(state.error).toBeNull();
    expect(state.userDisplay).toBeNull();
  });

  it('handles manual retry', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useErrorRecovery({ onRetry }));
    const [, actions] = result.current;

    const testError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
    };

    act(() => {
      actions.handleError(testError);
    });

    await act(async () => {
      await actions.retry();
    });

    expect(onRetry).toHaveBeenCalled();
    
    const [state] = result.current;
    expect(state.error).toBeNull();
  });

  it('handles retry failure', async () => {
    const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
    const { result } = renderHook(() => useErrorRecovery({ onRetry, maxRetries: 2 }));
    const [, actions] = result.current;

    const testError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
    };

    act(() => {
      actions.handleError(testError);
    });

    await act(async () => {
      await actions.retry();
    });

    const [state] = result.current;
    expect(state.retryCount).toBe(1);
    expect(state.error).toEqual(testError);
  });

  it('respects max retries', async () => {
    const onRetry = vi.fn().mockRejectedValue(new Error('Always fails'));
    const onMaxRetriesReached = vi.fn();
    
    const { result } = renderHook(() => 
      useErrorRecovery({ 
        onRetry, 
        maxRetries: 2, 
        onMaxRetriesReached 
      })
    );
    const [, actions] = result.current;

    const testError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
    };

    act(() => {
      actions.handleError(testError);
    });

    // First retry
    await act(async () => {
      await actions.retry();
    });

    // Second retry
    await act(async () => {
      await actions.retry();
    });

    // Third retry should trigger max retries reached
    await act(async () => {
      await actions.retry();
    });

    expect(onMaxRetriesReached).toHaveBeenCalledWith(testError);
  });

  it('handles auto-retry', () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useErrorRecovery({ onRetry, autoRetry: true })
    );
    const [, actions] = result.current;

    const testError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
      retryAfter: 1000,
    };

    act(() => {
      actions.handleError(testError);
    });

    const [state] = result.current;
    expect(state.nextRetryIn).toBeGreaterThan(0);

    // Fast-forward time to trigger auto-retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRetry).toHaveBeenCalled();
  });

  it('updates max retries setting', () => {
    const { result } = renderHook(() => useErrorRecovery());
    const [, actions] = result.current;

    act(() => {
      actions.setMaxRetries(5);
    });

    const [state] = result.current;
    expect(state.maxRetries).toBe(5);
  });

  it('determines retry capability correctly', () => {
    const { result } = renderHook(() => useErrorRecovery());
    const [, actions] = result.current;

    // Non-retryable error
    const nonRetryableError: ScholarFinderError = {
      type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
      message: 'Invalid format',
      retryable: false,
    };

    act(() => {
      actions.handleError(nonRetryableError);
    });

    expect(actions.canRetry).toBe(false);

    // Retryable error
    const retryableError: ScholarFinderError = {
      type: ScholarFinderErrorType.UPLOAD_ERROR,
      message: 'Upload failed',
      retryable: true,
    };

    act(() => {
      actions.handleError(retryableError);
    });

    expect(actions.canRetry).toBe(true);
  });
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('detects initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('handles going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('handles coming back online', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.wasOffline).toBe(true);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });
});

describe('useRetryableOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes operation successfully', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const onSuccess = vi.fn();

    const { result } = renderHook(() => 
      useRetryableOperation(operation, { onSuccess })
    );

    await act(async () => {
      const result_value = await result.current.execute();
      expect(result_value).toBe('success');
    });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('success');
    expect(result.current.error).toBeNull();
  });

  it('handles operation failure', async () => {
    const error = new Error('Operation failed');
    const operation = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() => 
      useRetryableOperation(operation, { onError })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (e) {
        expect(e).toBe(error);
      }
    });

    expect(onError).toHaveBeenCalledWith(error);
    expect(result.current.error).toBe(error);
  });

  it('retries failed operations', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useRetryableOperation(operation, { maxRetries: 3 })
    );

    await act(async () => {
      const result_value = await result.current.execute();
      expect(result_value).toBe('success');
    });

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('respects shouldRetry condition', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Non-retryable'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => 
      useRetryableOperation(operation, { shouldRetry })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (e) {
        expect(e.message).toBe('Non-retryable');
      }
    });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
  });

  it('tracks loading state', async () => {
    const operation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('success'), 100))
    );

    const { result } = renderHook(() => useRetryableOperation(operation));

    expect(result.current.isLoading).toBe(false);

    const executePromise = act(async () => {
      return result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    await executePromise;

    expect(result.current.isLoading).toBe(false);
  });
});