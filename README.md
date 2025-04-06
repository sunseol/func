# FunCommute

일간 업무 보고서를 쉽게 작성할 수 있는 웹 애플리케이션입니다.

## 특징

- 사용자 정보와 날짜 입력
- 프로젝트별 업무 관리
- 협업자 및 후속 조치 입력 지원
- 기타 업무 관리
- 생성된 보고서 실시간 미리보기
- LLM을 활용한 자연스러운 문장 생성
- 원클릭 복사 기능

## 기술 스택

- Next.js
- TypeScript
- Tailwind CSS
- GROQ API (LLM 통합)

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
   - GROQ API 키를 입력 (`NEXT_PUBLIC_GROQ_API_KEY`)

```bash
cp .env.local.example .env.local
# .env.local 파일을 편집하여 API 키 입력
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
    api/
      grop.ts (API 통신 로직)
    components/
      InputForm.tsx (입력 폼 컴포넌트)
      ResultDisplay.tsx (결과 표시 컴포넌트)
```

## 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| NEXT_PUBLIC_GROQ_API_KEY | GROQ API 키 | 없음 (필수) |

## 향후 개선 사항

- 주간/월간 보고서 지원
- 템플릿 저장 및 관리 기능
- 히스토리 기능

## 라이센스

MIT
