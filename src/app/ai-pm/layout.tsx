'use client';

import React, { Suspense } from 'react';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { LazyComponents } from '@/lib/lazy-loading';
import LoadingSkeletons from '@/components/ui/LoadingSkeletons';

export default function AIPMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary level="critical">
      <ToastProvider>
        <NavigationProvider>
          <div className="flex flex-col h-screen min-h-0 bg-gray-50 dark:bg-neutral-900 overflow-hidden">
            <div className="flex-1 min-h-0 min-w-0 w-full flex overflow-y-auto overflow-x-hidden">
              <Suspense fallback={
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="pointer-events-none p-4">
                    <LoadingSkeletons.Spinner size="lg" text="로딩 중..." />
                  </div>
                </div>
              }>
                {children}
              </Suspense>
            </div>
            {/* Performance Monitor 제거 (요청에 따라 비활성화) */}
          </div>
        </NavigationProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
