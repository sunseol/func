'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import { Toast, ToastPriority } from '@/contexts/ToastContext';
import { MobileToast } from './MobileToast';
import { PriorityNotification } from './PriorityNotification';

interface NotificationStackProps {
  notifications: Toast[];
  onRemove: (id: string) => void;
  onAction?: (id: string, actionType: string) => void;
  position?: 'top' | 'bottom';
  maxVisible?: number;
  stackSpacing?: number;
}

/**
 * Advanced notification stack manager with intelligent stacking and overflow handling
 * Prevents screen overflow while maintaining notification visibility
 */
export const NotificationStack: React.FC<NotificationStackProps> = ({
  notifications,
  onRemove,
  onAction,
  position = 'top',
  maxVisible = 3,
  stackSpacing = 8
}) => {
  const { isMobile, height: screenHeight } = useViewport();
  const [visibleCount, setVisibleCount] = useState(maxVisible);
  const [stackHeight, setStackHeight] = useState(0);
  const stackRef = useRef<HTMLDivElement>(null);

  // Dynamically adjust visible count based on screen height
  useEffect(() => {
    if (!isMobile || !screenHeight) return;

    // Estimate notification height (mobile: ~80px, desktop: ~60px)
    const estimatedNotificationHeight = isMobile ? 80 : 60;
    const availableHeight = screenHeight * 0.7; // Use 70% of screen height
    const calculatedMaxVisible = Math.floor(availableHeight / estimatedNotificationHeight);
    
    setVisibleCount(Math.min(Math.max(calculatedMaxVisible, 1), maxVisible));
  }, [screenHeight, isMobile, maxVisible]);

  // Monitor actual stack height
  useEffect(() => {
    if (stackRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setStackHeight(entry.contentRect.height);
        }
      });

      observer.observe(stackRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Separate notifications by priority and type
  const prioritizedNotifications = notifications.reduce((acc, notification) => {
    const priority = notification.priority || 'low';
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(notification);
    return acc;
  }, {} as Record<ToastPriority, Toast[]>);

  // Create ordered list with priority-based stacking
  const orderedNotifications = [
    ...(prioritizedNotifications.high || []),
    ...(prioritizedNotifications.medium || []),
    ...(prioritizedNotifications.low || [])
  ];

  // Split into visible and hidden notifications
  const visibleNotifications = orderedNotifications.slice(0, visibleCount);
  const hiddenNotifications = orderedNotifications.slice(visibleCount);

  const handleStackedNotificationClick = () => {
    // Expand stack temporarily or show overflow modal
    if (hiddenNotifications.length > 0) {
      setVisibleCount(Math.min(visibleCount + 2, orderedNotifications.length));
    }
  };

  const handleCollapseStack = () => {
    setVisibleCount(maxVisible);
  };

  if (orderedNotifications.length === 0) return null;

  return (
    <div
      ref={stackRef}
      className={`
        fixed left-0 right-0 z-50 pointer-events-none
        ${position === 'top' ? 'top-0' : 'bottom-0'}
      `}
      style={{
        paddingTop: position === 'top' && isMobile ? 'max(16px, env(safe-area-inset-top))' : '16px',
        paddingBottom: position === 'bottom' && isMobile ? 'max(16px, env(safe-area-inset-bottom))' : '16px',
      }}
    >
      <div
        className={`
          flex ${position === 'top' ? 'flex-col' : 'flex-col-reverse'}
          pointer-events-auto
        `}
        style={{ gap: `${stackSpacing}px` }}
      >
        {/* Visible notifications */}
        {visibleNotifications.map((notification, index) => {
          const isStacked = index >= 2;
          const stackOffset = Math.min(index, 2) * stackSpacing;
          const scaleReduction = Math.min(index * 0.02, 0.1);
          const opacityReduction = Math.min(index * 0.1, 0.3);

          return (
            <div
              key={notification.id}
              className="relative transition-all duration-300 ease-out"
              style={{
                transform: isStacked 
                  ? `translateY(${position === 'top' ? stackOffset : -stackOffset}px) scale(${1 - scaleReduction})`
                  : 'none',
                opacity: 1 - opacityReduction,
                zIndex: visibleNotifications.length - index,
                pointerEvents: isStacked ? 'none' : 'auto',
              }}
            >
              {notification.priority === 'high' || (notification.priority === 'medium' && notification.persistent) ? (
                <PriorityNotification
                  toast={notification}
                  onRemove={onRemove}
                  onAction={onAction}
                />
              ) : (
                <MobileToast
                  toast={notification}
                  onRemove={onRemove}
                  position={position}
                  index={index}
                />
              )}
            </div>
          );
        })}

        {/* Stack overflow indicator */}
        {hiddenNotifications.length > 0 && (
          <StackOverflowIndicator
            count={hiddenNotifications.length}
            onClick={handleStackedNotificationClick}
            onCollapse={visibleCount > maxVisible ? handleCollapseStack : undefined}
            position={position}
          />
        )}

        {/* Stack controls for expanded state */}
        {visibleCount > maxVisible && (
          <StackControls
            onCollapse={handleCollapseStack}
            onClearAll={() => orderedNotifications.forEach(n => onRemove(n.id))}
            position={position}
          />
        )}
      </div>
    </div>
  );
};

// Stack Overflow Indicator Component
interface StackOverflowIndicatorProps {
  count: number;
  onClick: () => void;
  onCollapse?: () => void;
  position: 'top' | 'bottom';
}

const StackOverflowIndicator: React.FC<StackOverflowIndicatorProps> = ({
  count,
  onClick,
  onCollapse,
  position
}) => {
  const { isMobile } = useViewport();

  return (
    <div className="flex justify-center px-4">
      <button
        onClick={onClick}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-full
          bg-gray-100 dark:bg-gray-800 
          text-gray-700 dark:text-gray-300
          hover:bg-gray-200 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-all duration-200
          ${isMobile ? 'text-sm min-h-[44px]' : 'text-xs'}
          shadow-lg border border-gray-200 dark:border-gray-700
        `}
      >
        <div className="flex -space-x-1">
          {[...Array(Math.min(count, 3))].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-current opacity-60"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <span className="font-medium">
          {count}개 더 보기
        </span>
        {onCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            접기
          </button>
        )}
      </button>
    </div>
  );
};

// Stack Controls Component
interface StackControlsProps {
  onCollapse: () => void;
  onClearAll: () => void;
  position: 'top' | 'bottom';
}

const StackControls: React.FC<StackControlsProps> = ({
  onCollapse,
  onClearAll,
  position
}) => {
  const { isMobile } = useViewport();

  return (
    <div className="flex justify-center gap-2 px-4">
      <button
        onClick={onCollapse}
        className={`
          inline-flex items-center px-3 py-2 rounded-lg
          bg-blue-100 dark:bg-blue-900/30 
          text-blue-700 dark:text-blue-300
          hover:bg-blue-200 dark:hover:bg-blue-900/50
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-all duration-200
          ${isMobile ? 'text-sm min-h-[44px]' : 'text-xs'}
          font-medium
        `}
      >
        접기
      </button>
      
      <button
        onClick={onClearAll}
        className={`
          inline-flex items-center px-3 py-2 rounded-lg
          bg-red-100 dark:bg-red-900/30 
          text-red-700 dark:text-red-300
          hover:bg-red-200 dark:hover:bg-red-900/50
          focus:outline-none focus:ring-2 focus:ring-red-500
          transition-all duration-200
          ${isMobile ? 'text-sm min-h-[44px]' : 'text-xs'}
          font-medium
        `}
      >
        모두 지우기
      </button>
    </div>
  );
};

export default NotificationStack;