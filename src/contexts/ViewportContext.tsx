'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useBreakpoint, BreakpointState } from '@/hooks/useBreakpoint';

export interface ViewportContextValue extends BreakpointState {
  isTouch: boolean;
  hasHover: boolean;
  orientation: 'portrait' | 'landscape';
  isOnline: boolean;
}

const ViewportContext = createContext<ViewportContextValue | undefined>(undefined);

interface ViewportProviderProps {
  children: ReactNode;
}

/**
 * ViewportProvider - Global context for responsive design state
 * Provides breakpoint information, touch device detection, and hover support
 */
export const ViewportProvider: React.FC<ViewportProviderProps> = ({ children }) => {
  const breakpointState = useBreakpoint();
  const [isTouch, setIsTouch] = useState(false);
  const [hasHover, setHasHover] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect touch device capabilities
    const detectTouchDevice = () => {
      // Check for touch events support
      const hasTouchEvents = 'ontouchstart' in window;
      
      // Check for pointer events with touch capability
      const hasPointerEvents = 'onpointerdown' in window && 
        window.navigator.maxTouchPoints > 0;
      
      // Check for mobile user agent patterns
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
        .test(window.navigator.userAgent);
      
      return hasTouchEvents || hasPointerEvents || isMobileUserAgent;
    };

    // Detect hover support
    const detectHoverSupport = () => {
      // Use CSS media query to detect hover capability
      if (window.matchMedia) {
        return window.matchMedia('(hover: hover)').matches;
      }
      // Fallback: assume hover support on non-touch devices
      return !detectTouchDevice();
    };

    // Detect orientation
    const detectOrientation = () => {
      if (window.screen && window.screen.orientation) {
        return window.screen.orientation.angle === 0 || window.screen.orientation.angle === 180
          ? 'portrait' : 'landscape';
      }
      // Fallback to window dimensions
      return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    };

    // Set initial values
    setIsTouch(detectTouchDevice());
    setHasHover(detectHoverSupport());
    setOrientation(detectOrientation());
    setIsOnline(navigator.onLine);

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Use setTimeout to ensure dimensions are updated after orientation change
      setTimeout(() => {
        setOrientation(detectOrientation());
      }, 100);
    };

    // Listen for online/offline status
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    const handleOfflineStatus = () => setIsOnline(false);

    // Listen for hover capability changes (rare but possible)
    const hoverMediaQuery = window.matchMedia('(hover: hover)');
    const handleHoverChange = (e: MediaQueryListEvent) => {
      setHasHover(e.matches);
    };

    // Add event listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    if (hoverMediaQuery.addEventListener) {
      hoverMediaQuery.addEventListener('change', handleHoverChange);
    } else {
      // Fallback for older browsers
      hoverMediaQuery.addListener(handleHoverChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
      
      if (hoverMediaQuery.removeEventListener) {
        hoverMediaQuery.removeEventListener('change', handleHoverChange);
      } else {
        hoverMediaQuery.removeListener(handleHoverChange);
      }
    };
  }, []);

  const contextValue: ViewportContextValue = {
    ...breakpointState,
    isTouch,
    hasHover,
    orientation,
    isOnline,
  };

  return (
    <ViewportContext.Provider value={contextValue}>
      {children}
    </ViewportContext.Provider>
  );
};

/**
 * Hook to access viewport context
 * Throws error if used outside of ViewportProvider
 */
export const useViewport = (): ViewportContextValue => {
  const context = useContext(ViewportContext);
  
  if (context === undefined) {
    throw new Error('useViewport must be used within a ViewportProvider');
  }
  
  return context;
};

/**
 * Hook to check if device supports touch
 */
export const useIsTouch = (): boolean => {
  const { isTouch } = useViewport();
  return isTouch;
};

/**
 * Hook to check if device supports hover
 */
export const useHasHover = (): boolean => {
  const { hasHover } = useViewport();
  return hasHover;
};

/**
 * Hook to get current orientation
 */
export const useOrientation = (): 'portrait' | 'landscape' => {
  const { orientation } = useViewport();
  return orientation;
};

/**
 * Hook to check online status
 */
export const useIsOnline = (): boolean => {
  const { isOnline } = useViewport();
  return isOnline;
};