import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, isSupabaseNoRows, requireAuth, requireDocumentAccess } from '@/lib/ai-pm/auth';
import { requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType, type DocumentResponse } from '@/types/ai-pm';
import { fetchDocumentWithUsers } from '../../document-response';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ documentId: string }> };

export const POST = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { documentId } = await params;
  const safeDocumentId = requireUuid(documentId, 'documentId');
  const { document } = await requireDocumentAccess(supabase, auth, safeDocumentId);

  if (auth.profile.role !== 'admin' && document.created_by !== auth.user.id) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Approval withdrawal not allowed');
  }
  if (document.status !== 'pending_approval') {
    throw new ApiError(400, AIpmErrorType.APPROVAL_REQUIRED, 'Only pending documents can withdraw approval');
  }

  const { data: documents, error } = await supabase.rpc('withdraw_document_approval', {
    p_document_id: safeDocumentId,
    p_user_id: auth.user.id,
  });
  if (error) {
    if (isSupabaseNoRows(error)) {
      throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found', error);
    }
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to withdraw approval', error);
  }
  if (!documents || (Array.isArray(documents) && documents.length === 0)) {
    throw new ApiError(409, AIpmErrorType.APPROVAL_REQUIRED, 'Document approval withdrawal is no longer valid');
  }

  const enrichedDocument = await fetchDocumentWithUsers(supabase, safeDocumentId);
  return json({ document: enrichedDocument } satisfies DocumentResponse);
});
