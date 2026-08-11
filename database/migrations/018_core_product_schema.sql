ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('morning', 'evening', 'weekly')),
  user_name_snapshot VARCHAR(255) NOT NULL,
  report_content TEXT NOT NULL,
  projects_data JSONB,
  misc_tasks_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS report_date DATE,
  ADD COLUMN IF NOT EXISTS report_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS user_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS report_content TEXT,
  ADD COLUMN IF NOT EXISTS projects_data JSONB,
  ADD COLUMN IF NOT EXISTS misc_tasks_data JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.draft_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE,
  report_type VARCHAR(20) CHECK (report_type IN ('morning', 'evening', 'weekly')),
  user_name_snapshot VARCHAR(255),
  report_content TEXT,
  projects_data JSONB,
  misc_tasks_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.draft_reports
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS report_date DATE,
  ADD COLUMN IF NOT EXISTS report_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS user_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS report_content TEXT,
  ADD COLUMN IF NOT EXISTS projects_data JSONB,
  ADD COLUMN IF NOT EXISTS misc_tasks_data JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  morning_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  morning_reminder_time TIME NOT NULL DEFAULT '09:00:00',
  evening_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  evening_reminder_time TIME NOT NULL DEFAULT '18:00:00',
  weekend_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  browser_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS morning_reminder_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS morning_reminder_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS evening_reminder_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS evening_reminder_time TIME DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS weekend_reminders BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS browser_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notification_history
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date
  ON public.daily_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_at
  ON public.daily_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draft_reports_user_date
  ON public.draft_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_draft_reports_created_at
  ON public.draft_reports(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id
  ON public.notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_sent
  ON public.notification_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_unread
  ON public.notification_history(user_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_reports_select ON public.daily_reports;
DROP POLICY IF EXISTS daily_reports_insert ON public.daily_reports;
DROP POLICY IF EXISTS daily_reports_update ON public.daily_reports;
DROP POLICY IF EXISTS daily_reports_delete ON public.daily_reports;
CREATE POLICY daily_reports_select ON public.daily_reports
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY daily_reports_insert ON public.daily_reports
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY daily_reports_update ON public.daily_reports
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY daily_reports_delete ON public.daily_reports
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS draft_reports_select ON public.draft_reports;
DROP POLICY IF EXISTS draft_reports_insert ON public.draft_reports;
DROP POLICY IF EXISTS draft_reports_update ON public.draft_reports;
DROP POLICY IF EXISTS draft_reports_delete ON public.draft_reports;
CREATE POLICY draft_reports_select ON public.draft_reports
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY draft_reports_insert ON public.draft_reports
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY draft_reports_update ON public.draft_reports
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY draft_reports_delete ON public.draft_reports
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS notification_settings_select ON public.notification_settings;
DROP POLICY IF EXISTS notification_settings_insert ON public.notification_settings;
DROP POLICY IF EXISTS notification_settings_update ON public.notification_settings;
DROP POLICY IF EXISTS notification_settings_delete ON public.notification_settings;
CREATE POLICY notification_settings_select ON public.notification_settings
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY notification_settings_insert ON public.notification_settings
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY notification_settings_update ON public.notification_settings
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY notification_settings_delete ON public.notification_settings
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS notification_history_select ON public.notification_history;
DROP POLICY IF EXISTS notification_history_insert ON public.notification_history;
DROP POLICY IF EXISTS notification_history_update ON public.notification_history;
DROP POLICY IF EXISTS notification_history_delete ON public.notification_history;
CREATE POLICY notification_history_select ON public.notification_history
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY notification_history_insert ON public.notification_history
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY notification_history_update ON public.notification_history
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY notification_history_delete ON public.notification_history
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.core_product_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS daily_reports_set_updated_at ON public.daily_reports;
CREATE TRIGGER daily_reports_set_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.core_product_set_updated_at();
DROP TRIGGER IF EXISTS draft_reports_set_updated_at ON public.draft_reports;
CREATE TRIGGER draft_reports_set_updated_at
  BEFORE UPDATE ON public.draft_reports
  FOR EACH ROW EXECUTE FUNCTION public.core_product_set_updated_at();
DROP TRIGGER IF EXISTS notification_settings_set_updated_at ON public.notification_settings;
CREATE TRIGGER notification_settings_set_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.core_product_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notification_settings(user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_settings();

INSERT INTO public.notification_settings(user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.draft_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_history TO authenticated;
GRANT ALL ON TABLE public.daily_reports, public.draft_reports,
  public.notification_settings, public.notification_history TO service_role;

REVOKE ALL ON FUNCTION public.core_product_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user_notification_settings() FROM PUBLIC;
