/**
 * useDebounce Hook
 * Custom hook for debouncing values to reduce API calls and improve performance
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounces a value by delaying updates until after the specified delay
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounces a callback function
 * @param callback - The callback function to debounce
 * @param delay - The delay in milliseconds
 * @param deps - Dependencies array for the callback
 * @returns The debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Advanced debounce hook with immediate execution option and cancel functionality
 */
export function useAdvancedDebounce<T>(
  value: T,
  delay: number,
  options: {
    leading?: boolean; // Execute immediately on first call
    trailing?: boolean; // Execute after delay (default behavior)
    maxWait?: number; // Maximum time to wait before forcing execution
  } = {}
) {
  const { leading = false, trailing = true, maxWait } = options;
  
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  const invokeFunc = useCallback(() => {
    setDebouncedValue(value);
    lastInvokeTimeRef.current = Date.now();
  }, [value]);

  const leadingEdge = useCallback(() => {
    lastInvokeTimeRef.current = Date.now();
    if (leading) {
      invokeFunc();
    }
  }, [leading, invokeFunc]);

  const trailingEdge = useCallback(() => {
    if (trailing && lastCallTimeRef.current > lastInvokeTimeRef.current) {
      invokeFunc();
    }
  }, [trailing, invokeFunc]);

  const timerExpired = useCallback(() => {
    const timeSinceLastCall = Date.now() - lastCallTimeRef.current;
    
    if (timeSinceLastCall < delay) {
      // Not enough time has passed, reschedule
      timeoutRef.current = setTimeout(timerExpired, delay - timeSinceLastCall);
    } else {
      trailingEdge();
    }
  }, [delay, trailingEdge]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    lastCallTimeRef.current = 0;
    lastInvokeTimeRef.current = 0;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      trailingEdge();
      cancel();
    }
  }, [trailingEdge, cancel]);

  useEffect(() => {
    lastCallTimeRef.current = Date.now();
    
    const timeSinceLastInvoke = lastCallTimeRef.current - lastInvokeTimeRef.current;
    
    if (lastInvokeTimeRef.current === 0) {
      // First call
      leadingEdge();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(timerExpired, delay);
    
    // Handle maxWait
    if (maxWait && !maxTimeoutRef.current && timeSinceLastInvoke >= maxWait) {
      invokeFunc();
    } else if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        invokeFunc();
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
          maxTimeoutRef.current = undefined;
        }
      }, maxWait - timeSinceLastInvoke);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, maxWait, leadingEdge, timerExpired, invokeFunc]);

  return {
    debouncedValue,
    cancel,
    flush,
    isPending: () => !!timeoutRef.current
  };
}