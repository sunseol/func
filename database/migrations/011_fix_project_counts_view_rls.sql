CREATE OR REPLACE VIEW projects_with_counts AS
SELECT
    p.*,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
    (SELECT COUNT(*) FROM planning_documents d WHERE d.project_id = p.id AND d.status = 'official') AS official_document_count,
    creator.email as creator_email,
    creator.full_name as creator_name
FROM
    projects p
JOIN
    user_profiles creator ON p.created_by = creator.id;

ALTER VIEW projects_with_counts SET (security_invoker = true);