import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireDocumentAccess } from '@/lib/ai-pm/auth';
import { requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType, type DocumentVersion } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ documentId: string }> };

function isDocumentVersion(value: unknown): value is DocumentVersion {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('document_id' in value) || !('version' in value) || !('content' in value) || !('created_by' in value) || !('created_at' in value)) return false;
  return typeof value.id === 'string' && typeof value.document_id === 'string' &&
    typeof value.version === 'number' && typeof value.content === 'string' &&
    typeof value.created_by === 'string' && typeof value.created_at === 'string';
}

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

  const normalized: DocumentVersion[] = Array.isArray(versions) ? versions.filter(isDocumentVersion) : [];
  if (!normalized.some((version) => version.version === document.version)) {
    normalized.push({
      id: 'current',
      document_id: safeDocumentId,
      version: document.version,
      content: document.content,
      created_by: document.created_by,
      created_at: document.updated_at ?? document.created_at,
    });
  }

  normalized.sort((a, b) => a.version - b.version);
  return json({ versions: normalized });
});
