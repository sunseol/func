CREATE TABLE IF NOT EXISTS public.ai_conversation_request_claims (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workflow_step INTEGER NOT NULL CHECK (workflow_step BETWEEN 1 AND 9),
  idempotency_key UUID NOT NULL,
  user_message_id UUID NOT NULL,
  assistant_message_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  owner_token UUID,
  response_content TEXT,
  lease_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 seconds',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id, workflow_step, idempotency_key),
  UNIQUE (user_id, project_id, workflow_step, user_message_id),
  UNIQUE (user_id, project_id, workflow_step, assistant_message_id),
  CHECK (user_message_id IS DISTINCT FROM assistant_message_id),
  CHECK (status <> 'completed' OR response_content IS NOT NULL)
);

ALTER TABLE public.ai_conversation_request_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_conversation_request_claims_owner ON public.ai_conversation_request_claims;
CREATE POLICY ai_conversation_request_claims_owner ON public.ai_conversation_request_claims
  FOR ALL USING (user_id = auth.uid() AND public.is_project_member(project_id))
  WITH CHECK (user_id = auth.uid() AND public.is_project_member(project_id));

REVOKE ALL ON TABLE public.ai_conversation_request_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_conversation_request_claims TO service_role;

CREATE OR REPLACE FUNCTION public.claim_ai_conversation_request(
  p_project_id UUID,
  p_workflow_step INTEGER,
  p_idempotency_key UUID,
  p_user_message_id UUID,
  p_assistant_message_id UUID,
  p_owner_token UUID
)
RETURNS TABLE(status TEXT, owner_token UUID, response_content TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claim_row public.ai_conversation_request_claims;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_member(p_project_id) THEN
    RAISE EXCEPTION 'project membership required';
  END IF;
  IF p_workflow_step NOT BETWEEN 1 AND 9
     OR p_idempotency_key IS NULL
     OR p_user_message_id IS NULL
     OR p_assistant_message_id IS NULL
     OR p_user_message_id = p_assistant_message_id
     OR p_owner_token IS NULL THEN
    RAISE EXCEPTION 'invalid conversation request claim payload';
  END IF;

  INSERT INTO public.ai_conversation_request_claims AS claims(
      user_id, project_id, workflow_step, idempotency_key,
      user_message_id, assistant_message_id, status, owner_token, lease_until
  ) VALUES (
      auth.uid(), p_project_id, p_workflow_step, p_idempotency_key,
      p_user_message_id, p_assistant_message_id, 'pending', p_owner_token,
      NOW() + INTERVAL '30 seconds'
  )
  ON CONFLICT DO NOTHING
  RETURNING claims.user_id, claims.project_id, claims.workflow_step, claims.idempotency_key,
            claims.user_message_id, claims.assistant_message_id, claims.status, claims.owner_token,
            claims.response_content, claims.lease_until, claims.created_at, claims.updated_at
  INTO claim_row;

  IF FOUND THEN
    status := 'owner';
    owner_token := p_owner_token;
    response_content := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO claim_row
  FROM public.ai_conversation_request_claims AS claims
    WHERE claims.user_id = auth.uid()
      AND claims.project_id = p_project_id
      AND claims.workflow_step = p_workflow_step
      AND claims.idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF claim_row.user_id IS NULL THEN
    SELECT * INTO claim_row
    FROM public.ai_conversation_request_claims AS claims
    WHERE claims.user_id = auth.uid()
      AND claims.project_id = p_project_id
      AND claims.workflow_step = p_workflow_step
      AND (claims.user_message_id = p_user_message_id OR claims.assistant_message_id = p_assistant_message_id)
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF claim_row.user_id IS NULL THEN
    RAISE EXCEPTION 'conversation request claim conflict could not be resolved';
  END IF;

  IF claim_row.idempotency_key IS DISTINCT FROM p_idempotency_key
     OR claim_row.user_message_id IS DISTINCT FROM p_user_message_id
     OR claim_row.assistant_message_id IS DISTINCT FROM p_assistant_message_id THEN
    RAISE EXCEPTION 'idempotency key was already used with another message pair';
  END IF;
  IF claim_row.status = 'completed' THEN
    status := 'completed';
    owner_token := NULL;
    response_content := claim_row.response_content;
    RETURN NEXT;
    RETURN;
  END IF;
  IF claim_row.status = 'pending' AND claim_row.lease_until > NOW() THEN
    status := 'pending';
    owner_token := NULL;
    response_content := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.ai_conversation_request_claims AS claims
  SET status = 'pending', owner_token = p_owner_token,
      lease_until = NOW() + INTERVAL '30 seconds', updated_at = NOW()
  WHERE claims.user_id = auth.uid() AND claims.project_id = p_project_id
    AND claims.workflow_step = p_workflow_step AND claims.idempotency_key = p_idempotency_key;
  status := 'owner';
  owner_token := p_owner_token;
  response_content := NULL;
  RETURN NEXT;
END
$$;

CREATE OR REPLACE FUNCTION public.poll_ai_conversation_request(
  p_project_id UUID,
  p_workflow_step INTEGER,
  p_idempotency_key UUID,
  p_user_message_id UUID,
  p_assistant_message_id UUID
)
RETURNS TABLE(status TEXT, owner_token UUID, response_content TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claim_row public.ai_conversation_request_claims;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_member(p_project_id) THEN
    RAISE EXCEPTION 'project membership required';
  END IF;
  SELECT * INTO claim_row
  FROM public.ai_conversation_request_claims AS claims
  WHERE claims.user_id = auth.uid() AND claims.project_id = p_project_id
    AND claims.workflow_step = p_workflow_step AND claims.idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF claim_row.user_id IS NULL THEN
    RETURN QUERY SELECT 'failed'::TEXT, NULL::UUID, NULL::TEXT;
  ELSIF claim_row.user_message_id IS DISTINCT FROM p_user_message_id
     OR claim_row.assistant_message_id IS DISTINCT FROM p_assistant_message_id THEN
    RAISE EXCEPTION 'idempotency key was already used with another message pair';
  ELSIF claim_row.status = 'completed' THEN
    RETURN QUERY SELECT 'completed'::TEXT, NULL::UUID, claim_row.response_content;
  ELSIF claim_row.status = 'pending' AND claim_row.lease_until <= NOW() THEN
    UPDATE public.ai_conversation_request_claims AS claims
    SET status = 'failed', owner_token = NULL, updated_at = NOW()
    WHERE claims.user_id = auth.uid() AND claims.project_id = p_project_id
      AND claims.workflow_step = p_workflow_step AND claims.idempotency_key = p_idempotency_key
      AND claims.status = 'pending' AND claims.lease_until <= NOW();
    RETURN QUERY SELECT 'failed'::TEXT, NULL::UUID, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT 'pending'::TEXT, NULL::UUID, NULL::TEXT;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_conversation_request(
  p_project_id UUID,
  p_workflow_step INTEGER,
  p_idempotency_key UUID,
  p_user_message_id UUID,
  p_assistant_message_id UUID,
  p_owner_token UUID,
  p_messages JSONB
)
RETURNS SETOF public.ai_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claim_row public.ai_conversation_request_claims;
  conversation_row public.ai_conversations;
  assistant_content TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_member(p_project_id) THEN
    RAISE EXCEPTION 'project membership required';
  END IF;
  SELECT * INTO claim_row
  FROM public.ai_conversation_request_claims
  WHERE user_id = auth.uid() AND project_id = p_project_id
    AND workflow_step = p_workflow_step AND idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF claim_row.owner_token IS DISTINCT FROM p_owner_token
     OR claim_row.user_message_id IS DISTINCT FROM p_user_message_id
     OR claim_row.assistant_message_id IS DISTINCT FROM p_assistant_message_id THEN
    RAISE EXCEPTION 'conversation request owner mismatch';
  END IF;
  IF claim_row.status = 'completed' THEN
    SELECT * INTO conversation_row FROM public.ai_conversations
    WHERE project_id = p_project_id AND workflow_step = p_workflow_step AND user_id = auth.uid();
    RETURN NEXT conversation_row;
    RETURN;
  END IF;

  SELECT p_messages -> 1 ->> 'content' INTO assistant_content;
  SELECT * INTO conversation_row
  FROM public.append_ai_conversation_messages(p_project_id, p_workflow_step, p_messages, p_idempotency_key);
  UPDATE public.ai_conversation_request_claims
  SET status = 'completed', owner_token = NULL, response_content = assistant_content,
      lease_until = NOW(), updated_at = NOW()
  WHERE user_id = auth.uid() AND project_id = p_project_id
    AND workflow_step = p_workflow_step AND idempotency_key = p_idempotency_key;
  RETURN NEXT conversation_row;
END
$$;

CREATE OR REPLACE FUNCTION public.fail_ai_conversation_request(
  p_project_id UUID,
  p_workflow_step INTEGER,
  p_idempotency_key UUID,
  p_user_message_id UUID,
  p_assistant_message_id UUID,
  p_owner_token UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_member(p_project_id) THEN
    RAISE EXCEPTION 'project membership required';
  END IF;
  UPDATE public.ai_conversation_request_claims
  SET status = 'failed', owner_token = NULL, lease_until = NOW(), updated_at = NOW()
  WHERE user_id = auth.uid() AND project_id = p_project_id
    AND workflow_step = p_workflow_step AND idempotency_key = p_idempotency_key
    AND user_message_id = p_user_message_id AND assistant_message_id = p_assistant_message_id
    AND owner_token = p_owner_token AND status = 'pending';
END
$$;

REVOKE ALL ON FUNCTION public.claim_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.poll_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID, UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fail_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.poll_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_ai_conversation_request(UUID, INTEGER, UUID, UUID, UUID, UUID) TO authenticated;
