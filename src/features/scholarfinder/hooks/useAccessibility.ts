import { useState, useEffect, useCallback, useRef } from 'react';

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
}

export interface FocusManagement {
  trapFocus: (container: HTMLElement) => () => void;
  restoreFocus: (element?: HTMLElement) => void;
  announceLiveRegion: (message: string, priority?: 'polite' | 'assertive') => void;
}

/**
 * Hook for accessibility features and preferences
 */
export const useAccessibility = (): AccessibilityPreferences & FocusManagement => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => ({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
  }));

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Detect user preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePreferences = () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      const largeText = window.matchMedia('(min-resolution: 120dpi)').matches;
      
      // Detect screen reader usage
      const screenReader = 
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis?.speaking ||
        document.querySelector('[aria-live]') !== null;

      setPreferences({
        reduceMotion,
        highContrast,
        largeText,
        screenReader,
      });
    };

    updatePreferences();

    // Listen for preference changes
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(min-resolution: 120dpi)'),
    ];

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', updatePreferences);
    });

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', updatePreferences);
      });
    };
  }, []);

  // Create live region for announcements
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  // Focus management functions
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Store current focus to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Focus first element
    firstElement?.focus();
    
    // Add event listener
    container.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  const restoreFocus = useCallback((element?: HTMLElement) => {
    const elementToFocus = element || previousFocusRef.current;
    if (elementToFocus && typeof elementToFocus.focus === 'function') {
      elementToFocus.focus();
    }
    previousFocusRef.current = null;
  }, []);

  const announceLiveRegion = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return {
    ...preferences,
    trapFocus,
    restoreFocus,
    announceLiveRegion,
  };
};

/**
 * Hook for keyboard navigation
 */
export const useKeyboardNavigation = (
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (onEnter && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
            e.preventDefault();
            onEnter();
          }
          break;
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case 'ArrowUp':
          if (onArrowKeys) {
            e.preventDefault();
            onArrowKeys('up');
          }
          break;
        case 'ArrowDown':
          if (onArrowKeys) {
            e.preventDefault();
            onArrowKeys('down');
          }
          break;
        case 'ArrowLeft':
          if (onArrowKeys) {
            e.preventDefault();
            onArrowKeys('left');
          }
          break;
        case 'ArrowRight':
          if (onArrowKeys) {
            e.preventDefault();
            onArrowKeys('right');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape, onArrowKeys]);
};

/**
 * Hook for managing focus within a component
 */
export const useFocusManagement = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { trapFocus, restoreFocus } = useAccessibility();

  const enableFocusTrap = useCallback(() => {
    if (containerRef.current) {
      return trapFocus(containerRef.current);
    }
    return () => {};
  }, [trapFocus]);

  const disableFocusTrap = useCallback((element?: HTMLElement) => {
    restoreFocus(element);
  }, [restoreFocus]);

  return {
    containerRef,
    enableFocusTrap,
    disableFocusTrap,
  };
};