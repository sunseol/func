'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useViewport } from '@/contexts/ViewportContext';
import { Toast, ToastType } from '@/contexts/ToastContext';
import { useGestureHandler } from '@/hooks/useGestureHandler';

interface MobileToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
  onSwipeStart?: (id: string) => void;
  onSwipeEnd?: (id: string) => void;
  position?: 'top' | 'bottom';
  index?: number;
}

/**
 * Mobile-optimized toast component with touch gestures and proper sizing
 * Supports swipe-to-dismiss and touch-friendly interactions
 */
export const MobileToast: React.FC<MobileToastProps> = ({
  toast,
  onRemove,
  onSwipeStart,
  onSwipeEnd,
  position = 'top',
  index = 0
}) => {
  const { isMobile, isTouch } = useViewport();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);

  // Show animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  // Gesture handler for swipe-to-dismiss
  const { gestureState, handlers, swipeProgress } = useGestureHandler({
    threshold: 80,
    velocityThreshold: 0.3,
    preventScroll: true,
    hapticFeedback: toast.hapticFeedback !== false,
    onSwipeStart: () => {
      onSwipeStart?.(toast.id);
    },
    onSwipeEnd: () => {
      onSwipeEnd?.(toast.id);
    },
    onSwipeLeft: (state) => {
      if (toast.allowSwipeDismiss !== false && Math.abs(state.deltaX) > 80) {
        handleRemove();
      }
    },
    onSwipeRight: (state) => {
      if (toast.allowSwipeDismiss !== false && Math.abs(state.deltaX) > 80) {
        handleRemove();
      }
    },
    onTap: () => {
      // Handle tap action if defined
      if (toast.action) {
        toast.action.onClick();
      }
    }
  });

  const getToastStyles = (type: ToastType) => {
    const baseStyles = {
      success: {
        containerClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
        iconClass: 'text-green-400 dark:text-green-300',
        icon: CheckCircleIcon
      },
      error: {
        containerClass: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
        iconClass: 'text-red-400 dark:text-red-300',
        icon: XCircleIcon
      },
      warning: {
        containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
        iconClass: 'text-yellow-400 dark:text-yellow-300',
        icon: ExclamationTriangleIcon
      },
      info: {
        containerClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
        iconClass: 'text-blue-400 dark:text-blue-300',
        icon: InformationCircleIcon
      }
    };

    return baseStyles[type] || baseStyles.info;
  };

  const { containerClass, iconClass, icon: Icon } = getToastStyles(toast.type);

  // Calculate transform based on gesture state
  const getTransform = () => {
    if (isRemoving) {
      return position === 'top' ? 'translateY(-100%)' : 'translateY(100%)';
    }
    
    if (!isVisible) {
      return position === 'top' ? 'translateY(-100%)' : 'translateY(100%)';
    }
    
    if (gestureState.isActive && gestureState.deltaX !== 0) {
      const rotation = Math.min(Math.abs(gestureState.deltaX) / 10, 5);
      const rotateDirection = gestureState.deltaX > 0 ? rotation : -rotation;
      return `translateX(${gestureState.deltaX}px) rotate(${rotateDirection}deg)`;
    }
    
    return 'translateX(0)';
  };

  // Calculate opacity based on swipe progress
  const getOpacity = () => {
    if (!isVisible) return 0;
    if (gestureState.isActive && toast.allowSwipeDismiss !== false) {
      return Math.max(0.3, 1 - swipeProgress * 0.7);
    }
    return 1;
  };

  // Mobile-specific styles
  const mobileStyles = isMobile ? {
    // Larger touch targets and padding for mobile
    minHeight: '64px',
    padding: '16px',
    fontSize: '16px', // Prevent zoom on iOS
    // Stack spacing for multiple toasts
    marginBottom: index > 0 ? '8px' : '0',
  } : {};

  return (
    <div
      ref={toastRef}
      className={`
        ${containerClass}
        border rounded-lg shadow-lg
        transition-all duration-300 ease-out
        ${gestureState.isActive ? 'shadow-xl scale-105' : 'hover:shadow-xl'}
        ${isMobile ? 'mx-4' : 'max-w-sm'}
        ${isTouch ? 'select-none' : ''}
        relative overflow-hidden cursor-pointer
      `}
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        ...mobileStyles,
        // Add visual feedback for swipe
        ...(gestureState.isActive && swipeProgress > 0.3 && toast.allowSwipeDismiss !== false ? {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)'
        } : {})
      }}
      {...handlers}
      role="alert"
      aria-live="polite"
    >
      {/* Swipe indicator */}
      {gestureState.isActive && swipeProgress > 0.3 && toast.allowSwipeDismiss !== false && (
        <div className={`
          absolute inset-y-0 flex items-center
          ${gestureState.deltaX > 0 ? 'left-4' : 'right-4'}
          transition-opacity duration-200
        `}>
          <div className="text-red-400 opacity-60 animate-pulse">
            <XMarkIcon className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* Swipe progress indicator */}
      {gestureState.isActive && toast.allowSwipeDismiss !== false && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-200 dark:bg-red-800">
          <div 
            className="h-full bg-red-500 transition-all duration-100"
            style={{ width: `${swipeProgress * 100}%` }}
          />
        </div>
      )}

      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} ${iconClass}`} />
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <p className={`font-medium ${isMobile ? 'text-base' : 'text-sm'} leading-tight`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className={`mt-1 opacity-90 ${isMobile ? 'text-sm' : 'text-xs'} leading-relaxed`}>
              {toast.message}
            </p>
          )}
          
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className={`
                  font-medium underline hover:no-underline 
                  transition-all focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${isMobile ? 'text-sm py-2 px-1 min-h-[44px]' : 'text-xs'}
                `}
                style={{ fontSize: isMobile ? '16px' : undefined }} // Prevent zoom on iOS
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleRemove}
            className={`
              inline-flex text-gray-400 hover:text-gray-600 
              focus:outline-none focus:text-gray-600 transition-colors
              ${isMobile ? 'p-2 min-h-[44px] min-w-[44px]' : 'p-1'}
              rounded-md focus:ring-2 focus:ring-offset-2
            `}
            aria-label="알림 닫기"
          >
            <XMarkIcon className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </button>
        </div>
      </div>

      {/* Progress bar for timed toasts */}
      {!toast.persistent && toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
          <div 
            className="h-full bg-current opacity-30 transition-all ease-linear"
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
              width: '100%'
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default MobileToast;