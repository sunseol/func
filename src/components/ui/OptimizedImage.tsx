'use client';

import React, { useState, useCallback } from 'react';
import Image, { ImageProps } from 'next/image';
import { useViewport } from '@/contexts/ViewportContext';
import { 
  getNetworkOptimizedQuality, 
  shouldLoadHighResolution,
  getOptimalImageFormat 
} from '@/lib/asset-optimization';

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  mobileWidth?: number;
  mobileHeight?: number;
  desktopWidth?: number;
  desktopHeight?: number;
  mobileSrc?: string;
  desktopSrc?: string;
  lazy?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallback?: React.ReactNode;
  onLoadingComplete?: () => void;
  onError?: () => void;
}

/**
 * 모바일 최적화된 이미지 컴포넌트
 */
export default function OptimizedImage({
  src,
  alt,
  mobileWidth,
  mobileHeight,
  desktopWidth,
  desktopHeight,
  mobileSrc,
  desktopSrc,
  lazy = true,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fallback,
  onLoadingComplete,
  onError,
  className = '',
  ...props
}: OptimizedImageProps) {
  const { isMobile, width: viewportWidth } = useViewport();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 디바이스에 따른 이미지 소스 결정
  const getImageSrc = useCallback(() => {
    if (isMobile && mobileSrc) {
      return mobileSrc;
    }
    if (!isMobile && desktopSrc) {
      return desktopSrc;
    }
    return src;
  }, [isMobile, mobileSrc, desktopSrc, src]);

  // 디바이스에 따른 이미지 크기 결정
  const getImageDimensions = useCallback(() => {
    if (isMobile) {
      const maxMobileWidth = Math.min(viewportWidth - 32, 400);
      return {
        width: mobileWidth || maxMobileWidth,
        height: mobileHeight || Math.round(maxMobileWidth * 0.6), // 16:10 비율
      };
    }
    return {
      width: desktopWidth || 600,
      height: desktopHeight || 400,
    };
  }, [isMobile, mobileWidth, mobileHeight, desktopWidth, desktopHeight, viewportWidth]);

  // 네트워크 상태를 고려한 품질 조정
  const getQuality = useCallback(() => {
    // 네트워크 상태 확인
    const connection = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
    let baseQuality = quality;
    
    if (isMobile) {
      // 모바일에서는 기본적으로 품질을 낮춤
      baseQuality = Math.max(quality - 10, 50);
      
      // 데이터 절약 모드나 느린 네트워크에서 추가 최적화
      if (connection) {
        const { saveData, effectiveType } = connection;
        
        if (saveData) {
          baseQuality = Math.max(baseQuality - 20, 30);
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          baseQuality = Math.max(baseQuality - 15, 35);
        }
      }
    }
    
    return baseQuality;
  }, [isMobile, quality]);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    onLoadingComplete?.();
  }, [onLoadingComplete]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const dimensions = getImageDimensions();
  const imageSrc = getImageSrc();
  const imageQuality = getQuality();

  // 에러 상태 처리
  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">이미지를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: dimensions.width, height: dimensions.height }}>
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      
      {/* 실제 이미지 */}
      <Image
        src={imageSrc}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        quality={imageQuality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        loading={lazy ? 'lazy' : 'eager'}
        onLoadingComplete={handleLoadingComplete}
        onError={handleError}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        sizes={
          isMobile 
            ? '(max-width: 640px) 100vw, (max-width: 768px) 90vw' 
            : '(max-width: 1024px) 50vw, (max-width: 1200px) 33vw, 25vw'
        }
        // WebP 및 AVIF 포맷 우선 사용
        unoptimized={false}
        {...props}
      />
    </div>
  );
}

/**
 * 아바타용 최적화된 이미지 컴포넌트
 */
interface OptimizedAvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: React.ReactNode;
}

export function OptimizedAvatar({ 
  src, 
  alt, 
  size = 'md', 
  className = '',
  fallback 
}: OptimizedAvatarProps) {
  const { isMobile } = useViewport();
  
  const sizeMap = {
    sm: isMobile ? 32 : 40,
    md: isMobile ? 40 : 48,
    lg: isMobile ? 48 : 64,
    xl: isMobile ? 64 : 80,
  };
  
  const dimension = sizeMap[size];
  
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      mobileWidth={dimension}
      mobileHeight={dimension}
      desktopWidth={dimension}
      desktopHeight={dimension}
      quality={90}
      className={`rounded-full ${className}`}
      fallback={
        fallback || (
          <div 
            className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}
            style={{ width: dimension, height: dimension }}
          >
            <span className="text-gray-500 font-medium">
              {alt.charAt(0).toUpperCase()}
            </span>
          </div>
        )
      }
    />
  );
}

/**
 * 반응형 배경 이미지 컴포넌트
 */
interface ResponsiveBackgroundProps {
  src: string;
  mobileSrc?: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export function ResponsiveBackground({
  src,
  mobileSrc,
  alt,
  children,
  className = '',
  overlay = false,
  overlayOpacity = 0.5,
}: ResponsiveBackgroundProps) {
  const { isMobile } = useViewport();
  const [isLoaded, setIsLoaded] = useState(false);
  
  const backgroundSrc = isMobile && mobileSrc ? mobileSrc : src;
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 배경 이미지 */}
      <Image
        src={backgroundSrc}
        alt={alt}
        fill
        quality={isMobile ? 60 : 80}
        className={`object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoadingComplete={() => setIsLoaded(true)}
        sizes="100vw"
        priority={false}
      />
      
      {/* 오버레이 */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {/* 콘텐츠 */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* 로딩 상태 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
    </div>
  );
}