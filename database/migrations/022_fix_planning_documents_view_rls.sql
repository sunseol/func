CREATE OR REPLACE VIEW public.planning_documents_with_users AS
SELECT
  pd.id,
  pd.project_id,
  pd.workflow_step,
  pd.title,
  pd.content,
  pd.status,
  pd.version,
  pd.created_by,
  pd.approved_by,
  pd.created_at,
  pd.updated_at,
  pd.approved_at,
  creator.email AS creator_email,
  creator.full_name AS creator_name,
  approver.email AS approver_email,
  approver.full_name AS approver_name
FROM public.planning_documents pd
LEFT JOIN public.user_profiles creator ON creator.id = pd.created_by
LEFT JOIN public.user_profiles approver ON approver.id = pd.approved_by;

ALTER VIEW public.planning_documents_with_users SET (security_invoker = true);
