# 리팩토링 현황 (작업 트리 기준)

## 스냅샷
- 브랜치: master (origin/master 대비 작업 트리 변경)
- 변경 규모: 121 files changed, +2,576 / -9,006
- 테스트: 미실행

## 변경 범위 요약
- AI-PM API 라우트 전반 정리 및 테스트 정리 (`src/app/api/ai-pm/**`)
- AI-PM 프론트/워크플로 UI 수정 (`src/components/ai-pm/**`, `src/app/ai-pm/**`)
- 보고서 생성 로직 분리 (`src/features/reports/**`, `src/lib/groq/client.ts`)
- 환경변수 필수화 유틸 추가 (`src/lib/env.ts`) 및 Supabase/Groq 연동 경로 업데이트
- 컨텍스트 구조 변경 (`src/context/**` → `src/contexts/**`)
- 성능/모바일 관련 유틸 및 UI 테이블 컴포넌트 업데이트
- 설정/문서 업데이트 (`jest.config.js`, `jest.setup.js`, `tsconfig.json`, `README.md`, `plan/*.md`, `.env.local.example`)

## 파일 상태
### 신규(미추적)
- `src/contexts/NotificationContext.tsx`
- `src/features/reports/ai.ts`
- `src/features/reports/types.ts`
- `src/lib/env.ts`
- `src/lib/groq/client.ts`
- `src/types/react-scroll.d.ts`
- `src/types/styled-components.d.ts`

### 삭제
- `src/context/NotificationContext.tsx` (컨텍스트 이동)
- `src/lib/security/secretsManager.ts`
- `src/app/api/grop.ts`
- 다수의 `*.bak` 백업 파일 (`src/app/api/ai-pm/**`)

### 수정(주요 그룹)
- `src/app/api/ai-pm/**` 및 관련 테스트 (`src/app/api/ai-pm/**/__tests__`)
- `src/lib/ai-pm/**` 및 통합 테스트 (`src/__tests__/integration/**`)
- `src/components/ai-pm/**` 및 관련 테스트
- 랜딩/페이지/UI 컴포넌트 (`src/app/**`, `src/components/ui/**`)
- 설정/문서 (`jest.config.js`, `jest.setup.js`, `tsconfig.json`, `README.md`, `plan/*.md`, `.env.local.example`)

## 미완/확인 필요
- `src/contexts/NavigationContext.tsx` 내 TODO: 권한 기반 접근 제어/워크플로 단계 접근 로직
- 신규 파일들이 아직 Git에 미추적 상태라 커밋 누락 가능
- `git diff`에서 CRLF 경고 발생: 라인 엔딩 통일 여부 확인 필요
- 대규모 API/테스트 변경에 대한 테스트 실행 미확인


