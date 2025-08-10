'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { useViewport } from '@/contexts/ViewportContext';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { 
  createOptimizedImageUrl,
  calculateMobileOptimizedSizes,
  getNetworkAwareQuality,
  recommendImageQuality,
  ImageFormatDetector,
  globalImagePreloader
} from '@/lib/image-formats';

interface SmartImageProps extends Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  
  // 반응형 설정
  mobileWidth?: number;
  mobileHeight?: number;
  mobileSrc?: string;
  
  // 최적화 설정
  imageType?: 'photo' | 'illustration' | 'icon' | 'text';
  context?: 'hero' | 'thumbnail' | 'gallery' | 'background';
  adaptiveQuality?: boolean;
  networkAware?: boolean;
  
  // 로딩 설정
  eager?: boolean;
  preload?: boolean;
  
  // UI 설정
  showLoadingSpinner?: boolean;
  showErrorFallback?: boolean;
  errorFallback?: React.ReactNode;
  
  // 콜백
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  
  className?: string;
}

/**
 * 스마트 이미지 컴포넌트 - 모바일 최적화 및 적응형 로딩
 */
export default function SmartImage({
  src,
  alt,
  width,
  height,
  mobileWidth,
  mobileHeight,
  mobileSrc,
  imageType = 'photo',
  context = 'gallery',
  adaptiveQuality = true,
  networkAware = true,
  eager = false,
  preload = false,
  showLoadingSpinner = true,
  showErrorFallback = true,
  errorFallback,
  onLoadStart,
  onLoadComplete,
  onError,
  className = '',
  ...props
}: SmartImageProps) {
  const { isMobile, width: viewportWidth } = useViewport();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  // 이미지 최적화 훅 사용
  const {
    quality: optimizedQuality,
    format,
    shouldUseHighRes,
  } = useImageOptimization(src, {
    preloadCritical: preload,
    adaptiveQuality,
    networkAware,
  });

  // 이미지 크기 계산
  const getOptimizedDimensions = useCallback(() => {
    const baseWidth = width || 600;
    const baseHeight = height || 400;
    
    if (isMobile) {
      const mobileW = mobileWidth || Math.min(viewportWidth - 32, 400);
      const mobileH = mobileHeight || Math.round(mobileW * (baseHeight / baseWidth));
      
      return calculateMobileOptimizedSizes(
        mobileW,
        mobileH,
        viewportWidth,
        true
      );
    }
    
    return calculateMobileOptimizedSizes(
      baseWidth,
      baseHeight,
      viewportWidth,
      false
    );
  }, [width, height, mobileWidth, mobileHeight, isMobile, viewportWidth]);

  // 최적 품질 계산
  const getOptimalQuality = useCallback(() => {
    let baseQuality = recommendImageQuality(imageType, context);
    
    if (adaptiveQuality) {
      baseQuality = optimizedQuality;
    }
    
    if (networkAware) {
      baseQuality = getNetworkAwareQuality(baseQuality);
    }
    
    return baseQuality;
  }, [imageType, context, adaptiveQuality, networkAware, optimizedQuality]);

  // 이미지 소스 결정
  const getImageSource = useCallback(() => {
    // 모바일에서 별도 소스가 있고, 고해상도가 필요하지 않은 경우
    if (isMobile && mobileSrc && !shouldUseHighRes) {
      return mobileSrc;
    }
    
    return src;
  }, [isMobile, mobileSrc, shouldUseHighRes, src]);

  // 이미지 프리로드
  useEffect(() => {
    if (preload) {
      const dimensions = getOptimizedDimensions();
      const quality = getOptimalQuality();
      const imageSrc = getImageSource();
      
      globalImagePreloader.preload({
        src: imageSrc,
        width: dimensions.width,
        height: dimensions.height,
        quality,
        format: 'auto',
        priority: eager,
      }).catch((error) => {
        console.warn('Image preload failed:', error);
      });
    }
  }, [preload, getOptimizedDimensions, getOptimalQuality, getImageSource, eager]);

  // 로딩 시작 처리
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  // 로딩 완료 처리
  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  // 에러 처리
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    
    const error = new Error(`Failed to load image: ${currentSrc}`);
    onError?.(error);
    
    // 모바일 소스에서 실패한 경우 원본 소스로 폴백
    if (isMobile && mobileSrc && currentSrc === mobileSrc) {
      setCurrentSrc(src);
      setHasError(false);
      setIsLoading(true);
    }
  }, [currentSrc, onError, isMobile, mobileSrc, src]);

  // 소스 업데이트
  useEffect(() => {
    const newSrc = getImageSource();
    if (newSrc !== currentSrc) {
      setCurrentSrc(newSrc);
      setIsLoading(true);
      setHasError(false);
    }
  }, [getImageSource, currentSrc]);

  const dimensions = getOptimizedDimensions();
  const quality = getOptimalQuality();

  // 에러 상태 렌더링
  if (hasError) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }
    
    if (showErrorFallback) {
      return (
        <div 
          className={`flex items-center justify-center bg-gray-100 text-gray-400 rounded ${className}`}
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <div className="text-center p-4">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">이미지를 불러올 수 없습니다</p>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return (
    <div className={`relative ${className}`} style={{ width: dimensions.width, height: dimensions.height }}>
      {/* 로딩 스피너 */}
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      
      {/* 실제 이미지 */}
      <Image
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        quality={quality}
        loading={eager ? 'eager' : 'lazy'}
        priority={eager}
        onLoadStart={handleLoadStart}
        onLoad={handleLoadComplete}
        onError={handleError}
        className={`
          transition-opacity duration-300 rounded
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        sizes={
          isMobile 
            ? '(max-width: 640px) 100vw, (max-width: 768px) 90vw'
            : '(max-width: 1024px) 50vw, (max-width: 1200px) 33vw, 25vw'
        }
        {...props}
      />
    </div>
  );
}

/**
 * 아바타용 스마트 이미지
 */
interface SmartAvatarProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallback?: React.ReactNode;
  onClick?: () => void;
}

export function SmartAvatar({ 
  src, 
  alt, 
  size = 'md', 
  className = '',
  fallback,
  onClick
}: SmartAvatarProps) {
  const { isMobile } = useViewport();
  
  const sizeMap = {
    xs: isMobile ? 24 : 28,
    sm: isMobile ? 32 : 36,
    md: isMobile ? 40 : 48,
    lg: isMobile ? 48 : 56,
    xl: isMobile ? 56 : 64,
    '2xl': isMobile ? 64 : 80,
  };
  
  const dimension = sizeMap[size];
  
  return (
    <div 
      className={`relative ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <SmartImage
        src={src}
        alt={alt}
        width={dimension}
        height={dimension}
        imageType="photo"
        context="thumbnail"
        adaptiveQuality={true}
        networkAware={true}
        className={`rounded-full ${className}`}
        errorFallback={
          fallback || (
            <div 
              className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}
              style={{ width: dimension, height: dimension }}
            >
              <span className="text-gray-500 font-medium text-sm">
                {alt.charAt(0).toUpperCase()}
              </span>
            </div>
          )
        }
      />
    </div>
  );
}

/**
 * 히어로 이미지용 스마트 이미지
 */
interface SmartHeroImageProps {
  src: string;
  alt: string;
  mobileSrc?: string;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
  children?: React.ReactNode;
}

export function SmartHeroImage({
  src,
  alt,
  mobileSrc,
  className = '',
  overlay = false,
  overlayOpacity = 0.4,
  children,
}: SmartHeroImageProps) {
  const { isMobile, width: viewportWidth } = useViewport();
  
  const heroHeight = isMobile ? 300 : 500;
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <SmartImage
        src={src}
        alt={alt}
        width={viewportWidth}
        height={heroHeight}
        mobileSrc={mobileSrc}
        imageType="photo"
        context="hero"
        eager={true}
        preload={true}
        adaptiveQuality={true}
        networkAware={true}
        className="w-full h-full object-cover"
      />
      
      {/* 오버레이 */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {/* 콘텐츠 */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 text-center text-white">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}