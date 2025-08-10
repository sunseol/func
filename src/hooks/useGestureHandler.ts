'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useViewport } from '@/contexts/ViewportContext';

interface GestureState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

interface GestureHandlerOptions {
  threshold?: number;
  velocityThreshold?: number;
  preventScroll?: boolean;
  hapticFeedback?: boolean;
  onSwipeStart?: (state: GestureState) => void;
  onSwipeMove?: (state: GestureState) => void;
  onSwipeEnd?: (state: GestureState) => void;
  onSwipeLeft?: (state: GestureState) => void;
  onSwipeRight?: (state: GestureState) => void;
  onSwipeUp?: (state: GestureState) => void;
  onSwipeDown?: (state: GestureState) => void;
  onTap?: (state: GestureState) => void;
  onLongPress?: (state: GestureState) => void;
}

/**
 * Advanced gesture handler hook for touch interactions
 * Supports swipe, tap, and long press gestures with haptic feedback
 */
export const useGestureHandler = (options: GestureHandlerOptions = {}) => {
  const {
    threshold = 50,
    velocityThreshold = 0.5,
    preventScroll = false,
    hapticFeedback = true,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onLongPress
  } = options;

  const { isTouch } = useViewport();
  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null,
    distance: 0
  });

  const startTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const velocityTrackerRef = useRef<Array<{ time: number; x: number; y: number }>>([]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if (hapticFeedback && 'vibrate' in navigator && isTouch) {
      navigator.vibrate(pattern);
    }
  }, [hapticFeedback, isTouch]);

  // Calculate velocity
  const calculateVelocity = useCallback((currentX: number, currentY: number) => {
    const now = Date.now();
    const tracker = velocityTrackerRef.current;
    
    // Add current position to tracker
    tracker.push({ time: now, x: currentX, y: currentY });
    
    // Keep only recent positions (last 100ms)
    const recentPositions = tracker.filter(pos => now - pos.time <= 100);
    velocityTrackerRef.current = recentPositions;
    
    if (recentPositions.length < 2) return 0;
    
    const first = recentPositions[0];
    const last = recentPositions[recentPositions.length - 1];
    const timeDiff = last.time - first.time;
    
    if (timeDiff === 0) return 0;
    
    const distance = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    );
    
    return distance / timeDiff;
  }, []);

  // Determine swipe direction
  const getDirection = useCallback((deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' | null => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (Math.max(absX, absY) < threshold) return null;
    
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, [threshold]);

  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouch) return;
    
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    startTimeRef.current = Date.now();
    velocityTrackerRef.current = [{ time: startTimeRef.current, x: startX, y: startY }];
    
    const newState: GestureState = {
      isActive: true,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
      distance: 0
    };
    
    setGestureState(newState);
    onSwipeStart?.(newState);
    
    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        triggerHaptic([50, 50, 100]);
        onLongPress(newState);
      }, 500);
    }
    
    // Light haptic feedback on touch start
    triggerHaptic(10);
  }, [isTouch, onSwipeStart, onLongPress, triggerHaptic]);

  // Touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureState.isActive || !isTouch) return;
    
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - gestureState.startX;
    const deltaY = currentY - gestureState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = calculateVelocity(currentX, currentY);
    const direction = getDirection(deltaX, deltaY);
    
    const newState: GestureState = {
      ...gestureState,
      currentX,
      currentY,
      deltaX,
      deltaY,
      velocity,
      direction,
      distance
    };
    
    setGestureState(newState);
    onSwipeMove?.(newState);
    
    // Cancel long press if moved too much
    if (distance > 10 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // Prevent scroll if needed
    if (preventScroll && distance > 10) {
      e.preventDefault();
    }
    
    // Haptic feedback for significant movement
    if (distance > threshold && direction) {
      triggerHaptic(20);
    }
  }, [gestureState, isTouch, calculateVelocity, getDirection, onSwipeMove, preventScroll, threshold, triggerHaptic]);

  // Touch end handler
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!gestureState.isActive || !isTouch) return;
    
    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;
    const { deltaX, deltaY, velocity, direction, distance } = gestureState;
    
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const finalState: GestureState = {
      ...gestureState,
      isActive: false
    };
    
    setGestureState(finalState);
    onSwipeEnd?.(finalState);
    
    // Determine gesture type
    if (distance < 10 && duration < 300) {
      // Tap gesture
      triggerHaptic(30);
      onTap?.(finalState);
    } else if (direction && (distance > threshold || velocity > velocityThreshold)) {
      // Swipe gesture
      triggerHaptic([40, 20, 60]);
      
      switch (direction) {
        case 'left':
          onSwipeLeft?.(finalState);
          break;
        case 'right':
          onSwipeRight?.(finalState);
          break;
        case 'up':
          onSwipeUp?.(finalState);
          break;
        case 'down':
          onSwipeDown?.(finalState);
          break;
      }
    }
    
    // Reset velocity tracker
    velocityTrackerRef.current = [];
  }, [gestureState, isTouch, threshold, velocityThreshold, onSwipeEnd, onTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, triggerHaptic]);

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTouch) return; // Only handle mouse events on non-touch devices
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    startTimeRef.current = Date.now();
    
    const newState: GestureState = {
      isActive: true,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
      distance: 0
    };
    
    setGestureState(newState);
    onSwipeStart?.(newState);
  }, [isTouch, onSwipeStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gestureState.isActive || isTouch) return;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    const deltaX = currentX - gestureState.startX;
    const deltaY = currentY - gestureState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const direction = getDirection(deltaX, deltaY);
    
    const newState: GestureState = {
      ...gestureState,
      currentX,
      currentY,
      deltaX,
      deltaY,
      direction,
      distance
    };
    
    setGestureState(newState);
    onSwipeMove?.(newState);
  }, [gestureState, isTouch, getDirection, onSwipeMove]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!gestureState.isActive || isTouch) return;
    
    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;
    const { direction, distance } = gestureState;
    
    const finalState: GestureState = {
      ...gestureState,
      isActive: false
    };
    
    setGestureState(finalState);
    onSwipeEnd?.(finalState);
    
    // Handle mouse gestures
    if (distance < 10 && duration < 300) {
      onTap?.(finalState);
    } else if (direction && distance > threshold) {
      switch (direction) {
        case 'left':
          onSwipeLeft?.(finalState);
          break;
        case 'right':
          onSwipeRight?.(finalState);
          break;
        case 'up':
          onSwipeUp?.(finalState);
          break;
        case 'down':
          onSwipeDown?.(finalState);
          break;
      }
    }
  }, [gestureState, isTouch, threshold, onSwipeEnd, onTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    gestureState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
    isGesturing: gestureState.isActive,
    swipeProgress: Math.min(gestureState.distance / threshold, 1),
    swipeDirection: gestureState.direction
  };
};

export default useGestureHandler;