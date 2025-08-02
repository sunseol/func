-- 알림 테이블 존재 여부 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notification_settings', 'notification_history');

-- 알림 설정 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notification_settings'
ORDER BY ordinal_position;

-- 알림 히스토리 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notification_history'
ORDER BY ordinal_position;

-- 현재 사용자의 알림 설정 확인 (있다면)
SELECT * FROM notification_settings LIMIT 5;

-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('notification_settings', 'notification_history');