CREATE OR REPLACE FUNCTION get_projects_for_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    name VARCHAR(255),
    description TEXT,
    created_by UUID,
    member_count BIGINT,
    official_document_count BIGINT,
    creator_email VARCHAR(255),
    creator_name VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.created_at,
        p.name,
        p.description,
        p.created_by,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM planning_documents d WHERE d.project_id = p.id AND d.status = 'official') AS official_document_count,
        creator.email as creator_email,
        creator.full_name as creator_name
    FROM
        projects p
    JOIN
        public.user_profiles creator ON p.created_by = creator.id
    WHERE
        p.id IN (SELECT project_id FROM project_members pm WHERE pm.user_id = p_user_id)
    ORDER BY p.created_at DESC;
END;
$$;