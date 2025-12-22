import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireDocumentAccess } from '@/lib/ai-pm/auth';
import { requireDocumentStatus, requireMaxLength, requireString, requireUuid, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType, DocumentResponse, UpdateDocumentRequest } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ documentId: string }> };

export const GET = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  const { document } = await requireDocumentAccess(supabase, auth, safeDocumentId);
  const response: DocumentResponse = { document };
  return json(response);
});

export const PUT = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  const body = await parseJson<UpdateDocumentRequest>(request);
  const { document: existing, canModify } = await requireDocumentAccess(supabase, auth, safeDocumentId);

  if (!canModify) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document update not allowed');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    updateData.title = requireMaxLength(requireString(body.title, 'title'), 'title', 255);
    updateData.title = sanitizeText(updateData.title);
  }

  if (body.status !== undefined) {
    const status = requireDocumentStatus(body.status, 'status');
    if (status === 'official' && existing.status !== 'official') {
      throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'Use approval endpoint for official status');
    }
    updateData.status = status;
  }

  if (body.content !== undefined && body.content !== existing.content) {
    const { error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: safeDocumentId,
        version: existing.version,
        content: existing.content,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (versionError) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to create version history', versionError);
    }

    updateData.content = body.content;
    updateData.version = existing.version + 1;
  }

  const { data: updated, error: updateError } = await supabase
    .from('planning_documents')
    .update(updateData)
    .eq('id', safeDocumentId)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to update document', updateError);
  }

  const response: DocumentResponse = { document: updated };
  return json(response);
});

export const DELETE = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  const { canModify } = await requireDocumentAccess(supabase, auth, safeDocumentId);
  if (!canModify) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document delete not allowed');
  }

  const { error: deleteError } = await supabase.from('planning_documents').delete().eq('id', safeDocumentId);
  if (deleteError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to delete document', deleteError);
  }

  return json({ message: 'OK' });
});
