/**
 * Tests for accessibility utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  announceToScreenReader,
  focusElement,
  trapFocus,
  getAccessibleLabel,
  validateColorContrast,
  generateAriaDescribedBy,
  createKeyboardHandler,
  isElementVisible,
  getNextFocusableElement,
  getPreviousFocusableElement,
} from '../accessibility';

describe('accessibility utilities', () => {
  beforeEach(() => {
    // Clear any existing aria-live regions
    document.querySelectorAll('[aria-live]').forEach(el => el.remove());
    
    // Reset document body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('announceToScreenReader', () => {
    it('should create aria-live region and announce message', () => {
      announceToScreenReader('Test announcement');
      
      const ariaLiveRegion = document.querySelector('[aria-live="polite"]');
      expect(ariaLiveRegion).toBeTruthy();
      expect(ariaLiveRegion?.textContent).toBe('Test announcement');
    });

    it('should use existing aria-live region if available', () => {
      // Create existing region
      const existingRegion = document.createElement('div');
      existingRegion.setAttribute('aria-live', 'polite');
      existingRegion.setAttribute('aria-atomic', 'true');
      existingRegion.className = 'sr-only';
      document.body.appendChild(existingRegion);

      announceToScreenReader('Second announcement');
      
      const regions = document.querySelectorAll('[aria-live="polite"]');
      expect(regions).toHaveLength(1);
      expect(existingRegion.textContent).toBe('Second announcement');
    });

    it('should handle assertive announcements', () => {
      announceToScreenReader('Urgent message', 'assertive');
      
      const ariaLiveRegion = document.querySelector('[aria-live="assertive"]');
      expect(ariaLiveRegion).toBeTruthy();
      expect(ariaLiveRegion?.textContent).toBe('Urgent message');
    });

    it('should clear announcement after delay', async () => {
      vi.useFakeTimers();
      
      announceToScreenReader('Temporary message');
      const region = document.querySelector('[aria-live="polite"]');
      
      expect(region?.textContent).toBe('Temporary message');
      
      vi.advanceTimersByTime(1000);
      
      expect(region?.textContent).toBe('');
      
      vi.useRealTimers();
    });
  });

  describe('focusElement', () => {
    it('should focus element by selector', () => {
      const button = document.createElement('button');
      button.id = 'test-button';
      button.textContent = 'Test Button';
      document.body.appendChild(button);

      const focusSpy = vi.spyOn(button, 'focus');
      
      const result = focusElement('#test-button');
      
      expect(result).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus element directly', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      const focusSpy = vi.spyOn(input, 'focus');
      
      const result = focusElement(input);
      
      expect(result).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should return false if element not found', () => {
      const result = focusElement('#non-existent');
      expect(result).toBe(false);
    });

    it('should handle focus with delay', async () => {
      vi.useFakeTimers();
      
      const button = document.createElement('button');
      button.id = 'delayed-button';
      document.body.appendChild(button);

      const focusSpy = vi.spyOn(button, 'focus');
      
      focusElement('#delayed-button', 100);
      
      expect(focusSpy).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      
      expect(focusSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('trapFocus', () => {
    it('should trap focus within container', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const button3 = document.createElement('button');
      
      button1.textContent = 'Button 1';
      button2.textContent = 'Button 2';
      button3.textContent = 'Button 3';
      
      container.appendChild(button1);
      container.appendChild(button2);
      container.appendChild(button3);
      document.body.appendChild(container);

      const cleanup = trapFocus(container);
      
      // Simulate Tab key on last element
      button3.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      container.dispatchEvent(tabEvent);
      
      expect(document.activeElement).toBe(button1);
      
      cleanup();
    });

    it('should handle Shift+Tab for reverse navigation', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);

      const cleanup = trapFocus(container);
      
      // Simulate Shift+Tab on first element
      button1.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: true 
      });
      container.dispatchEvent(shiftTabEvent);
      
      expect(document.activeElement).toBe(button2);
      
      cleanup();
    });
  });

  describe('getAccessibleLabel', () => {
    it('should get aria-label', () => {
      const element = document.createElement('button');
      element.setAttribute('aria-label', 'Close dialog');
      
      const label = getAccessibleLabel(element);
      expect(label).toBe('Close dialog');
    });

    it('should get aria-labelledby text', () => {
      const labelElement = document.createElement('span');
      labelElement.id = 'label-1';
      labelElement.textContent = 'Username';
      
      const input = document.createElement('input');
      input.setAttribute('aria-labelledby', 'label-1');
      
      document.body.appendChild(labelElement);
      document.body.appendChild(input);
      
      const label = getAccessibleLabel(input);
      expect(label).toBe('Username');
    });

    it('should get text content as fallback', () => {
      const button = document.createElement('button');
      button.textContent = 'Submit Form';
      
      const label = getAccessibleLabel(button);
      expect(label).toBe('Submit Form');
    });

    it('should return empty string if no label found', () => {
      const div = document.createElement('div');
      
      const label = getAccessibleLabel(div);
      expect(label).toBe('');
    });
  });

  describe('validateColorContrast', () => {
    it('should validate sufficient contrast ratio', () => {
      const result = validateColorContrast('#000000', '#ffffff');
      expect(result.ratio).toBeCloseTo(21, 1);
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
    });

    it('should detect insufficient contrast', () => {
      const result = validateColorContrast('#777777', '#888888');
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.passesAA).toBe(false);
      expect(result.passesAAA).toBe(false);
    });

    it('should handle large text requirements', () => {
      const result = validateColorContrast('#666666', '#ffffff', true);
      expect(result.passesAA).toBe(true); // 3:1 ratio for large text
    });
  });

  describe('generateAriaDescribedBy', () => {
    it('should generate unique ID', () => {
      const id1 = generateAriaDescribedBy('error');
      const id2 = generateAriaDescribedBy('error');
      
      expect(id1).toMatch(/^error-\d+$/);
      expect(id2).toMatch(/^error-\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('should use provided prefix', () => {
      const id = generateAriaDescribedBy('help-text');
      expect(id).toMatch(/^help-text-\d+$/);
    });
  });

  describe('createKeyboardHandler', () => {
    it('should handle single key', () => {
      const handler = vi.fn();
      const keyboardHandler = createKeyboardHandler({
        'Enter': handler,
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      keyboardHandler(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle key combinations', () => {
      const handler = vi.fn();
      const keyboardHandler = createKeyboardHandler({
        'Ctrl+S': handler,
      });

      const event = new KeyboardEvent('keydown', { 
        key: 's', 
        ctrlKey: true 
      });
      keyboardHandler(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should prevent default when specified', () => {
      const handler = vi.fn();
      const keyboardHandler = createKeyboardHandler({
        'Escape': handler,
      }, true);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      keyboardHandler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('isElementVisible', () => {
    it('should detect visible element', () => {
      const element = document.createElement('div');
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      document.body.appendChild(element);

      const isVisible = isElementVisible(element);
      expect(isVisible).toBe(true);
    });

    it('should detect hidden element', () => {
      const element = document.createElement('div');
      element.style.display = 'none';
      document.body.appendChild(element);

      const isVisible = isElementVisible(element);
      expect(isVisible).toBe(false);
    });

    it('should detect invisible element', () => {
      const element = document.createElement('div');
      element.style.visibility = 'hidden';
      document.body.appendChild(element);

      const isVisible = isElementVisible(element);
      expect(isVisible).toBe(false);
    });
  });

  describe('getNextFocusableElement', () => {
    it('should find next focusable element', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const button3 = document.createElement('button');
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);
      document.body.appendChild(button3);

      const next = getNextFocusableElement(button1);
      expect(next).toBe(button2);
    });

    it('should wrap to first element at end', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      const next = getNextFocusableElement(button2);
      expect(next).toBe(button1);
    });

    it('should return null if no focusable elements', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const next = getNextFocusableElement(div);
      expect(next).toBeNull();
    });
  });

  describe('getPreviousFocusableElement', () => {
    it('should find previous focusable element', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const button3 = document.createElement('button');
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);
      document.body.appendChild(button3);

      const previous = getPreviousFocusableElement(button3);
      expect(previous).toBe(button2);
    });

    it('should wrap to last element at beginning', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      const previous = getPreviousFocusableElement(button1);
      expect(previous).toBe(button2);
    });
  });
});