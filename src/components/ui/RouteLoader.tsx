'use client';

import React from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import LoadingSkeletons from './LoadingSkeletons';

interface RouteLoaderProps {
  type?: 'page' | 'modal' | 'sidebar' | 'chat' | 'editor' | 'table';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 라우트별 최적화된 로딩 컴포넌트
 */
export default function RouteLoader({ 
  type = 'page', 
  children, 
  fallback 
}: RouteLoaderProps) {
  const { isMobile } = useViewport();
  
  // 모바일에서는 더 간단한 로딩 표시
  const getLoadingComponent = () => {
    if (fallback) return fallback;
    
    switch (type) {
      case 'page':
        return isMobile ? <LoadingSkeletons.MobilePage /> : <LoadingSkeletons.Page />;
      case 'modal':
        return isMobile ? <LoadingSkeletons.MobileModal /> : <LoadingSkeletons.Modal />;
      case 'sidebar':
        return isMobile ? <LoadingSkeletons.MobileSidebar /> : <LoadingSkeletons.Sidebar />;
      case 'chat':
        return <LoadingSkeletons.Chat />;
      case 'editor':
        return <LoadingSkeletons.Editor />;
      case 'table':
        return isMobile ? <LoadingSkeletons.MobileTable /> : <LoadingSkeletons.Table />;
      default:
        return <LoadingSkeletons.Card />;
    }
  };

  return (
    <React.Suspense fallback={
      <div className="flex w-full h-full items-center justify-center p-4">
        {getLoadingComponent()}
      </div>
    }>
      {children}
    </React.Suspense>
  );
}