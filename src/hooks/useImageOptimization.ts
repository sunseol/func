'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import { 
  preloadImage, 
  getNetworkOptimizedQuality,
  shouldLoadHighResolution,
  getOptimalImageFormat,
  LazyImageLoader
} from '@/lib/asset-optimization';

interface UseImageOptimizationOptions {
  preloadCritical?: boolean;
  lazyLoad?: boolean;
  adaptiveQuality?: boolean;
  networkAware?: boolean;
}

interface ImageOptimizationState {
  isLoading: boolean;
  hasError: boolean;
  quality: number;
  format: 'webp' | 'avif' | 'jpeg';
  shouldUseHighRes: boolean;
}

/**
 * 이미지 최적화를 위한 커스텀 훅
 */
export function useImageOptimization(
  src: string,
  options: UseImageOptimizationOptions = {}
) {
  const { isMobile } = useViewport();
  const [state, setState] = useState<ImageOptimizationState>({
    isLoading: true,
    hasError: false,
    quality: 75,
    format: 'webp',
    shouldUseHighRes: true,
  });

  const lazyLoaderRef = useRef<LazyImageLoader | null>(null);

  // 최적화 설정 계산
  const calculateOptimizations = useCallback(() => {
    const quality = options.adaptiveQuality 
      ? getNetworkOptimizedQuality(isMobile ? 65 : 75)
      : (isMobile ? 65 : 75);
    
    const format = getOptimalImageFormat();
    const shouldUseHighRes = shouldLoadHighResolution();

    setState(prev => ({
      ...prev,
      quality,
      format,
      shouldUseHighRes,
    }));
  }, [isMobile, options.adaptiveQuality]);

  // 이미지 프리로드
  const preloadImageAsync = useCallback(async () => {
    if (!options.preloadCritical) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, hasError: false }));
      
      await preloadImage(src, {
        quality: state.quality,
        format: state.format,
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, hasError: true }));
    }
  }, [src, options.preloadCritical, state.quality, state.format]);

  // 네트워크 상태 변화 감지
  useEffect(() => {
    if (!options.networkAware) return;

    const handleNetworkChange = () => {
      calculateOptimizations();
    };

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleNetworkChange);
      return () => connection.removeEventListener('change', handleNetworkChange);
    }
  }, [options.networkAware, calculateOptimizations]);

  // 초기 최적화 설정
  useEffect(() => {
    calculateOptimizations();
  }, [calculateOptimizations]);

  // 이미지 프리로드 실행
  useEffect(() => {
    preloadImageAsync();
  }, [preloadImageAsync]);

  // Lazy loader 초기화
  useEffect(() => {
    if (options.lazyLoad && !lazyLoaderRef.current) {
      lazyLoaderRef.current = new LazyImageLoader();
    }

    return () => {
      if (lazyLoaderRef.current) {
        lazyLoaderRef.current.disconnect();
        lazyLoaderRef.current = null;
      }
    };
  }, [options.lazyLoad]);

  return {
    ...state,
    lazyLoader: lazyLoaderRef.current,
    recalculateOptimizations: calculateOptimizations,
  };
}

/**
 * 이미지 갤러리 최적화를 위한 훅
 */
export function useImageGalleryOptimization(images: string[]) {
  const { isMobile } = useViewport();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer 설정
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const src = entry.target.getAttribute('data-src');
          if (src && entry.isIntersecting) {
            setVisibleImages(prev => new Set([...prev, src]));
          }
        });
      },
      {
        rootMargin: isMobile ? '100px' : '200px', // 모바일에서는 더 작은 마진
        threshold: 0.1,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isMobile]);

  // 이미지 로딩 상태 관리
  const handleImageLoad = useCallback((src: string) => {
    setLoadedImages(prev => new Set([...prev, src]));
  }, []);

  const handleImageError = useCallback((src: string) => {
    setFailedImages(prev => new Set([...prev, src]));
  }, []);

  // 이미지 요소 관찰 시작
  const observeImage = useCallback((element: HTMLElement, src: string) => {
    if (observerRef.current) {
      element.setAttribute('data-src', src);
      observerRef.current.observe(element);
    }
  }, []);

  // 이미지 요소 관찰 중지
  const unobserveImage = useCallback((element: HTMLElement) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element);
    }
  }, []);

  // 중요 이미지들 프리로드 (첫 번째 몇 개)
  const preloadCriticalImages = useCallback(async (count: number = 3) => {
    const criticalImages = images.slice(0, count);
    const quality = getNetworkOptimizedQuality(isMobile ? 60 : 75);

    const preloadPromises = criticalImages.map(src =>
      preloadImage(src, {
        quality,
        format: getOptimalImageFormat(),
        width: isMobile ? 400 : 600,
      }).catch(() => {
        // 프리로드 실패는 무시 (실제 로딩 시 재시도)
      })
    );

    await Promise.allSettled(preloadPromises);
  }, [images, isMobile]);

  return {
    loadedImages,
    failedImages,
    visibleImages,
    observeImage,
    unobserveImage,
    handleImageLoad,
    handleImageError,
    preloadCriticalImages,
  };
}

/**
 * 적응형 이미지 품질 관리 훅
 */
export function useAdaptiveImageQuality() {
  const { isMobile } = useViewport();
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState<'webp' | 'avif' | 'jpeg'>('webp');

  // 네트워크 상태 기반 품질 조정
  const updateQuality = useCallback(() => {
    const networkQuality = getNetworkOptimizedQuality(isMobile ? 65 : 75);
    const optimalFormat = getOptimalImageFormat();
    
    setQuality(networkQuality);
    setFormat(optimalFormat);
  }, [isMobile]);

  // 배터리 상태 기반 조정
  useEffect(() => {
    const battery = (navigator as any).getBattery?.();
    
    if (battery) {
      battery.then((batteryManager: any) => {
        const handleBatteryChange = () => {
          const { level, charging } = batteryManager;
          
          if (level < 0.2 && !charging) {
            setQuality(prev => Math.max(prev - 20, 30));
            setFormat('jpeg'); // 더 호환성 좋은 포맷 사용
          } else if (level < 0.5 && !charging) {
            setQuality(prev => Math.max(prev - 10, 50));
          }
        };

        batteryManager.addEventListener('levelchange', handleBatteryChange);
        batteryManager.addEventListener('chargingchange', handleBatteryChange);
        
        return () => {
          batteryManager.removeEventListener('levelchange', handleBatteryChange);
          batteryManager.removeEventListener('chargingchange', handleBatteryChange);
        };
      });
    }
  }, []);

  // 네트워크 변화 감지
  useEffect(() => {
    updateQuality();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, [updateQuality]);

  return { quality, format, updateQuality };
}

/**
 * 이미지 메모리 사용량 최적화 훅
 */
export function useImageMemoryOptimization() {
  const [memoryPressure, setMemoryPressure] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    // 메모리 사용량 모니터링
    const checkMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = memory;
        const usageRatio = usedJSHeapSize / jsHeapSizeLimit;
        
        if (usageRatio > 0.8) {
          setMemoryPressure('high');
        } else if (usageRatio > 0.6) {
          setMemoryPressure('medium');
        } else {
          setMemoryPressure('low');
        }
      }
    };

    // 주기적으로 메모리 사용량 확인
    const interval = setInterval(checkMemoryUsage, 10000); // 10초마다
    checkMemoryUsage(); // 초기 확인

    return () => clearInterval(interval);
  }, []);

  // 메모리 압박 상황에 따른 이미지 설정 반환
  const getMemoryOptimizedSettings = useCallback(() => {
    switch (memoryPressure) {
      case 'high':
        return {
          quality: 40,
          maxWidth: 300,
          format: 'jpeg' as const,
          lazy: true,
          preload: false,
        };
      case 'medium':
        return {
          quality: 55,
          maxWidth: 500,
          format: 'webp' as const,
          lazy: true,
          preload: false,
        };
      default:
        return {
          quality: 75,
          maxWidth: 800,
          format: 'webp' as const,
          lazy: true,
          preload: true,
        };
    }
  }, [memoryPressure]);

  return {
    memoryPressure,
    getMemoryOptimizedSettings,
  };
}