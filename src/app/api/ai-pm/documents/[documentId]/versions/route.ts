import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireDocumentAccess } from '@/lib/ai-pm/auth';
import { requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ documentId: string }> };

export const GET = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  const { document } = await requireDocumentAccess(supabase, auth, safeDocumentId);

  const { data: versions, error: versionsError } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', safeDocumentId)
    .order('version', { ascending: true });

  if (versionsError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch versions', versionsError);
  }

  const normalized = Array.isArray(versions) ? [...versions] : [];
  if (!normalized.some((version: any) => version.version === document.version)) {
    normalized.push({
      id: 'current',
      document_id: safeDocumentId,
      version: document.version,
      content: document.content,
      created_by: document.created_by,
      created_at: document.updated_at ?? document.created_at,
    });
  }

  normalized.sort((a: any, b: any) => Number(a.version) - Number(b.version));
  return json({ versions: normalized });
});
