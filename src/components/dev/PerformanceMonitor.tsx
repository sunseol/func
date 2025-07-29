'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiCache } from '@/hooks/useApiCache';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: MemoryInfo;
}

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  });
  const [cacheStats, setCacheStats] = useState<ReturnType<typeof ApiCache.getStats> | null>(null);

  // Performance tracking - 컴포넌트 마운트 시에만 측정
  useEffect(() => {
    const startTime = performance.now();
    
    // 컴포넌트가 마운트된 후 약간의 지연을 두고 측정
    const timer = setTimeout(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        lastRenderTime: renderTime,
        memoryUsage: (performance as any).memory
      }));
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // 빈 의존성 배열로 한 번만 실행

  // Cache stats update
  const updateCacheStats = useCallback(() => {
    try {
      const stats = ApiCache.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      updateCacheStats();
      const interval = setInterval(updateCacheStats, 1000);
      return () => clearInterval(interval);
    }
  }, [isVisible, updateCacheStats]);

  // Keyboard shortcut to toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearCache = () => {
    ApiCache.invalidate();
    updateCacheStats();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    return `${ms.toFixed(2)}ms`;
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="성능 모니터 토글 (Ctrl+Shift+P)"
        >
          📊
        </button>
      </div>

      {/* Performance monitor panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">성능 모니터</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Render Performance */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">렌더링 성능</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>렌더 횟수:</span>
                <span className="font-mono">{metrics.renderCount}</span>
              </div>
              <div className="flex justify-between">
                <span>마지막 렌더 시간:</span>
                <span className="font-mono">{formatTime(metrics.lastRenderTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>평균 렌더 시간:</span>
                <span className="font-mono">{formatTime(metrics.averageRenderTime)}</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">메모리 사용량</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>사용 중:</span>
                  <span className="font-mono">{formatBytes(metrics.memoryUsage.usedJSHeapSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>총 할당:</span>
                  <span className="font-mono">{formatBytes(metrics.memoryUsage.totalJSHeapSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>제한:</span>
                  <span className="font-mono">{formatBytes(metrics.memoryUsage.jsHeapSizeLimit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cache Stats */}
          {cacheStats && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">캐시 상태</h4>
                <button
                  onClick={clearCache}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  캐시 삭제
                </button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>총 엔트리:</span>
                  <span className="font-mono">{cacheStats.totalEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span>유효한 엔트리:</span>
                  <span className="font-mono text-green-600">{cacheStats.validEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span>만료된 엔트리:</span>
                  <span className="font-mono text-red-600">{cacheStats.expiredEntries}</span>
                </div>
                {cacheStats.totalEntries > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>캐시 히트율:</span>
                      <span className="font-mono">
                        {((cacheStats.validEntries / cacheStats.totalEntries) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>가장 오래된 엔트리:</span>
                      <span className="font-mono text-xs">
                        {new Date(cacheStats.oldestEntry).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>가장 최신 엔트리:</span>
                      <span className="font-mono text-xs">
                        {new Date(cacheStats.newestEntry).toLocaleTimeString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-gray-600 border-t pt-2">
            <div className="font-medium mb-1">성능 팁:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>평균 렌더 시간 &lt; 16ms 권장</li>
              <li>캐시 히트율 &gt; 80% 권장</li>
              <li>메모리 사용량 모니터링</li>
            </ul>
          </div>

          <div className="text-xs text-gray-500 mt-2 text-center">
            Ctrl+Shift+P로 토글 가능
          </div>
        </div>
      )}
    </>
  );
} 