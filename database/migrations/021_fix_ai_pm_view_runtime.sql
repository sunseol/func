CREATE OR REPLACE FUNCTION public.get_project_progress(project_uuid UUID)
RETURNS TABLE (
  workflow_step INTEGER,
  step_name VARCHAR(100),
  has_official_document BOOLEAN,
  document_count INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH workflow_steps AS (
    SELECT workflow.step_num,
      CASE workflow.step_num
        WHEN 1 THEN '서비스 개요 및 목표 설정'
        WHEN 2 THEN '타겟 사용자 분석'
        WHEN 3 THEN '핵심 기능 정의'
        WHEN 4 THEN '사용자 경험 설계'
        WHEN 5 THEN '기술 스택 및 아키텍처'
        WHEN 6 THEN '개발 일정 및 마일스톤'
        WHEN 7 THEN '리스크 분석 및 대응 방안'
        WHEN 8 THEN '성과 지표 및 측정 방법'
        WHEN 9 THEN '런칭 및 마케팅 전략'
      END::VARCHAR(100) AS step_name
    FROM generate_series(1, 9) AS workflow(step_num)
  ),
  document_stats AS (
    SELECT
      pd.workflow_step,
      COUNT(*) AS doc_count,
      MAX(CASE WHEN pd.status = 'official' THEN 1 ELSE 0 END) = 1 AS has_official,
      MAX(pd.updated_at) AS last_update
    FROM public.planning_documents pd
    WHERE pd.project_id = project_uuid
    GROUP BY pd.workflow_step
  )
  SELECT
    ws.step_num,
    ws.step_name,
    COALESCE(ds.has_official, false),
    COALESCE(ds.doc_count, 0)::INTEGER,
    ds.last_update
  FROM workflow_steps ws
  LEFT JOIN document_stats ds ON ws.step_num = ds.workflow_step
  ORDER BY ws.step_num;
END;
$$;

CREATE OR REPLACE VIEW public.projects_with_counts AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM public.project_members pm WHERE pm.project_id = p.id) AS member_count,
  (SELECT COUNT(*) FROM public.planning_documents d WHERE d.project_id = p.id AND d.status = 'official') AS official_document_count,
  creator.email AS creator_email,
  creator.full_name AS creator_name
FROM public.projects p
LEFT JOIN public.user_profiles creator ON creator.id = p.created_by;

ALTER VIEW public.projects_with_counts SET (security_invoker = true);

CREATE OR REPLACE VIEW public.projects_with_creator AS
SELECT
  p.id,
  p.name,
  p.description,
  p.created_by,
  p.created_at,
  p.updated_at,
  creator.email AS creator_email,
  creator.full_name AS creator_name
FROM public.projects p
LEFT JOIN public.user_profiles creator ON creator.id = p.created_by;

ALTER VIEW public.projects_with_creator SET (security_invoker = true);

REVOKE ALL ON TABLE
  public.projects_with_counts,
  public.projects_with_creator
FROM anon, PUBLIC;

GRANT SELECT ON TABLE
  public.projects_with_counts,
  public.projects_with_creator
TO authenticated, service_role;
