/**
 * Tests for useDebounce hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce, useDebouncedCallback, useDebouncedValue } from '../useDebounce';

describe('useDebounce hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('useDebounce', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated', delay: 500 });
      expect(result.current).toBe('initial'); // Should still be initial

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      // Rapid changes
      rerender({ value: 'change1', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      rerender({ value: 'change2', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      rerender({ value: 'final', delay: 500 });
      
      // Should still be initial after 400ms total
      expect(result.current).toBe('initial');

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('final');
    });

    it('should handle different delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 100 } }
      );

      rerender({ value: 'updated', delay: 100 });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 0 } }
      );

      rerender({ value: 'updated', delay: 0 });

      // With zero delay, should update immediately
      expect(result.current).toBe('updated');
    });
  });

  describe('useDebouncedCallback', () => {
    it('should debounce callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      // Call multiple times rapidly
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('arg3'); // Last call wins
    });

    it('should cancel previous calls', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      result.current('first');
      
      act(() => {
        vi.advanceTimersByTime(200);
      });

      result.current('second');

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('second');
    });

    it('should handle callback changes', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ callback, delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { callback: callback1, delay: 500 } }
      );

      result.current('test');

      // Change callback before execution
      rerender({ callback: callback2, delay: 500 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('test');
    });

    it('should provide cancel function', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      result.current('test');
      result.current.cancel();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should provide flush function', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      result.current('test');
      result.current.flush();

      expect(callback).toHaveBeenCalledWith('test');

      // Should not call again after timeout
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle immediate execution option', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, 500, { leading: true })
      );

      result.current('test');

      expect(callback).toHaveBeenCalledWith('test');
      expect(callback).toHaveBeenCalledTimes(1);

      // Subsequent calls should be debounced
      result.current('test2');
      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1); // No trailing call
    });

    it('should handle trailing execution option', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, 500, { trailing: true })
      );

      result.current('test');

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledWith('test');
    });
  });

  describe('useDebouncedValue', () => {
    it('should debounce value updates with callback', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay, onChange),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');
      expect(onChange).not.toHaveBeenCalled();

      rerender({ value: 'updated', delay: 500 });

      expect(result.current).toBe('initial');
      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
      expect(onChange).toHaveBeenCalledWith('updated', 'initial');
    });

    it('should work without callback', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 500 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle complex objects', () => {
      const onChange = vi.fn();
      const initialObj = { name: 'John', age: 30 };
      const updatedObj = { name: 'Jane', age: 25 };

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay, onChange),
        { initialProps: { value: initialObj, delay: 500 } }
      );

      expect(result.current).toBe(initialObj);

      rerender({ value: updatedObj, delay: 500 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(updatedObj);
      expect(onChange).toHaveBeenCalledWith(updatedObj, initialObj);
    });
  });

  describe('edge cases', () => {
    it('should handle component unmount during debounce', () => {
      const callback = vi.fn();
      const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));

      result.current('test');
      unmount();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle negative delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: -100 } }
      );

      rerender({ value: 'updated', delay: -100 });

      // Negative delay should be treated as 0
      expect(result.current).toBe('updated');
    });

    it('should handle undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: undefined, delay: 500 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 'defined', delay: 500 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('defined');
    });

    it('should handle null values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: null, delay: 500 } }
      );

      expect(result.current).toBeNull();

      rerender({ value: 'not null', delay: 500 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('not null');
    });
  });
});