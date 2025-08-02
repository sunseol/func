# AI-PM 기능 디버깅 및 해결 과정 로그

이 문서는 AI-PM 기능 개발 중 발생한 다양한 오류와 해결 과정을 기록한 로그입니다.

## 요약

초기 `401 Unauthorized` 인증 오류부터 시작하여 `403 Forbidden`, `500 Internal Server Error` (데이터 타입 불일치), 그리고 프론트엔드 타입 오류에 이르기까지 복합적인 문제들을 해결했습니다. 주요 원인은 최신 Next.js(v15)/React(v19) 스택과 `@supabase/ssr` 라이브러리 간의 비호환성 및 설정 오류였으며, 최종적으로 Next.js 공식 `with-supabase` 예제를 "진리의 원천"으로 삼아 문제를 해결했습니다.

---

### 1. [401 Unauthorized] API 요청 인증 실패

-   **현상**: `AIPMPage`(`src/app/ai-pm/page.tsx`)에서 `/api/ai-pm/projects`로 프로젝트 목록을 요청할 때 지속적으로 401 오류가 발생했습니다. 서버 로그에는 `cookies()` 함수를 `await` 없이 사용했다는 에러가 출력되었습니다.
-   **원인 분석**:
    1.  **초기 원인**: Next.js 14+ 버전부터 `next/headers`의 `cookies()` 함수가 동적(dynamic) API로 변경되어 반드시 `await`으로 호출해야 했습니다. 하지만 `@supabase/ssr` 라이브러리의 서버 클라이언트 생성 로직(`createServerClient`)이 이를 제대로 처리하지 못하고 있었습니다.
    2.  **근본 원인**: 사용 중인 Next.js(v15), React(v19) 버전과 `@supabase/ssr` 라이브러리 버전 간의 호환성 문제가 있었습니다. 다양한 해결책(클라이언트 생성 방식 변경, `React.cache` 사용 등)을 시도했지만, 모두 실패했습니다.
-   **해결 과정**:
    1.  **잘못된 시도들**:
        -   `createClient` 함수를 `async`로 만들고 `await cookies()`를 사용.
        -   `@supabase/auth-helpers-nextjs` 라이브러리를 추가 (오히려 더 혼란을 야기).
        -   비공식 스타터 프로젝트를 참조하여 코드 수정.
    2.  **최종 해결책**:
        -   Next.js 공식 GitHub 저장소의 `with-supabase` 예제 코드를 "진리의 원천"으로 삼았습니다.
        -   **`src/lib/supabase/server.ts`**: 공식 예제와 동일하게 `createClient`를 `async` 함수로 만들고, 내부적으로 `await cookies()`를 호출하며, 쿠키 처리 로직으로 `getAll()`과 `setAll()`을 사용하도록 수정했습니다.
        -   **`src/middleware.ts`**: 공식 예제와 동일하게, 미들웨어 내에서 `request.cookies`를 사용하고 `supabase.auth.getUser()` (또는 `getClaims`)로 세션을 갱신하는 안정적인 로직으로 교체했습니다.
        -   **모든 API 라우트**: `createClient`가 `async`로 변경됨에 따라, 모든 API 라우트에서 `const supabase = await createClient();`와 같이 `await`을 사용하여 클라이언트를 생성하도록 수정했습니다.

---

### 2. [403 Forbidden] 권한 확인 실패

-   **현상**: 401 인증 오류 해결 직후, 403 권한 없음 오류가 발생했습니다. 서버 로그에는 `TypeError: Cannot read properties of undefined (reading 'getUser')`가 출력되었습니다.
-   **원인**: `src/lib/ai-pm/auth-middleware.ts`의 `checkAuth` 함수가 비동기로 변경된 `createClient` 함수를 `await` 없이 호출하여, `supabase` 클라이언트가 제대로 생성되지 않았습니다.
-   **해결**: `checkAuth` 함수 내 `const supabase = createClient();`를 `const supabase = await createClient();`로 수정하여 문제를 해결했습니다.

---

### 3. [500 Internal Server Error] 데이터베이스 타입 불일치

-   **현상**: 인증/권한 문제가 해결되자, `/api/ai-pm/projects` API가 500 오류를 반환했습니다. DB 로그에는 `DATATYPE_MISMATCH` (error code `42804`)와 함께 `structure of query does not match function result type` 메시지가 출력되었습니다.
-   **원인**:
    1.  `get_projects_for_user` 데이터베이스 함수가 반환하도록 정의된 열의 타입(예: `name TEXT`)과, 실제 `projects` 및 `user_profiles` 테이블에 정의된 열의 타입(예: `name VARCHAR(255)`)이 서로 일치하지 않았습니다.
    2.  처음에는 `name` 열(3번째)만 문제로 나타났고, 수정한 후에는 `creator_email` 열(8번째)에서 동일한 문제가 다시 발생했습니다.
-   **해결 과정**:
    1.  데이터를 보존하기 위해 `db reset` 대신 Supabase 관리 도구를 사용했습니다.
    2.  `DROP FUNCTION IF EXISTS get_projects_for_user(UUID);` 쿼리로 기존 함수를 먼저 삭제했습니다.
    3.  함수의 `RETURNS TABLE` 정의 부분에서 문제가 된 `name`, `creator_email`, `creator_name`의 타입을 모두 실제 테이블 스키마와 일치하는 `VARCHAR(255)`로 수정한 후, `CREATE FUNCTION` 쿼리로 함수를 다시 생성했습니다.
    4.  향후 혼란을 방지하기 위해 로컬 마이그레이션 파일(`012_create_get_projects_function.sql`)의 내용도 데이터베이스와 동일하게 수정했습니다.

---

### 4. [Syntax Error] 프론트엔드 컴파일 오류

-   **현상**: 특정 API 라우트 진입 시 `Parsing ecmascript source code failed` 오류와 함께 `Unexpected token 'ext'` 메시지가 발생했습니다.
-   **원인**: `src/app/api/ai-pm/projects/[projectId]/route.ts` 와 `src/app/api/ai-pm/documents/route.ts` 등 다수의 파일에서 `import { cookies } from 'next/headers';` 구문이 두 줄로 깨져있었습니다.
-   **해결**: 깨진 `import` 구문을 올바르게 한 줄로 합치고, 각 파일에 중복으로 정의되어 있던 로컬 `checkAuth` 함수를 제거한 후 중앙 `auth-middleware`의 함수를 가져오도록 코드를 리팩토링했습니다.

---

### 5. [TypeError] 프론트엔드 렌더링 오류

-   **현상**: 대화 기록 상세 페이지에서 `TypeError: message.timestamp.toISOString is not a function` 오류가 발생했습니다.
-   **원인**: API를 통해 전달받은 메시지 데이터의 `timestamp` 값이 `Date` 객체가 아닌 문자열(string) 형태였습니다. 이 문자열에 `toISOString()` 함수를 직접 호출하려고 시도하여 오류가 발생했습니다.
-   **해결**: `ConversationHistoryPanel.tsx` 컴포넌트에서 `message.timestamp` 값을 사용하기 전에 `new Date(message.timestamp)`로 감싸 `Date` 객체로 변환한 후, `toISOString()` 및 `format()` 함수를 호출하도록 수정했습니다.

---

## 최종 결론

이번 디버깅은 최신 프레임워크와 라이브러리 사용 시 공식 문서 및 예제의 중요성을 다시 한번 일깨워주었습니다. 문제가 발생했을 때 단편적인 현상만 보고 수정하기보다, 관련된 전체 스택(인증, 미들웨어, API, 데이터베이스, 프론트엔드)의 데이터 흐름과 코드 일관성을 점검하는 것이 근본적인 해결책임을 확인했습니다.
