/**
 * Performance Optimization Hooks
 * Custom hooks for performance monitoring and optimization
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce, throttle, performanceMonitor, memoryCache, localStorageCache } from '@/lib/performance';

// Hook for debounced values (useful for search inputs)
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

// Hook for throttled callbacks (useful for scroll events)
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = useRef(throttle(callback, delay));

  useEffect(() => {
    throttledCallback.current = throttle(callback, delay);
  }, [callback, delay]);

  return throttledCallback.current as T;
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const renderStartTime = useRef<number>();

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    }
  });
}

// Hook for memory cache
export function useMemoryCache<T>(key: string, ttl?: number) {
  const get = useCallback((): T | null => {
    return memoryCache.get(key);
  }, [key]);

  const set = useCallback((data: T, customTtl?: number) => {
    memoryCache.set(key, data, customTtl || ttl);
  }, [key, ttl]);

  const remove = useCallback(() => {
    memoryCache.delete(key);
  }, [key]);

  const has = useCallback((): boolean => {
    return memoryCache.has(key);
  }, [key]);

  return { get, set, remove, has };
}

// Hook for localStorage cache
export function useLocalStorageCache<T>(key: string, ttl?: number) {
  const get = useCallback((): T | null => {
    return localStorageCache.get(key);
  }, [key]);

  const set = useCallback((data: T, customTtl?: number) => {
    localStorageCache.set(key, data, customTtl || ttl);
  }, [key, ttl]);

  const remove = useCallback(() => {
    localStorageCache.delete(key);
  }, [key]);

  const has = useCallback((): boolean => {
    return localStorageCache.has(key);
  }, [key]);

  return { get, set, remove, has };
}

// Hook for optimized queries with caching
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: {
    staleTime?: number;
    cacheTime?: number;
    useMemoryCache?: boolean;
    useLocalStorageCache?: boolean;
    enabled?: boolean;
  }
) {
  const memCache = useMemoryCache<T>(queryKey.join('_'));
  const localCache = useLocalStorageCache<T>(queryKey.join('_'));

  const optimizedQueryFn = useCallback(async () => {
    // Check memory cache first
    if (options?.useMemoryCache) {
      const cached = memCache.get();
      if (cached) {
        return cached;
      }
    }

    // Check localStorage cache
    if (options?.useLocalStorageCache) {
      const cached = localCache.get();
      if (cached) {
        // Also store in memory cache for faster access
        if (options?.useMemoryCache) {
          memCache.set(cached);
        }
        return cached;
      }
    }

    // Fetch from API
    const data = await queryFn();

    // Cache the result
    if (options?.useMemoryCache) {
      memCache.set(data);
    }
    if (options?.useLocalStorageCache) {
      localCache.set(data);
    }

    return data;
  }, [queryFn, memCache, localCache, options]);

  return useQuery({
    queryKey,
    queryFn: optimizedQueryFn,
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options?.cacheTime || 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled,
  });
}

// Hook for prefetching data
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(
    <T>(queryKey: string[], queryFn: () => Promise<T>) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [queryClient]
  );

  return { prefetchQuery };
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return [ref, isIntersecting];
}

// Hook for virtual scrolling
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const itemCount = items.length;
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      itemCount
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(itemCount, visibleEnd + overscan);

    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    ...visibleRange,
    handleScroll,
  };
}

// Hook for performance monitoring
export function usePerformanceMonitor() {
  const trackApiCall = useCallback((endpoint: string, duration: number) => {
    performanceMonitor.trackApiCall(endpoint, duration);
  }, []);

  const trackComponentRender = useCallback((componentName: string, renderTime: number) => {
    performanceMonitor.trackComponentRender(componentName, renderTime);
  }, []);

  const getStats = useCallback((key: string) => {
    return performanceMonitor.getStats(key);
  }, []);

  const getAllStats = useCallback(() => {
    return performanceMonitor.getAllStats();
  }, []);

  return {
    trackApiCall,
    trackComponentRender,
    getStats,
    getAllStats,
  };
}

// Hook for image lazy loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  useEffect(() => {
    if (isIntersecting && src && !isLoaded && !isError) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setIsError(true);
      };
      
      img.src = src;
    }
  }, [isIntersecting, src, isLoaded, isError]);

  return {
    ref,
    src: imageSrc,
    isLoaded,
    isError,
    isIntersecting,
  };
}

// Hook for batch operations
export function useBatchOperations<T>(
  batchSize: number = 10,
  delay: number = 100
) {
  const [queue, setQueue] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const addToQueue = useCallback((items: T | T[]) => {
    const itemsArray = Array.isArray(items) ? items : [items];
    setQueue(prev => [...prev, ...itemsArray]);
  }, []);

  const processBatch = useCallback(async (
    processor: (batch: T[]) => Promise<void>
  ) => {
    if (processingRef.current || queue.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      while (queue.length > 0) {
        const batch = queue.splice(0, batchSize);
        await processor(batch);
        
        // Small delay between batches to prevent blocking
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setQueue([]);
    }
  }, [queue, batchSize, delay]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    queueSize: queue.length,
    isProcessing,
    addToQueue,
    processBatch,
    clearQueue,
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>(
  queryKey: string[],
  updateFn: (oldData: T | undefined, newData: Partial<T>) => T
) {
  const queryClient = useQueryClient();

  const optimisticUpdate = useCallback(
    async (newData: Partial<T>, mutationFn: () => Promise<T>) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<T>(queryKey, (old) => updateFn(old, newData));

      try {
        // Perform the actual mutation
        const result = await mutationFn();
        
        // Update with the real result
        queryClient.setQueryData<T>(queryKey, result);
        
        return result;
      } catch (error) {
        // Rollback on error
        queryClient.setQueryData<T>(queryKey, previousData);
        throw error;
      }
    },
    [queryClient, queryKey, updateFn]
  );

  return { optimisticUpdate };
}