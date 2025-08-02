-- 009_update_member_rls.sql
-- 설명: 프로젝트 멤버 추가 권한을 관리자 외에 프로젝트 생성자 및 기존 멤버에게도 부여합니다.

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Only admins can add project members" ON project_members;

-- 새로운 INSERT 정책 생성
CREATE POLICY "Project members and admins can add new members" ON project_members
  FOR INSERT WITH CHECK (
    -- 사용자가 관리자인 경우
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    -- 사용자가 프로젝트를 생성한 경우
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND created_by = auth.uid()
    ) OR
    -- 사용자가 이미 해당 프로젝트의 멤버인 경우
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_members.project_id AND user_id = auth.uid()
    )
  );

RAISE NOTICE 'project_members 테이블의 INSERT 정책이 업데이트되었습니다.';
