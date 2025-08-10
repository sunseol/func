import { BREAKPOINTS } from '@/hooks/useBreakpoint';

/**
 * Responsive design type definitions
 */

export type BreakpointKey = keyof typeof BREAKPOINTS;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Responsive value type - allows different values for different breakpoints
 */
export type ResponsiveValue<T> = T | {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  base?: T;
};

/**
 * Touch target validation types
 */
export interface TouchTargetConfig {
  minWidth: number;
  minHeight: number;
  minSpacing: number;
}

export interface TouchValidationOptions {
  minSize?: number;
  checkSpacing?: boolean;
  adjacentElements?: HTMLElement[];
}

/**
 * Responsive component props interface
 */
export interface ResponsiveComponentProps {
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
}

/**
 * Layout configuration types
 */
export interface ResponsiveLayoutConfig {
  container: {
    mobile: {
      padding: string;
      maxWidth: string;
    };
    tablet: {
      padding: string;
      maxWidth: string;
    };
    desktop: {
      padding: string;
      maxWidth: string;
    };
  };
  grid: {
    mobile: {
      columns: number;
      gap: string;
    };
    tablet: {
      columns: number;
      gap: string;
    };
    desktop: {
      columns: number;
      gap: string;
    };
  };
}

/**
 * Typography responsive configuration
 */
export interface ResponsiveTypography {
  fontSize: ResponsiveValue<string>;
  lineHeight: ResponsiveValue<string>;
  fontWeight?: ResponsiveValue<string>;
  letterSpacing?: ResponsiveValue<string>;
}

/**
 * Spacing responsive configuration
 */
export interface ResponsiveSpacing {
  padding?: ResponsiveValue<string>;
  margin?: ResponsiveValue<string>;
  gap?: ResponsiveValue<string>;
}

/**
 * Button responsive configuration
 */
export interface ResponsiveButtonConfig {
  size: ResponsiveValue<'sm' | 'md' | 'lg'>;
  variant: ResponsiveValue<'primary' | 'secondary' | 'ghost'>;
  fullWidth?: ResponsiveValue<boolean>;
}

/**
 * Navigation responsive configuration
 */
export interface ResponsiveNavigationConfig {
  mobile: {
    type: 'hamburger' | 'tabs' | 'drawer';
    position: 'top' | 'bottom';
    overlay: boolean;
  };
  tablet: {
    type: 'horizontal' | 'sidebar' | 'tabs';
    collapsible: boolean;
  };
  desktop: {
    type: 'horizontal' | 'sidebar' | 'mega';
    sticky: boolean;
  };
}

/**
 * Form responsive configuration
 */
export interface ResponsiveFormConfig {
  layout: ResponsiveValue<'vertical' | 'horizontal' | 'inline'>;
  fieldSpacing: ResponsiveValue<string>;
  labelPosition: ResponsiveValue<'top' | 'left' | 'floating'>;
  inputSize: ResponsiveValue<'sm' | 'md' | 'lg'>;
}

/**
 * Table responsive configuration
 */
export interface ResponsiveTableConfig {
  mobile: {
    display: 'cards' | 'scroll' | 'stack';
    visibleColumns: string[];
    expandable: boolean;
  };
  tablet: {
    display: 'table' | 'cards';
    stickyHeader: boolean;
  };
  desktop: {
    display: 'table';
    stickyHeader: boolean;
    stickyColumns?: string[];
  };
}

/**
 * Modal/Dialog responsive configuration
 */
export interface ResponsiveModalConfig {
  mobile: {
    type: 'fullscreen' | 'bottom-sheet' | 'center';
    animation: 'slide' | 'fade' | 'scale';
  };
  tablet: {
    type: 'center' | 'side-panel';
    maxWidth: string;
  };
  desktop: {
    type: 'center' | 'side-panel';
    maxWidth: string;
  };
}

/**
 * Image responsive configuration
 */
export interface ResponsiveImageConfig {
  sizes: string;
  breakpoints: {
    mobile: {
      width: number;
      quality?: number;
    };
    tablet: {
      width: number;
      quality?: number;
    };
    desktop: {
      width: number;
      quality?: number;
    };
  };
}

/**
 * Animation responsive configuration
 */
export interface ResponsiveAnimationConfig {
  mobile: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  tablet: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  desktop: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
}

/**
 * Accessibility responsive configuration
 */
export interface ResponsiveA11yConfig {
  touchTargets: {
    minSize: number;
    minSpacing: number;
  };
  focusManagement: {
    trapFocus: boolean;
    restoreFocus: boolean;
  };
  screenReader: {
    announcements: boolean;
    skipLinks: boolean;
  };
}

/**
 * Performance responsive configuration
 */
export interface ResponsivePerformanceConfig {
  lazyLoading: {
    images: boolean;
    components: boolean;
    threshold: number;
  };
  codesplitting: {
    routes: boolean;
    components: boolean;
  };
  prefetching: {
    enabled: boolean;
    strategy: 'hover' | 'viewport' | 'idle';
  };
}