import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, isSupabaseNoRows, requireAuth, requireDocumentAccess } from '@/lib/ai-pm/auth';
import { requireDocumentStatus, requireDocumentVersion, requireMaxLength, requireString, requireUuid, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType, type DocumentResponse, type UpdateDocumentRequest } from '@/types/ai-pm';
import { fetchDocumentWithUsers } from '../document-response';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ documentId: string }> };

export const GET = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  await requireDocumentAccess(supabase, auth, safeDocumentId);
  const document = await fetchDocumentWithUsers(supabase, safeDocumentId);
  const response: DocumentResponse = { document };
  return json(response);
});

export const PUT = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  const body = await parseJson<UpdateDocumentRequest>(request, { maxBytes: 256_000, requireContentType: true });
  const expectedVersion = requireDocumentVersion(body.version);
  const { document: existing, canModify } = await requireDocumentAccess(supabase, auth, safeDocumentId);

  if (!canModify) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document update not allowed');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const changesContent = body.content !== undefined && body.content !== existing.content;
  const changesTitle = body.title !== undefined && body.title !== existing.title;

  if ((changesContent || changesTitle) && existing.status !== 'private') {
    throw new ApiError(
      409,
      AIpmErrorType.APPROVAL_REQUIRED,
      'Only private documents can be edited; transition the document to private first',
    );
  }

  if (body.title !== undefined) {
    updateData.title = requireMaxLength(requireString(body.title, 'title'), 'title', 255);
    updateData.title = sanitizeText(updateData.title);
  }

  if (body.status !== undefined) {
    const status = requireDocumentStatus(body.status, 'status');
    if (status !== existing.status) {
      if (status === 'pending_approval' || status === 'official') {
        throw new ApiError(
          409,
          AIpmErrorType.APPROVAL_REQUIRED,
          'Use the dedicated approval endpoint for this status transition',
        );
      }
      if (existing.status === 'pending_approval') {
        throw new ApiError(
          409,
          AIpmErrorType.APPROVAL_REQUIRED,
          'Use the withdrawal endpoint to return a pending document to private',
        );
      }
      if (existing.status === 'official' && auth.profile.role !== 'admin') {
        throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Only admins can withdraw an official document');
      }
    }
    updateData.status = status;
  }

  if (changesContent) {
    updateData.content = requireMaxLength(requireString(body.content, 'content'), 'content', 200_000);
  }

  const { data: updated, error: updateError } = await supabase
    .from('planning_documents')
    .update(updateData)
    .eq('id', safeDocumentId)
    .eq('version', expectedVersion)
    .select('*')
    .single();

  if (isSupabaseNoRows(updateError)) {
    throw new ApiError(409, AIpmErrorType.APPROVAL_REQUIRED, 'Document changed since it was loaded; refresh before saving');
  }
  if (updateError || !updated) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to update document', updateError);
  }

  const enrichedDocument = await fetchDocumentWithUsers(supabase, safeDocumentId);
  const response: DocumentResponse = { document: enrichedDocument };
  return json(response);
});

export const DELETE = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');

  const { document: existing, canModify } = await requireDocumentAccess(supabase, auth, safeDocumentId);
  if (!canModify) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document delete not allowed');
  }

  if (existing.status !== 'private') {
    throw new ApiError(
      409,
      AIpmErrorType.APPROVAL_REQUIRED,
      'Transition the document to private before deleting it',
    );
  }

  const { error: deleteError } = await supabase.from('planning_documents').delete().eq('id', safeDocumentId);
  if (deleteError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to delete document', deleteError);
  }

  return json({ message: 'OK' });
});
