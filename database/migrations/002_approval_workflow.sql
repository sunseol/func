-- AI PM 승인 워크플로우를 위한 추가 테이블 및 기능
-- 생성일: 2025-01-28
-- 설명: 문서 승인 히스토리 추적 및 워크플로우 관리

-- RLS (Row Level Security) Policies for user_profiles

-- Enable RLS for user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all user profiles.
-- This is necessary for features like adding members to a project,
-- where an admin needs to be able to see a list of all users.
-- A more restrictive policy could be implemented if needed, e.g.,
-- allowing only users who share a project to see each other's profiles.
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 1. document_approval_history 테이블 생성
CREATE TABLE IF NOT EXISTS document_approval_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES planning_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('requested', 'approved', 'rejected')),
  previous_status VARCHAR(20) NOT NULL CHECK (previous_status IN ('private', 'pending_approval', 'official')),
  new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('private', 'pending_approval', 'official')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS 정책 설정
ALTER TABLE document_approval_history ENABLE ROW LEVEL SECURITY;

-- 승인 히스토리는 해당 문서에 접근 권한이 있는 사용자만 조회 가능
CREATE POLICY "Users can view approval history if they can view the document" ON document_approval_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM planning_documents pd
      WHERE pd.id = document_approval_history.document_id
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

-- 시스템에서만 승인 히스토리 생성 (사용자 직접 생성 불가)
CREATE POLICY "Only system can create approval history" ON document_approval_history
  FOR INSERT WITH CHECK (false);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_document_approval_history_document_id ON document_approval_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_user_id ON document_approval_history(user_id);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_action ON document_approval_history(action);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_created_at ON document_approval_history(created_at);
-- 복합 인덱스: 문서별 승인 히스토리 조회 최적화
CREATE INDEX IF NOT EXISTS idx_document_approval_history_doc_created ON document_approval_history(document_id, created_at);

-- 4. 승인 히스토리 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION create_approval_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 변경된 경우에만 히스토리 생성
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- 승인 요청 (private → pending_approval)
        IF OLD.status = 'private' AND NEW.status = 'pending_approval' THEN
            INSERT INTO document_approval_history (document_id, user_id, action, previous_status, new_status)
            VALUES (NEW.id, NEW.created_by, 'requested', OLD.status, NEW.status);
        
        -- 승인 완료 (pending_approval → official)
        ELSIF OLD.status = 'pending_approval' AND NEW.status = 'official' AND NEW.approved_by IS NOT NULL THEN
            INSERT INTO document_approval_history (document_id, user_id, action, previous_status, new_status)
            VALUES (NEW.id, NEW.approved_by, 'approved', OLD.status, NEW.status);
        
        -- 승인 반려 (pending_approval → private)
        ELSIF OLD.status = 'pending_approval' AND NEW.status = 'private' THEN
            -- 반려자는 현재 사용자 (트리거에서는 직접 확인 불가하므로 별도 처리 필요)
            -- 이 경우는 API에서 직접 히스토리를 생성하도록 함
            NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- planning_documents 테이블 승인 히스토리 트리거
DROP TRIGGER IF EXISTS create_document_approval_history ON planning_documents;
CREATE TRIGGER create_document_approval_history
    AFTER UPDATE ON planning_documents
    FOR EACH ROW
    EXECUTE FUNCTION create_approval_history();

-- 5. 승인 권한 확인 함수
CREATE OR REPLACE FUNCTION can_approve_document(
    user_uuid UUID,
    project_uuid UUID,
    workflow_step_num INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_in_system VARCHAR(10);
    user_role_in_project VARCHAR(50);
BEGIN
    -- 관리자 권한 확인
    SELECT role INTO user_role_in_system
    FROM user_profiles
    WHERE id = user_uuid;
    
    IF user_role_in_system = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- 프로젝트 멤버 역할 확인
    SELECT role INTO user_role_in_project
    FROM project_members
    WHERE project_id = project_uuid AND user_id = user_uuid;
    
    IF user_role_in_project IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 워크플로우 단계별 승인 권한 매트릭스
    CASE workflow_step_num
        WHEN 1, 2, 3, 6, 7, 8 THEN -- 서비스기획 담당 단계
            RETURN user_role_in_project = '서비스기획';
        WHEN 4 THEN -- UIUX기획 담당 단계
            RETURN user_role_in_project = 'UIUX기획';
        WHEN 5 THEN -- 개발자 담당 단계
            RETURN user_role_in_project = '개발자';
        WHEN 9 THEN -- 콘텐츠기획 또는 서비스기획 담당 단계
            RETURN user_role_in_project IN ('콘텐츠기획', '서비스기획');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 6. 문서 상태 전환 검증 함수
CREATE OR REPLACE FUNCTION validate_status_transition(
    current_status VARCHAR(20),
    new_status VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 허용되는 상태 전환 패턴
    CASE current_status
        WHEN 'private' THEN
            RETURN new_status IN ('pending_approval', 'private');
        WHEN 'pending_approval' THEN
            RETURN new_status IN ('official', 'private');
        WHEN 'official' THEN
            RETURN new_status IN ('official', 'private'); -- 오피셜 문서도 수정을 위해 private으로 변경 가능
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 7. 상태 전환 검증 트리거 함수
CREATE OR REPLACE FUNCTION validate_document_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 변경된 경우 검증
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT validate_status_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION '유효하지 않은 문서 상태 전환입니다: % → %', OLD.status, NEW.status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- planning_documents 테이블 상태 전환 검증 트리거
DROP TRIGGER IF EXISTS validate_planning_document_status_transition ON planning_documents;
CREATE TRIGGER validate_planning_document_status_transition
    BEFORE UPDATE ON planning_documents
    FOR EACH ROW
    EXECUTE FUNCTION validate_document_status_transition();

-- 8. 승인 대기 중인 문서 조회 뷰
CREATE OR REPLACE VIEW pending_approval_documents AS
SELECT 
    pd.id,
    pd.project_id,
    pd.workflow_step,
    pd.title,
    pd.content,
    pd.version,
    pd.created_by,
    pd.created_at,
    pd.updated_at,
    p.name as project_name,
    creator.email as creator_email,
    creator.full_name as creator_name,
    CASE pd.workflow_step
        WHEN 1, 2, 3, 6, 7, 8 THEN '서비스기획'
        WHEN 4 THEN 'UIUX기획'
        WHEN 5 THEN '개발자'
        WHEN 9 THEN '콘텐츠기획,서비스기획'
    END as required_approver_role
FROM planning_documents pd
JOIN projects p ON pd.project_id = p.id
JOIN user_profiles creator ON pd.created_by = creator.id
WHERE pd.status = 'pending_approval';

-- 9. 사용자별 승인 대기 문서 조회 함수
CREATE OR REPLACE FUNCTION get_pending_approvals_for_user(user_uuid UUID)
RETURNS TABLE (
    document_id UUID,
    project_id UUID,
    project_name VARCHAR(255),
    workflow_step INTEGER,
    step_name VARCHAR(100),
    title VARCHAR(255),
    creator_name VARCHAR(255),
    creator_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id,
        pd.project_id,
        p.name,
        pd.workflow_step,
        CASE pd.workflow_step
            WHEN 1 THEN '서비스 개요 및 목표 설정'
            WHEN 2 THEN '타겟 사용자 분석'
            WHEN 3 THEN '핵심 기능 정의'
            WHEN 4 THEN '사용자 경험 설계'
            WHEN 5 THEN '기술 스택 및 아키텍처'
            WHEN 6 THEN '개발 일정 및 마일스톤'
            WHEN 7 THEN '리스크 분석 및 대응 방안'
            WHEN 8 THEN '성과 지표 및 측정 방법'
            WHEN 9 THEN '런칭 및 마케팅 전략'
        END,
        pd.title,
        creator.full_name,
        creator.email,
        pd.created_at,
        pd.updated_at
    FROM planning_documents pd
    JOIN projects p ON pd.project_id = p.id
    JOIN user_profiles creator ON pd.created_by = creator.id
    WHERE pd.status = 'pending_approval'
    AND can_approve_document(user_uuid, pd.project_id, pd.workflow_step)
    ORDER BY pd.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 10. 문서 승인 히스토리 조회 뷰
CREATE OR REPLACE VIEW document_approval_history_with_users AS
SELECT 
    dah.id,
    dah.document_id,
    dah.user_id,
    dah.action,
    dah.previous_status,
    dah.new_status,
    dah.reason,
    dah.created_at,
    u.email as user_email,
    u.full_name as user_name,
    pd.title as document_title,
    pd.workflow_step,
    p.name as project_name
FROM document_approval_history dah
JOIN user_profiles u ON dah.user_id = u.id
JOIN planning_documents pd ON dah.document_id = pd.id
JOIN projects p ON pd.project_id = p.id;

-- 마이그레이션 완료 로그
DO $$
BEGIN
    RAISE NOTICE 'AI PM 승인 워크플로우 마이그레이션이 완료되었습니다.';
    RAISE NOTICE '생성된 테이블: document_approval_history';
    RAISE NOTICE '생성된 함수: can_approve_document, validate_status_transition, get_pending_approvals_for_user';
    RAISE NOTICE '생성된 트리거: 승인 히스토리 자동 생성 및 상태 전환 검증';
    RAISE NOTICE '생성된 뷰: pending_approval_documents, document_approval_history_with_users';
END $$;

-- 테이블 및 컬럼 설명
COMMENT ON TABLE document_approval_history IS '문서 승인 히스토리를 추적하는 테이블';
COMMENT ON COLUMN document_approval_history.action IS '승인 액션: requested(요청), approved(승인), rejected(반려)';
COMMENT ON COLUMN document_approval_history.previous_status IS '이전 문서 상태';
COMMENT ON COLUMN document_approval_history.new_status IS '새로운 문서 상태';
COMMENT ON COLUMN document_approval_history.reason IS '반려 사유 (반려 시에만 사용)';