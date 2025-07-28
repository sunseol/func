-- 프로젝트 협업 기능을 위한 활동 히스토리 추적
-- 생성일: 2025-01-28
-- 설명: 프로젝트 내 모든 활동을 추적하여 타임라인 및 협업 기능 지원

-- 1. project_activities 테이블 생성
CREATE TABLE IF NOT EXISTS project_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'project_created',
    'project_updated', 
    'member_added',
    'member_removed',
    'member_role_changed',
    'document_created',
    'document_updated',
    'document_approval_requested',
    'document_approved',
    'document_rejected',
    'document_deleted',
    'ai_conversation_started',
    'conflict_analysis_completed'
  )),
  target_type VARCHAR(20) CHECK (target_type IN ('project', 'member', 'document', 'conversation')),
  target_id UUID, -- 활동 대상의 ID (document_id, member_id 등)
  metadata JSONB, -- 추가 활동 정보 (제목, 이전/새 값 등)
  description TEXT NOT NULL, -- 사용자가 읽을 수 있는 활동 설명
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. project_collaboration_stats 테이블 생성 (프로젝트 진행 상황 요약)
CREATE TABLE IF NOT EXISTS project_collaboration_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  total_documents INTEGER DEFAULT 0,
  official_documents INTEGER DEFAULT 0,
  pending_documents INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. member_activity_summary 테이블 생성 (멤버별 활동 요약)
CREATE TABLE IF NOT EXISTS member_activity_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  documents_created INTEGER DEFAULT 0,
  documents_updated INTEGER DEFAULT 0,
  documents_approved INTEGER DEFAULT 0,
  ai_conversations INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 4. RLS 정책 설정
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaboration_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activity_summary ENABLE ROW LEVEL SECURITY;

-- project_activities 정책: 프로젝트 멤버만 조회 가능
CREATE POLICY "Project members can view activities" ON project_activities
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_activities.project_id
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서만 활동 기록 생성
CREATE POLICY "Only system can create activities" ON project_activities
  FOR INSERT WITH CHECK (false);

-- project_collaboration_stats 정책: 프로젝트 멤버만 조회 가능
CREATE POLICY "Project members can view collaboration stats" ON project_collaboration_stats
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_collaboration_stats.project_id
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- member_activity_summary 정책: 프로젝트 멤버만 조회 가능
CREATE POLICY "Project members can view member activities" ON member_activity_summary
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = member_activity_summary.project_id
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_user_id ON project_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_type ON project_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_project_activities_created_at ON project_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activities_target ON project_activities(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_member_activity_summary_project_user ON member_activity_summary(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_activity_summary_updated_at ON member_activity_summary(updated_at DESC);

-- 6. 자동 업데이트 트리거 함수들

-- project_collaboration_stats 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_project_collaboration_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_collaboration_stats (project_id, total_activities, last_activity_at)
  VALUES (NEW.project_id, 1, NEW.created_at)
  ON CONFLICT (project_id) 
  DO UPDATE SET 
    total_activities = project_collaboration_stats.total_activities + 1,
    last_activity_at = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- member_activity_summary 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_member_activity_summary()
RETURNS TRIGGER AS $$
DECLARE
  increment_field TEXT;
BEGIN
  -- 활동 유형에 따라 증가시킬 필드 결정
  CASE NEW.activity_type
    WHEN 'document_created' THEN increment_field := 'documents_created';
    WHEN 'document_updated' THEN increment_field := 'documents_updated';
    WHEN 'document_approved' THEN increment_field := 'documents_approved';
    WHEN 'ai_conversation_started' THEN increment_field := 'ai_conversations';
    ELSE increment_field := NULL;
  END CASE;
  
  IF increment_field IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO member_activity_summary (project_id, user_id, last_activity_at)
    VALUES (NEW.project_id, NEW.user_id, NEW.created_at)
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET 
      last_activity_at = NEW.created_at,
      updated_at = NOW();
    
    -- 동적으로 해당 필드 증가
    EXECUTE format('UPDATE member_activity_summary SET %I = %I + 1 WHERE project_id = $1 AND user_id = $2', 
                   increment_field, increment_field) 
    USING NEW.project_id, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 트리거 생성
CREATE TRIGGER trigger_update_collaboration_stats
  AFTER INSERT ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_project_collaboration_stats();

CREATE TRIGGER trigger_update_member_activity
  AFTER INSERT ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_member_activity_summary();

-- 8. 활동 기록 헬퍼 함수
CREATE OR REPLACE FUNCTION log_project_activity(
  p_project_id UUID,
  p_user_id UUID,
  p_activity_type VARCHAR(50),
  p_target_type VARCHAR(20) DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_description TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO project_activities (
    project_id, user_id, activity_type, target_type, target_id, metadata, description
  )
  VALUES (
    p_project_id, p_user_id, p_activity_type, p_target_type, p_target_id, p_metadata, p_description
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 프로젝트 통계 초기화 함수
CREATE OR REPLACE FUNCTION initialize_project_stats(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO project_collaboration_stats (project_id)
  VALUES (p_project_id)
  ON CONFLICT (project_id) DO NOTHING;
  
  -- 기존 데이터 기반으로 통계 계산
  UPDATE project_collaboration_stats SET
    total_documents = (
      SELECT COUNT(*) FROM planning_documents WHERE project_id = p_project_id
    ),
    official_documents = (
      SELECT COUNT(*) FROM planning_documents WHERE project_id = p_project_id AND status = 'official'
    ),
    pending_documents = (
      SELECT COUNT(*) FROM planning_documents WHERE project_id = p_project_id AND status = 'pending_approval'
    ),
    total_members = (
      SELECT COUNT(*) FROM project_members WHERE project_id = p_project_id
    ),
    updated_at = NOW()
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 