'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import OptimizedImage from './OptimizedImage';
import { 
  generateResponsiveSrcSet, 
  generateMobileSizes,
  shouldLoadHighResolution,
  getNetworkOptimizedQuality 
} from '@/lib/asset-optimization';

interface ImageItem {
  src: string;
  alt: string;
  caption?: string;
  mobileSrc?: string;
  thumbnail?: string;
}

interface ResponsiveImageGalleryProps {
  images: ImageItem[];
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  aspectRatio?: number;
  lazy?: boolean;
  showCaptions?: boolean;
  onImageClick?: (index: number) => void;
  className?: string;
}

/**
 * 모바일 최적화된 반응형 이미지 갤러리
 */
export default function ResponsiveImageGallery({
  images,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  aspectRatio = 1,
  lazy = true,
  showCaptions = false,
  onImageClick,
  className = '',
}: ResponsiveImageGalleryProps) {
  const { isMobile, isTablet, width: viewportWidth } = useViewport();
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // 현재 브레이크포인트에 따른 컬럼 수 결정
  const getCurrentColumns = useCallback(() => {
    if (isMobile) return columns.mobile;
    if (isTablet) return columns.tablet;
    return columns.desktop;
  }, [isMobile, isTablet, columns]);

  // 이미지 크기 계산
  const getImageDimensions = useCallback(() => {
    const currentColumns = getCurrentColumns();
    const gap = 16; // gap-4 = 16px
    const padding = isMobile ? 32 : 48; // 좌우 패딩
    
    const availableWidth = viewportWidth - padding - (gap * (currentColumns - 1));
    const imageWidth = Math.floor(availableWidth / currentColumns);
    const imageHeight = Math.floor(imageWidth / aspectRatio);
    
    return { width: imageWidth, height: imageHeight };
  }, [getCurrentColumns, viewportWidth, aspectRatio, isMobile]);

  // 이미지 로딩 완료 처리
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  }, []);

  // 이미지 로딩 실패 처리
  const handleImageError = useCallback((index: number) => {
    setFailedImages(prev => new Set([...prev, index]));
  }, []);

  // 이미지 클릭 처리
  const handleImageClick = useCallback((index: number) => {
    onImageClick?.(index);
  }, [onImageClick]);

  const dimensions = getImageDimensions();
  const currentColumns = getCurrentColumns();
  const shouldUseHighRes = shouldLoadHighResolution();

  // 그리드 스타일 생성
  const gridStyle = {
    gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
  };

  return (
    <div 
      className={`grid gap-4 ${className}`}
      style={gridStyle}
    >
      {images.map((image, index) => {
        const isLoaded = loadedImages.has(index);
        const hasFailed = failedImages.has(index);
        
        // 모바일에서 썸네일 사용 (있는 경우)
        const imageSrc = isMobile && image.thumbnail && !shouldUseHighRes 
          ? image.thumbnail 
          : image.mobileSrc && isMobile 
            ? image.mobileSrc 
            : image.src;

        return (
          <div
            key={index}
            className="relative group cursor-pointer"
            onClick={() => handleImageClick(index)}
          >
            {/* 이미지 컨테이너 */}
            <div 
              className="relative overflow-hidden rounded-lg bg-gray-100"
              style={{ 
                width: dimensions.width, 
                height: dimensions.height 
              }}
            >
              {/* 로딩 스켈레톤 */}
              {!isLoaded && !hasFailed && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}

              {/* 실제 이미지 */}
              {!hasFailed && (
                <OptimizedImage
                  src={imageSrc}
                  alt={image.alt}
                  mobileWidth={dimensions.width}
                  mobileHeight={dimensions.height}
                  desktopWidth={dimensions.width}
                  desktopHeight={dimensions.height}
                  quality={getNetworkOptimizedQuality(isMobile ? 60 : 75)}
                  lazy={lazy}
                  className={`
                    w-full h-full object-cover transition-all duration-300
                    group-hover:scale-105
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                  `}
                  onLoadingComplete={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
              )}

              {/* 에러 상태 */}
              {hasFailed && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs">이미지 로딩 실패</p>
                  </div>
                </div>
              )}

              {/* 호버 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
            </div>

            {/* 캡션 */}
            {showCaptions && image.caption && (
              <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                {image.caption}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 모바일 최적화된 이미지 캐러셀
 */
interface ResponsiveImageCarouselProps {
  images: ImageItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}

export function ResponsiveImageCarousel({
  images,
  autoPlay = false,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = true,
  className = '',
}: ResponsiveImageCarouselProps) {
  const { isMobile, width: viewportWidth } = useViewport();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);

  // 자동 재생
  useEffect(() => {
    if (!isAutoPlaying || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length, autoPlayInterval]);

  // 이전/다음 이미지
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    setIsAutoPlaying(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length);
    setIsAutoPlaying(false);
  }, [images.length]);

  // 특정 이미지로 이동
  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  }, []);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];
  const imageWidth = Math.min(viewportWidth - 32, 600);
  const imageHeight = Math.floor(imageWidth * 0.6);

  return (
    <div className={`relative ${className}`}>
      {/* 메인 이미지 */}
      <div className="relative overflow-hidden rounded-lg">
        <OptimizedImage
          src={currentImage.src}
          alt={currentImage.alt}
          mobileSrc={currentImage.mobileSrc}
          mobileWidth={imageWidth}
          mobileHeight={imageHeight}
          desktopWidth={imageWidth}
          desktopHeight={imageHeight}
          quality={getNetworkOptimizedQuality(isMobile ? 65 : 80)}
          className="w-full h-full object-cover"
        />

        {/* 네비게이션 화살표 */}
        {showArrows && images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all"
              aria-label="이전 이미지"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all"
              aria-label="다음 이미지"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* 도트 인디케이터 */}
      {showDots && images.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-blue-500 w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`이미지 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}

      {/* 캡션 */}
      {currentImage.caption && (
        <div className="mt-3 text-center text-sm text-gray-600">
          {currentImage.caption}
        </div>
      )}
    </div>
  );
}