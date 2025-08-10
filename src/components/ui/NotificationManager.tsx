'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useViewport } from '@/contexts/ViewportContext';
import { useToast, Toast, ToastPriority } from '@/contexts/ToastContext';
import { NotificationStack } from './NotificationStack';
import { useNotificationQueue } from '@/hooks/useNotificationQueue';

interface NotificationManagerProps {
  position?: 'top' | 'bottom';
  maxToasts?: number;
  maxPriorityNotifications?: number;
  enableQueue?: boolean;
}

/**
 * Comprehensive notification manager with intelligent queue management
 * Prevents notification overflow and ensures optimal user experience
 */
export const NotificationManager: React.FC<NotificationManagerProps> = ({
  position = 'top',
  maxToasts = 3,
  maxPriorityNotifications = 2,
  enableQueue = true
}) => {
  const { toasts, removeToast } = useToast();
  const { isMobile, height: screenHeight } = useViewport();
  const [mounted, setMounted] = useState(false);
  const [displayedToasts, setDisplayedToasts] = useState<Toast[]>([]);

  // Initialize notification queue
  const {
    enqueue,
    dequeue,
    processNext,
    clearQueue,
    getQueueStats,
    canProcess
  } = useNotificationQueue({
    maxConcurrent: maxToasts + maxPriorityNotifications,
    maxQueue: 20,
    priorityWeights: { high: 3, medium: 2, low: 1 }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle new toasts from context
  useEffect(() => {
    if (!enableQueue) {
      setDisplayedToasts(toasts);
      return;
    }

    // Process new toasts through queue
    const newToasts = toasts.filter(toast => 
      !displayedToasts.some(displayed => displayed.id === toast.id)
    );

    newToasts.forEach(toast => {
      enqueue(toast);
    });

    // Process queue
    if (canProcess) {
      processNext((notification) => {
        setDisplayedToasts(prev => {
          // Prevent duplicates
          if (prev.some(t => t.id === notification.id)) return prev;
          
          // Apply limits based on priority
          const priorityNotifications = prev.filter(t => 
            t.priority === 'high' || (t.priority === 'medium' && t.persistent)
          );
          const regularNotifications = prev.filter(t => 
            t.priority !== 'high' && !(t.priority === 'medium' && t.persistent)
          );

          let newList = [...prev, notification];

          // Apply priority limits
          if (notification.priority === 'high' || (notification.priority === 'medium' && notification.persistent)) {
            if (priorityNotifications.length >= maxPriorityNotifications) {
              // Remove oldest priority notification
              const oldestPriority = priorityNotifications[priorityNotifications.length - 1];
              newList = newList.filter(t => t.id !== oldestPriority.id);
            }
          } else {
            if (regularNotifications.length >= maxToasts) {
              // Remove oldest regular notification
              const oldestRegular = regularNotifications[regularNotifications.length - 1];
              newList = newList.filter(t => t.id !== oldestRegular.id);
            }
          }

          return newList;
        });
      });
    }
  }, [toasts, displayedToasts, enableQueue, enqueue, processNext, canProcess, maxToasts, maxPriorityNotifications]);

  // Handle toast removal
  const handleRemove = useCallback((id: string) => {
    removeToast(id);
    dequeue(id);
    setDisplayedToasts(prev => prev.filter(t => t.id !== id));
  }, [removeToast, dequeue]);

  // Handle notification actions
  const handleNotificationAction = useCallback((id: string, actionType: string) => {
    switch (actionType) {
      case 'dismiss':
        handleRemove(id);
        break;
      case 'snooze':
        // Remove from display but re-queue with delay
        const toast = displayedToasts.find(t => t.id === id);
        if (toast) {
          handleRemove(id);
          setTimeout(() => {
            enqueue({ ...toast, id: `${toast.id}_snoozed_${Date.now()}` }, 300000); // 5 minutes
          }, 1000);
        }
        break;
      case 'clear_all':
        displayedToasts.forEach(t => handleRemove(t.id));
        clearQueue();
        break;
      default:
        break;
    }
  }, [displayedToasts, handleRemove, enqueue, clearQueue]);

  if (!mounted || displayedToasts.length === 0) {
    return null;
  }

  // Calculate dynamic max visible based on screen height
  const dynamicMaxVisible = isMobile && screenHeight ? 
    Math.min(Math.floor(screenHeight * 0.6 / 80), maxToasts + maxPriorityNotifications) :
    maxToasts + maxPriorityNotifications;

  return (
    <NotificationStack
      notifications={displayedToasts}
      onRemove={handleRemove}
      onAction={handleNotificationAction}
      position={position}
      maxVisible={dynamicMaxVisible}
      stackSpacing={isMobile ? 8 : 12}
    />
  );
};



export default NotificationManager;