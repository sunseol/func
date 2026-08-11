ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaboration_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activity_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.user_profiles,
  public.projects,
  public.project_members,
  public.planning_documents,
  public.document_versions,
  public.ai_conversations,
  public.document_approval_history,
  public.project_activities,
  public.project_collaboration_stats,
  public.member_activity_summary,
  public.daily_reports,
  public.draft_reports,
  public.notification_settings,
  public.notification_history
FROM anon, PUBLIC;

GRANT ALL ON TABLE
  public.user_profiles,
  public.projects,
  public.project_members,
  public.planning_documents,
  public.document_versions,
  public.ai_conversations,
  public.document_approval_history,
  public.project_activities,
  public.project_collaboration_stats,
  public.member_activity_summary,
  public.daily_reports,
  public.draft_reports,
  public.notification_settings,
  public.notification_history
TO service_role;

GRANT SELECT, UPDATE ON TABLE public.user_profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.projects,
  public.project_members,
  public.planning_documents,
  public.daily_reports,
  public.draft_reports,
  public.notification_settings,
  public.notification_history
TO authenticated;

GRANT SELECT, DELETE ON TABLE public.ai_conversations TO authenticated;

GRANT SELECT ON TABLE
  public.document_versions,
  public.document_approval_history,
  public.project_activities,
  public.project_collaboration_stats,
  public.member_activity_summary
TO authenticated;

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

DO $$
DECLARE
  qualified_sequence_name TEXT;
  application_tables CONSTANT TEXT[] := ARRAY[
    'user_profiles', 'projects', 'project_members', 'planning_documents',
    'document_versions', 'ai_conversations', 'document_approval_history',
    'project_activities', 'project_collaboration_stats', 'member_activity_summary',
    'daily_reports', 'draft_reports', 'notification_settings', 'notification_history'
  ];
BEGIN
  FOR qualified_sequence_name IN
    SELECT format('%I.%I', s.sequence_schema, s.sequence_name)
    FROM information_schema.sequences AS s
    WHERE s.sequence_schema = 'public'
      AND s.sequence_name IN (
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_depend d ON d.objid = c.oid AND d.deptype IN ('a', 'i')
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_namespace tn ON tn.oid = t.relnamespace
        WHERE c.relkind = 'S'
          AND n.nspname = 'public'
          AND tn.nspname = 'public'
          AND t.relname = ANY (application_tables)
      )
  LOOP
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %s TO service_role', qualified_sequence_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', qualified_sequence_name);
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon, PUBLIC', qualified_sequence_name);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.log_project_activity(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.initialize_project_stats(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_project_activity(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_project_stats(UUID) TO service_role;
