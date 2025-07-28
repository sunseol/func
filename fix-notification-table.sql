-- 현재 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notification_settings'
ORDER BY ordinal_position;

-- 누락된 컬럼들 추가 (이미 존재하면 오류가 나지만 무시해도 됩니다)
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false;

ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS browser_notifications BOOLEAN DEFAULT true;

-- 테이블 구조 다시 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notification_settings'
ORDER BY ordinal_position;