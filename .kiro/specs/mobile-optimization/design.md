# Design Document

## Overview

FunCommute 플랫폼의 모바일 최적화를 위한 포괄적인 설계 문서입니다. 현재 데스크톱 중심의 UI/UX를 모바일 환경에 최적화하여 반응형 디자인을 구현하고, 터치 인터페이스에 적합한 사용자 경험을 제공합니다. 특히 AI-PM 모듈의 복잡한 워크플로우를 모바일에서 효율적으로 사용할 수 있도록 설계합니다.

## Architecture

### 반응형 디자인 전략

#### 브레이크포인트 시스템
Tailwind CSS의 기본 브레이크포인트를 활용하여 일관된 반응형 경험을 제공합니다:

```typescript
const breakpoints = {
  sm: '640px',   // 작은 태블릿
  md: '768px',   // 태블릿
  lg: '1024px',  // 작은 데스크톱
  xl: '1280px',  // 데스크톱
  '2xl': '1536px' // 큰 데스크톱
}

// 모바일 우선 설계
const mobileFirst = {
  mobile: '0px - 639px',     // 모바일
  tablet: '640px - 1023px',  // 태블릿
  desktop: '1024px+'         // 데스크톱
}
```

#### 레이아웃 적응 전략
1. **Mobile First**: 모바일을 기준으로 설계하고 점진적으로 확장
2. **Progressive Enhancement**: 기본 기능을 보장하고 고급 기능을 점진적으로 추가
3. **Touch-First**: 터치 인터페이스를 우선으로 설계

### 컴포넌트 아키텍처

#### 반응형 컴포넌트 패턴
```typescript
interface ResponsiveComponentProps {
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
  children: ReactNode;
}

// 조건부 렌더링을 위한 훅
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  // 브레이크포인트 감지 로직
}
```

## Components and Interfaces

### 1. 반응형 헤더 시스템

#### AIPMHeader 개선
```typescript
interface ResponsiveHeaderProps {
  isMobile: boolean;
  showMobileMenu: boolean;
  onToggleMobileMenu: () => void;
}

// 모바일 헤더 구조
const MobileHeader = {
  height: '64px',
  padding: '16px',
  layout: 'flex-col' | 'flex-row',
  components: {
    logo: { maxWidth: '120px', fontSize: '18px' },
    hamburger: { size: '24px', touchTarget: '44px' },
    userMenu: { position: 'dropdown' | 'fullscreen' }
  }
}
```

#### 네비게이션 패턴
- **데스크톱**: 수평 네비게이션 바
- **태블릿**: 축약된 네비게이션 + 드롭다운
- **모바일**: 햄버거 메뉴 + 전체 화면 오버레이

### 2. 적응형 사이드바 시스템

#### WorkflowSidebar 모바일 적응
```typescript
interface AdaptiveSidebarProps {
  mode: 'desktop' | 'tablet' | 'mobile';
  isOpen: boolean;
  onClose: () => void;
}

const SidebarModes = {
  desktop: {
    position: 'fixed-left',
    width: '256px',
    overlay: false
  },
  tablet: {
    position: 'slide-over',
    width: '280px',
    overlay: true
  },
  mobile: {
    position: 'bottom-sheet' | 'full-screen',
    width: '100%',
    overlay: true
  }
}
```

#### 모바일 사이드바 변형
1. **Bottom Sheet**: 하단에서 올라오는 시트 형태
2. **Full Screen Modal**: 전체 화면 모달
3. **Slide Over**: 우측에서 슬라이드되는 패널

### 3. 프로젝트 카드 반응형 레이아웃

#### ProjectCard 적응형 디자인
```typescript
interface ResponsiveCardProps {
  layout: 'grid' | 'list' | 'compact';
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3
  };
}

const CardLayouts = {
  mobile: {
    direction: 'column',
    spacing: '16px',
    padding: '16px',
    minHeight: '120px'
  },
  tablet: {
    direction: 'column',
    spacing: '20px', 
    padding: '20px',
    minHeight: '140px'
  },
  desktop: {
    direction: 'column',
    spacing: '24px',
    padding: '24px',
    minHeight: '160px'
  }
}
```

### 4. 터치 최적화 인터페이스

#### 터치 타겟 가이드라인
```typescript
const TouchTargets = {
  minimum: '44px',      // 최소 터치 영역
  comfortable: '48px',  // 권장 터치 영역
  spacing: '8px',       // 터치 요소 간 최소 간격
  
  buttons: {
    primary: { height: '48px', padding: '12px 24px' },
    secondary: { height: '44px', padding: '10px 20px' },
    icon: { size: '44px', iconSize: '24px' }
  }
}
```

### 5. 모바일 폼 최적화

#### 입력 필드 개선
```typescript
interface MobileFormProps {
  keyboardAware: boolean;
  autoFocus: boolean;
  inputMode: 'text' | 'email' | 'numeric' | 'tel';
}

const FormOptimizations = {
  fieldHeight: '48px',
  fieldSpacing: '16px',
  labelPosition: 'top' | 'floating',
  validation: 'inline',
  keyboard: {
    avoidance: true,
    scrollIntoView: true
  }
}
```

## Data Models

### 반응형 상태 관리

#### 브레이크포인트 컨텍스트
```typescript
interface BreakpointContext {
  current: 'mobile' | 'tablet' | 'desktop';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

interface ViewportState {
  breakpoint: BreakpointContext;
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
  hasHover: boolean;
}
```

#### 모바일 네비게이션 상태
```typescript
interface MobileNavigationState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  bottomSheetOpen: boolean;
  activeModal: string | null;
  keyboardVisible: boolean;
  scrollPosition: number;
}
```

### 컴포넌트 설정 모델

#### 반응형 설정
```typescript
interface ResponsiveConfig {
  component: string;
  breakpoints: {
    mobile: ComponentConfig;
    tablet: ComponentConfig;
    desktop: ComponentConfig;
  };
}

interface ComponentConfig {
  layout: 'flex' | 'grid' | 'block';
  direction: 'row' | 'column';
  spacing: string;
  padding: string;
  hidden: boolean;
  order: number;
}
```

## Error Handling

### 모바일 특화 에러 처리

#### 네트워크 오류 처리
```typescript
interface MobileErrorHandler {
  networkError: {
    display: 'toast' | 'modal' | 'inline';
    retry: boolean;
    offline: boolean;
  };
  
  touchError: {
    feedback: 'haptic' | 'visual';
    prevention: 'debounce' | 'throttle';
  };
  
  orientationError: {
    lockSupport: boolean;
    adaptiveLayout: boolean;
  };
}
```

#### 터치 인터페이스 오류
1. **더블 탭 방지**: 버튼 클릭 후 일시적 비활성화
2. **스크롤 충돌 방지**: 터치 이벤트와 스크롤 이벤트 분리
3. **키보드 충돌 해결**: 가상 키보드와 UI 요소 충돌 방지

### 성능 최적화 오류 처리

#### 모바일 성능 모니터링
```typescript
interface MobilePerformanceMonitor {
  metrics: {
    renderTime: number;
    scrollPerformance: number;
    touchResponseTime: number;
    memoryUsage: number;
  };
  
  thresholds: {
    maxRenderTime: 16; // 60fps 유지
    maxTouchDelay: 100; // 100ms 이하 응답
    maxMemoryUsage: 50; // 50MB 이하
  };
}
```

## Testing Strategy

### 모바일 테스트 전략

#### 디바이스 테스트 매트릭스
```typescript
const TestDevices = {
  mobile: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Samsung Galaxy S21', width: 360, height: 800 },
    { name: 'Pixel 5', width: 393, height: 851 }
  ],
  tablet: [
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 834, height: 1194 },
    { name: 'Galaxy Tab', width: 800, height: 1280 }
  ]
};
```

#### 반응형 테스트 시나리오
1. **브레이크포인트 전환 테스트**
   - 각 브레이크포인트에서 레이아웃 검증
   - 전환 시 애니메이션 및 상태 유지 확인

2. **터치 인터페이스 테스트**
   - 터치 타겟 크기 및 간격 검증
   - 제스처 인식 정확도 테스트
   - 스크롤 및 스와이프 동작 확인

3. **성능 테스트**
   - 모바일 디바이스에서 렌더링 성능 측정
   - 메모리 사용량 모니터링
   - 배터리 소모량 측정

#### E2E 테스트 확장
```typescript
// Playwright 모바일 테스트 설정
const mobileTestConfig = {
  projects: [
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true
      }
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12 Safari'],
        hasTouch: true,
        isMobile: true
      }
    }
  ]
};
```

### 접근성 테스트

#### 모바일 접근성 검증
1. **터치 접근성**
   - 최소 터치 타겟 크기 (44px) 준수
   - 터치 요소 간 충분한 간격 확보

2. **스크린 리더 호환성**
   - 모바일 스크린 리더 (VoiceOver, TalkBack) 테스트
   - 적절한 ARIA 레이블 및 역할 설정

3. **키보드 네비게이션**
   - 외부 키보드 연결 시 네비게이션 지원
   - 포커스 관리 및 시각적 표시

## Implementation Phases

### Phase 1: 기본 반응형 구조
1. 브레이크포인트 시스템 구축
2. 기본 컴포넌트 반응형 적용
3. 헤더 및 네비게이션 모바일 최적화

### Phase 2: 고급 모바일 기능
1. 터치 제스처 지원
2. 모바일 특화 컴포넌트 개발
3. 성능 최적화 구현

### Phase 3: AI-PM 모듈 모바일 적응
1. 워크플로우 사이드바 모바일 버전
2. 문서 편집기 모바일 최적화
3. 채팅 인터페이스 모바일 적응

### Phase 4: 최적화 및 테스트
1. 성능 최적화 및 번들 크기 최소화
2. 포괄적인 모바일 테스트 수행
3. 사용자 피드백 수집 및 개선

## Technical Considerations

### CSS 전략
- **Tailwind CSS**: 유틸리티 우선 접근법으로 빠른 반응형 개발
- **CSS Grid & Flexbox**: 복잡한 레이아웃을 위한 현대적 CSS 기술
- **CSS Custom Properties**: 동적 테마 및 브레이크포인트 관리

### JavaScript 최적화
- **Code Splitting**: 모바일에서 불필요한 코드 로딩 방지
- **Lazy Loading**: 화면에 보이는 컴포넌트만 로드
- **Service Worker**: 오프라인 지원 및 캐싱 전략

### 성능 고려사항
- **이미지 최적화**: WebP 포맷 및 반응형 이미지 사용
- **폰트 최적화**: 웹폰트 로딩 최적화 및 폴백 설정
- **애니메이션 최적화**: GPU 가속 및 60fps 유지

## Design System Integration

### 모바일 디자인 토큰
```typescript
const MobileDesignTokens = {
  spacing: {
    xs: '4px',
    sm: '8px', 
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  
  typography: {
    mobile: {
      h1: { fontSize: '24px', lineHeight: '32px' },
      h2: { fontSize: '20px', lineHeight: '28px' },
      body: { fontSize: '16px', lineHeight: '24px' },
      caption: { fontSize: '14px', lineHeight: '20px' }
    }
  },
  
  colors: {
    touch: {
      primary: '#1890ff',
      hover: '#40a9ff',
      active: '#096dd9',
      disabled: '#d9d9d9'
    }
  }
};
```

### 컴포넌트 라이브러리 확장
- **Ant Design Mobile**: 모바일 특화 컴포넌트 활용
- **Custom Components**: 프로젝트 특화 모바일 컴포넌트 개발
- **Design System**: 일관된 모바일 경험을 위한 디자인 시스템 구축