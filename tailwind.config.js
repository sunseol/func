/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 클래스 기반 다크 모드 활성화
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // 전체 src 스캔으로 컴포넌트/훅/페이지 모두 포함
  ],
  theme: {
    extend: {
      // 필요한 경우 테마 확장 (예: 다크 모드 색상 등)
      // colors: {
      //   dark: {
      //     background: '#1a202c',
      //     text: '#e2e8f0',
      //   }
      // }
    },
  },
  plugins: [],
} 