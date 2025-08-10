'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Toast, ToastPriority } from '@/contexts/ToastContext';

interface QueuedNotification extends Toast {
  queuedAt: number;
  attempts: number;
  delay?: number;
}

interface NotificationQueueOptions {
  maxConcurrent?: number;
  maxQueue?: number;
  priorityWeights?: Record<ToastPriority, number>;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Hook for managing notification queue with priority-based processing
 * Prevents notification spam and ensures important notifications are shown
 */
export const useNotificationQueue = (options: NotificationQueueOptions = {}) => {
  const {
    maxConcurrent = 3,
    maxQueue = 10,
    priorityWeights = { high: 3, medium: 2, low: 1 },
    retryAttempts = 2,
    retryDelay = 1000
  } = options;

  const [queue, setQueue] = useState<QueuedNotification[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const processingRef = useRef(processing);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update ref when processing state changes
  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  // Priority-based sorting function
  const sortByPriority = useCallback((notifications: QueuedNotification[]) => {
    return [...notifications].sort((a, b) => {
      // First sort by priority weight
      const priorityDiff = (priorityWeights[b.priority || 'low'] || 1) - 
                          (priorityWeights[a.priority || 'low'] || 1);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by queue time (older first)
      return a.queuedAt - b.queuedAt;
    });
  }, [priorityWeights]);

  // Add notification to queue
  const enqueue = useCallback((notification: Toast, delay = 0) => {
    const queuedNotification: QueuedNotification = {
      ...notification,
      queuedAt: Date.now(),
      attempts: 0,
      delay
    };

    setQueue(prev => {
      // Check if queue is full
      if (prev.length >= maxQueue) {
        // Remove lowest priority notification if queue is full
        const sorted = sortByPriority(prev);
        const filtered = sorted.slice(0, maxQueue - 1);
        return sortByPriority([...filtered, queuedNotification]);
      }

      return sortByPriority([...prev, queuedNotification]);
    });

    return queuedNotification.id;
  }, [maxQueue, sortByPriority]);

  // Remove notification from queue
  const dequeue = useCallback((id: string) => {
    setQueue(prev => prev.filter(n => n.id !== id));
    setProcessing(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    // Clear any pending timeouts
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // Process next notification in queue
  const processNext = useCallback((onShow: (notification: Toast) => void) => {
    setQueue(prev => {
      const available = prev.filter(n => !processingRef.current.has(n.id));
      if (available.length === 0 || processingRef.current.size >= maxConcurrent) {
        return prev;
      }

      const sorted = sortByPriority(available);
      const next = sorted[0];

      if (next) {
        // Mark as processing
        setProcessing(current => new Set([...current, next.id]));

        // Handle delayed notifications
        if (next.delay && next.delay > 0) {
          const timeout = setTimeout(() => {
            onShow(next);
            timeoutRefs.current.delete(next.id);
          }, next.delay);
          
          timeoutRefs.current.set(next.id, timeout);
        } else {
          onShow(next);
        }

        // Remove from queue
        return prev.filter(n => n.id !== next.id);
      }

      return prev;
    });
  }, [maxConcurrent, sortByPriority]);

  // Retry failed notification
  const retry = useCallback((notification: QueuedNotification, onShow: (notification: Toast) => void) => {
    if (notification.attempts < retryAttempts) {
      const retryNotification = {
        ...notification,
        attempts: notification.attempts + 1,
        delay: retryDelay * Math.pow(2, notification.attempts) // Exponential backoff
      };

      enqueue(retryNotification, retryNotification.delay);
    }
  }, [retryAttempts, retryDelay, enqueue]);

  // Clear all notifications
  const clearQueue = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();

    setQueue([]);
    setProcessing(new Set());
  }, []);

  // Clear notifications by priority
  const clearByPriority = useCallback((priority: ToastPriority) => {
    setQueue(prev => prev.filter(n => n.priority !== priority));
  }, []);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const stats = {
      total: queue.length,
      processing: processing.size,
      byPriority: queue.reduce((acc, n) => {
        const priority = n.priority || 'low';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<ToastPriority, number>)
    };

    return stats;
  }, [queue, processing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  return {
    queue: sortByPriority(queue),
    processing: Array.from(processing),
    enqueue,
    dequeue,
    processNext,
    retry,
    clearQueue,
    clearByPriority,
    getQueueStats,
    canProcess: processing.size < maxConcurrent,
    isQueueFull: queue.length >= maxQueue
  };
};

export default useNotificationQueue;