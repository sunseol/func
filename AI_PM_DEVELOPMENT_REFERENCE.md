# FunCommute 시스템 개발 참고 문서

이 문서는 FunCommute 시스템을 기반으로 새로운 기능을 개발할 때 참고할 수 있는 기술 스택, 코드 컨벤션, 데이터베이스 구조 등을 정리한 문서입니다.

## 📋 목차
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [데이터베이스 구조](#데이터베이스-구조)
- [인증 시스템](#인증-시스템)
- [코드 컨벤션](#코드-컨벤션)
- [UI/UX 가이드라인](#uiux-가이드라인)
- [API 구조](#api-구조)
- [환경 설정](#환경-설정)
- [개발 워크플로우](#개발-워크플로우)

## 🛠 기술 스택

### 프론트엔드
- **Next.js 15** - App Router 사용
- **React 19** - 최신 React 기능 활용
- **TypeScript 5** - 타입 안전성 보장
- **Ant Design 5** - UI 컴포넌트 라이브러리 (React 19 호환 패치 적용)
- **Tailwind CSS 4** - 유틸리티 기반 스타일링 (다크모드 지원)
- **@uiw/react-md-editor** - 마크다운 에디터

### 백엔드 & 데이터베이스
- **Supabase** - BaaS (Backend as a Service)
- **PostgreSQL** - 관계형 데이터베이스
- **Row Level Security (RLS)** - 데이터베이스 레벨 보안
- **Supabase SSR** - 서버사이드 렌더링 지원

### AI & 외부 서비스
- **GROQ API** - LLM 서비스 (자연어 보고서 생성)

### 개발 도구
- **Turbopack** - 빠른 번들러 (개발 환경)
- **ESLint** - 코드 린팅
- **Playwright** - E2E 테스트

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # 루트 레이아웃 (Provider 설정)
│   ├── page.tsx                 # 홈페이지 (메인 보고서 폼)
│   ├── globals.css              # 전역 스타일
│   ├── favicon.ico              # 앱 아이콘
│   ├── login/page.tsx           # 로그인 페이지
│   ├── signup/page.tsx          # 회원가입 페이지
│   ├── my-reports/page.tsx      # 사용자 보고서 관리
│   ├── admin/page.tsx           # 관리자 대시보드
│   ├── notifications/page.tsx   # 알림 관리
│   ├── api/                     # API 라우트
│   │   ├── groq/route.ts       # GROQ API 연동
│   │   └── grop.ts             # 추가 API 엔드포인트
│   └── components/              # 공유 UI 컴포넌트
│       ├── ThemeProvider.tsx    # 테마 컨텍스트
│       ├── RichEditor.tsx       # 마크다운 에디터
│       ├── InputForm.tsx        # 보고서 입력 폼
│       ├── ResultDisplay.tsx    # 보고서 미리보기
│       ├── WeeklyReportForm.tsx # 주간 보고서 폼
│       ├── NotificationSettings.tsx # 알림 설정
│       ├── ReportSummary.tsx    # 보고서 요약
│       └── AdminAIAssistant.tsx # 관리자 AI 어시스턴트
├── context/                     # React Context
│   ├── AuthContext.tsx          # 인증 상태 관리
│   └── NotificationContext.tsx  # 알림 상태 관리
├── lib/                         # 유틸리티 라이브러리
│   └── supabase/               # Supabase 클라이언트
│       ├── client.ts           # 클라이언트 사이드
│       └── server.ts           # 서버 사이드
└── middleware.ts               # Next.js 미들웨어 (인증 보호)
```

## 🗄 데이터베이스 구조

### 주요 테이블

#### user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### daily_reports
```sql
CREATE TABLE daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('morning', 'evening', 'weekly')),
  user_name_snapshot VARCHAR(255) NOT NULL,
  report_content TEXT NOT NULL,
  projects_data JSONB,
  misc_tasks_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS (Row Level Security) 정책
- 사용자는 자신의 데이터만 CRUD 가능
- 관리자는 모든 데이터 접근 가능
- 특정 관리자 이메일 하드코딩 (`jakeseol99@keduall.com`)

### 인덱스 최적화
```sql
CREATE INDEX idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_created_at ON daily_reports(created_at);
```

## 🔐 인증 시스템

### AuthContext 구조
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  handleLogout: () => Promise<void>;
}
```

### Supabase 클라이언트 설정
- **클라이언트 사이드**: `createBrowserClient` 사용
- **서버 사이드**: `createServerClient` 사용 (쿠키 기반)
- **미들웨어**: 인증 보호 라우트 설정

### 권한 관리
- **user**: 일반 사용자 (기본값)
- **admin**: 관리자 권한
- 자동 프로필 생성 트리거 함수 구현

## 📝 코드 컨벤션

### 파일 & 디렉토리 명명
- **페이지**: `page.tsx` (App Router 규칙)
- **컴포넌트**: PascalCase (예: `InputForm.tsx`)
- **유틸리티**: camelCase (예: `createClient.ts`)
- **디렉토리**: 라우트는 kebab-case, 기타는 camelCase

### 데이터베이스 명명
- **테이블**: snake_case (예: `user_profiles`, `daily_reports`)
- **컬럼**: snake_case (예: `created_at`, `user_id`)

### TypeScript 규칙
- **컴포넌트**: PascalCase
- **함수**: camelCase (동사-명사 패턴)
- **상수**: UPPER_SNAKE_CASE
- **타입/인터페이스**: PascalCase + 설명적 접미사

### 컴포넌트 구조
```typescript
'use client'; // 클라이언트 컴포넌트 명시

import { useState, useEffect } from 'react';
import { Button, Card } from 'antd';

interface ComponentProps {
  // props 타입 정의
}

export default function ComponentName({ props }: ComponentProps) {
  // 상태 관리
  const [state, setState] = useState();
  
  // 이펙트
  useEffect(() => {
    // 사이드 이펙트
  }, []);

  // 이벤트 핸들러
  const handleEvent = () => {
    // 이벤트 처리
  };

  return (
    // JSX 반환
  );
}
```

## 🎨 UI/UX 가이드라인

### 테마 시스템
- **다크/라이트 모드** 지원
- **ThemeProvider**로 전역 테마 관리
- **localStorage**에 사용자 선택 저장
- **시스템 설정** 자동 감지

### Ant Design 커스터마이징
```typescript
const antdTheme = {
  algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#00b96b', // 브랜드 색상
  },
  components: {
    // 컴포넌트별 커스터마이징
  },
};
```

### 반응형 디자인
- **Tailwind CSS** 유틸리티 클래스 활용
- **Ant Design** 그리드 시스템 사용
- **모바일 우선** 접근법

### 접근성 (Accessibility)
- **시맨틱 HTML** 사용
- **키보드 네비게이션** 지원
- **스크린 리더** 호환성
- **색상 대비** 준수

## 🔌 API 구조

### GROQ API 연동
```typescript
// src/app/api/groq/route.ts
export async function POST(request: Request) {
  const groq = new Groq({
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  });
  
  // API 로직
}
```

### Supabase 쿼리 패턴
```typescript
// 데이터 조회
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);

// 데이터 삽입
const { data, error } = await supabase
  .from('table_name')
  .insert([{ /* data */ }]);
```

### 에러 처리
- **try-catch** 블록 사용
- **사용자 친화적** 에러 메시지
- **로깅** 시스템 구현

## ⚙️ 환경 설정

### 필수 환경 변수
```bash
# GROQ API
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 설정 파일
- **next.config.mjs**: Next.js 설정
- **tailwind.config.js**: Tailwind CSS 설정
- **tsconfig.json**: TypeScript 설정
- **eslint.config.mjs**: ESLint 설정

## 🔄 개발 워크플로우

### 개발 명령어
```bash
npm run dev          # 개발 서버 시작 (Turbopack)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 시작
npm run lint         # 코드 린팅
```

### 개발 프로세스
1. **기능 설계** - 요구사항 분석 및 설계
2. **데이터베이스 스키마** 설계 (필요시)
3. **컴포넌트 개발** - UI 컴포넌트 구현
4. **API 개발** - 백엔드 로직 구현
5. **통합 테스트** - 기능 통합 및 테스트
6. **배포** - 프로덕션 환경 배포

### 코드 품질 관리
- **TypeScript** 타입 체크
- **ESLint** 코드 스타일 검사
- **Prettier** 코드 포맷팅 (권장)
- **Git hooks** 활용 (권장)

## 📚 참고 자료

### 공식 문서
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [Ant Design 5 Documentation](https://ant.design/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### 주요 라이브러리
- [@ant-design/v5-patch-for-react-19](https://www.npmjs.com/package/@ant-design/v5-patch-for-react-19)
- [@supabase/ssr](https://www.npmjs.com/package/@supabase/ssr)
- [@uiw/react-md-editor](https://www.npmjs.com/package/@uiw/react-md-editor)
- [groq-sdk](https://www.npmjs.com/package/groq-sdk)

---

이 문서는 FunCommute 시스템의 현재 구조를 기반으로 작성되었으며, 새로운 기능 개발 시 일관성 있는 코드 작성을 위한 가이드라인을 제공합니다.