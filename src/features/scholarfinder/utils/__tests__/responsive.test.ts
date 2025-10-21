/**
 * Tests for responsive utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBreakpoint,
  isBreakpoint,
  getViewportSize,
  isMobile,
  isTablet,
  isDesktop,
  getOptimalColumnCount,
  calculateResponsiveSize,
  createResponsiveHandler,
  debounceResize,
} from '../responsive';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('responsive utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBreakpoint', () => {
    it('should return mobile for small screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      expect(getBreakpoint()).toBe('mobile');
    });

    it('should return tablet for medium screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(getBreakpoint()).toBe('tablet');
    });

    it('should return desktop for large screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getBreakpoint()).toBe('desktop');
    });

    it('should return wide for extra large screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      expect(getBreakpoint()).toBe('wide');
    });
  });

  describe('isBreakpoint', () => {
    it('should correctly identify mobile breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 480 });
      expect(isBreakpoint('mobile')).toBe(true);
      expect(isBreakpoint('tablet')).toBe(false);
    });

    it('should correctly identify tablet breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(isBreakpoint('tablet')).toBe(true);
      expect(isBreakpoint('mobile')).toBe(false);
    });

    it('should correctly identify desktop breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      expect(isBreakpoint('desktop')).toBe(true);
      expect(isBreakpoint('tablet')).toBe(false);
    });
  });

  describe('getViewportSize', () => {
    it('should return current viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
      
      const size = getViewportSize();
      expect(size).toEqual({ width: 1024, height: 768 });
    });

    it('should handle missing window object', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const size = getViewportSize();
      expect(size).toEqual({ width: 0, height: 0 });
      
      global.window = originalWindow;
    });
  });

  describe('isMobile', () => {
    it('should return true for mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 480 });
      expect(isMobile()).toBe(true);
    });

    it('should return false for larger screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(isMobile()).toBe(false);
    });
  });

  describe('isTablet', () => {
    it('should return true for tablet screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(isTablet()).toBe(true);
    });

    it('should return false for mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 480 });
      expect(isTablet()).toBe(false);
    });

    it('should return false for desktop screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(isTablet()).toBe(false);
    });
  });

  describe('isDesktop', () => {
    it('should return true for desktop screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(isDesktop()).toBe(true);
    });

    it('should return false for smaller screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(isDesktop()).toBe(false);
    });
  });

  describe('getOptimalColumnCount', () => {
    it('should return 1 column for mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 480 });
      expect(getOptimalColumnCount()).toBe(1);
    });

    it('should return 2 columns for tablet', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(getOptimalColumnCount()).toBe(2);
    });

    it('should return 3 columns for desktop', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getOptimalColumnCount()).toBe(3);
    });

    it('should return 4 columns for wide screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      expect(getOptimalColumnCount()).toBe(4);
    });

    it('should respect custom column counts', () => {
      const customCounts = { mobile: 1, tablet: 3, desktop: 5, wide: 6 };
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getOptimalColumnCount(customCounts)).toBe(5);
    });
  });

  describe('calculateResponsiveSize', () => {
    it('should calculate size based on breakpoint', () => {
      const sizes = { mobile: 16, tablet: 18, desktop: 20, wide: 24 };
      
      Object.defineProperty(window, 'innerWidth', { value: 480 });
      expect(calculateResponsiveSize(sizes)).toBe(16);
      
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(calculateResponsiveSize(sizes)).toBe(18);
      
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(calculateResponsiveSize(sizes)).toBe(20);
    });

    it('should use fallback for missing breakpoint', () => {
      const sizes = { mobile: 16, desktop: 20 };
      Object.defineProperty(window, 'innerWidth', { value: 768 }); // tablet
      
      expect(calculateResponsiveSize(sizes, 18)).toBe(18);
    });

    it('should use mobile as default fallback', () => {
      const sizes = { tablet: 18, desktop: 20 };
      Object.defineProperty(window, 'innerWidth', { value: 480 }); // mobile
      
      expect(calculateResponsiveSize(sizes)).toBe(18); // Falls back to tablet
    });
  });

  describe('createResponsiveHandler', () => {
    it('should call handler with current breakpoint', () => {
      const handler = vi.fn();
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      
      const responsiveHandler = createResponsiveHandler(handler);
      responsiveHandler();
      
      expect(handler).toHaveBeenCalledWith('tablet', { width: 768, height: 768 });
    });

    it('should debounce resize events', () => {
      vi.useFakeTimers();
      
      const handler = vi.fn();
      const responsiveHandler = createResponsiveHandler(handler, 100);
      
      // Trigger multiple resize events
      responsiveHandler();
      responsiveHandler();
      responsiveHandler();
      
      expect(handler).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      
      expect(handler).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });
  });

  describe('debounceResize', () => {
    it('should debounce function calls', () => {
      vi.useFakeTimers();
      
      const fn = vi.fn();
      const debouncedFn = debounceResize(fn, 200);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(200);
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });

    it('should use default delay', () => {
      vi.useFakeTimers();
      
      const fn = vi.fn();
      const debouncedFn = debounceResize(fn);
      
      debouncedFn();
      
      vi.advanceTimersByTime(150); // Default is 150ms
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });

    it('should cancel previous timeout', () => {
      vi.useFakeTimers();
      
      const fn = vi.fn();
      const debouncedFn = debounceResize(fn, 100);
      
      debouncedFn();
      vi.advanceTimersByTime(50);
      
      debouncedFn(); // Should cancel previous timeout
      vi.advanceTimersByTime(50);
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(50);
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });
  });

  describe('media query integration', () => {
    it('should work with matchMedia', () => {
      const mockMediaQuery = {
        matches: true,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      mockMatchMedia.mockReturnValue(mockMediaQuery);
      
      const result = window.matchMedia('(min-width: 768px)');
      expect(result.matches).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    });
  });

  describe('edge cases', () => {
    it('should handle zero viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 0 });
      Object.defineProperty(window, 'innerHeight', { value: 0 });
      
      expect(getBreakpoint()).toBe('mobile'); // Default to mobile
      expect(getViewportSize()).toEqual({ width: 0, height: 0 });
    });

    it('should handle very large viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 5000 });
      Object.defineProperty(window, 'innerHeight', { value: 3000 });
      
      expect(getBreakpoint()).toBe('wide');
      expect(getViewportSize()).toEqual({ width: 5000, height: 3000 });
    });

    it('should handle negative viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: -100 });
      Object.defineProperty(window, 'innerHeight', { value: -100 });
      
      expect(getBreakpoint()).toBe('mobile'); // Default to mobile
      expect(getViewportSize()).toEqual({ width: -100, height: -100 });
    });
  });
});