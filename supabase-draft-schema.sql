-- 임시저장 보고서 테이블 생성
CREATE TABLE draft_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE,
  report_type VARCHAR(20) CHECK (report_type IN ('morning', 'evening', 'weekly')),
  user_name_snapshot VARCHAR(255),
  report_content TEXT,
  projects_data JSONB,
  misc_tasks_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_draft_reports_user_id ON draft_reports(user_id);
CREATE INDEX idx_draft_reports_report_date ON draft_reports(report_date);
CREATE INDEX idx_draft_reports_created_at ON draft_reports(created_at);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE draft_reports ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 임시저장 보고서만 볼 수 있음
CREATE POLICY "Users can view own draft reports" ON draft_reports
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 임시저장 보고서만 생성할 수 있음
CREATE POLICY "Users can insert own draft reports" ON draft_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 임시저장 보고서만 수정할 수 있음
CREATE POLICY "Users can update own draft reports" ON draft_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 임시저장 보고서만 삭제할 수 있음
CREATE POLICY "Users can delete own draft reports" ON draft_reports
  FOR DELETE USING (auth.uid() = user_id);

-- 관리자는 모든 임시저장 보고서를 볼 수 있음
CREATE POLICY "Admins can view all draft reports" ON draft_reports
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자는 모든 임시저장 보고서를 삭제할 수 있음
CREATE POLICY "Admins can delete all draft reports" ON draft_reports
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );