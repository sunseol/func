-- 사용자 프로필 테이블 생성
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 일간 보고서 테이블 생성
CREATE TABLE daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('morning', 'evening', 'weekly')),
  user_name_snapshot VARCHAR(255) NOT NULL,
  report_content TEXT NOT NULL,
  projects_data JSONB,
  misc_tasks_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_created_at ON daily_reports(created_at);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 보고서만 볼 수 있음
CREATE POLICY "Users can view own reports" ON daily_reports
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 보고서만 생성할 수 있음
CREATE POLICY "Users can insert own reports" ON daily_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 보고서만 수정할 수 있음
CREATE POLICY "Users can update own reports" ON daily_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 보고서만 삭제할 수 있음
CREATE POLICY "Users can delete own reports" ON daily_reports
  FOR DELETE USING (auth.uid() = user_id);

-- 관리자는 모든 보고서를 볼 수 있음 (관리자 이메일 또는 role 기반)
CREATE POLICY "Admins can view all reports" ON daily_reports
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자는 모든 보고서를 삭제할 수 있음
CREATE POLICY "Admins can delete all reports" ON daily_reports
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 사용자 프로필 테이블 RLS 정책
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 볼 수 있음
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 생성할 수 있음
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 사용자는 자신의 프로필만 수정할 수 있음
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 관리자는 모든 프로필을 볼 수 있음
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자는 다른 사용자의 role을 변경할 수 있음
CREATE POLICY "Admins can update user roles" ON user_profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 사용자 프로필 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN new.email = 'jakeseol99@keduall.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 사용자 생성 시 자동으로 프로필 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();