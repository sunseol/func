'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useMobilePerformanceMonitor } from '@/hooks/useMobilePerformanceMonitor';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enableOptimizations?: boolean;
  enableMonitoring?: boolean;
}

interface OptimizationConfig {
  enableImageLazyLoading: boolean;
  enableComponentPreloading: boolean;
  enableMemoryCleanup: boolean;
  enableBatteryOptimization: boolean;
  enableRenderOptimization: boolean;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  enableImageLazyLoading: true,
  enableComponentPreloading: true,
  enableMemoryCleanup: true,
  enableBatteryOptimization: true,
  enableRenderOptimization: true
};

const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  children,
  enableOptimizations = true,
  enableMonitoring = process.env.NODE_ENV === 'development'
}) => {
  const { isMobile } = useBreakpoint();
  const { metrics, alerts } = useMobilePerformanceMonitor(enableMonitoring && isMobile);
  
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderOptimizationRef = useRef<boolean>(false);
  const lastCleanupRef = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 메모리 정리 최적화
  const performMemoryCleanup = useCallback(() => {
    const now = Date.now();
    
    // 5분마다 메모리 정리 수행
    if (now - lastCleanupRef.current < 300000) return;
    
    try {
      // 사용하지 않는 이미지 캐시 정리
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('image-cache')) {
              caches.open(cacheName).then(cache => {
                cache.keys().then(requests => {
                  // 오래된 캐시 항목 정리 (1시간 이상)
                  requests.forEach(request => {
                    const url = new URL(request.url);
                    const timestamp = url.searchParams.get('timestamp');
                    if (timestamp && now - parseInt(timestamp) > 3600000) {
                      cache.delete(request);
                    }
                  });
                });
              });
            }
          });
        });
      }

      // DOM 요소 정리
      const unusedElements = document.querySelectorAll('[data-cleanup="true"]');
      unusedElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      // 이벤트 리스너 정리
      const elementsWithListeners = document.querySelectorAll('[data-has-listeners="true"]');
      elementsWithListeners.forEach(element => {
        const listeners = (element as any)._listeners;
        if (listeners) {
          Object.keys(listeners).forEach(event => {
            listeners[event].forEach((listener: EventListener) => {
              element.removeEventListener(event, listener);
            });
          });
          delete (element as any)._listeners;
        }
      });

      lastCleanupRef.current = now;
      console.log('Memory cleanup performed');
    } catch (error) {
      console.warn('Memory cleanup failed:', error);
    }
  }, []);

  // 배터리 최적화
  const optimizeForBattery = useCallback(() => {
    if (!('getBattery' in navigator)) return;

    (navigator as any).getBattery().then((battery: any) => {
      const isLowBattery = battery.level < 0.2;
      const isNotCharging = !battery.charging;

      if (isLowBattery && isNotCharging) {
        // 배터리 절약 모드 활성화
        document.body.classList.add('battery-saver-mode');
        
        // 애니메이션 비활성화
        const style = document.createElement('style');
        style.textContent = `
          .battery-saver-mode * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        `;
        document.head.appendChild(style);

        // 불필요한 백그라운드 작업 중단
        const intervals = (window as any).__intervals || [];
        intervals.forEach((id: number) => clearInterval(id));
        
        console.log('Battery saver mode activated');
      } else {
        document.body.classList.remove('battery-saver-mode');
      }
    }).catch((error: Error) => {
      console.warn('Battery optimization failed:', error);
    });
  }, []);

  // 렌더링 최적화
  const optimizeRendering = useCallback(() => {
    if (renderOptimizationRef.current) return;
    
    renderOptimizationRef.current = true;

    // Intersection Observer로 뷰포트 밖 요소 최적화
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const element = entry.target as HTMLElement;
            
            if (entry.isIntersecting) {
              // 뷰포트에 들어온 요소 활성화
              element.classList.remove('performance-optimized-hidden');
              element.style.willChange = 'auto';
            } else {
              // 뷰포트 밖 요소 최적화
              element.classList.add('performance-optimized-hidden');
              element.style.willChange = 'auto';
              
              // 복잡한 요소의 경우 렌더링 최적화
              if (element.children.length > 10) {
                element.style.contentVisibility = 'auto';
                element.style.containIntrinsicSize = '1px 500px';
              }
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: 0.1
        }
      );

      // 최적화 대상 요소들 관찰
      const optimizableElements = document.querySelectorAll(
        '.project-card, .document-editor, .chat-panel, .workflow-sidebar'
      );
      
      optimizableElements.forEach(element => {
        observerRef.current?.observe(element);
      });
    }

    // CSS 최적화 스타일 추가
    const optimizationStyle = document.createElement('style');
    optimizationStyle.textContent = `
      .performance-optimized-hidden {
        pointer-events: none;
        user-select: none;
      }
      
      .performance-optimized-hidden * {
        animation-play-state: paused !important;
      }
      
      /* GPU 가속 최적화 */
      .gpu-accelerated {
        transform: translateZ(0);
        will-change: transform;
      }
      
      /* 스크롤 최적화 */
      .optimized-scroll {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(optimizationStyle);
  }, []);

  // 이미지 지연 로딩 최적화
  const optimizeImageLoading = useCallback(() => {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window && images.length > 0) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.getAttribute('data-src');
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px'
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }, []);

  // 성능 알림에 따른 자동 최적화
  useEffect(() => {
    if (!enableOptimizations || !isMobile) return;

    alerts.forEach(alert => {
      switch (alert.metric) {
        case 'memoryUsage':
          if (alert.type === 'critical') {
            performMemoryCleanup();
          }
          break;
          
        case 'fps':
          if (alert.value < 30) {
            optimizeRendering();
          }
          break;
          
        case 'batteryLevel':
          if (alert.value < 20) {
            optimizeForBattery();
          }
          break;
      }
    });
  }, [alerts, enableOptimizations, isMobile, performMemoryCleanup, optimizeRendering, optimizeForBattery]);

  // 주기적 최적화 수행
  useEffect(() => {
    if (!enableOptimizations || !isMobile) return;

    const performOptimizations = () => {
      // 메모리 사용량이 높을 때 정리 수행
      if (metrics.memoryUsage > 40) {
        performMemoryCleanup();
      }

      // FPS가 낮을 때 렌더링 최적화
      if (metrics.fps < 50) {
        optimizeRendering();
      }

      // 배터리 최적화
      optimizeForBattery();
      
      // 이미지 로딩 최적화
      optimizeImageLoading();
    };

    // 초기 최적화 수행
    performOptimizations();

    // 30초마다 최적화 수행
    const intervalId = setInterval(performOptimizations, 30000);

    return () => {
      clearInterval(intervalId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    enableOptimizations,
    isMobile,
    metrics.memoryUsage,
    metrics.fps,
    performMemoryCleanup,
    optimizeRendering,
    optimizeForBattery,
    optimizeImageLoading
  ]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 성능 최적화가 비활성화된 경우 children만 반환
  if (!enableOptimizations) {
    return <>{children}</>;
  }

  return (
    <div className="performance-optimizer-wrapper">
      {children}
    </div>
  );
};

export default PerformanceOptimizer;
