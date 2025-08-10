'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { ConfigProvider, theme } from 'antd';

// Context 타입 정의
interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}

// Context 생성 (기본값은 null 또는 적절한 초기값)
const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 초기 테마 설정
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // 저장된 값이 있으면 사용, 없으면 시스템 설정 따름
    const initialMode = savedMode !== null ? JSON.parse(savedMode) : prefersDark;
    setIsDarkMode(initialMode);
  }, []);

  // 테마 변경 시 localStorage 업데이트 + html class + data-color-mode 동기화
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    // 필요하다면 <html> 태그 클래스 변경 로직 추가
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // 에디터 등에서 참조하는 data-color-mode 동기화
    document.documentElement.setAttribute('data-color-mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // 테마 설정 객체
  const antdTheme = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#00b96b',
      colorBgLayout: isDarkMode ? '#0a0a0a' : '#ffffff',
      colorBgBase: isDarkMode ? '#0a0a0a' : '#ffffff',
      colorBgContainer: isDarkMode ? '#111827' : '#ffffff',
      colorTextBase: isDarkMode ? '#e5e7eb' : '#111827',
      colorBorder: isDarkMode ? '#374151' : '#e5e7eb',
    },
    components: {
      Tabs: {
        colorText: isDarkMode ? 'rgba(255, 255, 255, 0.95)' : undefined,
        colorPrimary: '#00b96b', 
      },
      Button: {
         colorTextDisabled: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : undefined,
         colorBgContainerDisabled: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : undefined,
      },
      Layout: {
        bodyBg: isDarkMode ? '#0a0a0a' : '#ffffff',
        headerBg: isDarkMode ? '#0b1420' : '#001529',
        siderBg: isDarkMode ? '#0f172a' : '#ffffff',
      },
      Card: {
        colorBgContainer: isDarkMode ? '#111827' : '#ffffff',
        colorBorderSecondary: isDarkMode ? '#374151' : '#e5e7eb',
      },
      Drawer: {
        colorBgElevated: isDarkMode ? '#111827' : '#ffffff',
      },
      Modal: {
        colorBgElevated: isDarkMode ? '#111827' : '#ffffff',
      },
      Table: {
        colorBgContainer: isDarkMode ? '#0f172a' : '#ffffff',
      },
    },
  } as const;

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

// 커스텀 훅 생성 (테마 상태와 토글 함수 사용을 쉽게 하기 위해)
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 