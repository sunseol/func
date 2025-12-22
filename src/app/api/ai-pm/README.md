# AI PM API Documentation

이 문서는 AI PM 기능의 REST API 엔드포인트를 설명합니다.

## 인증

모든 API 엔드포인트는 Supabase 인증이 필요합니다. 요청 시 유효한 JWT 토큰이 쿠키에 포함되어야 합니다.

## 권한

- **일반 사용자**: 자신이 멤버로 참여한 프로젝트만 접근 가능
- **관리자**: 모든 프로젝트 접근 및 관리 가능

## API 엔드포인트

### 프로젝트 관리

#### GET /api/ai-pm/projects
사용자가 접근 가능한 프로젝트 목록을 조회합니다.

**권한**: 인증된 사용자

**응답**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "프로젝트명",
      "description": "프로젝트 설명",
      "created_by": "uuid",
      "created_at": "2025-01-28T00:00:00Z",
      "updated_at": "2025-01-28T00:00:00Z",
      "creator_email": "creator@example.com",
      "creator_name": "생성자명"
    }
  ]
}
```

#### POST /api/ai-pm/projects
새 프로젝트를 생성합니다.

**권한**: 관리자만

**요청 본문**:
```json
{
  "name": "프로젝트명",
  "description": "프로젝트 설명 (선택사항)"
}
```

**응답**:
```json
{
  "project": {
    "id": "uuid",
    "name": "프로젝트명",
    "description": "프로젝트 설명",
    "created_by": "uuid",
    "created_at": "2025-01-28T00:00:00Z",
    "updated_at": "2025-01-28T00:00:00Z"
  }
}
```

#### GET /api/ai-pm/projects/[projectId]
특정 프로젝트의 상세 정보를 조회합니다.

**권한**: 프로젝트 멤버 또는 관리자

**응답**:
```json
{
  "project": {
    "id": "uuid",
    "name": "프로젝트명",
    "description": "프로젝트 설명",
    "created_by": "uuid",
    "created_at": "2025-01-28T00:00:00Z",
    "updated_at": "2025-01-28T00:00:00Z",
    "creator_email": "creator@example.com",
    "creator_name": "생성자명"
  },
  "members": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "user_id": "uuid",
      "role": "콘텐츠기획",
      "added_by": "uuid",
      "added_at": "2025-01-28T00:00:00Z",
      "email": "member@example.com",
      "full_name": "멤버명",
      "user_role": "user"
    }
  ],
  "progress": [
    {
      "workflow_step": 1,
      "step_name": "서비스 개요 및 목표 설정",
      "has_official_document": true,
      "document_count": 2,
      "last_updated": "2025-01-28T00:00:00Z"
    }
  ]
}
```

#### PUT /api/ai-pm/projects/[projectId]
프로젝트 정보를 수정합니다.

**권한**: 프로젝트 생성자 또는 관리자

**요청 본문**:
```json
{
  "name": "수정된 프로젝트명",
  "description": "수정된 프로젝트 설명"
}
```

#### DELETE /api/ai-pm/projects/[projectId]
프로젝트를 삭제합니다.

**권한**: 관리자만

**응답**:
```json
{
  "message": "프로젝트가 성공적으로 삭제되었습니다.",
  "deletedProject": {
    "id": "uuid",
    "name": "삭제된 프로젝트명"
  }
}
```

### AI 대화 시스템

#### POST /api/ai-pm/chat?projectId={id}
AI와 대화를 진행합니다.

**권한**: 프로젝트 멤버 또는 관리자

**요청 본문**:
```json
{
  "message": "전자책 플랫폼을 기획하고 싶습니다.",
  "workflow_step": 1
}
```

**응답**:
```json
{
  "conversation": {
    "id": "uuid",
    "project_id": "uuid",
    "workflow_step": 1,
    "user_id": "uuid",
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "전자책 플랫폼을 기획하고 싶습니다.",
        "timestamp": "2025-01-28T00:00:00Z"
      },
      {
        "id": "msg_2",
        "role": "assistant",
        "content": "안녕하세요! 전자책 플랫폼 기획을 도와드리겠습니다...",
        "timestamp": "2025-01-28T00:00:01Z"
      }
    ],
    "created_at": "2025-01-28T00:00:00Z",
    "updated_at": "2025-01-28T00:00:01Z"
  }
}
```

#### GET /api/ai-pm/chat?projectId={id}&workflowStep={step}
대화 히스토리를 조회합니다.

**권한**: 프로젝트 멤버 또는 관리자

**응답**: POST와 동일한 형식

#### DELETE /api/ai-pm/chat?projectId={id}&workflowStep={step}
대화 히스토리를 삭제합니다.

**권한**: 프로젝트 멤버 또는 관리자

**응답**:
```json
{
  "message": "대화 기록이 삭제되었습니다."
}
```

#### POST /api/ai-pm/chat/stream?projectId={id}
AI와 실시간 스트리밍 대화를 진행합니다.

**권한**: 프로젝트 멤버 또는 관리자

**요청 본문**: POST /api/ai-pm/chat와 동일

**응답**: Server-Sent Events (SSE) 스트림
```
data: {"type": "content", "content": "안녕", "isComplete": false}

data: {"type": "content", "content": "안녕하세요!", "isComplete": false}

data: {"type": "complete", "messageId": "msg_123"}
```

### 문서 관리

#### POST /api/ai-pm/documents/generate?projectId={id}
대화 내용을 기반으로 AI가 문서를 생성합니다.

**권한**: 프로젝트 멤버 또는 관리자

**요청 본문**:
```json
{
  "workflow_step": 1
}
```

**응답**:
```json
{
  "document": {
    "id": "uuid",
    "project_id": "uuid",
    "workflow_step": 1,
    "title": "서비스 개요 및 목표 설정 - 프로젝트명 기획서",
    "content": "# 서비스 개요 및 목표 설정\n\n## 플랫폼 개요\n...",
    "status": "private",
    "version": 1,
    "created_by": "uuid",
    "approved_by": null,
    "created_at": "2025-01-28T00:00:00Z",
    "updated_at": "2025-01-28T00:00:00Z",
    "approved_at": null,
    "creator_email": "creator@example.com",
    "creator_name": "생성자명",
    "approver_email": null,
    "approver_name": null
  }
}
```

#### POST /api/ai-pm/documents/analyze-conflicts
문서 간 충돌을 분석합니다.

**권한**: 프로젝트 멤버 또는 관리자

**요청 본문**:
```json
{
  "document_id": "uuid",
  "current_content": "분석할 현재 문서 내용 (선택사항)"
}
```

**응답**:
```json
{
  "analysis": "충돌 분석 결과: 현재 문서와 기존 공식 문서들 간에 다음과 같은 충돌이 발견되었습니다...",
  "has_conflicts": true,
  "conflict_count": 2,
  "recommendations": [
    "문서의 핵심 내용이 기존 문서들과 일관성을 유지하는지 확인하세요.",
    "용어 정의와 개념이 프로젝트 전반에 걸쳐 통일되었는지 검토하세요."
  ]
}
```

### 프로젝트 멤버 관리

#### GET /api/ai-pm/projects/[projectId]/members
프로젝트 멤버 목록을 조회합니다.

**권한**: 프로젝트 멤버 또는 관리자

**응답**:
```json
{
  "members": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "user_id": "uuid",
      "role": "콘텐츠기획",
      "added_by": "uuid",
      "added_at": "2025-01-28T00:00:00Z",
      "email": "member@example.com",
      "full_name": "멤버명",
      "user_role": "user"
    }
  ]
}
```

#### POST /api/ai-pm/projects/[projectId]/members
프로젝트에 새 멤버를 추가합니다.

**권한**: 관리자만

**요청 본문**:
```json
{
  "user_id": "uuid",
  "role": "콘텐츠기획"
}
```

**역할 옵션**: `콘텐츠기획`, `서비스기획`, `UIUX기획`, `개발자`

#### PUT /api/ai-pm/projects/[projectId]/members?userId=xxx
멤버의 역할을 변경합니다.

**권한**: 관리자만

**요청 본문**:
```json
{
  "role": "서비스기획"
}
```

#### DELETE /api/ai-pm/projects/[projectId]/members?userId=xxx
프로젝트에서 멤버를 제거합니다.

**권한**: 관리자만

**응답**:
```json
{
  "message": "멤버가 성공적으로 제거되었습니다.",
  "removedMember": {
    "id": "uuid",
    "email": "removed@example.com",
    "full_name": "제거된 멤버명"
  }
}
```

## 에러 응답

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "error": "ERROR_TYPE",
  "message": "사용자 친화적 에러 메시지",
  "details": "추가 에러 정보 (선택사항)"
}
```

### 에러 타입

- `UNAUTHORIZED`: 인증이 필요함 (401)
- `FORBIDDEN`: 권한이 부족함 (403)
- `PROJECT_NOT_FOUND`: 프로젝트를 찾을 수 없음 (404)
- `MEMBER_NOT_FOUND`: 멤버를 찾을 수 없음 (404)
- `USER_NOT_FOUND`: 사용자를 찾을 수 없음 (404)
- `DOCUMENT_NOT_FOUND`: 문서를 찾을 수 없음 (404)
- `MEMBER_ALREADY_EXISTS`: 멤버가 이미 존재함 (409)
- `VALIDATION_ERROR`: 요청 데이터 검증 실패 (400)
- `INVALID_PROJECT_ID`: 유효하지 않은 프로젝트 ID (400)
- `INVALID_WORKFLOW_STEP`: 유효하지 않은 워크플로우 단계 (400)
- `AI_SERVICE_ERROR`: AI 서비스 오류 (500)
- `RATE_LIMITED`: AI API 요청 한도 초과 (429)
- `DATABASE_ERROR`: 데이터베이스 오류 (500)
- `INTERNAL_ERROR`: 서버 내부 오류 (500)

## 사용 예시

### 프로젝트 생성 (관리자)
```javascript
const response = await fetch('/api/ai-pm/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '전자책 플랫폼 프로젝트',
    description: '전자책 판매 및 구독 서비스 플랫폼 개발'
  })
});

const data = await response.json();
```

### AI와 대화하기
```javascript
const response = await fetch(`/api/ai-pm/chat?projectId=${projectId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '전자책 플랫폼의 핵심 기능을 정의해주세요.',
    workflow_step: 1
  })
});

const data = await response.json();
console.log(data.conversation.messages);
```

### 실시간 스트리밍 대화
```javascript
const response = await fetch(`/api/ai-pm/chat/stream?projectId=${projectId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '플랫폼 기획을 시작해주세요.',
    workflow_step: 1
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.type === 'content') {
        console.log('AI 응답:', data.content);
      }
    }
  }
}
```

### 문서 생성
```javascript
const response = await fetch(`/api/ai-pm/documents/generate?projectId=${projectId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    workflow_step: 1
  })
});

const data = await response.json();
console.log('생성된 문서:', data.document.content);
```

### 충돌 분석
```javascript
const response = await fetch('/api/ai-pm/documents/analyze-conflicts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    document_id: 'document-uuid',
    current_content: '현재 편집 중인 문서 내용'
  })
});

const data = await response.json();
console.log('충돌 분석:', data.analysis);
console.log('충돌 여부:', data.has_conflicts);
console.log('추천 사항:', data.recommendations);
```

## AI 워크플로우 단계

AI 대화 시스템은 AIPM.md에 정의된 9단계 워크플로우를 지원합니다:

1. **컨셉 정의 및 기획** - 플랫폼의 전체 컨셉과 방향성 정의
2. **페이지 정의 및 기획** - 주요 페이지 구조와 기획
3. **파트별 문서 제작** - 각 페이지의 파트별 상세 문서
4. **문서 양식 및 독립성 유지** - 공통 양식 적용 및 검토
5. **페이지별 문서 통합** - 파트별 문서의 통합
6. **플랫폼 정의 마련** - 전체 플랫폼 정의 통합
7. **정책 설정** - 종합 문서 기반 정책 수립
8. **충돌 반영 및 논의** - 문서 간 충돌 감지 및 해결
9. **AI 중심 진행** - 인간 소통 최소화한 자동화 진행

각 단계별로 특화된 AI 프롬프트가 적용되어 체계적인 기획 과정을 지원합니다.

## 환경 설정

AI 대화 시스템을 사용하기 위해서는 다음 환경 변수가 필요합니다:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

## 데이터베이스 스키마

API는 다음 데이터베이스 테이블을 사용합니다:

- `projects`: 프로젝트 기본 정보
- `project_members`: 프로젝트 멤버십 정보
- `user_profiles`: 사용자 프로필 (기존 FunCommute 테이블)
- `planning_documents`: 기획 문서
- `document_versions`: 문서 버전 히스토리
- `ai_conversations`: AI 대화 내역

자세한 스키마 정보는 `database/migrations/001_ai_pm_schema.sql`을 참조하세요.
