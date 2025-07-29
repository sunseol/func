'use client';

import React from 'react';
import { NavigationProvider } from '@/contexts/NavigationContext';
import MainHeader from '@/components/layout/MainHeader';
import { ToastProvider } from '@/contexts/ToastContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import PerformanceMonitor from '@/components/dev/PerformanceMonitor';

export default function AIPMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary level="critical">
      <ToastProvider>
        <NavigationProvider>
          <div className="min-h-screen bg-gray-50">
            <MainHeader />
            <main>{children}</main>
            {/* <PerformanceMonitor /> */}
          </div>
        </NavigationProvider>
        {/* PerformanceMonitor temporarily disabled due to infinite loop */}
        {/* {process.env.NODE_ENV === 'development' && <PerformanceMonitor />} */}
      </ToastProvider>
    </ErrorBoundary>
  );
}