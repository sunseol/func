-- 기존 정책들을 모두 삭제하고 순환 참조 없는 정책으로 재생성

-- user_profiles 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_profiles;

-- daily_reports 테이블의 관리자 정책 삭제 (순환 참조 제거)
DROP POLICY IF EXISTS "Admins can view all reports" ON daily_reports;
DROP POLICY IF EXISTS "Admins can delete all reports" ON daily_reports;

-- 순환 참조 없는 새로운 정책들 생성

-- 1. user_profiles 테이블 정책 (순환 참조 없음)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 최고 관리자만 모든 프로필을 볼 수 있음 (순환 참조 제거)
CREATE POLICY "Super admin can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com'
  );

-- 최고 관리자만 다른 사용자의 role을 변경할 수 있음 (순환 참조 제거)
CREATE POLICY "Super admin can update user roles" ON user_profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com'
  );

-- 2. daily_reports 테이블 정책 (단순화)
CREATE POLICY "Admins can view all reports" ON daily_reports
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com'
  );

CREATE POLICY "Admins can delete all reports" ON daily_reports
  FOR DELETE USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com'
  );