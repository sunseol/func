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

  // 테마 변경 시 localStorage 업데이트
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    // 필요하다면 <html> 태그 클래스 변경 로직 추가
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 테마 설정 객체
  const antdTheme = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#00b96b', // 기본 브랜드 색상
      // 전역 비활성화 토큰 제거 (컴포넌트 레벨에서 설정)
      // colorTextDisabled: ...,
      // colorBgContainerDisabled: ...,
    },
    components: {
      Tabs: {
        // 비활성 탭 텍스트 색상 밝기 증가 (0.9 -> 0.95)
        colorText: isDarkMode ? 'rgba(255, 255, 255, 0.95)' : undefined,
        // 활성 탭 색상은 기본 colorPrimary를 따르도록 설정
        colorPrimary: '#00b96b', 
      },
      Button: {
         // 비활성화 시 텍스트 색상 직접 지정 (더 밝게)
         colorTextDisabled: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : undefined,
         // 비활성화 시 배경색 직접 지정 (대비 높이기)
         colorBgContainerDisabled: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : undefined,
      }
    },
  };

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