import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BREAKPOINTS, BreakpointKey, DeviceType } from '@/hooks/useBreakpoint';

/**
 * Touch target size constants based on accessibility guidelines
 */
export const TOUCH_TARGET = {
  MINIMUM: 44, // Minimum touch target size in pixels (WCAG AA)
  COMFORTABLE: 48, // Comfortable touch target size in pixels
  SPACING: 8, // Minimum spacing between touch targets
} as const;

/**
 * Responsive spacing constants
 */
export const RESPONSIVE_SPACING = {
  mobile: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  tablet: {
    xs: '6px',
    sm: '12px',
    md: '20px',
    lg: '28px',
    xl: '36px',
  },
  desktop: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  },
} as const;

/**
 * Validates if an element meets minimum touch target size requirements
 */
export interface TouchTargetValidationResult {
  isValid: boolean;
  width: number;
  height: number;
  minSize: number;
  suggestions: string[];
}

export const validateTouchTarget = (
  element: HTMLElement,
  minSize: number = TOUCH_TARGET.MINIMUM
): TouchTargetValidationResult => {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const isValid = width >= minSize && height >= minSize;
  
  const suggestions: string[] = [];
  
  if (width < minSize) {
    suggestions.push(`Increase width to at least ${minSize}px (current: ${width}px)`);
  }
  
  if (height < minSize) {
    suggestions.push(`Increase height to at least ${minSize}px (current: ${height}px)`);
  }
  
  if (!isValid) {
    suggestions.push(`Consider using padding or min-width/min-height CSS properties`);
  }

  return {
    isValid,
    width,
    height,
    minSize,
    suggestions,
  };
};

/**
 * Validates touch target spacing between elements
 */
export const validateTouchTargetSpacing = (
  element1: HTMLElement,
  element2: HTMLElement,
  minSpacing: number = TOUCH_TARGET.SPACING
): { isValid: boolean; distance: number; minSpacing: number } => {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();
  
  // Calculate minimum distance between rectangles
  const horizontalDistance = Math.max(0, 
    Math.max(rect1.left - rect2.right, rect2.left - rect1.right)
  );
  const verticalDistance = Math.max(0,
    Math.max(rect1.top - rect2.bottom, rect2.top - rect1.bottom)
  );
  
  const distance = Math.min(horizontalDistance, verticalDistance);
  const isValid = distance >= minSpacing;
  
  return {
    isValid,
    distance,
    minSpacing,
  };
};

/**
 * Responsive class name generation utilities
 */
export interface ResponsiveClassConfig {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  base?: string;
}

/**
 * Generates responsive class names based on device type
 */
export const generateResponsiveClasses = (config: ResponsiveClassConfig): string => {
  const classes: string[] = [];
  
  // Add base classes (applied to all breakpoints)
  if (config.base) {
    classes.push(config.base);
  }
  
  // Add mobile classes (xs and sm breakpoints)
  if (config.mobile) {
    classes.push(config.mobile);
  }
  
  // Add tablet classes (md breakpoint)
  if (config.tablet) {
    classes.push(`md:${config.tablet}`);
  }
  
  // Add desktop classes (lg and above)
  if (config.desktop) {
    classes.push(`lg:${config.desktop}`);
  }
  
  return classes.join(' ');
};

/**
 * Generates responsive padding classes
 */
export const generateResponsivePadding = (
  mobile: keyof typeof RESPONSIVE_SPACING.mobile = 'md',
  tablet?: keyof typeof RESPONSIVE_SPACING.tablet,
  desktop?: keyof typeof RESPONSIVE_SPACING.desktop
): string => {
  const mobileClass = `p-${mobile}`;
  const tabletClass = tablet ? `md:p-${tablet}` : '';
  const desktopClass = desktop ? `lg:p-${desktop}` : '';
  
  return [mobileClass, tabletClass, desktopClass].filter(Boolean).join(' ');
};

/**
 * Generates responsive margin classes
 */
export const generateResponsiveMargin = (
  mobile: keyof typeof RESPONSIVE_SPACING.mobile = 'md',
  tablet?: keyof typeof RESPONSIVE_SPACING.tablet,
  desktop?: keyof typeof RESPONSIVE_SPACING.desktop
): string => {
  const mobileClass = `m-${mobile}`;
  const tabletClass = tablet ? `md:m-${tablet}` : '';
  const desktopClass = desktop ? `lg:m-${desktop}` : '';
  
  return [mobileClass, tabletClass, desktopClass].filter(Boolean).join(' ');
};

/**
 * Generates responsive text size classes
 */
export const generateResponsiveText = (
  mobile: string = 'text-base',
  tablet?: string,
  desktop?: string
): string => {
  const classes = [mobile];
  
  if (tablet) {
    classes.push(`md:${tablet}`);
  }
  
  if (desktop) {
    classes.push(`lg:${desktop}`);
  }
  
  return classes.join(' ');
};

/**
 * Generates responsive grid classes
 */
export const generateResponsiveGrid = (
  mobileCols: number = 1,
  tabletCols?: number,
  desktopCols?: number
): string => {
  const classes = [`grid-cols-${mobileCols}`];
  
  if (tabletCols) {
    classes.push(`md:grid-cols-${tabletCols}`);
  }
  
  if (desktopCols) {
    classes.push(`lg:grid-cols-${desktopCols}`);
  }
  
  return `grid ${classes.join(' ')}`;
};

/**
 * Utility function to combine class names with proper merging
 * Similar to cn() utility but specifically for responsive classes
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

/**
 * Generates touch-friendly button classes
 */
export const generateTouchButtonClasses = (
  size: 'sm' | 'md' | 'lg' = 'md',
  variant: 'primary' | 'secondary' | 'ghost' = 'primary'
): string => {
  const sizeClasses = {
    sm: 'min-h-[44px] px-3 py-2 text-sm',
    md: 'min-h-[48px] px-4 py-3 text-base',
    lg: 'min-h-[52px] px-6 py-4 text-lg',
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
  };
  
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  return cn(baseClasses, sizeClasses[size], variantClasses[variant]);
};

/**
 * Generates responsive container classes
 */
export const generateResponsiveContainer = (
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' = 'lg'
): string => {
  const baseClasses = 'mx-auto px-4 sm:px-6';
  const maxWidthClass = maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth}`;
  
  return cn(baseClasses, maxWidthClass);
};

/**
 * Checks if current viewport matches mobile breakpoint
 */
export const isMobileViewport = (width: number): boolean => {
  return width < BREAKPOINTS.md;
};

/**
 * Checks if current viewport matches tablet breakpoint
 */
export const isTabletViewport = (width: number): boolean => {
  return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
};

/**
 * Checks if current viewport matches desktop breakpoint
 */
export const isDesktopViewport = (width: number): boolean => {
  return width >= BREAKPOINTS.lg;
};

/**
 * Gets device type from viewport width
 */
export const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
};

/**
 * Generates responsive visibility classes
 */
export const generateResponsiveVisibility = (
  mobile: boolean = true,
  tablet?: boolean,
  desktop?: boolean
): string => {
  const classes: string[] = [];
  
  // Mobile visibility
  classes.push(mobile ? 'block' : 'hidden');
  
  // Tablet visibility
  if (tablet !== undefined) {
    classes.push(tablet ? 'md:block' : 'md:hidden');
  }
  
  // Desktop visibility
  if (desktop !== undefined) {
    classes.push(desktop ? 'lg:block' : 'lg:hidden');
  }
  
  return classes.join(' ');
};