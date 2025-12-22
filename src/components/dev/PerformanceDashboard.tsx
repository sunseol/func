'use client';

import React, { useState, useEffect } from 'react';
import { useMobilePerformanceMonitor } from '@/hooks/useMobilePerformanceMonitor';
import { usePerformanceOptimizer } from '@/hooks/usePerformanceOptimizer';
import { useBatteryOptimization } from '@/hooks/useBatteryOptimization';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface PerformanceDashboardProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoOptimize?: boolean;
  aggressiveMode?: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  position = 'bottom-right',
  autoOptimize = true,
  aggressiveMode = false
}) => {
  const { isMobile } = useBreakpoint();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'optimization' | 'battery'>('metrics');

  // 성능 모니터링
  const {
    metrics,
    alerts,
    isMonitoring,
    clearAlerts,
    generateReport: generateMonitorReport,
    thresholds
  } = useMobilePerformanceMonitor(isMobile);

  // 성능 최적화
  const {
    state: optimizerState,
    isSupported: optimizerSupported,
    applyOptimizations,
    removeOptimizations,
    toggleOptimizations,
    generateReport: generateOptimizerReport
  } = usePerformanceOptimizer({
    enabled: isMobile,
    autoStart: autoOptimize,
    aggressiveMode
  });

  // 배터리 최적화
  const {
    batteryInfo,
    optimizationState: batteryState,
    isSupported: batterySupported,
    toggleOptimization: toggleBatteryOptimization
  } = useBatteryOptimization();

  // 성능 대시보드는 비활성화
  if (process.env.NODE_ENV !== 'development' || !isMobile) {
    return null;
  }

  // 개발 환경/모바일 조건부 렌더는 비활성화된 상태에서 의미 없음

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getMetricColor = (value: number, threshold: number, mode: 'min' | 'max' = 'max') => {
    const isGood = mode === 'min' ? value >= threshold : value <= threshold;
    if (isGood) return 'text-green-600 dark:text-green-400';
    if (Math.abs(value - threshold) / threshold < 0.2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'MB') return `${Math.round(value)}${unit}`;
    if (unit === 'ms') return `${value.toFixed(1)}${unit}`;
    if (unit === 'fps') return `${Math.round(value)}${unit}`;
    if (unit === '%') return `${Math.round(value)}${unit}`;
    return `${value.toFixed(1)}${unit}`;
  };

  const downloadReport = () => {
    const monitorReport = generateMonitorReport();
    const optimizerReport = generateOptimizerReport();
    
    const combinedReport = {
      timestamp: new Date().toISOString(),
      monitoring: monitorReport,
      optimization: optimizerReport,
      battery: {
        info: batteryInfo,
        state: batteryState,
        supported: batterySupported
      },
      device: {
        userAgent: navigator.userAgent,
        screen: {
          width: screen.width,
          height: screen.height,
          pixelRatio: window.devicePixelRatio
        },
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    };

    const blob = new Blob([JSON.stringify(combinedReport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getOverallStatus = () => {
    const criticalAlerts = alerts.filter(alert => alert.type === 'critical').length;
    const warningAlerts = alerts.filter(alert => alert.type === 'warning').length;
    
    if (criticalAlerts > 0) return { status: 'critical', color: 'bg-red-500' };
    if (warningAlerts > 0) return { status: 'warning', color: 'bg-yellow-500' };
    if (optimizerState.isActive || batteryState.isOptimized) return { status: 'optimized', color: 'bg-blue-500' };
    return { status: 'normal', color: 'bg-green-500' };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-sm`}>
      {/* 메인 대시보드 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${overallStatus.color}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              성능 대시보드
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={downloadReport}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="리포트 다운로드"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

        {/* 요약 정보 */}
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className={`text-lg font-bold ${getMetricColor(metrics.fps, thresholds.minFps, 'min')}`}>
                {Math.round(metrics.fps)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">FPS</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${getMetricColor(metrics.memoryUsage, thresholds.maxMemoryUsage)}`}>
                {Math.round(metrics.memoryUsage)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">MB</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${getMetricColor(metrics.cpuUsage, thresholds.maxCpuUsage)}`}>
                {Math.round(metrics.cpuUsage)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">CPU%</div>
            </div>
          </div>

          {/* 알림 요약 */}
          {alerts.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-800 dark:text-red-200">
                  {alerts.length}개의 성능 이슈
                </span>
                <button
                  onClick={clearAlerts}
                  className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  지우기
                </button>
              </div>
            </div>
          )}

          {/* 최적화 상태 */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">최적화:</span>
            <div className="flex items-center space-x-2">
              {optimizerState.isActive && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                  성능
                </span>
              )}
              {batteryState.isOptimized && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
                  배터리
                </span>
              )}
              {!optimizerState.isActive && !batteryState.isOptimized && (
                <span className="text-xs text-gray-500 dark:text-gray-400">없음</span>
              )}
            </div>
          </div>
        </div>

        {/* 확장된 상세 정보 */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {/* 탭 네비게이션 */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {[
                { id: 'metrics', label: '메트릭' },
                { id: 'optimization', label: '최적화' },
                { id: 'battery', label: '배터리' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-3 py-2 text-xs font-medium ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div className="p-3 max-h-64 overflow-y-auto">
              {activeTab === 'metrics' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
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
                      <span className="text-gray-600 dark:text-gray-400">네트워크:</span>
                      <span className={getMetricColor(metrics.networkLatency, thresholds.maxNetworkLatency)}>
                        {formatValue(metrics.networkLatency, 'ms')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">DOM:</span>
                      <span className={getMetricColor(metrics.domNodes, thresholds.maxDomNodes)}>
                        {formatValue(metrics.domNodes, '')}
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
                      <span className={getMetricColor(metrics.cacheHitRate, thresholds.minCacheHitRate, 'min')}>
                        {formatValue(metrics.cacheHitRate, '%')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">CLS:</span>
                      <span className={getMetricColor(metrics.visualStability, thresholds.minVisualStability, 'min')}>
                        {formatValue(metrics.visualStability, '')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'optimization' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">성능 최적화</span>
                    <button
                      onClick={toggleOptimizations}
                      className={`px-3 py-1 text-xs rounded ${
                        optimizerState.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}
                    >
                      {optimizerState.isActive ? '해제' : '적용'}
                    </button>
                  </div>

                  {optimizerState.isActive && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        적용된 최적화:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {optimizerState.appliedOptimizations.map((opt) => (
                          <span
                            key={opt}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                      {optimizerState.performanceGain > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          성능 향상: {optimizerState.performanceGain.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'battery' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">배터리 최적화</span>
                    {batterySupported && (
                      <button
                        onClick={() => toggleBatteryOptimization()}
                        className={`px-3 py-1 text-xs rounded ${
                          batteryState.isOptimized
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {batteryState.isOptimized ? '해제' : '적용'}
                      </button>
                    )}
                  </div>

                  {batterySupported && batteryInfo !== null ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">배터리 레벨:</span>
                        <span className="text-gray-900 dark:text-white">
                          {Math.round(batteryInfo.level * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">충전 상태:</span>
                        <span className="text-gray-900 dark:text-white">
                          {batteryInfo.charging ? '충전 중' : '방전 중'}
                        </span>
                      </div>
                      {batteryState.isOptimized && (
                        <div className="mt-2">
                          <div className="text-gray-600 dark:text-gray-400 mb-1">적용된 최적화:</div>
                          <div className="flex flex-wrap gap-1">
                            {batteryState.optimizationsApplied.map((opt) => (
                              <span
                                key={opt}
                                className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      배터리 API가 지원되지 않습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
