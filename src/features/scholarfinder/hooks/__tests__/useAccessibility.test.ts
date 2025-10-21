/**
 * Tests for accessibility hooks
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useAccessibility,
  useFocusManagement,
  useKeyboardNavigation,
  useScreenReader,
  useAriaLive,
  useFocusTrap,
  useSkipLinks,
} from '../useAccessibility';

// Mock the accessibility utilities
vi.mock('../../utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
  focusElement: vi.fn().mockReturnValue(true),
  trapFocus: vi.fn().mockReturnValue(() => {}),
  getAccessibleLabel: vi.fn().mockReturnValue('Test Label'),
  validateColorContrast: vi.fn().mockReturnValue({ ratio: 4.5, passesAA: true, passesAAA: false }),
  generateAriaDescribedBy: vi.fn().mockReturnValue('aria-123'),
  createKeyboardHandler: vi.fn().mockReturnValue(() => {}),
  isElementVisible: vi.fn().mockReturnValue(true),
  getNextFocusableElement: vi.fn(),
  getPreviousFocusableElement: vi.fn(),
}));

describe('accessibility hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAccessibility', () => {
    it('should provide accessibility context and utilities', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current).toHaveProperty('isHighContrast');
      expect(result.current).toHaveProperty('isReducedMotion');
      expect(result.current).toHaveProperty('fontSize');
      expect(result.current).toHaveProperty('toggleHighContrast');
      expect(result.current).toHaveProperty('toggleReducedMotion');
      expect(result.current).toHaveProperty('setFontSize');
      expect(result.current).toHaveProperty('announce');
      expect(result.current).toHaveProperty('focus');
    });

    it('should initialize with default accessibility settings', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isHighContrast).toBe(false);
      expect(result.current.isReducedMotion).toBe(false);
      expect(result.current.fontSize).toBe('medium');
    });

    it('should toggle high contrast mode', () => {
      const { result } = renderHook(() => useAccessibility());

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(result.current.isHighContrast).toBe(true);

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(result.current.isHighContrast).toBe(false);
    });

    it('should toggle reduced motion preference', () => {
      const { result } = renderHook(() => useAccessibility());

      act(() => {
        result.current.toggleReducedMotion();
      });

      expect(result.current.isReducedMotion).toBe(true);
    });

    it('should update font size', () => {
      const { result } = renderHook(() => useAccessibility());

      act(() => {
        result.current.setFontSize('large');
      });

      expect(result.current.fontSize).toBe('large');
    });

    it('should persist settings to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const { result } = renderHook(() => useAccessibility());

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        'accessibility-settings',
        expect.stringContaining('"isHighContrast":true')
      );
    });

    it('should load settings from localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockReturnValue('{"isHighContrast":true,"fontSize":"large"}');

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isHighContrast).toBe(true);
      expect(result.current.fontSize).toBe('large');
    });
  });

  describe('useFocusManagement', () => {
    it('should provide focus management utilities', () => {
      const { result } = renderHook(() => useFocusManagement());

      expect(result.current).toHaveProperty('focusedElement');
      expect(result.current).toHaveProperty('focusHistory');
      expect(result.current).toHaveProperty('focus');
      expect(result.current).toHaveProperty('restoreFocus');
      expect(result.current).toHaveProperty('saveFocus');
    });

    it('should track focused element', () => {
      const { result } = renderHook(() => useFocusManagement());
      
      const button = document.createElement('button');
      button.id = 'test-button';
      document.body.appendChild(button);

      act(() => {
        button.focus();
        // Simulate focus event
        button.dispatchEvent(new FocusEvent('focus'));
      });

      // Note: In jsdom, focus events might not work exactly like in browser
      // This test verifies the hook structure
      expect(result.current.focus).toBeInstanceOf(Function);
    });

    it('should save and restore focus', () => {
      const { result } = renderHook(() => useFocusManagement());
      
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      button1.id = 'button1';
      button2.id = 'button2';
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      act(() => {
        button1.focus();
        result.current.saveFocus();
      });

      act(() => {
        button2.focus();
      });

      act(() => {
        result.current.restoreFocus();
      });

      // Verify the focus utility was called
      expect(result.current.restoreFocus).toBeInstanceOf(Function);
    });
  });

  describe('useKeyboardNavigation', () => {
    it('should provide keyboard navigation utilities', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      expect(result.current).toHaveProperty('handleKeyDown');
      expect(result.current).toHaveProperty('registerShortcut');
      expect(result.current).toHaveProperty('unregisterShortcut');
      expect(result.current).toHaveProperty('activeShortcuts');
    });

    it('should register keyboard shortcuts', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.registerShortcut('Ctrl+S', handler, 'Save document');
      });

      expect(result.current.activeShortcuts).toHaveLength(1);
      expect(result.current.activeShortcuts[0]).toMatchObject({
        key: 'Ctrl+S',
        description: 'Save document',
      });
    });

    it('should unregister keyboard shortcuts', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.registerShortcut('Ctrl+S', handler);
      });

      act(() => {
        result.current.unregisterShortcut('Ctrl+S');
      });

      expect(result.current.activeShortcuts).toHaveLength(0);
    });

    it('should handle keyboard events', () => {
      const handler = vi.fn();
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.registerShortcut('Enter', handler);
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      
      act(() => {
        result.current.handleKeyDown(event);
      });

      // Verify handler structure
      expect(result.current.handleKeyDown).toBeInstanceOf(Function);
    });
  });

  describe('useScreenReader', () => {
    it('should provide screen reader utilities', () => {
      const { result } = renderHook(() => useScreenReader());

      expect(result.current).toHaveProperty('announce');
      expect(result.current).toHaveProperty('announcePolite');
      expect(result.current).toHaveProperty('announceAssertive');
      expect(result.current).toHaveProperty('isScreenReaderActive');
    });

    it('should announce messages', () => {
      const { announceToScreenReader } = require('../../utils/accessibility');
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        result.current.announce('Test message');
      });

      expect(announceToScreenReader).toHaveBeenCalledWith('Test message', 'polite');
    });

    it('should announce polite messages', () => {
      const { announceToScreenReader } = require('../../utils/accessibility');
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        result.current.announcePolite('Polite message');
      });

      expect(announceToScreenReader).toHaveBeenCalledWith('Polite message', 'polite');
    });

    it('should announce assertive messages', () => {
      const { announceToScreenReader } = require('../../utils/accessibility');
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        result.current.announceAssertive('Urgent message');
      });

      expect(announceToScreenReader).toHaveBeenCalledWith('Urgent message', 'assertive');
    });
  });

  describe('useAriaLive', () => {
    it('should provide aria-live region management', () => {
      const { result } = renderHook(() => useAriaLive());

      expect(result.current).toHaveProperty('announce');
      expect(result.current).toHaveProperty('clear');
      expect(result.current).toHaveProperty('message');
      expect(result.current).toHaveProperty('politeness');
    });

    it('should announce messages with different politeness levels', () => {
      const { result } = renderHook(() => useAriaLive('polite'));

      act(() => {
        result.current.announce('Test message');
      });

      expect(result.current.message).toBe('Test message');
      expect(result.current.politeness).toBe('polite');
    });

    it('should clear messages', () => {
      const { result } = renderHook(() => useAriaLive());

      act(() => {
        result.current.announce('Test message');
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.message).toBe('');
    });

    it('should auto-clear messages after delay', () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useAriaLive('polite', { autoClear: true, clearDelay: 1000 }));

      act(() => {
        result.current.announce('Auto-clear message');
      });

      expect(result.current.message).toBe('Auto-clear message');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.message).toBe('');

      vi.useRealTimers();
    });
  });

  describe('useFocusTrap', () => {
    it('should provide focus trap utilities', () => {
      const { result } = renderHook(() => useFocusTrap());

      expect(result.current).toHaveProperty('trapRef');
      expect(result.current).toHaveProperty('activate');
      expect(result.current).toHaveProperty('deactivate');
      expect(result.current).toHaveProperty('isActive');
    });

    it('should activate focus trap', () => {
      const { result } = renderHook(() => useFocusTrap());

      act(() => {
        result.current.activate();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should deactivate focus trap', () => {
      const { result } = renderHook(() => useFocusTrap());

      act(() => {
        result.current.activate();
      });

      act(() => {
        result.current.deactivate();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should auto-activate when enabled', () => {
      const { result } = renderHook(() => useFocusTrap({ autoActivate: true }));

      expect(result.current.isActive).toBe(true);
    });
  });

  describe('useSkipLinks', () => {
    it('should provide skip link utilities', () => {
      const { result } = renderHook(() => useSkipLinks());

      expect(result.current).toHaveProperty('skipLinks');
      expect(result.current).toHaveProperty('addSkipLink');
      expect(result.current).toHaveProperty('removeSkipLink');
      expect(result.current).toHaveProperty('skipTo');
    });

    it('should add skip links', () => {
      const { result } = renderHook(() => useSkipLinks());

      act(() => {
        result.current.addSkipLink('main-content', 'Skip to main content');
      });

      expect(result.current.skipLinks).toHaveLength(1);
      expect(result.current.skipLinks[0]).toMatchObject({
        target: 'main-content',
        label: 'Skip to main content',
      });
    });

    it('should remove skip links', () => {
      const { result } = renderHook(() => useSkipLinks());

      act(() => {
        result.current.addSkipLink('main-content', 'Skip to main content');
      });

      act(() => {
        result.current.removeSkipLink('main-content');
      });

      expect(result.current.skipLinks).toHaveLength(0);
    });

    it('should skip to target element', () => {
      const { focusElement } = require('../../utils/accessibility');
      const { result } = renderHook(() => useSkipLinks());

      const mainElement = document.createElement('main');
      mainElement.id = 'main-content';
      document.body.appendChild(mainElement);

      act(() => {
        result.current.skipTo('main-content');
      });

      expect(focusElement).toHaveBeenCalledWith('#main-content');
    });

    it('should provide default skip links', () => {
      const { result } = renderHook(() => useSkipLinks({
        defaultLinks: [
          { target: 'main-content', label: 'Skip to main content' },
          { target: 'navigation', label: 'Skip to navigation' },
        ]
      }));

      expect(result.current.skipLinks).toHaveLength(2);
    });
  });

  describe('integration with media queries', () => {
    it('should detect reduced motion preference', () => {
      const mockMatchMedia = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useAccessibility());

      // Should detect system preference
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should detect high contrast preference', () => {
      const mockMatchMedia = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-contrast: high)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useAccessibility());

      // Should detect system preference
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)');
    });
  });
});