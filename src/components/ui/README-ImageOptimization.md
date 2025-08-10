# 이미지 최적화 컴포넌트 가이드

## 개요

모바일 환경에서 최적화된 이미지 로딩을 위한 컴포넌트들입니다. WebP/AVIF 포맷 지원, 네트워크 상태 기반 품질 조정, 반응형 이미지 크기 등의 기능을 제공합니다.

## 주요 컴포넌트

### 1. SmartImage

가장 기본적인 최적화된 이미지 컴포넌트입니다.

```tsx
import SmartImage from '@/components/ui/SmartImage';

<SmartImage
  src="/hero-image.jpg"
  alt="히어로 이미지"
  width={800}
  height={400}
  mobileWidth={400}
  mobileHeight={200}
  mobileSrc="/hero-mobile.jpg"
  imageType="photo"
  context="hero"
  adaptiveQuality={true}
  networkAware={true}
  preload={true}
/>
```

#### 주요 Props

- `src`: 이미지 소스 URL
- `alt`: 대체 텍스트
- `width/height`: 데스크톱 이미지 크기
- `mobileWidth/mobileHeight`: 모바일 이미지 크기
- `mobileSrc`: 모바일 전용 이미지 소스
- `imageType`: 이미지 타입 (`photo`, `illustration`, `icon`, `text`)
- `context`: 사용 컨텍스트 (`hero`, `thumbnail`, `gallery`, `background`)
- `adaptiveQuality`: 적응형 품질 조정 활성화
- `networkAware`: 네트워크 상태 기반 최적화
- `preload`: 이미지 프리로드 활성화

### 2. SmartAvatar

아바타 이미지에 최적화된 컴포넌트입니다.

```tsx
import { SmartAvatar } from '@/components/ui/SmartImage';

<SmartAvatar
  src="/user-avatar.jpg"
  alt="사용자 아바타"
  size="lg"
  onClick={() => console.log('Avatar clicked')}
/>
```

#### 크기 옵션

- `xs`: 24px (모바일) / 28px (데스크톱)
- `sm`: 32px (모바일) / 36px (데스크톱)
- `md`: 40px (모바일) / 48px (데스크톱)
- `lg`: 48px (모바일) / 56px (데스크톱)
- `xl`: 56px (모바일) / 64px (데스크톱)
- `2xl`: 64px (모바일) / 80px (데스크톱)

### 3. SmartHeroImage

히어로 섹션용 이미지 컴포넌트입니다.

```tsx
import { SmartHeroImage } from '@/components/ui/SmartImage';

<SmartHeroImage
  src="/hero-background.jpg"
  alt="히어로 배경"
  mobileSrc="/hero-mobile.jpg"
  overlay={true}
  overlayOpacity={0.4}
>
  <h1>히어로 제목</h1>
  <p>히어로 설명</p>
</SmartHeroImage>
```

### 4. ResponsiveImageGallery

반응형 이미지 갤러리 컴포넌트입니다.

```tsx
import ResponsiveImageGallery from '@/components/ui/ResponsiveImageGallery';

const images = [
  {
    src: '/gallery1.jpg',
    alt: '갤러리 이미지 1',
    caption: '이미지 설명',
    thumbnail: '/gallery1-thumb.jpg'
  },
  // ... 더 많은 이미지
];

<ResponsiveImageGallery
  images={images}
  columns={{ mobile: 1, tablet: 2, desktop: 3 }}
  aspectRatio={1.5}
  showCaptions={true}
  onImageClick={(index) => console.log('Image clicked:', index)}
/>
```

### 5. ResponsiveImageCarousel

반응형 이미지 캐러셀 컴포넌트입니다.

```tsx
import { ResponsiveImageCarousel } from '@/components/ui/ResponsiveImageGallery';

<ResponsiveImageCarousel
  images={images}
  autoPlay={true}
  autoPlayInterval={5000}
  showDots={true}
  showArrows={true}
/>
```

## 최적화 기능

### 1. 포맷 최적화

- **AVIF**: 최신 브라우저에서 최고 압축률
- **WebP**: 대부분의 모던 브라우저 지원
- **JPEG**: 폴백 포맷

### 2. 네트워크 기반 최적화

```typescript
// 네트워크 상태에 따른 품질 조정
const quality = getNetworkAwareQuality(75);

// 연결 타입별 품질
- 4G: 75% (기본)
- 3G: 60%
- 2G: 45%
- slow-2G: 35%
- 데이터 절약 모드: 45%
```

### 3. 디바이스 최적화

```typescript
// 모바일에서 고해상도 이미지 로딩 방지
const shouldLoad = shouldLoadHighResolution();

// 배터리 상태 기반 최적화
const settings = getBatteryOptimizedSettings();
```

### 4. 메모리 최적화

```typescript
// 메모리 압박 상황 감지
const { memoryPressure, getMemoryOptimizedSettings } = useImageMemoryOptimization();
```

## 훅 사용법

### useImageOptimization

```tsx
import { useImageOptimization } from '@/hooks/useImageOptimization';

const {
  isLoading,
  hasError,
  quality,
  format,
  shouldUseHighRes,
  recalculateOptimizations
} = useImageOptimization('/image.jpg', {
  preloadCritical: true,
  adaptiveQuality: true,
  networkAware: true
});
```

### useImageGalleryOptimization

```tsx
import { useImageGalleryOptimization } from '@/hooks/useImageOptimization';

const {
  loadedImages,
  failedImages,
  visibleImages,
  observeImage,
  preloadCriticalImages
} = useImageGalleryOptimization(imageUrls);
```

### useAdaptiveImageQuality

```tsx
import { useAdaptiveImageQuality } from '@/hooks/useImageOptimization';

const { quality, format, updateQuality } = useAdaptiveImageQuality();
```

## 유틸리티 함수

### 이미지 포맷 관리

```typescript
import { 
  ImageFormatDetector,
  selectOptimalFormat,
  createOptimizedImageUrl 
} from '@/lib/image-formats';

// 포맷 지원 확인
const detector = ImageFormatDetector.getInstance();
const support = await detector.detectSupport();

// 최적 포맷 선택
const format = selectOptimalFormat('auto', support);

// 최적화된 URL 생성
const url = createOptimizedImageUrl({
  src: '/image.jpg',
  width: 400,
  height: 300,
  quality: 75,
  format: 'auto'
});
```

### 이미지 프리로딩

```typescript
import { globalImagePreloader } from '@/lib/image-formats';

// 단일 이미지 프리로드
await globalImagePreloader.preload({
  src: '/important-image.jpg',
  width: 400,
  height: 300,
  quality: 80
});

// 여러 이미지 프리로드
await globalImagePreloader.preloadMultiple([
  { src: '/image1.jpg', width: 400, height: 300 },
  { src: '/image2.jpg', width: 400, height: 300 }
]);

// 중요 이미지 우선 프리로드
await globalImagePreloader.preloadCritical(configs, 3);
```

## 성능 최적화 팁

### 1. 이미지 크기 최적화

```typescript
// 모바일에서 적절한 크기 계산
const dimensions = calculateMobileOptimizedSizes(
  800, 600, // 원본 크기
  375,      // 뷰포트 너비
  true      // 모바일 여부
);
```

### 2. 품질 추천

```typescript
// 이미지 타입과 컨텍스트에 따른 품질 추천
const quality = recommendImageQuality('photo', 'hero'); // 85%
const quality2 = recommendImageQuality('icon', 'thumbnail'); // 90%
```

### 3. 반응형 소스셋

```typescript
// 반응형 이미지 소스셋 생성
const srcSet = createResponsiveSources(
  '/image.jpg',
  [400, 800, 1200], // 크기 배열
  { quality: 75, format: 'auto' }
);
```

## Next.js 설정

`next.config.mjs`에서 이미지 최적화 설정:

```javascript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 375, 414, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 24, 32, 48, 64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7일
    quality: 75,
    unoptimized: false,
  }
};
```

## 브라우저 지원

- **AVIF**: Chrome 85+, Firefox 93+
- **WebP**: Chrome 23+, Firefox 65+, Safari 14+
- **JPEG**: 모든 브라우저

## 모바일 최적화 특징

1. **네트워크 인식**: 느린 연결에서 품질 자동 조정
2. **배터리 인식**: 배터리 부족 시 최적화 강화
3. **메모리 관리**: 메모리 압박 시 이미지 크기 제한
4. **터치 최적화**: 터치 인터페이스에 적합한 크기
5. **지연 로딩**: 뷰포트에 들어올 때만 로딩
6. **프리로딩**: 중요 이미지 우선 로딩

## 예제

### 기본 사용법

```tsx
// 간단한 이미지
<SmartImage
  src="/photo.jpg"
  alt="사진"
  width={400}
  height={300}
/>

// 모바일 최적화된 이미지
<SmartImage
  src="/desktop-image.jpg"
  mobileSrc="/mobile-image.jpg"
  alt="반응형 이미지"
  width={800}
  height={400}
  mobileWidth={400}
  mobileHeight={200}
  adaptiveQuality={true}
  networkAware={true}
/>
```

### 갤러리 구현

```tsx
const GalleryPage = () => {
  const images = [
    { src: '/gallery1.jpg', alt: '이미지 1', caption: '설명 1' },
    { src: '/gallery2.jpg', alt: '이미지 2', caption: '설명 2' },
    // ...
  ];

  return (
    <ResponsiveImageGallery
      images={images}
      columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      aspectRatio={1.5}
      showCaptions={true}
      onImageClick={(index) => {
        // 이미지 클릭 처리
      }}
    />
  );
};
```

이 가이드를 참고하여 모바일 최적화된 이미지 컴포넌트들을 효과적으로 사용하세요.