'use client';

import { NavigationProvider } from '@/contexts/NavigationContext';
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <ErrorBoundary level="page">
                {children}
              </ErrorBoundary>
            </div>
                      </div>
          </NavigationProvider>
          <PerformanceMonitor />
        </ToastProvider>
      </ErrorBoundary>
    );
  }