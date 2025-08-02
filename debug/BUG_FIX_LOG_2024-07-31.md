# 오류 수정 및 개선 기록 (2024-07-31)

## 개요
사용자 요청에 따라 발생한 여러 UI 버그, API 오류, 데이터베이스 정책 문제 및 전체적인 레이아웃 구조를 개선하는 작업을 진행했습니다. 주요 수정 사항은 다음과 같습니다.

---

## 1. UI 및 컴포넌트 문제 해결

### 문제 1: 텍스트 넘침(Overflow) 현상
- **내용**: 문서 관리 패널(`DocumentManager`) 및 문서 보기(`DocumentEditor`)에서 긴 텍스트가 영역을 벗어나 줄바꿈 없이 표시되는 문제가 있었습니다.
- **해결**: 관련 컴포넌트에 `break-all` CSS 클래스를 적용하여 단어 단위가 아닌, 글자 단위로 자동 줄바꿈이 되도록 수정했습니다.

### 문제 2: RichEditor 컴포넌트 종속성 및 UI 중복 문제
- **내용**: `RichEditor` 컴포넌트가 여러 곳(`DocumentEditor`, `my-reports`, `ResultDisplay`)에서 불필요하게 사용되고 있었습니다. 이로 인해 편집 UI가 중복으로 표시되거나, 컴포넌트 삭제 후 `Module not found` 오류가 발생하는 등 여러 문제가 발생했습니다.
- **해결**:
    - 프로젝트 전반에 걸쳐 `RichEditor`를 Ant Design의 `Input.TextArea` 또는 기본 HTML 태그로 교체하여 종속성을 제거했습니다.
    - 불필요해진 `RichEditor.tsx` 파일을 프로젝트에서 완전히 삭제했습니다.
    - `ResultDisplay` 컴포넌트 수정으로 인해 메인 페이지에서 사라졌던 "보고서 저장" 버튼을 다시 추가하여 기능을 복구했습니다.

---

## 2. API 및 데이터베이스 오류 수정

### 문제 1: Supabase 클라이언트 호출 오류
- **내용**: 다수의 API 라우트 파일에서 Supabase 클라이언트를 잘못된 이름(`createSupabaseClient`)으로 호출하여 서버 오류가 발생하고, 이로 인해 데이터 로딩에 실패하는 문제가 있었습니다.
- **해결**: 프로젝트 전체를 검색하여 `src/lib/ai-pm/api-middleware.ts` 파일이 근본 원인임을 파악했습니다. 모든 API 관련 파일에서 `createClient` 함수를 `await` 키워드와 함께 사용하도록 수정하여 문제를 해결했습니다.

### 문제 2: 프로젝트 멤버 관리 기능 오류 (RLS 정책)
- **내용**: 프로젝트 멤버를 추가하거나 삭제할 때 데이터베이스의 RLS(행 수준 보안) 정책 위반 및 "무한 재귀" 오류가 발생하여 기능이 정상적으로 동작하지 않았습니다.
- **해결**: `project_members` 테이블의 RLS 정책을 여러 번에 걸쳐 수정하고, API 라우트(`members/route.ts`)에서도 권한 확인 로직을 추가하여 안정적으로 멤버를 관리할 수 있도록 수정했습니다.

### 문제 3: Next.js API `params` 사용 경고
- **내용**: Next.js API 라우트에서 동적 인자(`params`)를 잘못 사용하고 있다는 경고가 터미널에 계속 출력되었습니다.
- **해결**: `members/route.ts`와 `activities/route.ts` 파일의 모든 핸들러에서 `params`를 사용하는 방식을 Next.js의 권장 사항에 맞게 `context.params` 형태로 수정하여 경고를 제거했습니다.

---

## 3. 전체 레이아웃 구조 개선

### 문제: 페이지 스크롤 시 헤더/사이드바가 고정되지 않는 문제
- **내용**: 여러 페이지(`ai-pm`, `ai-pm/[projectId]` 등)에서 개별적으로 전체 화면 레이아웃을 정의하여, 스크롤 시 헤더와 사이드바가 함께 움직이고 화면 전체가 튕기는 현상이 발생했습니다.
- **해결**:
    - 최상위 레이아웃 파일인 `src/app/ai-pm/layout.tsx`에서 `flexbox`를 사용하여 "고정 헤더 + 스크롤 가능한 메인 영역" 구조를 명확하게 정의했습니다.
    - 하위 페이지들(`page.tsx`, `[projectId]/page.tsx`, `.../workflow/[step]/page.tsx`)에서는 전체 화면 높이 관련 클래스를 모두 제거하고, 상위 레이아웃 구조에 맞게 콘텐츠 영역만 스크롤되도록(`overflow-y-auto`) 구조를 통일했습니다.
    - 이 작업을 통해 모든 AI-PM 관련 페이지에서 헤더와 사이드바가 의도대로 화면에 고정되고, 콘텐츠 영역만 부드럽게 스크롤되도록 사용자 경험을 개선했습니다.

## 수정된 주요 파일 목록
- `src/app/ai-pm/layout.tsx`
- `src/app/ai-pm/page.tsx`
- `src/app/ai-pm/[projectId]/page.tsx`
- `src/app/ai-pm/[projectId]/workflow/[step]/page.tsx`
- `src/components/ai-pm/DocumentEditor.tsx`
- `src/components/ai-pm/DocumentManager.tsx`
- `src/app/components/ResultDisplay.tsx`
- `src/app/my-reports/page.tsx`
- `src/lib/ai-pm/api-middleware.ts`
- `src/app/api/ai-pm/projects/[projectId]/members/route.ts`
- `src/app/api/ai-pm/projects/[projectId]/activities/route.ts`
- **(삭제)** `src/app/components/RichEditor.tsx`
