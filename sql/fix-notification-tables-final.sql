-- 1. notification_settings 테이블 수정
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- notification_settings에 Primary Key 추가
ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);
ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_user_id_unique UNIQUE (user_id);

-- 2. notification_history 테이블 수정
ALTER TABLE notification_history 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- notification_history에 Primary Key 추가
ALTER TABLE notification_history ADD CONSTRAINT notification_history_pkey PRIMARY KEY (id);

-- 3. 기존 레코드에 ID 생성 (이미 있는 데이터용)
UPDATE notification_settings SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE notification_history SET id = gen_random_uuid() WHERE id IS NULL;

-- 4. RLS 활성화
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- 5. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can view own notification history" ON notification_history;
DROP POLICY IF EXISTS "Users can insert own notification history" ON notification_history;
DROP POLICY IF EXISTS "Users can update own notification history" ON notification_history;
DROP POLICY IF EXISTS "Admins can view all notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Admins can view all notification history" ON notification_history;

-- 6. 알림 설정 RLS 정책
CREATE POLICY "Users can view own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. 알림 히스토리 RLS 정책
CREATE POLICY "Users can view own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification history" ON notification_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification history" ON notification_history
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. 관리자는 모든 알림 데이터를 볼 수 있음
CREATE POLICY "Admins can view all notification settings" ON notification_settings
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all notification history" ON notification_history
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'jakeseol99@keduall.com' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 9. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_is_read ON notification_history(is_read);

-- 10. 확인 쿼리
SELECT 'notification_settings' as table_name, count(*) as row_count FROM notification_settings
UNION ALL
SELECT 'notification_history' as table_name, count(*) as row_count FROM notification_history;

-- 11. 컬럼 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('notification_settings', 'notification_history')
ORDER BY table_name, ordinal_position;