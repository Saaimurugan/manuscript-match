import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BreakpointKey, breakpoints } from '../hooks/useResponsive';

/**
 * Utility function for conditional responsive classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate responsive classes based on breakpoint values
 */
export function responsiveClasses<T extends string>(
  values: Partial<Record<BreakpointKey, T>>,
  prefix: string = ''
): string {
  const classes: string[] = [];
  
  Object.entries(values).forEach(([breakpoint, value]) => {
    const bp = breakpoint as BreakpointKey;
    if (value) {
      const className = prefix ? `${prefix}${value}` : value;
      if (bp === 'xs') {
        classes.push(className);
      } else {
        classes.push(`${bp}:${className}`);
      }
    }
  });
  
  return classes.join(' ');
}

/**
 * Generate responsive spacing classes
 */
export function responsiveSpacing(
  values: Partial<Record<BreakpointKey, string>>,
  property: 'p' | 'm' | 'px' | 'py' | 'pt' | 'pb' | 'pl' | 'pr' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr'
): string {
  return responsiveClasses(values, `${property}-`);
}

/**
 * Generate responsive grid classes
 */
export function responsiveGrid(
  columns: Partial<Record<BreakpointKey, number>>,
  gap?: Partial<Record<BreakpointKey, string>>
): string {
  const gridClasses = responsiveClasses(
    Object.fromEntries(
      Object.entries(columns).map(([bp, cols]) => [bp, `grid-cols-${cols}`])
    ) as Partial<Record<BreakpointKey, string>>
  );
  
  const gapClasses = gap ? responsiveClasses(gap, 'gap-') : '';
  
  return cn('grid', gridClasses, gapClasses);
}

/**
 * Generate responsive flex classes
 */
export function responsiveFlex(
  direction?: Partial<Record<BreakpointKey, 'row' | 'col' | 'row-reverse' | 'col-reverse'>>,
  wrap?: Partial<Record<BreakpointKey, 'wrap' | 'nowrap' | 'wrap-reverse'>>,
  justify?: Partial<Record<BreakpointKey, 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'>>,
  align?: Partial<Record<BreakpointKey, 'start' | 'end' | 'center' | 'baseline' | 'stretch'>>
): string {
  const directionClasses = direction ? responsiveClasses(
    Object.fromEntries(
      Object.entries(direction).map(([bp, dir]) => [bp, `flex-${dir}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  const wrapClasses = wrap ? responsiveClasses(
    Object.fromEntries(
      Object.entries(wrap).map(([bp, w]) => [bp, `flex-${w}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  const justifyClasses = justify ? responsiveClasses(
    Object.fromEntries(
      Object.entries(justify).map(([bp, j]) => [bp, `justify-${j}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  const alignClasses = align ? responsiveClasses(
    Object.fromEntries(
      Object.entries(align).map(([bp, a]) => [bp, `items-${a}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  return cn('flex', directionClasses, wrapClasses, justifyClasses, alignClasses);
}

/**
 * Generate responsive text classes
 */
export function responsiveText(
  size?: Partial<Record<BreakpointKey, 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'>>,
  weight?: Partial<Record<BreakpointKey, 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black'>>,
  align?: Partial<Record<BreakpointKey, 'left' | 'center' | 'right' | 'justify'>>
): string {
  const sizeClasses = size ? responsiveClasses(
    Object.fromEntries(
      Object.entries(size).map(([bp, s]) => [bp, `text-${s}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  const weightClasses = weight ? responsiveClasses(
    Object.fromEntries(
      Object.entries(weight).map(([bp, w]) => [bp, `font-${w}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  const alignClasses = align ? responsiveClasses(
    Object.fromEntries(
      Object.entries(align).map(([bp, a]) => [bp, `text-${a}`])
    ) as Partial<Record<BreakpointKey, string>>
  ) : '';
  
  return cn(sizeClasses, weightClasses, alignClasses);
}

/**
 * Generate responsive visibility classes
 */
export function responsiveVisibility(
  hidden?: BreakpointKey[],
  visible?: BreakpointKey[]
): string {
  const classes: string[] = [];
  
  if (hidden) {
    hidden.forEach(bp => {
      if (bp === 'xs') {
        classes.push('hidden');
      } else {
        classes.push(`${bp}:hidden`);
      }
    });
  }
  
  if (visible) {
    visible.forEach(bp => {
      if (bp === 'xs') {
        classes.push('block');
      } else {
        classes.push(`${bp}:block`);
      }
    });
  }
  
  return classes.join(' ');
}

/**
 * Check if current width matches breakpoint
 */
export function matchesBreakpoint(width: number, breakpoint: BreakpointKey): boolean {
  return width >= breakpoints[breakpoint];
}

/**
 * Get container classes for responsive layouts
 */
export function getContainerClasses(
  maxWidth?: BreakpointKey,
  padding?: Partial<Record<BreakpointKey, string>>
): string {
  const containerClass = 'container mx-auto';
  const maxWidthClass = maxWidth ? `max-w-${maxWidth}` : '';
  const paddingClasses = padding ? responsiveSpacing(padding, 'px') : 'px-4 sm:px-6 lg:px-8';
  
  return cn(containerClass, maxWidthClass, paddingClasses);
}

/**
 * Generate responsive card layout classes
 */
export function responsiveCardLayout(
  columns: Partial<Record<BreakpointKey, number>> = { xs: 1, sm: 2, lg: 3 },
  gap: Partial<Record<BreakpointKey, string>> = { xs: '4', sm: '6', lg: '8' }
): string {
  return responsiveGrid(columns, gap);
}

/**
 * Generate responsive table classes
 */
export function responsiveTable(): string {
  return cn(
    'w-full',
    'overflow-x-auto',
    'sm:overflow-x-visible',
    'border-collapse',
    'border-spacing-0'
  );
}

/**
 * Generate responsive form layout classes
 */
export function responsiveFormLayout(
  columns: Partial<Record<BreakpointKey, number>> = { xs: 1, md: 2 },
  gap: Partial<Record<BreakpointKey, string>> = { xs: '4', md: '6' }
): string {
  return responsiveGrid(columns, gap);
}