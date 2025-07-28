'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration
interface CacheConfig {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while fetching new data
  maxSize?: number; // Maximum cache size (default: 100)
}

// Global cache storage
const globalCache = new Map<string, CacheEntry<unknown>>();

// Cache key generator
export function createCacheKey(url: string, params?: Record<string, unknown>): string {
  const baseKey = url;
  if (!params) return baseKey;
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${baseKey}?${sortedParams}`;
}

// Cache utilities
class ApiCache {
  private static maxSize = 100;
  private static defaultTTL = 5 * 60 * 1000; // 5 minutes

  static setMaxSize(size: number) {
    this.maxSize = size;
    this.cleanup();
  }

  static get<T>(key: string): CacheEntry<T> | null {
    const entry = globalCache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      globalCache.delete(key);
      return null;
    }
    
    return entry;
  }

  static set<T>(key: string, data: T, ttl = this.defaultTTL) {
    // Cleanup if cache is full
    if (globalCache.size >= this.maxSize) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };

    globalCache.set(key, entry);
  }

  static invalidate(pattern?: string) {
    if (!pattern) {
      globalCache.clear();
      return;
    }

    // Invalidate keys matching pattern
    const keysToDelete = Array.from(globalCache.keys()).filter(key => 
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => globalCache.delete(key));
  }

  static cleanup() {
    const now = Date.now();
    const entries = Array.from(globalCache.entries());
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        globalCache.delete(key);
      }
    });

    // If still too many entries, remove oldest
    if (globalCache.size >= this.maxSize) {
      const sortedEntries = Array.from(globalCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, sortedEntries.length - this.maxSize + 10);
      toRemove.forEach(([key]) => globalCache.delete(key));
    }
  }

  static getStats() {
    const now = Date.now();
    const entries = Array.from(globalCache.values());
    
    return {
      totalEntries: entries.length,
      expiredEntries: entries.filter(entry => now > entry.expiresAt).length,
      validEntries: entries.filter(entry => now <= entry.expiresAt).length,
      oldestEntry: Math.min(...entries.map(entry => entry.timestamp)),
      newestEntry: Math.max(...entries.map(entry => entry.timestamp))
    };
  }
}

// Hook for API caching
interface UseApiCacheOptions<T> extends CacheConfig {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface UseApiCacheResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => void;
  invalidate: () => void;
}

export function useApiCache<T>(
  url: string | null,
  fetcher?: () => Promise<T>,
  options: UseApiCacheOptions<T> = {}
): UseApiCacheResult<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate = true,
    enabled = true,
    onSuccess,
    onError,
    refetchOnWindowFocus = false,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const cacheKey = url ? createCacheKey(url) : null;

  // Default fetcher using fetch API
  const defaultFetcher = useCallback(async (): Promise<T> => {
    if (!url) throw new Error('URL is required');
    
    const response = await fetch(url, {
      signal: abortControllerRef.current?.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }, [url]);

  const actualFetcher = fetcher || defaultFetcher;

  // Fetch function with retry logic
  const fetchData = useCallback(async (isBackground = false) => {
    if (!cacheKey || !enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    if (!isBackground) {
      setIsLoading(true);
    }
    setIsValidating(true);
    setError(null);

    try {
      const result = await actualFetcher();
      
      // Update cache
      ApiCache.set(cacheKey, result, ttl);
      
      setData(result);
      setError(null);
      retryCountRef.current = 0;
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      // Don't set error if request was aborted
      if (error.name === 'AbortError') return;
      
      setError(error);
      
      // Retry logic
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(isBackground);
        }, retryDelay * retryCountRef.current);
        return;
      }
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [cacheKey, enabled, actualFetcher, ttl, onSuccess, onError, retryCount, retryDelay]);

  // Mutate function to refetch data
  const mutate = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  // Invalidate function to clear cache and refetch
  const invalidate = useCallback(() => {
    if (cacheKey) {
      ApiCache.invalidate(cacheKey);
      fetchData(false);
    }
  }, [cacheKey, fetchData]);

  // Initial load and cache check
  useEffect(() => {
    if (!cacheKey || !enabled) return;

    // Check cache first
    const cachedEntry = ApiCache.get<T>(cacheKey);
    
    if (cachedEntry) {
      setData(cachedEntry.data);
      
      // If stale while revalidate is enabled, fetch in background
      if (staleWhileRevalidate) {
        fetchData(true);
      }
    } else {
      fetchData(false);
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [cacheKey, enabled, fetchData, staleWhileRevalidate]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (cacheKey && enabled) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, cacheKey, enabled, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    invalidate
  };
}

// Hook for caching fetch requests
export function useFetch<T>(
  url: string | null,
  options: UseApiCacheOptions<T> = {}
): UseApiCacheResult<T> {
  const fetcher = useCallback(async (): Promise<T> => {
    if (!url) throw new Error('URL is required');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }, [url]);

  return useApiCache(url, fetcher, options);
}

// Hook for caching projects
export function useProjects() {
  return useFetch<{ projects: Array<unknown> }>('/api/ai-pm/projects', {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    refetchOnWindowFocus: true
  });
}

// Hook for caching project details
export function useProject(projectId: string | null) {
  return useFetch<{ project: unknown; members: Array<unknown>; progress: Array<unknown> }>(
    projectId ? `/api/ai-pm/projects/${projectId}` : null,
    {
      ttl: 1 * 60 * 1000, // 1 minute
      staleWhileRevalidate: true
    }
  );
}

// Hook for caching documents
export function useDocuments(projectId: string | null, workflowStep: number | null) {
  const url = projectId && workflowStep 
    ? `/api/ai-pm/documents?project_id=${projectId}&workflow_step=${workflowStep}`
    : null;
    
  return useFetch<{ documents: Array<unknown> }>(url, {
    ttl: 30 * 1000, // 30 seconds
    staleWhileRevalidate: true
  });
}

// Export cache utilities
export { ApiCache }; 