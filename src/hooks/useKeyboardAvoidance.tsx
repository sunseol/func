'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useBreakpoint } from './useBreakpoint';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  animationDuration: number;
}

interface UseKeyboardAvoidanceOptions {
  enabled?: boolean;
  offset?: number;
  animationDuration?: number;
}

/**
 * Hook to handle virtual keyboard appearance and avoid input field occlusion
 * Detects keyboard visibility and adjusts viewport accordingly
 */
export const useKeyboardAvoidance = (options: UseKeyboardAvoidanceOptions = {}) => {
  const {
    enabled = true,
    offset = 20,
    animationDuration = 300
  } = options;

  const { isMobile } = useBreakpoint();
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    animationDuration
  });

  const initialViewportHeight = useRef<number>(0);
  const currentFocusedElement = useRef<HTMLElement | null>(null);

  // Initialize viewport height on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initialViewportHeight.current = window.innerHeight;
    }
  }, []);

  // Detect keyboard visibility by monitoring viewport height changes
  useEffect(() => {
    if (!enabled || !isMobile || typeof window === 'undefined') {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight.current - currentHeight;
      
      // Clear any existing timeout
      clearTimeout(timeoutId);
      
      // Debounce the resize event to avoid rapid state changes
      timeoutId = setTimeout(() => {
        // Consider keyboard visible if viewport height decreased by more than 150px
        // This threshold helps distinguish between keyboard and other UI changes
        const isKeyboardVisible = heightDifference > 150;
        const keyboardHeight = isKeyboardVisible ? heightDifference : 0;

        setKeyboardState(prev => ({
          ...prev,
          isVisible: isKeyboardVisible,
          height: keyboardHeight
        }));

        // If keyboard became visible and there's a focused element, scroll to it
        if (isKeyboardVisible && currentFocusedElement.current) {
          scrollToElement(currentFocusedElement.current);
        }
      }, 100);
    };

    // Handle focus events to track currently focused input
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      
      // Only track input elements
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      )) {
        currentFocusedElement.current = target;
        
        // Small delay to allow keyboard to appear
        setTimeout(() => {
          if (keyboardState.isVisible) {
            scrollToElement(target);
          }
        }, 300);
      }
    };

    const handleFocusOut = () => {
      currentFocusedElement.current = null;
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // iOS specific: listen for visual viewport changes (more reliable on iOS)
    if ('visualViewport' in window) {
      const visualViewport = window.visualViewport!;
      
      const handleVisualViewportChange = () => {
        const heightDifference = initialViewportHeight.current - visualViewport.height;
        const isKeyboardVisible = heightDifference > 150;
        
        setKeyboardState(prev => ({
          ...prev,
          isVisible: isKeyboardVisible,
          height: isKeyboardVisible ? heightDifference : 0
        }));

        if (isKeyboardVisible && currentFocusedElement.current) {
          scrollToElement(currentFocusedElement.current);
        }
      };

      visualViewport.addEventListener('resize', handleVisualViewportChange);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
        visualViewport.removeEventListener('resize', handleVisualViewportChange);
      };
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [enabled, isMobile, keyboardState.isVisible]);

  // Function to scroll element into view above keyboard
  const scrollToElement = useCallback((element: HTMLElement) => {
    if (!element || !keyboardState.isVisible) return;

    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const keyboardTop = viewportHeight - keyboardState.height;
    
    // Calculate if element is hidden behind keyboard
    const elementBottom = elementRect.bottom + offset;
    
    if (elementBottom > keyboardTop) {
      // Calculate how much to scroll
      const scrollAmount = elementBottom - keyboardTop;
      
      // Smooth scroll to bring element into view
      window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [keyboardState.isVisible, keyboardState.height, offset]);

  // Function to manually trigger scroll to focused element
  const scrollToFocusedElement = useCallback(() => {
    if (currentFocusedElement.current) {
      scrollToElement(currentFocusedElement.current);
    }
  }, [scrollToElement]);

  // Function to get safe area styles for fixed positioned elements
  const getSafeAreaStyles = useCallback((): React.CSSProperties => {
    if (!keyboardState.isVisible) {
      return {};
    }

    return {
      paddingBottom: `${keyboardState.height}px`,
      transition: `padding-bottom ${animationDuration}ms ease-in-out`
    };
  }, [keyboardState.isVisible, keyboardState.height, animationDuration]);

  // Function to get viewport adjusted height
  const getAdjustedViewportHeight = useCallback(() => {
    if (!keyboardState.isVisible) {
      return window.innerHeight;
    }
    
    return window.innerHeight - keyboardState.height;
  }, [keyboardState.isVisible, keyboardState.height]);

  return {
    keyboardState,
    scrollToFocusedElement,
    getSafeAreaStyles,
    getAdjustedViewportHeight,
    isKeyboardVisible: keyboardState.isVisible,
    keyboardHeight: keyboardState.height
  };
};

/**
 * Hook specifically for form containers that need keyboard avoidance
 */
export const useFormKeyboardAvoidance = (formRef: React.RefObject<HTMLElement>) => {
  const keyboardAvoidance = useKeyboardAvoidance();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!isMobile || !formRef.current || !keyboardAvoidance.isKeyboardVisible) {
      return;
    }

    const formElement = formRef.current;
    const formRect = formElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const keyboardTop = viewportHeight - keyboardAvoidance.keyboardHeight;

    // If form extends below keyboard, scroll it into view
    if (formRect.bottom > keyboardTop) {
      const scrollAmount = formRect.bottom - keyboardTop + 20; // 20px buffer
      
      window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [keyboardAvoidance.isKeyboardVisible, keyboardAvoidance.keyboardHeight, isMobile, formRef]);

  return keyboardAvoidance;
};

/**
 * React component wrapper that applies keyboard avoidance styles
 */
interface KeyboardAvoidanceWrapperProps {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export const KeyboardAvoidanceWrapper: React.FC<KeyboardAvoidanceWrapperProps> = ({
  children,
  className = '',
  enabled = true
}) => {
  const { getSafeAreaStyles } = useKeyboardAvoidance({ enabled });

  return (
    <div 
      className={className}
      style={getSafeAreaStyles()}
    >
      {children}
    </div>
  );
};


