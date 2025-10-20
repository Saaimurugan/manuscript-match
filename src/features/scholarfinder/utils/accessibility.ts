/**
 * Accessibility utility functions and constants
 */

export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-pressed'?: boolean | 'mixed';
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-setsize'?: number;
  'aria-posinset'?: number;
  'aria-level'?: number;
  role?: string;
  tabIndex?: number;
}

/**
 * Generate ARIA attributes for form fields
 */
export function getFormFieldAria(
  id: string,
  label?: string,
  description?: string,
  error?: string,
  required?: boolean
): AriaAttributes {
  const attributes: AriaAttributes = {};
  
  if (label) {
    attributes['aria-label'] = label;
  }
  
  if (description) {
    attributes['aria-describedby'] = `${id}-description`;
  }
  
  if (error) {
    attributes['aria-describedby'] = `${id}-error`;
    attributes['aria-invalid'] = true;
  }
  
  if (required) {
    attributes['aria-required'] = true;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for buttons
 */
export function getButtonAria(
  label: string,
  pressed?: boolean,
  expanded?: boolean,
  controls?: string,
  disabled?: boolean
): AriaAttributes {
  const attributes: AriaAttributes = {
    'aria-label': label,
  };
  
  if (pressed !== undefined) {
    attributes['aria-pressed'] = pressed;
  }
  
  if (expanded !== undefined) {
    attributes['aria-expanded'] = expanded;
  }
  
  if (controls) {
    attributes['aria-controls'] = controls;
  }
  
  if (disabled) {
    attributes['aria-disabled'] = true;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for navigation elements
 */
export function getNavigationAria(
  current?: boolean | 'page' | 'step' | 'location',
  level?: number,
  setSize?: number,
  posInSet?: number
): AriaAttributes {
  const attributes: AriaAttributes = {};
  
  if (current !== undefined) {
    attributes['aria-current'] = current;
  }
  
  if (level !== undefined) {
    attributes['aria-level'] = level;
  }
  
  if (setSize !== undefined) {
    attributes['aria-setsize'] = setSize;
  }
  
  if (posInSet !== undefined) {
    attributes['aria-posinset'] = posInSet;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for progress indicators
 */
export function getProgressAria(
  value: number,
  min: number = 0,
  max: number = 100,
  label?: string,
  valueText?: string
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: 'progressbar',
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
  };
  
  if (label) {
    attributes['aria-label'] = label;
  }
  
  if (valueText) {
    attributes['aria-valuetext'] = valueText;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for tables
 */
export function getTableAria(
  rowCount?: number,
  columnCount?: number,
  sortable?: boolean,
  sortColumn?: number,
  sortDirection?: 'ascending' | 'descending'
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: 'table',
  };
  
  if (rowCount !== undefined) {
    attributes['aria-rowcount'] = rowCount;
  }
  
  if (columnCount !== undefined) {
    attributes['aria-colcount'] = columnCount;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for table headers
 */
export function getTableHeaderAria(
  sortable?: boolean,
  sortDirection?: 'ascending' | 'descending' | 'none',
  columnIndex?: number
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: 'columnheader',
  };
  
  if (sortable) {
    attributes['aria-sort'] = sortDirection || 'none';
    attributes.tabIndex = 0;
  }
  
  if (columnIndex !== undefined) {
    attributes['aria-colindex'] = columnIndex;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for dialogs and modals
 */
export function getDialogAria(
  labelledBy?: string,
  describedBy?: string,
  modal?: boolean
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: modal ? 'dialog' : 'alertdialog',
  };
  
  if (labelledBy) {
    attributes['aria-labelledby'] = labelledBy;
  }
  
  if (describedBy) {
    attributes['aria-describedby'] = describedBy;
  }
  
  if (modal) {
    attributes['aria-modal'] = true;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for live regions
 */
export function getLiveRegionAria(
  politeness: 'off' | 'polite' | 'assertive' = 'polite',
  atomic?: boolean,
  busy?: boolean
): AriaAttributes {
  const attributes: AriaAttributes = {
    'aria-live': politeness,
  };
  
  if (atomic !== undefined) {
    attributes['aria-atomic'] = atomic;
  }
  
  if (busy !== undefined) {
    attributes['aria-busy'] = busy;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for tabs
 */
export function getTabAria(
  selected: boolean,
  controls: string,
  tabIndex?: number
): AriaAttributes {
  return {
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': controls,
    tabIndex: selected ? 0 : (tabIndex ?? -1),
  };
}

/**
 * Generate ARIA attributes for tab panels
 */
export function getTabPanelAria(
  labelledBy: string,
  hidden?: boolean
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: 'tabpanel',
    'aria-labelledby': labelledBy,
  };
  
  if (hidden) {
    attributes['aria-hidden'] = true;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for lists
 */
export function getListAria(
  itemCount?: number,
  multiselectable?: boolean,
  orientation?: 'horizontal' | 'vertical'
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: 'list',
  };
  
  if (itemCount !== undefined) {
    attributes['aria-setsize'] = itemCount;
  }
  
  if (multiselectable !== undefined) {
    attributes['aria-multiselectable'] = multiselectable;
  }
  
  if (orientation) {
    attributes['aria-orientation'] = orientation;
  }
  
  return attributes;
}

/**
 * Generate ARIA attributes for list items
 */
export function getListItemAria(
  position?: number,
  setSize?: number,
  selected?: boolean,
  level?: number
): AriaAttributes {
  const attributes: AriaAttributes = {
    role: 'listitem',
  };
  
  if (position !== undefined) {
    attributes['aria-posinset'] = position;
  }
  
  if (setSize !== undefined) {
    attributes['aria-setsize'] = setSize;
  }
  
  if (selected !== undefined) {
    attributes['aria-selected'] = selected;
  }
  
  if (level !== undefined) {
    attributes['aria-level'] = level;
  }
  
  return attributes;
}

/**
 * Generate keyboard event handlers for accessibility
 */
export function getKeyboardHandlers(
  onEnter?: () => void,
  onSpace?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void,
  onHome?: () => void,
  onEnd?: () => void
) {
  return {
    onKeyDown: (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (onEnter) {
            e.preventDefault();
            onEnter();
          }
          break;
        case ' ':
        case 'Space':
          if (onSpace) {
            e.preventDefault();
            onSpace();
          }
          break;
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            e.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            e.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            e.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            e.preventDefault();
            onArrowRight();
          }
          break;
        case 'Home':
          if (onHome) {
            e.preventDefault();
            onHome();
          }
          break;
        case 'End':
          if (onEnd) {
            e.preventDefault();
            onEnd();
          }
          break;
      }
    },
  };
}

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors));
  },

  /**
   * Focus the first focusable element in a container
   */
  focusFirst: (container: HTMLElement): boolean => {
    const focusableElements = focusUtils.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  },

  /**
   * Focus the last focusable element in a container
   */
  focusLast: (container: HTMLElement): boolean => {
    const focusableElements = focusUtils.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
      return true;
    }
    return false;
  },

  /**
   * Check if an element is currently focused
   */
  isFocused: (element: HTMLElement): boolean => {
    return document.activeElement === element;
  },

  /**
   * Check if focus is within a container
   */
  isFocusWithin: (container: HTMLElement): boolean => {
    return container.contains(document.activeElement);
  },
};