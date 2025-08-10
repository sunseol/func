import { useState, useCallback, useEffect } from 'react';
import { useViewport } from '@/contexts/ViewportContext';

interface MobileNavigationState {
  isMenuOpen: boolean;
  isUserMenuOpen: boolean;
  overlayVariant: 'fullscreen' | 'drawer';
}

/**
 * Hook to manage mobile navigation state
 * Handles menu opening/closing and variant selection based on screen size
 */
export const useMobileNavigation = () => {
  const { isMobile, isTablet } = useViewport();
  const [state, setState] = useState<MobileNavigationState>({
    isMenuOpen: false,
    isUserMenuOpen: false,
    overlayVariant: 'drawer'
  });

  // Update overlay variant based on screen size
  useEffect(() => {
    setState(prev => ({
      ...prev,
      overlayVariant: isMobile ? 'drawer' : 'fullscreen'
    }));
  }, [isMobile]);

  // Close menus when switching to desktop
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setState(prev => ({
        ...prev,
        isMenuOpen: false,
        isUserMenuOpen: false
      }));
    }
  }, [isMobile, isTablet]);

  const toggleMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMenuOpen: !prev.isMenuOpen,
      isUserMenuOpen: false // Close user menu when opening main menu
    }));
  }, []);

  const closeMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMenuOpen: false
    }));
  }, []);

  const toggleUserMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isUserMenuOpen: !prev.isUserMenuOpen,
      isMenuOpen: false // Close main menu when opening user menu
    }));
  }, []);

  const closeUserMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isUserMenuOpen: false
    }));
  }, []);

  const closeAllMenus = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMenuOpen: false,
      isUserMenuOpen: false
    }));
  }, []);

  return {
    ...state,
    toggleMenu,
    closeMenu,
    toggleUserMenu,
    closeUserMenu,
    closeAllMenus,
    isMobile,
    isTablet
  };
};

export default useMobileNavigation;