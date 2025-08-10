import { useState, useEffect, useCallback } from 'react';

// Tailwind CSS breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface BreakpointState {
  current: BreakpointKey | 'xs';
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;
}

/**
 * Custom hook to detect current breakpoint and screen size
 * Optimized for minimal re-renders by only updating when breakpoint actually changes
 */
export const useBreakpoint = (): BreakpointState => {
  const [breakpointState, setBreakpointState] = useState<BreakpointState>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        current: 'lg',
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    return createBreakpointState(width, height);
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const newState = createBreakpointState(width, height);
    
    // Only update state if breakpoint actually changed to prevent unnecessary re-renders
    setBreakpointState(prevState => {
      if (prevState.current !== newState.current || 
          prevState.deviceType !== newState.deviceType) {
        return newState;
      }
      return prevState;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial state on client
    const width = window.innerWidth;
    const height = window.innerHeight;
    setBreakpointState(createBreakpointState(width, height));

    // Use throttled resize handler for better performance
    let timeoutId: NodeJS.Timeout;
    const throttledResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', throttledResize);
    
    return () => {
      window.removeEventListener('resize', throttledResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  return breakpointState;
};

/**
 * Helper function to create breakpoint state from dimensions
 */
function createBreakpointState(width: number, height: number): BreakpointState {
  let current: BreakpointKey | 'xs' = 'xs';
  let deviceType: DeviceType = 'mobile';

  // Determine current breakpoint
  if (width >= BREAKPOINTS['2xl']) {
    current = '2xl';
    deviceType = 'desktop';
  } else if (width >= BREAKPOINTS.xl) {
    current = 'xl';
    deviceType = 'desktop';
  } else if (width >= BREAKPOINTS.lg) {
    current = 'lg';
    deviceType = 'desktop';
  } else if (width >= BREAKPOINTS.md) {
    current = 'md';
    deviceType = 'tablet';
  } else if (width >= BREAKPOINTS.sm) {
    current = 'sm';
    deviceType = 'tablet';
  } else {
    current = 'xs';
    deviceType = 'mobile';
  }

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  return {
    current,
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
  };
}

/**
 * Hook to check if current breakpoint matches given breakpoint(s)
 */
export const useBreakpointMatch = (
  breakpoints: BreakpointKey | BreakpointKey[] | 'xs'
): boolean => {
  const { current } = useBreakpoint();
  
  if (Array.isArray(breakpoints)) {
    return breakpoints.includes(current as BreakpointKey);
  }
  
  return current === breakpoints;
};

/**
 * Hook to get media query string for given breakpoint
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
};