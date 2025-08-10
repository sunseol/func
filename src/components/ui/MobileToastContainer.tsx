'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useViewport } from '@/contexts/ViewportContext';
import { useToast, Toast } from '@/contexts/ToastContext';
import { MobileToast } from './MobileToast';

interface MobileToastContainerProps {
  position?: 'top' | 'bottom';
  maxToasts?: number;
  stackLimit?: number;
}

/**
 * Mobile-optimized toast container with proper positioning and stacking
 * Handles multiple toasts without overwhelming the mobile screen
 */
export const MobileToastContainer: React.FC<MobileToastContainerProps> = ({
  position = 'top',
  maxToasts = 3,
  stackLimit = 2
}) => {
  const { toasts, removeToast } = useToast();
  const { isMobile, isTouch } = useViewport();
  const [mounted, setMounted] = useState(false);
  const [swipingToasts, setSwipingToasts] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Limit toasts for mobile to prevent screen overflow
  const visibleToasts = isMobile 
    ? toasts.slice(0, maxToasts)
    : toasts;

  // Group toasts by priority for better mobile experience
  const prioritizedToasts = visibleToasts.reduce((acc, toast) => {
    const priority = toast.type === 'error' ? 'high' : 
                    toast.type === 'warning' ? 'medium' : 'low';
    
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(toast);
    return acc;
  }, {} as Record<string, Toast[]>);

  // Show high priority toasts first, then others
  const orderedToasts = [
    ...(prioritizedToasts.high || []),
    ...(prioritizedToasts.medium || []),
    ...(prioritizedToasts.low || [])
  ].slice(0, maxToasts);

  const handleSwipeStart = (toastId: string) => {
    setSwipingToasts(prev => new Set([...prev, toastId]));
  };

  const handleSwipeEnd = (toastId: string) => {
    setSwipingToasts(prev => {
      const newSet = new Set(prev);
      newSet.delete(toastId);
      return newSet;
    });
  };

  if (!mounted || orderedToasts.length === 0) {
    return null;
  }

  const containerStyles = {
    position: 'fixed' as const,
    zIndex: 9999,
    left: 0,
    right: 0,
    ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
    pointerEvents: 'none' as const,
  };

  const toastListStyles = {
    display: 'flex',
    flexDirection: position === 'top' ? 'column' as const : 'column-reverse' as const,
    gap: isMobile ? '8px' : '12px',
    padding: isMobile ? '16px 0' : '16px',
    pointerEvents: 'auto' as const,
    // Safe area insets for mobile devices
    paddingTop: position === 'top' && isMobile ? 'max(16px, env(safe-area-inset-top))' : undefined,
    paddingBottom: position === 'bottom' && isMobile ? 'max(16px, env(safe-area-inset-bottom))' : undefined,
  };

  const content = (
    <div style={containerStyles} role="region" aria-label="알림">
      <div style={toastListStyles}>
        {orderedToasts.map((toast, index) => {
          // Show stacked toasts with reduced opacity and scale
          const isStacked = index >= stackLimit;
          const stackOffset = Math.min(index, stackLimit) * (isMobile ? 4 : 8);
          
          return (
            <div
              key={toast.id}
              style={{
                transform: isStacked ? `translateY(${stackOffset}px) scale(${1 - index * 0.05})` : undefined,
                opacity: isStacked ? Math.max(0.3, 1 - index * 0.2) : 1,
                zIndex: orderedToasts.length - index,
                transition: 'all 0.2s ease-out',
                pointerEvents: isStacked ? 'none' : 'auto',
              }}
            >
              <MobileToast
                toast={toast}
                onRemove={removeToast}
                onSwipeStart={handleSwipeStart}
                onSwipeEnd={handleSwipeEnd}
                position={position}
                index={index}
              />
            </div>
          );
        })}
        
        {/* Show count indicator if there are more toasts */}
        {toasts.length > maxToasts && (
          <div className={`
            text-center py-2 px-4 mx-4 rounded-full
            bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
            text-sm font-medium
            ${isMobile ? 'text-base' : 'text-sm'}
          `}>
            +{toasts.length - maxToasts}개 더 있음
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render outside of component tree
  return createPortal(content, document.body);
};

export default MobileToastContainer;