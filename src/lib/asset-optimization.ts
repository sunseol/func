'use client';

/**
 * 에셋 최적화를 위한 유틸리티 함수들
 */

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  blur?: boolean;
}

/**
 * 디바이스에 따른 이미지 URL 생성
 */
export function getOptimizedImageUrl(
  src: string, 
  options: ImageOptimizationOptions = {}
): string {
  if (typeof window === 'undefined') return src;
  
  const { 
    width, 
    height, 
    quality = 75, 
    format = 'webp',
    blur = false 
  } = options;
  
  // Next.js Image Optimization API 사용
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  
  // WebP 지원 확인
  const supportsWebP = checkWebPSupport();
  const finalFormat = supportsWebP ? format : 'jpeg';
  
  if (blur) params.set('blur', '10');
  
  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

/**
 * WebP 지원 여부 확인
 */
export function checkWebPSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 캐시된 결과가 있으면 사용
  const cached = sessionStorage.getItem('webp-support');
  if (cached !== null) {
    return cached === 'true';
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataURL = canvas.toDataURL('image/webp');
    const supported = dataURL.indexOf('data:image/webp') === 0;
    
    sessionStorage.setItem('webp-support', supported.toString());
    return supported;
  } catch {
    sessionStorage.setItem('webp-support', 'false');
    return false;
  }
}

/**
 * AVIF 지원 여부 확인
 */
export function checkAVIFSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const cached = sessionStorage.getItem('avif-support');
    if (cached !== null) {
      resolve(cached === 'true');
      return;
    }
    
    const avif = new Image();
    avif.onload = () => {
      sessionStorage.setItem('avif-support', 'true');
      resolve(true);
    };
    avif.onerror = () => {
      sessionStorage.setItem('avif-support', 'false');
      resolve(false);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

/**
 * 디바이스 픽셀 비율에 따른 이미지 크기 계산
 */
export function getDeviceOptimizedSize(
  baseWidth: number, 
  baseHeight: number
): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: baseWidth, height: baseHeight };
  }
  
  const dpr = window.devicePixelRatio || 1;
  const isMobile = window.innerWidth < 768;
  
  // 모바일에서는 DPR을 제한하여 성능 최적화
  const effectiveDPR = isMobile ? Math.min(dpr, 2) : dpr;
  
  return {
    width: Math.round(baseWidth * effectiveDPR),
    height: Math.round(baseHeight * effectiveDPR),
  };
}

/**
 * 네트워크 상태에 따른 이미지 품질 조정
 */
export function getNetworkOptimizedQuality(baseQuality: number = 75): number {
  if (typeof window === 'undefined') return baseQuality;
  
  const connection = (navigator as any).connection;
  if (!connection) return baseQuality;
  
  const { effectiveType, saveData, downlink } = connection;
  
  // 데이터 절약 모드가 활성화된 경우
  if (saveData) return Math.max(baseQuality - 30, 30);
  
  // 다운링크 속도 기반 품질 조정 (Mbps)
  if (downlink && downlink < 1.5) {
    return Math.max(baseQuality - 35, 25);
  }
  
  switch (effectiveType) {
    case 'slow-2g':
      return Math.max(baseQuality - 40, 25);
    case '2g':
      return Math.max(baseQuality - 30, 35);
    case '3g':
      return Math.max(baseQuality - 15, 50);
    case '4g':
    default:
      return baseQuality;
  }
}

/**
 * 모바일 디바이스에서 고해상도 이미지 로딩 방지
 */
export function shouldLoadHighResolution(): boolean {
  if (typeof window === 'undefined') return true;
  
  const isMobile = window.innerWidth < 768;
  const connection = (navigator as any).connection;
  
  // 모바일에서는 기본적으로 저해상도 우선
  if (isMobile) {
    // 좋은 네트워크 조건에서만 고해상도 허용
    if (connection) {
      const { effectiveType, saveData, downlink } = connection;
      
      if (saveData) return false;
      if (effectiveType === '4g' && downlink > 2) return true;
      
      return false;
    }
    
    // 네트워크 정보가 없으면 보수적으로 접근
    return false;
  }
  
  return true;
}

/**
 * 배터리 상태에 따른 이미지 최적화
 */
export function getBatteryOptimizedSettings(): {
  quality: number;
  format: 'webp' | 'jpeg';
  enableAnimations: boolean;
} {
  if (typeof window === 'undefined') {
    return { quality: 75, format: 'webp', enableAnimations: true };
  }
  
  const battery = (navigator as any).getBattery?.();
  
  if (battery) {
    battery.then((batteryManager: any) => {
      const { level, charging } = batteryManager;
      
      // 배터리가 20% 이하이고 충전 중이 아닌 경우
      if (level < 0.2 && !charging) {
        return { quality: 50, format: 'jpeg', enableAnimations: false };
      }
      
      // 배터리가 50% 이하인 경우
      if (level < 0.5 && !charging) {
        return { quality: 60, format: 'webp', enableAnimations: false };
      }
    });
  }
  
  return { quality: 75, format: 'webp', enableAnimations: true };
}

/**
 * 이미지 프리로딩
 */
export function preloadImage(src: string, options: ImageOptimizationOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const optimizedSrc = getOptimizedImageUrl(src, options);
    
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = optimizedSrc;
  });
}

/**
 * 중요 이미지들을 프리로드
 */
export async function preloadCriticalImages(images: string[]): Promise<void> {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const preloadPromises = images.map(src => 
    preloadImage(src, {
      quality: getNetworkOptimizedQuality(isMobile ? 60 : 75),
      format: 'webp',
      width: isMobile ? 400 : 800,
    })
  );
  
  try {
    await Promise.allSettled(preloadPromises);
  } catch (error) {
    console.warn('Some images failed to preload:', error);
  }
}

/**
 * 이미지 지연 로딩을 위한 Intersection Observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images = new Set<HTMLImageElement>();
  
  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window === 'undefined') return;
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      }
    );
  }
  
  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
        this.observer?.unobserve(img);
        this.images.delete(img);
      }
    });
  }
  
  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
  }
  
  observe(img: HTMLImageElement) {
    if (!this.observer) return;
    
    this.images.add(img);
    this.observer.observe(img);
  }
  
  unobserve(img: HTMLImageElement) {
    if (!this.observer) return;
    
    this.observer.unobserve(img);
    this.images.delete(img);
  }
  
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.images.clear();
    }
  }
}

/**
 * CSS 배경 이미지 최적화
 */
export function getOptimizedBackgroundImage(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const optimizedUrl = getOptimizedImageUrl(src, options);
  return `url('${optimizedUrl}')`;
}

/**
 * 반응형 이미지 srcSet 생성
 */
export function generateResponsiveSrcSet(
  src: string,
  sizes: number[],
  options: Omit<ImageOptimizationOptions, 'width'> = {}
): string {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const shouldUseHighRes = shouldLoadHighResolution();
  
  // 모바일에서 고해상도가 필요하지 않은 경우 크기 제한
  const filteredSizes = isMobile && !shouldUseHighRes 
    ? sizes.filter(size => size <= 800)
    : sizes;
  
  return filteredSizes
    .map(size => {
      const url = getOptimizedImageUrl(src, { 
        ...options, 
        width: size,
        quality: getNetworkOptimizedQuality(options.quality || 75)
      });
      return `${url} ${size}w`;
    })
    .join(', ');
}

/**
 * 모바일 최적화된 이미지 sizes 속성 생성
 */
export function generateMobileSizes(breakpoints: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
} = {}): string {
  const {
    mobile = '100vw',
    tablet = '50vw', 
    desktop = '33vw'
  } = breakpoints;
  
  return [
    `(max-width: 640px) ${mobile}`,
    `(max-width: 1024px) ${tablet}`,
    desktop
  ].join(', ');
}

/**
 * 이미지 포맷 우선순위 결정
 */
export function getOptimalImageFormat(): 'avif' | 'webp' | 'jpeg' {
  if (typeof window === 'undefined') return 'webp';
  
  // AVIF 지원 확인 (최신 브라우저)
  const supportsAVIF = sessionStorage.getItem('avif-support') === 'true';
  if (supportsAVIF) return 'avif';
  
  // WebP 지원 확인
  const supportsWebP = checkWebPSupport();
  if (supportsWebP) return 'webp';
  
  // 폴백
  return 'jpeg';
}

/**
 * 이미지 메타데이터 추출
 */
export function getImageMetadata(src: string): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };
    
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// 전역 lazy loader 인스턴스
export const globalLazyLoader = new LazyImageLoader();