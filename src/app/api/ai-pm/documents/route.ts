import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, requireUuid, requireWorkflowStep, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType, CreateDocumentRequest, DocumentResponse, DocumentsResponse } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');
  const workflowStep = requireWorkflowStep(
    Number(requireString(url.searchParams.get('workflowStep'), 'workflowStep')),
    'workflowStep',
  );

  await requireProjectAccess(supabase, auth, projectId);

  const { data: documents, error } = await supabase
    .from('planning_documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('workflow_step', workflowStep)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch documents', error);
  }

  return json({ documents: documents || [] } as DocumentsResponse);
});

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const body = await parseJson<CreateDocumentRequest>(request);
  const projectId = requireUuid(requireString((body as any).project_id, 'project_id'), 'project_id');
  const workflowStep = requireWorkflowStep(body.workflow_step, 'workflow_step');
  const title = requireMaxLength(requireString(body.title, 'title'), 'title', 255);
  const content = requireString(body.content, 'content');

  await requireProjectAccess(supabase, auth, projectId);

  const { data: document, error } = await supabase
    .from('planning_documents')
    .insert({
      project_id: projectId,
      workflow_step: workflowStep,
      title: sanitizeText(title),
      content,
      status: 'private',
      version: 1,
      created_by: auth.user.id,
    })
    .select('*')
    .single();

  if (error || !document) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to create document', error);
  }

  return json({ document } as DocumentResponse, { status: 201 });
});
