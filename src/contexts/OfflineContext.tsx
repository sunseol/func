'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OfflineStorage } from '@/components/ui/OfflineIndicator';

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineContextType {
  isOffline: boolean;
  isOnline: boolean;
  pendingActions: OfflineAction[];
  queueAction: (type: string, data: any, maxRetries?: number) => void;
  clearQueue: () => void;
  retryPendingActions: () => Promise<void>;
  getOfflineData: (key: string) => Promise<any>;
  setOfflineData: (key: string, data: any, ttl?: number) => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
  onActionRetry?: (action: OfflineAction) => Promise<boolean>;
  enableQueue?: boolean;
  enableStorage?: boolean;
}

export function OfflineProvider({
  children,
  onActionRetry,
  enableQueue = true,
  enableStorage = true
}: OfflineProviderProps) {
  const { isOnline, isOffline } = useNetworkStatus();
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [storage, setStorage] = useState<OfflineStorage | null>(null);

  // Initialize offline storage
  useEffect(() => {
    if (enableStorage && typeof window !== 'undefined') {
      const offlineStorage = OfflineStorage.getInstance();
      offlineStorage.init().then(() => {
        setStorage(offlineStorage);
      }).catch(err => {
        console.warn('Failed to initialize offline storage:', err);
      });
    }
  }, [enableStorage]);

  // Load pending actions from storage on mount
  useEffect(() => {
    if (storage && enableQueue) {
      loadPendingActions();
    }
  }, [storage, enableQueue]);

  // Save pending actions to storage whenever they change
  useEffect(() => {
    if (storage && enableQueue) {
      savePendingActions();
    }
  }, [pendingActions, storage, enableQueue]);

  // Retry pending actions when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && enableQueue) {
      retryPendingActions();
    }
  }, [isOnline, enableQueue]);

  const loadPendingActions = async () => {
    if (!storage) return;

    try {
      const saved = await storage.get('pending_actions');
      if (saved && Array.isArray(saved)) {
        setPendingActions(saved);
      }
    } catch (err) {
      console.warn('Failed to load pending actions:', err);
    }
  };

  const savePendingActions = async () => {
    if (!storage) return;

    try {
      await storage.set('pending_actions', pendingActions);
    } catch (err) {
      console.warn('Failed to save pending actions:', err);
    }
  };

  const queueAction = (type: string, data: any, maxRetries: number = 3) => {
    if (!enableQueue) return;

    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    setPendingActions(prev => [...prev, action]);
  };

  const clearQueue = () => {
    setPendingActions([]);
  };

  const retryPendingActions = async () => {
    if (!enableQueue || !onActionRetry) return;

    const actionsToRetry = [...pendingActions];
    const successfulActions: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToRetry) {
      try {
        const success = await onActionRetry(action);

        if (success) {
          successfulActions.push(action.id);
        } else {
          // Increment retry count
          const updatedAction = {
            ...action,
            retryCount: action.retryCount + 1
          };

          if (updatedAction.retryCount < updatedAction.maxRetries) {
            failedActions.push(updatedAction);
          }
          // If max retries exceeded, action is dropped
        }
      } catch (err) {
        console.warn(`Failed to retry action ${action.id}:`, err);

        const updatedAction = {
          ...action,
          retryCount: action.retryCount + 1
        };

        if (updatedAction.retryCount < updatedAction.maxRetries) {
          failedActions.push(updatedAction);
        }
      }
    }

    // Update pending actions (remove successful ones, keep failed ones for retry)
    setPendingActions(failedActions);
  };

  const getOfflineData = async (key: string): Promise<any> => {
    if (!storage || !enableStorage) return null;

    try {
      return await storage.get(key);
    } catch (err) {
      console.warn(`Failed to get offline data for key ${key}:`, err);
      return null;
    }
  };

  const setOfflineData = async (key: string, data: any, ttl?: number): Promise<void> => {
    if (!storage || !enableStorage) return;

    try {
      await storage.set(key, data, ttl);
    } catch (err) {
      console.warn(`Failed to set offline data for key ${key}:`, err);
    }
  };

  const clearOfflineData = async (): Promise<void> => {
    if (!storage || !enableStorage) return;

    try {
      await storage.clear();
    } catch (err) {
      console.warn('Failed to clear offline data:', err);
    }
  };

  const contextValue: OfflineContextType = {
    isOffline,
    isOnline,
    pendingActions,
    queueAction,
    clearQueue,
    retryPendingActions,
    getOfflineData,
    setOfflineData,
    clearOfflineData
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

// Higher-order component for offline-aware components
export function withOfflineSupport<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requiresConnection?: boolean;
    fallback?: React.ComponentType<P>;
    showOfflineBanner?: boolean;
  } = {}
) {
  const { requiresConnection = false, fallback: Fallback, showOfflineBanner = true } = options;

  const WrappedComponent = (props: P) => {
    const { isOffline } = useOffline();

    if (isOffline && requiresConnection) {
      if (Fallback) {
        return <Fallback {...props} />;
      }

      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-yellow-900 mb-2">
            인터넷 연결이 필요합니다
          </h3>
          <p className="text-yellow-700">
            이 기능을 사용하려면 네트워크에 연결해주세요.
          </p>
        </div>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withOfflineSupport(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for offline-aware API calls
interface UseOfflineApiOptions {
  enableQueue?: boolean;
  maxRetries?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

export function useOfflineApi(options: UseOfflineApiOptions = {}) {
  const {
    enableQueue = true,
    maxRetries = 3,
    cacheKey,
    cacheTTL
  } = options;

  const {
    isOffline,
    queueAction,
    getOfflineData,
    setOfflineData
  } = useOffline();

  const makeRequest = async <T,>(
    requestFn: () => Promise<T>,
    actionType?: string,
    actionData?: any
  ): Promise<T | null> => {
    // If online, make the request normally
    if (!isOffline) {
      try {
        const result = await requestFn();

        // Cache the result if cache key is provided
        if (cacheKey) {
          await setOfflineData(cacheKey, result, cacheTTL);
        }

        return result;
      } catch (err) {
        // If request fails and we have queue enabled, queue it
        if (enableQueue && actionType && actionData) {
          queueAction(actionType, actionData, maxRetries);
        }
        throw err;
      }
    }

    // If offline, try to get cached data
    if (cacheKey) {
      const cachedData = await getOfflineData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // If offline and no cached data, queue the action if enabled
    if (enableQueue && actionType && actionData) {
      queueAction(actionType, actionData, maxRetries);
    }

    return null;
  };

  return {
    makeRequest,
    isOffline
  };
}