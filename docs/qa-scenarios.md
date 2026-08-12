# FunCommute 제품 QA 시나리오 기준서

> 작성 기준: `src/app/**` 라우트, `src/components/**` 내 사용자 표면, `src/contexts/**` 가드/네비게이션, `src/app/api/**` 계약, 현재 `e2e/*.spec.ts`를 교차 확인했다. 이 문서는 실행 가능한 요구사항 원장이다. 표의 `status`는 코드와 Playwright 시나리오가 연결된 **구현 커버리지**이고, 최신 실행 결과는 아래 6절에 별도로 기록한다.

## 1. 공통 계약

### 1.1 인증 및 리다이렉트

- 보호 라우트에 비인증으로 접근하면 `/login?redirect=<safe internal path>`로 이동한다. `redirect`는 내부 경로(`/` 시작)만 허용하고 외부 URL/open redirect는 거부한다.
- 로그인 성공 후 `redirect`가 안전한 내부 경로이면 그 경로로 이동하고, 없거나 유효하지 않으면 `/`로 이동한다.
- 인증된 사용자가 `/login`에 접근하면 요청된 안전 경로 또는 `/`로 이동한다.
- 로그아웃은 `/landing`으로 이동하고 세션 쿠키/토큰을 제거한다.
- `/landing`, `/signup`, `/login`(로그인 폼), 비밀번호 재설정 공개 화면은 비인증 상태에서도 접근 가능해야 한다.
- 현재 구현의 `login/page.tsx`와 `AuthContext`는 안전한 내부 `redirect` 경로로 이동하고, 없거나 유효하지 않으면 `/`로 이동하므로 위 계약을 E2E에서 고정한다.

### 1.2 테스트 계정/데이터

환경 변수에 저장된 테스트 계정만 사용한다(문서에 비밀값을 기록하지 않는다).

| 별칭 | 시스템 역할 | AI-PM 프로젝트 역할 | 용도 |
|---|---|---|---|
| `admin` | `admin` | 전체 권한 | 관리자/승인/프로젝트 CRUD |
| `member-service` | `user` | service planning | 기본 승인자 경로 |
| `member-content` | `user` | content planning | 역할별 접근 |
| `member-ux` | `user` | ux planning | IA/UX 승인 |
| `member-dev` | `user` | developer | 구현/문서 상태 |
| `outsider` | `user` | 프로젝트 미가입 | 403/접근 거부 |

각 시나리오는 고유한 접두사(`qa-<scenario-id>-<timestamp>`)를 사용해 프로젝트/보고서/문서를 만들고 종료 시 삭제한다. 실서비스 계정·비밀키·실사용자 개인정보를 사용하지 않는다.

## 2. 사용자 기능 인벤토리

| Feature ID | 사용자 기능 및 라우트 | 인증/역할 | 코드 근거 | 상태 |
|---|---|---|---|---|
| INV-LAND | 랜딩 헤더/푸터, Hero, Problem, Features, Solution, Social proof, Pricing, FAQ, Final CTA 및 CTA/앵커 내비게이션 (`/landing`) | 공개 | `src/app/landing/**` | covered |
| INV-AUTH | 로그인/로그아웃/세션 만료/보호 라우트 redirect (`/login`, `/`, `AppSidebar`) | 공개→인증 | `login/page.tsx`, `AuthContext.tsx`, `RouteGuard.tsx` | covered |
| INV-RESET | 로그인 화면 비밀번호 재설정 메일 요청 및 reset callback 공개 접근 | 공개 | `login/page.tsx`, `reset-password/page.tsx` | covered |
| INV-SIGNUP | 회원가입, 이메일 중복 확인, 확인 메일/재전송, 폼 검증 (`/signup`) | 공개 | `signup/page.tsx`, `/api/auth/check-email` | covered |
| INV-DAILY | 일일 출근/퇴근 보고서 입력, 기본 미리보기, AI 생성, 편집 저장 (`/`) | 인증 사용자 | `page.tsx`, `InputForm`, `ResultDisplay` | covered |
| INV-WEEKLY | 주간 보고서 초안/AI 생성/기본 미리보기/저장 (`/`, weekly tab) | 인증 사용자 | `WeeklyReportForm`, `page.tsx` | covered |
| INV-MYLIST | 내 보고서 목록/로딩/빈 상태/검색/날짜·유형 필터/행 확장 (`/my-reports`) | 인증 사용자 | `my-reports/page.tsx` | covered |
| INV-MYCRUD | 과거 수동 추가, 편집, 복사, 삭제 및 DB 반영 (`/my-reports`) | 인증 사용자(소유자) | `my-reports/page.tsx` | covered |
| INV-GEN | 리포트 생성기 텍스트/파일 입력, PDF·TXT·DOCX 파싱, 검증, 요약/생성, sanitize, print (`/report-generator`) | 인증 사용자 | `report-generator/page.tsx`, `/api/report/*` | covered |
| INV-NOTIFY | 알림 설정, 알림 이력, 읽음 처리, 브라우저 권한/테스트 알림 (`/notifications`) | 인증 사용자 | `notifications/page.tsx`, `NotificationSettings` | covered |
| INV-PROFILE | 이름/프로필 업데이트 및 저장 피드백 (`/profile`) | 인증 사용자 | `profile/page.tsx` | covered |
| INV-ADMIN-GATE | 관리자 게이트와 비관리자 fallback (`/admin`) | admin만 | `admin/page.tsx` | covered |
| INV-ADMIN-ANALYTICS | 통계 카드/analytics(사용자·보고서·오늘·주간) | admin | `admin/page.tsx` | covered |
| INV-ADMIN-REPORTS | 전체 보고서 탭, 상세, 삭제 | admin | `admin/page.tsx` | covered |
| INV-ADMIN-USERS | 사용자 목록, 역할 변경, 사용자 삭제 | admin | `admin/page.tsx` | covered |
| INV-ADMIN-AI | 관리자 AI 요약/질의 패널 | admin | `AdminAIAssistant`, `admin/page.tsx`, `/api/groq` | covered |
| INV-AIPM-DASH | AI-PM 프로젝트 목록/검색·통계·빈 상태/권한별 노출 (`/ai-pm`) | 인증; admin만 생성 | `ai-pm/page.tsx`, `ProjectCard` | covered |
| INV-AIPM-PROJECT | 프로젝트 생성/삭제/오류 및 프로젝트 개요 (`/ai-pm/[projectId]`) | admin 또는 멤버 | project page, `/api/ai-pm/projects*` | covered |
| INV-AIPM-COLLAB | 활동 피드/협업 현황 | 멤버; admin 전체 | project page, activities API | covered |
| INV-AIPM-MEMBER | 멤버 추가/역할 변경/삭제 및 역할 표시 | admin/프로젝트 관리자 | `MemberManagement` | covered |
| INV-AIPM-SETTINGS | 프로젝트 설정 탭(이름/설명/삭제 경계) | admin/프로젝트 관리자 | project page | covered |
| INV-WORKFLOW | 9단계 사이드바/진행률/가이드/단계 라우팅 (`/ai-pm/[id]/workflow/[1..9]`) | 멤버 | `WorkflowSidebar`, `WorkflowProgress`, `WorkflowGuide`, `types/ai-pm.ts` | covered |
| INV-DOC-LIFECYCLE | 문서 생성(AI)/선택/편집/저장/삭제/버전·이력/상태 전이 | 멤버; 승인 역할별 | `DocumentEditor`, `DocumentManager`, document APIs | covered |
| INV-DOC-APPROVAL | 요청/승인/거절/철회 및 pending approvals | 작성자/승인 역할/admin | document status APIs | covered |
| INV-DOC-CONFLICT | 공식 문서 간 충돌 분석/제안 | 멤버 | `ConflictAnalysisPanel`, analyze-conflicts API | covered |
| INV-AICHAT | AI 채팅 히스토리/stream/export/clear/error/retry | 멤버 | `AIChatPanel`, `ConversationHistoryPanel`, chat APIs | covered |
| INV-SHELL | 테마, 전역 사이드바/모바일 drawer, 반응형, 오프라인 indicator, a11y/focus | 해당 라우트 권한 | `ThemeProvider`, `AppSidebar`, `OfflineIndicator`, UI components | covered |
| INV-ERROR | not-found/error boundary 및 개발용 test-error 화면 | 공개/해당 세션 | `src/app/not-found.tsx`, `error.tsx`, `test-error/page.tsx` | covered |

### 2.1 랜딩 카피와 실행 기능의 경계

Pricing/FAQ/Features 섹션이 약속하는 유료 플랜, 전용 지원, 고급 분석 등은 현재 라우트/핸들러로 확인되지 않는다. 이런 광고 문구는 **product-copy gap**으로 기록하며 실행 가능한 feature/통과 기준으로 만들지 않는다. CTA가 실제로 연결하는 `/login` 또는 `/signup`, 앵커 스크롤만 E2E 대상이다.

## 3. 시나리오 원장

열 순서: `ID | 기능/경로·역할 | Given / When / Then | seed·viewport | 기대 URL/UI·network/DB | cleanup | 자동화 매핑 | tier | status`.

| ID | 기능/경로·역할 | Given / When / Then | seed·viewport | 기대 URL/UI·network/DB | cleanup | 자동화 매핑 | tier | status |
|---|---|---|---|---|---|---|---|---|
| QA-LAND-001 | 랜딩 섹션 | Given 비인증, When `/landing` 로드, Then 헤더·Hero·Problem·Features·Solution·Social proof·Pricing·FAQ·Final CTA·푸터가 순서와 앵커로 보인다 | 없음; 1440, 390 | URL `/landing`; 각 section landmark/heading; API 오류 없음; DB 변화 없음 | context 종료 | Playwright `core/landing.spec.ts` | visual | covered |
| QA-LAND-002 | 랜딩 CTA/내비 | Given landing, When Header 보고서 작성/로그인 및 CTA 클릭, Then 안전한 `/login` 또는 `/signup`으로 이동하고 모바일 메뉴도 같은 링크를 제공 | 없음; 1440/390 | URL; click trace; 외부 URL 없음 | 없음 | Playwright `core/landing.spec.ts` | deterministic | covered |
| QA-LAND-003 | FAQ/가격 카피 경계 | Given landing, When FAQ/가격 토글, Then 카피는 노출되나 미구현 약속은 API 호출/DB 쓰기 없이 product-copy gap으로 태깅 | 없음; 1440 | UI 토글; network 0 mutation | 없음 | Playwright `core/landing.spec.ts` | visual | covered |
| QA-AUTH-001 | 보호 라우트 redirect | Given 로그아웃, When `/`, `/my-reports`, `/report-generator`, `/notifications`, `/profile`, `/admin`, `/ai-pm` 직접 접근, Then 각 요청이 `/login?redirect=<encoded-safe-path>`로 간다 | 없음; 1440 | URL query 정확성; login form; API 401/redirect; DB 변화 없음 | 쿠키 삭제 | Playwright `auth.spec.ts` | deterministic | covered |
| QA-AUTH-002 | 로그인 성공 redirect | Given 테스트 사용자와 `redirect=/my-reports`, When 유효 자격 증명 제출, Then `/my-reports`로 이동하고 세션이 설정된다 | seed auth user; 1440/390 | URL; `/auth/v1/token` 2xx; user session cookie; DB read only | signOut | Playwright `auth.spec.ts` | live-integration | covered |
| QA-AUTH-003 | 로그인 오류/검증 | Given 빈/잘못된 email·password, When 제출, Then 필드 오류 또는 한국어 오류 Alert가 표시되고 URL/DB는 유지된다 | 없음; 1440 | no successful auth call for client validation; no DB mutation | 폼 reset | Playwright `auth.spec.ts` | deterministic | covered |
| QA-AUTH-004 | 인증 사용자 `/login` | Given 로그인 세션, When `/login` 접근(redirect 없음/안전 redirect), Then `/` 또는 안전 경로로 이동 | seed auth; 1440 | URL; protected UI visible | signOut | Playwright `auth.spec.ts` | deterministic | covered |
| QA-AUTH-005 | 로그아웃/세션 만료 | Given 로그인 및 protected page, When 로그아웃 또는 쿠키 삭제 후 새 protected URL, Then 로그아웃은 `/landing`, 만료 접근은 login redirect, 뒤로가기로 보호 UI를 복구하지 못한다 | seed auth; 1440/390 | URL; auth session revoked; API 401 | clear cookies | Playwright `auth.spec.ts` | live-integration | covered |
| QA-RESET-001 | 비밀번호 재설정 요청 | Given 공개 login에서 유효 email 입력, When “비밀번호를 잊으셨나요?” 클릭, Then reset API가 redirectTo `/reset-password`로 호출되고 성공/실패 Alert가 보인다 | auth email; 1440 | `/auth/v1/recover` request; success Alert; DB auth event | 이메일 토큰 폐기 | Playwright `auth.spec.ts` | live-integration | covered |
| QA-RESET-002 | reset 공개 접근 | Given 비인증, When `/reset-password` callback URL 접근, Then 공개 reset UI가 보이고 세션 없는 상태에서도 landing으로 튕기지 않는다 | reset token fixture; 390 | URL remains; no protected API | token cleanup | Playwright `auth.spec.ts` | live-integration | covered |
| QA-SIGN-001 | 회원가입 성공/확인 | Given 새 email/fullName/password, When signup 제출, Then `/api/auth/check-email` false 후 signUp 2xx, 확인 메일 안내/폼 reset, 중복 DB row 없음 | unique seeded email; 1440/390 | network check-email + auth signup; user row; confirmation message | delete auth user | Playwright `account/account.spec.ts` | live-integration | covered |
| QA-SIGN-002 | 중복 이메일 | Given 기존 email, When signup 제출, Then generic feedback, signUp 호출 1회 및 로그인 링크 유지 | existing auth user; 1440 | signup response; no account disclosure; no extra profile | 없음 | Playwright `account/account.spec.ts` | live-integration | covered |
| QA-SIGN-003 | signup 검증/재전송 | Given 이름 공백/invalid email/짧은 password 또는 확인 메일 상태, When submit/resend, Then 필드 오류 또는 재전송 안내가 보인다 | 없음; 390 | no DB mutation on invalid; resend request on valid pending | delete fixture | Playwright `account/account.spec.ts` | deterministic | covered |
| QA-REPORT-001 | 일일 출근 기본 미리보기 | Given 로그인, When `/`에서 이름·날짜·프로젝트 task 입력 후 출근 선택, Then 기본 preview에 입력이 반영되고 AI 버튼은 활성화된다 | user + `2026-08-11`; 1440 | URL `/`; DOM preview; no AI network before click | delete report if saved | Playwright `core/reports-daily-weekly.spec.ts` | deterministic | covered |
| QA-REPORT-002 | 일일 퇴근 AI 생성 | Given valid evening content, When AI 보고서 생성, Then loading→generated text→success message, `/api/groq` 호출 및 오류 시 Alert | user; 1440 | fetch `/api/groq` 2xx; generated text; no DB until save | delete draft | Playwright `core/reports-daily-weekly.spec.ts` | live-integration | covered |
| QA-REPORT-003 | 기본/AI 편집 저장 | Given preview, When edit result then 저장, Then `daily_reports` insert는 date/type/name/projects/misc/content를 저장하고 성공 알림 | user + valid date; 1440 | Supabase insert 2xx; row values exact; URL unchanged | delete inserted row | Playwright `core/reports-daily-weekly.spec.ts` | live-integration | covered |
| QA-REPORT-004 | 저장 validation | Given missing name/date/content 또는 date not `YYYY-MM-DD`, When AI/save, Then disabled/error and no insert | invalid fixtures; 390 | no insert network/DB; Alert text | reset form | Playwright `core/reports-daily-weekly.spec.ts` | deterministic | covered |
| QA-WEEK-001 | 주간 초안/기본 preview | Given 로그인, When weekly tab 선택 및 기간/업무 입력, Then weekly draft와 기본 preview가 보이고 reportType=weekly가 유지된다 | user; 1440/390 | URL `/`; DOM fields; no DB | reset | Playwright `core/reports-daily-weekly.spec.ts` | deterministic | covered |
| QA-WEEK-002 | 주간 AI/저장 | Given weekly draft, When AI 생성 후 저장, Then `/api/groq` 또는 weekly helper 결과가 표시되고 weekly row가 저장된다 | user; 1440 | API 2xx; DB `report_type=weekly` | delete row | Playwright `core/reports-daily-weekly.spec.ts` | live-integration | covered |
| QA-MY-001 | 목록/빈 상태 | Given 로그인 사용자(보고서 0개/여러 개), When `/my-reports` 로드, Then loading→empty 또는 list와 count가 보인다 | seeded own reports; 1440 | URL; select `daily_reports` scoped user_id; no cross-user rows | delete seeds | Playwright `core/my-reports.spec.ts` | live-integration | covered |
| QA-MY-002 | 검색/날짜·유형 필터 | Given ≥3 reports, When 검색어·날짜 범위·morning/evening 필터 조합, Then 일치 행만 보이고 reset은 전체 복원 | seed reports; 1440/390 | query state/UI; DB reads only | delete seeds | Playwright `core/my-reports.spec.ts` | deterministic | covered |
| QA-MY-003 | 행 확장/상세 | Given list row, When expand/collapse, Then report_content/projects/tasks가 표시되고 다른 row 상태는 보존 | seed report; 390 | DOM expanded panel; URL unchanged | delete | Playwright `core/my-reports.spec.ts` | visual | covered |
| QA-MY-004 | 수동 추가 | Given valid historical date/type/content, When “과거 보고서 수동 추가” submit, Then one row insert 및 list refresh | user; 1440 | Supabase insert 2xx; row owner/date exact | delete row | Playwright `core/my-reports.spec.ts` | live-integration | covered |
| QA-MY-005 | 편집 | Given own row, When edit content/date/type 저장, Then update 2xx and reopened row shows new values | own seed; 1440 | update DB exact; success toast | restore/delete | Playwright `core/my-reports.spec.ts` | live-integration | covered |
| QA-MY-006 | 복사 | Given own row, When copy modal new date submit, Then new row has copied data/new date and original unchanged | own seed; 1440/390 | insert one new row; original DB unchanged | delete copy/original | Playwright `core/my-reports.spec.ts` | live-integration | covered |
| QA-MY-007 | 삭제/권한 | Given own row and another user's row, When delete own then attempt other, Then confirmation/delete succeeds only own; other absent/403 | two users; 1440 | delete 2xx own; other delete denied; DB check | delete fixtures | Playwright `core/my-reports.spec.ts` | live-integration | covered |
| QA-GEN-001 | 텍스트 입력 | Given `/report-generator`, When text source 입력 후 generate, Then progress/result HTML appears and print action is available | user; 1440 | URL; `/api/report/summarize`, `/api/report/generateHtml` 2xx; no DB | none | Playwright `core/report-generator.spec.ts` | live-integration | covered |
| QA-GEN-002 | 파일 PDF/TXT/DOCX | Given valid fixture files, When upload each, Then parser extracts text, summary/generation completes; unsupported/oversize file errors | user + fixtures; 1440/390 | upload request; content type; generated result; no DB | temp files | Playwright `core/report-generator.spec.ts` | live-integration | covered |
| QA-GEN-003 | sanitize/validation | Given HTML/script, empty, oversized or malformed input, When generate, Then sanitize removes executable markup and validation returns user-visible error without unsafe HTML | payload fixtures; 1440 | response has no `<script>`; 4xx for invalid; no DB | none | Playwright `core/report-generator.spec.ts` | deterministic | covered |
| QA-GEN-004 | print/export | Given generated result, When print button, Then print media window/dialog invoked with result only | generated fixture; 1440 | `window.print`/print preview call; no mutation | close print | Playwright `core/report-generator.spec.ts` | visual | covered |
| QA-NOTIFY-001 | 설정 저장 | Given `/notifications`, When enable/disable morning/evening/weekly settings, Then preference row upsert and switch state persists after reload | user; 1440/390 | notification preference API/DB upsert; UI state | delete prefs | Playwright `account/account.spec.ts` | live-integration | covered |
| QA-NOTIFY-002 | 이력/읽음 | Given unread/read notifications, When history loads and notification clicked/read-all, Then unread badge/count and DB `read_at` update | seeded notifications; 1440 | list; update 2xx; count decreases | delete notifications | Playwright `account/account.spec.ts` | live-integration | covered |
| QA-NOTIFY-003 | 브라우저 권한/offline | Given permission default/denied and offline, When enable/test notification or retry, Then permission prompt/denied explanation and OfflineIndicator retry are accessible | browser context permissions; 390 | Notification.permission branch; no crash; retry event | close context | Playwright `account/account.spec.ts` | visual | covered |
| QA-PROFILE-001 | 프로필 업데이트 | Given logged-in profile, When name/email fields changed and save, Then profile update succeeds, values persist, success feedback; invalid input blocked | user; 1440/390 | profile update 2xx; DB exact; URL `/profile` | restore profile | Playwright `account/account.spec.ts` | live-integration | covered |
| QA-ADMIN-001 | 관리자 게이트 | Given user and admin sessions, When `/admin`, Then user redirects/fallback; admin sees analytics tabs | seeded roles; 1440 | URL/403 for user; admin API 2xx; no user data leak | restore roles | Playwright `account/admin.spec.ts` | live-integration | covered |
| QA-ADMIN-002 | analytics/reports | Given admin data, When analytics and reports tabs, Then cards (users/reports/today/week), table/detail modal, filters render | seeded users/reports; 1440 | admin reads; counts match DB; URL unchanged | delete seeds | Playwright `account/admin.spec.ts` | live-integration | covered |
| QA-ADMIN-003 | report delete | Given admin report row, When confirm delete, Then row disappears and DB delete; cancel leaves it | admin + report; 1440 | delete 2xx only after confirmation | delete row | Playwright `account/admin.spec.ts` | live-integration | covered |
| QA-ADMIN-004 | users/role/delete | Given admin user list, When role update or delete user, Then API/DB update reflected, self-delete/unauthorized blocked | admin + disposable user; 1440 | update/delete response; role label; audit if present | restore/delete user | Playwright `account/admin.spec.ts` | live-integration | covered |
| QA-ADMIN-005 | AI summary | Given admin AI panel and report context, When ask summary, Then loading→answer or bounded error; request contains authorized context only | admin; 1440 | `/api/groq` 2xx/error; no secret/client leak | clear panel | Playwright `account/admin.spec.ts` | live-integration | covered |
| QA-AIPM-001 | dashboard list/stats | Given member/admin, When `/ai-pm`, Then project cards, member/document/completion stats and empty state are correct | seed projects/members/docs; 1440/390 | `/api/ai-pm/projects` 2xx; scoped rows; URL | delete projects | Playwright `ai-pm-complete-workflow.spec.ts` | live-integration | covered |
| QA-AIPM-002 | create/delete API lifecycle | Given admin, When the project API creates a valid project and the project API deletes it, Then the created project id is returned and the delete succeeds; settings UI remains an explicit not-implemented surface | admin + unique name; API request context | POST/DELETE `/api/ai-pm/projects` 2xx; returned project id matches the created route | delete project | Playwright `ai-pm-complete-workflow.spec.ts` | live-integration | covered |
| QA-AIPM-003 | project API error | Given network/404/403, When dashboard/detail loads, Then Korean error/access-denied with back-to-dashboard, no uncaught error | route interception; 390 | expected 4xx; UI fallback; no mutation | unroute | Playwright `ai-pm-ai-integration.spec.ts` | deterministic | covered |
| QA-AIPM-004 | overview/collab | Given member project with activities, When overview/collaboration tabs, Then counts/progress/activity names render and refresh | seed project/activity; 1440 | project GET + activities; DB unchanged | delete project | Playwright `ai-pm-collaboration.spec.ts` | visual | covered |
| QA-AIPM-005 | member search/CRUD authorization | Given an admin project, When an authenticated admin searches, adds, updates, and removes a member, Then each implemented member API operation returns the expected member/role result; project members may read the list, outsiders and non-managers receive 403 for denied operations | admin + disposable users; API request contexts | `/users/search` and member GET/POST/PUT/DELETE responses; exact member/role result; 403 authorization checks | remove members/delete project | Playwright `ai-pm-access-control.spec.ts` | live-integration | covered |
| QA-AIPM-006 | settings | Given project owner/admin, When settings open, Then the UI explicitly reports that project settings edit/delete is not implemented; no mutation control or request is expected | seed project; 1440 | implementation notice is visible; no project PUT/DELETE mutation is covered | delete project | Playwright `ai-pm-complete-workflow.spec.ts` | deterministic | covered |
| QA-WF-001 | 1 Discovery | Given member project, When `/workflow/1` loads and sidebar click, Then Discovery guide/editor and current progress show | seed project; 1440/390 | GET project/docs; URL step=1 | delete project/docs | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-002 | 2 Research | Given step 1 context, When step 2 selected, Then Research label/guide and only allowed navigation render | seed docs; 1440 | URL `/workflow/2`; step nav | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-003 | 3 Requirements | Given project, When step 3, Then Requirements guide/editor and progress state render | seed; 1440/390 | GET docs; URL | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-004 | 4 Information architecture | Given project, When step 4, Then IA guide/editor and role-approval affordance render | seed; 1440 | URL; role labels; no unauthorized approve | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-005 | 5 Interaction design | Given project, When step 5, Then interaction-design guide/editor render with developer approval rule | seed; 1440 | URL/UI; no mutation | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-006 | 6 Visual design | Given project, When step 6, Then visual-design guide/editor render responsively | seed; 390/1440 | URL; no horizontal overflow | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-007 | 7 Implementation plan | Given project, When step 7, Then implementation-plan status/progress render | seed; 1440 | URL; docs GET | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-008 | 8 Review | Given project, When step 8, Then review guide and approval actions respect service-planning role | seed; 1440 | UI; unauthorized action hidden/403 | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | live-integration | covered |
| QA-WF-009 | 9 Delivery | Given project, When step 9, Then delivery is reachable, next-step disabled, progress 9/9 semantics correct | seed; 390/1440 | URL; no step 10 navigation | cleanup | Playwright `ai-pm-complete-workflow.spec.ts` | visual | covered |
| QA-WF-010 | step guard | Given member at step N, When future step or invalid 0/10 URL, Then guard denies/redirects safely; previous allowed step remains reachable | seed project; 1440 | URL fallback; API 400/403; no DB | delete project | Playwright `ai-pm-access-control.spec.ts` | deterministic | covered |
| QA-DOC-001 | create/select/edit/save | Given step workspace, When AI generate or select doc, edit title/content and save, Then editor reflects content and one version is recorded | member project; 1440 | generate/doc PUT 2xx; `planning_documents` + version row exact | delete docs/project | Playwright `ai-pm-complete-workflow.spec.ts` | live-integration | covered |
| QA-DOC-002 | delete | Given selected private doc, When delete confirm, Then editor clears, manager refreshes and DB row is gone; cancel no mutation | member; 1440/390 | DELETE 2xx; no row | delete project | Playwright `ai-pm-collaboration.spec.ts` | live-integration | covered |
| QA-DOC-003 | version/history API | Given a document edited twice, When the versions API is read by an authorized admin, Then versions 1/2/3 contain the exact initial and edited content for that document; an outsider receives 403 | seed doc and two API edits; API request contexts | versions GET; exact version/document/content tuples; outsider denial; DB read otherwise | delete project/docs | Playwright `ai-pm-access-control.spec.ts` | live-integration | covered |
| QA-DOC-004 | status/request approval | Given private doc, When the request-approval endpoint is called, Then POST succeeds, status becomes pending approval, and the approval history records requested | seeded private document; authenticated admin; service-role DB access | POST `/api/ai-pm/documents/:id/request-approval` 200; `planning_documents.status=pending_approval`; `document_approval_history` has `requested` transition; no notification row is required by the current RPC/route contract | delete docs/project (including approval history cascade) | Playwright `ai-pm-complete-workflow.spec.ts` (endpoint + service-role DB assertions) | live-integration | covered |
| QA-DOC-005 | request/approve/withdraw API transitions | Given private documents and authorized/unauthorized project roles, When request, approve, or withdraw is called, Then the implemented request/approve/withdraw endpoints update status as supported, request/approve history is exact, unauthorized approval is 403, and repeated transitions return bounded 400 errors; reject endpoint and viewport/UI claims are not part of this API-only contract | role matrix; API request contexts | endpoint 2xx/403/400; DB status/history exact for request and approve; no reject route is claimed | delete project/docs | Playwright `ai-pm-access-control.spec.ts` | live-integration | covered |
| QA-DOC-006 | conflict analysis | Given official docs with conflicting terms, When check conflicts, Then panel severity/conflict/suggestions render; API error has retry | seed docs; 1440 | analyze-conflicts 2xx; panel testids; no mutation | delete docs | Playwright `ai-pm-ai-integration.spec.ts` | live-integration | covered |
| QA-DOC-007 | concurrent edit/conflict | Given two sessions editing same doc, When save concurrently, Then lock/conflict warning and deterministic last-write/conflict response; no silent data loss | two browser contexts; 1440 | PUT 409 or documented merge; DB content/version auditable | delete project | Playwright `ai-pm-collaboration.spec.ts` | live-integration | covered |
| QA-CHAT-001 | chat send/history | Given workflow member, When send message twice and reload/history panel, Then user+assistant messages and step summary persist | seeded project; 1440 | chat POST/history 2xx; `ai_conversations` rows | delete conversations/project | Playwright `ai-pm-ai-integration.spec.ts` | live-integration | covered |
| QA-CHAT-002 | streaming | Given stream-capable provider, When send long prompt, Then typing indicator appears, SSE chunks append, final response is complete | provider fixture; 1440 | `/api/ai-pm/chat/stream` event sequence; final DOM | delete conversations | Playwright `ai-pm-ai-integration.spec.ts` | live-integration | covered |
| QA-CHAT-003 | clear/export | Given history, When clear/export text or HTML, Then clear removes local/server history; export downloads expected content type | seed history; 1440/390 | DELETE/export 2xx; file artifact; DB state | delete history | Playwright `ai-pm-ai-integration.spec.ts` | live-integration | covered |
| QA-CHAT-004 | error/retry | Given chat route abort/timeout/provider error, When send/retry, Then error/timeout UI and retry recovers without duplicate user message | route interception; 1440 | bounded error, retry POST once; DB no duplicate | unroute/delete | Playwright `ai-pm-ai-integration.spec.ts` | deterministic | covered |
| QA-ERROR-001 | not-found/error boundary | Given 공개 또는 인증 경로에서 존재하지 않는 URL/의도적 test-error, When 로드, Then not-found 또는 error boundary UI와 복구 링크가 보이고 민감한 stack trace는 노출되지 않는다 | no seed; 1440/390 | status 404/500; `not-found`/`error` UI; no DB mutation | reload/close | Playwright `account/shell-error.spec.ts` | deterministic | covered |
| QA-SHELL-001 | theme | Given any public/auth route, When light/dark switch, Then body classes/colors and Ant/Tailwind surfaces update and persist after reload | user; 1440/390 | localStorage/theme state; no API | restore theme | Playwright `account/shell-error.spec.ts` | visual | covered |
| QA-SHELL-002 | sidebar/nav/logout | Given authenticated desktop, When each AppSidebar item and logout, Then selected key matches route and logout `/landing` | auth user; 1440 | URLs `/`, `/ai-pm`, `/my-reports`, `/report-generator`, `/notifications`, `/profile`, `/admin`; logout | signOut | Playwright `auth.spec.ts` | deterministic | covered |
| QA-SHELL-003 | mobile/responsive | Given 390×844, When open hamburger/drawer and workflow mobile sheet, Then focus trap/close works, no horizontal overflow, touch targets ≥44px | none + member project; 390 | screenshots/traces; no console error | close drawers | Playwright `account/shell-error.spec.ts` | visual | covered |
| QA-SHELL-004 | offline/recovery | Given network offline, When load/save/retry, Then OfflineIndicator/error state is visible, retry restores after network on, no duplicate writes | route/context offline; 390/1440 | failed request then one retry; DB at most one mutation | restore network | Playwright `account/shell-error.spec.ts` | deterministic | covered |
| QA-SHELL-005 | accessibility | Given the public login form, When keyboard focus traverses its controls, Then the email/password labels, login role, focus progression, submit focus exposure, and signup link are observable without an unlabeled input | `/login`; keyboard; 1440 default viewport | labeled email/password controls; login button; non-empty focused control after tabbing; zero unlabeled inputs; signup link href | none | Playwright `account/shell-error.spec.ts` | deterministic | covered |

## 4. 현재 E2E 매핑

현재 저장소의 Playwright spec은 아래처럼 72개 고유 QA ID를 참조한다. 표의 `covered`는 구현과 실행 가능한 매핑이 있다는 뜻이며, 통과 여부는 다음 절의 실행 기록에서만 판단한다. 과거 디버그 저널의 26개 테스트 관찰은 현재 계약을 대표하지 않으므로 사용하지 않는다.

| 파일 | 포함 테스트/매핑 | 판정 |
|---|---|---|
| `e2e/core/landing.spec.ts` | QA-LAND-001~003 | covered |
| `e2e/auth.spec.ts` | QA-AUTH-001~005, QA-RESET-001~002, QA-SHELL-002 | covered |
| `e2e/account/account.spec.ts` | QA-SIGN-001~003, QA-NOTIFY-001~003, QA-PROFILE-001 | covered |
| `e2e/core/reports-daily-weekly.spec.ts` | QA-REPORT-001~004, QA-WEEK-001~002 | covered |
| `e2e/core/my-reports.spec.ts` | QA-MY-001~007 | covered |
| `e2e/core/report-generator.spec.ts` | QA-GEN-001~004 | covered |
| `e2e/account/admin.spec.ts` | QA-ADMIN-001~005 | covered |
| `e2e/account/shell-error.spec.ts` | QA-ERROR-001, QA-SHELL-001, QA-SHELL-003~005 | covered |
| `e2e/ai-pm-complete-workflow.spec.ts` | QA-AIPM-001~002, QA-AIPM-006, QA-WF-001~009, QA-DOC-001/004 | covered |
| `e2e/ai-pm-collaboration.spec.ts` | QA-AIPM-004, QA-DOC-002/007 | covered |
| `e2e/ai-pm-access-control.spec.ts` | QA-AIPM-005, QA-WF-010, QA-DOC-003/005 | covered |
| `e2e/ai-pm-ai-integration.spec.ts` | QA-AIPM-003, QA-DOC-006, QA-CHAT-001~004 | covered |
| `e2e/workflow-sidebar-test.spec.ts` | QA-SHELL-003 mobile smoke | covered |
| `e2e/basic-test.spec.ts` | unlabelled landing/login smoke checks | covered |

The two unlabeled basic smoke tests and the second QA-SHELL-003 mobile smoke are included in the 75-test execution count but do not add QA IDs. They do not change the 72-ID ledger.

### 4.1 `src/app` 라우트 교차 점검

페이지 라우트는 다음과 같이 모두 인벤토리/시나리오에 연결한다. `layout`, `head`, `favicon`, `globals.css`, `ClientLayoutContent`는 별도 페이지가 아니라 SHELL 시나리오의 전역 계약으로 검증한다.

| 라우트 | 시나리오 연결 |
|---|---|
| `/`, `/landing` | QA-REPORT-001~004, QA-WEEK-001~002, QA-LAND-001~003 |
| `/login`, `/signup`, `/reset-password` callback | QA-AUTH-001~005, QA-RESET-001~002, QA-SIGN-001~003. `src/app/reset-password/page.tsx`가 공개 callback 화면을 제공한다. |
| `/profile`, `/notifications` | QA-PROFILE-001, QA-NOTIFY-001~003 |
| `/my-reports`, `/report-generator` | QA-MY-001~007, QA-GEN-001~004 |
| `/admin` | QA-ADMIN-001~005 |
| `/ai-pm`, `/ai-pm/[projectId]` | QA-AIPM-001~006 |
| `/ai-pm/[projectId]/workflow/[step]` (`step=1..9`) | QA-WF-001~010, QA-DOC-001~007, QA-CHAT-001~004 |
| `/not-found`, `/error`, `/test-error` | QA-AIPM-003, QA-SHELL-004, INV-ERROR smoke(신규) |

API route 계약도 UI 시나리오의 network/DB assertion으로 모두 커버한다.

| API 그룹 | 엔드포인트 | 대표 시나리오 |
|---|---|---|
| Auth/AI 기본 | `/api/auth/check-email`, `/api/groq`, `/api/report/summarize`, `/api/report/generateHtml` | QA-SIGN-001~002, QA-REPORT-002, QA-ADMIN-005, QA-GEN-001~003 |
| AI-PM projects | `/api/ai-pm/projects`, `/api/ai-pm/projects/[projectId]`, `/members`, `/activities`, `/users/search` | QA-AIPM-001~006, QA-AUTH-001, QA-ADMIN-001 |
| AI-PM documents | `/documents`, `/generate`, `/[documentId]`, `/versions`, `/approval-history`, `/request-approval`, `/approve`, `/withdraw-approval`, `/pending-approvals`, `/analyze-conflicts` | QA-DOC-001~007, QA-WF-001~010 |
| AI-PM chat | `/api/ai-pm/chat`, `/chat/stream`, `/chat/history`, `/chat/export` | QA-CHAT-001~004 |

API route 파일의 `._*`는 macOS 메타데이터이며 실행 라우트가 아니므로 별도 시나리오를 만들지 않는다.

## 5. 실행 순서와 격리 규칙

1. **결정적 smoke**: LAND/AUTH/SIGN/REPORT 입력 검증/SHELL 키보드·라우팅을 mock 없이 먼저 실행한다.
2. **인증 통합**: Supabase test project에서 RESET, profile, daily/weekly, my-reports, notifications를 순서대로 실행한다.
3. **관리자/AI-PM 통합**: admin 프로젝트 seed→멤버→workflow 1..9→문서 lifecycle/approval→chat 순서로 실행한다. 병렬 실행 시 프로젝트 ID/사용자별 namespace를 분리한다.
4. **시각/모바일**: 390×844, 768×1024, 1440×900에서 랜딩·shell·AI-PM workflow를 실행하고 trace/screenshot을 남긴다.
5. **정리 확인**: 각 테스트 후 DB에서 생성 row, auth user, storage/file artifact, browser permission을 확인하고 삭제한다. 실패 시 cleanup을 재시도하되 다른 시나리오 데이터를 삭제하지 않는다.

금지 사항: 고정 sleep, 공유 이메일/프로젝트 이름, 실서비스 DB, 외부 URL redirect, 비밀값 로그 출력, 이전 테스트의 세션/쿠키 재사용.

## 6. 증거 아티팩트와 통과 게이트

### 6.1 최신 로컬 실행

2026-08-12 격리된 로컬 전체 실행(`npm run test:e2e:local`, Chromium)은 **75/75 tests passed**로 완료했다. 이 수치는 72개 고유 QA ID(일부 ID의 보조 smoke 포함)를 실행한 결과이며, 최신 Playwright 상태와 HTML 보고서는 각각 `test-results/.last-run.json` 및 `playwright-report/index.html`에서 확인한다. 이 문서는 로컬 실행만 기록하며 향후 CI 또는 Vercel 실행/배포 결과를 주장하지 않는다.

각 실행은 `artifacts/qa/<run-id>/<scenario-id>/`에 다음을 남긴다.

- `result.json`: scenario ID, git SHA, viewport, role, start/end, pass/fail, URL, HTTP status, DB assertion 요약.
- `trace.zip`/`screenshots/*.png`: visual tier 또는 실패 시 필수.
- `network.jsonl`: 기대한 API method/path/status와 민감값 제거 결과.
- `db-check.json`: row count/owner/status/version/cleanup 확인(토큰/비밀값 제외).
- `console.txt`: 오류/경고 및 접근성 결과.

통과 게이트: (a) 모든 deterministic 시나리오 pass, (b) live-integration은 API와 DB assertion 모두 pass, (c) visual은 세 viewport에서 핵심 화면/상태 screenshot과 overflow·focus 확인, (d) cleanup 후 orphan row/user/file 0, (e) flaky retry 없이 동일 결과. 하나라도 실패하면 릴리스 게이트는 fail이며 `blocked-env`는 환경/자격 증명 부재를 명시한 채 별도 승인 없이는 pass로 계산하지 않는다.

## 7. 환경 요구사항(비밀값 제외)

- Node/npm 버전은 `package.json`/CI와 일치, `npm ci` 완료.
- `npm run dev` 또는 Playwright webServer가 `http://localhost:3000`에서 실행.
- Supabase test project URL/anon key와 service-role key는 CI secret/env로 주입하며 문서·로그에 출력하지 않는다.
- Auth 이메일 확인/비밀번호 reset을 검증할 수 있는 격리된 mail sink 또는 Supabase test inbox.
- AI provider API key와 모델 endpoint는 test quota/rate limit을 갖고, live AI tier는 deterministic fixture fallback을 지원한다.
- Playwright Chromium, PDF/TXT/DOCX fixture, 인쇄 가능한 브라우저 컨텍스트.
- DB migration/seed(`database/test_schema.sql`, AI-PM seed 등) 적용 권한과 테스트 후 cleanup 권한.
- 모바일 viewport 에뮬레이션, `Notification` permission 제어, offline route interception, axe/접근성 검사 도구.

## 8. 문서 점검 명령

다음 명령은 문서 자체를 검증하는 read-only sanity check다.

```bash
test -s docs/qa-scenarios.md
rg -n '^\| QA-[A-Z0-9-]+ \|' docs/qa-scenarios.md
rg -o 'QA-[A-Z0-9-]+' docs/qa-scenarios.md | sort | uniq -d
rg -n '^\| INV-[A-Z0-9-]+ \|' docs/qa-scenarios.md
```

중복 ID 명령은 출력이 없어야 하며, inventory 각 행은 최소 하나의 동일 접두사 시나리오 ID로 매핑되어야 한다.
