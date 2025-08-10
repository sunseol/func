'use client';

import React, { useState, useEffect } from 'react';
import { 
  WifiIcon, 
  SignalSlashIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Offline banner component
interface OfflineBannerProps {
  className?: string;
  position?: 'top' | 'bottom';
  showRetryButton?: boolean;
}

export function OfflineBanner({ 
  className = '', 
  position = 'top',
  showRetryButton = true 
}: OfflineBannerProps) {
  const { isOffline, retryConnection } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Show banner with delay to avoid flashing
  useEffect(() => {
    if (isOffline) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isOffline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  if (!showBanner) return null;

  const positionClasses = position === 'top' 
    ? 'top-0 animate-slide-down' 
    : 'bottom-0 animate-slide-up';

  return (
    <div className={`fixed left-0 right-0 ${positionClasses} z-50 ${className}`}>
      <div className="bg-red-500 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <SignalSlashIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">인터넷 연결이 끊어졌습니다</p>
              <p className="text-xs opacity-90">일부 기능이 제한될 수 있습니다</p>
            </div>
          </div>
          
          {showRetryButton && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center space-x-1 min-h-[32px]"
            >
              {isRetrying ? (
                <>
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  <span>재시도 중...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-3 h-3" />
                  <span>재시도</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Connection status indicator
interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConnectionStatus({ 
  className = '', 
  showLabel = true,
  size = 'md' 
}: ConnectionStatusProps) {
  const { networkStatus, isOnline, isSlowConnection } = useNetworkStatus();
  
  const sizeClasses = {
    sm: { icon: 'w-4 h-4', text: 'text-xs' },
    md: { icon: 'w-5 h-5', text: 'text-sm' },
    lg: { icon: 'w-6 h-6', text: 'text-base' }
  };

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: SignalSlashIcon,
        label: '오프라인',
        color: 'text-red-500',
        bgColor: 'bg-red-50'
      };
    }

    if (isSlowConnection) {
      return {
        icon: ExclamationTriangleIcon,
        label: '느린 연결',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50'
      };
    }

    return {
      icon: WifiIcon,
      label: '온라인',
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    };
  };

  const status = getStatusInfo();
  const IconComponent = status.icon;
  const classes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full ${status.bgColor} ${className}`}>
      <IconComponent className={`${classes.icon} ${status.color}`} />
      {showLabel && (
        <span className={`${classes.text} ${status.color} font-medium`}>
          {status.label}
        </span>
      )}
    </div>
  );
}

// Offline page component
interface OfflinePageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  availableFeatures?: string[];
  illustration?: React.ReactNode;
}

export function OfflinePage({
  title = '인터넷 연결이 끊어졌습니다',
  message = '네트워크 연결을 확인하고 다시 시도해주세요.',
  onRetry,
  availableFeatures = [],
  illustration
}: OfflinePageProps) {
  const { retryConnection } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        await retryConnection();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Illustration */}
        <div className="mb-8">
          {illustration || (
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <SignalSlashIcon className="w-12 h-12 text-red-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors min-h-[48px] flex items-center justify-center mb-6"
        >
          {isRetrying ? (
            <>
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              연결 확인 중...
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              다시 시도
            </>
          )}
        </button>

        {/* Available features */}
        {availableFeatures.length > 0 && (
          <div className="bg-white rounded-lg p-4 text-left">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
              오프라인에서도 사용 가능한 기능
            </h3>
            <ul className="space-y-2">
              {availableFeatures.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Offline-aware component wrapper
interface OfflineAwareProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBanner?: boolean;
  requiresConnection?: boolean;
}

export function OfflineAware({ 
  children, 
  fallback,
  showBanner = true,
  requiresConnection = false 
}: OfflineAwareProps) {
  const { isOffline } = useNetworkStatus();

  if (isOffline && requiresConnection) {
    return (
      <>
        {fallback || (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <SignalSlashIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-yellow-800 font-medium">인터넷 연결이 필요합니다</p>
            <p className="text-yellow-600 text-sm mt-1">
              이 기능을 사용하려면 네트워크에 연결해주세요.
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {showBanner && <OfflineBanner />}
      {children}
    </>
  );
}

// Hook for offline-aware data fetching
interface UseOfflineDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  fallbackData?: T;
  revalidateOnReconnect?: boolean;
}

export function useOfflineData<T>({
  key,
  fetcher,
  fallbackData,
  revalidateOnReconnect = true
}: UseOfflineDataOptions<T>) {
  const [data, setData] = useState<T | undefined>(fallbackData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline, isOffline } = useNetworkStatus();

  // Load cached data from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem(`offline_cache_${key}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        // Use cached data if it's less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          setData(cachedData);
        }
      }
    } catch (err) {
      console.warn('Failed to load cached data:', err);
    }
  }, [key]);

  // Fetch data when online
  const fetchData = async () => {
    if (isOffline) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);

      // Cache the data
      if (typeof window !== 'undefined') {
        localStorage.setItem(`offline_cache_${key}`, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (isOnline) {
      fetchData();
    }
  }, [isOnline]);

  // Revalidate on reconnect
  useEffect(() => {
    if (isOnline && revalidateOnReconnect) {
      fetchData();
    }
  }, [isOnline, revalidateOnReconnect]);

  return {
    data,
    error,
    isLoading,
    isOffline,
    refetch: fetchData
  };
}

// Offline storage utility
export class OfflineStorage {
  private static instance: OfflineStorage;
  private dbName = 'offline_storage';
  private version = 1;
  private db: IDBDatabase | null = null;

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async set(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    const item = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : null
    };

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<any> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check TTL
        if (result.ttl && Date.now() > result.ttl) {
          this.delete(key); // Clean up expired data
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}