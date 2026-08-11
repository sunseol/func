# FunCommute 제품 QA 시나리오 기준서

> 작성 기준: `src/app/**` 라우트, `src/components/**` 내 사용자 표면, `src/contexts/**` 가드/네비게이션, `src/app/api/**` 계약, 현재 `e2e/*.spec.ts`를 교차 확인했다. 이 문서는 E2E 구현 전에 사용하는 요구사항 원장이다. 상태는 실행 결과가 아니라 코드/스펙 매핑 상태이며, 실행 결과를 추정하지 않는다.

## 1. 공통 계약

### 1.1 인증 및 리다이렉트

- 보호 라우트에 비인증으로 접근하면 `/login?redirect=<safe internal path>`로 이동한다. `redirect`는 내부 경로(`/` 시작)만 허용하고 외부 URL/open redirect는 거부한다.
- 로그인 성공 후 `redirect`가 안전한 내부 경로이면 그 경로로 이동하고, 없거나 유효하지 않으면 `/`로 이동한다.
- 인증된 사용자가 `/login`에 접근하면 요청된 안전 경로 또는 `/`로 이동한다.
- 로그아웃은 `/landing`으로 이동하고 세션 쿠키/토큰을 제거한다.
- `/landing`, `/signup`, `/login`(로그인 폼), 비밀번호 재설정 공개 화면은 비인증 상태에서도 접근 가능해야 한다.
- 현재 구현의 `login/page.tsx`는 로그인 성공 시 `/`로 push하고, `AuthContext`/`RouteGuard`는 `/landing`과 `/login?redirect=` 패턴을 사용하므로 위 계약을 E2E에서 고정하고 불일치는 결함으로 기록한다.

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
| INV-LAND | 랜딩 헤더/푸터, Hero, Problem, Features, Solution, Social proof, Pricing, FAQ, Final CTA 및 CTA/앵커 내비게이션 (`/landing`) | 공개 | `src/app/landing/**` | missing (광고 카피는 아래 참고) |
| INV-AUTH | 로그인/로그아웃/세션 만료/보호 라우트 redirect (`/login`, `/`, `AppSidebar`) | 공개→인증 | `login/page.tsx`, `AuthContext.tsx`, `RouteGuard.tsx` | missing |
| INV-RESET | 로그인 화면 비밀번호 재설정 메일 요청 및 reset callback 공개 접근 | 공개 | `login/page.tsx` | missing |
| INV-SIGNUP | 회원가입, 이메일 중복 확인, 확인 메일/재전송, 폼 검증 (`/signup`) | 공개 | `signup/page.tsx`, `/api/auth/check-email` | missing |
| INV-DAILY | 일일 출근/퇴근 보고서 입력, 기본 미리보기, AI 생성, 편집 저장 (`/`) | 인증 사용자 | `page.tsx`, `InputForm`, `ResultDisplay` | missing |
| INV-WEEKLY | 주간 보고서 초안/AI 생성/기본 미리보기/저장 (`/`, weekly tab) | 인증 사용자 | `WeeklyReportForm`, `page.tsx` | missing |
| INV-MYLIST | 내 보고서 목록/로딩/빈 상태/검색/날짜·유형 필터/행 확장 (`/my-reports`) | 인증 사용자 | `my-reports/page.tsx` | missing |
| INV-MYCRUD | 과거 수동 추가, 편집, 복사, 삭제 및 DB 반영 (`/my-reports`) | 인증 사용자(소유자) | `my-reports/page.tsx` | missing |
| INV-GEN | 리포트 생성기 텍스트/파일 입력, PDF·TXT·DOCX 파싱, 검증, 요약/생성, sanitize, print (`/report-generator`) | 인증 사용자 | `report-generator/page.tsx`, `/api/report/*` | missing |
| INV-NOTIFY | 알림 설정, 알림 이력, 읽음 처리, 브라우저 권한/테스트 알림 (`/notifications`) | 인증 사용자 | `notifications/page.tsx`, `NotificationSettings` | missing |
| INV-PROFILE | 이름/프로필 업데이트 및 저장 피드백 (`/profile`) | 인증 사용자 | `profile/page.tsx` | missing |
| INV-ADMIN-GATE | 관리자 게이트와 비관리자 fallback (`/admin`) | admin만 | `admin/page.tsx` | missing |
| INV-ADMIN-ANALYTICS | 통계 카드/analytics(사용자·보고서·오늘·주간) | admin | `admin/page.tsx` | missing |
| INV-ADMIN-REPORTS | 전체 보고서 탭, 상세, 삭제 | admin | `admin/page.tsx` | missing |
| INV-ADMIN-USERS | 사용자 목록, 역할 변경, 사용자 삭제 | admin | `admin/page.tsx` | missing |
| INV-ADMIN-AI | 관리자 AI 요약/질의 패널 | admin | `AdminAIAssistant`, `admin/page.tsx`, `/api/groq` | missing |
| INV-AIPM-DASH | AI-PM 프로젝트 목록/검색·통계·빈 상태/권한별 노출 (`/ai-pm`) | 인증; admin만 생성 | `ai-pm/page.tsx`, `ProjectCard` | missing |
| INV-AIPM-PROJECT | 프로젝트 생성/삭제/오류 및 프로젝트 개요 (`/ai-pm/[projectId]`) | admin 또는 멤버 | project page, `/api/ai-pm/projects*` | missing |
| INV-AIPM-COLLAB | 활동 피드/협업 현황 | 멤버; admin 전체 | project page, activities API | missing |
| INV-AIPM-MEMBER | 멤버 추가/역할 변경/삭제 및 역할 표시 | admin/프로젝트 관리자 | `MemberManagement` | missing |
| INV-AIPM-SETTINGS | 프로젝트 설정 탭(이름/설명/삭제 경계) | admin/프로젝트 관리자 | project page | missing |
| INV-WORKFLOW | 9단계 사이드바/진행률/가이드/단계 라우팅 (`/ai-pm/[id]/workflow/[1..9]`) | 멤버 | `WorkflowSidebar`, `WorkflowProgress`, `WorkflowGuide`, `types/ai-pm.ts` | missing |
| INV-DOC-LIFECYCLE | 문서 생성(AI)/선택/편집/저장/삭제/버전·이력/상태 전이 | 멤버; 승인 역할별 | `DocumentEditor`, `DocumentManager`, document APIs | missing |
| INV-DOC-APPROVAL | 요청/승인/거절/철회 및 pending approvals | 작성자/승인 역할/admin | document status APIs | missing |
| INV-DOC-CONFLICT | 공식 문서 간 충돌 분석/제안 | 멤버 | `ConflictAnalysisPanel`, analyze-conflicts API | missing |
| INV-AICHAT | AI 채팅 히스토리/stream/export/clear/error/retry | 멤버 | `AIChatPanel`, `ConversationHistoryPanel`, chat APIs | missing |
| INV-SHELL | 테마, 전역 사이드바/모바일 drawer, 반응형, 오프라인 indicator, a11y/focus | 해당 라우트 권한 | `ThemeProvider`, `AppSidebar`, `OfflineIndicator`, UI components | missing |
| INV-ERROR | not-found/error boundary 및 개발용 test-error 화면 | 공개/해당 세션 | `src/app/not-found.tsx`, `error.tsx`, `test-error/page.tsx` | missing |

### 2.1 랜딩 카피와 실행 기능의 경계

Pricing/FAQ/Features 섹션이 약속하는 유료 플랜, 전용 지원, 고급 분석 등은 현재 라우트/핸들러로 확인되지 않는다. 이런 광고 문구는 **product-copy gap**으로 기록하며 실행 가능한 feature/통과 기준으로 만들지 않는다. CTA가 실제로 연결하는 `/login` 또는 `/signup`, 앵커 스크롤만 E2E 대상이다.

## 3. 시나리오 원장

열 순서: `ID | 기능/경로·역할 | Given / When / Then | seed·viewport | 기대 URL/UI·network/DB | cleanup | 자동화 매핑 | tier | status`.

| ID | 기능/경로·역할 | Given / When / Then | seed·viewport | 기대 URL/UI·network/DB | cleanup | 자동화 매핑 | tier | status |
|---|---|---|---|---|---|---|---|---|
| QA-LAND-001 | 랜딩 섹션 | Given 비인증, When `/landing` 로드, Then 헤더·Hero·Problem·Features·Solution·Social proof·Pricing·FAQ·Final CTA·푸터가 순서와 앵커로 보인다 | 없음; 1440, 390 | URL `/landing`; 각 section landmark/heading; API 오류 없음; DB 변화 없음 | context 종료 | 신규 Playwright landing.spec | visual | missing |
| QA-LAND-002 | 랜딩 CTA/내비 | Given landing, When Header 보고서 작성/로그인 및 CTA 클릭, Then 안전한 `/login` 또는 `/signup`으로 이동하고 모바일 메뉴도 같은 링크를 제공 | 없음; 1440/390 | URL; click trace; 외부 URL 없음 | 없음 | 신규 | deterministic | missing |
| QA-LAND-003 | FAQ/가격 카피 경계 | Given landing, When FAQ/가격 토글, Then 카피는 노출되나 미구현 약속은 API 호출/DB 쓰기 없이 product-copy gap으로 태깅 | 없음; 1440 | UI 토글; network 0 mutation | 없음 | 신규 visual | visual | missing |
| QA-AUTH-001 | 보호 라우트 redirect | Given 로그아웃, When `/`, `/my-reports`, `/report-generator`, `/notifications`, `/profile`, `/admin`, `/ai-pm` 직접 접근, Then 각 요청이 `/login?redirect=<encoded-safe-path>`로 간다 | 없음; 1440 | URL query 정확성; login form; API 401/redirect; DB 변화 없음 | 쿠키 삭제 | 신규 auth.spec | deterministic | missing |
| QA-AUTH-002 | 로그인 성공 redirect | Given 테스트 사용자와 `redirect=/my-reports`, When 유효 자격 증명 제출, Then `/my-reports`로 이동하고 세션이 설정된다 | seed auth user; 1440/390 | URL; `/auth/v1/token` 2xx; user session cookie; DB read only | signOut | 신규 | live-integration | missing |
| QA-AUTH-003 | 로그인 오류/검증 | Given 빈/잘못된 email·password, When 제출, Then 필드 오류 또는 한국어 오류 Alert가 표시되고 URL/DB는 유지된다 | 없음; 1440 | no successful auth call for client validation; no DB mutation | 폼 reset | 신규 | deterministic | missing |
| QA-AUTH-004 | 인증 사용자 `/login` | Given 로그인 세션, When `/login` 접근(redirect 없음/안전 redirect), Then `/` 또는 안전 경로로 이동 | seed auth; 1440 | URL; protected UI visible | signOut | 신규 | deterministic | missing |
| QA-AUTH-005 | 로그아웃/세션 만료 | Given 로그인 및 protected page, When 로그아웃 또는 쿠키 삭제 후 새 protected URL, Then 로그아웃은 `/landing`, 만료 접근은 login redirect, 뒤로가기로 보호 UI를 복구하지 못한다 | seed auth; 1440/390 | URL; auth session revoked; API 401 | clear cookies | `ai-pm-access-control.spec.ts` Session management (stale redirect expectation) | live-integration | existing-stale |
| QA-RESET-001 | 비밀번호 재설정 요청 | Given 공개 login에서 유효 email 입력, When “비밀번호를 잊으셨나요?” 클릭, Then reset API가 redirectTo `/reset-password`로 호출되고 성공/실패 Alert가 보인다 | auth email; 1440 | `/auth/v1/recover` request; success Alert; DB auth event | 이메일 토큰 폐기 | 신규 | live-integration | missing |
| QA-RESET-002 | reset 공개 접근 | Given 비인증, When `/reset-password` callback URL 접근, Then 공개 reset UI가 보이고 세션 없는 상태에서도 landing으로 튕기지 않는다 | reset token fixture; 390 | URL remains; no protected API | token cleanup | 신규 | live-integration | blocked-env |
| QA-SIGN-001 | 회원가입 성공/확인 | Given 새 email/fullName/password, When signup 제출, Then `/api/auth/check-email` false 후 signUp 2xx, 확인 메일 안내/폼 reset, 중복 DB row 없음 | unique seeded email; 1440/390 | network check-email + auth signup; user row; confirmation message | delete auth user | 신규 | live-integration | missing |
| QA-SIGN-002 | 중복 이메일 | Given 기존 email, When signup 제출, Then “이미 가입된 이메일” 오류, signUp 중복 호출 없이 로그인 링크 유지 | existing auth user; 1440 | check-email exists=true or duplicate error; no extra profile | 없음 | 신규 | live-integration | missing |
| QA-SIGN-003 | signup 검증/재전송 | Given 이름 공백/invalid email/짧은 password 또는 확인 메일 상태, When submit/resend, Then 필드 오류 또는 재전송 안내가 보인다 | 없음; 390 | no DB mutation on invalid; resend request on valid pending | delete fixture | 신규 | deterministic | missing |
| QA-REPORT-001 | 일일 출근 기본 미리보기 | Given 로그인, When `/`에서 이름·날짜·프로젝트 task 입력 후 출근 선택, Then 기본 preview에 입력이 반영되고 AI 버튼은 활성화된다 | user + `2026-08-11`; 1440 | URL `/`; DOM preview; no AI network before click | delete report if saved | 신규 | deterministic | missing |
| QA-REPORT-002 | 일일 퇴근 AI 생성 | Given valid evening content, When AI 보고서 생성, Then loading→generated text→success message, `/api/groq` 호출 및 오류 시 Alert | user; 1440 | fetch `/api/groq` 2xx; generated text; no DB until save | delete draft | 신규 | live-integration | missing |
| QA-REPORT-003 | 기본/AI 편집 저장 | Given preview, When edit result then 저장, Then `daily_reports` insert는 date/type/name/projects/misc/content를 저장하고 성공 알림 | user + valid date; 1440 | Supabase insert 2xx; row values exact; URL unchanged | delete inserted row | 신규 | live-integration | missing |
| QA-REPORT-004 | 저장 validation | Given missing name/date/content 또는 date not `YYYY-MM-DD`, When AI/save, Then disabled/error and no insert | invalid fixtures; 390 | no insert network/DB; Alert text | reset form | 신규 | deterministic | missing |
| QA-WEEK-001 | 주간 초안/기본 preview | Given 로그인, When weekly tab 선택 및 기간/업무 입력, Then weekly draft와 기본 preview가 보이고 reportType=weekly가 유지된다 | user; 1440/390 | URL `/`; DOM fields; no DB | reset | 신규 | deterministic | missing |
| QA-WEEK-002 | 주간 AI/저장 | Given weekly draft, When AI 생성 후 저장, Then `/api/groq` 또는 weekly helper 결과가 표시되고 weekly row가 저장된다 | user; 1440 | API 2xx; DB `report_type=weekly` | delete row | 신규 | live-integration | missing |
| QA-MY-001 | 목록/빈 상태 | Given 로그인 사용자(보고서 0개/여러 개), When `/my-reports` 로드, Then loading→empty 또는 list와 count가 보인다 | seeded own reports; 1440 | URL; select `daily_reports` scoped user_id; no cross-user rows | delete seeds | 신규 | live-integration | missing |
| QA-MY-002 | 검색/날짜·유형 필터 | Given ≥3 reports, When 검색어·날짜 범위·morning/evening 필터 조합, Then 일치 행만 보이고 reset은 전체 복원 | seed reports; 1440/390 | query state/UI; DB reads only | delete seeds | 신규 | deterministic | missing |
| QA-MY-003 | 행 확장/상세 | Given list row, When expand/collapse, Then report_content/projects/tasks가 표시되고 다른 row 상태는 보존 | seed report; 390 | DOM expanded panel; URL unchanged | delete | 신규 | visual | missing |
| QA-MY-004 | 수동 추가 | Given valid historical date/type/content, When “과거 보고서 수동 추가” submit, Then one row insert 및 list refresh | user; 1440 | Supabase insert 2xx; row owner/date exact | delete row | 신규 | live-integration | missing |
| QA-MY-005 | 편집 | Given own row, When edit content/date/type 저장, Then update 2xx and reopened row shows new values | own seed; 1440 | update DB exact; success toast | restore/delete | 신규 | live-integration | missing |
| QA-MY-006 | 복사 | Given own row, When copy modal new date submit, Then new row has copied data/new date and original unchanged | own seed; 1440/390 | insert one new row; original DB unchanged | delete copy/original | 신규 | live-integration | missing |
| QA-MY-007 | 삭제/권한 | Given own row and another user's row, When delete own then attempt other, Then confirmation/delete succeeds only own; other absent/403 | two users; 1440 | delete 2xx own; other delete denied; DB check | delete fixtures | 신규 | live-integration | missing |
| QA-GEN-001 | 텍스트 입력 | Given `/report-generator`, When text source 입력 후 generate, Then progress/result HTML appears and print action is available | user; 1440 | URL; `/api/report/summarize`, `/api/report/generateHtml` 2xx; no DB | none | 신규 | live-integration | missing |
| QA-GEN-002 | 파일 PDF/TXT/DOCX | Given valid fixture files, When upload each, Then parser extracts text, summary/generation completes; unsupported/oversize file errors | user + fixtures; 1440/390 | upload request; content type; generated result; no DB | temp files | 신규 | live-integration | missing |
| QA-GEN-003 | sanitize/validation | Given HTML/script, empty, oversized or malformed input, When generate, Then sanitize removes executable markup and validation returns user-visible error without unsafe HTML | payload fixtures; 1440 | response has no `<script>`; 4xx for invalid; no DB | none | 신규 | deterministic | missing |
| QA-GEN-004 | print/export | Given generated result, When print button, Then print media window/dialog invoked with result only | generated fixture; 1440 | `window.print`/print preview call; no mutation | close print | 신규 visual | missing |
| QA-NOTIFY-001 | 설정 저장 | Given `/notifications`, When enable/disable morning/evening/weekly settings, Then preference row upsert and switch state persists after reload | user; 1440/390 | notification preference API/DB upsert; UI state | delete prefs | 신규 | live-integration | missing |
| QA-NOTIFY-002 | 이력/읽음 | Given unread/read notifications, When history loads and notification clicked/read-all, Then unread badge/count and DB `read_at` update | seeded notifications; 1440 | list; update 2xx; count decreases | delete notifications | 신규 | live-integration | missing |
| QA-NOTIFY-003 | 브라우저 권한/offline | Given permission default/denied and offline, When enable/test notification or retry, Then permission prompt/denied explanation and OfflineIndicator retry are accessible | browser context permissions; 390 | Notification.permission branch; no crash; retry event | close context | 신규 | visual | missing |
| QA-PROFILE-001 | 프로필 업데이트 | Given logged-in profile, When name/email fields changed and save, Then profile update succeeds, values persist, success feedback; invalid input blocked | user; 1440/390 | profile update 2xx; DB exact; URL `/profile` | restore profile | 신규 | live-integration | missing |
| QA-ADMIN-001 | 관리자 게이트 | Given user and admin sessions, When `/admin`, Then user redirects/fallback; admin sees analytics tabs | seeded roles; 1440 | URL/403 for user; admin API 2xx; no user data leak | restore roles | 신규 | live-integration | missing |
| QA-ADMIN-002 | analytics/reports | Given admin data, When analytics and reports tabs, Then cards (users/reports/today/week), table/detail modal, filters render | seeded users/reports; 1440 | admin reads; counts match DB; URL unchanged | delete seeds | 신규 | live-integration | missing |
| QA-ADMIN-003 | report delete | Given admin report row, When confirm delete, Then row disappears and DB delete; cancel leaves it | admin + report; 1440 | delete 2xx only after confirmation | delete row | 신규 | live-integration | missing |
| QA-ADMIN-004 | users/role/delete | Given admin user list, When role update or delete user, Then API/DB update reflected, self-delete/unauthorized blocked | admin + disposable user; 1440 | update/delete response; role label; audit if present | restore/delete user | 신규 | live-integration | missing |
| QA-ADMIN-005 | AI summary | Given admin AI panel and report context, When ask summary, Then loading→answer or bounded error; request contains authorized context only | admin; 1440 | `/api/groq` 2xx/error; no secret/client leak | clear panel | live-integration | missing |
| QA-AIPM-001 | dashboard list/stats | Given member/admin, When `/ai-pm`, Then project cards, member/document/completion stats and empty state are correct | seed projects/members/docs; 1440/390 | `/api/ai-pm/projects` 2xx; scoped rows; URL | delete projects | live-integration | missing |
| QA-AIPM-002 | create/delete | Given admin, When create valid project then delete from settings, Then card/detail appears then disappears; non-admin create control absent | admin + unique name; 1440 | POST/DELETE projects 2xx; DB row lifecycle | delete project | `ai-pm-complete-workflow.spec.ts` create path (selectors need review) | live-integration | existing-stale |
| QA-AIPM-003 | project API error | Given network/404/403, When dashboard/detail loads, Then Korean error/access-denied with back-to-dashboard, no uncaught error | route interception; 390 | expected 4xx; UI fallback; no mutation | unroute | `workflow-sidebar-test.spec.ts` fake project (stale) | deterministic | existing-stale |
| QA-AIPM-004 | overview/collab | Given member project with activities, When overview/collaboration tabs, Then counts/progress/activity names render and refresh | seed project/activity; 1440 | project GET + activities; DB unchanged | delete project | `ai-pm-collaboration.spec.ts` multi-user (selectors review) | visual | existing-stale |
| QA-AIPM-005 | members/roles | Given admin project, When add/search member, change role, remove, Then member list and role label update; non-admin controls hidden | admin + disposable users; 1440/390 | members API 2xx; DB membership exact | remove members/delete project | `ai-pm-access-control.spec.ts` access/management | live-integration | existing-stale |
| QA-AIPM-006 | settings | Given project owner/admin, When settings open and valid/invalid edit/delete, Then update persists; destructive action requires confirmation | seed project; 1440 | project PUT/DELETE; DB exact; cancel no mutation | delete project | 신규 | live-integration | missing |
| QA-WF-001 | 1 Discovery | Given member project, When `/workflow/1` loads and sidebar click, Then Discovery guide/editor and current progress show | seed project; 1440/390 | GET project/docs; URL step=1 | delete project/docs | `ai-pm-complete-workflow.spec.ts` step 1 | visual | existing-stale |
| QA-WF-002 | 2 Research | Given step 1 context, When step 2 selected, Then Research label/guide and only allowed navigation render | seed docs; 1440 | URL `/workflow/2`; step nav | cleanup | complete-workflow step 2 | visual | existing-stale |
| QA-WF-003 | 3 Requirements | Given project, When step 3, Then Requirements guide/editor and progress state render | seed; 1440/390 | GET docs; URL | cleanup | 신규 | visual | missing |
| QA-WF-004 | 4 Information architecture | Given project, When step 4, Then IA guide/editor and role-approval affordance render | seed; 1440 | URL; role labels; no unauthorized approve | cleanup | 신규 | visual | missing |
| QA-WF-005 | 5 Interaction design | Given project, When step 5, Then interaction-design guide/editor render with developer approval rule | seed; 1440 | URL/UI; no mutation | cleanup | 신규 | visual | missing |
| QA-WF-006 | 6 Visual design | Given project, When step 6, Then visual-design guide/editor render responsively | seed; 390/1440 | URL; no horizontal overflow | cleanup | 신규 | visual | missing |
| QA-WF-007 | 7 Implementation plan | Given project, When step 7, Then implementation-plan status/progress render | seed; 1440 | URL; docs GET | cleanup | 신규 | visual | missing |
| QA-WF-008 | 8 Review | Given project, When step 8, Then review guide and approval actions respect service-planning role | seed; 1440 | UI; unauthorized action hidden/403 | cleanup | 신규 | live-integration | missing |
| QA-WF-009 | 9 Delivery | Given project, When step 9, Then delivery is reachable, next-step disabled, progress 9/9 semantics correct | seed; 390/1440 | URL; no step 10 navigation | cleanup | 신규 | visual | missing |
| QA-WF-010 | step guard | Given member at step N, When future step or invalid 0/10 URL, Then guard denies/redirects safely; previous allowed step remains reachable | seed project; 1440 | URL fallback; API 400/403; no DB | delete project | `ai-pm-access-control.spec.ts` workflow access (stale) | deterministic | existing-stale |
| QA-DOC-001 | create/select/edit/save | Given step workspace, When AI generate or select doc, edit title/content and save, Then editor reflects content and one version is recorded | member project; 1440 | generate/doc PUT 2xx; `planning_documents` + version row exact | delete docs/project | complete-workflow generation/edit | live-integration | existing-stale |
| QA-DOC-002 | delete | Given selected private doc, When delete confirm, Then editor clears, manager refreshes and DB row is gone; cancel no mutation | member; 1440/390 | DELETE 2xx; no row | delete project | 신규 | live-integration | missing |
| QA-DOC-003 | version/history | Given doc edited twice, When version history open and version selected, Then versions 1/2 and prior content show; outsider 403 | seed doc versions; 1440 | versions GET; exact content; DB read only | delete project/docs | `ai-pm-access-control.spec.ts` version (endpoint/URL stale) | live-integration | existing-stale |
| QA-DOC-004 | status/request approval | Given private doc, When request approval, Then pending status/pending-approval notification and approval history row appear | member; 1440 | POST request-approval 2xx; status pending | delete docs | complete-workflow approval | live-integration | existing-stale |
| QA-DOC-005 | approve/reject/withdraw | Given pending doc and authorized/unauthorized roles, When approve/reject/withdraw, Then allowed transition updates status/history; invalid transition returns bounded error | role matrix; 1440/390 | endpoint 2xx/403/409; DB status/history exact | delete project/docs | `ai-pm-access-control.spec.ts` role approval (stale labels) | live-integration | existing-stale |
| QA-DOC-006 | conflict analysis | Given official docs with conflicting terms, When check conflicts, Then panel severity/conflict/suggestions render; API error has retry | seed docs; 1440 | analyze-conflicts 2xx; panel testids; no mutation | delete docs | `ai-pm-ai-integration.spec.ts` conflict | live-integration | existing-stale |
| QA-DOC-007 | concurrent edit/conflict | Given two sessions editing same doc, When save concurrently, Then lock/conflict warning and deterministic last-write/conflict response; no silent data loss | two browser contexts; 1440 | PUT 409 or documented merge; DB content/version auditable | delete project | `ai-pm-collaboration.spec.ts` concurrent edit | live-integration | existing-stale |
| QA-CHAT-001 | chat send/history | Given workflow member, When send message twice and reload/history panel, Then user+assistant messages and step summary persist | seeded project; 1440 | chat POST/history 2xx; `ai_conversations` rows | delete conversations/project | `ai-pm-ai-integration.spec.ts` chat/history | live-integration | existing-stale |
| QA-CHAT-002 | streaming | Given stream-capable provider, When send long prompt, Then typing indicator appears, SSE chunks append, final response is complete | provider fixture; 1440 | `/api/ai-pm/chat/stream` event sequence; final DOM | delete conversations | `ai-pm-ai-integration.spec.ts` streaming | live-integration | existing-stale |
| QA-CHAT-003 | clear/export | Given history, When clear/export text or HTML, Then clear removes local/server history; export downloads expected content type | seed history; 1440/390 | DELETE/export 2xx; file artifact; DB state | delete history | 신규 | live-integration | missing |
| QA-CHAT-004 | error/retry | Given chat route abort/timeout/provider error, When send/retry, Then error/timeout UI and retry recovers without duplicate user message | route interception; 1440 | bounded error, retry POST once; DB no duplicate | unroute/delete | `ai-pm-ai-integration.spec.ts` error (timeout too slow) | deterministic | existing-stale |
| QA-ERROR-001 | not-found/error boundary | Given 공개 또는 인증 경로에서 존재하지 않는 URL/의도적 test-error, When 로드, Then not-found 또는 error boundary UI와 복구 링크가 보이고 민감한 stack trace는 노출되지 않는다 | no seed; 1440/390 | status 404/500; `not-found`/`error` UI; no DB mutation | reload/close | 신규 | deterministic | missing |
| QA-SHELL-001 | theme | Given any public/auth route, When light/dark switch, Then body classes/colors and Ant/Tailwind surfaces update and persist after reload | user; 1440/390 | localStorage/theme state; no API | restore theme | 신규 | visual | missing |
| QA-SHELL-002 | sidebar/nav/logout | Given authenticated desktop, When each AppSidebar item and logout, Then selected key matches route and logout `/landing` | auth user; 1440 | URLs `/`, `/ai-pm`, `/my-reports`, `/report-generator`, `/notifications`, `/profile`, `/admin`; logout | signOut | `basic-test.spec.ts` partial | deterministic | existing-stale |
| QA-SHELL-003 | mobile/responsive | Given 390×844, When open hamburger/drawer and workflow mobile sheet, Then focus trap/close works, no horizontal overflow, touch targets ≥44px | none + member project; 390 | screenshots/traces; no console error | close drawers | `workflow-sidebar-test.spec.ts` partial | visual | missing |
| QA-SHELL-004 | offline/recovery | Given network offline, When load/save/retry, Then OfflineIndicator/error state is visible, retry restores after network on, no duplicate writes | route/context offline; 390/1440 | failed request then one retry; DB at most one mutation | restore network | 신규 | deterministic | missing |
| QA-SHELL-005 | accessibility | Given keyboard/screen-reader emulation, When tab through forms, dialogs, menus and editor, Then labels/name/role, focus order, escape/enter and live alerts satisfy WCAG smoke checks | all public + key auth routes; 1440/390 | axe violations 0 for critical; focus screenshots | close dialogs | 신규 | visual | missing |

## 4. 기존 E2E 파일 및 stale 매핑

현재 저장소의 모든 E2E spec을 아래처럼 매핑한다. `existing-stale`은 coverage report의 26개 테스트 관찰(2026-08-11 debug journal)과 현재 코드의 불일치를 의미하며, 실행 통과를 뜻하지 않는다.

| 파일 | 포함 테스트/매핑 | 판정 |
|---|---|---|
| `e2e/basic-test.spec.ts` | homepage load→QA-LAND-001 일부, login page→QA-AUTH-001/003 일부 | existing-stale (landing이 `/`와 `/landing`으로 분리되고 보호 redirect 계약 미검증) |
| `e2e/ai-pm-access-control.spec.ts` | admin/user/non-member/API/session/role/version/bulk→QA-AIPM-005, QA-WF-010, QA-DOC-003~005, QA-AUTH-005 | existing-stale (old role labels, version URL, bulk UI 미구현) |
| `e2e/ai-pm-ai-integration.spec.ts` | chat/generation/conflict/stream/error/context/prompt/history/quality→QA-AIPM-003, QA-DOC-006, QA-CHAT-001~004 | existing-stale (영문 placeholder/testid와 provider 실계약 미확인) |
| `e2e/ai-pm-collaboration.spec.ts` | 다중 사용자/동시 편집/멤버 권한→QA-AIPM-004~005, QA-DOC-007 | existing-stale (활동/lock selector와 현재 컴포넌트 계약 재검증 필요) |
| `e2e/ai-pm-complete-workflow.spec.ts` | 프로젝트 생성부터 1·2단계 승인/버전/AI→QA-AIPM-002, QA-WF-001~002, QA-DOC-001/004/006 | existing-stale (가짜 프로젝트/old roles 및 selector drift) |
| `e2e/workflow-sidebar-test.spec.ts` | `test-project-123` 오류 smoke→QA-AIPM-003; missing completedSteps→QA-SHELL-003 | existing-stale (의도적 fake project이며 실제 접근/redirect 계약 아님) |

명시적 stale 목록:

1. **fake project**: `workflow-sidebar-test.spec.ts`의 `/ai-pm/test-project-123`는 seed 없는 ID다. 제품 기능의 성공 기준으로 사용하지 말고 QA-AIPM-003의 404/403 오류 시나리오로 격하한다.
2. **disabled new-doc button**: `DocumentManager`의 `새 문서 (준비 중)` 버튼은 disabled다. 현재 실행 가능한 생성 기능은 AI generate/문서 API이며, 이 버튼 클릭을 성공으로 기대하는 테스트를 만들지 않는다.
3. **missing bulk UI**: bulk-actions/select-all/bulk role/remove selector는 현재 컴포넌트에서 확인되지 않았다. `ai-pm-access-control.spec.ts` bulk 테스트는 `existing-stale`이며 기능 인벤토리에 실행 기능으로 포함하지 않는다.
4. **old roles/version UI**: 기존 E2E는 `콘텐츠기획`/`서비스기획`/`UIUX기획`, 일부 버전 endpoint/selector를 사용하지만 현재 canonical role은 `content_planning`, `service_planning`, `ux_planning`, `developer`이고 version API는 `/api/ai-pm/documents/[documentId]/versions`다. 역할/버전 테스트는 계약을 갱신한 뒤 재실행한다.
5. **coverage gap**: debug journal의 coverage report는 총 26개 테스트를 가리키며 landing, signup, daily/weekly, my-reports, report-generator, notifications, profile, admin, mobile route에 truthful E2E가 없다고 기록한다. 본 원장의 해당 IDs는 모두 `missing`이고 실행 결과를 추정하지 않는다.

### 4.1 `src/app` 라우트 교차 점검

페이지 라우트는 다음과 같이 모두 인벤토리/시나리오에 연결한다. `layout`, `head`, `favicon`, `globals.css`, `ClientLayoutContent`는 별도 페이지가 아니라 SHELL 시나리오의 전역 계약으로 검증한다.

| 라우트 | 시나리오 연결 |
|---|---|
| `/`, `/landing` | QA-REPORT-001~004, QA-WEEK-001~002, QA-LAND-001~003 |
| `/login`, `/signup`, `/reset-password` callback | QA-AUTH-001~005, QA-RESET-001~002, QA-SIGN-001~003. 현재 `src/app/reset-password` 페이지 파일은 없어 QA-RESET-002는 `blocked-env`/product gap으로 유지한다. |
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

1. **결정적 smoke**: QA-LAND/AUTH/SIGN/REPORT 입력 검증/SHELL 키보드·라우팅을 mock 없이 먼저 실행한다.
2. **인증 통합**: Supabase test project에서 RESET, profile, daily/weekly, my-reports, notifications를 순서대로 실행한다.
3. **관리자/AI-PM 통합**: admin 프로젝트 seed→멤버→workflow 1..9→문서 lifecycle/approval→chat 순서로 실행한다. 병렬 실행 시 프로젝트 ID/사용자별 namespace를 분리한다.
4. **시각/모바일**: 390×844, 768×1024, 1440×900에서 랜딩·shell·AI-PM workflow를 실행하고 trace/screenshot을 남긴다.
5. **정리 확인**: 각 테스트 후 DB에서 생성 row, auth user, storage/file artifact, browser permission을 확인하고 삭제한다. 실패 시 cleanup을 재시도하되 다른 시나리오 데이터를 삭제하지 않는다.

금지 사항: 고정 sleep, 공유 이메일/프로젝트 이름, 실서비스 DB, 외부 URL redirect, 비밀값 로그 출력, 이전 테스트의 세션/쿠키 재사용.

## 6. 증거 아티팩트와 통과 게이트

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
