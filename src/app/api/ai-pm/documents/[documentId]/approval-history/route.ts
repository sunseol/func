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

  await requireDocumentAccess(supabase, auth, safeDocumentId);

  const { data: history, error: historyError } = await supabase
    .from('approval_history')
    .select('*')
    .eq('document_id', safeDocumentId)
    .order('created_at', { ascending: true });

  if (historyError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch approval history', historyError);
  }

  return json({ history: history || [] });
});
