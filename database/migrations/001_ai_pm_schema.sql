-- AI PM 기능을 위한 데이터베이스 스키마
-- 생성일: 2025-01-28
-- 설명: 프로젝트 관리, 문서 관리, AI 대화 기능을 위한 테이블 생성

-- 0. user_profiles 테이블 생성 (auth.users와 1:1 관계)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 프로필만 보거나 수정할 수 있음
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- auth.users 테이블의 새 사용자를 user_profiles에 복제하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 위 함수를 트리거로 설정
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 1. projects 테이블 생성
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. project_members 테이블 생성
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('콘텐츠기획', '서비스기획', 'UIUX기획', '개발자')),
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 3. planning_documents 테이블 생성
CREATE TABLE IF NOT EXISTS planning_documents (
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

-- 4. document_versions 테이블 생성
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES planning_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ai_conversations 테이블 생성
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workflow_step INTEGER NOT NULL CHECK (workflow_step BETWEEN 1 AND 9),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- R
LS (Row Level Security) 정책 설정

-- projects 테이블 RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- project_members 테이블 RLS 활성화
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- planning_documents 테이블 RLS 활성화
ALTER TABLE planning_documents ENABLE ROW LEVEL SECURITY;

-- document_versions 테이블 RLS 활성화
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- ai_conversations 테이블 RLS 활성화
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- projects 테이블 정책
-- 프로젝트 멤버이거나 관리자인 경우 조회 가능
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

-- 관리자만 프로젝트 생성 가능
CREATE POLICY "Only admins can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 프로젝트 생성자나 관리자만 프로젝트 수정 가능
CREATE POLICY "Project creators and admins can update projects" ON projects
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 프로젝트 삭제 가능
CREATE POLICY "Only admins can delete projects" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- project_members 테이블 정책
-- 프로젝트 멤버이거나 관리자인 경우 다른 멤버 조회 가능
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

-- 관리자만 멤버 추가 가능
CREATE POLICY "Only admins can add project members" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 멤버 제거 가능
CREATE POLICY "Only admins can remove project members" ON project_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- planning_documents 테이블 정책
-- 오피셜 문서는 프로젝트 멤버가 조회 가능, 프라이빗 문서는 작성자만 조회 가능
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

-- 프로젝트 멤버만 문서 생성 가능
CREATE POLICY "Project members can create documents" ON planning_documents
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = planning_documents.project_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 문서 작성자나 관리자만 문서 수정 가능
CREATE POLICY "Document creators and admins can update documents" ON planning_documents
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 문서 작성자나 관리자만 문서 삭제 가능
CREATE POLICY "Document creators and admins can delete documents" ON planning_documents
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- document_versions 테이블 정책
-- 해당 문서에 접근 권한이 있는 사용자만 버전 조회 가능
CREATE POLICY "Users can view document versions if they can view the document" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM planning_documents pd
      WHERE pd.id = document_versions.document_id
      AND (
        (pd.status = 'official' AND auth.uid() IN (
          SELECT user_id FROM project_members WHERE project_id = pd.project_id
        )) OR
        (pd.created_by = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- 시스템에서만 문서 버전 생성 (사용자 직접 생성 불가)
CREATE POLICY "Only system can create document versions" ON document_versions
  FOR INSERT WITH CHECK (false);

-- ai_conversations 테이블 정책
-- 프로젝트 멤버이거나 관리자인 경우 대화 조회 가능
CREATE POLICY "Project members can view AI conversations" ON ai_conversations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = ai_conversations.project_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 프로젝트 멤버만 AI 대화 생성 가능
CREATE POLICY "Project members can create AI conversations" ON ai_conversations
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = ai_conversations.project_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 대화 생성자나 관리자만 대화 수정 가능
CREATE POLICY "Conversation creators and admins can update conversations" ON ai_conversations
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 대화 생성자나 관리자만 대화 삭제 가능
CREATE POLICY "Conversation creators and admins can delete conversations" ON ai_conversations
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );-
- 인덱스 생성으로 쿼리 성능 최적화

-- projects 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- project_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);
CREATE INDEX IF NOT EXISTS idx_project_members_added_at ON project_members(added_at);

-- planning_documents 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_planning_documents_project_id ON planning_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_documents_workflow_step ON planning_documents(workflow_step);
CREATE INDEX IF NOT EXISTS idx_planning_documents_status ON planning_documents(status);
CREATE INDEX IF NOT EXISTS idx_planning_documents_created_by ON planning_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_planning_documents_created_at ON planning_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_planning_documents_updated_at ON planning_documents(updated_at);
-- 복합 인덱스: 프로젝트별 워크플로우 단계 조회 최적화
CREATE INDEX IF NOT EXISTS idx_planning_documents_project_workflow ON planning_documents(project_id, workflow_step);
-- 복합 인덱스: 상태별 문서 조회 최적화
CREATE INDEX IF NOT EXISTS idx_planning_documents_project_status ON planning_documents(project_id, status);

-- document_versions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version ON document_versions(version);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);
-- 복합 인덱스: 문서별 버전 조회 최적화
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_version ON document_versions(document_id, version);

-- ai_conversations 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project_id ON ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_workflow_step ON ai_conversations(workflow_step);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at);
-- 복합 인덱스: 프로젝트별 워크플로우 단계 대화 조회 최적화
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project_workflow ON ai_conversations(project_id, workflow_step);
-- 복합 인덱스: 사용자별 대화 조회 최적화
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_project ON ai_conversations(user_id, project_id);-
- 트리거 함수 및 트리거 생성

-- updated_at 자동 업데이트 함수 (이미 존재할 수 있으므로 IF NOT EXISTS 사용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- projects 테이블 updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- planning_documents 테이블 updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_planning_documents_updated_at ON planning_documents;
CREATE TRIGGER update_planning_documents_updated_at
    BEFORE UPDATE ON planning_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ai_conversations 테이블 updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 문서 버전 관리 함수
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- 문서 내용이 변경된 경우에만 새 버전 생성
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        INSERT INTO document_versions (document_id, version, content, created_by)
        VALUES (NEW.id, NEW.version, NEW.content, NEW.created_by);
        
        -- 버전 번호 증가
        NEW.version = NEW.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- planning_documents 테이블 버전 관리 트리거
DROP TRIGGER IF EXISTS create_planning_document_version ON planning_documents;
CREATE TRIGGER create_planning_document_version
    BEFORE UPDATE ON planning_documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version();

-- 초기 문서 버전 생성 함수
CREATE OR REPLACE FUNCTION create_initial_document_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO document_versions (document_id, version, content, created_by)
    VALUES (NEW.id, NEW.version, NEW.content, NEW.created_by);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- planning_documents 테이블 초기 버전 생성 트리거
DROP TRIGGER IF EXISTS create_initial_planning_document_version ON planning_documents;
CREATE TRIGGER create_initial_planning_document_version
    AFTER INSERT ON planning_documents
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_document_version();-- 유용한 뷰 및 
함수 생성

-- 프로젝트 멤버 정보와 사용자 프로필을 조인한 뷰
CREATE OR REPLACE VIEW project_members_with_profiles AS
SELECT 
    pm.id,
    pm.project_id,
    pm.user_id,
    pm.role,
    pm.added_by,
    pm.added_at,
    u.email,
    u.raw_user_meta_data->>'full_name' as full_name,
    up.role as user_role
FROM project_members pm
JOIN auth.users u ON pm.user_id = u.id
LEFT JOIN user_profiles up ON pm.user_id = up.id;

-- 프로젝트 상세 정보 뷰 (생성자 정보 포함)
CREATE OR REPLACE VIEW projects_with_creator AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.created_by,
    p.created_at,
    p.updated_at,
    up.email as creator_email,
    up.full_name as creator_name
FROM projects p
JOIN user_profiles up ON p.created_by = up.id;

-- 문서 상세 정보 뷰 (작성자 및 승인자 정보 포함)
CREATE OR REPLACE VIEW planning_documents_with_users AS
SELECT 
    pd.id,
    pd.project_id,
    pd.workflow_step,
    pd.title,
    pd.content,
    pd.status,
    pd.version,
    pd.created_by,
    pd.approved_by,
    pd.created_at,
    pd.updated_at,
    pd.approved_at,
    creator.email as creator_email,
    creator.full_name as creator_name,
    approver.email as approver_email,
    approver.full_name as approver_name
FROM planning_documents pd
JOIN user_profiles creator ON pd.created_by = creator.id
LEFT JOIN user_profiles approver ON pd.approved_by = approver.id;

-- 프로젝트 진행 상황 조회 함수
CREATE OR REPLACE FUNCTION get_project_progress(project_uuid UUID)
RETURNS TABLE (
    workflow_step INTEGER,
    step_name VARCHAR(100),
    has_official_document BOOLEAN,
    document_count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH workflow_steps AS (
        SELECT generate_series(1, 9) as step_num,
               CASE generate_series(1, 9)
                   WHEN 1 THEN '서비스 개요 및 목표 설정'
                   WHEN 2 THEN '타겟 사용자 분석'
                   WHEN 3 THEN '핵심 기능 정의'
                   WHEN 4 THEN '사용자 경험 설계'
                   WHEN 5 THEN '기술 스택 및 아키텍처'
                   WHEN 6 THEN '개발 일정 및 마일스톤'
                   WHEN 7 THEN '리스크 분석 및 대응 방안'
                   WHEN 8 THEN '성과 지표 및 측정 방법'
                   WHEN 9 THEN '런칭 및 마케팅 전략'
               END as step_name
    ),
    document_stats AS (
        SELECT 
            pd.workflow_step,
            COUNT(*) as doc_count,
            MAX(CASE WHEN pd.status = 'official' THEN 1 ELSE 0 END) = 1 as has_official,
            MAX(pd.updated_at) as last_update
        FROM planning_documents pd
        WHERE pd.project_id = project_uuid
        GROUP BY pd.workflow_step
    )
    SELECT 
        ws.step_num,
        ws.step_name,
        COALESCE(ds.has_official, false),
        COALESCE(ds.doc_count, 0)::INTEGER,
        ds.last_update
    FROM workflow_steps ws
    LEFT JOIN document_stats ds ON ws.step_num = ds.workflow_step
    ORDER BY ws.step_num;
END;
$$ LANGUAGE plpgsql;

-- 사용자의 프로젝트 목록 조회 함수 (권한 고려)
CREATE OR REPLACE FUNCTION get_user_projects(user_uuid UUID)
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR(255),
    project_description TEXT,
    user_role VARCHAR(50),
    member_count BIGINT,
    official_documents_count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        pm.role,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id),
        (SELECT COUNT(*) FROM planning_documents pd WHERE pd.project_id = p.id AND pd.status = 'official'),
        GREATEST(p.updated_at, 
                (SELECT MAX(pd.updated_at) FROM planning_documents pd WHERE pd.project_id = p.id),
                (SELECT MAX(ac.updated_at) FROM ai_conversations ac WHERE ac.project_id = p.id)
        )
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = user_uuid
    ORDER BY GREATEST(p.updated_at, 
                     (SELECT MAX(pd.updated_at) FROM planning_documents pd WHERE pd.project_id = p.id),
                     (SELECT MAX(ac.updated_at) FROM ai_conversations ac WHERE ac.project_id = p.id)
            ) DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;-- 마
이그레이션 완료 로그
DO $$
BEGIN
    RAISE NOTICE 'AI PM 데이터베이스 스키마 마이그레이션이 완료되었습니다.';
    RAISE NOTICE '생성된 테이블: projects, project_members, planning_documents, document_versions, ai_conversations';
    RAISE NOTICE '설정된 RLS 정책: 모든 테이블에 적절한 보안 정책 적용';
    RAISE NOTICE '생성된 인덱스: 쿼리 성능 최적화를 위한 단일 및 복합 인덱스';
    RAISE NOTICE '생성된 트리거: 자동 타임스탬프 업데이트 및 문서 버전 관리';
    RAISE NOTICE '생성된 뷰 및 함수: 프로젝트 진행 상황 및 사용자 프로젝트 조회';
END $$;

-- 스키마 버전 정보 (향후 마이그레이션 관리용)
COMMENT ON TABLE projects IS 'AI PM 프로젝트 정보를 저장하는 테이블';
COMMENT ON TABLE project_members IS '프로젝트 멤버십 및 역할 정보를 저장하는 테이블';
COMMENT ON TABLE planning_documents IS '기획 문서 정보를 저장하는 테이블 (9단계 워크플로우)';
COMMENT ON TABLE document_versions IS '문서 버전 히스토리를 저장하는 테이블';
COMMENT ON TABLE ai_conversations IS 'AI와의 대화 내역을 저장하는 테이블';

-- 중요 컬럼에 대한 설명
COMMENT ON COLUMN planning_documents.workflow_step IS '워크플로우 단계 (1-9): AIPM.md의 9단계 프로세스';
COMMENT ON COLUMN planning_documents.status IS '문서 상태: private(개인), pending_approval(승인대기), official(공식)';
COMMENT ON COLUMN project_members.role IS '프로젝트 내 역할: 콘텐츠기획, 서비스기획, UIUX기획, 개발자';
COMMENT ON COLUMN ai_conversations.messages IS 'AI 대화 메시지 배열 (JSON 형태)';