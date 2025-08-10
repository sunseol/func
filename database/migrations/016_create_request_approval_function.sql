CREATE OR REPLACE FUNCTION request_document_approval(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS SETOF planning_documents
AS $$
DECLARE
  updated_document planning_documents;
BEGIN
  UPDATE planning_documents
  SET
    status = 'pending_approval',
    updated_at = NOW()
  WHERE
    id = p_document_id
    AND created_by = p_user_id -- Can only request approval for own documents
    AND status = 'private'
  RETURNING * INTO updated_document;

  IF FOUND THEN
    INSERT INTO document_approval_history(document_id, user_id, action, previous_status, new_status)
    VALUES (p_document_id, p_user_id, 'requested', 'private', 'pending_approval');
    
    RETURN NEXT updated_document;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



