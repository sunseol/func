ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
UPDATE public.project_members
SET role = CASE role
  WHEN '콘텐츠기획' THEN 'content_planning'
  WHEN '서비스기획' THEN 'service_planning'
  WHEN 'UIUX기획' THEN 'ux_planning'
  WHEN '개발자' THEN 'developer'
  ELSE role
END;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_members'::regclass
      AND conname = 'project_members_role_check'
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_role_check
      CHECK (role IN ('content_planning', 'service_planning', 'ux_planning', 'developer'));
  END IF;
END $$;

DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'user_profiles', 'projects', 'project_members', 'planning_documents',
      'document_versions', 'ai_conversations', 'document_approval_history',
      'project_activities', 'project_collaboration_stats', 'member_activity_summary',
      'notification_settings', 'notification_history', 'daily_reports', 'draft_reports'
    ])
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;
    FOR policy_name IN
      SELECT polname FROM pg_policy
      WHERE polrelid = format('public.%I', table_name)::regclass
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  step INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO public.workflow_steps(step, name) VALUES
  (1, '컨셉 정의'), (2, '기능 기획'), (3, '기술 설계'), (4, '개발 계획'),
  (5, '테스트 계획'), (6, '배포 준비'), (7, '운영 계획'), (8, '마케팅 전략'),
  (9, '사업화 계획')
ON CONFLICT (step) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_shared_project_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members viewer
    JOIN public.project_members target ON target.project_id = viewer.project_id
    WHERE viewer.user_id = auth.uid() AND target.user_id = p_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_approve_document(
  user_uuid UUID,
  project_uuid UUID,
  workflow_step_num INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  member_role TEXT;
BEGIN
  IF auth.uid() IS NULL OR user_uuid IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;
  SELECT role INTO member_role
  FROM public.project_members
  WHERE project_id = project_uuid AND user_id = auth.uid();
  RETURN CASE
    WHEN workflow_step_num IN (1, 2, 3, 6, 7, 8) THEN member_role = 'service_planning'
    WHEN workflow_step_num = 4 THEN member_role = 'ux_planning'
    WHEN workflow_step_num = 5 THEN member_role = 'developer'
    WHEN workflow_step_num = 9 THEN member_role IN ('content_planning', 'service_planning')
    ELSE FALSE
  END;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_document_identity_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.workflow_step IS DISTINCT FROM OLD.workflow_step
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'document identity fields are immutable';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_conversation_identity_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.workflow_step IS DISTINCT FROM OLD.workflow_step
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'conversation identity fields are immutable';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_approval_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
  END IF;
  IF NEW.status IS DISTINCT FROM 'official' THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS enforce_document_identity_immutable ON public.planning_documents;
CREATE TRIGGER enforce_document_identity_immutable
  BEFORE UPDATE ON public.planning_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_document_identity_immutable();

DROP TRIGGER IF EXISTS enforce_conversation_identity_immutable ON public.ai_conversations;
CREATE TRIGGER enforce_conversation_identity_immutable
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_identity_immutable();

DROP TRIGGER IF EXISTS enforce_approval_metadata ON public.planning_documents;
CREATE TRIGGER enforce_approval_metadata
  BEFORE INSERT OR UPDATE ON public.planning_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_approval_metadata();

CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin() OR public.is_shared_project_user(id));
CREATE POLICY user_profiles_update_self ON public.user_profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = 'user');
CREATE POLICY user_profiles_update_admin ON public.user_profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY projects_select ON public.projects
  FOR SELECT USING (public.is_project_member(id) OR public.is_admin());
CREATE POLICY projects_insert ON public.projects
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY projects_update ON public.projects
  FOR UPDATE USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());
CREATE POLICY projects_delete ON public.projects
  FOR DELETE USING (public.is_admin());

CREATE POLICY project_members_select ON public.project_members
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_admin());
CREATE POLICY project_members_insert ON public.project_members
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  );
CREATE POLICY project_members_update ON public.project_members
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  ) WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  );
CREATE POLICY project_members_delete ON public.project_members
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  );

CREATE POLICY planning_documents_select ON public.planning_documents
  FOR SELECT USING (
    (created_by = auth.uid() AND public.is_project_member(project_id))
    OR public.is_admin()
    OR (status = 'official' AND public.is_project_member(project_id))
    OR (status = 'pending_approval' AND public.can_approve_document(auth.uid(), project_id, workflow_step))
  );
CREATE POLICY planning_documents_insert ON public.planning_documents
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND status = 'private'
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND (public.is_admin() OR public.is_project_member(project_id))
  );
CREATE POLICY planning_documents_update ON public.planning_documents
  FOR UPDATE USING ((created_by = auth.uid() AND status = 'private' AND public.is_project_member(project_id)) OR public.is_admin())
  WITH CHECK ((created_by = auth.uid() AND status = 'private' AND public.is_project_member(project_id)) OR public.is_admin());
CREATE POLICY planning_documents_delete ON public.planning_documents
  FOR DELETE USING ((created_by = auth.uid() AND status = 'private' AND public.is_project_member(project_id)) OR public.is_admin());

CREATE POLICY document_versions_select ON public.document_versions
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.planning_documents pd
      WHERE pd.id = document_id
        AND (
          (pd.created_by = auth.uid() AND public.is_project_member(pd.project_id))
          OR (pd.status = 'official' AND public.is_project_member(pd.project_id))
          OR (pd.status = 'pending_approval' AND public.can_approve_document(auth.uid(), pd.project_id, pd.workflow_step))
        )
    )
  );

CREATE POLICY ai_conversations_select ON public.ai_conversations
  FOR SELECT USING (public.is_admin() OR (user_id = auth.uid() AND public.is_project_member(project_id)));
CREATE POLICY ai_conversations_insert ON public.ai_conversations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (public.is_project_member(project_id) OR public.is_admin())
  );
CREATE POLICY ai_conversations_update ON public.ai_conversations
  FOR UPDATE USING ((user_id = auth.uid() AND public.is_project_member(project_id)) OR public.is_admin())
  WITH CHECK ((user_id = auth.uid() AND public.is_project_member(project_id)) OR public.is_admin());
CREATE POLICY ai_conversations_delete ON public.ai_conversations
  FOR DELETE USING (public.is_admin() OR (user_id = auth.uid() AND public.is_project_member(project_id)));

CREATE POLICY document_approval_history_select ON public.document_approval_history
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.planning_documents pd
      WHERE pd.id = document_id
        AND (
          (pd.created_by = auth.uid() AND public.is_project_member(pd.project_id))
          OR (pd.status = 'official' AND public.is_project_member(pd.project_id))
          OR (pd.status = 'pending_approval' AND public.can_approve_document(auth.uid(), pd.project_id, pd.workflow_step))
        )
    )
  );

CREATE POLICY project_activities_select ON public.project_activities
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_admin());
CREATE POLICY project_collaboration_stats_select ON public.project_collaboration_stats
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_admin());
CREATE POLICY member_activity_summary_select ON public.member_activity_summary
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_admin());

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOR target_table IN SELECT unnest(ARRAY['notification_settings', 'notification_history', 'daily_reports', 'draft_reports'])
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns AS c
         WHERE c.table_schema = 'public' AND c.table_name = target_table AND c.column_name = 'user_id'
       ) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (user_id = auth.uid() OR public.is_admin())', target_table || '_select', target_table);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin())', target_table || '_insert', target_table);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin())', target_table || '_update', target_table);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (user_id = auth.uid() OR public.is_admin())', target_table || '_delete', target_table);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_document_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title
     OR OLD.content IS DISTINCT FROM NEW.content
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
     OR OLD.approved_at IS DISTINCT FROM NEW.approved_at THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    INSERT INTO public.document_versions (document_id, version, content, created_by)
    VALUES (NEW.id, NEW.version, NEW.content, COALESCE(auth.uid(), NEW.created_by))
    ON CONFLICT (document_id, version) DO UPDATE
      SET content = EXCLUDED.content, created_by = EXCLUDED.created_by;
  ELSE
    NEW.version := OLD.version;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.create_initial_document_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.document_versions (document_id, version, content, created_by)
  VALUES (NEW.id, 1, NEW.content, COALESCE(auth.uid(), NEW.created_by))
  ON CONFLICT (document_id, version) DO NOTHING;
  RETURN NEW;
END
$$;

DROP INDEX IF EXISTS public.idx_document_versions_doc_version;
DELETE FROM public.document_versions older
USING public.document_versions newer
WHERE older.document_id = newer.document_id
  AND older.version = newer.version
  AND older.ctid > newer.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS document_versions_document_version_key
  ON public.document_versions(document_id, version);

WITH ranked_official AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id, workflow_step
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
  ) AS row_number
  FROM public.planning_documents
  WHERE status = 'official'
)
UPDATE public.planning_documents pd
SET status = 'private', updated_at = NOW()
FROM ranked_official ro
WHERE pd.id = ro.id AND ro.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS planning_documents_one_official_per_project_step
  ON public.planning_documents(project_id, workflow_step)
  WHERE status = 'official';

CREATE OR REPLACE FUNCTION public.create_approval_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'private' AND NEW.status = 'pending_approval' THEN
      INSERT INTO public.document_approval_history(document_id, user_id, action, previous_status, new_status)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.created_by), 'requested', OLD.status, NEW.status);
    ELSIF OLD.status = 'pending_approval' AND NEW.status = 'official' THEN
      INSERT INTO public.document_approval_history(document_id, user_id, action, previous_status, new_status)
      VALUES (NEW.id, COALESCE(NEW.approved_by, auth.uid(), NEW.created_by), 'approved', OLD.status, NEW.status);
    ELSIF OLD.status = 'pending_approval' AND NEW.status = 'private' THEN
      INSERT INTO public.document_approval_history(document_id, user_id, action, previous_status, new_status)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.created_by), 'rejected', OLD.status, NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE VIEW public.pending_approval_documents AS
SELECT
  pd.id, pd.project_id, pd.workflow_step, pd.title, pd.content, pd.version,
  pd.created_by, pd.created_at, pd.updated_at, p.name AS project_name,
  creator.email AS creator_email, creator.full_name AS creator_name,
  CASE pd.workflow_step
    WHEN 1 THEN 'service_planning'
    WHEN 2 THEN 'service_planning'
    WHEN 3 THEN 'service_planning'
    WHEN 4 THEN 'ux_planning'
    WHEN 5 THEN 'developer'
    WHEN 6 THEN 'service_planning'
    WHEN 7 THEN 'service_planning'
    WHEN 8 THEN 'service_planning'
    WHEN 9 THEN 'content_planning,service_planning'
  END AS required_approver_role
FROM public.planning_documents pd
JOIN public.projects p ON p.id = pd.project_id
JOIN public.user_profiles creator ON creator.id = pd.created_by
WHERE pd.status = 'pending_approval';

CREATE OR REPLACE VIEW public.project_members_with_profiles AS
SELECT
  pm.id, pm.project_id, pm.user_id, pm.role, pm.added_by, pm.added_at,
  up.email::VARCHAR(255) AS email, up.full_name::TEXT AS full_name, up.role AS user_role
FROM public.project_members pm
JOIN public.user_profiles up ON up.id = pm.user_id;

ALTER VIEW public.project_members_with_profiles SET (security_invoker = true);
ALTER VIEW public.projects_with_creator SET (security_invoker = true);
ALTER VIEW public.planning_documents_with_users SET (security_invoker = true);
ALTER VIEW public.pending_approval_documents SET (security_invoker = true);
ALTER VIEW public.document_approval_history_with_users SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.request_document_approval(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS SETOF public.planning_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_document public.planning_documents;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated identity mismatch';
  END IF;
  UPDATE public.planning_documents
  SET status = 'pending_approval', updated_at = NOW()
  WHERE id = p_document_id
    AND created_by = auth.uid()
    AND status = 'private'
    AND (public.is_project_member(project_id) OR public.is_admin())
  RETURNING * INTO updated_document;
  IF FOUND THEN RETURN NEXT updated_document; END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.approve_document_and_demote_old_official(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS SETOF public.planning_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_document public.planning_documents;
  project_uuid UUID;
  workflow_step_num INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated identity mismatch';
  END IF;
  SELECT project_id, workflow_step
  INTO project_uuid, workflow_step_num
  FROM public.planning_documents
  WHERE id = p_document_id;
  IF project_uuid IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.can_approve_document(auth.uid(), project_uuid, workflow_step_num) THEN
    RETURN;
  END IF;
  PERFORM 1 FROM public.projects WHERE id = project_uuid FOR UPDATE;
  SELECT * INTO target_document FROM public.planning_documents WHERE id = p_document_id FOR UPDATE;
  IF target_document.id IS NULL THEN
    RETURN;
  END IF;
  IF target_document.status IS DISTINCT FROM 'pending_approval' THEN
    RETURN;
  END IF;
  UPDATE public.planning_documents
  SET status = 'private', updated_at = NOW()
  WHERE project_id = project_uuid
    AND workflow_step = target_document.workflow_step
    AND status = 'official'
    AND id <> p_document_id;
  UPDATE public.planning_documents
  SET status = 'official', approved_by = auth.uid(), approved_at = NOW(), updated_at = NOW()
  WHERE id = p_document_id
  RETURNING * INTO target_document;
  RETURN NEXT target_document;
END
$$;

CREATE OR REPLACE FUNCTION public.withdraw_document_approval(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS SETOF public.planning_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_document public.planning_documents;
  project_uuid UUID;
  creator_uuid UUID;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated identity mismatch';
  END IF;
  SELECT project_id, created_by
  INTO project_uuid, creator_uuid
  FROM public.planning_documents
  WHERE id = p_document_id;
  IF project_uuid IS NULL THEN
    RETURN;
  END IF;
  IF NOT (
    public.is_admin()
    OR (creator_uuid = auth.uid() AND public.is_project_member(project_uuid))
  ) THEN
    RETURN;
  END IF;
  PERFORM 1 FROM public.projects WHERE id = project_uuid FOR UPDATE;
  SELECT * INTO target_document FROM public.planning_documents WHERE id = p_document_id FOR UPDATE;
  IF target_document.id IS NULL THEN
    RETURN;
  END IF;
  IF target_document.status IS DISTINCT FROM 'pending_approval' THEN
    RETURN;
  END IF;
  UPDATE public.planning_documents
  SET status = 'private', approved_by = NULL, approved_at = NULL, updated_at = NOW()
  WHERE id = p_document_id
  RETURNING * INTO target_document;
  RETURN NEXT target_document;
END
$$;

CREATE OR REPLACE FUNCTION public.create_project_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS SETOF public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  created_project public.projects;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'administrator authentication required';
  END IF;
  INSERT INTO public.projects(name, description, created_by)
  VALUES (p_name, p_description, auth.uid())
  RETURNING * INTO created_project;
  INSERT INTO public.project_members(project_id, user_id, role, added_by)
  VALUES (created_project.id, auth.uid(), 'service_planning', auth.uid());
  RETURN NEXT created_project;
END
$$;

CREATE OR REPLACE FUNCTION public.append_ai_conversation_messages(
  p_project_id UUID,
  p_workflow_step INTEGER,
  p_messages JSONB
)
RETURNS SETOF public.ai_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_row public.ai_conversations;
  result_row public.ai_conversations;
  message JSONB;
  message_role TEXT;
  message_content TEXT;
  message_index INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_project_member(p_project_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'project membership required';
  END IF;
  IF p_messages IS NULL OR jsonb_typeof(p_messages) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid conversation append payload';
  END IF;
  IF p_workflow_step NOT BETWEEN 1 AND 9
     OR jsonb_array_length(p_messages) <> 2
     OR octet_length(p_messages::TEXT) > 65536 THEN
    RAISE EXCEPTION 'invalid conversation append payload';
  END IF;
  FOR message_index IN 0..1 LOOP
    message := p_messages -> message_index;
    IF jsonb_typeof(message) IS DISTINCT FROM 'object'
       OR NOT (message ? 'id')
       OR jsonb_typeof(message -> 'id') IS DISTINCT FROM 'string'
       OR NOT (message ? 'role')
       OR jsonb_typeof(message -> 'role') IS DISTINCT FROM 'string'
       OR NOT (message ? 'content')
       OR jsonb_typeof(message -> 'content') IS DISTINCT FROM 'string'
       OR NOT (message ? 'timestamp')
       OR jsonb_typeof(message -> 'timestamp') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'invalid conversation message shape';
    END IF;
    message_role := message ->> 'role';
    IF (message_index = 0 AND message_role IS DISTINCT FROM 'user')
       OR (message_index = 1 AND message_role IS DISTINCT FROM 'assistant')
       OR octet_length(message::TEXT) > 32768 THEN
      RAISE EXCEPTION 'invalid conversation message role or size';
    END IF;
    message_content := message ->> 'content';
    IF octet_length(message ->> 'id') > 256
       OR octet_length(message ->> 'timestamp') > 256
       OR octet_length(message_content) > 32768 THEN
      RAISE EXCEPTION 'conversation message exceeds size limits';
    END IF;
    BEGIN
      PERFORM (message ->> 'timestamp')::TIMESTAMPTZ;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid conversation timestamp';
    END;
  END LOOP;
  SELECT * INTO current_row
  FROM public.ai_conversations
  WHERE project_id = p_project_id AND workflow_step = p_workflow_step AND user_id = auth.uid()
  FOR UPDATE;
  INSERT INTO public.ai_conversations(project_id, workflow_step, user_id, messages, updated_at)
  VALUES (p_project_id, p_workflow_step, auth.uid(), (
    SELECT COALESCE(jsonb_agg(value ORDER BY ord), '[]'::jsonb)
    FROM (
      SELECT value, ord
      FROM jsonb_array_elements(p_messages) WITH ORDINALITY AS items(value, ord)
      ORDER BY ord DESC
      LIMIT 100
    ) bounded
  ), NOW())
  ON CONFLICT (project_id, workflow_step, user_id) DO UPDATE
  SET messages = (
    SELECT COALESCE(jsonb_agg(value ORDER BY ord), '[]'::jsonb)
    FROM (
      SELECT value, ord
      FROM jsonb_array_elements(public.ai_conversations.messages || p_messages) WITH ORDINALITY AS items(value, ord)
      ORDER BY ord DESC
      LIMIT 100
    ) bounded
  ),
      updated_at = NOW()
  RETURNING * INTO result_row;
  RETURN NEXT result_row;
END
$$;

CREATE OR REPLACE FUNCTION public.get_projects_for_user(p_user_id UUID)
RETURNS TABLE (
  id UUID, created_at TIMESTAMPTZ, name VARCHAR(255), description TEXT,
  created_by UUID, member_count BIGINT, official_document_count BIGINT,
  creator_email VARCHAR(255), creator_name VARCHAR(255)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated identity mismatch';
  END IF;
  RETURN QUERY
  SELECT p.id, p.created_at, p.name, p.description, p.created_by,
    (SELECT COUNT(*) FROM public.project_members pm WHERE pm.project_id = p.id),
    (SELECT COUNT(*) FROM public.planning_documents d WHERE d.project_id = p.id AND d.status = 'official'),
    creator.email, creator.full_name
  FROM public.projects p
  JOIN public.user_profiles creator ON creator.id = p.created_by
  WHERE public.is_project_member(p.id) OR public.is_admin()
  ORDER BY p.created_at DESC;
END
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_summaries(p_project_id UUID, p_user_id UUID)
RETURNS TABLE (
  id UUID, workflow_step INT, step_name TEXT, message_count INT,
  last_activity TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()
     OR NOT (public.is_project_member(p_project_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'conversation access denied';
  END IF;
  RETURN QUERY
  SELECT ac.id, ac.workflow_step, ws.name,
    jsonb_array_length(ac.messages)::INT, ac.updated_at, ac.created_at
  FROM public.ai_conversations ac
  LEFT JOIN public.workflow_steps ws ON ws.step = ac.workflow_step
  WHERE ac.project_id = p_project_id AND ac.user_id = auth.uid()
  ORDER BY ac.workflow_step ASC;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles(id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.log_project_activity(
  p_project_id UUID, p_user_id UUID, p_activity_type VARCHAR(50),
  p_target_type VARCHAR(20) DEFAULT NULL, p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}', p_description TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  activity_id UUID;
  actor_id UUID;
BEGIN
  actor_id := CASE WHEN auth.role() = 'service_role' THEN p_user_id ELSE auth.uid() END;
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()
       OR NOT (public.is_project_member(p_project_id) OR public.is_admin()) THEN
      RAISE EXCEPTION 'project membership required';
    END IF;
  END IF;
  INSERT INTO public.project_activities(project_id, user_id, activity_type, target_type, target_id, metadata, description)
  VALUES (p_project_id, actor_id, p_activity_type, p_target_type, p_target_id, p_metadata, p_description)
  RETURNING id INTO activity_id;
  RETURN activity_id;
END
$$;

CREATE OR REPLACE FUNCTION public.initialize_project_stats(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR NOT (public.is_project_member(p_project_id) OR public.is_admin()) THEN
      RAISE EXCEPTION 'project membership required';
    END IF;
  END IF;
  INSERT INTO public.project_collaboration_stats(project_id)
  VALUES (p_project_id) ON CONFLICT (project_id) DO NOTHING;
  UPDATE public.project_collaboration_stats
  SET total_documents = (SELECT COUNT(*) FROM public.planning_documents WHERE project_id = p_project_id),
      official_documents = (SELECT COUNT(*) FROM public.planning_documents WHERE project_id = p_project_id AND status = 'official'),
      pending_documents = (SELECT COUNT(*) FROM public.planning_documents WHERE project_id = p_project_id AND status = 'pending_approval'),
      total_members = (SELECT COUNT(*) FROM public.project_members WHERE project_id = p_project_id),
      updated_at = NOW()
  WHERE project_id = p_project_id;
END
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_shared_project_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_document_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_initial_document_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_approval_history() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_approval_metadata() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_project_with_owner(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.append_ai_conversation_messages(UUID, INTEGER, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_document_approval(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_document_and_demote_old_official(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_document_approval(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_projects_for_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_conversation_summaries(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_approve_document(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_project_activity(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.initialize_project_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shared_project_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_with_owner(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_ai_conversation_messages(UUID, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_document_approval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_document_and_demote_old_official(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_document_approval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_projects_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_summaries(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_approve_document(UUID, UUID, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.log_project_activity(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.initialize_project_stats(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_project_activity(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_project_stats(UUID) TO service_role;
