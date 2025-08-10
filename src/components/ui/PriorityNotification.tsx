'use client';

import React, { useEffect, useState } from 'react';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { 
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  XCircleIcon as XCircleSolid,
  InformationCircleIcon as InformationCircleSolid,
  CheckCircleIcon as CheckCircleSolid
} from '@heroicons/react/24/solid';
import { useViewport } from '@/contexts/ViewportContext';
import { Toast, ToastType, ToastPriority } from '@/contexts/ToastContext';
import { useGestureHandler } from '@/hooks/useGestureHandler';

interface PriorityNotificationProps {
  toast: Toast;
  onRemove: (id: string) => void;
  onAction?: (id: string, actionType: string) => void;
}

/**
 * High-priority notification component for critical alerts
 * Features enhanced visibility, persistent display, and prominent actions
 */
export const PriorityNotification: React.FC<PriorityNotificationProps> = ({
  toast,
  onRemove,
  onAction
}) => {
  const { isMobile, isTouch } = useViewport();
  const [isVisible, setIsVisible] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  // Show animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Stop pulsing after initial attention period
  useEffect(() => {
    if (toast.priority === 'high') {
      const timer = setTimeout(() => setIsPulsing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.priority]);

  const handleRemove = () => {
    setIsRemoving(true);
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  // Gesture handler for priority notifications (more restrictive)
  const { gestureState, handlers, swipeProgress } = useGestureHandler({
    threshold: 120, // Higher threshold for priority notifications
    velocityThreshold: 0.5,
    preventScroll: true,
    hapticFeedback: toast.hapticFeedback !== false,
    onSwipeLeft: (state) => {
      // Only allow dismissal if not critical and swipe is significant
      if (toast.allowSwipeDismiss !== false && 
          toast.priority !== 'high' && 
          Math.abs(state.deltaX) > 120) {
        handleRemove();
      }
    },
    onSwipeRight: (state) => {
      if (toast.allowSwipeDismiss !== false && 
          toast.priority !== 'high' && 
          Math.abs(state.deltaX) > 120) {
        handleRemove();
      }
    },
    onSwipeDown: (state) => {
      // Snooze gesture for priority notifications
      if (Math.abs(state.deltaY) > 100) {
        onAction?.(toast.id, 'snooze');
      }
    },
    onTap: () => {
      if (toast.action) {
        toast.action.onClick();
      }
    },
    onLongPress: () => {
      // Long press to show additional actions
      onAction?.(toast.id, 'show_actions');
    }
  });

  const getNotificationStyles = (type: ToastType, priority: ToastPriority = 'low') => {
    const baseStyles = {
      success: {
        containerClass: 'bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100',
        iconClass: 'text-green-500 dark:text-green-400',
        outlineIcon: CheckCircleIcon,
        solidIcon: CheckCircleSolid,
        accentColor: 'green'
      },
      error: {
        containerClass: 'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100',
        iconClass: 'text-red-500 dark:text-red-400',
        outlineIcon: XCircleIcon,
        solidIcon: XCircleSolid,
        accentColor: 'red'
      },
      warning: {
        containerClass: 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100',
        iconClass: 'text-yellow-500 dark:text-yellow-400',
        outlineIcon: ExclamationTriangleIcon,
        solidIcon: ExclamationTriangleSolid,
        accentColor: 'yellow'
      },
      info: {
        containerClass: 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100',
        iconClass: 'text-blue-500 dark:text-blue-400',
        outlineIcon: InformationCircleIcon,
        solidIcon: InformationCircleSolid,
        accentColor: 'blue'
      }
    };

    const style = baseStyles[type] || baseStyles.info;
    
    // Enhanced styles for high priority
    if (priority === 'high') {
      return {
        ...style,
        containerClass: style.containerClass + ' ring-2 ring-offset-2 ring-current shadow-2xl',
        icon: style.solidIcon, // Use solid icon for high priority
      };
    }

    return {
      ...style,
      icon: style.outlineIcon
    };
  };

  const { containerClass, iconClass, icon: Icon, accentColor } = getNotificationStyles(toast.type, toast.priority);

  // Priority-based sizing and positioning
  const priorityStyles = {
    high: {
      size: isMobile ? 'text-lg' : 'text-base',
      iconSize: isMobile ? 'w-8 h-8' : 'w-6 h-6',
      padding: isMobile ? 'p-6' : 'p-5',
      minHeight: isMobile ? '80px' : '64px',
      borderWidth: 'border-2',
      shadow: 'shadow-2xl'
    },
    medium: {
      size: isMobile ? 'text-base' : 'text-sm',
      iconSize: isMobile ? 'w-7 h-7' : 'w-5 h-5',
      padding: isMobile ? 'p-5' : 'p-4',
      minHeight: isMobile ? '72px' : '56px',
      borderWidth: 'border',
      shadow: 'shadow-xl'
    },
    low: {
      size: isMobile ? 'text-sm' : 'text-xs',
      iconSize: isMobile ? 'w-6 h-6' : 'w-4 h-4',
      padding: isMobile ? 'p-4' : 'p-3',
      minHeight: isMobile ? '64px' : '48px',
      borderWidth: 'border',
      shadow: 'shadow-lg'
    }
  };

  const currentPriorityStyle = priorityStyles[toast.priority || 'low'];

  // Calculate transform based on gesture state
  const getTransform = () => {
    if (isRemoving) {
      return 'translateY(-100%) scale(0.8)';
    }
    
    if (!isVisible) {
      return 'translateY(-20px) scale(0.95)';
    }
    
    if (gestureState.isActive) {
      const { deltaX, deltaY } = gestureState;
      const scale = 1 + Math.min(Math.abs(deltaX) / 1000, 0.05);
      
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        // Vertical swipe (snooze gesture)
        return `translateY(${deltaY * 0.3}px) scale(${scale})`;
      } else if (toast.allowSwipeDismiss !== false && toast.priority !== 'high') {
        // Horizontal swipe (dismiss gesture)
        const rotation = Math.min(Math.abs(deltaX) / 20, 3);
        const rotateDirection = deltaX > 0 ? rotation : -rotation;
        return `translateX(${deltaX * 0.5}px) rotate(${rotateDirection}deg) scale(${scale})`;
      }
    }
    
    return 'translateY(0) scale(1)';
  };

  // Calculate opacity based on gesture
  const getOpacity = () => {
    if (!isVisible) return 0;
    if (gestureState.isActive && toast.allowSwipeDismiss !== false && toast.priority !== 'high') {
      return Math.max(0.4, 1 - swipeProgress * 0.6);
    }
    return 1;
  };

  return (
    <div
      className={`
        ${containerClass}
        ${currentPriorityStyle.borderWidth}
        ${currentPriorityStyle.shadow}
        ${currentPriorityStyle.padding}
        rounded-xl
        transition-all duration-500 ease-out
        ${isPulsing && toast.priority === 'high' ? 'animate-pulse' : ''}
        ${isMobile ? 'mx-4' : 'max-w-md'}
        relative overflow-hidden
        backdrop-blur-sm cursor-pointer
        ${gestureState.isActive ? 'shadow-2xl' : ''}
      `}
      style={{
        minHeight: currentPriorityStyle.minHeight,
        transform: getTransform(),
        opacity: getOpacity(),
      }}
      {...handlers}
      role="alert"
      aria-live={toast.priority === 'high' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Priority indicator bar */}
      {toast.priority === 'high' && (
        <div 
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${accentColor}-400 to-${accentColor}-600`}
          style={{
            background: `linear-gradient(90deg, var(--${accentColor}-400), var(--${accentColor}-600))`
          }}
        />
      )}

      {/* Gesture indicators */}
      {gestureState.isActive && (
        <>
          {/* Swipe to dismiss indicator */}
          {Math.abs(gestureState.deltaX) > 60 && 
           toast.allowSwipeDismiss !== false && 
           toast.priority !== 'high' && (
            <div className={`
              absolute inset-y-0 flex items-center
              ${gestureState.deltaX > 0 ? 'left-4' : 'right-4'}
              transition-opacity duration-200
            `}>
              <div className="text-red-400 opacity-70 animate-pulse">
                <XMarkIcon className="w-8 h-8" />
              </div>
            </div>
          )}

          {/* Swipe down to snooze indicator */}
          {gestureState.deltaY > 60 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="text-yellow-400 opacity-70 animate-bounce">
                <div className="text-xs font-medium">스누즈</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Gesture progress indicators */}
      {gestureState.isActive && (
        <>
          {/* Horizontal swipe progress */}
          {Math.abs(gestureState.deltaX) > 30 && 
           toast.allowSwipeDismiss !== false && 
           toast.priority !== 'high' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-200 dark:bg-red-800">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${Math.min(swipeProgress * 100, 100)}%` }}
              />
            </div>
          )}

          {/* Vertical swipe progress */}
          {Math.abs(gestureState.deltaY) > 30 && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-200 dark:bg-yellow-800">
              <div 
                className="w-full bg-yellow-500 transition-all duration-100"
                style={{ 
                  height: `${Math.min((Math.abs(gestureState.deltaY) / 100) * 100, 100)}%`,
                  transformOrigin: 'top'
                }}
              />
            </div>
          )}
        </>
      )}

      <div className="flex items-start">
        {/* Icon with priority-based styling */}
        <div className="flex-shrink-0 relative">
          <Icon className={`${currentPriorityStyle.iconSize} ${iconClass}`} />
          
          {/* Bell indicator for high priority */}
          {toast.priority === 'high' && (
            <div className="absolute -top-1 -right-1">
              <BellIcon className="w-4 h-4 text-current animate-bounce" />
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-1 min-w-0">
          {/* Title with priority styling */}
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${currentPriorityStyle.size} leading-tight`}>
              {toast.title}
            </h3>
            
            {/* Priority badge */}
            {toast.priority === 'high' && (
              <span className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                bg-${accentColor}-100 text-${accentColor}-800
                dark:bg-${accentColor}-900/50 dark:text-${accentColor}-200
              `}>
                긴급
              </span>
            )}
          </div>
          
          {/* Message */}
          {toast.message && (
            <p className={`mt-2 opacity-90 ${isMobile ? 'text-sm' : 'text-xs'} leading-relaxed`}>
              {toast.message}
            </p>
          )}
          
          {/* Action buttons */}
          {toast.action && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={toast.action.onClick}
                className={`
                  inline-flex items-center px-4 py-2 rounded-lg font-medium
                  bg-current text-white hover:opacity-90
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                  transition-all duration-200
                  ${isMobile ? 'text-sm min-h-[44px]' : 'text-xs'}
                `}
                style={{ fontSize: isMobile ? '16px' : undefined }}
              >
                {toast.action.label}
              </button>
              
              {/* Dismiss button for persistent notifications */}
              {toast.persistent && (
                <button
                  onClick={handleRemove}
                  className={`
                    inline-flex items-center px-3 py-2 rounded-lg font-medium
                    border border-current text-current hover:bg-current hover:text-white
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                    transition-all duration-200
                    ${isMobile ? 'text-sm min-h-[44px]' : 'text-xs'}
                  `}
                >
                  나중에
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Close button */}
        {!toast.persistent && (
          <div className="ml-4 flex-shrink-0">
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
        )}
      </div>

      {/* Progress bar for timed notifications */}
      {!toast.persistent && toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
          <div 
            className="h-full bg-current opacity-40 transition-all ease-linear"
            style={{
              animation: `priority-progress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes priority-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default PriorityNotification;