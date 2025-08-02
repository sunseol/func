-- 알림 설정 테이블 생성
CREATE TABLE notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  morning_reminder_enabled BOOLEAN DEFAULT true,
  morning_reminder_time TIME DEFAULT '09:00:00',
  evening_reminder_enabled BOOLEAN DEFAULT true,
  evening_reminder_time TIME DEFAULT '18:00:00',
  weekend_reminders BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT false,
  browser_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 히스토리 테이블 생성
CREATE TABLE notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'morning_reminder', 'evening_reminder', 'report_completed'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_notification_history_is_read ON notification_history(is_read);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- 알림 설정 RLS 정책
CREATE POLICY "Users can view own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- 알림 히스토리 RLS 정책
CREATE POLICY "Users can view own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification history" ON notification_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification history" ON notification_history
  FOR UPDATE USING (auth.uid() = user_id);

-- 관리자는 모든 알림 데이터를 볼 수 있음
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

-- 사용자 프로필 생성 시 기본 알림 설정 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 사용자 생성 시 자동으로 알림 설정 생성
CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_notification_settings();