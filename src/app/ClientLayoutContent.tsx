'use client';

import '@ant-design/v5-patch-for-react-19';

import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { useTheme } from './components/ThemeProvider';
import { useComponentPreloader } from '@/hooks/useComponentPreloader';
import AppSidebar from '@/components/layout/AppSidebar';
import { usePathname } from 'next/navigation';

export default function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  useComponentPreloader();
  const { isDarkMode } = useTheme();
  const pathname = usePathname();
  const isLanding = pathname === '/landing' || pathname?.startsWith('/landing/');

  // body 배경/텍스트를 테마에 맞춰 직접 동기화 (충돌 방지)
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('bg-white', 'text-gray-900');
      document.body.classList.add('bg-neutral-950', 'text-gray-100');
      document.body.style.backgroundColor = '#0a0a0a';
      document.body.style.color = 'rgb(243 244 246)';
    } else {
      document.body.classList.remove('bg-neutral-950', 'text-gray-100');
      document.body.classList.add('bg-white', 'text-gray-900');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = 'rgb(17 24 39)';
    }
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, [isDarkMode]);

  return (
    <Layout className="min-h-screen bg-transparent dark:bg-transparent">
      {!isLanding && <AppSidebar />}
      <Layout style={{ background: 'transparent' }}>
        <main className="flex-1" style={{ padding: '0' }}>
          {children}
        </main>
      </Layout>
    </Layout>
  );
}

