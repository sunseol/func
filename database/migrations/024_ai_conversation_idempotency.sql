DO $$
BEGIN
  IF to_regprocedure('public.append_ai_conversation_messages(uuid, integer, jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.append_ai_conversation_messages(UUID, INTEGER, JSONB) FROM PUBLIC, authenticated, anon';
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.append_ai_conversation_messages(UUID, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION public.append_ai_conversation_messages(
  p_project_id UUID,
  p_workflow_step INTEGER,
  p_messages JSONB,
  p_idempotency_key UUID
)
RETURNS SETOF public.ai_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_row public.ai_conversations;
  result_row public.ai_conversations;
  message JSONB;
  message_role TEXT;
  message_content TEXT;
  message_index INTEGER;
  message_id UUID;
  user_message_id UUID;
  assistant_message_id UUID;
  normalized_messages JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_project_member(p_project_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'project membership required';
  END IF;
  IF p_idempotency_key IS NULL
     OR p_messages IS NULL
     OR jsonb_typeof(p_messages) IS DISTINCT FROM 'array'
     OR p_workflow_step NOT BETWEEN 1 AND 9
     OR jsonb_array_length(p_messages) <> 2
     OR octet_length(p_messages::TEXT) > 65536 THEN
    RAISE EXCEPTION 'invalid conversation append payload';
  END IF;

  FOR message_index IN 0..1 LOOP
    message := p_messages -> message_index;
    IF jsonb_typeof(message) IS DISTINCT FROM 'object'
       OR NOT (message ? 'id')
       OR jsonb_typeof(message -> 'id') IS DISTINCT FROM 'string'
       OR NOT (message ? 'role')
       OR jsonb_typeof(message -> 'role') IS DISTINCT FROM 'string'
       OR NOT (message ? 'content')
       OR jsonb_typeof(message -> 'content') IS DISTINCT FROM 'string'
       OR NOT (message ? 'timestamp')
       OR jsonb_typeof(message -> 'timestamp') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'invalid conversation message shape';
    END IF;

    BEGIN
      message_id := (message ->> 'id')::UUID;
      PERFORM (message ->> 'timestamp')::TIMESTAMPTZ;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid conversation message identity or timestamp';
    END;

    message_role := message ->> 'role';
    IF (message_index = 0 AND message_role IS DISTINCT FROM 'user')
       OR (message_index = 1 AND message_role IS DISTINCT FROM 'assistant')
       OR octet_length(message::TEXT) > 32768 THEN
      RAISE EXCEPTION 'invalid conversation message role or size';
    END IF;
    message_content := message ->> 'content';
    IF octet_length(message ->> 'id') > 256
       OR octet_length(message ->> 'timestamp') > 256
       OR octet_length(message_content) > 32768 THEN
      RAISE EXCEPTION 'conversation message exceeds size limits';
    END IF;

    IF message_index = 0 THEN
      user_message_id := message_id;
    ELSE
      assistant_message_id := message_id;
    END IF;
  END LOOP;

  IF user_message_id = assistant_message_id THEN
    RAISE EXCEPTION 'conversation message identities must be distinct';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(user_message_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(assistant_message_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key::TEXT, 0));

  IF EXISTS (
    SELECT 1
    FROM public.ai_conversations ac
    WHERE (
      ac.project_id IS DISTINCT FROM p_project_id
      OR ac.workflow_step IS DISTINCT FROM p_workflow_step
      OR ac.user_id IS DISTINCT FROM auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(ac.messages) AS item(value)
      WHERE item.value ->> 'id' IN (user_message_id::TEXT, assistant_message_id::TEXT)
         OR item.value ->> 'idempotency_key' = p_idempotency_key::TEXT
    )
  ) THEN
    RAISE EXCEPTION 'conversation message identity already belongs to another conversation';
  END IF;

  SELECT * INTO current_row
  FROM public.ai_conversations
  WHERE project_id = p_project_id
    AND workflow_step = p_workflow_step
    AND user_id = auth.uid()
  FOR UPDATE;

  IF current_row.id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(current_row.messages) AS item(value)
      WHERE item.value ->> 'idempotency_key' = p_idempotency_key::TEXT
    ) THEN
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(current_row.messages) AS item(value)
        WHERE item.value ->> 'id' = user_message_id::TEXT
      ) AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(current_row.messages) AS item(value)
        WHERE item.value ->> 'id' = assistant_message_id::TEXT
      ) THEN
        RETURN NEXT current_row;
        RETURN;
      END IF;
      RAISE EXCEPTION 'idempotency key was already used with another message pair';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(current_row.messages) AS item(value)
      WHERE item.value ->> 'id' IN (user_message_id::TEXT, assistant_message_id::TEXT)
    ) THEN
      RAISE EXCEPTION 'conversation message identity was already used with another request';
    END IF;
  END IF;

  normalized_messages := jsonb_build_array(
    jsonb_set(p_messages -> 0, '{idempotency_key}', to_jsonb(p_idempotency_key::TEXT), TRUE),
    jsonb_set(p_messages -> 1, '{idempotency_key}', to_jsonb(p_idempotency_key::TEXT), TRUE)
  );

  INSERT INTO public.ai_conversations(project_id, workflow_step, user_id, messages, updated_at)
  VALUES (
    p_project_id,
    p_workflow_step,
    auth.uid(),
    normalized_messages,
    NOW()
  )
  ON CONFLICT (project_id, workflow_step, user_id) DO UPDATE
  SET messages = (
    SELECT COALESCE(jsonb_agg(value ORDER BY ord), '[]'::JSONB)
    FROM (
      SELECT value, ord
      FROM jsonb_array_elements(public.ai_conversations.messages || normalized_messages)
        WITH ORDINALITY AS items(value, ord)
      ORDER BY ord DESC
      LIMIT 100
    ) bounded
  ),
      updated_at = NOW()
  RETURNING * INTO result_row;

  RETURN NEXT result_row;
END
$$;

REVOKE ALL ON FUNCTION public.append_ai_conversation_messages(UUID, INTEGER, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_ai_conversation_messages(UUID, INTEGER, JSONB, UUID) TO authenticated;
