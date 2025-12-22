import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireDocumentAccess } from '@/lib/ai-pm/auth';
import { requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

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

  const previousStatus = document.status;
  const updatedAt = new Date().toISOString();

  const { data: updatedDoc, error: updateError } = await supabase
    .from('planning_documents')
    .update({ status: 'pending_approval', updated_at: updatedAt })
    .eq('id', safeDocumentId)
    .select('*')
    .single();

  if (updateError || !updatedDoc) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to request approval', updateError);
  }

  const { error: historyError } = await supabase
    .from('approval_history')
    .insert({
      document_id: safeDocumentId,
      user_id: auth.user.id,
      action: 'requested',
      previous_status: previousStatus,
      new_status: 'pending_approval',
      created_at: updatedAt,
    })
    .select()
    .single();

  if (historyError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to write approval history', historyError);
  }

  return json({ message: 'OK' });
});
