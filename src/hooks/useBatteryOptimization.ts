import { useState, useEffect, useCallback, useRef } from 'react';

interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

interface BatteryOptimizationConfig {
  lowBatteryThreshold: number; // 0.2 = 20%
  criticalBatteryThreshold: number; // 0.1 = 10%
  enableAnimationReduction: boolean;
  enableBackgroundTaskReduction: boolean;
  enableNetworkOptimization: boolean;
  enableCPUThrottling: boolean;
}

interface OptimizationState {
  isLowBattery: boolean;
  isCriticalBattery: boolean;
  isOptimized: boolean;
  optimizationsApplied: string[];
}

const DEFAULT_CONFIG: BatteryOptimizationConfig = {
  lowBatteryThreshold: 0.2,
  criticalBatteryThreshold: 0.1,
  enableAnimationReduction: true,
  enableBackgroundTaskReduction: true,
  enableNetworkOptimization: true,
  enableCPUThrottling: true
};

export const useBatteryOptimization = (
  config: Partial<BatteryOptimizationConfig> = {}
) => {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [optimizationState, setOptimizationState] = useState<OptimizationState>({
    isLowBattery: false,
    isCriticalBattery: false,
    isOptimized: false,
    optimizationsApplied: []
  });
  const [isSupported, setIsSupported] = useState(false);

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const batteryRef = useRef<any>(null);
  const optimizationStyleRef = useRef<HTMLStyleElement | null>(null);
  const intervalIdsRef = useRef<Set<number>>(new Set());
  const timeoutIdsRef = useRef<Set<number>>(new Set());

  // 배터리 정보 업데이트
  const updateBatteryInfo = useCallback((battery: any) => {
    const info: BatteryInfo = {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    };

    setBatteryInfo(info);

    const isLowBattery = info.level <= finalConfig.lowBatteryThreshold && !info.charging;
    const isCriticalBattery = info.level <= finalConfig.criticalBatteryThreshold && !info.charging;

    setOptimizationState(prev => ({
      ...prev,
      isLowBattery,
      isCriticalBattery
    }));
  }, [finalConfig.lowBatteryThreshold, finalConfig.criticalBatteryThreshold]);

  // 애니메이션 최적화
  const optimizeAnimations = useCallback((enable: boolean) => {
    if (!finalConfig.enableAnimationReduction) return;

    if (enable) {
      if (!optimizationStyleRef.current) {
        const style = document.createElement('style');
        style.id = 'battery-animation-optimization';
        style.textContent = `
          .battery-optimized * {
            animation-duration: 0.1s !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.1s !important;
            transform: none !important;
          }
          
          .battery-optimized .animate-spin,
          .battery-optimized .animate-pulse,
          .battery-optimized .animate-bounce {
            animation: none !important;
          }
          
          .battery-optimized video {
            display: none !important;
          }
          
          .battery-optimized canvas {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
        optimizationStyleRef.current = style;
      }
      document.body.classList.add('battery-optimized');
    } else {
      document.body.classList.remove('battery-optimized');
      if (optimizationStyleRef.current) {
        document.head.removeChild(optimizationStyleRef.current);
        optimizationStyleRef.current = null;
      }
    }
  }, [finalConfig.enableAnimationReduction]);

  // 백그라운드 작업 최적화
  const optimizeBackgroundTasks = useCallback((enable: boolean) => {
    if (!finalConfig.enableBackgroundTaskReduction) return;

    if (enable) {
      // 기존 interval과 timeout 저장 및 정리
      const originalSetInterval = window.setInterval;
      const originalSetTimeout = window.setTimeout;

      window.setInterval = function(callback: Function, delay: number, ...args: any[]) {
        // 배터리 절약 모드에서는 interval 주기를 늘림
        const optimizedDelay = Math.max(delay * 2, 5000);
        const id = originalSetInterval.call(this, callback, optimizedDelay, ...args);
        intervalIdsRef.current.add(id);
        return id;
      };

      window.setTimeout = function(callback: Function, delay: number, ...args: any[]) {
        // 짧은 timeout은 지연시킴
        const optimizedDelay = delay < 1000 ? Math.max(delay * 2, 1000) : delay;
        const id = originalSetTimeout.call(this, callback, optimizedDelay, ...args);
        timeoutIdsRef.current.add(id);
        return id;
      };

      // Service Worker 메시지 최적화
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'BATTERY_OPTIMIZATION',
          enabled: true
        });
      }
    } else {
      // 원래 함수 복원
      window.setInterval = window.setInterval;
      window.setTimeout = window.setTimeout;

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'BATTERY_OPTIMIZATION',
          enabled: false
        });
      }
    }
  }, [finalConfig.enableBackgroundTaskReduction]);

  // 네트워크 최적화
  const optimizeNetwork = useCallback((enable: boolean) => {
    if (!finalConfig.enableNetworkOptimization) return;

    if (enable) {
      // 이미지 품질 최적화
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && !img.dataset.originalSrc) {
          img.dataset.originalSrc = img.src;
          // 저품질 이미지로 교체 (예: WebP, 낮은 해상도)
          const url = new URL(img.src);
          url.searchParams.set('quality', '50');
          url.searchParams.set('format', 'webp');
          img.src = url.toString();
        }
      });

      // 불필요한 네트워크 요청 차단
      const originalFetch = window.fetch;
      window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input.toString();
        
        // 분석 및 추적 요청 차단
        if (url.includes('analytics') || url.includes('tracking') || url.includes('ads')) {
          return Promise.reject(new Error('Request blocked for battery optimization'));
        }
        
        return originalFetch.call(this, input, init);
      };
    } else {
      // 원본 이미지 복원
      const images = document.querySelectorAll('img[data-original-src]');
      images.forEach(img => {
        if (img.dataset.originalSrc) {
          img.src = img.dataset.originalSrc;
          delete img.dataset.originalSrc;
        }
      });

      // 원래 fetch 복원
      window.fetch = window.fetch;
    }
  }, [finalConfig.enableNetworkOptimization]);

  // CPU 스로틀링
  const optimizeCPU = useCallback((enable: boolean) => {
    if (!finalConfig.enableCPUThrottling) return;

    if (enable) {
      // requestAnimationFrame 최적화
      const originalRAF = window.requestAnimationFrame;
      let rafThrottle = 0;
      
      window.requestAnimationFrame = function(callback: FrameRequestCallback) {
        rafThrottle++;
        // 매 3번째 프레임만 실행 (20fps로 제한)
        if (rafThrottle % 3 === 0) {
          return originalRAF.call(this, callback);
        }
        return originalRAF.call(this, () => {});
      };

      // Web Worker 사용 제한
      const originalWorker = window.Worker;
      window.Worker = function(scriptURL: string | URL, options?: WorkerOptions) {
        console.warn('Worker creation blocked for battery optimization');
        throw new Error('Worker blocked for battery optimization');
      };
    } else {
      // 원래 함수들 복원
      window.requestAnimationFrame = window.requestAnimationFrame;
      window.Worker = window.Worker;
    }
  }, [finalConfig.enableCPUThrottling]);

  // 최적화 적용
  const applyOptimizations = useCallback((isLowBattery: boolean, isCriticalBattery: boolean) => {
    const optimizations: string[] = [];

    if (isLowBattery || isCriticalBattery) {
      optimizeAnimations(true);
      optimizations.push('animations');

      optimizeBackgroundTasks(true);
      optimizations.push('background-tasks');

      if (isCriticalBattery) {
        optimizeNetwork(true);
        optimizations.push('network');

        optimizeCPU(true);
        optimizations.push('cpu');
      }

      setOptimizationState(prev => ({
        ...prev,
        isOptimized: true,
        optimizationsApplied: optimizations
      }));

      console.log('Battery optimizations applied:', optimizations);
    } else {
      // 최적화 해제
      optimizeAnimations(false);
      optimizeBackgroundTasks(false);
      optimizeNetwork(false);
      optimizeCPU(false);

      setOptimizationState(prev => ({
        ...prev,
        isOptimized: false,
        optimizationsApplied: []
      }));

      console.log('Battery optimizations removed');
    }
  }, [optimizeAnimations, optimizeBackgroundTasks, optimizeNetwork, optimizeCPU]);

  // 배터리 API 초기화
  useEffect(() => {
    if ('getBattery' in navigator) {
      setIsSupported(true);
      
      (navigator as any).getBattery().then((battery: any) => {
        batteryRef.current = battery;
        updateBatteryInfo(battery);

        // 배터리 이벤트 리스너 등록
        const handleBatteryChange = () => updateBatteryInfo(battery);
        
        battery.addEventListener('chargingchange', handleBatteryChange);
        battery.addEventListener('levelchange', handleBatteryChange);
        battery.addEventListener('chargingtimechange', handleBatteryChange);
        battery.addEventListener('dischargingtimechange', handleBatteryChange);

        return () => {
          battery.removeEventListener('chargingchange', handleBatteryChange);
          battery.removeEventListener('levelchange', handleBatteryChange);
          battery.removeEventListener('chargingtimechange', handleBatteryChange);
          battery.removeEventListener('dischargingtimechange', handleBatteryChange);
        };
      }).catch((error: Error) => {
        console.warn('Battery API not available:', error);
        setIsSupported(false);
      });
    } else {
      setIsSupported(false);
    }
  }, [updateBatteryInfo]);

  // 최적화 상태 변경 감지
  useEffect(() => {
    if (batteryInfo) {
      applyOptimizations(optimizationState.isLowBattery, optimizationState.isCriticalBattery);
    }
  }, [optimizationState.isLowBattery, optimizationState.isCriticalBattery, batteryInfo, applyOptimizations]);

  // 정리
  useEffect(() => {
    return () => {
      // 모든 interval과 timeout 정리
      intervalIdsRef.current.forEach(id => clearInterval(id));
      timeoutIdsRef.current.forEach(id => clearTimeout(id));
      
      // 최적화 해제
      optimizeAnimations(false);
      optimizeBackgroundTasks(false);
      optimizeNetwork(false);
      optimizeCPU(false);
    };
  }, [optimizeAnimations, optimizeBackgroundTasks, optimizeNetwork, optimizeCPU]);

  // 수동 최적화 토글
  const toggleOptimization = useCallback((force?: boolean) => {
    const shouldOptimize = force !== undefined ? force : !optimizationState.isOptimized;
    applyOptimizations(shouldOptimize, shouldOptimize);
  }, [optimizationState.isOptimized, applyOptimizations]);

  return {
    batteryInfo,
    optimizationState,
    isSupported,
    toggleOptimization,
    config: finalConfig
  };
};