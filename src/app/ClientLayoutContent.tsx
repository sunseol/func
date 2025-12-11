'use client';



import React, { useEffect } from 'react';
import { useTheme } from "next-themes";
import { ThemeProvider } from './components/ThemeProvider';
import { useComponentPreloader } from '@/hooks/useComponentPreloader';
import MainHeader from '@/components/layout/MainHeader';

export default function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  useComponentPreloader();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

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
    <div className="min-h-screen flex flex-col bg-transparent dark:bg-transparent">
      <MainHeader />
      <main className="flex-1" style={{ padding: '0' }}>{children}</main>
    </div>
  );
}

