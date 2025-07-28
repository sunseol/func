# AI PM 데이터베이스 스키마

이 디렉토리는 AI PM 기능을 위한 데이터베이스 스키마와 마이그레이션 파일을 포함합니다.

## 📁 구조

```
database/
├── migrations/
│   └── 001_ai_pm_schema.sql    # AI PM 기능 초기 스키마
└── README.md                   # 이 파일
```

## 🗄️ 테이블 구조

### 1. projects
프로젝트 기본 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 프로젝트 고유 ID (Primary Key) |
| name | VARCHAR(255) | 프로젝트 이름 |
| description | TEXT | 프로젝트 설명 |
| created_by | UUID | 프로젝트 생성자 (user_profiles 참조) |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

### 2. project_members
프로젝트 멤버십과 역할 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 멤버십 고유 ID (Primary Key) |
| project_id | UUID | 프로젝트 ID (projects 참조) |
| user_id | UUID | 사용자 ID (auth.users 참조) |
| role | VARCHAR(50) | 역할 (콘텐츠기획, 서비스기획, UIUX기획, 개발자) |
| added_by | UUID | 멤버 추가자 |
| added_at | TIMESTAMP | 멤버 추가 시간 |

### 3. planning_documents
기획 문서 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 문서 고유 ID (Primary Key) |
| project_id | UUID | 프로젝트 ID (projects 참조) |
| workflow_step | INTEGER | 워크플로우 단계 (1-9) |
| title | VARCHAR(255) | 문서 제목 |
| content | TEXT | 문서 내용 |
| status | VARCHAR(20) | 문서 상태 (private, pending_approval, official) |
| version | INTEGER | 문서 버전 |
| created_by | UUID | 문서 작성자 |
| approved_by | UUID | 문서 승인자 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |
| approved_at | TIMESTAMP | 승인 시간 |

### 4. document_versions
문서 버전 히스토리를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 버전 고유 ID (Primary Key) |
| document_id | UUID | 문서 ID (planning_documents 참조) |
| version | INTEGER | 버전 번호 |
| content | TEXT | 해당 버전의 문서 내용 |
| created_by | UUID | 버전 생성자 |
| created_at | TIMESTAMP | 버전 생성 시간 |

### 5. ai_conversations
AI와의 대화 내역을 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 대화 고유 ID (Primary Key) |
| project_id | UUID | 프로젝트 ID (projects 참조) |
| workflow_step | INTEGER | 워크플로우 단계 (1-9) |
| user_id | UUID | 사용자 ID (auth.users 참조) |
| messages | JSONB | 대화 메시지 배열 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

## 🔒 보안 정책 (RLS)

모든 테이블에 Row Level Security가 적용되어 있습니다:

- **프로젝트 접근**: 프로젝트 멤버이거나 관리자만 접근 가능
- **문서 접근**: 오피셜 문서는 프로젝트 멤버가, 프라이빗 문서는 작성자만 접근 가능
- **관리 권한**: 관리자만 프로젝트 생성/삭제, 멤버 추가/제거 가능

## 📊 인덱스 최적화

성능 최적화를 위해 다음 인덱스가 생성됩니다:

### 단일 컬럼 인덱스
- 외래 키 컬럼들 (project_id, user_id, document_id 등)
- 자주 검색되는 컬럼들 (status, workflow_step, role 등)
- 정렬에 사용되는 컬럼들 (created_at, updated_at 등)

### 복합 인덱스
- `(project_id, workflow_step)`: 프로젝트별 워크플로우 단계 조회
- `(project_id, status)`: 프로젝트별 문서 상태 조회
- `(document_id, version)`: 문서별 버전 조회
- `(user_id, project_id)`: 사용자별 프로젝트 조회

## 🔄 자동화 기능

### 트리거
- **자동 타임스탬프**: `updated_at` 컬럼 자동 업데이트
- **문서 버전 관리**: 문서 수정 시 자동으로 이전 버전 저장

### 뷰
- `project_members_with_profiles`: 멤버 정보와 사용자 프로필 조인
- `projects_with_creator`: 프로젝트와 생성자 정보 조인
- `planning_documents_with_users`: 문서와 작성자/승인자 정보 조인

### 함수
- `get_project_progress(UUID)`: 프로젝트 진행 상황 조회
- `get_user_projects(UUID)`: 사용자의 프로젝트 목록 조회

## 🚀 마이그레이션 실행

Supabase에서 마이그레이션을 실행하려면:

1. Supabase 대시보드의 SQL Editor에서 `001_ai_pm_schema.sql` 파일 내용을 실행
2. 또는 Supabase CLI를 사용하여 마이그레이션 실행:
   ```bash
   supabase db push
   ```

## 📝 사용 예시

### 프로젝트 생성
```sql
INSERT INTO projects (name, description, created_by)
VALUES ('전자책 플랫폼', '전자책 서비스 기획 프로젝트', auth.uid());
```

### 프로젝트 멤버 추가
```sql
INSERT INTO project_members (project_id, user_id, role, added_by)
VALUES ('project-uuid', 'user-uuid', '콘텐츠기획', auth.uid());
```

### 문서 생성
```sql
INSERT INTO planning_documents (project_id, workflow_step, title, content, created_by)
VALUES ('project-uuid', 1, '서비스 개요', '전자책 플랫폼 개요...', auth.uid());
```

### 프로젝트 진행 상황 조회
```sql
SELECT * FROM get_project_progress('project-uuid');
```

### 사용자 프로젝트 목록 조회
```sql
SELECT * FROM get_user_projects(auth.uid());
```

## ⚠️ 주의사항

1. **외래 키 제약**: 모든 참조 관계가 CASCADE DELETE로 설정되어 있어 상위 레코드 삭제 시 하위 레코드도 함께 삭제됩니다.

2. **버전 관리**: 문서 수정 시 자동으로 이전 버전이 저장되므로 스토리지 사용량을 고려해야 합니다.

3. **JSONB 컬럼**: `ai_conversations.messages`는 JSONB 타입으로 구조화된 데이터를 저장합니다.

4. **RLS 정책**: 모든 쿼리에서 RLS 정책이 적용되므로 적절한 권한 확인이 필요합니다.