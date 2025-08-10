import { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  scrollPerformance: number;
  touchResponseTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  isCharging?: boolean;
  fps: number;
  paintTime: number;
  layoutTime: number;
  // Enhanced metrics
  cpuUsage: number;
  networkLatency: number;
  domNodes: number;
  eventListeners: number;
  imageLoadTime: number;
  bundleSize: number;
  cacheHitRate: number;
  longTasks: number;
  inputDelay: number;
  visualStability: number;
}

interface PerformanceThresholds {
  maxRenderTime: number; // 16ms for 60fps
  maxTouchDelay: number; // 100ms
  maxMemoryUsage: number; // MB
  minFps: number; // 55fps minimum
  maxPaintTime: number; // 10ms
  maxLayoutTime: number; // 5ms
  // Enhanced thresholds
  maxCpuUsage: number; // 70%
  maxNetworkLatency: number; // 200ms
  maxDomNodes: number; // 1500
  maxEventListeners: number; // 100
  maxImageLoadTime: number; // 3000ms
  maxBundleSize: number; // 2MB
  minCacheHitRate: number; // 80%
  maxLongTasks: number; // 5 per minute
  maxInputDelay: number; // 50ms
  minVisualStability: number; // 0.1 CLS score
}

interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  maxRenderTime: 16,
  maxTouchDelay: 100,
  maxMemoryUsage: 50,
  minFps: 55,
  maxPaintTime: 10,
  maxLayoutTime: 5,
  // Enhanced thresholds
  maxCpuUsage: 70,
  maxNetworkLatency: 200,
  maxDomNodes: 1500,
  maxEventListeners: 100,
  maxImageLoadTime: 3000,
  maxBundleSize: 2,
  minCacheHitRate: 80,
  maxLongTasks: 5,
  maxInputDelay: 50,
  minVisualStability: 0.1
};

export const useMobilePerformanceMonitor = (
  enabled: boolean = true,
  thresholds: Partial<PerformanceThresholds> = {}
) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    scrollPerformance: 0,
    touchResponseTime: 0,
    memoryUsage: 0,
    fps: 60,
    paintTime: 0,
    layoutTime: 0,
    // Enhanced metrics
    cpuUsage: 0,
    networkLatency: 0,
    domNodes: 0,
    eventListeners: 0,
    imageLoadTime: 0,
    bundleSize: 0,
    cacheHitRate: 100,
    longTasks: 0,
    inputDelay: 0,
    visualStability: 0
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);
  const touchStartTimeRef = useRef<number>(0);
  const renderStartTimeRef = useRef<number>(0);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const longTaskObserverRef = useRef<PerformanceObserver | null>(null);
  const layoutShiftObserverRef = useRef<PerformanceObserver | null>(null);
  const cpuUsageHistoryRef = useRef<number[]>([]);
  const networkRequestsRef = useRef<Map<string, number>>(new Map());
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });
  const longTaskCountRef = useRef(0);
  const lastLongTaskResetRef = useRef(Date.now());
  const visualStabilityRef = useRef(0);
  
  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // FPS 측정
  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    const fps = 1000 / delta;
    
    fpsHistoryRef.current.push(fps);
    if (fpsHistoryRef.current.length > 60) {
      fpsHistoryRef.current.shift();
    }
    
    const averageFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
    
    lastFrameTimeRef.current = now;
    frameCountRef.current++;
    
    return averageFps;
  }, []);

  // 메모리 사용량 측정
  const measureMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }, []);

  // 배터리 정보 측정
  const measureBatteryInfo = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          batteryLevel: Math.round(battery.level * 100),
          isCharging: battery.charging
        };
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
    return {};
  }, []);

  // 터치 응답 시간 측정
  const measureTouchResponse = useCallback((startTime: number): number => {
    return performance.now() - startTime;
  }, []);

  // CPU 사용량 측정 (근사치)
  const measureCPUUsage = useCallback((): number => {
    const start = performance.now();
    let iterations = 0;
    const maxTime = 5; // 5ms 동안 측정
    
    while (performance.now() - start < maxTime) {
      iterations++;
    }
    
    const actualTime = performance.now() - start;
    const expectedIterations = iterations * (maxTime / actualTime);
    const cpuUsage = Math.min(100, Math.max(0, 100 - (iterations / expectedIterations) * 100));
    
    cpuUsageHistoryRef.current.push(cpuUsage);
    if (cpuUsageHistoryRef.current.length > 10) {
      cpuUsageHistoryRef.current.shift();
    }
    
    return cpuUsageHistoryRef.current.reduce((a, b) => a + b, 0) / cpuUsageHistoryRef.current.length;
  }, []);

  // 네트워크 지연시간 측정 (404 방지: data URL 사용)
  const measureNetworkLatency = useCallback(async (): Promise<number> => {
    try {
      const start = performance.now();
      await fetch('data:text/plain;base64,AA==', { cache: 'no-store' });
      return performance.now() - start;
    } catch (error) {
      return 0;
    }
  }, []);

  // DOM 노드 수 측정
  const measureDOMNodes = useCallback((): number => {
    return document.querySelectorAll('*').length;
  }, []);

  // 이벤트 리스너 수 측정 (근사치)
  const measureEventListeners = useCallback((): number => {
    let count = 0;
    const elements = document.querySelectorAll('*');
    
    elements.forEach(element => {
      // 일반적인 이벤트 타입들을 확인
      const events = ['click', 'touchstart', 'touchend', 'scroll', 'resize', 'load'];
      events.forEach(eventType => {
        if ((element as any)[`on${eventType}`]) {
          count++;
        }
      });
    });
    
    return count;
  }, []);

  // 이미지 로딩 시간 측정
  const measureImageLoadTime = useCallback((): number => {
    const images = document.querySelectorAll('img');
    let totalLoadTime = 0;
    let loadedImages = 0;
    
    images.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        // 이미 로드된 이미지의 경우 performance API에서 정보 가져오기
        const entries = performance.getEntriesByName(img.src);
        if (entries.length > 0) {
          const entry = entries[entries.length - 1] as PerformanceResourceTiming;
          totalLoadTime += entry.responseEnd - entry.requestStart;
          loadedImages++;
        }
      }
    });
    
    return loadedImages > 0 ? totalLoadTime / loadedImages : 0;
  }, []);

  // 번들 크기 측정
  const measureBundleSize = useCallback((): number => {
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src) {
        const entries = performance.getEntriesByName(src);
        if (entries.length > 0) {
          const entry = entries[entries.length - 1] as PerformanceResourceTiming;
          totalSize += entry.transferSize || entry.encodedBodySize || 0;
        }
      }
    });
    
    return Math.round(totalSize / 1024 / 1024 * 100) / 100; // MB
  }, []);

  // 캐시 히트율 측정
  const measureCacheHitRate = useCallback((): number => {
    const total = cacheStatsRef.current.hits + cacheStatsRef.current.misses;
    return total > 0 ? (cacheStatsRef.current.hits / total) * 100 : 100;
  }, []);

  // 입력 지연시간 측정
  const measureInputDelay = useCallback((eventTime: number): number => {
    return performance.now() - eventTime;
  }, []);

  // 시각적 안정성 값은 Observer에서 갱신된 ref를 사용
  const measureVisualStability = useCallback((): number => {
    return visualStabilityRef.current;
  }, []);

  // Performance Observer 설정
  const setupPerformanceObserver = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    try {
      // 기본 성능 메트릭 관찰
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'paint') {
            setMetrics(prev => ({
              ...prev,
              paintTime: entry.startTime
            }));
          } else if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            setMetrics(prev => ({
              ...prev,
              networkLatency: navEntry.responseStart - navEntry.requestStart
            }));
          } else if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            // 캐시 히트/미스 추적
            if (resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0) {
              cacheStatsRef.current.hits++;
            } else {
              cacheStatsRef.current.misses++;
            }
          }
        });
      });

      observerRef.current.observe({ entryTypes: ['paint', 'navigation', 'resource'] });

      // Long Task Observer
      if ('PerformanceObserver' in window) {
        try {
          longTaskObserverRef.current = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const now = Date.now();
            
            // 1분마다 카운트 리셋
            if (now - lastLongTaskResetRef.current > 60000) {
              longTaskCountRef.current = 0;
              lastLongTaskResetRef.current = now;
            }
            
            longTaskCountRef.current += entries.length;
            
            setMetrics(prev => ({
              ...prev,
              longTasks: longTaskCountRef.current
            }));
          });

          longTaskObserverRef.current.observe({ entryTypes: ['longtask'] });
        } catch (error) {
          console.warn('Long Task Observer not supported:', error);
        }
      }

      // Layout Shift Observer
      if ('PerformanceObserver' in window) {
        try {
          layoutShiftObserverRef.current = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            let clsScore = 0;
            
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsScore += entry.value;
              }
            });
            
            visualStabilityRef.current = clsScore;
            setMetrics(prev => ({
              ...prev,
              visualStability: clsScore,
              layoutTime: clsScore * 1000 // ms로 변환
            }));
          });

          layoutShiftObserverRef.current.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('Layout Shift Observer not supported:', error);
        }
      }
    } catch (error) {
      console.warn('Performance Observer setup failed:', error);
    }
  }, []);

  // 알림 생성
  const createAlert = useCallback((
    type: 'warning' | 'critical',
    metric: keyof PerformanceMetrics,
    value: number,
    threshold: number,
    message: string
  ) => {
    const alert: PerformanceAlert = {
      type,
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      message
    };

    setAlerts(prev => [...prev.slice(-9), alert]); // 최대 10개 알림 유지
  }, []);

  // 성능 메트릭 검증
  const validateMetrics = useCallback((newMetrics: PerformanceMetrics) => {
    // FPS 검증
    if (newMetrics.fps < finalThresholds.minFps) {
      createAlert(
        'warning',
        'fps',
        newMetrics.fps,
        finalThresholds.minFps,
        `낮은 FPS 감지: ${newMetrics.fps.toFixed(1)}fps`
      );
    }

    // 렌더링 시간 검증
    if (newMetrics.renderTime > finalThresholds.maxRenderTime) {
      createAlert(
        'critical',
        'renderTime',
        newMetrics.renderTime,
        finalThresholds.maxRenderTime,
        `렌더링 지연: ${newMetrics.renderTime.toFixed(1)}ms`
      );
    }

    // 터치 응답 시간 검증
    if (newMetrics.touchResponseTime > finalThresholds.maxTouchDelay) {
      createAlert(
        'warning',
        'touchResponseTime',
        newMetrics.touchResponseTime,
        finalThresholds.maxTouchDelay,
        `터치 응답 지연: ${newMetrics.touchResponseTime.toFixed(1)}ms`
      );
    }

    // 메모리 사용량 검증
    if (newMetrics.memoryUsage > finalThresholds.maxMemoryUsage) {
      createAlert(
        'critical',
        'memoryUsage',
        newMetrics.memoryUsage,
        finalThresholds.maxMemoryUsage,
        `높은 메모리 사용량: ${newMetrics.memoryUsage}MB`
      );
    }

    // CPU 사용량 검증
    if (newMetrics.cpuUsage > finalThresholds.maxCpuUsage) {
      createAlert(
        'critical',
        'cpuUsage',
        newMetrics.cpuUsage,
        finalThresholds.maxCpuUsage,
        `높은 CPU 사용량: ${newMetrics.cpuUsage.toFixed(1)}%`
      );
    }

    // 네트워크 지연시간 검증
    if (newMetrics.networkLatency > finalThresholds.maxNetworkLatency) {
      createAlert(
        'warning',
        'networkLatency',
        newMetrics.networkLatency,
        finalThresholds.maxNetworkLatency,
        `네트워크 지연: ${newMetrics.networkLatency.toFixed(1)}ms`
      );
    }

    // DOM 노드 수 검증
    if (newMetrics.domNodes > finalThresholds.maxDomNodes) {
      createAlert(
        'warning',
        'domNodes',
        newMetrics.domNodes,
        finalThresholds.maxDomNodes,
        `과도한 DOM 노드: ${newMetrics.domNodes}개`
      );
    }

    // 이벤트 리스너 수 검증
    if (newMetrics.eventListeners > finalThresholds.maxEventListeners) {
      createAlert(
        'warning',
        'eventListeners',
        newMetrics.eventListeners,
        finalThresholds.maxEventListeners,
        `과도한 이벤트 리스너: ${newMetrics.eventListeners}개`
      );
    }

    // 이미지 로딩 시간 검증
    if (newMetrics.imageLoadTime > finalThresholds.maxImageLoadTime) {
      createAlert(
        'warning',
        'imageLoadTime',
        newMetrics.imageLoadTime,
        finalThresholds.maxImageLoadTime,
        `이미지 로딩 지연: ${newMetrics.imageLoadTime.toFixed(1)}ms`
      );
    }

    // 번들 크기 검증
    if (newMetrics.bundleSize > finalThresholds.maxBundleSize) {
      createAlert(
        'warning',
        'bundleSize',
        newMetrics.bundleSize,
        finalThresholds.maxBundleSize,
        `큰 번들 크기: ${newMetrics.bundleSize.toFixed(2)}MB`
      );
    }

    // 캐시 히트율 검증
    if (newMetrics.cacheHitRate < finalThresholds.minCacheHitRate) {
      createAlert(
        'warning',
        'cacheHitRate',
        newMetrics.cacheHitRate,
        finalThresholds.minCacheHitRate,
        `낮은 캐시 히트율: ${newMetrics.cacheHitRate.toFixed(1)}%`
      );
    }

    // Long Task 검증
    if (newMetrics.longTasks > finalThresholds.maxLongTasks) {
      createAlert(
        'critical',
        'longTasks',
        newMetrics.longTasks,
        finalThresholds.maxLongTasks,
        `과도한 Long Task: ${newMetrics.longTasks}개/분`
      );
    }

    // 입력 지연시간 검증
    if (newMetrics.inputDelay > finalThresholds.maxInputDelay) {
      createAlert(
        'warning',
        'inputDelay',
        newMetrics.inputDelay,
        finalThresholds.maxInputDelay,
        `입력 지연: ${newMetrics.inputDelay.toFixed(1)}ms`
      );
    }

    // 시각적 안정성 검증
    if (newMetrics.visualStability > finalThresholds.minVisualStability) {
      createAlert(
        'warning',
        'visualStability',
        newMetrics.visualStability,
        finalThresholds.minVisualStability,
        `레이아웃 불안정: CLS ${newMetrics.visualStability.toFixed(3)}`
      );
    }
  }, [finalThresholds, createAlert]);

  // 성능 측정 시작
  const startMonitoring = useCallback(() => {
    if (!enabled) return;

    setIsMonitoring(true);
    setupPerformanceObserver();

    const measurePerformance = async () => {
      const fps = measureFPS();
      const memoryUsage = measureMemoryUsage();
      const batteryInfo = await measureBatteryInfo();
      const cpuUsage = measureCPUUsage();
      const networkLatency = await measureNetworkLatency();
      const domNodes = measureDOMNodes();
      const eventListeners = measureEventListeners();
      const imageLoadTime = measureImageLoadTime();
      const bundleSize = measureBundleSize();
      const cacheHitRate = measureCacheHitRate();
      const visualStability = measureVisualStability();

      const newMetrics: PerformanceMetrics = {
        ...metrics,
        fps,
        memoryUsage,
        cpuUsage,
        networkLatency,
        domNodes,
        eventListeners,
        imageLoadTime,
        bundleSize,
        cacheHitRate,
        visualStability,
        ...batteryInfo
      };

      setMetrics(newMetrics);
      validateMetrics(newMetrics);
    };

    const intervalId = setInterval(measurePerformance, 1000); // 1초마다 측정

    return () => {
      clearInterval(intervalId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (longTaskObserverRef.current) {
        longTaskObserverRef.current.disconnect();
      }
      if (layoutShiftObserverRef.current) {
        layoutShiftObserverRef.current.disconnect();
      }
    };
  }, [enabled, measureFPS, measureMemoryUsage, measureBatteryInfo, validateMetrics, metrics, setupPerformanceObserver]);

  // 터치 이벤트 리스너
  useEffect(() => {
    if (!enabled || !isMonitoring) return;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartTimeRef.current = performance.now();
      
      // 입력 지연시간 측정
      const inputDelay = measureInputDelay(event.timeStamp);
      setMetrics(prev => ({
        ...prev,
        inputDelay
      }));
    };

    const handleTouchEnd = () => {
      if (touchStartTimeRef.current > 0) {
        const responseTime = measureTouchResponse(touchStartTimeRef.current);
        setMetrics(prev => ({
          ...prev,
          touchResponseTime: responseTime
        }));
        touchStartTimeRef.current = 0;
      }
    };

    // 클릭 이벤트도 모니터링
    const handleClick = (event: MouseEvent) => {
      const inputDelay = measureInputDelay(event.timeStamp);
      setMetrics(prev => ({
        ...prev,
        inputDelay
      }));
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('click', handleClick);
    };
  }, [enabled, isMonitoring, measureTouchResponse, measureInputDelay]);

  // 렌더링 성능 측정
  const measureRenderTime = useCallback((callback: () => void) => {
    if (!enabled) {
      callback();
      return;
    }

    renderStartTimeRef.current = performance.now();
    
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStartTimeRef.current;
      setMetrics(prev => ({
        ...prev,
        renderTime
      }));
      callback();
    });
  }, [enabled]);

  // 스크롤 성능 측정
  useEffect(() => {
    if (!enabled || !isMonitoring) return;

    let scrollStartTime = 0;
    let isScrolling = false;

    const handleScrollStart = () => {
      if (!isScrolling) {
        scrollStartTime = performance.now();
        isScrolling = true;
      }
    };

    const handleScrollEnd = () => {
      if (isScrolling) {
        const scrollTime = performance.now() - scrollStartTime;
        setMetrics(prev => ({
          ...prev,
          scrollPerformance: scrollTime
        }));
        isScrolling = false;
      }
    };

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      handleScrollStart();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollEnd, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [enabled, isMonitoring]);

  // 모니터링 시작/중지
  useEffect(() => {
    if (enabled) {
      const cleanup = startMonitoring();
      return cleanup;
    } else {
      setIsMonitoring(false);
    }
  }, [enabled, startMonitoring]);

  // 알림 제거
  const dismissAlert = useCallback((timestamp: number) => {
    setAlerts(prev => prev.filter(alert => alert.timestamp !== timestamp));
  }, []);

  // 모든 알림 제거
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // 성능 리포트 생성
  const generateReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      thresholds: finalThresholds,
      alerts: alerts.length,
      recommendations: []
    };

    // 권장사항 생성
    const recommendations: string[] = [];
    
    if (metrics.fps < finalThresholds.minFps) {
      recommendations.push('애니메이션 최적화 또는 복잡한 렌더링 로직 개선 필요');
    }
    
    if (metrics.memoryUsage > finalThresholds.maxMemoryUsage) {
      recommendations.push('메모리 누수 확인 및 불필요한 객체 정리 필요');
    }
    
    if (metrics.touchResponseTime > finalThresholds.maxTouchDelay) {
      recommendations.push('터치 이벤트 핸들러 최적화 필요');
    }

    return { ...report, recommendations };
  }, [metrics, finalThresholds, alerts]);

  return {
    metrics,
    alerts,
    isMonitoring,
    measureRenderTime,
    dismissAlert,
    clearAlerts,
    generateReport,
    thresholds: finalThresholds
  };
};