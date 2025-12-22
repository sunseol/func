import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { AIpmErrorType, getWorkflowStepName, PendingApprovalsResponse } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (_request: NextRequest) => {
  const supabase = await getSupabase();
  await requireAuth(supabase, { requireAdmin: true });

  const { data: docs, error } = await supabase
    .from('planning_documents')
    .select('*')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch pending approvals', error);
  }

  const projectIds = Array.from(new Set((docs || []).map((doc: any) => doc.project_id)));
  const creatorIds = Array.from(new Set((docs || []).map((doc: any) => doc.created_by)));

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds);
  const projectNameById = new Map((projects || []).map((project: any) => [project.id, project.name]));

  const { data: creators } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .in('id', creatorIds);
  const creatorById = new Map((creators || []).map((creator: any) => [creator.id, creator]));

  const response: PendingApprovalsResponse = {
    documents: (docs || []).map((doc: any) => {
      const creator = creatorById.get(doc.created_by);
      return {
        document_id: doc.id,
        project_id: doc.project_id,
        project_name: projectNameById.get(doc.project_id) || '',
        workflow_step: doc.workflow_step,
        step_name: getWorkflowStepName(doc.workflow_step),
        title: doc.title,
        creator_name: creator?.full_name ?? null,
        creator_email: creator?.email ?? '',
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      };
    }),
  };

  return json(response);
});
