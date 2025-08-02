-- 1. Create workflow_steps table
CREATE TABLE IF NOT EXISTS public.workflow_steps (
    step INT PRIMARY KEY,
    name TEXT NOT NULL
);

-- 2. Insert workflow step data (if it doesn't exist)
INSERT INTO public.workflow_steps (step, name) VALUES
(1, '컨셉 정의'),
(2, '기능 기획'),
(3, '기술 설계'),
(4, '개발 계획'),
(5, '테스트 계획'),
(6, '배포 준비'),
(7, '운영 계획'),
(8, '마케팅 전략'),
(9, '사업화 계획')
ON CONFLICT (step) DO NOTHING;


-- 3. Create the function
CREATE OR REPLACE FUNCTION get_conversation_summaries(p_project_id UUID, p_user_id UUID)
RETURNS TABLE (
    id UUID,
    workflow_step INT,
    step_name TEXT,
    message_count INT,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ac.id,
        ac.workflow_step,
        ws.name as step_name,
        jsonb_array_length(ac.messages) as message_count,
        ac.updated_at as last_activity,
        ac.created_at
    FROM
        ai_conversations ac
    LEFT JOIN
        public.workflow_steps ws ON ac.workflow_step = ws.step
    WHERE
        ac.project_id = p_project_id AND ac.user_id = p_user_id
    ORDER BY
        ac.workflow_step ASC;
END;
$$;
