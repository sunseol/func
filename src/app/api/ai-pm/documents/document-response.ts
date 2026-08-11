import { ApiError } from '@/lib/http';
import type { AiPmSupabase } from '@/lib/ai-pm/auth';
import { AIpmErrorType, type PlanningDocumentWithUsers } from '@/types/ai-pm';

export async function fetchDocumentWithUsers(
  supabase: AiPmSupabase,
  documentId: string,
): Promise<PlanningDocumentWithUsers> {
  const { data, error } = await supabase
    .from('planning_documents_with_users')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();
  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch document details', error);
  }
  if (!data) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found');
  }
  return data;
}
