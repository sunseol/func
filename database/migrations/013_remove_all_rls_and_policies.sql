-- Purge all RLS policies and disable RLS on all relevant tables
DO $$
DECLARE
    table_name TEXT;
    policy_name TEXT;
BEGIN
    -- List of all tables that might have RLS policies
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename IN (
            'projects', 
            'project_members', 
            'planning_documents', 
            'document_versions', 
            'ai_conversations', 
            'user_profiles', 
            'document_approval_history',
            'project_activities',
            'project_collaboration_stats',
            'member_activity_summary',
            'notification_settings',
            'notification_history',
            'daily_reports',
            'draft_reports'
        )
    LOOP
        -- Drop all policies on the table
        FOR policy_name IN
            SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public."' || table_name || '";';
            RAISE NOTICE 'Dropped policy "%" on table "%"', policy_name, table_name;
        END LOOP;

        -- Disable RLS on the table
        EXECUTE 'ALTER TABLE public."' || table_name || '" DISABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Disabled RLS on table "%"', table_name;
    END LOOP;

    RAISE NOTICE 'Successfully removed all specified RLS policies and disabled RLS on all relevant tables.';
END;
$$;
