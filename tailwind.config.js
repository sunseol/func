/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 클래스 기반 다크 모드 활성화
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}", // app 디렉토리 내 모든 관련 파일
    // components 디렉토리가 src/app 아래에 있으므로 위 경로에 포함됨
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