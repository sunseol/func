'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

interface NetworkStatusHookReturn {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlowConnection: boolean;
  checkConnection: () => Promise<boolean>;
  retryConnection: () => Promise<void>;
}

// Default network status
const DEFAULT_NETWORK_STATUS: NetworkStatus = {
  isOnline: true,
  isSlowConnection: false,
  connectionType: 'unknown',
  effectiveType: '4g',
  downlink: 10,
  rtt: 100
};

export function useNetworkStatus(): NetworkStatusHookReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(DEFAULT_NETWORK_STATUS);
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());

  // Get network information from Navigator API
  const getNetworkInfo = useCallback((): Partial<NetworkStatus> => {
    if (typeof window === 'undefined') {
      return DEFAULT_NETWORK_STATUS;
    }

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      return {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        isSlowConnection: connection.effectiveType === 'slow-2g' || 
                         connection.effectiveType === '2g' ||
                         (connection.downlink && connection.downlink < 1.5)
      };
    }

    return {
      connectionType: 'unknown',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      isSlowConnection: false
    };
  }, []);

  // Check actual connectivity by making a request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;

    try {
      // Use a small image or endpoint to test connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      return false;
    }
  }, []);

  // Update network status
  const updateNetworkStatus = useCallback(async () => {
    const isOnline = navigator.onLine;
    const networkInfo = getNetworkInfo();
    
    // If browser says we're online, double-check with actual request
    let actuallyOnline = isOnline;
    if (isOnline) {
      actuallyOnline = await checkConnection();
    }

    const newStatus: NetworkStatus = {
      ...DEFAULT_NETWORK_STATUS,
      ...networkInfo,
      isOnline: actuallyOnline,
      isSlowConnection: networkInfo.isSlowConnection ?? false,
    };

    setNetworkStatus(newStatus);

    if (actuallyOnline) {
      setLastOnlineTime(Date.now());
    }

    return newStatus;
  }, [getNetworkInfo, checkConnection]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(async (): Promise<void> => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const isConnected = await checkConnection();
      
      if (isConnected) {
        await updateNetworkStatus();
        return;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Final update after all retries failed
    await updateNetworkStatus();
  }, [checkConnection, updateNetworkStatus]);

  // Handle online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('Network: Online event detected');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('Network: Offline event detected');
      setNetworkStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Handle connection change (mobile networks)
    const handleConnectionChange = () => {
      console.log('Network: Connection change detected');
      updateNetworkStatus();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial status check
    updateNetworkStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  // Periodic connectivity check (every 30 seconds when online)
  useEffect(() => {
    if (!networkStatus.isOnline) return;

    const interval = setInterval(async () => {
      const isStillOnline = await checkConnection();
      if (!isStillOnline) {
        setNetworkStatus(prev => ({ ...prev, isOnline: false }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [networkStatus.isOnline, checkConnection]);

  return {
    networkStatus,
    isOnline: networkStatus.isOnline,
    isOffline: !networkStatus.isOnline,
    isSlowConnection: networkStatus.isSlowConnection,
    checkConnection,
    retryConnection
  };
}

// Hook for detecting network errors in API calls
export function useNetworkErrorDetection() {
  const { isOnline, retryConnection } = useNetworkStatus();

  const detectNetworkError = useCallback((error: any): 'network' | 'server' | 'timeout' | 'generic' => {
    // Check if we're offline
    if (!isOnline) {
      return 'network';
    }

    // Check error types
    if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
      return 'timeout';
    }

    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return 'network';
    }

    // Check HTTP status codes
    if (error?.status || error?.response?.status) {
      const status = error.status || error.response.status;
      
      if (status >= 500) {
        return 'server';
      }
      
      if (status === 408 || status === 504) {
        return 'timeout';
      }
      
      if (status === 0 || !status) {
        return 'network';
      }
    }

    // Check error messages
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || 
        message.includes('connection') || 
        message.includes('fetch')) {
      return 'network';
    }

    if (message.includes('timeout') || 
        message.includes('aborted')) {
      return 'timeout';
    }

    return 'generic';
  }, [isOnline]);

  const handleNetworkError = useCallback(async (error: any) => {
    const errorType = detectNetworkError(error);
    
    if (errorType === 'network') {
      // Try to reconnect
      await retryConnection();
    }
    
    return errorType;
  }, [detectNetworkError, retryConnection]);

  return {
    detectNetworkError,
    handleNetworkError,
    isOnline
  };
}

// Utility function to create network-aware fetch wrapper
export function createNetworkAwareFetch() {
  return async function networkAwareFetch(
    input: RequestInfo | URL, 
    init?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Enhance error with network context
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please check your connection');
        }
        
        if (!navigator.onLine) {
          throw new Error('No internet connection - please check your network');
        }
      }
      
      throw error;
    }
  };
}
