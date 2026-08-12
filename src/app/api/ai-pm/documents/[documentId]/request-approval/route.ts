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
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Approval request not allowed');
  }

  if (document.status !== 'private') {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'Only private documents can request approval');
  }

  const { data: documents, error: approvalError } = await supabase.rpc('request_document_approval', {
    p_document_id: safeDocumentId,
    p_user_id: auth.user.id,
  });

  const updatedDoc = Array.isArray(documents) ? documents[0] : documents;
  if (approvalError) {
    if (isSupabaseNoRows(approvalError)) {
      throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found', approvalError);
    }
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to request approval', approvalError);
  }
  if (!updatedDoc) {
    throw new ApiError(409, AIpmErrorType.APPROVAL_REQUIRED, 'Document approval request is no longer valid');
  }

  const enrichedDocument = await fetchDocumentWithUsers(supabase, safeDocumentId);
  return json({ document: enrichedDocument } satisfies DocumentResponse);
});
