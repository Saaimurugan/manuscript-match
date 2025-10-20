/**
 * DebouncedInput Component
 * Input component with built-in debouncing to reduce API calls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '@/lib/utils';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  showSearchIcon?: boolean;
  showClearButton?: boolean;
  showLoadingIndicator?: boolean;
  isLoading?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceMs = 300,
  showSearchIcon = true,
  showClearButton = true,
  showLoadingIndicator = true,
  isLoading = false,
  onClear,
  containerClassName,
  className,
  placeholder = "Search...",
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebounce(inputValue, debounceMs);

  // Update input value when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Call onChange when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
    onClear?.();
  }, [onChange, onClear]);

  const hasValue = inputValue.length > 0;
  const showLoading = showLoadingIndicator && isLoading && hasValue;

  return (
    <div className={cn("relative", containerClassName)}>
      {showSearchIcon && (
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      )}
      
      <Input
        {...props}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(
          showSearchIcon && "pl-10",
          (showClearButton || showLoading) && "pr-10",
          className
        )}
      />

      {/* Loading indicator or clear button */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
        {showLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          showClearButton && hasValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )
        )}
      </div>
    </div>
  );
};

/**
 * DebouncedSearchInput - Specialized search input with preset styling
 */
export const DebouncedSearchInput: React.FC<Omit<DebouncedInputProps, 'showSearchIcon'>> = (props) => (
  <DebouncedInput
    {...props}
    showSearchIcon={true}
    placeholder={props.placeholder || "Search reviewers by name, affiliation, email, or country..."}
  />
);

/**
 * DebouncedFilterInput - Specialized filter input for numeric values
 */
interface DebouncedFilterInputProps extends Omit<DebouncedInputProps, 'onChange'> {
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}

export const DebouncedFilterInput: React.FC<DebouncedFilterInputProps> = ({
  onChange,
  min,
  max,
  ...props
}) => {
  const handleChange = useCallback((value: string) => {
    const numValue = value.trim() === '' ? null : Number(value);
    
    // Validate numeric input
    if (numValue !== null) {
      if (isNaN(numValue)) return; // Invalid number
      if (min !== undefined && numValue < min) return; // Below minimum
      if (max !== undefined && numValue > max) return; // Above maximum
    }
    
    onChange(numValue);
  }, [onChange, min, max]);

  return (
    <DebouncedInput
      {...props}
      type="number"
      min={min}
      max={max}
      onChange={handleChange}
      showSearchIcon={false}
    />
  );
};