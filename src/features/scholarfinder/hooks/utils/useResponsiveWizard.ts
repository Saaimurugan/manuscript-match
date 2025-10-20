import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface ResponsiveWizardConfig {
  breakpoints: ResponsiveBreakpoints;
  mobileLayout: 'stacked' | 'accordion' | 'tabs';
  tabletLayout: 'sidebar' | 'top' | 'stacked';
  desktopLayout: 'sidebar' | 'top' | 'full';
  showProgressOnMobile: boolean;
  showStepDescriptions: boolean;
  compactNavigation: boolean;
}

export interface ResponsiveState {
  screenSize: 'mobile' | 'tablet' | 'desktop';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  layout: string;
  showProgress: boolean;
  showDescriptions: boolean;
  compactNav: boolean;
}

const defaultConfig: ResponsiveWizardConfig = {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  },
  mobileLayout: 'stacked',
  tabletLayout: 'top',
  desktopLayout: 'top',
  showProgressOnMobile: true,
  showStepDescriptions: true,
  compactNavigation: false,
};

/**
 * Hook for managing responsive wizard layouts and behavior
 */
export const useResponsiveWizard = (config: Partial<ResponsiveWizardConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024; // Default for SSR
  });

  const [state, setState] = useState<ResponsiveState>(() => {
    const screenSize = getScreenSize(windowWidth, finalConfig.breakpoints);
    return {
      screenSize,
      isMobile: screenSize === 'mobile',
      isTablet: screenSize === 'tablet',
      isDesktop: screenSize === 'desktop',
      layout: getLayout(screenSize, finalConfig),
      showProgress: getShowProgress(screenSize, finalConfig),
      showDescriptions: getShowDescriptions(screenSize, finalConfig),
      compactNav: getCompactNav(screenSize, finalConfig),
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const screenSize = getScreenSize(windowWidth, finalConfig.breakpoints);
    setState({
      screenSize,
      isMobile: screenSize === 'mobile',
      isTablet: screenSize === 'tablet',
      isDesktop: screenSize === 'desktop',
      layout: getLayout(screenSize, finalConfig),
      showProgress: getShowProgress(screenSize, finalConfig),
      showDescriptions: getShowDescriptions(screenSize, finalConfig),
      compactNav: getCompactNav(screenSize, finalConfig),
    });
  }, [windowWidth, finalConfig]);

  return {
    ...state,
    windowWidth,
    config: finalConfig,
  };
};

/**
 * Determines screen size based on window width and breakpoints
 */
const getScreenSize = (
  width: number, 
  breakpoints: ResponsiveBreakpoints
): 'mobile' | 'tablet' | 'desktop' => {
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.tablet) return 'tablet';
  return 'desktop';
};

/**
 * Gets the appropriate layout for the current screen size
 */
const getLayout = (
  screenSize: 'mobile' | 'tablet' | 'desktop',
  config: ResponsiveWizardConfig
): string => {
  switch (screenSize) {
    case 'mobile':
      return config.mobileLayout;
    case 'tablet':
      return config.tabletLayout;
    case 'desktop':
      return config.desktopLayout;
    default:
      return 'top';
  }
};

/**
 * Determines if progress indicator should be shown
 */
const getShowProgress = (
  screenSize: 'mobile' | 'tablet' | 'desktop',
  config: ResponsiveWizardConfig
): boolean => {
  if (screenSize === 'mobile') {
    return config.showProgressOnMobile;
  }
  return true; // Always show on tablet and desktop
};

/**
 * Determines if step descriptions should be shown
 */
const getShowDescriptions = (
  screenSize: 'mobile' | 'tablet' | 'desktop',
  config: ResponsiveWizardConfig
): boolean => {
  if (screenSize === 'mobile') {
    return false; // Hide descriptions on mobile to save space
  }
  return config.showStepDescriptions;
};

/**
 * Determines if navigation should be compact
 */
const getCompactNav = (
  screenSize: 'mobile' | 'tablet' | 'desktop',
  config: ResponsiveWizardConfig
): boolean => {
  if (screenSize === 'mobile') {
    return true; // Always compact on mobile
  }
  return config.compactNavigation;
};

/**
 * Hook for managing wizard step visibility and navigation on mobile
 */
export const useMobileStepNavigation = (totalSteps: number, currentStepIndex: number) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 2 });

  useEffect(() => {
    // Adjust visible range to keep current step in view
    const rangeSize = 3;
    let start = Math.max(0, currentStepIndex - 1);
    let end = Math.min(totalSteps - 1, start + rangeSize - 1);
    
    // Adjust start if we're near the end
    if (end === totalSteps - 1) {
      start = Math.max(0, end - rangeSize + 1);
    }
    
    setVisibleRange({ start, end });
  }, [currentStepIndex, totalSteps]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  
  const getVisibleSteps = (steps: any[]) => {
    if (isExpanded) return steps;
    return steps.slice(visibleRange.start, visibleRange.end + 1);
  };

  return {
    isExpanded,
    visibleRange,
    toggleExpanded,
    getVisibleSteps,
    hasHiddenSteps: totalSteps > 3,
  };
};

/**
 * Hook for managing touch gestures on mobile wizard
 */
export const useWizardGestures = (
  onNext: () => void,
  onPrevious: () => void,
  canGoNext: boolean,
  canGoPrevious: boolean
) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canGoNext) {
      onNext();
    }
    if (isRightSwipe && canGoPrevious) {
      onPrevious();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

/**
 * Hook for managing wizard keyboard navigation
 */
export const useWizardKeyboard = (
  onNext: () => void,
  onPrevious: () => void,
  onSkip?: () => void,
  canGoNext: boolean = true,
  canGoPrevious: boolean = true,
  canSkip: boolean = false
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
          if (canGoNext) {
            event.preventDefault();
            onNext();
          }
          break;
        case 'ArrowLeft':
          if (canGoPrevious) {
            event.preventDefault();
            onPrevious();
          }
          break;
        case 'Escape':
          if (canSkip && onSkip) {
            event.preventDefault();
            onSkip();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onSkip, canGoNext, canGoPrevious, canSkip]);
};