CREATE OR REPLACE FUNCTION approve_document_and_demote_old_official(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS SETOF planning_documents
AS $$
DECLARE
  v_project_id UUID;
  updated_document planning_documents;
BEGIN
  -- 1. Get the project_id from the document being approved
  SELECT project_id INTO v_project_id FROM planning_documents WHERE id = p_document_id;

  -- If a project_id was found, proceed
  IF v_project_id IS NOT NULL THEN
    -- 2. Demote any existing 'official' document in the same project to 'private'
    UPDATE planning_documents
    SET
      status = 'private',
      updated_at = NOW()
    WHERE
      project_id = v_project_id
      AND status = 'official';

    -- 3. Approve the new document
    UPDATE planning_documents
    SET
      status = 'official',
      approved_by = p_user_id,
      approved_at = NOW(),
      updated_at = NOW()
    WHERE
      id = p_document_id
    RETURNING * INTO updated_document;

    -- Create approval history record
    INSERT INTO document_approval_history(document_id, user_id, action, previous_status, new_status)
    VALUES (p_document_id, p_user_id, 'approved', 'pending_approval', 'official');

    RETURN NEXT updated_document;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


