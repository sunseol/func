'use client';

import { ComponentType } from 'react';

/**
 * 모바일 환경에서 조건부 동적 import를 위한 유틸리티
 */

interface ImportOptions {
  mobile?: boolean;
  desktop?: boolean;
  fallback?: ComponentType<any>;
  preload?: boolean;
}

/**
 * 디바이스 타입에 따른 조건부 import
 */
export async function conditionalImport<T>(
  mobileImport: () => Promise<T>,
  desktopImport: () => Promise<T>,
  options: ImportOptions = {}
): Promise<T> {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  if (isMobile && options.mobile !== false) {
    return mobileImport();
  } else if (!isMobile && options.desktop !== false) {
    return desktopImport();
  }
  
  // 기본값으로 모바일 import 사용
  return mobileImport();
}

/**
 * 지연 로딩을 위한 import 스케줄러
 */
class ImportScheduler {
  private importQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrent = 2;
  private currentImports = 0;

  async scheduleImport<T>(importFn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedImport = async () => {
        try {
          this.currentImports++;
          const result = await importFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.currentImports--;
          this.processQueue();
        }
      };

      // 우선순위에 따라 큐에 삽입
      const insertIndex = this.importQueue.findIndex((_, index) => {
        return priority > (this.importQueue[index] as any).priority || 0;
      });
      
      if (insertIndex === -1) {
        this.importQueue.push(wrappedImport);
      } else {
        this.importQueue.splice(insertIndex, 0, wrappedImport);
      }

      (wrappedImport as any).priority = priority;
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.currentImports >= this.maxConcurrent) {
      return;
    }

    const nextImport = this.importQueue.shift();
    if (!nextImport) {
      return;
    }

    this.isProcessing = true;
    try {
      await nextImport();
    } finally {
      this.isProcessing = false;
      if (this.importQueue.length > 0) {
        this.processQueue();
      }
    }
  }
}

export const importScheduler = new ImportScheduler();

/**
 * 네트워크 상태에 따른 적응형 import
 */
export async function adaptiveImport<T>(
  lightImport: () => Promise<T>,
  fullImport: () => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined') {
    return fullImport();
  }

  // 네트워크 상태 확인
  const connection = (navigator as any).connection;
  const isSlowConnection = connection && (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.saveData
  );

  if (isSlowConnection) {
    return lightImport();
  }

  return fullImport();
}

/**
 * 모바일 특화 컴포넌트 import 맵
 */
export const mobileImports = {
  // AI-PM 컴포넌트들 - 모바일 최적화 버전
  DocumentEditor: {
    mobile: () => import('@/components/ai-pm/DocumentEditor').then(m => ({ default: m.default })),
    desktop: () => import('@/components/ai-pm/DocumentEditor'),
  },
  
  AIChatPanel: {
    mobile: () => import('@/components/ai-pm/AIChatPanel'),
    desktop: () => import('@/components/ai-pm/AIChatPanel'),
  },
  
  WorkflowSidebar: {
    mobile: () => import('@/components/ai-pm/MobileBottomSheet').then(m => ({ default: m.default })),
    desktop: () => import('@/components/ai-pm/WorkflowSidebar'),
  },
  
  // UI 컴포넌트들
  Table: {
    mobile: () => import('@/components/ui/MobileTableControls').then(m => ({ default: m.default })),
    desktop: () => import('@/components/ui/ResponsiveTable'),
  },
  
  ActionMenu: {
    mobile: () => import('@/components/ui/MobileActionMenu'),
    desktop: () => import('@/components/ui/MobileActionMenu'), // 데스크톱에서도 동일 사용
  },
  
  FormComponents: {
    mobile: () => import('@/components/ui/MobileFormComponents'),
    desktop: () => import('@/components/ui/FormComponents'),
  },
};

/**
 * 프리로딩을 위한 유틸리티
 */
export class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  
  async preloadComponent(key: keyof typeof mobileImports, isMobile: boolean) {
    const componentKey = `${key}-${isMobile ? 'mobile' : 'desktop'}`;
    
    if (this.preloadedComponents.has(componentKey)) {
      return;
    }

    try {
      const importConfig = mobileImports[key];
      if (isMobile && importConfig.mobile) {
        await importConfig.mobile();
      } else if (!isMobile && importConfig.desktop) {
        await importConfig.desktop();
      }
      
      this.preloadedComponents.add(componentKey);
    } catch (error) {
      console.warn(`Failed to preload component ${key}:`, error);
    }
  }

  async preloadCriticalComponents(isMobile: boolean) {
    const criticalComponents: (keyof typeof mobileImports)[] = [
      'DocumentEditor',
      'AIChatPanel',
      'WorkflowSidebar'
    ];

    await Promise.all(
      criticalComponents.map(component => 
        this.preloadComponent(component, isMobile)
      )
    );
  }

  async preloadOnIdle(components: readonly (keyof typeof mobileImports)[], isMobile: boolean) {
    if (typeof window === 'undefined') return;

    const preload = () => {
      components.forEach(component => {
        importScheduler.scheduleImport(
          () => this.preloadComponent(component, isMobile),
          -1 // 낮은 우선순위
        );
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload, { timeout: 5000 });
    } else {
      setTimeout(preload, 1000);
    }
  }
}

export const componentPreloader = new ComponentPreloader();

/**
 * 사용량 기반 동적 import
 */
export function createUsageBasedImport<T>(
  importFn: () => Promise<T>,
  usageThreshold = 3
) {
  let usageCount = 0;
  let cachedComponent: T | null = null;

  return async (): Promise<T> => {
    usageCount++;
    
    if (cachedComponent) {
      return cachedComponent;
    }

    if (usageCount >= usageThreshold) {
      cachedComponent = await importFn();
      return cachedComponent;
    }

    return importFn();
  };
}
