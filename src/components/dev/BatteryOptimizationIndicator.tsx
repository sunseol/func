'use client';

import React from 'react';
import { useBatteryOptimization } from '@/hooks/useBatteryOptimization';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface BatteryOptimizationIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showDetails?: boolean;
  compact?: boolean;
}

const BatteryOptimizationIndicator: React.FC<BatteryOptimizationIndicatorProps> = ({
  position = 'top-right',
  showDetails = false,
  compact = true
}) => {
  const { isMobile } = useBreakpoint();
  const { batteryInfo, optimizationState, isSupported, toggleOptimization } = useBatteryOptimization();

  // 모바일이 아니거나 배터리 API를 지원하지 않는 경우 렌더링하지 않음
  if (!isMobile || !isSupported || !batteryInfo) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getBatteryColor = (level: number, charging: boolean) => {
    if (charging) return 'text-green-500';
    if (level > 0.5) return 'text-green-500';
    if (level > 0.2) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBatteryIcon = (level: number, charging: boolean) => {
    if (charging) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      );
    }

    // 배터리 레벨에 따른 아이콘
    const fillWidth = Math.max(level * 100, 10);
    
    return (
      <div className="relative w-4 h-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="6" width="16" height="12" rx="2" strokeWidth="2" fill="none" />
          <rect x="20" y="9" width="2" height="6" rx="1" strokeWidth="2" fill="none" />
        </svg>
        <div 
          className="absolute top-1.5 left-0.5 h-2 bg-current rounded-sm transition-all duration-300"
          style={{ width: `${fillWidth * 0.14}px` }}
        />
      </div>
    );
  };

  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds)) return '∞';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div className="bg-black/80 text-white text-xs p-2 rounded-lg backdrop-blur-sm flex items-center space-x-2">
          <div className={getBatteryColor(batteryInfo.level, batteryInfo.charging)}>
            {getBatteryIcon(batteryInfo.level, batteryInfo.charging)}
          </div>
          <span className={getBatteryColor(batteryInfo.level, batteryInfo.charging)}>
            {Math.round(batteryInfo.level * 100)}%
          </span>
          {optimizationState.isOptimized && (
            <div className="w-2 h-2 bg-blue-400 rounded-full" title="배터리 최적화 활성" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={getBatteryColor(batteryInfo.level, batteryInfo.charging)}>
              {getBatteryIcon(batteryInfo.level, batteryInfo.charging)}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              배터리 상태
            </span>
          </div>
          <button
            onClick={() => toggleOptimization()}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              optimizationState.isOptimized
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
            }`}
          >
            {optimizationState.isOptimized ? '최적화 ON' : '최적화 OFF'}
          </button>
        </div>

        {/* 배터리 정보 */}
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">배터리 레벨:</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getBatteryColor(batteryInfo.level, batteryInfo.charging)}`}>
                {Math.round(batteryInfo.level * 100)}%
              </span>
              {batteryInfo.charging && (
                <span className="text-xs text-green-600 dark:text-green-400">충전 중</span>
              )}
            </div>
          </div>

          {/* 배터리 바 */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                batteryInfo.charging
                  ? 'bg-green-500'
                  : batteryInfo.level > 0.5
                  ? 'bg-green-500'
                  : batteryInfo.level > 0.2
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${batteryInfo.level * 100}%` }}
            />
          </div>

          {showDetails && (
            <div className="space-y-2 text-xs">
              {batteryInfo.charging && batteryInfo.chargingTime !== Infinity && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">충전 완료까지:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatTime(batteryInfo.chargingTime)}
                  </span>
                </div>
              )}
              
              {!batteryInfo.charging && batteryInfo.dischargingTime !== Infinity && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">방전까지:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatTime(batteryInfo.dischargingTime)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 최적화 상태 */}
          {optimizationState.isOptimized && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  배터리 최적화 활성
                </span>
              </div>
              
              {optimizationState.optimizationsApplied.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">적용된 최적화:</span>
                  <div className="flex flex-wrap gap-1">
                    {optimizationState.optimizationsApplied.map((optimization) => (
                      <span
                        key={optimization}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
                      >
                        {optimization === 'animations' && '애니메이션'}
                        {optimization === 'background-tasks' && '백그라운드'}
                        {optimization === 'network' && '네트워크'}
                        {optimization === 'cpu' && 'CPU'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 경고 메시지 */}
          {optimizationState.isLowBattery && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  {optimizationState.isCriticalBattery ? '배터리 부족' : '배터리 낮음'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryOptimizationIndicator;