-- Fix RLS policy for document_versions table to allow inserts

-- 1. Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only system can create document versions" ON document_versions;

-- 2. Create a new policy that allows users to create versions for documents they can create
CREATE POLICY "Users can create document versions for their own documents" ON document_versions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM planning_documents pd
      WHERE pd.id = document_versions.document_id
      AND (
        auth.uid() IN (
          SELECT user_id FROM project_members WHERE project_id = pd.project_id
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Document versions RLS policy updated successfully.';
END $$;
