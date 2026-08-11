import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, isSupabaseNoRows, requireAuth, requireDocumentApproval } from '@/lib/ai-pm/auth';
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

  const { data: document, error: docError } = await supabase
    .from('planning_documents')
    .select('*')
    .eq('id', safeDocumentId)
    .single();

  if (docError && !isSupabaseNoRows(docError)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to load document for approval', docError);
  }
  if (!document) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found', docError);
  }

  if (document.status !== 'pending_approval') {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'Only pending documents can be approved');
  }

  await requireDocumentApproval(supabase, auth, safeDocumentId);

  const { data: documents, error: approvalError } = await supabase.rpc('approve_document_and_demote_old_official', {
    p_document_id: safeDocumentId,
    p_user_id: auth.user.id,
  });
  const updatedDoc = Array.isArray(documents) ? documents[0] : documents;

  if (approvalError) {
    if (isSupabaseNoRows(approvalError)) {
      throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found', approvalError);
    }
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to approve document', approvalError);
  }
  if (!updatedDoc) {
    throw new ApiError(409, AIpmErrorType.APPROVAL_REQUIRED, 'Document approval is no longer valid');
  }

  const enrichedDocument = await fetchDocumentWithUsers(supabase, safeDocumentId);
  return json({ document: enrichedDocument } satisfies DocumentResponse);
});
