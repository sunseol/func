'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import LoadingSkeletons from '@/components/ui/LoadingSkeletons';

/**
 * 모바일 환경에서 컴포넌트 지연 로딩을 위한 유틸리티
 */

interface LazyComponentOptions {
  fallback?: React.ComponentType;
  mobileOnly?: boolean;
  loadingComponent?: React.ComponentType;
}

/**
 * 컴포넌트를 지연 로딩으로 래핑하는 HOC
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: P) {
    const { isMobile } = useViewport();
    const { 
      fallback: FallbackComponent, 
      mobileOnly = false,
      loadingComponent: LoadingComponent = LoadingSkeletons.Card
    } = options;

    // mobileOnly가 true이고 모바일이 아닌 경우 즉시 로드
    if (mobileOnly && !isMobile) {
      const Component = React.useMemo(() => lazy(importFn), []);
      return (
        <Suspense fallback={<LoadingComponent />}>
          <Component {...props} />
        </Suspense>
      );
    }

    // 폴백 컴포넌트가 있는 경우 사용
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * 조건부 지연 로딩 훅
 */
export function useConditionalLazyLoad<T>(
  importFn: () => Promise<T>,
  condition: boolean,
  deps: React.DependencyList = []
) {
  const [component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (condition && !component) {
      setLoading(true);
      importFn()
        .then(setComponent)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [condition, component, ...deps]);

  return { component, loading };
}

/**
 * 뷰포트 기반 지연 로딩 컴포넌트
 */
interface ViewportLazyProps {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
}

export function ViewportLazy({ 
  children, 
  threshold = 0.1, 
  rootMargin = '50px',
  fallback = <LoadingSkeletons.Card />
}: ViewportLazyProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}

/**
 * 모바일 특화 지연 로딩 래퍼
 */
interface MobileLazyProps {
  children: React.ReactNode;
  desktopFallback?: React.ReactNode;
  mobileFallback?: React.ReactNode;
}

export function MobileLazy({ 
  children, 
  desktopFallback,
  mobileFallback = <LoadingSkeletons.Card />
}: MobileLazyProps) {
  const { isMobile } = useViewport();
  const [shouldLoad, setShouldLoad] = React.useState(!isMobile);

  React.useEffect(() => {
    if (isMobile) {
      // 모바일에서는 약간의 지연 후 로드
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  if (!shouldLoad) {
    return <>{isMobile ? mobileFallback : desktopFallback}</>;
  }

  return <>{children}</>;
}

/**
 * 번들 크기 최적화를 위한 동적 import 헬퍼
 */
export const dynamicImports = {
  // AI-PM 관련 컴포넌트들
  DocumentEditor: () => import('@/components/ai-pm/DocumentEditor'),
  AIChatPanel: () => import('@/components/ai-pm/AIChatPanel'),
  ConversationHistoryPanel: () => import('@/components/ai-pm/ConversationHistoryPanel'),
  DocumentApprovalPanel: () => import('@/components/ai-pm/DocumentApprovalPanel'),
  ConflictAnalysisPanel: () => import('@/components/ai-pm/ConflictAnalysisPanel'),
  MemberManagement: () => import('@/components/ai-pm/MemberManagement'),
  
  // UI 컴포넌트들
  ResponsiveTable: () => import('@/components/ui/ResponsiveTable'),
  MobileActionMenu: () => import('@/components/ui/MobileActionMenu'),
  AdvancedTableFilters: () => import('@/components/ui/AdvancedTableFilters'),
  
  // 폼 컴포넌트들
  MobileFormComponents: () => import('@/components/ui/MobileFormComponents'),
  KeyboardAwareForm: () => import('@/components/ui/KeyboardAwareForm'),
  MobileDatePicker: () => import('@/components/ui/MobileDatePicker'),
  MobileFileUpload: () => import('@/components/ui/MobileFileUpload'),
  
  // 개발 도구들
  PerformanceMonitor: () => import('@/components/dev/PerformanceMonitor'),
};

/**
 * 지연 로딩된 컴포넌트들을 미리 생성
 */
export const LazyComponents = {
  DocumentEditor: withLazyLoading(dynamicImports.DocumentEditor, {
    loadingComponent: LoadingSkeletons.Editor,
    mobileOnly: true
  }),
  
  AIChatPanel: withLazyLoading(dynamicImports.AIChatPanel, {
    loadingComponent: LoadingSkeletons.Chat,
    mobileOnly: true
  }),
  
  ConversationHistoryPanel: withLazyLoading(dynamicImports.ConversationHistoryPanel, {
    loadingComponent: LoadingSkeletons.List,
    mobileOnly: true
  }),
  
  ResponsiveTable: withLazyLoading(dynamicImports.ResponsiveTable, {
    loadingComponent: LoadingSkeletons.Table,
    mobileOnly: true
  }),
  
  PerformanceMonitor: withLazyLoading(dynamicImports.PerformanceMonitor, {
    loadingComponent: () => null,
    mobileOnly: false
  }),
};