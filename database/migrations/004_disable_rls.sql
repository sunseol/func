-- RLS 비활성화 및 정책 제거 마이그레이션
-- 파일명: 004_disable_rls.sql

-- 1. 001_ai_pm_schema.sql 에서 생성된 RLS 비활성화 및 정책 제거

-- projects 테이블
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
DROP POLICY IF EXISTS "Only admins can create projects" ON projects;
DROP POLICY IF EXISTS "Project creators and admins can update projects" ON projects;
DROP POLICY IF EXISTS "Only admins can delete projects" ON projects;

-- project_members 테이블
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Project members can view other members" ON project_members;
DROP POLICY IF EXISTS "Only admins can add project members" ON project_members;
DROP POLICY IF EXISTS "Only admins can remove project members" ON project_members;

-- planning_documents 테이블
ALTER TABLE planning_documents DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view official documents and their own private documents" ON planning_documents;
DROP POLICY IF EXISTS "Project members can create documents" ON planning_documents;
DROP POLICY IF EXISTS "Document creators and admins can update documents" ON planning_documents;
DROP POLICY IF EXISTS "Document creators and admins can delete documents" ON planning_documents;

-- document_versions 테이블
ALTER TABLE document_versions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view document versions if they can view the document" ON document_versions;
DROP POLICY IF EXISTS "Only system can create document versions" ON document_versions;

-- ai_conversations 테이블
ALTER TABLE ai_conversations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Project members can view AI conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Project members can create AI conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Conversation creators and admins can update conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Conversation creators and admins can delete conversations" ON ai_conversations;


-- 2. 002_approval_workflow.sql 에서 생성된 RLS 비활성화 및 정책 제거

-- user_profiles 테이블
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;

-- document_approval_history 테이블
ALTER TABLE document_approval_history DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view approval history if they can view the document" ON document_approval_history;
DROP POLICY IF EXISTS "Only system can create approval history" ON document_approval_history;


-- 3. 003_project_activities.sql 에서 생성된 RLS 비활성화 및 정책 제거

-- project_activities 테이블
ALTER TABLE project_activities DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Project members can view activities" ON project_activities;
DROP POLICY IF EXISTS "Only system can create activities" ON project_activities;

-- project_collaboration_stats 테이블
ALTER TABLE project_collaboration_stats DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Project members can view collaboration stats" ON project_collaboration_stats;

-- member_activity_summary 테이블
ALTER TABLE member_activity_summary DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Project members can view member activities" ON member_activity_summary;

DO $$
BEGIN
    RAISE NOTICE '모든 테이블의 RLS(Row Level Security)가 비활성화되고 관련 정책이 모두 제거되었습니다.';
END $$;
