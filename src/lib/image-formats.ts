'use client';

/**
 * 이미지 포맷 관리 및 최적화 유틸리티
 */

export interface ImageFormatSupport {
  webp: boolean;
  avif: boolean;
  jpeg: boolean;
  png: boolean;
}

export interface OptimizedImageConfig {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  blur?: boolean;
  priority?: boolean;
}

/**
 * 브라우저의 이미지 포맷 지원 여부 확인
 */
export class ImageFormatDetector {
  private static instance: ImageFormatDetector;
  private support: ImageFormatSupport | null = null;
  private detectionPromise: Promise<ImageFormatSupport> | null = null;

  static getInstance(): ImageFormatDetector {
    if (!ImageFormatDetector.instance) {
      ImageFormatDetector.instance = new ImageFormatDetector();
    }
    return ImageFormatDetector.instance;
  }

  /**
   * 모든 포맷 지원 여부를 비동기로 확인
   */
  async detectSupport(): Promise<ImageFormatSupport> {
    if (this.support) {
      return this.support;
    }

    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection();
    this.support = await this.detectionPromise;
    
    // 결과를 sessionStorage에 캐시
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('image-format-support', JSON.stringify(this.support));
    }

    return this.support;
  }

  /**
   * 캐시된 지원 정보 가져오기 (동기)
   */
  getCachedSupport(): ImageFormatSupport | null {
    if (this.support) {
      return this.support;
    }

    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('image-format-support');
      if (cached) {
        try {
          this.support = JSON.parse(cached);
          return this.support;
        } catch {
          // 캐시 파싱 실패 시 무시
        }
      }
    }

    return null;
  }

  private async performDetection(): Promise<ImageFormatSupport> {
    const [webp, avif] = await Promise.all([
      this.checkWebPSupport(),
      this.checkAVIFSupport(),
    ]);

    return {
      webp,
      avif,
      jpeg: true, // 모든 브라우저에서 지원
      png: true,  // 모든 브라우저에서 지원
    };
  }

  private checkWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const webp = new Image();
      webp.onload = () => resolve(webp.width === 1);
      webp.onerror = () => resolve(false);
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  private checkAVIFSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = () => resolve(avif.width === 1);
      avif.onerror = () => resolve(false);
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }
}

/**
 * 최적의 이미지 포맷 선택
 */
export function selectOptimalFormat(
  requestedFormat: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png' = 'auto',
  support?: ImageFormatSupport
): 'webp' | 'avif' | 'jpeg' | 'png' {
  if (requestedFormat !== 'auto') {
    return requestedFormat;
  }

  if (!support) {
    const detector = ImageFormatDetector.getInstance();
    support = detector.getCachedSupport() || { webp: false, avif: false, jpeg: true, png: true };
  }

  // 우선순위: AVIF > WebP > JPEG
  if (support.avif) return 'avif';
  if (support.webp) return 'webp';
  return 'jpeg';
}

/**
 * Next.js Image Optimization API URL 생성
 */
export function createOptimizedImageUrl(config: OptimizedImageConfig): string {
  const { src, width, height, quality = 75, format = 'auto', blur = false } = config;
  
  if (typeof window === 'undefined') {
    return src; // SSR에서는 원본 URL 반환
  }

  const detector = ImageFormatDetector.getInstance();
  const support = detector.getCachedSupport();
  const selectedFormat = selectOptimalFormat(format, support || undefined);

  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  
  // 포맷이 JPEG가 아닌 경우에만 포맷 파라미터 추가
  if (selectedFormat !== 'jpeg') {
    params.set('f', selectedFormat);
  }
  
  if (blur) params.set('blur', '10');

  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

/**
 * 반응형 이미지 소스셋 생성
 */
export function createResponsiveSources(
  src: string,
  sizes: number[],
  options: Omit<OptimizedImageConfig, 'src' | 'width'> = {}
): string {
  return sizes
    .map(size => {
      const url = createOptimizedImageUrl({ ...options, src, width: size });
      return `${url} ${size}w`;
    })
    .join(', ');
}

/**
 * 모바일 최적화된 이미지 크기 계산
 */
export function calculateMobileOptimizedSizes(
  baseWidth: number,
  baseHeight: number,
  viewportWidth: number,
  isMobile: boolean
): { width: number; height: number } {
  const maxMobileWidth = Math.min(viewportWidth - 32, 400); // 좌우 패딩 16px씩
  const maxDesktopWidth = Math.min(viewportWidth * 0.8, 800);
  
  const maxWidth = isMobile ? maxMobileWidth : maxDesktopWidth;
  
  if (baseWidth <= maxWidth) {
    return { width: baseWidth, height: baseHeight };
  }
  
  const aspectRatio = baseWidth / baseHeight;
  const optimizedWidth = maxWidth;
  const optimizedHeight = Math.round(optimizedWidth / aspectRatio);
  
  return { width: optimizedWidth, height: optimizedHeight };
}

/**
 * 네트워크 상태 기반 이미지 품질 조정
 */
export function getNetworkAwareQuality(baseQuality: number = 75): number {
  if (typeof navigator === 'undefined') return baseQuality;
  
  const connection = (navigator as any).connection;
  if (!connection) return baseQuality;
  
  const { effectiveType, saveData, downlink, rtt } = connection;
  
  // 데이터 절약 모드
  if (saveData) {
    return Math.max(baseQuality - 30, 30);
  }
  
  // RTT(Round Trip Time) 기반 조정
  if (rtt > 1000) { // 1초 이상
    return Math.max(baseQuality - 25, 35);
  }
  
  // 다운링크 속도 기반 조정
  if (downlink < 1) { // 1Mbps 미만
    return Math.max(baseQuality - 30, 30);
  } else if (downlink < 2) { // 2Mbps 미만
    return Math.max(baseQuality - 20, 40);
  }
  
  // 네트워크 타입 기반 조정
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
 * 이미지 프리로딩 관리자
 */
export class ImagePreloader {
  private preloadedImages = new Set<string>();
  private preloadingImages = new Map<string, Promise<void>>();

  /**
   * 이미지 프리로드
   */
  async preload(config: OptimizedImageConfig): Promise<void> {
    const url = createOptimizedImageUrl(config);
    
    if (this.preloadedImages.has(url)) {
      return; // 이미 프리로드됨
    }
    
    if (this.preloadingImages.has(url)) {
      return this.preloadingImages.get(url); // 프리로딩 중
    }
    
    const preloadPromise = this.performPreload(url);
    this.preloadingImages.set(url, preloadPromise);
    
    try {
      await preloadPromise;
      this.preloadedImages.add(url);
    } finally {
      this.preloadingImages.delete(url);
    }
  }

  private performPreload(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
      img.src = url;
    });
  }

  /**
   * 여러 이미지 동시 프리로드
   */
  async preloadMultiple(configs: OptimizedImageConfig[]): Promise<void> {
    const promises = configs.map(config => this.preload(config));
    await Promise.allSettled(promises);
  }

  /**
   * 중요 이미지들 우선 프리로드
   */
  async preloadCritical(
    configs: OptimizedImageConfig[],
    maxConcurrent: number = 3
  ): Promise<void> {
    // 동시 프리로드 수 제한
    for (let i = 0; i < configs.length; i += maxConcurrent) {
      const batch = configs.slice(i, i + maxConcurrent);
      await this.preloadMultiple(batch);
    }
  }

  /**
   * 프리로드 상태 확인
   */
  isPreloaded(config: OptimizedImageConfig): boolean {
    const url = createOptimizedImageUrl(config);
    return this.preloadedImages.has(url);
  }

  /**
   * 캐시 정리
   */
  clear(): void {
    this.preloadedImages.clear();
    this.preloadingImages.clear();
  }
}

// 전역 프리로더 인스턴스
export const globalImagePreloader = new ImagePreloader();

/**
 * 이미지 메타데이터 추출
 */
export function extractImageMetadata(src: string): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
  fileSize?: number;
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
    
    img.onerror = () => {
      reject(new Error(`Failed to load image metadata: ${src}`));
    };
    
    img.src = src;
  });
}

/**
 * 이미지 압축 품질 추천
 */
export function recommendImageQuality(
  imageType: 'photo' | 'illustration' | 'icon' | 'text',
  context: 'hero' | 'thumbnail' | 'gallery' | 'background' = 'gallery'
): number {
  const qualityMatrix = {
    photo: {
      hero: 85,
      thumbnail: 70,
      gallery: 75,
      background: 60,
    },
    illustration: {
      hero: 90,
      thumbnail: 80,
      gallery: 85,
      background: 70,
    },
    icon: {
      hero: 95,
      thumbnail: 90,
      gallery: 90,
      background: 80,
    },
    text: {
      hero: 95,
      thumbnail: 85,
      gallery: 90,
      background: 75,
    },
  };

  return qualityMatrix[imageType][context];
}