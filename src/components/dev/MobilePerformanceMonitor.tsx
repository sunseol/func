'use client';

import React, { useState, useEffect } from 'react';
import { useMobilePerformanceMonitor } from '@/hooks/useMobilePerformanceMonitor';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface MobilePerformanceMonitorProps {
  enabled?: boolean;
  showAlerts?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

const MobilePerformanceMonitor: React.FC<MobilePerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  showAlerts = true,
  position = 'bottom-right',
  compact = false
}) => {
  const { isMobile } = useBreakpoint();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const {
    metrics,
    alerts,
    isMonitoring,
    dismissAlert,
    clearAlerts,
    generateReport,
    thresholds
  } = useMobilePerformanceMonitor(enabled && isMobile);

  // 개발 환경이 아니거나 모바일이 아닌 경우 렌더링하지 않음
  if (!enabled || !isMobile) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getMetricColor = (value: number, threshold: number, isReverse = false) => {
    const isGood = isReverse ? value < threshold : value > threshold;
    if (isGood) return 'text-green-600';
    if (Math.abs(value - threshold) / threshold < 0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'MB') return `${Math.round(value)}${unit}`;
    if (unit === 'ms') return `${value.toFixed(1)}${unit}`;
    if (unit === 'fps') return `${Math.round(value)}${unit}`;
    if (unit === '%') return `${Math.round(value)}${unit}`;
    return `${value.toFixed(1)}${unit}`;
  };

  const downloadReport = () => {
    const report = generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div className="bg-black/80 text-white text-xs p-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={getMetricColor(metrics.fps, thresholds.minFps, true)}>
              {Math.round(metrics.fps)}fps
            </span>
            <span className={getMetricColor(metrics.memoryUsage, thresholds.maxMemoryUsage)}>
              {Math.round(metrics.memoryUsage)}MB
            </span>
            <span className={getMetricColor(metrics.cpuUsage, thresholds.maxCpuUsage)}>
              {Math.round(metrics.cpuUsage)}%
            </span>
            {metrics.longTasks > 0 && (
              <span className="bg-orange-500 text-white px-1 rounded text-xs">
                LT:{metrics.longTasks}
              </span>
            )}
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white px-1 rounded text-xs">
                {alerts.length}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* 메인 모니터 패널 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              성능 모니터
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="상세 정보"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg 
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 기본 메트릭 */}
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">FPS:</span>
              <span className={getMetricColor(metrics.fps, thresholds.minFps, true)}>
                {formatValue(metrics.fps, 'fps')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">메모리:</span>
              <span className={getMetricColor(metrics.memoryUsage, thresholds.maxMemoryUsage)}>
                {formatValue(metrics.memoryUsage, 'MB')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">렌더링:</span>
              <span className={getMetricColor(metrics.renderTime, thresholds.maxRenderTime)}>
                {formatValue(metrics.renderTime, 'ms')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">터치:</span>
              <span className={getMetricColor(metrics.touchResponseTime, thresholds.maxTouchDelay)}>
                {formatValue(metrics.touchResponseTime, 'ms')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">CPU:</span>
              <span className={getMetricColor(metrics.cpuUsage, thresholds.maxCpuUsage)}>
                {formatValue(metrics.cpuUsage, '%')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">네트워크:</span>
              <span className={getMetricColor(metrics.networkLatency, thresholds.maxNetworkLatency)}>
                {formatValue(metrics.networkLatency, 'ms')}
              </span>
            </div>
          </div>

          {/* 배터리 정보 */}
          {(metrics.batteryLevel !== undefined || metrics.isCharging !== undefined) && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">배터리:</span>
                <div className="flex items-center space-x-1">
                  {metrics.batteryLevel !== undefined && (
                    <span className="text-gray-900 dark:text-white">
                      {metrics.batteryLevel}%
                    </span>
                  )}
                  {metrics.isCharging && (
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 확장된 상세 정보 */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
            {showDetails && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">페인트:</span>
                    <span className={getMetricColor(metrics.paintTime, thresholds.maxPaintTime)}>
                      {formatValue(metrics.paintTime, 'ms')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">레이아웃:</span>
                    <span className={getMetricColor(metrics.layoutTime, thresholds.maxLayoutTime)}>
                      {formatValue(metrics.layoutTime, 'ms')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">스크롤:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatValue(metrics.scrollPerformance, 'ms')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">입력 지연:</span>
                    <span className={getMetricColor(metrics.inputDelay, thresholds.maxInputDelay)}>
                      {formatValue(metrics.inputDelay, 'ms')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">DOM 노드:</span>
                    <span className={getMetricColor(metrics.domNodes, thresholds.maxDomNodes)}>
                      {formatValue(metrics.domNodes, '')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">이벤트:</span>
                    <span className={getMetricColor(metrics.eventListeners, thresholds.maxEventListeners)}>
                      {formatValue(metrics.eventListeners, '')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">이미지:</span>
                    <span className={getMetricColor(metrics.imageLoadTime, thresholds.maxImageLoadTime)}>
                      {formatValue(metrics.imageLoadTime, 'ms')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">번들:</span>
                    <span className={getMetricColor(metrics.bundleSize, thresholds.maxBundleSize)}>
                      {formatValue(metrics.bundleSize, 'MB')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">캐시율:</span>
                    <span className={getMetricColor(metrics.cacheHitRate, thresholds.minCacheHitRate, true)}>
                      {formatValue(metrics.cacheHitRate, '%')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Long Task:</span>
                    <span className={getMetricColor(metrics.longTasks, thresholds.maxLongTasks)}>
                      {formatValue(metrics.longTasks, '/분')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CLS:</span>
                    <span className={getMetricColor(metrics.visualStability, thresholds.minVisualStability)}>
                      {formatValue(metrics.visualStability, '')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex space-x-2">
              <button
                onClick={downloadReport}
                className="flex-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                리포트 다운로드
              </button>
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  알림 지우기
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 알림 패널 */}
      {showAlerts && alerts.length > 0 && (
        <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                성능 알림 ({alerts.length})
              </span>
              <button
                onClick={clearAlerts}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                모두 지우기
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {alerts.slice(-5).map((alert) => (
              <div
                key={alert.timestamp}
                className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                  alert.type === 'critical' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        alert.type === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {alert.type === 'critical' ? '심각' : '경고'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.timestamp)}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePerformanceMonitor;