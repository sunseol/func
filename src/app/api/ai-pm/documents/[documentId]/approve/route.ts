import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

type Context = { params: { documentId: string } };

export const POST = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase, { requireAdmin: true });
  const documentId = requireUuid(params.documentId, 'documentId');

  const { data: document, error: docError } = await supabase
    .from('planning_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found', docError);
  }

  if (document.status !== 'pending_approval') {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'Only pending documents can be approved');
  }

  const previousStatus = document.status;
  const now = new Date().toISOString();

  const { data: updatedDoc, error: updateError } = await supabase
    .from('planning_documents')
    .update({
      status: 'official',
      approved_by: auth.user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', documentId)
    .select('*')
    .single();

  if (updateError || !updatedDoc) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to approve document', updateError);
  }

  const { error: historyError } = await supabase
    .from('approval_history')
    .insert({
      document_id: documentId,
      user_id: auth.user.id,
      action: 'approved',
      previous_status: previousStatus,
      new_status: 'official',
      created_at: now,
    })
    .select()
    .single();

  if (historyError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to write approval history', historyError);
  }

  return json({ document: updatedDoc });
});
