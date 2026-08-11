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
  SELECT * INTO target_document
  FROM public.planning_documents
  WHERE id = p_document_id
  FOR UPDATE;
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
  SELECT * INTO target_document
  FROM public.planning_documents
  WHERE id = p_document_id
  FOR UPDATE;
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

REVOKE ALL ON FUNCTION public.approve_document_and_demote_old_official(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_document_approval(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_document_and_demote_old_official(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_document_approval(UUID, UUID) TO authenticated;
