-- 사용자 프로필 테이블 생성 (기존 테이블이 없는 경우에만)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (이미 존재하는 경우 무시)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 사용자 프로필 테이블 RLS 정책
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_profiles;

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

-- 기존 daily_reports 테이블에 관리자 정책 추가 (기존 정책 업데이트)
DROP POLICY IF EXISTS "Admins can view all reports" ON daily_reports;
DROP POLICY IF EXISTS "Admins can delete all reports" ON daily_reports;

-- 관리자는 모든 보고서를 볼 수 있음 (업데이트된 정책)
CREATE POLICY "Admins can view all reports" ON daily_reports
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자는 모든 보고서를 삭제할 수 있음 (업데이트된 정책)
CREATE POLICY "Admins can delete all reports" ON daily_reports
  FOR DELETE USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR
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

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 새 사용자 생성 시 자동으로 프로필 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 기존 사용자들의 프로필 생성 (이미 존재하는 경우 무시)
INSERT INTO user_profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  CASE 
    WHEN email = 'jakeseol99@keduall.com' THEN 'admin'
    ELSE 'user'
  END
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;