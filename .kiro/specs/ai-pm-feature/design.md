# AI PM 기능 설계 문서

## 개요

AI PM 기능은 FunCommute 시스템에 통합되는 기획 관리 플랫폼으로, AIPM.md의 9단계 워크플로우를 기반으로 AI와 인간이 협업하여 체계적인 기획 문서를 생성하고 관리합니다. 이 시스템은 기존 FunCommute의 인증, 데이터베이스, AI 인프라를 활용하여 확장성과 일관성을 보장합니다.

## 아키텍처

### 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    FunCommute System                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15 + React 19)                          │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   AI PM Pages   │  │  Existing Pages │                  │
│  │  - Project List │  │  - Reports      │                  │
│  │  - Workflow UI  │  │  - Admin        │                  │
│  │  - Document Ed. │  │  - Notifications│                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Next.js API Routes)                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   AI PM APIs   │  │  Existing APIs  │                  │
│  │  - Project CRUD │  │  - GROQ         │                  │
│  │  - Document Mgmt│  │  - Reports      │                  │
│  │  - AI Chat      │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (Supabase PostgreSQL)                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   New Tables    │  │ Existing Tables │                  │
│  │  - projects     │  │ - user_profiles │                  │
│  │  - project_mem. │  │ - daily_reports │                  │
│  │  - planning_doc.│  │                 │                  │
│  │  - ai_convers.  │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   GROQ API      │  │   Supabase      │                  │
│  │  - AI Chat      │  │  - Auth         │                  │
│  │  - Document Gen │  │  - Storage      │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 플로우

```
User Input → AI Chat Interface → GROQ API → Document Generation
     ↓              ↓                ↓              ↓
Project Selection → Workflow Step → AI Response → Document Editor
     ↓              ↓                ↓              ↓
Permission Check → Document Save → Version Control → Approval Process
     ↓              ↓                ↓              ↓
Database Update → Notification → Official Status → Team Collaboration
```

## 컴포넌트 및 인터페이스

### 프론트엔드 컴포넌트 구조

```
src/app/ai-pm/
├── layout.tsx                    # AI PM 레이아웃
├── page.tsx                      # 프로젝트 목록 페이지
├── [projectId]/
│   ├── page.tsx                  # 프로젝트 대시보드
│   ├── workflow/
│   │   ├── [step]/page.tsx       # 워크플로우 단계별 페이지
│   │   └── components/
│   │       ├── WorkflowSidebar.tsx
│   │       ├── DocumentEditor.tsx
│   │       ├── AIChatPanel.tsx
│   │       └── ConflictAnalyzer.tsx
│   ├── members/page.tsx          # 프로젝트 멤버 관리
│   └── documents/page.tsx        # 문서 히스토리
└── components/
    ├── ProjectCard.tsx
    ├── MemberRoleSelector.tsx
    ├── DocumentStatusBadge.tsx
    └── ApprovalWorkflow.tsx
```

### 주요 컴포넌트 인터페이스

#### WorkflowInterface
```typescript
interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  prompt: string;
  status: 'not_started' | 'in_progress' | 'draft' | 'official';
  assignedRole?: string;
}

interface WorkflowProps {
  projectId: string;
  currentStep: number;
  steps: WorkflowStep[];
  onStepChange: (step: number) => void;
}
```

#### DocumentEditor
```typescript
interface DocumentEditorProps {
  projectId: string;
  stepId: number;
  initialContent?: string;
  isReadOnly: boolean;
  onSave: (content: string) => Promise<void>;
  onRequestApproval: () => Promise<void>;
}
```

#### AIChatPanel
```typescript
interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  projectId: string;
  stepId: number;
  messages: AIChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onGenerateDocument: () => Promise<void>;
}
```

## 데이터 모델

### 새로운 데이터베이스 테이블

#### projects
```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### project_members
```sql
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('콘텐츠기획', '서비스기획', 'UIUX기획', '개발자')),
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

#### planning_documents
```sql
CREATE TABLE planning_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workflow_step INTEGER NOT NULL CHECK (workflow_step BETWEEN 1 AND 9),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'private' CHECK (status IN ('private', 'pending_approval', 'official')),
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);
```

#### document_versions
```sql
CREATE TABLE document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES planning_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ai_conversations
```sql
CREATE TABLE ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workflow_step INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS 정책

```sql
-- projects 테이블
CREATE POLICY "Users can view projects they are members of" ON projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = projects.id
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- project_members 테이블
CREATE POLICY "Project members can view other members" ON project_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members pm WHERE pm.project_id = project_members.project_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- planning_documents 테이블
CREATE POLICY "Users can view official documents and their own private documents" ON planning_documents
  FOR SELECT USING (
    (status = 'official' AND auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = planning_documents.project_id
    )) OR
    (created_by = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 에러 처리

### 에러 타입 정의

```typescript
enum AIpmErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  INVALID_WORKFLOW_STEP = 'INVALID_WORKFLOW_STEP'
}

interface AIpmError {
  type: AIpmErrorType;
  message: string;
  details?: any;
}
```

### 에러 처리 전략

1. **클라이언트 사이드 에러**
   - Toast 알림으로 사용자 친화적 메시지 표시
   - 폼 검증 에러는 인라인으로 표시
   - 네트워크 에러 시 재시도 옵션 제공

2. **서버 사이드 에러**
   - 구조화된 에러 응답 반환
   - 로깅 시스템으로 에러 추적
   - 민감한 정보 노출 방지

3. **AI 서비스 에러**
   - GROQ API 장애 시 대체 메시지 제공
   - 타임아웃 설정 및 재시도 로직
   - 사용자에게 임시 저장 옵션 제공

## 테스팅 전략

### 단위 테스트
- 컴포넌트별 렌더링 테스트
- API 엔드포인트 기능 테스트
- 데이터베이스 쿼리 테스트
- AI 프롬프트 생성 로직 테스트

### 통합 테스트
- 워크플로우 전체 흐름 테스트
- 권한 시스템 테스트
- 문서 승인 프로세스 테스트
- AI 대화 및 문서 생성 테스트

### E2E 테스트 (Playwright)
```typescript
// 예시: 프로젝트 생성부터 문서 승인까지 전체 플로우
test('Complete workflow from project creation to document approval', async ({ page }) => {
  // 관리자 로그인
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'admin@test.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');

  // 프로젝트 생성
  await page.goto('/ai-pm');
  await page.click('[data-testid=create-project]');
  await page.fill('[data-testid=project-name]', 'Test Platform');
  await page.click('[data-testid=save-project]');

  // 멤버 추가
  await page.click('[data-testid=add-member]');
  await page.selectOption('[data-testid=member-role]', '콘텐츠기획');
  await page.click('[data-testid=confirm-member]');

  // 워크플로우 1단계 진행
  await page.click('[data-testid=workflow-step-1]');
  await page.fill('[data-testid=ai-chat-input]', '전자책 플랫폼을 기획하고 싶습니다');
  await page.click('[data-testid=send-message]');
  
  // AI 응답 대기 및 문서 생성
  await page.waitForSelector('[data-testid=ai-response]');
  await page.click('[data-testid=generate-document]');
  
  // 문서 편집 및 승인 요청
  await page.fill('[data-testid=document-editor]', 'Updated content');
  await page.click('[data-testid=request-approval]');
  
  // 승인 프로세스 확인
  await expect(page.locator('[data-testid=document-status]')).toContainText('승인 대기');
});
```

### 성능 테스트
- AI API 응답 시간 모니터링
- 대용량 문서 처리 성능 테스트
- 동시 사용자 접속 테스트
- 데이터베이스 쿼리 최적화 검증

## 보안 고려사항

### 데이터 보안
- 모든 민감한 데이터는 암호화 저장
- API 키는 환경 변수로 관리
- 사용자 입력 데이터 검증 및 sanitization

### 접근 제어
- JWT 토큰 기반 인증 유지
- RLS 정책으로 데이터 접근 제한
- 역할 기반 권한 관리

### AI 보안
- AI 프롬프트 인젝션 방지
- 생성된 콘텐츠 검증
- 민감한 정보 AI 전송 방지

## 성능 최적화

### 프론트엔드 최적화
- React.memo를 활용한 컴포넌트 최적화
- 코드 스플리팅으로 번들 크기 최적화
- 이미지 및 정적 자원 최적화

### 백엔드 최적화
- 데이터베이스 인덱스 최적화
- API 응답 캐싱
- 페이지네이션 구현

### AI 서비스 최적화
- 프롬프트 최적화로 응답 시간 단축
- 스트리밍 응답으로 사용자 경험 개선
- 캐싱을 통한 중복 요청 방지