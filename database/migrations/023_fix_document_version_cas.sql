CREATE OR REPLACE FUNCTION public.create_document_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title
     OR OLD.content IS DISTINCT FROM NEW.content
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
     OR OLD.approved_at IS DISTINCT FROM NEW.approved_at THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    INSERT INTO public.document_versions (document_id, version, content, created_by)
    VALUES (NEW.id, NEW.version, NEW.content, COALESCE(auth.uid(), NEW.created_by))
    ON CONFLICT (document_id, version) DO UPDATE
      SET content = EXCLUDED.content, created_by = EXCLUDED.created_by;
  ELSE
    NEW.version := OLD.version;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS create_planning_document_version ON public.planning_documents;
CREATE TRIGGER create_planning_document_version
  BEFORE UPDATE ON public.planning_documents
  FOR EACH ROW EXECUTE FUNCTION public.create_document_version();

REVOKE ALL ON FUNCTION public.create_document_version() FROM PUBLIC;
