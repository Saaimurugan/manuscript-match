import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';

interface AccessibilityContextType {
  highContrast: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  screenReader: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const accessibility = useAccessibility();
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  // Initialize from localStorage and system preferences
  useEffect(() => {
    const savedHighContrast = localStorage.getItem('scholarfinder-high-contrast') === 'true';
    const savedLargeText = localStorage.getItem('scholarfinder-large-text') === 'true';
    
    setHighContrast(savedHighContrast || accessibility.highContrast);
    setLargeText(savedLargeText || accessibility.largeText);
  }, [accessibility.highContrast, accessibility.largeText]);

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    if (accessibility.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [highContrast, largeText, accessibility.reduceMotion]);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('scholarfinder-high-contrast', newValue.toString());
    
    accessibility.announceLiveRegion(
      newValue ? 'High contrast mode enabled' : 'High contrast mode disabled'
    );
  };

  const toggleLargeText = () => {
    const newValue = !largeText;
    setLargeText(newValue);
    localStorage.setItem('scholarfinder-large-text', newValue.toString());
    
    accessibility.announceLiveRegion(
      newValue ? 'Large text mode enabled' : 'Large text mode disabled'
    );
  };

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibility.announceLiveRegion(message, priority);
  };

  const value: AccessibilityContextType = {
    highContrast,
    reduceMotion: accessibility.reduceMotion,
    largeText,
    screenReader: accessibility.screenReader,
    toggleHighContrast,
    toggleLargeText,
    announceMessage,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};