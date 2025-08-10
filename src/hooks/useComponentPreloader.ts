'use client';

import { useEffect } from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import { componentPreloader } from '@/lib/mobile-imports';

/**
 * 컴포넌트 프리로딩을 위한 훅
 */
export function useComponentPreloader() {
  const { isMobile } = useViewport();

  useEffect(() => {
    // 페이지 로드 후 중요 컴포넌트들을 프리로드
    const preloadCritical = async () => {
      try {
        await componentPreloader.preloadCriticalComponents(isMobile);
      } catch (error) {
        console.warn('Failed to preload critical components:', error);
      }
    };

    // 초기 로드 후 약간의 지연을 두고 프리로드 시작
    const timer = setTimeout(preloadCritical, 1000);
    return () => clearTimeout(timer);
  }, [isMobile]);

  useEffect(() => {
    // 유휴 시간에 추가 컴포넌트들을 프리로드
    const additionalComponents = [
      'Table',
      'ActionMenu',
      'FormComponents'
    ] as const;

    componentPreloader.preloadOnIdle(additionalComponents, isMobile);
  }, [isMobile]);
}

/**
 * 라우트별 컴포넌트 프리로딩 훅
 */
export function useRoutePreloader(route: string) {
  const { isMobile } = useViewport();

  useEffect(() => {
    const preloadRouteComponents = async () => {
      switch (route) {
        case '/ai-pm':
          await Promise.all([
            componentPreloader.preloadComponent('DocumentEditor', isMobile),
            componentPreloader.preloadComponent('AIChatPanel', isMobile),
          ]);
          break;
        
        case '/ai-pm/[projectId]':
          await Promise.all([
            componentPreloader.preloadComponent('WorkflowSidebar', isMobile),
            componentPreloader.preloadComponent('DocumentEditor', isMobile),
            componentPreloader.preloadComponent('AIChatPanel', isMobile),
          ]);
          break;
        
        default:
          // 기본 컴포넌트들만 프리로드
          await componentPreloader.preloadComponent('Table', isMobile);
          break;
      }
    };

    // 라우트 변경 후 프리로드
    const timer = setTimeout(preloadRouteComponents, 500);
    return () => clearTimeout(timer);
  }, [route, isMobile]);
}

/**
 * 사용자 인터랙션 기반 프리로딩 훅
 */
export function useInteractionPreloader() {
  const { isMobile } = useViewport();

  const preloadOnHover = (componentKey: keyof typeof import('@/lib/mobile-imports').mobileImports) => {
    return () => {
      componentPreloader.preloadComponent(componentKey, isMobile);
    };
  };

  const preloadOnFocus = (componentKey: keyof typeof import('@/lib/mobile-imports').mobileImports) => {
    return () => {
      componentPreloader.preloadComponent(componentKey, isMobile);
    };
  };

  return {
    preloadOnHover,
    preloadOnFocus,
  };
}