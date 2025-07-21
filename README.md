# FunCommute

일간 업무 보고서를 쉽게 작성할 수 있는 웹 애플리케이션입니다.

## 특징

- 사용자 정보와 날짜 입력
- 프로젝트별 업무 관리
- 협업자 및 후속 조치 입력 지원
- 기타 업무 관리
- 생성된 보고서 실시간 미리보기
- **리치 에디터를 통한 AI 생성 보고서 편집 기능**
- LLM을 활용한 자연스러운 문장 생성
- 원클릭 복사 기능
- **사용자 인증 및 보고서 저장**
- **내 보고서 목록 관리**
- **관리자 대시보드 (보고서 관리 및 통계)**

## 기술 스택

- Next.js 15
- React 19
- TypeScript
- Ant Design
- Tailwind CSS
- Supabase (인증 및 데이터베이스)
- GROQ API (LLM 통합)
- @uiw/react-md-editor (리치 에디터)

## 실행 방법

1. 저장소 클론:

```bash
git clone https://github.com/username/funcommute.git
cd funcommute
```

2. 의존성 설치:

```bash
npm install
```

3. 환경변수 설정:
   - `.env.local.example` 파일을 복사하여 `.env.local` 파일을 생성
   - 필요한 API 키와 설정을 입력

```bash
cp .env.local.example .env.local
# .env.local 파일을 편집하여 다음 값들을 입력:
# - NEXT_PUBLIC_GROQ_API_KEY: GROQ API 키
# - NEXT_PUBLIC_SUPABASE_URL: Supabase 프로젝트 URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase 익명 키
```

4. 개발 서버 실행:

```bash
npm run dev
```

5. 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```
src/
  app/
    page.tsx (메인 페이지)
    admin/
      page.tsx (관리자 대시보드)
    login/
      page.tsx (로그인 페이지)
    signup/
      page.tsx (회원가입 페이지)
    my-reports/
      page.tsx (내 보고서 목록)
    api/
      grop.ts (API 통신 로직)
    components/
      InputForm.tsx (입력 폼 컴포넌트)
      ResultDisplay.tsx (결과 표시 컴포넌트)
      RichEditor.tsx (리치 에디터 컴포넌트)
      WeeklyReportForm.tsx (주간 보고서 폼)
      ThemeProvider.tsx (테마 프로바이더)
  context/
    AuthContext.tsx (인증 컨텍스트)
  lib/
    supabase/ (Supabase 클라이언트 설정)
```

## 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| NEXT_PUBLIC_GROQ_API_KEY | GROQ API 키 | 없음 (필수) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | 없음 (필수) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 익명 키 | 없음 (필수) |

## 향후 개선 사항

- 주간/월간 보고서 지원
- 템플릿 저장 및 관리 기능
- 히스토리 기능

## 라이센스

MIT
