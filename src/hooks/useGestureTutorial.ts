'use client';

import { useState, useEffect, useCallback } from 'react';
import { useViewport } from '@/contexts/ViewportContext';

const TUTORIAL_STORAGE_KEY = 'gesture-tutorial-completed';

/**
 * Hook for managing gesture tutorial state
 * Handles showing tutorial to new users and remembering completion
 */
export const useGestureTutorial = () => {
  const { isTouch, isMobile } = useViewport();
  const [showTutorial, setShowTutorial] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if tutorial has been completed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
    setIsCompleted(completed);
    
    // Show tutorial for new touch device users
    if (!completed && isTouch && isMobile) {
      // Delay showing tutorial to avoid overwhelming user
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isTouch, isMobile]);

  // Mark tutorial as completed
  const completeTutorial = useCallback(() => {
    setIsCompleted(true);
    setShowTutorial(false);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
  }, []);

  // Reset tutorial (for testing or user request)
  const resetTutorial = useCallback(() => {
    setIsCompleted(false);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
  }, []);

  // Manually show tutorial
  const showTutorialManually = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // Hide tutorial without completing
  const hideTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  return {
    showTutorial,
    isCompleted,
    completeTutorial,
    resetTutorial,
    showTutorialManually,
    hideTutorial,
    shouldShowTutorial: !isCompleted && isTouch && isMobile
  };
};

export default useGestureTutorial;