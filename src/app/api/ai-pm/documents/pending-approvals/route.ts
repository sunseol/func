import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { AIpmErrorType, getWorkflowStepName, PendingApprovalsResponse } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (_request: NextRequest) => {
  const supabase = await getSupabase();
  await requireAuth(supabase);

  const { data: docs, error } = await supabase
    .from('pending_approval_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch pending approvals', error);
  }

  const response: PendingApprovalsResponse = {
    documents: (docs || []).map((doc) => {
      return {
        document_id: doc.document_id ?? doc.id,
        project_id: doc.project_id,
        project_name: doc.project_name || '',
        workflow_step: doc.workflow_step,
        step_name: getWorkflowStepName(doc.workflow_step),
        title: doc.title,
        creator_name: doc.creator_name ?? null,
        creator_email: doc.creator_email ?? '',
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      };
    }),
  };

  return json(response);
});
