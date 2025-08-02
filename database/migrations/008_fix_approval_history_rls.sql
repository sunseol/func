-- Fix RLS policy for document_approval_history table to allow inserts via triggers

-- 1. Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only system can create approval history" ON document_approval_history;

-- 2. Create a new policy that allows inserts for users who can update the corresponding document.
--    This allows the trigger to function correctly.
CREATE POLICY "Users can create approval history for documents they can update" ON document_approval_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM planning_documents pd
      WHERE pd.id = document_approval_history.document_id
      AND (
        pd.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Document approval history RLS policy updated successfully.';
END $$;



