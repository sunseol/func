REVOKE ALL ON TABLE
  public.project_members_with_profiles,
  public.projects_with_counts,
  public.projects_with_creator,
  public.planning_documents_with_users,
  public.pending_approval_documents,
  public.document_approval_history_with_users
FROM anon, PUBLIC;

GRANT SELECT ON TABLE
  public.project_members_with_profiles,
  public.projects_with_counts,
  public.projects_with_creator,
  public.planning_documents_with_users,
  public.pending_approval_documents,
  public.document_approval_history_with_users
TO authenticated, service_role;
